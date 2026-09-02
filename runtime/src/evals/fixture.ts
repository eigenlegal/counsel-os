/**
 * Eval fixtures, v2 (routing-and-evals spec §4.1).
 *
 * v1 fixtures (`evals/fixtures/*.json`, hand-written) keep every key they
 * had — `expected_catches`, `negative_checks`, `expected_citations`,
 * `allowed_citation_aliases`, `vault`, `task`, `input` — and read as
 * `scorer: 'findings'`. v2 adds the scorer kind, a provenance record for
 * anything not written here, a per-scorer `expected` block, term weights,
 * and `documents[]` so a benchmark of many contracts is one fixture in one
 * vault rather than one vault per document.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { repoContentSource } from '../content/repo';
import type { ContentSource } from '../content/source';

export const SCORERS = ['findings', 'extraction', 'classification', 'redline', 'rubric'] as const;
export type ScorerKind = (typeof SCORERS)[number];

const Terms = z.array(z.string());

export const ExpectedCatch = z
  .object({
    id: z.string(),
    /** `any` waives the severity band rule; absent reads as `any` too — v1
     * fixtures always carry one, so absence is a deliberate waiver. */
    severity: z.enum(['red', 'yellow', 'green', 'any']).optional(),
    clause: z.string().optional(),
    why: z.string().optional(),
    match_any: Terms,
  })
  .passthrough();

export const NegativeCheck = z
  .object({ id: z.string(), why: z.string().optional(), description: z.string().optional(), match_any: Terms.default([]) })
  .passthrough();

export const ExpectedCitation = z.object({ id: z.string(), aliases: Terms }).passthrough();

export const Source = z.object({
  kind: z.enum(['practice', 'shipped', 'benchmark']),
  name: z.string().optional(),
  url: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
});
export type FixtureSource = z.infer<typeof Source>;

export const ExtractionExpected = z.object({
  fields: z.record(z.string(), z.object({ match_any: Terms, required: z.boolean().default(true) })),
});
export const ClassificationExpected = z.object({ answer: z.string(), accept: Terms.default([]) });
export const RedlineExpected = z.object({
  /** Vault-relative path of the .docx the model is asked to redline. */
  document: z.string(),
  items: z.array(z.object({ current: z.string(), proposed_any: Terms })),
  must_not_touch: Terms.default([]),
  require_comments: z.boolean().default(true),
});
export const RubricExpected = z.object({
  criteria: z.array(z.object({ id: z.string(), text: z.string(), weight: z.number().positive().default(1) })).min(1),
});

/** The findings-shaped block every v1 fixture carries. Shared by the
 * top-level fixture and each entry of `documents[]`. */
const FindingsBlock = {
  expected_catches: z.array(ExpectedCatch).default([]),
  negative_checks: z.array(NegativeCheck).default([]),
  expected_citations: z.array(ExpectedCitation).default([]),
  allowed_citation_aliases: Terms.default([]),
};

const Common = {
  task: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  expected: z.unknown().optional(),
  ...FindingsBlock,
};

export const FixtureDocument = z.object({ id: z.string(), ...Common }).passthrough();

export const Fixture = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'a fixture id is a lowercase slug'),
    title: z.string().optional(),
    document_type: z.string().optional(),
    /** The mini-vault under `evals/vaults/<vault>/` (shipped) — a practice
     * fixture names a folder under `practice/evals/vaults/` instead. */
    vault: z.string().optional(),
    scorer: z.enum(SCORERS).default('findings'),
    /** Which of the runtime's tasks the step runs as; defaults from the
     * scorer (`taskForScorer`). */
    task_kind: z.string().optional(),
    source: Source.optional(),
    weights: z.record(z.string(), z.number().nonnegative()).optional(),
    pass_threshold: z.number().min(0).max(1).optional(),
    documents: z.array(FixtureDocument).optional(),
    ...Common,
  })
  .passthrough()
  .superRefine((f, ctx) => {
    const check = (scorer: ScorerKind, expected: unknown, where: string): void => {
      const schema =
        scorer === 'extraction' ? ExtractionExpected
        : scorer === 'classification' ? ClassificationExpected
        : scorer === 'redline' ? RedlineExpected
        : scorer === 'rubric' ? RubricExpected
        : null;
      if (schema === null) return;
      const r = schema.safeParse(expected);
      if (!r.success) ctx.addIssue({ code: 'custom', message: `${where}: the ${scorer} scorer needs \`expected\` ${r.error.issues[0]?.message ?? ''}`.trim(), path: [where] });
    };
    if (f.documents === undefined || f.documents.length === 0) check(f.scorer, f.expected, 'expected');
    else for (const d of f.documents) check(f.scorer, d.expected, `documents.${d.id}`);
  });

export type Fixture = z.infer<typeof Fixture>;
export type FixtureDocument = z.infer<typeof FixtureDocument>;

/** The scorer's natural task (spec §3 table); a fixture may override. */
export function taskForScorer(scorer: ScorerKind): string {
  switch (scorer) {
    case 'findings':
      return 'review';
    case 'extraction':
      return 'extract';
    case 'classification':
      return 'review';
    case 'redline':
      return 'redline';
    case 'rubric':
      return 'draft';
  }
}

export function parseFixture(raw: unknown, where = 'fixture'): Fixture {
  const r = Fixture.safeParse(raw);
  if (!r.success) throw new Error(`${where}: ${r.error.issues.map(i => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ')}`);
  return r.data;
}

/** Where a fixture's `vault` name resolves: a directory on disk (the
 * practice's own fixtures) or a prefix in the shipped content (the shipped
 * suite, so the compiled binary runs it too). */
export type FixtureVaults = { kind: 'dir'; dir: string } | { kind: 'content'; content: ContentSource; prefix: string };

export interface LoadedFixture {
  fixture: Fixture;
  /** Where the file came from, for the results record. `source.kind` on the
   * fixture wins when it says so. */
  set: 'shipped' | 'practice';
  /** The fixture file: a path on disk, or the content path for the shipped set. */
  file: string;
  vaults: FixtureVaults;
}

export const SHIPPED_FIXTURES_PREFIX = 'evals/fixtures';
export const SHIPPED_VAULTS_PREFIX = 'evals/vaults';

function readDir(dir: string): string[] {
  try {
    if (!statSync(dir).isDirectory()) return [];
  } catch {
    return [];
  }
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort();
}

/** The shipped suite, read through the content source: `evals/fixtures/
 * *.json` with vaults under `evals/vaults/`. A repo root stands in for the
 * checkout's source (tests, the self-test). */
export function loadShippedFixtures(source: ContentSource | string): LoadedFixture[] {
  const content = typeof source === 'string' ? repoContentSource(source) : source;
  return content
    .list(SHIPPED_FIXTURES_PREFIX)
    .filter(p => p.endsWith('.json'))
    .map(p => ({
      fixture: parseFixture(JSON.parse(content.read(p)), p),
      set: 'shipped' as const,
      file: p,
      vaults: { kind: 'content' as const, content, prefix: SHIPPED_VAULTS_PREFIX },
    }));
}

/** The practice's own fixtures: `<vault>/practice/evals/*.json` with vaults
 * under `<vault>/practice/evals/vaults/`. */
export function loadPracticeFixtures(vaultRoot: string): LoadedFixture[] {
  const dir = join(vaultRoot, 'practice', 'evals');
  return readDir(dir).map(f => ({
    fixture: parseFixture(JSON.parse(readFileSync(join(dir, f), 'utf8')), `practice/evals/${f}`),
    set: 'practice' as const,
    file: join(dir, f),
    vaults: { kind: 'dir' as const, dir: join(dir, 'vaults') },
  }));
}

export function loadFixtures(opts: { content: ContentSource | string; vaultRoot?: string }): LoadedFixture[] {
  return [...loadShippedFixtures(opts.content), ...(opts.vaultRoot === undefined ? [] : loadPracticeFixtures(opts.vaultRoot))];
}

export function sourceKindOf(loaded: LoadedFixture): FixtureSource['kind'] {
  return loaded.fixture.source?.kind ?? loaded.set;
}
