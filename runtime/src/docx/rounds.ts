/**
 * Round-over-round comparison — a port of `scripts/diff_rounds.py`. Aligns
 * the version WE sent (`ours`, whose accept-all text is our proposal)
 * against the markup the counterparty returned (`theirs`), paragraph by
 * paragraph, and classifies the fate of each of our counters:
 *
 *   ACCEPTED          our language survives
 *   REVERTED          our language is gone and their text is back
 *   MODIFIED          they replaced our language with something new
 *   NEW               a change in a paragraph we never touched
 *   UNMATCHED_CHANGE  a change that cannot be attributed without `base`
 *
 * Two documents cannot recover the round N-1 baseline; pass `base` (the
 * document before our edits) whenever it exists. The JSON and the markdown
 * are the Python's, key for key.
 */
import { ratio, sequenceOpcodes } from './diff';
import { extractRedlines, HEADING_NUM_RE, type ExtractResult } from './extract';
import { modelOf } from './model';
import type { DocxPackage } from './package';

export const PAIR_THRESHOLD = 0.5;
export const REINSTATE_THRESHOLD = 0.8;

export interface ParagraphView {
  paragraph_index: number;
  section_context: string;
  original: string;
  revised: string;
  changed: boolean;
  authors: string[];
  dates: string[];
}

export type Classification = 'ACCEPTED' | 'REVERTED' | 'MODIFIED' | 'NEW' | 'UNMATCHED_CHANGE';

export interface RoundFinding {
  classification: Classification;
  detail: string;
  section_context: string;
  ours_paragraph_index: number | null;
  theirs_paragraph_index: number | null;
  our_text: string;
  their_original: string;
  their_revised: string;
  base_text: string | null;
  authors: string[];
  dates: string[];
  comment_ids: string[];
}

export interface RoundsResult {
  ours: string;
  theirs: string;
  base: string | null;
  summary: {
    findings: number;
    accepted: number;
    reverted: number;
    modified: number;
    new: number;
    unmatched_change: number;
    their_authors: string[];
  };
  findings: RoundFinding[];
  comments: ExtractResult['comments'];
}

/** Whitespace-normalized text for comparison; case is preserved. */
export function norm(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/** Both views of every paragraph, unchanged ones included — alignment
 * needs the full sequence. The same run walk as `extractRedlines`. */
export function paragraphViews(pkg: DocxPackage): ParagraphView[] {
  const model = modelOf(pkg);
  const views: ParagraphView[] = [];
  let sectionContext = '';
  for (const p of model.paragraphs) {
    const originalParts: string[] = [];
    const revisedParts: string[] = [];
    let changed = false;
    const authors = new Set<string>();
    const dates = new Set<string>();
    for (const r of p.runs) {
      const txt = r.text;
      if (txt === '') continue;
      if (r.change?.kind === 'ins') {
        revisedParts.push(txt);
        changed = true;
      } else if (r.change?.kind === 'del') {
        originalParts.push(txt);
        changed = true;
      } else {
        originalParts.push(txt);
        revisedParts.push(txt);
      }
      if (r.change !== null) {
        if (r.change.author !== null) authors.add(r.change.author);
        if (r.change.date !== null) dates.add(r.change.date.slice(0, 10));
      }
    }
    const revised = revisedParts.join('').trim();
    const original = originalParts.join('').trim();
    const style = (p.style ?? '').toLowerCase();
    if (revised !== '' && (style.startsWith('heading') || HEADING_NUM_RE.test(revised))) sectionContext = revised.slice(0, 120);
    views.push({
      paragraph_index: p.index,
      section_context: sectionContext,
      original,
      revised,
      changed,
      authors: [...authors].sort(),
      dates: [...dates].sort(),
    });
  }
  return views;
}

export type Pair = [number | null, number | null];

/** Pair near-matching paragraphs inside a `replace` block, best first. */
function fuzzyPairs(aTexts: string[], bTexts: string[], aRange: number[], bRange: number[]): Pair[] {
  const scored: Array<[number, number, number]> = [];
  for (const i of aRange) {
    for (const j of bRange) {
      const r = ratio(aTexts[i]!, bTexts[j]!);
      if (r >= PAIR_THRESHOLD) scored.push([r, i, j]);
    }
  }
  scored.sort((x, y) => y[0] - x[0] || x[1] - y[1] || x[2] - y[2]);
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const out: Pair[] = [];
  for (const [, i, j] of scored) {
    if (usedA.has(i) || usedB.has(j)) continue;
    usedA.add(i);
    usedB.add(j);
    out.push([i, j]);
  }
  for (const i of aRange) if (!usedA.has(i)) out.push([i, null]);
  for (const j of bRange) if (!usedB.has(j)) out.push([null, j]);
  return out;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let k = lo; k < hi; k += 1) out.push(k);
  return out;
}

/** Anchor-based paragraph alignment that tolerates insertions and
 * deletions; `null` on either side marks a paragraph with no counterpart. */
export function align(aTexts: string[], bTexts: string[]): Pair[] {
  const pairs: Pair[] = [];
  for (const op of sequenceOpcodes(aTexts, bTexts)) {
    if (op.tag === 'equal') for (let k = 0; k < op.a2 - op.a1; k += 1) pairs.push([op.a1 + k, op.b1 + k]);
    else if (op.tag === 'replace') pairs.push(...fuzzyPairs(aTexts, bTexts, range(op.a1, op.a2), range(op.b1, op.b2)));
    else if (op.tag === 'delete') for (const i of range(op.a1, op.a2)) pairs.push([i, null]);
    else for (const j of range(op.b1, op.b2)) pairs.push([null, j]);
  }
  return pairs;
}

/** The candidate most similar to `text`, if any clears `REINSTATE_THRESHOLD`. */
function bestMatch(text: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestR = 0;
  for (const c of candidates) {
    const r = ratio(text, c);
    if (r > bestR) {
      best = c;
      bestR = r;
    }
  }
  return bestR >= REINSTATE_THRESHOLD ? best : null;
}

export function classify(
  oursViews: ParagraphView[],
  theirsViews: ParagraphView[],
  baseViews: ParagraphView[] | null,
  commentMap: Map<number, string[]>,
): RoundFinding[] {
  const oItems = oursViews.filter(v => norm(v.revised) !== '');
  const tItems = theirsViews.filter(v => norm(v.original) !== '');
  const tInserted = theirsViews.filter(v => norm(v.original) === '' && norm(v.revised) !== '');
  const oursDeleted = oursViews.filter(v => norm(v.original) !== '' && norm(v.revised) === '').map(v => norm(v.original));

  const hasBase = baseViews !== null;
  const baseTextFor = new Map<number, string | null>();
  const weDeleted = [...oursDeleted];
  if (hasBase) {
    const bItems = baseViews.filter(v => norm(v.revised) !== '');
    for (const [bi, oi] of align(bItems.map(v => norm(v.revised)), oItems.map(v => norm(v.revised)))) {
      if (oi !== null) baseTextFor.set(oi, bi !== null ? norm(bItems[bi]!.revised) : null);
      else if (bi !== null) weDeleted.push(norm(bItems[bi]!.revised));
    }
  }

  const findings: RoundFinding[] = [];
  const add = (classification: Classification, detail: string, o: ParagraphView | null = null, t: ParagraphView | null = null, bText: string | null = null): void => {
    const ctx = (t ?? o)?.section_context ?? '';
    findings.push({
      classification,
      detail,
      section_context: ctx,
      ours_paragraph_index: o ? o.paragraph_index : null,
      theirs_paragraph_index: t ? t.paragraph_index : null,
      our_text: o ? o.revised : '',
      their_original: t ? t.original : '',
      their_revised: t ? t.revised : '',
      base_text: bText,
      authors: t ? t.authors : [],
      dates: t ? t.dates : [],
      comment_ids: t ? (commentMap.get(t.paragraph_index) ?? []) : [],
    });
  };

  for (const [oi, tj] of align(oItems.map(v => norm(v.revised)), tItems.map(v => norm(v.original)))) {
    if (oi !== null && tj !== null) {
      const o = oItems[oi]!;
      const t = tItems[tj]!;
      const oText = norm(o.revised);
      const tOrig = norm(t.original);
      const tRev = norm(t.revised);
      const bText = hasBase ? (baseTextFor.has(oi) ? baseTextFor.get(oi)! : null) : null;
      const weEdited = hasBase && (bText === null || bText !== oText);

      if (tOrig === oText) {
        if (tRev === oText) {
          if (weEdited && !t.changed) add('ACCEPTED', 'our edit retained untouched', o, t, bText);
          continue;
        }
        if (!hasBase) add('UNMATCHED_CHANGE', 'edit on top of our sent text; cannot tell counter-modification from new ask without --base', o, t);
        else if (bText !== null && bText === oText) add('NEW', 'change in a paragraph we never touched', o, t, bText);
        else if (bText !== null && tRev === bText) add('REVERTED', 'tracked change restores the pre-round baseline', o, t, bText);
        else add('MODIFIED', 'our language replaced with new text', o, t, bText);
      } else if (tRev === oText) {
        add('ACCEPTED', 'their markup lands on our language', o, t, bText);
      } else if (tRev === tOrig) {
        if (bText !== null && tRev === bText) add('REVERTED', 'silently restored the pre-round baseline', o, t, bText);
        else if (bText !== null && bText === oText) add('NEW', 'silent edit in a paragraph we never touched', o, t, bText);
        else add('REVERTED', 'their text abandons ours for their own', o, t, bText);
      } else if (bText !== null && tRev === bText) {
        add('REVERTED', 'tracked change restores the pre-round baseline', o, t, bText);
      } else {
        add('MODIFIED', 'their revised text differs from both our text and their starting text', o, t, bText);
      }
    } else if (oi !== null) {
      const o = oItems[oi]!;
      const bText = hasBase ? (baseTextFor.has(oi) ? baseTextFor.get(oi)! : null) : null;
      if (!hasBase) add('UNMATCHED_CHANGE', 'paragraph from our version is absent from their draft; pass --base to classify', o);
      else if (bText === null) add('REVERTED', 'paragraph we inserted was dropped', o);
      else if (bText === norm(o.revised)) add('NEW', 'they deleted a paragraph we never touched', o, null, bText);
      else add('REVERTED', 'paragraph we edited was dropped entirely', o, null, bText);
    } else {
      const t = tItems[tj!]!;
      const reinstated = bestMatch(norm(t.original), weDeleted);
      if (reinstated !== null) {
        const detail = norm(t.revised) === norm(t.original) ? 'text we deleted is retained' : 'text we deleted is retained with further edits';
        add('REVERTED', detail, null, t, hasBase ? reinstated : null);
      } else if (!hasBase) {
        add('UNMATCHED_CHANGE', 'paragraph in their draft not present in our version; pass --base to classify', null, t);
      } else {
        add('NEW', 'paragraph present in their draft with no counterpart in ours', null, t);
      }
    }
  }

  for (const t of tInserted) {
    const reinstated = bestMatch(norm(t.revised), weDeleted);
    if (reinstated !== null) add('REVERTED', 'inserted paragraph reinstates text we deleted', null, t, hasBase ? reinstated : null);
    else if (hasBase) add('NEW', 'whole paragraph inserted', null, t);
    else add('UNMATCHED_CHANGE', 'whole paragraph inserted; cannot rule out reinstatement of prior text without --base', null, t);
  }

  // Python: sort by theirs index, else ours index or 0 — a stable sort.
  const key = (f: RoundFinding): number => (f.theirs_paragraph_index !== null ? f.theirs_paragraph_index : (f.ours_paragraph_index ?? 0));
  return findings.map((f, i) => ({ f, i })).sort((a, b) => key(a.f) - key(b.f) || a.i - b.i).map(x => x.f);
}

export interface RoundsInput {
  ours: DocxPackage;
  theirs: DocxPackage;
  base?: DocxPackage | null;
  /** How the three documents are named in the output (`ours`/`theirs`/`base`). */
  names: { ours: string; theirs: string; base?: string | null };
}

export function diffRounds({ ours, theirs, base, names }: RoundsInput): RoundsResult {
  const theirsData = extractRedlines(theirs, names.theirs);
  const commentMap = new Map<number, string[]>();
  for (const c of theirsData.changes) if (c.comment_ids.length > 0 && c.paragraph_index !== null) commentMap.set(c.paragraph_index, c.comment_ids);

  const findings = classify(paragraphViews(ours), paragraphViews(theirs), base ? paragraphViews(base) : null, commentMap);
  const count = (c: Classification): number => findings.filter(f => f.classification === c).length;
  return {
    ours: names.ours,
    theirs: names.theirs,
    base: names.base ?? null,
    summary: {
      findings: findings.length,
      accepted: count('ACCEPTED'),
      reverted: count('REVERTED'),
      modified: count('MODIFIED'),
      new: count('NEW'),
      unmatched_change: count('UNMATCHED_CHANGE'),
      their_authors: theirsData.summary.authors,
    },
    findings,
    comments: theirsData.comments,
  };
}

const GROUP_ORDER: Classification[] = ['REVERTED', 'MODIFIED', 'NEW', 'UNMATCHED_CHANGE', 'ACCEPTED'];
const GROUP_TITLES: Record<Classification, string> = {
  REVERTED: 'REVERTED — our language abandoned for theirs',
  MODIFIED: 'MODIFIED — our language replaced with new text',
  NEW: 'NEW — fresh changes in paragraphs we never touched',
  UNMATCHED_CHANGE: 'UNMATCHED_CHANGE — cannot attribute without --base',
  ACCEPTED: 'ACCEPTED — our language adopted',
};

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** The negotiation delta report `--format markdown` printed. */
export function roundsToMarkdown(data: RoundsResult, fullText = false): string {
  const cap = fullText ? null : 240;
  const trunc = (s: string | null | undefined): string => {
    const t = (s ?? '').replace(/\n/g, ' ');
    return cap === null || t.length <= cap ? t : `${t.slice(0, cap)}…`;
  };
  const out: string[] = [`# Round comparison — ${baseName(data.ours)} → ${baseName(data.theirs)}`, ''];
  if (data.base) out.push(`Baseline: ${baseName(data.base)} (3-way).`);
  else out.push('No --base provided — silent acceptances are not detectable and unattributable changes are labelled UNMATCHED_CHANGE.');
  const s = data.summary;
  out.push(
    '',
    `**${s.findings} findings**: ${s.accepted} accepted, ${s.reverted} reverted, ${s.modified} modified, ${s.new} new, ${s.unmatched_change} unmatched. Their authors: ${s.their_authors.join(', ') || '—'}.`,
  );
  for (const cls of GROUP_ORDER) {
    const group = data.findings.filter(f => f.classification === cls);
    if (group.length === 0) continue;
    out.push('', `## ${GROUP_TITLES[cls]} (${group.length})`, '');
    for (const f of group) {
      const loc = f.theirs_paragraph_index !== null ? `¶${f.theirs_paragraph_index}` : `ours ¶${f.ours_paragraph_index}`;
      const ctx = f.section_context ? ` (${trunc(f.section_context)})` : '';
      const who = f.authors.length > 0 ? ` — ${f.authors.join(', ')}` : '';
      const cids = f.comment_ids.length > 0 ? ` [comments: ${f.comment_ids.join(', ')}]` : '';
      out.push(`- **${loc}**${ctx} — ${f.detail}${who}${cids}`);
      if (f.our_text) out.push(`  - ours: "${trunc(f.our_text)}"`);
      if (f.their_original && norm(f.their_original) !== norm(f.our_text)) out.push(`  - theirs (before): "${trunc(f.their_original)}"`);
      if (f.their_revised && norm(f.their_revised) !== norm(f.their_original)) out.push(`  - theirs (now): "${trunc(f.their_revised)}"`);
    }
  }
  const real = data.comments.filter((c): c is Exclude<typeof c, { error: string }> => !('error' in c));
  if (real.length > 0) {
    out.push('', '## Comments', '');
    for (const c of real) {
      // The Python printed `¶None` for a comment anchored to no paragraph.
      out.push(`- **[${c.id}] ${c.author}** (${c.date}, ¶${c.paragraph_index ?? 'None'}): ${trunc(c.text)}`);
      if (c.anchor_excerpt) out.push(`  - anchored at: "${trunc(c.anchor_excerpt)}"`);
    }
  }
  return out.join('\n');
}
