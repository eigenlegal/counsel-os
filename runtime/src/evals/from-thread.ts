/**
 * "Make this a fixture" (routing-and-evals spec §8): the review the lawyer
 * just read becomes a fixture the scoreboard can run forever.
 *
 * The scoreboard is only as personal as what it measures. Shipped fixtures
 * measure a generic practice; this turns the practice's own work into the
 * measurement — the document that came in, the findings counsel raised, and
 * the lawyer's verdict on each one.
 *
 * Three rules hold the feature together:
 *
 * - **The lawyer decides what is expected.** A draft is a proposal: every
 *   finding starts as a candidate catch, and the save says which are kept
 *   (expected catches) and which are wrong (negative checks — the fixture
 *   then penalizes a model for raising them again).
 * - **Nothing leaves as itself.** The document is anonymized before it ever
 *   reaches a fixture file, and the same mapping is applied to every quote
 *   the fixture matches on, so the fixture is internally consistent.
 * - **Nothing is saved until the anonymized text has been read.** This
 *   module builds the draft; the save is a separate step behind the review
 *   screen.
 *
 * The scope today is the `review` task. Its answer is read from the
 * structured findings when the caller asked for them, and otherwise from
 * counsel's own written format (`findingsFromText`), because a chat review
 * answers in prose. A redline fixture needs the .docx anonymized rather than
 * its text, and a rubric fixture needs criteria the lawyer writes; both
 * refuse here by name rather than producing a fixture that cannot be
 * scored.
 */
import type { RunRecord } from '../loop/run-record';
import type { ThreadEvent } from '../threads/store';
import { anonymize, type Replacement } from './anonymize';
import { FindingsAnswer } from './schemas';
import type { Fixture } from './fixture';

/** One finding, as the draft offers it to the lawyer. */
export interface DraftCatch {
  id: string;
  title: string;
  severity: 'red' | 'yellow' | 'green';
  /** The quote from the document, anonymized with the document. */
  clause: string;
  why: string;
  match_any: string[];
}

export interface FixtureDraft {
  /** The proposed fixture id: a slug the lawyer can change. */
  id: string;
  title: string;
  scorer: 'findings';
  task: string;
  /** The anonymized document — what the fixture will carry. */
  text: string;
  /** The document as it is in the vault. Never written to a fixture; the
   * review screen shows it beside the anonymized text and nowhere else. */
  original: string;
  documentPath: string | null;
  /** The lawyer's own words that started the review, anonymized, with the
   * document's path rewritten to where it sits in the fixture vault. This is
   * what the eval runner sends as the step's message. */
  message: string;
  /** The practice files the answer cited, anonymized, at the paths a fixture
   * vault keeps them: the fixture measures the model against the same
   * standards the review used, and stops drifting when the practice edits
   * them later. */
  knowledge: { path: string; text: string }[];
  replacements: Replacement[];
  catches: DraftCatch[];
  citations: { id: string; aliases: string[] }[];
  from: { threadId: string; runId: string; providerId: string; at: string };
  /** What the lawyer should know before saving: what the pass could not do. */
  notes: string[];
}

export class NoFixtureHere extends Error {}

/** The words of a string, lowercased — what "the lawyer deleted this" is
 * measured in. Short words are ignored: they carry no name. */
function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^\da-z']+/)
      .filter(w => w.length > 2),
  );
}

/** FNV-1a, for a short stable mark on a fixture's default name. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Where the document lives inside a fixture's own mini-vault. One fixed
 * path: a matter's real path names a client. */
export const FIXTURE_DOCUMENT = 'matters/document.md';

/** The minimal `config.md` a fixture vault needs; `prepareFixtureVault`
 * rewrites the placeholder to the temp copy's real path. */
export const FIXTURE_CONFIG = ['# Counsel OS Configuration', '', 'counsel-os-config: true', 'config_version: 1', 'legal_root: __VAULT_PATH__', ''].join('\n');

/** A fixture id, and the id of a catch: a lowercase slug, never empty. */
export function slugify(s: string, fallback = 'fixture'): string {
  const slug = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\da-z]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? fallback : slug;
}

/** The vault paths a message names as chips: the composer writes an
 * attachment as a backticked path, so that is what a document looks like in
 * a thread. */
export function pathsInMessage(message: string): string[] {
  const out: string[] = [];
  for (const m of message.matchAll(/`([^`\n]+)`/g)) {
    const path = (m[1] ?? '').trim();
    if (/\.(md|markdown|txt|docx)$/i.test(path) && !path.startsWith('/')) out.push(path);
  }
  return out;
}

/**
 * The run a fixture would be built from: the newest finished `review` run in
 * the thread, or the one the caller named. A run that errored never got to
 * an answer; another task's run is not a review. Whether the answer holds
 * findings is the draft's question, not this one.
 */
export function pickRun(runs: RunRecord[], runId?: string): RunRecord {
  const scorable = runs.filter(r => r.status === 'done' && (r.task ?? 'review') === 'review');
  if (runId !== undefined) {
    const named = runs.find(r => r.runId === runId);
    if (named === undefined) throw new NoFixtureHere('That step is not in this conversation.');
    if (!scorable.includes(named)) {
      throw new NoFixtureHere(
        named.task !== undefined && named.task !== 'review'
          ? `A fixture is made from a review; this step was a ${named.task}.`
          : 'That step never finished, so there is nothing to expect from it.',
      );
    }
    return named;
  }
  const latest = [...scorable].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0];
  if (latest === undefined) throw new NoFixtureHere('Nothing in this conversation is a finished review with findings.');
  return latest;
}

/** The document this run read: the last path named before it, so a thread
 * that reviewed two documents attributes each run to its own. */
export function documentFor(events: ThreadEvent[], runId: string): string | null {
  let found: string | null = null;
  for (const e of events) {
    // The union also holds live step events, which carry `type`, not `t`.
    if (!('t' in e)) continue;
    if (e.t === 'user') {
      // The document under review, not a standard the message also names:
      // "compare `matters/a.md` against `practice/standards/x.md`" is about
      // the matter's file.
      const paths = pathsInMessage(e.content).filter(p => !isKnowledgePath(p));
      if (paths.length > 0) found = paths.at(-1) ?? found;
    }
    if (e.t === 'step' && e.runId === runId) return found;
  }
  return found;
}

/** What counsel wrote for this run: the text events between its step and
 * the next one. */
export function answerText(events: ThreadEvent[], runId: string): string {
  const parts: string[] = [];
  let inside = false;
  for (const e of events) {
    if ('t' in e && e.t === 'step') {
      if (inside) break;
      inside = e.runId === runId;
      continue;
    }
    if (inside && !('t' in e) && e.type === 'text') parts.push(e.text);
  }
  return parts.join('');
}

const SEVERITY_LINE = /\b(RED|YELLOW|GREEN)\b/;
// `**Title** — summary`, `**Title**: summary`, `- **Title**`, and a markdown
// heading (`### Title`). A finding counsel wrote as a heading is still a
// finding, and dropping it silently would show the lawyer a short list that
// looks complete.
const FINDING_HEAD = /^\s*(?:[-*]\s*)?\*\*(.+?)\*\*\s*(?:[—–:-]\s*(.*))?$|^\s*#{2,6}\s+(?!RED\b|YELLOW\b|GREEN\b)(.+?)\s*$/;
const QUOTED = /^\s*(?:Current language|Language|Clause)\s*:\s*(.*)$/i;
const RATIONALE = /^\s*(?:Rationale|Why|Gap)\s*:\s*(.*)$/i;
const TIER = /^\s*Priority\s*:\s*Tier\s*([123])/i;

/**
 * The findings counsel wrote in prose, read back out of its own documented
 * per-issue format (`primitives/evaluate.md`): a bold clause name, a
 * `Current language:` quote, a rationale, and a RED/YELLOW/GREEN heading
 * above the group.
 *
 * A chat review answers in prose, not JSON — only a caller that asks for a
 * schema (the plugin, the eval runner) gets a structured answer. Without
 * this, "make this a fixture" would be unavailable on exactly the review a
 * lawyer just did by hand.
 */
export function findingsFromText(text: string): { title: string; severity: 'red' | 'yellow' | 'green'; clause: string; rationale: string }[] {
  const out: { title: string; severity: 'red' | 'yellow' | 'green'; clause: string; rationale: string }[] = [];
  let severity: 'red' | 'yellow' | 'green' = 'yellow';
  let current: (typeof out)[number] | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const head = FINDING_HEAD.exec(line);
    // A group heading announces the colour of every finding under it —
    // "## RED — must fix". A finding's own bold title is checked first, so a
    // finding that happens to say RED is not mistaken for a heading.
    if (head === null) {
      const colour = /^\s*(?:#{1,6}\s*)?(?:RED|YELLOW|GREEN)\b/.exec(line);
      if (colour !== null) {
        severity = (SEVERITY_LINE.exec(colour[0])?.[1] ?? 'YELLOW').toLowerCase() as 'red' | 'yellow' | 'green';
        continue;
      }
    }
    const title = (head?.[1] ?? head?.[3] ?? '').trim();
    if (head !== null && title.length > 2) {
      current = { title, severity, clause: '', rationale: (head[2] ?? '').trim() };
      out.push(current);
      continue;
    }
    if (current === null) continue;
    const quoted = QUOTED.exec(line);
    if (quoted !== null) {
      current.clause = (quoted[1] ?? '').trim().replace(/^["“](.*)["”]$/s, '$1').trim();
      continue;
    }
    const why = RATIONALE.exec(line);
    if (why !== null && current.rationale === '') current.rationale = (why[1] ?? '').trim();
    const tier = TIER.exec(line);
    // A tier is not a severity, but it is the only signal in a document that
    // never wrote a colour heading.
    if (tier !== null && !SEVERITY_LINE.test(text)) current.severity = tier[1] === '1' ? 'red' : tier[1] === '2' ? 'yellow' : 'green';
  }
  // A "finding" with neither a quote nor a reason is a bold phrase in a
  // sentence, not a finding.
  return out.filter(f => f.clause !== '' || f.rationale !== '');
}

/**
 * A knowledge file a fixture may carry: the practice's own standards and the
 * law it keeps, by a plain relative path.
 *
 * The paths come from MODEL OUTPUT — a citation list, or a path written into
 * an answer about a document the counterparty wrote. So this is a
 * whitelist, not a filter: no `..`, no absolute path, no backslash, and
 * never `memory/`, which in this vault is matter-derived and carries other
 * clients' work.
 */
export function isKnowledgePath(path: string): boolean {
  if (!/^(?:practice|law|knowledge)\/[A-Za-z0-9._/-]+\.md$/.test(path)) return false;
  return !path.split('/').some(seg => seg === '..' || seg === '.' || seg === '');
}

/** Vault paths a written answer names: `practice/standards/liability.md`,
 * with or without backticks. The same knowledge files a structured answer
 * would have listed as citations. */
export function citedPaths(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(?:practice|law|knowledge)\/[\w./-]+\.md\b/g)) out.add(m[0]);
  return [...out];
}

/**
 * The terms a scorer matches this finding by — PHRASES, never bare words.
 *
 * A single word is both too generous and too dangerous here. `containsAny`
 * is an `or` over the list, so `["liability"]` marks the catch found in any
 * answer that says "liability"; and on a REJECTED finding, one bare word
 * that a later answer happens to use zeroes a quarter of the score for
 * good. The hand-written fixtures use phrases for exactly this reason.
 */
function matchTerms(title: string, clause: string): string[] {
  // Ordinary words, plus the ones every contract heading carries: a scorer
  // that matches on "section" matches on anything.
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'are', 'for', 'with', 'no', 'not', 'too', 'by', 'on', 'at', 'this', 'that', 'its',
    'section', 'clause', 'article', 'provision', 'agreement', 'exhibit', 'schedule', 'paragraph', 'part',
  ]);
  const terms: string[] = [];
  const quote = clause.trim().split(/\s+/).filter(w => w !== '');
  // The quote, as much of it as reads as one phrase.
  if (quote.length > 0) terms.push(quote.slice(0, 8).join(' ').toLowerCase());

  // And a CONTIGUOUS phrase from the title. Joining the surviving words of a
  // stop-word filter makes a string no answer can contain ("liability cap
  // low"); the words have to stay in the order and company they were
  // written in, starting at the first one that carries meaning.
  const words = title
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .split(/[^\da-z']+/)
    .filter(w => w !== '');
  const from = words.findIndex(w => w.length > 2 && !stop.has(w));
  if (from !== -1) {
    const phrase = words.slice(from, from + 4).join(' ').trim();
    if (phrase !== '' && !terms.includes(phrase)) terms.push(phrase);
  }
  return terms;
}

/**
 * The knowledge files a run's answer cited, whatever shape the answer took.
 * The caller reads them (through the vault store, which is where the guards
 * live) and hands the text back through `readKnowledge`.
 */
export function citationsFor(run: RunRecord, events: ThreadEvent[]): string[] {
  const typed = FindingsAnswer.safeParse(run.output);
  const cited = typed.success ? typed.data.citations : citedPaths(answerText(events, run.runId));
  return [...new Set(cited)].filter(isKnowledgePath);
}

export interface DraftOptions {
  threadId: string;
  events: ThreadEvent[];
  runs: RunRecord[];
  /** Which run; the newest finished review by default. */
  runId?: string;
  /** The document's text, already extracted from .docx if it needed it.
   * `null` when the path cannot be read. */
  readDocument(path: string): string | null;
  /** A practice or law file the answer cited. `null` when it cannot be
   * read — a citation to something that has since moved is not fatal. */
  readKnowledge?(path: string): string | null;
  /** Names the lawyer already knows are parties: the matter's client and
   * counterparty. Passed to the anonymizer, which cannot infer them. */
  names?: { name: string; kind?: 'org' | 'person' }[];
  title?: string;
}

/**
 * Builds the draft. Nothing is written: this returns what the review screen
 * shows and what a later save turns into a fixture file.
 */
export function draftFromThread(opts: DraftOptions): FixtureDraft {
  const run = pickRun(opts.runs, opts.runId);
  const typed = FindingsAnswer.safeParse(run.output);
  const prose = typed.success ? [] : findingsFromText(answerText(opts.events, run.runId));
  if (!typed.success && prose.length === 0) {
    throw new NoFixtureHere('No findings could be read from that review, so there is nothing for a fixture to expect.');
  }
  const found = typed.success ? typed.data.findings : prose.map(f => ({ ...f, citations: [] as string[] }));
  // A prose answer cites by naming the file in the text, so the paths are
  // read back the same way the findings are.
  const answered = typed.success ? typed.data.citations : citedPaths(answerText(opts.events, run.runId));

  const path = documentFor(opts.events, run.runId);
  const original = path === null ? null : opts.readDocument(path);
  if (path === null) throw new NoFixtureHere('This conversation does not name a document, so there is nothing to score against.');
  if (original === null || original.trim() === '') throw new NoFixtureHere(`The document is not readable from the vault: ${path}`);

  const notes: string[] = [];
  if (!typed.success) notes.push('These findings were read from what counsel wrote, not from a structured answer. Check each quote and severity.');
  const a = anonymize(original, { ...(opts.names === undefined ? {} : { names: opts.names }) });
  if (a.replacements.length === 0) notes.push('The pass found nothing to replace. Read the text closely before you save it.');

  const seen = new Set<string>();
  const catches: DraftCatch[] = found.map((f, i) => {
    // The clause and the title are quotes from the same document, so they
    // take the same mapping — otherwise the fixture would expect a quote
    // that its own document no longer contains.
    const clause = a.apply(f.clause);
    const title = a.apply(f.title);
    let id = slugify(title, `finding-${i + 1}`);
    while (seen.has(id)) id = `${id}-${seen.size + 1}`;
    seen.add(id);
    const inDocument = clause.trim() !== '' && a.text.includes(clause.trim());
    if (!inDocument) notes.push(`"${title}" quotes text that is not in the document; check its wording before you keep it.`);
    return { id, title, severity: f.severity, clause, why: a.apply(f.rationale), match_any: matchTerms(title, clause) };
  });
  if (catches.length === 0) notes.push('The review raised no findings, so this fixture would expect none. That is a fair thing to measure, but say so deliberately.');

  // A citation the fixture keeps names a knowledge file. Anything else the
  // answer listed — a matter path, a URL, a phrase — would put the
  // practice's own filing into a file meant to carry none of it.
  const citations = [...new Set(answered)].filter(isKnowledgePath).map(c => ({
    id: slugify(c.split('/').at(-1) ?? c, 'citation'),
    // The path and its own name: a model that cites either is citing this.
    aliases: [...new Set([c, (c.split('/').at(-1) ?? c).replace(/\.md$/, '')])],
  }));

  // The prompt travels into the fixture as the step's message, so it gets
  // the same pass as the document. Every path it names is rewritten, not
  // just this run's: a message that chips two files would otherwise carry
  // the other matter's real path.
  let message = a.apply(run.message);
  for (const p of new Set([path, ...pathsInMessage(run.message)])) message = message.replaceAll(p, FIXTURE_DOCUMENT);

  const knowledge: { path: string; text: string }[] = [];
  for (const from of citations.map(c => c.aliases[0] ?? '').filter(isKnowledgePath)) {
    const text = opts.readKnowledge?.(from) ?? null;
    if (text === null) notes.push(`The answer cited ${from}, which could not be read; the fixture will run without it.`);
    else knowledge.push({ path: from, text: a.apply(text) });
  }

  // NOT the document's filename: a matter's file is named after the client,
  // and the id becomes a filename and a folder in the practice's evals. The
  // default says what the fixture is; the lawyer names it on the review
  // screen.
  const stamp = run.startedAt.slice(0, 10);
  // The date alone collides on the second fixture of a day, and the only
  // way out the screen offers is "replace it" — which would delete the
  // first one. The suffix is the document's own fingerprint: stable for the
  // same document, different for another, and it names nothing.
  const mark = hash(a.text).toString(16).padStart(8, '0').slice(0, 4);
  const label = opts.title ?? `review ${stamp} ${mark}`;
  return {
    id: slugify(label, 'review'),
    title: label,
    scorer: 'findings',
    task: 'review',
    text: a.text,
    original,
    documentPath: path,
    message,
    knowledge,
    replacements: a.replacements,
    catches,
    citations,
    from: { threadId: opts.threadId, runId: run.runId, providerId: run.provider, at: run.startedAt },
    notes,
  };
}

export interface SaveDecisions {
  /** Ids of the catches the lawyer kept. Anything else in the draft is
   * either rejected (below) or dropped without comment. */
  keep: string[];
  /** Ids the lawyer marked wrong: counsel should not have raised them, so
   * the fixture penalizes raising them again. */
  reject?: string[];
  id?: string;
  title?: string;
  /** The anonymized text as the lawyer left it — they may have edited it on
   * the review screen. Defaults to the draft's own text. */
  text?: string;
  /** The step's message, as the lawyer left it. Defaults to the draft's. */
  message?: string;
}

/** What a save writes: the fixture file, and the mini-vault the runner
 * copies for each run. */
export interface SavedFixtureFiles {
  fixture: Fixture;
  /** Findings the save left out because the lawyer's edit removed what they
   * were about. Named so the screen can say it rather than quietly drop
   * them. */
  dropped: string[];
  /** The vault's name — the fixture's `vault` key, and the folder under
   * `practice/evals/vaults/`. */
  vault: string;
  /** Paths relative to that folder, with the text to write. */
  files: { path: string; text: string }[];
}

/**
 * The fixture, and its mini-vault, from a draft the lawyer has read and
 * decided on.
 *
 * A fixture with no vault can only be scored against a saved output, never
 * run — so this writes one: the anonymized document at a fixed path, the
 * config the resolver needs, and an anonymized copy of every practice file
 * the answer cited. The copies are the point: the fixture measures models
 * against the standards that review actually used, and a later edit to the
 * practice does not silently change what the fixture expects.
 */
export function fixtureFromDraft(draft: FixtureDraft, decisions: SaveDecisions): SavedFixtureFiles {
  const kept = new Set(decisions.keep);
  const rejected = new Set(decisions.reject ?? []);
  const text = decisions.text ?? draft.text;
  if (text.trim() === '') throw new NoFixtureHere('The fixture has no document text.');
  const id = decisions.id === undefined ? draft.id : slugify(decisions.id, draft.id);

  // The lawyer's edit to the document is the screen's one remediation: a
  // word they took out of the document must not survive in a quote, a
  // rationale, a title or a match term.
  //
  // The rule is about what they REMOVED, not about what the document
  // happens to contain. A finding can be about a missing provision and
  // quote nothing at all; requiring every term to appear in the text would
  // delete exactly those findings, and would delete every negative check
  // too, since a hallucinated finding quotes text that was never there.
  const removed = new Set([...words(draft.text)].filter(w => !words(text).has(w)));
  const carries = (s: string): boolean => [...words(s)].some(w => removed.has(w));
  const dropped: string[] = [];
  const scrub = (c: DraftCatch): DraftCatch | null => {
    // A quote is a quote OF the document: one the text no longer contains
    // is not something to match on.
    const clause = c.clause.trim() !== '' && text.toLowerCase().includes(c.clause.trim().toLowerCase()) ? c.clause : '';
    if (carries(c.id) || carries(c.title) || carries(c.why) || carries(c.clause) || c.match_any.some(carries)) {
      dropped.push(c.title);
      return null;
    }
    return { ...c, clause };
  };
  const decided = (ids: Set<string>): DraftCatch[] => draft.catches.filter(c => ids.has(c.id)).map(scrub).filter((c): c is DraftCatch => c !== null);

  const fixture = {
    id,
    title: decisions.title ?? draft.title,
    scorer: 'findings',
    vault: id,
    task: decisions.message ?? draft.message,
    source: { kind: 'practice', name: `thread ${draft.from.threadId}` },
    input: { contract_text: text },
    expected_catches: decided(kept).map(c => ({ id: c.id, severity: c.severity, clause: c.clause, why: c.why, match_any: c.match_any })),
    negative_checks: decided(rejected).map(c => ({ id: c.id, description: `Counsel raised this and the lawyer rejected it: ${c.title}`, match_any: c.match_any })),
    expected_citations: draft.citations,
    // What the review cited IS the allowed set: the scorer counts a citation
    // outside it as a hallucinated source, and every one of these came from
    // the practice's own files.
    allowed_citation_aliases: [...new Set(draft.citations.flatMap(c => c.aliases))],
  } as Fixture;

  return {
    fixture,
    dropped,
    vault: id,
    files: [
      { path: 'config.md', text: FIXTURE_CONFIG },
      { path: FIXTURE_DOCUMENT, text },
      ...draft.knowledge.map(k => ({ path: k.path, text: k.text })),
    ],
  };
}
