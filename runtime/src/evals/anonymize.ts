/**
 * The anonymization pass behind "make this a fixture" (routing-and-evals
 * spec §8): a real agreement the lawyer worked on becomes a fixture only
 * after the identifying text is replaced, and only after the lawyer reads
 * the result.
 *
 * Two properties make this usable:
 *
 * - **Consistent.** One original always maps to one replacement inside a
 *   document, so "Acme" in clause 3 and "Acme" in the signature block become
 *   the same fake party and the agreement still reads as an agreement.
 * - **Deterministic.** The mapping is derived from the text itself, so the
 *   same document anonymizes the same way on every machine and every run.
 *   A fixture regenerated from the same matter does not churn.
 *
 * The same mapping applies to the fixture's expected blocks (`apply`), so a
 * quote a scorer matches on is anonymized exactly as the document was. A
 * term that survives the pass unchanged is one the scorer can still match.
 *
 * What it does NOT do: this is not a promise of de-identification. It
 * catches organizations, people the caller names, emails, money, dates and
 * phone numbers. Street addresses, unusual identifiers, and anything the
 * text merely alludes to are left for the lawyer to catch on the review
 * screen — which is why nothing becomes a fixture without that screen.
 */

export type Kind = 'org' | 'person' | 'email' | 'money' | 'date' | 'phone';

export interface Replacement {
  kind: Kind;
  from: string;
  to: string;
  /** How many times the original appears in the text. */
  count: number;
}

export interface Anonymizer {
  /** The anonymized text. */
  text: string;
  /** One row per distinct original, in the order first seen. */
  replacements: Replacement[];
  /** The same substitutions on any other string — an expected quote, a
   * title, a note — so the fixture stays internally consistent. */
  apply(s: string): string;
}

export interface AnonymizeOptions {
  /** Names the caller already knows are parties or people: the matter's
   * counterparty, the client, signatories. Matched whole-word, case
   * sensitively, before any pattern runs. */
  names?: { name: string; kind?: 'org' | 'person' }[];
  /** Held back from replacement — a governing-law state, a statute's named
   * party, a term the fixture is about. Compared case-insensitively. */
  keep?: string[];
}

/* ------------------------------------------------------------------ *
 * A small deterministic PRNG. The seed is the text's own hash, so the
 * mapping is a pure function of the input.
 * ------------------------------------------------------------------ */

function hash32(s: string): number {
  // FNV-1a. Small, stable across engines, and good enough to spread names.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ORG_STEMS = [
  'Northwind', 'Blue Harbor', 'Cedar Point', 'Vantage', 'Kestrel', 'Lakeshore', 'Ironwood', 'Meridian',
  'Silverline', 'Redpine', 'Ardmore', 'Foxglove', 'Granite Bay', 'Halcyon', 'Juniper', 'Westgate',
];
const SURNAMES = [
  'Alvarez', 'Bennett', 'Castellanos', 'Delaney', 'Ellery', 'Fairbanks', 'Grayson', 'Hollis',
  'Iverson', 'Jarrell', 'Kimura', 'Lindqvist', 'Marchetti', 'Nakamura', 'Okafor', 'Pemberton',
];
const GIVEN = [
  'Adrian', 'Beatrix', 'Casey', 'Dara', 'Elliot', 'Frances', 'Gideon', 'Harriet',
  'Imani', 'Jules', 'Kirsten', 'Leon', 'Mira', 'Noor', 'Owen', 'Priya',
];

/** A stable pick from a list: the same original always draws the same entry,
 * and a collision inside one document walks to the next free one. */
function pick(list: string[], seed: number, taken: Set<string>): string {
  for (let i = 0; i < list.length; i++) {
    const candidate = list[(seed + i) % list.length]!;
    if (!taken.has(candidate)) return candidate;
  }
  // More distinct names than the list holds: number them rather than repeat.
  return `${list[seed % list.length]!} ${Math.floor(seed / list.length) + 2}`;
}

/* ------------------------------------------------------------------ *
 * Patterns
 * ------------------------------------------------------------------ */

/** `Acme Holdings, Inc.` / `Blue Harbor LLC` / `Nord AB` — a capitalized run
 * ending in a corporate suffix. The suffix is part of the match so the
 * replacement keeps the same legal form. */
const ORG_SUFFIX = String.raw`(?:Inc|Incorporated|LLC|L\.L\.C|LLP|L\.L\.P|LP|L\.P|Ltd|Limited|Corp|Corporation|Company|Co|PLC|GmbH|AG|S\.A|SA|N\.V|NV|B\.V|BV|AB|Oy|Pty|PBC)`;
const ORG_RE = new RegExp(String.raw`\b((?:[A-Z][\w&'’-]*[.,]?[ ]+){1,5})(${ORG_SUFFIX})\.?`, 'g');

const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;

/** `$1,200`, `$1,200.50`, `USD 4,000`, `4,000.00 dollars`. */
const MONEY_RE = /(?:\$|USD\s?|US\$\s?)\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{2})?\s+(?:dollars|USD)\b/g;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** ISO, `March 15, 2024`, `15 March 2024`, and `3/15/2024`. */
const DATE_RE = new RegExp(
  [
    String.raw`\b\d{4}-\d{2}-\d{2}\b`,
    String.raw`\b(?:${MONTHS.join('|')})\s+\d{1,2},?\s+\d{4}\b`,
    String.raw`\b\d{1,2}\s+(?:${MONTHS.join('|')})\s+\d{4}\b`,
    String.raw`\b\d{1,2}/\d{1,2}/\d{2,4}\b`,
  ].join('|'),
  'g',
);

/** North-American shapes only; anything else is left for the lawyer. The
 * parenthesized form is its own alternative: `\b` before `(` never matches,
 * so one pattern would silently drop the opening paren from the match. */
const PHONE_RE = /(?:\+1[ -]?)?\(\d{3}\)[ .-]?\d{3}[ .-]\d{4}|\b(?:\+1[ -]?)?\d{3}[ .-]\d{3}[ .-]\d{4}\b/g;

/** Words that begin a capitalized run but never name a party. */
const NOT_A_NAME = new Set([
  'The', 'This', 'That', 'These', 'Those', 'A', 'An', 'And', 'Or', 'If', 'In', 'On', 'At', 'By', 'For', 'To', 'Of', 'With',
  'Agreement', 'Section', 'Exhibit', 'Schedule', 'Article', 'Party', 'Parties', 'Company', 'Client', 'Customer', 'Vendor',
  'Supplier', 'Contractor', 'Purchaser', 'Seller', 'Buyer', 'Licensor', 'Licensee', 'Disclosing', 'Receiving', 'Effective',
]);

/** Words that open plenty of company names but also do ordinary work in a
 * contract, so the short form of a party is not derived from them: replacing
 * every "First" or "Standard" would rewrite the agreement, not anonymize it. */
const GENERIC_IN_A_NAME = new Set([
  'First', 'Second', 'Third', 'National', 'International', 'American', 'Global', 'General', 'United', 'Union',
  'Western', 'Eastern', 'Northern', 'Southern', 'Pacific', 'Atlantic', 'Central', 'Standard', 'Federal', 'State',
  'Public', 'Private', 'Mutual', 'Trust', 'Capital', 'Credit', 'Data', 'Digital', 'Legal', 'Group', 'Holdings',
]);

/* ------------------------------------------------------------------ *
 * The pass
 * ------------------------------------------------------------------ */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-word matcher for a literal, tolerant of the word boundary rules
 * around punctuation like `Acme, Inc.`. */
function literalRe(s: string): RegExp {
  const body = escapeRe(s);
  const left = /^\w/.test(s) ? String.raw`\b` : '';
  const right = /\w$/.test(s) ? String.raw`\b` : '';
  return new RegExp(`${left}${body}${right}`, 'g');
}

/** Digits replaced, shape kept: `$1,250,000.00` → `$3,470,000.00`. The
 * magnitude a clause turns on (a cap, a threshold) survives; the exact
 * figure does not. */
function fakeMoney(original: string, seed: number): string {
  let i = 0;
  return original.replace(/\d/g, d => {
    const at = i++;
    // The leading digit stays 1-9 so the number keeps its magnitude, and a
    // trailing run of zeros stays zero so round figures stay round.
    if (d === '0') return '0';
    const next = ((seed >>> (at % 24)) + at * 7 + Number(d)) % 9;
    return String(at === 0 ? next + 1 : next);
  });
}

/** A date shifted by a fixed number of days, its own format preserved. */
function fakeDate(original: string, shiftDays: number): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(original);
  const long = new RegExp(`^(${MONTHS.join('|')})\\s+(\\d{1,2}),?\\s+(\\d{4})$`).exec(original);
  const day1 = new RegExp(`^(\\d{1,2})\\s+(${MONTHS.join('|')})\\s+(\\d{4})$`).exec(original);
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(original);

  const parsed =
    iso ? Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : long ? Date.UTC(Number(long[3]), MONTHS.indexOf(long[1]!), Number(long[2]))
    : day1 ? Date.UTC(Number(day1[3]), MONTHS.indexOf(day1[2]!), Number(day1[1]))
    : slash ? Date.UTC(Number(slash[3]!.length === 2 ? `20${slash[3]}` : slash[3]), Number(slash[1]) - 1, Number(slash[2]))
    : null;
  if (parsed === null || Number.isNaN(parsed)) return original;

  const d = new Date(parsed + shiftDays * 86_400_000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  if (iso) return `${y}-${pad(m + 1)}-${pad(day)}`;
  if (long) return `${MONTHS[m]} ${day}, ${y}`;
  if (day1) return `${day} ${MONTHS[m]} ${y}`;
  return `${m + 1}/${day}/${y}`;
}

/** A slug for the fake email's domain, from its fake organization. */
function domainOf(org: string): string {
  const word = org.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/)[0] ?? 'example';
  return `${word.toLowerCase()}.example`;
}

/**
 * Anonymizes one document. Order matters: caller-named parties first (they
 * are the ones the lawyer cares about), then organizations by suffix, then
 * emails, money, dates, phones. Each pass reads the ORIGINAL text to find
 * its matches and records a literal → literal substitution; every
 * substitution is applied once at the end, longest original first, so a
 * name inside another name cannot be half-replaced.
 */
export function anonymize(text: string, options: AnonymizeOptions = {}): Anonymizer {
  const seed = hash32(text);
  const keep = new Set((options.keep ?? []).map(k => k.toLowerCase()));
  const mapping = new Map<string, Replacement>();
  const takenOrg = new Set<string>();
  const takenPerson = new Set<string>();

  const add = (kind: Kind, from: string, to: string): void => {
    if (from === '' || from === to) return;
    if (keep.has(from.toLowerCase())) return;
    if (mapping.has(from)) return;
    mapping.set(from, { kind, from, to, count: 0 });
  };

  // 1. The names the caller supplied.
  for (const { name, kind } of options.names ?? []) {
    const trimmed = name.trim();
    if (trimmed === '') continue;
    const s = hash32(trimmed);
    if (kind === 'person') add('person', trimmed, `${pick(GIVEN, s, new Set())} ${pick(SURNAMES, s >>> 5, takenPerson)}`);
    else add('org', trimmed, pick(ORG_STEMS, s, takenOrg));
    const last = mapping.get(trimmed);
    if (last) (kind === 'person' ? takenPerson : takenOrg).add(last.to.split(' ').at(-1) ?? last.to);
  }

  // 2. Organizations, by their legal suffix.
  for (const m of text.matchAll(ORG_RE)) {
    const whole = m[0];
    const lead = (m[1] ?? '').trim().split(/\s+/)[0] ?? '';
    if (NOT_A_NAME.has(lead)) continue;
    const suffix = m[2] ?? '';
    const s = hash32(whole);
    const stem = pick(ORG_STEMS, s, takenOrg);
    takenOrg.add(stem);
    // `Acme Holdings, Inc.` keeps its comma; `Bytecraft Labs LLC` has none.
    const comma = /,\s+$/.test(m[1] ?? '') ? ',' : '';
    add('org', whole, `${stem}${comma} ${suffix}${whole.endsWith('.') ? '.' : ''}`);
    // A party is rarely written out in full twice. `Acme Holdings, Inc.`
    // becomes `Acme Holdings` in one clause and plain `Acme` in the next, so
    // both shorter forms map to the same stem — otherwise the name the
    // anonymizer was meant to remove survives in most of the document.
    const bare = (m[1] ?? '').trim().replace(/,$/, '');
    if (bare !== '' && !NOT_A_NAME.has(bare)) add('org', bare, stem);
    const first = bare.split(/\s+/)[0] ?? '';
    if (first !== bare && first.length >= 4 && !NOT_A_NAME.has(first) && !GENERIC_IN_A_NAME.has(first)) add('org', first, stem);
  }

  // 3. Emails. The local part follows its person, the domain its org, so a
  // signature block still hangs together.
  for (const m of text.matchAll(EMAIL_RE)) {
    const whole = m[0];
    const s = hash32(whole);
    const org = [...mapping.values()].find(r => r.kind === 'org');
    add('email', whole, `${pick(GIVEN, s, new Set()).toLowerCase()}.${pick(SURNAMES, s >>> 3, new Set()).toLowerCase()}@${domainOf(org?.to ?? 'Vantage')}`);
  }

  // 4. Money, dates, phone numbers.
  for (const m of text.matchAll(MONEY_RE)) add('money', m[0], fakeMoney(m[0], hash32(m[0])));
  const shiftDays = ((seed % 900) + 41) * (seed % 2 === 0 ? 1 : -1);
  for (const m of text.matchAll(DATE_RE)) add('date', m[0], fakeDate(m[0], shiftDays));
  for (const m of text.matchAll(PHONE_RE)) {
    const s = hash32(m[0]);
    add('phone', m[0], m[0].replace(/\d/g, (d, at: number) => String(((s >>> (at % 20)) + Number(d)) % 10)));
  }

  // Longest original first: `Acme Holdings, Inc.` is substituted before the
  // bare `Acme` that sits inside it.
  const ordered = [...mapping.values()].sort((a, b) => b.from.length - a.from.length);

  // ONE pass over the text, not one pass per replacement. Every original is
  // an alternative of a single regex, so a replacement's own output is never
  // re-scanned: without this, two dates that shift onto each other would
  // shift the first one twice.
  const all = ordered.length === 0 ? null : new RegExp(ordered.map(r => literalRe(r.from).source).join('|'), 'g');
  const to = new Map(ordered.map(r => [r.from, r.to] as const));

  const applyCounting = (s: string, counts: Map<string, number> | null): string => {
    if (all === null) return s;
    all.lastIndex = 0;
    return s.replace(all, hit => {
      if (counts !== null) counts.set(hit, (counts.get(hit) ?? 0) + 1);
      return to.get(hit) ?? hit;
    });
  };

  const counts = new Map<string, number>();
  const out = applyCounting(text, counts);
  for (const r of ordered) r.count = counts.get(r.from) ?? 0;

  return {
    text: out,
    // Insertion order is the order a reader meets them; the count is what
    // the review screen shows beside each row. A mapping nothing matched —
    // a supplied name the document never uses — is not shown at all.
    replacements: [...mapping.values()].filter(r => r.count > 0),
    apply: s => applyCounting(s, null),
  };
}
