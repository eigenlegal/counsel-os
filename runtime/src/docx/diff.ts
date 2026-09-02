/**
 * The word-level diff behind tracked changes — a port of the two pieces of
 * `scripts/apply_redlines.py` that decided WHAT gets struck and inserted:
 * Python's `difflib.SequenceMatcher(None, a, b, autojunk=False)` over the
 * token regex `\w+|\s+|[^\w\s]+`, and `compute_replacement_regions` on top
 * of its opcodes. Ported rather than replaced with a library: the founder's
 * tests pin the exact regions ("30" → "45" strikes `30`, a pair that
 * changes two numbers in one sentence yields two small strikes, never one
 * across the sentence), and those depend on difflib's tie-breaking.
 */

export interface Opcode {
  tag: 'equal' | 'replace' | 'delete' | 'insert';
  a1: number;
  a2: number;
  b1: number;
  b2: number;
}

export interface Region {
  /** Strike `current[start, end)` … */
  start: number;
  end: number;
  /** … and insert this in its place (`''` for a pure deletion). */
  insert: string;
}

/** Python 3's `\w+|\s+|[^\w\s]+` on a `str`: word runs, whitespace runs,
 * punctuation runs — Unicode-aware on both sides. */
const TOKEN_RE = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]+/gu;

export function tokenize(s: string): string[] {
  return s.match(TOKEN_RE) ?? [];
}

const ALNUM = /[\p{L}\p{N}]/u;

function isAlnum(ch: string | undefined): boolean {
  return ch !== undefined && ALNUM.test(ch);
}

/**
 * `SequenceMatcher.find_longest_match` with no junk: the longest block of
 * equal tokens in `a[alo:ahi]` and `b[blo:bhi]`; ties go to the block that
 * starts earliest in `a`, then earliest in `b`. `b2j` is the index of every
 * token's positions in `b`.
 */
function findLongestMatch(
  a: string[],
  alo: number,
  ahi: number,
  blo: number,
  bhi: number,
  b2j: Map<string, number[]>,
): { i: number; j: number; size: number } {
  let besti = alo;
  let bestj = blo;
  let bestsize = 0;
  let j2len = new Map<number, number>();
  for (let i = alo; i < ahi; i += 1) {
    const newj2len = new Map<number, number>();
    for (const j of b2j.get(a[i]!) ?? []) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (j2len.get(j - 1) ?? 0) + 1;
      newj2len.set(j, k);
      if (k > bestsize) {
        besti = i - k + 1;
        bestj = j - k + 1;
        bestsize = k;
      }
    }
    j2len = newj2len;
  }
  return { i: besti, j: bestj, size: bestsize };
}

/** `SequenceMatcher.get_opcodes()` for two token lists, `autojunk=False`. */
export function sequenceOpcodes(a: string[], b: string[]): Opcode[] {
  const b2j = new Map<string, number[]>();
  b.forEach((tok, j) => {
    const list = b2j.get(tok);
    if (list === undefined) b2j.set(tok, [j]);
    else list.push(j);
  });

  // get_matching_blocks: a work queue, not recursion, exactly as difflib.
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]];
  const blocks: Array<[number, number, number]> = [];
  while (queue.length > 0) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const { i, j, size } = findLongestMatch(a, alo, ahi, blo, bhi, b2j);
    if (size > 0) {
      blocks.push([i, j, size]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + size < ahi && j + size < bhi) queue.push([i + size, ahi, j + size, bhi]);
    }
  }
  blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);

  // Merge adjacent blocks.
  const merged: Array<[number, number, number]> = [];
  let i1 = 0;
  let j1 = 0;
  let k1 = 0;
  for (const [i2, j2, k2] of blocks) {
    if (i1 + k1 === i2 && j1 + k1 === j2) {
      k1 += k2;
    } else {
      if (k1 > 0) merged.push([i1, j1, k1]);
      i1 = i2;
      j1 = j2;
      k1 = k2;
    }
  }
  if (k1 > 0) merged.push([i1, j1, k1]);
  merged.push([a.length, b.length, 0]);

  const out: Opcode[] = [];
  let i = 0;
  let j = 0;
  for (const [ai, bj, size] of merged) {
    let tag: Opcode['tag'] | null = null;
    if (i < ai && j < bj) tag = 'replace';
    else if (i < ai) tag = 'delete';
    else if (j < bj) tag = 'insert';
    if (tag !== null) out.push({ tag, a1: i, a2: ai, b1: j, b2: bj });
    i = ai + size;
    j = bj + size;
    if (size > 0) out.push({ tag: 'equal', a1: ai, a2: i, b1: bj, b2: j });
  }
  return out;
}

/**
 * `compute_replacement_regions`: the minimal change regions of one
 * current → proposed pair, at word granularity, ascending. Unchanged text
 * between regions is never marked — that is what keeps a redline readable.
 *
 * Two refinements over the raw opcodes, both from the Python:
 * - Adjacent regions whose equal gap contains no whitespace merge, so
 *   `$1,500,000` → `$2,000,000` reads as one strike, not digit confetti.
 * - Region edges widen through word characters, so `30` → `35` strikes
 *   `30` and never a bare `0`, while punctuation boundaries stand.
 */
export function computeReplacementRegions(current: string, proposed: string): Region[] {
  const curTokens = tokenize(current);
  const propTokens = tokenize(proposed);
  const curOffsets = [0];
  for (const t of curTokens) curOffsets.push(curOffsets[curOffsets.length - 1]! + t.length);
  const propOffsets = [0];
  for (const t of propTokens) propOffsets.push(propOffsets[propOffsets.length - 1]! + t.length);

  const regions: Array<[number, number, string]> = [];
  for (const op of sequenceOpcodes(curTokens, propTokens)) {
    if (op.tag === 'equal') continue;
    regions.push([curOffsets[op.a1]!, curOffsets[op.a2]!, proposed.slice(propOffsets[op.b1], propOffsets[op.b2])]);
  }

  const merged: Array<[number, number, string]> = [];
  for (const region of regions) {
    const last = merged[merged.length - 1];
    if (last !== undefined) {
      const gap = current.slice(last[1], region[0]);
      if (gap !== '' && !/\s/.test(gap)) {
        last[1] = region[1];
        last[2] += gap + region[2];
        continue;
      }
    }
    merged.push(region);
  }

  for (const region of merged) {
    let [cs, ce, ins] = region;
    while (cs > 0 && isAlnum(current[cs - 1]) && ((ce > cs && isAlnum(current[cs])) || (ins !== '' && isAlnum(ins[0])))) {
      cs -= 1;
      ins = current[cs]! + ins;
    }
    while (ce < current.length && isAlnum(current[ce]) && ((ce > cs && isAlnum(current[ce - 1])) || (ins !== '' && isAlnum(ins[ins.length - 1])))) {
      ins = ins + current[ce]!;
      ce += 1;
    }
    region[0] = cs;
    region[1] = ce;
    region[2] = ins;
  }

  return merged.filter(r => r[1] > r[0] || r[2] !== '').map(([start, end, insert]) => ({ start, end, insert }));
}
