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
      const paths = pathsInMessage(e.content);
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
const FINDING_HEAD = /^\s*(?:[-*]\s*)?\*\*(.+?)\*\*\s*(?:[—–-]\s*(.*))?$/;
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
    if (head !== null && (head[1] ?? '').length > 2) {
      current = { title: (head[1] ?? '').trim(), severity, clause: '', rationale: (head[2] ?? '').trim() };
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

/** Vault paths a written answer names: `practice/standards/liability.md`,
 * with or without backticks. The same knowledge files a structured answer
 * would have listed as citations. */
export function citedPaths(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(?:practice|law|knowledge|memory)\/[\w./-]+\.md\b/g)) out.add(m[0]);
  return [...out];
}

/** Terms a scorer can match this finding by: the words of its title that
 * carry meaning, plus the shortest telling piece of the quote. */
function matchTerms(title: string, clause: string): string[] {
  // Ordinary words, plus the ones every contract heading carries: a scorer
  // that matches on "section" matches on anything.
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'are', 'for', 'with', 'no', 'not', 'too', 'by', 'on', 'at', 'this', 'that', 'its',
    'section', 'clause', 'article', 'provision', 'agreement', 'exhibit', 'schedule', 'paragraph', 'part',
  ]);
  const words = title
    .toLowerCase()
    .split(/[^\da-z]+/)
    .filter(w => w.length > 2 && !stop.has(w));
  const phrase = clause.trim().split(/\s+/).slice(0, 6).join(' ').toLowerCase();
  return [...new Set([...words.slice(0, 5), ...(phrase === '' ? [] : [phrase])])];
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

  const citations = [...new Set(answered)].map(c => ({
    id: slugify(c.split('/').at(-1) ?? c, 'citation'),
    // The path and its own name: a model that cites either is citing this.
    aliases: [...new Set([c, (c.split('/').at(-1) ?? c).replace(/\.md$/, '')])],
  }));

  // The document sits at one fixed path inside the fixture vault: a real
  // matter's path names a client, and the fixture must not.
  const message = a.apply(run.message).replaceAll(path, FIXTURE_DOCUMENT);

  const knowledge: { path: string; text: string }[] = [];
  for (const c of citations) {
    const from = c.aliases[0] ?? '';
    if (!/^(practice|law|memory|knowledge)\//.test(from)) continue;
    const text = opts.readKnowledge?.(from) ?? null;
    if (text === null) notes.push(`The answer cited ${from}, which could not be read; the fixture will run without it.`);
    else knowledge.push({ path: from, text: a.apply(text) });
  }

  const name = (path.split('/').at(-1) ?? path).replace(/\.[^.]+$/, '');
  return {
    id: slugify(opts.title ?? name, 'practice-fixture'),
    title: opts.title ?? `${name} — ${catches.length} finding${catches.length === 1 ? '' : 's'}`,
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
}

/** What a save writes: the fixture file, and the mini-vault the runner
 * copies for each run. */
export interface SavedFixtureFiles {
  fixture: Fixture;
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

  const fixture = {
    id,
    title: decisions.title ?? draft.title,
    scorer: 'findings',
    vault: id,
    task: draft.message,
    source: { kind: 'practice', name: `thread ${draft.from.threadId}` },
    input: { contract_text: text },
    expected_catches: draft.catches
      .filter(c => kept.has(c.id))
      .map(c => ({ id: c.id, severity: c.severity, clause: c.clause, why: c.why, match_any: c.match_any })),
    negative_checks: draft.catches
      .filter(c => rejected.has(c.id))
      .map(c => ({ id: c.id, description: `Counsel raised this and the lawyer rejected it: ${c.title}`, match_any: c.match_any })),
    expected_citations: draft.citations,
    // What the review cited IS the allowed set: the scorer counts a citation
    // outside it as a hallucinated source, and every one of these came from
    // the practice's own files.
    allowed_citation_aliases: [...new Set(draft.citations.flatMap(c => c.aliases))],
  } as Fixture;

  return {
    fixture,
    vault: id,
    files: [
      { path: 'config.md', text: FIXTURE_CONFIG },
      { path: FIXTURE_DOCUMENT, text },
      ...draft.knowledge.map(k => ({ path: k.path, text: k.text })),
    ],
  };
}
