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

  test('a standard named in the message is not mistaken for the document', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: '2026-09-01T09:59:00.000Z', content: 'Compare `matters/acme/services.md` against `practice/standards/liability.md`.' },
      EVENTS[1]!,
    ];
    expect(documentFor(events, '11111111-1111-4111-8111-111111111111')).toBe('matters/acme/services.md');
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
    expect(cap.match_any.every(t => t.includes(' '))).toBe(true);
    expect(draft.notes).toEqual([]);
  });

  test('a title keeps its punctuation, because the answer does', () => {
    // A scorer only lowercases and collapses spaces, so a term rebuilt from
    // split tokens ("auto renewal") never matches an answer that wrote
    // "auto-renewal".
    for (const [title, term] of [
      ['Auto-renewal', 'auto-renewal'],
      ['Non-compete is overbroad', 'non-compete is overbroad'],
      ['Customer’s indemnity is uncapped', 'customer’s indemnity is uncapped'],
    ] as const) {
      const answer = { findings: [{ title, severity: 'red', clause: '', rationale: 'x', citations: [] }], citations: [] };
      expect(draftFromThread({ ...deps, runs: [run({ output: answer })] }).catches[0]!.match_any).toEqual([term]);
    }
  });

  test('a scorer matches on phrases, never on a bare word', () => {
    // `containsAny` is an `or`: one bare word marks a catch found in any
    // answer that happens to use it, and on a rejected finding it zeroes a
    // quarter of the score for good.
    const events: ThreadEvent[] = [
      EVENTS[0]!,
      EVENTS[1]!,
      { type: 'text', text: '**Liability cap (Section 5)** — too low\nRationale: it is.\n', at: '2026-09-01T10:00:05.000Z' },
    ];
    const draft = draftFromThread({ ...deps, events, runs: [run({ output: undefined })] });
    const terms = draft.catches[0]!.match_any;
    expect(terms).toContain('liability cap');
    expect(terms.every(t => t.includes(' '))).toBe(true);
    // And a word every contract heading carries is not a term at all.
    expect(terms.join(' ')).not.toContain('section');
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

  test('a citation that is not a knowledge file is not carried into the fixture', () => {
    // A structured answer can cite anything; a matter path would put the
    // practice's own filing into a file meant to carry none of it.
    const answer = { ...ANSWER, citations: ['memory/matters/acme-globex.md', 'practice/standards/liability.md', 'https://example.com/x'] };
    const draft = draftFromThread({ ...deps, runs: [run({ output: answer })] });
    expect(draft.citations.map(c => c.aliases[0])).toEqual(['practice/standards/liability.md']);
    expect(draft.knowledge.map(k => k.path)).toEqual(['practice/standards/liability.md']);
    expect(JSON.stringify(draft.citations)).not.toContain('acme');
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

  test('what the lawyer scrubs from the text is scrubbed from the quotes and the terms too', () => {
    // The textarea is the screen's one remediation. If deleting a leftover
    // name left it standing in an expected catch, the edit would look like
    // it worked and not have.
    const draft = draftFromThread(deps);
    const cap = draft.catches[0]!;
    expect(cap.clause).not.toBe('');
    const withoutTheClause = draft.text.replace(cap.clause, 'the cap is agreed');
    const { fixture } = fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id), text: withoutTheClause });

    const saved = fixture.expected_catches.find(c => c.id === cap.id);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    // Either it is gone, or nothing it matches on is missing from the text.
    if (saved !== undefined) {
      expect(saved.clause === undefined || saved.clause === '' || withoutTheClause.includes(saved.clause)).toBe(true);
      for (const t of saved.match_any) expect(withoutTheClause.toLowerCase()).toContain(t.toLowerCase());
    }
  });

  test('an ordinary word that leaves the document does not take a finding with it', () => {
    // The rule is about a NAME the pass missed and the lawyer removed, not
    // about vocabulary: deleting an insurance clause makes "there is no
    // insurance floor" more true, not less.
    const missing = {
      findings: [{ title: 'No insurance floor for the vendor', severity: 'yellow', clause: '', rationale: 'The agreement sets no minimum insurance limits.', citations: [] }],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, readDocument: () => `${DOC}\n9. Insurance. Vendor keeps insurance with the Whitfield Mutual office.\n`, runs: [run({ output: missing })] });
    const withoutTheClause = draft.text.split('\n').filter(l => !l.includes('Insurance')).join('\n');
    const { fixture, dropped } = fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id), text: withoutTheClause });
    expect(dropped).toEqual([]);
    expect(fixture.expected_catches).toHaveLength(1);
  });

  test('a rejected finding needs a phrase to penalize, never a bare word', () => {
    const bare = {
      findings: [{ title: 'No cap', severity: 'yellow', clause: '', rationale: 'There is none.', citations: [] }],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, runs: [run({ output: bare })] });
    // A short leading word stays in the phrase rather than being skipped
    // past: the term is "no cap", not the bare "cap" that would zero the
    // precision guard against "storage capacity is adequate".
    expect(draft.catches[0]!.match_any).toEqual(['no cap']);

    const single = { findings: [{ title: 'Indemnity', severity: 'yellow', clause: '', rationale: 'One word.', citations: [] }], citations: [] };
    const one = draftFromThread({ ...deps, runs: [run({ output: single })] });
    const { fixture, dropped } = fixtureFromDraft(one, { keep: [], reject: one.catches.map(c => c.id) });
    expect(fixture.negative_checks).toEqual([]);
    expect(dropped).toEqual(['Indemnity']);
  });

  test('a finding about a missing provision survives, quote or no quote', () => {
    // The commonest review finding of all: something the contract does NOT
    // say. It quotes nothing, so a rule that required every term to appear
    // in the document would delete it and leave a fixture that expects
    // nothing and scores 1.00 against any answer for ever.
    const missing = {
      findings: [{ title: 'No limitation of liability at all', severity: 'red', clause: '', rationale: 'Nothing caps it.', citations: [] }],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, runs: [run({ output: missing })] });
    const { fixture, dropped } = fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id) });
    expect(dropped).toEqual([]);
    expect(fixture.expected_catches).toHaveLength(1);
    expect(fixture.expected_catches[0]!.match_any).toEqual(['no limitation of liability']);
  });

  test('a rejected finding counsel invented still penalizes it, though nothing in the document says it', () => {
    const invented = {
      findings: [{ title: 'Arbitration clause is one-sided', severity: 'yellow', clause: 'all disputes go to arbitration in Zurich', rationale: 'It is.', citations: [] }],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, runs: [run({ output: invented })] });
    const { fixture } = fixtureFromDraft(draft, { keep: [], reject: draft.catches.map(c => c.id) });
    expect(fixture.negative_checks).toHaveLength(1);
    expect(fixture.negative_checks[0]!.match_any.length).toBeGreaterThan(0);
  });

  test('a finding about words the lawyer deleted is dropped, and the save says which', () => {
    const draft = draftFromThread(deps);
    const cap = draft.catches[0]!;
    // The lawyer takes the whole liability clause out of the document.
    const shorter = draft.text.replace(cap.clause, 'liability is agreed separately');
    const { fixture, dropped } = fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id), text: shorter });
    expect(dropped).toContain(cap.title);
    expect(fixture.expected_catches.map(c => c.id)).not.toContain(cap.id);
  });

  test('a name the lawyer scrubs from the document is scrubbed from the findings too', () => {
    // The pass misses a party with no legal suffix; the lawyer deletes it
    // from the text. It must not survive in a title, a rationale or an id.
    const named = {
      findings: [{ title: 'Zephyr Robotics carries the whole risk', severity: 'red', clause: '', rationale: 'Zephyr Robotics carries it.', citations: [] }],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, readDocument: () => `${DOC}\n9. Zephyr Robotics carries the risk.\n`, runs: [run({ output: named })] });
    // The pass has no pattern for a name with no legal suffix, so it stands.
    expect(draft.text).toContain('Zephyr Robotics');
    expect(draft.catches[0]!.id).toContain('zephyr');

    const scrubbed = draft.text.replace(/Zephyr Robotics/g, 'the vendor');
    // Every finding was about the name they removed, so there is nothing
    // left to expect — and a fixture that expects nothing scores 1.00
    // against any answer for ever.
    expect(() => fixtureFromDraft(draft, { keep: draft.catches.map(c => c.id), text: scrubbed })).toThrow(/nothing left for this fixture to expect/);
  });

  test('the finding about a scrubbed name goes; the others stay', () => {
    const both = {
      findings: [
        { title: 'Zephyr Robotics carries the whole risk', severity: 'red', clause: '', rationale: 'Zephyr Robotics carries it.', citations: [] },
        { title: 'Liability cap is too low', severity: 'red', clause: "Vendor's aggregate liability shall not exceed $50,000", rationale: 'Too low.', citations: [] },
      ],
      citations: [],
    };
    const draft = draftFromThread({ ...deps, readDocument: () => `${DOC}\n9. Zephyr Robotics carries the risk.\n`, runs: [run({ output: both })] });
    const { fixture, dropped } = fixtureFromDraft(draft, {
      keep: draft.catches.map(c => c.id),
      text: draft.text.replace(/Zephyr Robotics/g, 'the vendor'),
    });
    expect(dropped).toEqual(['Zephyr Robotics carries the whole risk']);
    expect(fixture.expected_catches).toHaveLength(1);
    expect(JSON.stringify(fixture)).not.toContain('Zephyr');
  });

  test('the prompt is the lawyer’s to edit, and every path it names points at the fixture', () => {
    const draft = draftFromThread({
      ...deps,
      runs: [run({ message: 'Review this for Initech.\n\n`matters/acme/services.md` and `matters/initech/side-letter.md`' })],
    });
    expect(draft.message).not.toContain('matters/acme/services.md');
    expect(draft.message).not.toContain('matters/initech/side-letter.md');
    const { fixture } = fixtureFromDraft(draft, { keep: [], message: 'Review this contract.' });
    expect(fixture.task).toBe('Review this contract.');
  });

  test('a finding written as a heading or with a colon is still a finding', () => {
    const events: ThreadEvent[] = [
      EVENTS[0]!,
      EVENTS[1]!,
      {
        type: 'text',
        at: '2026-09-01T10:00:05.000Z',
        text: '### Liability cap\nCurrent language: "Vendor\'s aggregate liability shall not exceed $50,000"\n\n**Indemnity**: one-way\nRationale: it runs one way.\n',
      },
    ];
    const draft = draftFromThread({ ...deps, events, runs: [run({ output: undefined })] });
    expect(draft.catches.map(c => c.title)).toEqual(['Liability cap', 'Indemnity']);
  });

  test('the fixture is not named after the client’s document', () => {
    const named: ThreadEvent = { t: 'user', at: '2026-09-01T09:59:00.000Z', content: 'Review this.\n\n`matters/acme-globex-msa-2026.md`' };
    const draft = draftFromThread({ ...deps, events: [named, EVENTS[1]!] });
    expect(draft.id).not.toContain('acme');
    expect(draft.title).not.toContain('acme');
    expect(draft.id).toMatch(/^review-2026-09-01-[0-9a-f]{4}$/);

    // Two documents on one day are two fixtures, not a name clash whose
    // only offered remedy is replacing the first.
    const other = draftFromThread({ ...deps, readDocument: () => `${DOC}\n8. Assignment. Neither party may assign.\n` });
    expect(other.id).not.toBe(draft.id);
    // And the same document twice is the same name.
    expect(draftFromThread(deps).id).toBe(draftFromThread(deps).id);
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
