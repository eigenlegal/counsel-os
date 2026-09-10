import { expect, test } from 'bun:test';
import { citationStart } from './citation-location';
const all = (body: string) => [{ start: 0, end: body.length }];

test('finds exact quotes without offsets and corrects wrong legacy hints, using UTF-16 positions', () => {
  const body = '🧭 Background.\r\n**Exact wording** — no change.';
  const quote = '**Exact wording** — no change.';
  for (const hint of [undefined, 0, 2874, body.indexOf(quote)])
    expect(citationStart(body, all(body), quote, hint)).toBe(body.indexOf(quote));
});

test('never normalizes punctuation, Markdown, whitespace, Unicode or altered words', () => {
  const body = '**Café** — keep  wording.\r\nDone.';
  for (const quote of ['Café — keep  wording.', '**Café** - keep  wording.', '**Cafe\u0301** — keep  wording.', '**Café** — keep wording.', 'wording.\nDone.', 'not in the text'])
    expect(() => citationStart(body, all(body), quote)).toThrow('not found verbatim');
});

test('searches only read ranges and never bridges unread gaps or exposes unread matches', () => {
  const body = 'Known. Private secret. Known.';
  expect(() => citationStart(body, [], 'Known.')).toThrow('Read this passage');
  expect(() => citationStart(null, [], 'Known.')).toThrow('Read this passage');
  const ranges = [{ start: 0, end: 6 }, { start: 22, end: body.length }];
  expect(() => citationStart(body, ranges, 'Private secret.', 7)).toThrow('not found verbatim');
  expect(() => citationStart(body, ranges, body)).toThrow('not found verbatim');
  expect(citationStart(body, [{ start: 0, end: 6 }], 'Known.')).toBe(0);
});

test('merges overlapping and adjacent reads without modifying their saved ranges', () => {
  const body = 'The exact passage.';
  const ranges = [{ start: 4, end: body.length }, { start: 0, end: 4 }, { start: 2, end: 8 }];
  const before = JSON.stringify(ranges);
  expect(citationStart(body, ranges, body)).toBe(0);
  expect(JSON.stringify(ranges)).toBe(before);
});

test('repeated text requires longer wording or an exact position, not the nearest guessed match', () => {
  const body = 'First: accepted. Second: accepted.';
  expect(() => citationStart(body, all(body), 'accepted.', 8)).toThrow('7, 25');
  expect(() => citationStart(body, all(body), 'accepted.')).toThrow('more than once');
  expect(citationStart(body, all(body), 'accepted.', 25)).toBe(25);
  expect(citationStart(body, all(body), 'Second: accepted.')).toBe(17);
});

test('overlapping occurrences count and ambiguous hints are bounded without blocking exact disambiguation', () => {
  expect(() => citationStart('aaa', all('aaa'), 'aa')).toThrow('0, 1');
  const body = 'x'.repeat(10_000);
  expect(() => citationStart(body, all(body), 'x')).toThrow('(first 8 matches): 0, 1, 2, 3, 4, 5, 6, 7');
  expect(citationStart(body, all(body), 'x', 9999)).toBe(9999);
});
