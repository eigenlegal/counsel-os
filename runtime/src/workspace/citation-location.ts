/** Locate verbatim evidence only inside text already read. Never normalize text,
 * search other records, or use unread matches to resolve an ambiguity. */
export function citationStart(
  body: string | null,
  ranges: ReadonlyArray<{ start: number; end: number }>,
  quote: string,
  hint?: number,
): number {
  if (!quote.length) throw new Error('An exact quote is required.');
  const read: Array<{ start: number; end: number }> = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end <= range.start || range.end > (body?.length ?? 0)) continue;
    const previous = read.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else read.push({ ...range });
  }
  if (!body || !read.length) throw new Error('Read this passage before citing it.');
  // A correct optional position can disambiguate repeated wording. A guessed
  // position cannot override exact text equality or read coverage.
  if (hint !== undefined && Number.isInteger(hint) && read.some(range =>
    hint >= range.start && hint + quote.length <= range.end) && body.slice(hint, hint + quote.length) === quote) return hint;
  const matches: number[] = [];
  for (const range of read) {
    const text = body.slice(range.start, range.end);
    let from = 0;
    for (;;) {
      const found = text.indexOf(quote, from);
      if (found < 0) break;
      matches.push(range.start + found);
      if (matches.length === 8) break;
      from = found + 1; // Count overlapping occurrences too.
    }
    if (matches.length === 8) break;
  }
  if (!matches.length) throw new Error('Quote not found verbatim in the passages already read. Copy the exact wording, including punctuation and Markdown, or read the relevant passage first.');
  if (matches.length > 1) throw new Error(`Quote appears more than once in the passages already read. Include more surrounding text, or set start to one of these exact UTF-16 positions${matches.length === 8 ? ' (first 8 matches)' : ''}: ${matches.join(', ')}. No citation was created.`);
  return matches[0]!;
}
