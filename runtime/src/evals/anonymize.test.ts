import { describe, expect, test } from 'bun:test';
import { anonymize } from './anonymize';

const DOC = `# Mutual Nondisclosure Agreement

This Agreement is made as of March 15, 2024 between Acme Holdings, Inc. ("Discloser")
and Bytecraft Labs LLC ("Recipient").

1. Term. This Agreement expires on 2026-03-15.
2. Cap. Recipient's liability shall not exceed $1,250,000.00 in the aggregate.
3. Notices. Notices to Acme go to legal@acmeholdings.com or (415) 555-0134.

Acme shall not be liable for indirect damages. Bytecraft Labs LLC accepts the cap.
`;

describe('anonymize', () => {
  test('replaces organizations, keeps the legal form, and maps the bare name to the same party', () => {
    const a = anonymize(DOC);
    expect(a.text).not.toContain('Acme');
    expect(a.text).not.toContain('Bytecraft');

    const org = a.replacements.find(r => r.from === 'Acme Holdings, Inc.');
    expect(org).toBeDefined();
    expect(org!.kind).toBe('org');
    expect(org!.to).toMatch(/ Inc\.$/);

    // `Acme` alone becomes the same stem the full name got, so the document
    // still reads as one party.
    const stem = org!.to.replace(/,? Inc\.$/, '');
    const bare = a.replacements.find(r => r.from === 'Acme');
    expect(bare!.to).toBe(stem);
    expect(a.text).toContain(`${stem} shall not be liable`);
  });

  test('is deterministic: the same text twice gives the same mapping', () => {
    expect(anonymize(DOC).text).toBe(anonymize(DOC).text);
  });

  test('money keeps its shape and magnitude but not its digits', () => {
    const a = anonymize(DOC);
    const money = a.replacements.find(r => r.kind === 'money')!;
    expect(money.from).toBe('$1,250,000.00');
    expect(money.to).toMatch(/^\$\d,\d{3},\d{3}\.\d{2}$/);
    expect(money.to).not.toBe(money.from);
    // Round stays round: a trailing run of zeros is not turned into noise.
    expect(money.to.endsWith('000.00')).toBe(true);
  });

  test('dates shift by one offset and keep each format', () => {
    const a = anonymize(DOC);
    const long = a.replacements.find(r => r.from === 'March 15, 2024')!;
    const iso = a.replacements.find(r => r.from === '2026-03-15')!;
    expect(long.to).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    expect(iso.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Both moved by the same number of days, so the two-year term survives.
    const days = (from: string, to: string): number => (Date.parse(to) - Date.parse(from)) / 86_400_000;
    expect(days('2024-03-15', long.to)).toBe(days('2026-03-15', iso.to));
  });

  test('a date that shifts onto another date in the document is not shifted twice', () => {
    // The second date is what the first one becomes under any positive shift
    // of 366 days; a per-replacement pass would move it again.
    const rows = anonymize('Signed 2024-01-01. Renewed 2025-01-01. Ends 2026-01-01.').replacements.filter(r => r.kind === 'date');
    expect(rows).toHaveLength(3);
    const shifts = rows.map(r => (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000);
    // One offset for all three. A per-replacement pass would shift whichever
    // date another date landed on a second time, and this would not hold.
    expect(new Set(shifts).size).toBe(1);
    expect(new Set(rows.map(r => r.to)).size).toBe(3);
  });

  test('emails and phone numbers go, and the email domain follows a fake party', () => {
    const a = anonymize(DOC);
    const email = a.replacements.find(r => r.kind === 'email')!;
    expect(email.from).toBe('legal@acmeholdings.com');
    expect(email.to).toMatch(/^[a-z]+\.[a-z]+@[a-z]+\.example$/);
    const phone = a.replacements.find(r => r.kind === 'phone')!;
    expect(phone.to).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    expect(phone.to).not.toBe(phone.from);
    expect(a.text).not.toContain('acmeholdings.com');
  });

  test('`apply` carries the same mapping to an expected quote', () => {
    const a = anonymize(DOC);
    const quote = a.apply('Acme Holdings, Inc. shall not exceed $1,250,000.00');
    expect(quote).not.toContain('Acme');
    expect(quote).not.toContain('1,250,000');
    expect(a.text).toContain(quote.split(' shall')[0]!);
  });

  test('supplied names are replaced even without a corporate suffix', () => {
    const a = anonymize('Jane Fenwick signed for Orbit. Orbit is the vendor.', {
      names: [{ name: 'Jane Fenwick', kind: 'person' }, { name: 'Orbit', kind: 'org' }],
    });
    expect(a.text).not.toContain('Jane Fenwick');
    expect(a.text).not.toContain('Orbit');
    expect(a.replacements.find(r => r.from === 'Jane Fenwick')!.to).toMatch(/^[A-Z][a-z]+ [A-Z][\wé]+$/);
    // Two mentions of the vendor, one row, count 2.
    expect(a.replacements.find(r => r.from === 'Orbit')!.count).toBe(2);
  });

  test('`keep` holds a term back — a governing-law state stays itself', () => {
    const text = 'Governed by the laws of Delaware. Vendor is Delaware Freight Co.';
    const a = anonymize(text, { keep: ['Delaware'] });
    expect(a.text).toContain('laws of Delaware');
    // The company still goes: `keep` protects the term, not every name that
    // contains it.
    expect(a.text).not.toContain('Delaware Freight Co.');
  });

  test('an article in front of the name does not save the name', () => {
    // The most common party form there is. Skipping the whole match on a
    // leading `The` left every mention of the party in the document.
    const a = anonymize('Entered into by The Acme Corporation ("Acme") and Globex Industries, Inc. Acme shall pay Globex. The Acme Corporation is liable.');
    expect(a.text).not.toContain('Acme');
    expect(a.text).not.toContain('Globex');
    expect(a.text).toContain('The ');
    expect(a.replacements.find(r => r.from === 'Acme')!.count).toBe(2);
  });

  test('an ordinary capitalized word is not mistaken for a company suffix', () => {
    // `Co` inside `Costs`, `AG` inside `AGREEMENT`: without a right-hand
    // boundary the pass rewrites the contract instead of anonymizing it.
    const text = 'Delivery Costs shall be borne by Buyer. The Parties acknowledge Total Compensation is fixed.\nSERVICES AGREEMENT follows.';
    expect(anonymize(text).text).toBe(text);
  });

  test('a name never runs past the end of a sentence', () => {
    const a = anonymize('Payment goes to Orbit Freight LLC. The Buyer accepts.', {});
    expect(a.replacements.map(r => r.from)).toContain('Orbit Freight LLC.');
    expect(a.text).toContain('. The Buyer accepts.');
  });

  test('two supplied parties never draw the same fake name', () => {
    const a = anonymize('Aco5 Group and Bco4 Group are the parties. Aco5 Group pays Bco4 Group.', {
      names: [{ name: 'Aco5 Group', kind: 'org' }, { name: 'Bco4 Group', kind: 'org' }],
    });
    const [first, second] = a.replacements.filter(r => r.kind === 'org');
    expect(first!.to).not.toBe(second!.to);
  });

  test('a generic first word is not turned into a party everywhere it appears', () => {
    const a = anonymize('Standard Freight Corp. ships goods. Standard terms apply. The Standard is met.');
    expect(a.text).not.toContain('Standard Freight Corp.');
    // "Standard" on its own is contract vocabulary here, not the party.
    expect(a.text).toContain('Standard terms apply');
    expect(a.text).toContain('The Standard is met');
  });

  test('a capitalized run that is not a party is left alone', () => {
    const a = anonymize('The Company shall deliver. This Agreement is governed by Section 4.');
    expect(a.replacements.filter(r => r.kind === 'org')).toEqual([]);
  });

  test('an empty document yields no replacements and no crash', () => {
    const a = anonymize('');
    expect(a.text).toBe('');
    expect(a.replacements).toEqual([]);
    expect(a.apply('Acme')).toBe('Acme');
  });
});
