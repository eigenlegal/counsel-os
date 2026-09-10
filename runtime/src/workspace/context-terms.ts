// Retrieval vocabulary, not legal conclusions or instructions. Keep names and topic words;
// discard conversational glue and common document boilerplate that swamps short requests.
const STOP = new Set(`the and for that this with from have what how our your you are was were will would
should could about these those please review assess draft make using use synthetic fixture tell give
can did does has had not but into which when where why who any all there here then than been being
also just need want know find look see say said get got its their they them his her she him shall may
must each such other under over between agreement party parties section document documents matter
work records record saved text following including include provided provide respect subject date
before after now current latest through more some only same been regarding question answer thanks
thank hello counsel version ask change changed changes going forward keep rest unchanged`.split(/\s+/));

function normalize(word: string): string {
  return word.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}
function stem(word: string): string {
  return word.length > 4 ? word.replace(/ies$/, 'y').replace(/s$/, '') : word;
}
export function contextTerms(text: string, limit = 24): string[] {
  const counts = new Map<string, number>();
  for (const token of text.match(/[\p{L}\p{N}]+/gu) ?? []) {
    const word = normalize(token);
    if (word.length < 3 || STOP.has(word) || /^\d+$/.test(word)) continue;
    const key = stem(word);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

/** Pick a dense topical passage without deriving offsets from normalized text.
 * All offsets refer to the exact saved UTF-16 body, including non-ASCII characters.
 */
export function contextWindow(body: string, terms: string[], length = 16_000): number {
  if (!Number.isInteger(length) || length < 1) throw new Error('Invalid context passage length.');
  if (body.length <= length || !terms.length) return 0;
  const padding = Math.min(1000, Math.floor(length / 8));
  const wanted = new Set(terms), matches: Array<{ at: number; word: string }> = [];
  for (const token of body.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = stem(normalize(token[0]));
    if (wanted.has(word)) matches.push({ at: token.index!, word });
  }
  const counts = new Map<string, number>();
  let left = 0, best = 0, bestAt = 0;
  for (let right = 0; right < matches.length; right++) {
    const entry = matches[right]!;
    counts.set(entry.word, (counts.get(entry.word) ?? 0) + 1);
    while (entry.at - matches[left]!.at > length - 2 * padding) {
      const word = matches[left++]!.word, count = counts.get(word)! - 1;
      if (count) counts.set(word, count); else counts.delete(word);
    }
    // Reward distinct topics, not repetitions of a single keyword.
    const score = counts.size * 10 + Math.min(right - left + 1, 9);
    if (score > best) { best = score; bestAt = matches[left]!.at; }
  }
  let start = Math.min(Math.max(0, bestAt - padding), Math.max(0, body.length - length));
  if (start) {
    const paragraph = body.lastIndexOf('\n', start);
    if (paragraph >= start - Math.min(300, padding)) start = paragraph + 1;
    // Never split a surrogate pair when positioning an excerpt.
    if (/[\uDC00-\uDFFF]/.test(body[start] ?? '')) start--;
  }
  return Math.max(0, start);
}
