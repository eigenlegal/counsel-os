/**
 * A small unified line diff, for showing a practice seed's upstream change
 * beside what the vault received (spec 2026-09-01 §6). Line-level LCS is
 * enough for markdown files of a few hundred lines; anything past `MAX_LINES`
 * is answered with a one-line marker rather than a quadratic table.
 */

export const MAX_LINES = 4000;
const CONTEXT = 3;

export interface DiffLabels {
  from: string;
  to: string;
}

type Op = { kind: ' ' | '-' | '+'; text: string };

function ops(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = length of the LCS of a[i..] and b[j..].
  const lcs: Uint32Array[] = [];
  for (let i = 0; i <= n; i++) lcs.push(new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: ' ', text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ kind: '-', text: a[i]! });
      i++;
    } else {
      out.push({ kind: '+', text: b[j]! });
      j++;
    }
  }
  while (i < n) out.push({ kind: '-', text: a[i++]! });
  while (j < m) out.push({ kind: '+', text: b[j++]! });
  return out;
}

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * `''` when the texts are equal. Otherwise a unified diff with `---`/`+++`
 * headers, hunks with `@@ -a,b +c,d @@` ranges and three lines of context.
 */
export function unifiedDiff(from: string, to: string, labels: DiffLabels): string {
  if (from === to) return '';
  const a = splitLines(from);
  const b = splitLines(to);
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    return `--- ${labels.from}\n+++ ${labels.to}\n@@ diff too large (${a.length} → ${b.length} lines) @@\n`;
  }
  const all = ops(a, b);
  // Group changed ops into hunks with CONTEXT lines around them.
  const changed = all.map(op => op.kind !== ' ');
  const keep = new Array<boolean>(all.length).fill(false);
  for (let k = 0; k < all.length; k++) {
    if (!changed[k]) continue;
    for (let c = Math.max(0, k - CONTEXT); c <= Math.min(all.length - 1, k + CONTEXT); c++) keep[c] = true;
  }
  const out: string[] = [`--- ${labels.from}`, `+++ ${labels.to}`];
  let k = 0;
  let aLine = 0; // 0-based position in a
  let bLine = 0;
  while (k < all.length) {
    if (!keep[k]) {
      if (all[k]!.kind !== '+') aLine++;
      if (all[k]!.kind !== '-') bLine++;
      k++;
      continue;
    }
    // A hunk: from k while keep[] holds.
    const start = k;
    const aStart = aLine;
    const bStart = bLine;
    let aCount = 0;
    let bCount = 0;
    const body: string[] = [];
    while (k < all.length && keep[k]) {
      const op = all[k]!;
      body.push(`${op.kind}${op.text}`);
      if (op.kind !== '+') {
        aCount++;
        aLine++;
      }
      if (op.kind !== '-') {
        bCount++;
        bLine++;
      }
      k++;
    }
    void start;
    out.push(`@@ -${aCount === 0 ? aStart : aStart + 1},${aCount} +${bCount === 0 ? bStart : bStart + 1},${bCount} @@`);
    out.push(...body);
  }
  return out.join('\n') + '\n';
}
