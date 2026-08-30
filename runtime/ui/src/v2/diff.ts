/**
 * A unified diff for the proposal card (spec §2, "Proposal card"): the
 * current vault file against the proposed content, line by line, with three
 * lines of context around each change. Thin wrapper over `diff`'s
 * `diffLines`; everything about how it reads is decided here.
 */
import { diffLines } from 'diff';

export interface HunkLine {
  kind: 'ctx' | 'add' | 'del';
  text: string;
}

export type Hunk = HunkLine[];

/** Every line of both texts, tagged, in unified order. */
function tagged(before: string, after: string): HunkLine[] {
  const out: HunkLine[] = [];
  for (const change of diffLines(before, after)) {
    const kind: HunkLine['kind'] = change.added ? 'add' : change.removed ? 'del' : 'ctx';
    const parts = change.value.split('\n');
    if (parts[parts.length - 1] === '') parts.pop();
    for (const text of parts) out.push({ kind, text });
  }
  return out;
}

export function unifiedHunks(before: string, after: string, context = 3): Hunk[] {
  const all = tagged(before, after);
  const hunks: Hunk[] = [];
  let start = -1;
  let end = -1;
  all.forEach((line, i) => {
    if (line.kind === 'ctx') return;
    if (start === -1) {
      start = Math.max(0, i - context);
      end = Math.min(all.length, i + context + 1);
      return;
    }
    if (i - context <= end) {
      end = Math.min(all.length, i + context + 1);
      return;
    }
    hunks.push(all.slice(start, end));
    start = Math.max(0, i - context);
    end = Math.min(all.length, i + context + 1);
  });
  if (start !== -1) hunks.push(all.slice(start, end));
  return hunks;
}
