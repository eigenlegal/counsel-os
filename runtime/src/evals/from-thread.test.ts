import { describe, expect, test } from 'bun:test';
import type { RunRecord } from '../loop/run-record';
import type { ThreadEvent } from '../threads/store';
import { parseFixture } from './fixture';
import { documentFor, draftFromThread, fixtureFromDraft, NoFixtureHere, pathsInMessage, pickRun, slugify } from './from-thread';

const DOC = `# Services Agreement

Acme Holdings, Inc. ("Vendor") and Bytecraft Labs LLC ("Customer") agree as of March 15, 2024.

5. Liability. Vendor's aggregate liability shall not exceed $50,000.
6. Indemnity. Customer shall indemnify Vendor for any and all claims.
7. Term. This Agreement renews automatically unless notice is given 90 days before 2026-03-15.
`;

const ANSWER = {
  findings: [
    {
      title: 'Liability cap is too low for the contract value',
      severity: 'red',
      clause: "Vendor's aggregate liability shall not exceed $50,000",
      rationale: 'A cap of $50,000 sits far below the fees under this agreement.',
      citations: ['knowledge/practice-seed/standards/liability.md'],
    },
    {
      title: 'Indemnity is one-way',
      severity: 'yellow',
      clause: 'Customer shall indemnify Vendor for any and all claims',
      rationale: 'The indemnity runs only one way and is uncapped.',
      citations: [],
    },
  ],
  citations: ['knowledge/practice-seed/standards/liability.md', 'knowledge/law/contracts/indemnities.md'],
};

function run(over: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: '11111111-1111-4111-8111-111111111111',
    threadId: 't-1',
    tenant: 'default',
    startedAt: '2026-09-01T10:00:00.000Z',
    status: 'done',
    message: 'Review this.\n\n`matters/acme/services.md`',
    provider: 'claude-sub/claude-opus-5',
    task: 'review',
    primitivesRead: [],
    toolCalls: [],
    proposals: [],
    output: ANSWER,
    ...over,
  } as RunRecord;
}

const EVENTS: ThreadEvent[] = [
  { t: 'user', at: '2026-09-01T09:59:00.000Z', content: 'Review this.\n\n`matters/acme/services.md`' },
  { t: 'step', at: '2026-09-01T10:00:00.000Z', runId: '11111111-1111-4111-8111-111111111111', provider: 'claude-sub/claude-opus-5', task: 'review' },
];

const deps = {
  threadId: 't-1',
  events: EVENTS,
  runs: [run()],
  readDocument: () => DOC,
  readKnowledge: () => '# Liability\n\nAcme Holdings, Inc. gets no more than a 12-month cap.\n',
};

describe('reading the thread', () => {
  test('a backticked vault path in a message is a document; prose is not', () => {
    expect(pathsInMessage('Review this.\n\n`matters/acme/services.md`')).toEqual(['matters/acme/services.md']);
    expect(pathsInMessage('Use `bun test` on `src/x.ts` please')).toEqual([]);
    expect(pathsInMessage('`/etc/passwd`')).toEqual([]);
  });

  test('a run is attributed to the last document named before it', () => {
    const second = '22222222-2222-4222-8222-222222222222';
    const events: ThreadEvent[] = [
      ...EVENTS,
      { t: 'user', at: '2026-09-01T11:00:00.000Z', content: 'And this one.\n\n`matters/acme/nda.md`' },
      { t: 'step', at: '2026-09-01T11:00:01.000Z', runId: second, provider: 'claude-sub/claude-opus-5', task: 'review' },
    ];
    expect(documentFor(events, '11111111-1111-4111-8111-111111111111')).toBe('matters/acme/services.md');
    expect(documentFor(events, second)).toBe('matters/acme/nda.md');
  });

  test('the newest finished review wins, and anything else is refused by name', () => {
    const older = run({ runId: '33333333-3333-4333-8333-333333333333', startedAt: '2026-08-01T10:00:00.000Z' });
    expect(pickRun([older, run()]).runId).toBe('11111111-1111-4111-8111-111111111111');

    const redline = run({ runId: '44444444-4444-4444-8444-444444444444', task: 'redline' });
    expect(() => pickRun([redline], redline.runId)).toThrow(/this step was a redline/);
    expect(() => pickRun([run({ status: 'error', output: undefined })])).toThrow(NoFixtureHere);
    expect(() => pickRun([run({ status: 'error', output: undefined })], run().runId)).toThrow(/never finished/);
    expect(() => pickRun([])).toThrow(/finished review/);
  });

  test('slugs are lowercase, trimmed, and never empty', () => {
    expect(slugify('Liability cap is TOO low!')).toBe('liability-cap-is-too-low');
    expect(slugify('   ')).toBe('fixture');
    expect(slugify('...', 'finding-2')).toBe('finding-2');
  });
});

describe('the draft', () => {
  test('carries the anonymized document, and every quote takes the same mapping', () => {
    const draft = draftFromThread(deps);
    expect(draft.text).not.toContain('Acme');
    expect(draft.text).not.toContain('Bytecraft');
    expect(draft.text).not.toContain('$50,000');
    expect(draft.original).toBe(DOC);
    expect(draft.documentPath).toBe('matters/acme/services.md');

    // The catch quotes the anonymized document, not the real one, and the
    // quote is still findable in the text the fixture will carry.
    const cap = draft.catches[0]!;
    expect(cap.clause).not.toContain('$50,000');
    expect(draft.text).toContain(cap.clause);
    expect(cap.severity).toBe('red');
    expect(cap.id).toBe('liability-cap-is-too-low-for-the-contract-value');
    expect(cap.match_any.length).toBeGreaterThan(0);
    expect(draft.notes).toEqual([]);
  });

  test('the words a scorer matches on skip the ones every contract carries', () => {
    const events: ThreadEvent[] = [
      EVENTS[0]!,
      EVENTS[1]!,
      { type: 'text', text: '**Liability cap (Section 5)** — too low\nRationale: it is.\n', at: '2026-09-01T10:00:05.000Z' },
    ];
    const draft = draftFromThread({ ...deps, events, runs: [run({ output: undefined })] });
    expect(draft.catches[0]!.match_any).toContain('liability');
    expect(draft.catches[0]!.match_any).not.toContain('section');
  });

  test('the money in a finding rationale is anonymized too', () => {
    const draft = draftFromThread(deps);
    expect(draft.catches[0]!.why).not.toContain('$50,000');
  });

  test('citations become expected citations, by path and by name', () => {
    const draft = draftFromThread(deps);
    expect(draft.citations).toEqual([
      { id: 'liability-md', aliases: ['knowledge/practice-seed/standards/liability.md', 'liability'] },
      { id: 'indemnities-md', aliases: ['knowledge/law/contracts/indemnities.md', 'indemnities'] },
    ]);
  });

  test('a quote the document does not contain is called out rather than saved quietly', () => {
    const invented = { ...ANSWER, findings: [{ ...ANSWER.findings[0]!, clause: 'a clause nobody wrote' }] };
    const draft = draftFromThread({ ...deps, runs: [run({ output: invented })] });
    expect(draft.notes.join(' ')).toContain('quotes text that is not in the document');
  });

  test('a conversation with no document, and one whose document will not read, both refuse', () => {
    expect(() => draftFromThread({ ...deps, events: [EVENTS[1]!] })).toThrow(/does not name a document/);
    expect(() => draftFromThread({ ...deps, readDocument: () => null })).toThrow(/not readable from the vault/);
  });

  test('an answer with no findings in it, structured or written, refuses', () => {
    expect(() => draftFromThread({ ...deps, runs: [run({ output: { text: 'looks fine to me' } })] })).toThrow(/No findings could be read/);
  });

  test('a chat review answers in prose, and the draft reads its findings back out', () => {
    const written = `Here is the review.

## RED — must fix

**Liability cap (Section 5)** — the cap is far below the fees
Current language: "Vendor's aggregate liability shall not exceed $50,000"
Rationale: A cap this size does not survive a single incident.
Priority: Tier 1

## YELLOW — worth raising

**Indemnity (Section 6)** — one-way and uncapped
Current language: "Customer shall indemnify Vendor for any and all claims"
Rationale: The indemnity runs only one way.

That is everything I found.`;
    const events: ThreadEvent[] = [
      EVENTS[0]!,
      EVENTS[1]!,
      { type: 'text', text: written, at: '2026-09-01T10:00:05.000Z' },
    ];
    const draft = draftFromThread({ ...deps, events, runs: [run({ output: undefined })] });

    expect(draft.catches.map(c => c.title)).toEqual(['Liability cap (Section 5)', 'Indemnity (Section 6)']);
    expect(draft.catches.map(c => c.severity)).toEqual(['red', 'yellow']);
    // The quote is anonymized with the document, and still found in it.
    expect(draft.catches[0]!.clause).not.toContain('$50,000');
    expect(draft.text).toContain(draft.catches[0]!.clause);
    // And the lawyer is told these were read from prose.
    expect(draft.notes.join(' ')).toContain('read from what counsel wrote');
  });

  test('a written answer cites by naming the file, and those files travel with the fixture', () => {
    const events: ThreadEvent[] = [
      EVENTS[0]!,
      EVENTS[1]!,
      {
        type: 'text',
        at: '2026-09-01T10:00:05.000Z',
        text: '**Liability cap (Section 5)** — too low\nRationale: see `practice/standards/liability.md` and law/contracts/caps.md.\n',
      },
    ];
    const draft = draftFromThread({ ...deps, events, runs: [run({ output: undefined })] });
    expect(draft.citations.map(c => c.aliases[0])).toEqual(['practice/standards/liability.md', 'law/contracts/caps.md']);
    expect(draft.knowledge.map(k => k.path)).toEqual(['practice/standards/liability.md', 'law/contracts/caps.md']);
  });

  test('a bold phrase with no quote and no reason is not a finding', () => {
    const events: ThreadEvent[] = [EVENTS[0]!, EVENTS[1]!, { type: 'text', text: 'I read the **Services Agreement** closely.', at: '2026-09-01T10:00:05.000Z' }];
    expect(() => draftFromThread({ ...deps, events, runs: [run({ output: undefined })] })).toThrow(/No findings could be read/);
  });

  test('names the caller supplies are replaced even without a corporate suffix', () => {
    // A matter knows its counterparty by a short name that carries no `Inc.`
    // for the pattern to find; the caller passes it in.
    const draft = draftFromThread({
      ...deps,
      readDocument: () => 'Orbit engages Bytecraft Labs LLC. Orbit pays on delivery.',
      names: [{ name: 'Orbit', kind: 'org' }],
    });
    expect(draft.text).not.toContain('Orbit');
    expect(draft.replacements.find(r => r.from === 'Orbit')?.count).toBe(2);
  });
});

describe('the fixture the lawyer saves', () => {
  test('kept findings are expected, rejected ones are negative checks, and dropped ones are neither', () => {
    const draft = draftFromThread(deps);
    const [cap, indemnity] = draft.catches;
    const { fixture } = fixtureFromDraft(draft, { keep: [cap!.id], reject: [indemnity!.id] });

    expect(fixture.expected_catches.map(c => c.id)).toEqual([cap!.id]);
    expect(fixture.negative_checks.map(c => c.id)).toEqual([indemnity!.id]);
    expect(fixture.input?.['contract_text']).toBe(draft.text);
    expect(fixture.source).toEqual({ kind: 'practice', name: 'thread t-1' });
    // Citing a file the review itself used is not a hallucinated source.
    expect(fixture.allowed_citation_aliases).toContain('knowledge/practice-seed/standards/liability.md');

    const dropped = fixtureFromDraft(draft, { keep: [cap!.id] });
    expect(dropped.fixture.negative_checks).toEqual([]);
  });

  test('the fixture carries a mini-vault, so it can be RUN and not only scored', () => {
    const draft = draftFromThread(deps);
    const { fixture, vault, files } = fixtureFromDraft(draft, { keep: [], id: 'services' });

    // `vault` is what makes a fixture runnable (evals/select.ts).
    expect(fixture.vault).toBe('services');
    expect(vault).toBe('services');
    expect(files.map(f => f.path)).toEqual([
      'config.md',
      'matters/document.md',
      'knowledge/practice-seed/standards/liability.md',
      'knowledge/law/contracts/indemnities.md',
    ]);
    expect(files.find(f => f.path === 'config.md')!.text).toContain('legal_root: __VAULT_PATH__');
    expect(files.find(f => f.path === 'matters/document.md')!.text).toBe(draft.text);

    // The cited standard is copied in, anonymized with the same mapping —
    // the fixture measures against the standards this review used, and a
    // later edit to the practice cannot change what it expects.
    const standard = files.find(f => f.path.endsWith('liability.md'))!.text;
    expect(standard).not.toContain('Acme');
    expect(standard).toContain('12-month cap');

    // The step's message is the lawyer's own, pointed at the fixture's copy.
    expect(fixture.task).toContain('matters/document.md');
    expect(fixture.task).not.toContain('matters/acme/services.md');
  });

  test('a citation that cannot be read is named, not fatal', () => {
    const draft = draftFromThread({ ...deps, readKnowledge: () => null });
    expect(draft.knowledge).toEqual([]);
    expect(draft.notes.join(' ')).toContain('could not be read');
    expect(fixtureFromDraft(draft, { keep: [] }).files.map(f => f.path)).toEqual(['config.md', 'matters/document.md']);
  });

  test('the saved file is a fixture the loader accepts', () => {
    const draft = draftFromThread(deps);
    const { fixture } = fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id), id: 'Acme Services 2026', title: 'Services agreement' });
    // Round-trips through the real parser: a draft that the eval runner
    // cannot load is not a fixture, however good it looks.
    const parsed = parseFixture(JSON.parse(JSON.stringify(fixture)));
    expect(parsed.id).toBe('acme-services-2026');
    expect(parsed.title).toBe('Services agreement');
    expect(parsed.scorer).toBe('findings');
    expect(parsed.expected_catches).toHaveLength(2);
  });

  test('the lawyer’s own edit of the anonymized text is what gets saved', () => {
    const draft = draftFromThread(deps);
    const { fixture, files } = fixtureFromDraft(draft, { keep: [], text: 'Edited by hand.' });
    expect(fixture.input?.['contract_text']).toBe('Edited by hand.');
    // And the vault's copy is the same text, not the draft's.
    expect(files.find(f => f.path === 'matters/document.md')!.text).toBe('Edited by hand.');
    expect(() => fixtureFromDraft(draft, { keep: [], text: '   ' })).toThrow(/no document text/);
  });
});
