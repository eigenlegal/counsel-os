/**
 * The tracked-changes redline (redesign spec §3.3, founder amendment 2):
 * `diffWords(current, proposed)` as data the card renders with REACT TEXT
 * NODES — `<del>`/`<ins>` elements, never innerHTML. The sanitizer
 * (`vault/sanitize.ts`) stays the app's only HTML sink; a redline never
 * goes near it.
 */
import { diffWords } from 'diff';

export interface WordSpan {
  kind: 'same' | 'ins' | 'del';
  text: string;
}

export function wordDiff(before: string, after: string): WordSpan[] {
  return diffWords(before, after).map(change => ({
    kind: change.added ? ('ins' as const) : change.removed ? ('del' as const) : ('same' as const),
    text: change.value,
  }));
}

export interface RedlineBlock {
  spans: WordSpan[];
  /** True when the block holds any ins/del — the "changed blocks only" view
   * (spec §3.3) renders exactly these. */
  changed: boolean;
}

/**
 * The span stream cut into paragraph blocks at the blank lines of UNCHANGED
 * text. Blank lines inside an ins/del belong to the change and stay in the
 * block — cutting there would split one edit across two blocks and lie
 * about its shape.
 */
export function redlineBlocks(spans: WordSpan[]): RedlineBlock[] {
  const blocks: RedlineBlock[] = [];
  let current: WordSpan[] = [];
  const flush = (): void => {
    if (current.length === 0) return;
    blocks.push({ spans: current, changed: current.some(s => s.kind !== 'same') });
    current = [];
  };
  for (const span of spans) {
    if (span.kind !== 'same' || !/\n\s*\n/.test(span.text)) {
      current.push(span);
      continue;
    }
    const parts = span.text.split(/\n\s*\n/);
    parts.forEach((part, i) => {
      const text = i === 0 ? part.replace(/\n$/, '') : part.replace(/^\n/, '').replace(/\n$/, '');
      if (text !== '') current.push({ kind: 'same', text });
      if (i < parts.length - 1) flush();
    });
  }
  flush();
  return blocks;
}
