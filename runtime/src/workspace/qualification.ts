import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ModelProvider, StepEvent, StepRequest } from '../core/types';
import { FakeModelProvider } from '../core/fake-provider';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import type { Turn } from './conversations';
import practice from './fixtures/practice.json';

export const QUALIFICATION_CASES = [
  {
    id: 'advice',
    matter: 'monitoring',
    source: 'monitoring-reference',
    knowledge: 'monitoring-position',
    prompt:
      'Using only this synthetic matter, prepare a short advice memo comparing the approved monitoring position, its separate reference and the recorded human decision. Read and cite all three. Distinguish example guidance from law and the recorded decision from draft advice. Do not create new knowledge or update the brief.',
    review:
      'Does it say implementation was deferred, distinguish the approved position from the non-law reference, and avoid inventing legal requirements?',
  },
  {
    id: 'investigation',
    matter: 'investigation',
    source: 'interview',
    knowledge: null,
    prompt:
      'Prepare a short internal status note from this synthetic investigation. Read and cite the underlying investigation note. Identify unresolved facts and prepare a matter-brief suggestion for review, preserving the outstanding interview and unresolved timing. Do not resolve the dispute, close the matter, invent dates or approve knowledge.',
    review:
      'Does it retain the outstanding witness interview and disputed timing, distinguish fact from inference, and leave its brief pending human review?',
  },
  {
    id: 'document',
    matter: 'agreement',
    source: 'agreement-text',
    knowledge: 'notice-position',
    prompt:
      'Prepare a short assessment of the notice provision in this synthetic matter. Independently read and cite the agreement extraction and approved notice position. Explain the mismatch and whether an original document is actually registered. Do not claim to edit or redline it, create new knowledge or update the brief.',
    review:
      'Does it distinguish oral notices from required written notices, state that this fixture has no original, and avoid claiming an actual document edit?',
  },
] as const;
type Case = (typeof QUALIFICATION_CASES)[number];

export type QualificationOptions =
  | { mode: 'plan' }
  | { mode: 'fixture' }
  | { mode: 'live'; provider: 'codex' | 'claude-code'; model: string };

/** No settings lookup, credentials, subprocess, workspace or network activity before this gate. */
export function qualificationOptions(args: string[]): QualificationOptions {
  if (args.length === 0 || (args.length === 1 && ['--plan', '--help'].includes(args[0]!)))
    return { mode: 'plan' };
  if (args.length === 1 && args[0] === '--fixture') return { mode: 'fixture' };
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (['--live', '--allow-plan-usage'].includes(arg)) {
      if (flags.has(arg)) throw new Error('Duplicate qualification option.');
      flags.add(arg);
    } else if (['--provider', '--model'].includes(arg)) {
      if (values.has(arg) || !args[i + 1] || args[i + 1]!.startsWith('--'))
        throw new Error('Each provider/model option needs one value.');
      values.set(arg, args[++i]!);
    } else throw new Error('Unknown qualification option. Use --help.');
  }
  if (!flags.has('--live') || !flags.has('--allow-plan-usage'))
    throw new Error('Live checks require --live and explicit --allow-plan-usage consent.');
  const provider = z.enum(['codex', 'claude-code']).parse(values.get('--provider'));
  const model = z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._:-]+$/)
    .parse(values.get('--model'));
  return { mode: 'live', provider, model };
}

interface Expected {
  kind: 'source' | 'knowledge' | 'work';
  id: string;
  quote: string;
}

/** Grade the evidence actually supplied/read and cited, not a mandatory tool sequence.
 * Automatic preparation is real retrieval; an unnecessary explicit search is
 * an observation, never a substitute for finding/citing the expected records. */
export function qualificationEvidence(turn: Turn, expected: Expected[]) {
  return {
    readExpected: expected.every(e => turn.state.context.some(c => c.kind === e.kind && c.id === e.id && c.ranges.length > 0)),
    citedExpected: expected.every(e => turn.state.citations.some(c => c.target.kind === e.kind
      && (c.target.kind === 'work' ? c.target.workId : c.target.revisionId) === e.id && turn.state.answer.includes(`[${c.key}]`))),
  };
}
function expectations(
  store: WorkspaceStore,
  records: ReturnType<WorkspaceStore['importSeed']>['records'],
  item: Case,
): Expected[] {
  const source = store.getSource(records.sources[item.source]!);
  const expected: Expected[] = [
    { kind: 'source', id: source.latest.id, quote: source.latest.body! },
  ];
  if (item.knowledge) {
    const knowledge = store.getKnowledge(records.knowledge[item.knowledge]!);
    expected.push({ kind: 'knowledge', id: knowledge.active!.id, quote: knowledge.active!.body });
  }
  if (item.id === 'advice') {
    const decision = store.getWork(records.work.decision!);
    expected.push({ kind: 'work', id: decision.id, quote: decision.answer });
  }
  return expected;
}

/** An explicit fake path: exercises the runner, never measures model quality. */
function fixtureProvider(item: Case, expected: Expected[]): ModelProvider {
  return new FakeModelProvider([
    {
      toolCalls: [
        {
          name: 'counsel_search_records',
          input: {
            query:
              item.id === 'advice'
                ? 'monitoring'
                : item.id === 'document'
                  ? 'notice'
                  : 'investigation',
          },
        },
        ...expected.flatMap(({ kind, id, quote }) => [
          { name: 'counsel_read_record', input: { kind, id, start: 0 } },
          { name: 'counsel_cite_passage', input: { kind, id, quote, start: 0 } },
        ]),
        {
          name: 'counsel_prepare_output',
          input: {
            title: `Synthetic ${item.id} note`,
            kind: item.id === 'document' ? 'assessment' : 'memo',
          },
        },
        ...(item.id === 'investigation'
          ? [
              {
                name: 'counsel_propose_matter_brief',
                input: {
                  needsReview: true,
                  status: 'open',
                  summary: 'The witness interview remains outstanding; the timing is unresolved.',
                  questions: 'What will the witness say about the disputed timing?',
                  nextActions: 'Arrange the witness interview.',
                  reason: 'Preserve the unresolved investigation facts as working context.',
                },
              },
            ]
          : []),
      ],
      text: `# Synthetic ${item.id} note\n\n${expected.map((e, i) => `${e.quote} [S${i + 1}]`).join('\n\n')}`,
      delayMs: 10,
    },
  ]);
}

interface CaseReport {
  id: Case['id'];
  conversationId: string;
  turnId: string;
  status: Turn['status'];
  error: string | null;
  checks: Record<string, boolean>;
  observations: { explicitSearchCalls: number; contextRecordsRead: number };
  answer: string;
  citations: Turn['state']['citations'];
  activity: Array<{ tool: string; status: string }>;
  manualReview: string;
}

/** Creates only its own synthetic workspace. It cannot open a user-selected database. */
export async function runQualification(options: {
  provider?: (item: Case, expected: Expected[]) => ModelProvider;
  label: string;
  retain?: boolean;
  signal?: AbortSignal;
  progress?: (message: string) => void;
}) {
  const root = mkdtempSync(join(tmpdir(), 'counsel-workspace-qualification-'));
  const databasePath = join(root, 'workspace.sqlite3');
  let store = new WorkspaceStore({ databasePath });
  let chat: WorkspaceChat | undefined;
  try {
    options.signal?.throwIfAborted();
    if (options.retain)
      options.progress?.(`Synthetic test database retained for inspection: ${databasePath}`);
    const { records } = store.importSeed(practice);
    const cases = QUALIFICATION_CASES.map((item) => ({
      item,
      expected: expectations(store, records, item),
      conversation: store.conversations.create({
        scope: 'matter',
        matterId: records.matters[item.matter]!,
      }),
    }));
    let selected = 0;
    chat = new WorkspaceChat(store, () => {
      const entry = cases[selected++]!;
      const provider =
        options.provider?.(entry.item, entry.expected) ??
        fixtureProvider(entry.item, entry.expected);
      return {
        id: provider.id,
        kind: provider.kind,
        capabilities: provider.capabilities,
        async *run(req: StepRequest): AsyncIterable<StepEvent> {
          const signals = [
            AbortSignal.timeout(120_000),
            ...(req.signal ? [req.signal] : []),
            ...(options.signal ? [options.signal] : []),
          ];
          yield* provider.run({ ...req, signal: AbortSignal.any(signals) });
        },
      };
    });
    const turnIds: string[] = [];
    // Overlap two independently scoped chats; then run the document scenario.
    for (const batch of [cases.slice(0, 2), cases.slice(2)]) {
      options.signal?.throwIfAborted();
      for (const entry of batch) {
        options.progress?.(`Starting synthetic ${entry.item.id} check.`);
        turnIds.push(
          chat.start(entry.conversation.id, { clientId: randomUUID(), message: entry.item.prompt })
            .id,
        );
      }
      await chat.idle();
    }
    const reports: CaseReport[] = [];
    const exports: Array<{ id: string; bytes: Buffer }> = [];
    const beforeReopen = turnIds.map((id) => store.conversations.turn(id));
    for (let i = 0; i < cases.length; i++) {
      const { item, expected, conversation } = cases[i]!,
        turn = beforeReopen[i]!;
      const work = turn.workId ? store.getWork(turn.workId) : null;
      const checks: Record<string, boolean> = {
        completed: turn.status === 'complete',
        ...qualificationEvidence(turn, expected),
        savedAsDraftOutput: work?.disposition === 'draft' && !!work.output,
        noUnrequestedKnowledge: turn.state.proposalIds.length === 0,
        matterUnchanged: store.matterBrief(conversation.matterId!) === null,
        briefReview:
          item.id === 'investigation'
            ? turn.state.briefProposal?.review === 'pending'
            : !turn.state.briefProposal,
        wordExport: false,
      };
      if (work) {
        try {
          const file = await store.exports.create(work.id);
          const bytes = Buffer.from(store.exports.download(file.id).bytes);
          exports.push({ id: file.id, bytes });
          checks.wordExport = bytes.length > 0;
        } catch {
          /* A failed artifact check is a failure, not an omitted check. */
        }
      }
      reports.push({
        id: item.id,
        conversationId: conversation.id,
        turnId: turn.id,
        status: turn.status,
        error: turn.state.error ?? null,
        checks,
        observations: { explicitSearchCalls: turn.state.activity.filter(a => a.name === 'counsel_search_records' && a.status === 'complete').length,
          contextRecordsRead: turn.state.context.filter(record => record.ranges.length > 0).length },
        answer: turn.state.answer,
        citations: turn.state.citations,
        activity: turn.state.activity.map((a) => ({ tool: a.name, status: a.status })),
        manualReview: item.review,
      });
      options.progress?.(
        `Finished synthetic ${item.id}: ${Object.values(checks).every(Boolean) ? 'structural checks passed; manual review required' : 'needs investigation'}.`,
      );
    }
    store.close();
    store = new WorkspaceStore({ databasePath });
    const reopened =
      beforeReopen.every(
        (turn) => JSON.stringify(store.conversations.turn(turn.id)) === JSON.stringify(turn),
      ) &&
      exports.every((file) =>
        Buffer.from(store.exports.download(file.id).bytes).equals(file.bytes),
      );
    return {
      mode: options.provider ? 'live-provider' : 'model-free-fixture',
      provider: options.label,
      ...(options.retain ? { databasePath } : {}),
      cases: reports,
      reopened,
      structuralChecksPassed:
        reopened && reports.every((r) => Object.values(r.checks).every(Boolean)),
      qualification: 'manual-review-required' as const,
      limitations:
        'This is not release qualification. Exact quotes and structural checks do not establish legal reasoning, claim support, hostile-tool isolation, expired-login renewal, cancellation, or billing behavior. There are no automatic reruns.',
    };
  } finally {
    chat?.stop();
    await chat?.idle();
    store.close();
    if (!options.retain) rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try {
    const options = qualificationOptions(process.argv.slice(2));
    if (options.mode === 'plan') {
      console.log(
        JSON.stringify(
          {
            mode: 'plan-only',
            modelCalls: 0,
            liveTurns: 3,
            concurrentTurns: 2,
            perTurnTimeoutSeconds: 120,
            cases: QUALIFICATION_CASES,
            usage:
              'No arguments: plan only. --fixture: model-free runner check. Live: --live --provider codex|claude-code --model MODEL --allow-plan-usage. Subscription usage only; no API keys or billing fallback. A live run retains its new synthetic database for inspection.',
          },
          null,
          2,
        ),
      );
    } else {
      // Importing/constructing a live adapter occurs only after explicit argument validation.
      let createProvider: (() => ModelProvider) | undefined;
      if (options.mode === 'live' && options.provider === 'codex') {
        const { WorkspaceCodexProvider } = await import('./codex');
        createProvider = () => new WorkspaceCodexProvider(options.model);
      } else if (options.mode === 'live') {
        const { WorkspaceClaudeCodeProvider } = await import('./claude-code');
        createProvider = () => new WorkspaceClaudeCodeProvider(options.model, 'subscription');
      }
      const abort = new AbortController();
      const stop = () => abort.abort();
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
      try {
        const report = await runQualification({
          provider: createProvider,
          label:
            options.mode === 'fixture'
              ? 'scripted-fixture'
              : `${options.provider}/${options.model}`,
          retain: options.mode === 'live',
          signal: abort.signal,
          progress: (message) => console.error(message),
        });
        console.log(JSON.stringify(report, null, 2));
        if (!report.structuralChecksPassed) process.exitCode = 1;
      } finally {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
      }
    }
  } catch {
    console.error(
      'Qualification did not complete. Use --help to check the explicit options. No automatic retry or API fallback was attempted.',
    );
    process.exitCode = 1;
  }
}
