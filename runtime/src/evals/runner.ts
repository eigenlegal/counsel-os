/**
 * The eval runner (routing-and-evals spec §4.2): one fixture, one provider,
 * one step through the real loop in a fresh copy of the fixture's vault,
 * scored by the fixture's scorer, one result line back. The temp vault is
 * gone before the line returns; only the line persists (spec §5).
 *
 * A step that ends in an error yields `score: null` with the message —
 * counted as a failure, never averaged in (spec §9).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentSource } from '../content/source';
import { DEFAULT_TENANT, isTerminal, type ModelProvider, type Usage } from '../core/types';
import { runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { readRun } from '../loop/run-record';
import type { Router } from '../router/router';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { fsSearch } from '../vault/search';
import { sourceKindOf, taskForScorer, type FixtureDocument, type LoadedFixture } from './fixture';
import type { EvalResult } from './results';
import { outputSchemaFor } from './schemas';
import { scoreOutput, type Judge } from './scorers/index';
import { prepareFixtureVault } from './vault-prep';

export interface EvalDeps {
  pluginRoot: string;
  content?: ContentSource;
  providers: ModelProvider[];
  router: Router;
  stepTimeoutMs?: number;
  /** The rubric judge (spec §12: the practice's default provider by
   * default; the caller decides). Absent → rubric fixtures fail to score. */
  judge?: Judge;
  /** Where the temp fixture vaults go (tests point this at a scratch dir). */
  tmpDir?: string;
  now?: () => Date;
}

export interface RunFixtureOptions {
  loaded: LoadedFixture;
  providerId: string;
  /** Overrides the fixture's task (`task_kind`, else the scorer's default). */
  task?: string;
  deps: EvalDeps;
}

export function modelVersionOf(providerId: string): string {
  const i = providerId.indexOf('/');
  return i === -1 ? providerId : providerId.slice(i + 1);
}

/** The prompt the step runs: the fixture's `task` sentence (v1 wrote it as
 * the whole instruction) — or, for a `documents[]` entry, its own. */
function messageOf(loaded: LoadedFixture, doc: FixtureDocument | null): string {
  const m = doc?.task ?? loaded.fixture.task;
  if (m === undefined || m.trim() === '') throw new Error(`fixture ${loaded.fixture.id}${doc ? `#${doc.id}` : ''} has no task to run`);
  return m;
}

async function runOne(loaded: LoadedFixture, doc: FixtureDocument | null, opts: RunFixtureOptions, vault: string): Promise<EvalResult> {
  const { fixture } = loaded;
  const now = opts.deps.now ?? (() => new Date());
  const task = opts.task ?? fixture.task_kind ?? taskForScorer(fixture.scorer);
  const base: Omit<EvalResult, 'score' | 'terms' | 'notes' | 'durationMs'> = {
    at: now().toISOString(),
    fixtureId: fixture.id,
    ...(doc === null ? {} : { documentId: doc.id }),
    source: sourceKindOf(loaded),
    task,
    providerId: opts.providerId,
    modelVersion: modelVersionOf(opts.providerId),
  };
  const started = Date.now();
  const fail = (error: string, extra: Partial<EvalResult> = {}): EvalResult => ({ ...base, score: null, terms: {}, notes: [], durationMs: Date.now() - started, error, ...extra });

  let message: string;
  try {
    message = messageOf(loaded, doc);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  const store = new ThreadStore(vault);
  const header = await store.create(DEFAULT_TENANT, { title: `eval · ${fixture.id}${doc ? `#${doc.id}` : ''}`, task });
  const deps: CounselLoopDeps = {
    tenant: DEFAULT_TENANT,
    vaultRoot: vault,
    pluginRoot: opts.deps.pluginRoot,
    ...(opts.deps.content === undefined ? {} : { content: opts.deps.content }),
    vault: new FsVaultStore(vault, { search: fsSearch() }),
    store,
    providers: opts.deps.providers,
    router: opts.deps.router,
    ...(opts.deps.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: opts.deps.stepTimeoutMs }),
  };
  const schema = outputSchemaFor(fixture.scorer);

  let runId: string | undefined;
  let output: unknown;
  let text = '';
  let usage: Usage | undefined;
  let error: string | undefined;
  try {
    for await (const ev of runStep(deps, { threadId: header.id, message, task, providerId: opts.providerId, ...(schema === undefined ? {} : { outputSchema: schema }) })) {
      runId = ev.runId;
      if (ev.type === 'text') text += ev.text;
      if (ev.type === 'done') {
        output = ev.output;
        usage = ev.usage;
      }
      if (ev.type === 'error') error = ev.message;
      if (isTerminal(ev)) break;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const record = runId === undefined ? null : readRun(vault, DEFAULT_TENANT, runId);
  const withRun: Partial<EvalResult> = {
    ...(runId === undefined ? {} : { runId }),
    ...(usage === undefined ? {} : { usage }),
    ...(record?.costUsd === undefined ? usage?.costUsd === undefined ? {} : { costUsd: usage.costUsd } : { costUsd: record.costUsd }),
  };
  if (error !== undefined) return fail(error, withRun);
  if (output === undefined && text === '') return fail('the step ended without an answer', withRun);
  if (schema !== undefined) {
    // The real providers enforce the schema; a scripted one in a test may
    // not, and an answer in the wrong shape is a failure (spec §9), not a
    // low score.
    const parsed = schema.safeParse(output);
    if (!parsed.success) return fail(`the answer did not match the ${fixture.scorer} schema: ${parsed.error.issues[0]?.message ?? 'invalid'}`, withRun);
    output = parsed.data;
  }

  try {
    const scored = await scoreOutput(fixture, doc, output ?? text, {
      readDocument: (path: string) => new Uint8Array(readFileSync(join(vault, path))),
      ...(opts.deps.judge === undefined ? {} : { judge: opts.deps.judge }),
    });
    return { ...base, ...withRun, score: scored.score, terms: scored.terms, notes: scored.notes, durationMs: Date.now() - started };
  } catch (err) {
    return fail(`scoring failed: ${err instanceof Error ? err.message : String(err)}`, withRun);
  }
}

/** Runs one fixture: one result line, or one per entry of `documents[]`. */
export async function runFixture(opts: RunFixtureOptions): Promise<EvalResult[]> {
  const { loaded } = opts;
  let prepared: ReturnType<typeof prepareFixtureVault>;
  try {
    prepared = prepareFixtureVault(loaded, opts.deps.tmpDir === undefined ? {} : { tmpDir: opts.deps.tmpDir });
  } catch (err) {
    const now = opts.deps.now ?? (() => new Date());
    return [
      {
        at: now().toISOString(),
        fixtureId: loaded.fixture.id,
        source: sourceKindOf(loaded),
        task: opts.task ?? loaded.fixture.task_kind ?? taskForScorer(loaded.fixture.scorer),
        providerId: opts.providerId,
        modelVersion: modelVersionOf(opts.providerId),
        score: null,
        terms: {},
        notes: [],
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    ];
  }
  try {
    const docs = loaded.fixture.documents ?? [];
    if (docs.length === 0) return [await runOne(loaded, null, opts, prepared.vault)];
    const out: EvalResult[] = [];
    for (const doc of docs) out.push(await runOne(loaded, doc, opts, prepared.vault));
    return out;
  } finally {
    prepared.remove();
  }
}

export interface RunSetProgress {
  index: number;
  total: number;
  fixtureId: string;
  /** `start` before the step; `result` after, with the line(s). */
  phase: 'start' | 'result';
  results?: EvalResult[];
}

export interface RunSetOptions {
  fixtures: LoadedFixture[];
  providerId: string;
  task?: string;
  deps: EvalDeps;
  onProgress?: (p: RunSetProgress) => void;
  /** Called with each line as it is produced (the CLI's `--save`, the
   * route's store). */
  onResult?: (line: EvalResult) => void;
}

/** Runs a set one fixture at a time — the shared five-hour window is the
 * real limit, and a set of eight running in parallel is eight steps' worth
 * of context at once for no gain in what the scores mean. */
export async function runSet(opts: RunSetOptions): Promise<EvalResult[]> {
  const all: EvalResult[] = [];
  const total = opts.fixtures.length;
  for (const [index, loaded] of opts.fixtures.entries()) {
    opts.onProgress?.({ index, total, fixtureId: loaded.fixture.id, phase: 'start' });
    const results = await runFixture({ loaded, providerId: opts.providerId, ...(opts.task === undefined ? {} : { task: opts.task }), deps: opts.deps });
    for (const r of results) opts.onResult?.(r);
    all.push(...results);
    opts.onProgress?.({ index, total, fixtureId: loaded.fixture.id, phase: 'result', results });
  }
  return all;
}

export interface SetSummary {
  count: number;
  scored: number;
  failed: number;
  /** Unweighted mean over the scored lines; `null` when none scored. */
  mean: number | null;
  costUsd: number;
}

export function summarize(results: EvalResult[]): SetSummary {
  const scored = results.filter((r): r is EvalResult & { score: number } => r.score !== null);
  return {
    count: results.length,
    scored: scored.length,
    failed: results.length - scored.length,
    mean: scored.length === 0 ? null : Math.round((scored.reduce((a, r) => a + r.score, 0) / scored.length) * 10_000) / 10_000,
    costUsd: Math.round(results.reduce((a, r) => a + (r.costUsd ?? 0), 0) * 10_000) / 10_000,
  };
}
