/**
 * `apply_redlines` in TypeScript — a port of `scripts/apply_redlines.py`
 * onto the stage-1 package and model. Plain mode replaces text in place;
 * tracked mode writes native Word revisions (`w:del` + `w:ins`, author,
 * date, ids), marking only the changed core of each replacement so the
 * redline reads as a lawyer expects. The result JSON, the selector
 * semantics, the skip reasons and the ordering are the Python's.
 *
 * Every item is resolved against the ORIGINAL document before anything is
 * changed (phase 1), then applied back to front by offset (phase 2), so
 * `occurrence` numbers always mean what they meant in the document the
 * redlines were drafted from and an earlier edit can never shift a later
 * one. Two items on overlapping text: the later is skipped, never misplaced.
 */
import type { Document, Element } from '@xmldom/xmldom';
import { addComment, revisionDate } from './comments';
import { computeReplacementRegions } from './diff';
import { attr, children, descendants, isW, modelOf, W_NS, type DocxParagraph } from './model';
import { DOCUMENT_PART, type DocxPackage } from './package';
import { MalformedXmlError, UnsafeXmlError } from './safety';

// ── Contract (verbatim from the Python) ────────────────────────────────────

export interface MatchSpec {
  occurrence?: unknown;
  location?: unknown;
  paragraph_index?: unknown;
  before?: unknown;
  after?: unknown;
  context?: unknown;
}

export interface RedlineItem {
  current: string;
  proposed: string;
  comment?: string | null;
  author?: string;
  match?: MatchSpec | null;
}

export interface TextMatch {
  location: string;
  occurrence: number;
  start: number;
  end: number;
  /** The whole paragraph's text (the `context` selector searches it). */
  text: string;
  before: string;
  after: string;
  replaceable: boolean;
  paragraph: Element | null;
  paragraphIndex: number | null;
}

export interface FormattedMatch {
  location: string;
  occurrence: number;
  start: number;
  replaceable: boolean;
  before: string;
  after: string;
}

export interface RedlineResult {
  applied: Array<{ index: number; location: string; occurrence: number }>;
  skipped: Array<{ index: number; current: string; reason: string; matches?: FormattedMatch[] }>;
  warnings: Array<{ index: number; current: string; warning: string }>;
  tracked: boolean;
  /** Not in the Python's JSON: what the artifact slip reports. */
  stats: { regions: number; comments: number; paragraphs: number };
}

export interface ApplyOptions {
  track: boolean;
  now?: Date;
  /** Fills an item's missing `author`. The Python used `"Unknown"`. */
  defaultAuthor?: string;
}

const CONTEXT_CHARS = 160;
const NESTED_REASON =
  'Changed text lies inside a hyperlink or an existing tracked insertion; nested revision markup is not supported — resolve the earlier revision first or apply without --track';
const OVERLAP_REASON = "Text at the resolved location changed before this edit was applied (an earlier item's replacement overlaps it)";

export function truncate(text: string, length = 80): string {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

// ── Runs the way python-docx saw them ──────────────────────────────────────

/** `get_runs`: `./w:r | ./w:hyperlink/w:r | ./w:ins/w:r` — direct children
 * only; never under `w:del`. */
export function editableRuns(p: Element): Element[] {
  const out: Element[] = [];
  for (const c of children(p)) {
    if (isW(c, 'r')) out.push(c);
    else if (isW(c, 'hyperlink') || isW(c, 'ins')) for (const r of children(c)) if (isW(r, 'r')) out.push(r);
  }
  return out;
}

/** python-docx `Run.text`: `w:t` text, tab → `\t`, br/cr → `\n`,
 * noBreakHyphen → `-`, ptab → `\t`; direct children of the run only. */
export function runEditText(r: Element): string {
  let out = '';
  for (const c of children(r)) {
    if (!isW(c, c.localName ?? '')) continue;
    switch (c.localName) {
      case 't':
        out += c.textContent ?? '';
        break;
      case 'tab':
      case 'ptab':
        out += '\t';
        break;
      case 'br':
      case 'cr':
        out += '\n';
        break;
      case 'noBreakHyphen':
        out += '-';
        break;
      default:
        break;
    }
  }
  return out;
}

export function paragraphEditText(p: Element): string {
  return editableRuns(p)
    .map(runEditText)
    .join('');
}

function w(doc: Document, local: string): Element {
  return doc.createElementNS(W_NS, `w:${local}`);
}

/** python-docx's `Run.text` setter: clear everything but `rPr`, then
 * rebuild `w:t` / `w:tab` / `w:br` from the string. */
export function setRunText(r: Element, text: string): void {
  const doc = r.ownerDocument as Document;
  for (const c of [...children(r)]) if (!isW(c, 'rPr')) r.removeChild(c);
  let buf = '';
  const flush = (): void => {
    if (buf === '') return;
    const t = w(doc, 't');
    if (/^\s|\s$/.test(buf)) t.setAttribute('xml:space', 'preserve');
    t.appendChild(doc.createTextNode(buf));
    r.appendChild(t);
    buf = '';
  };
  for (const ch of text) {
    if (ch === '\t') {
      flush();
      r.appendChild(w(doc, 'tab'));
    } else if (ch === '\n' || ch === '\r') {
      flush();
      r.appendChild(w(doc, 'br'));
    } else {
      buf += ch;
    }
  }
  flush();
}

// ── Phase 1: matches ───────────────────────────────────────────────────────

function occurrenceStarts(text: string, current: string): number[] {
  if (current === '') return [];
  const starts: number[] = [];
  let from = 0;
  for (;;) {
    const i = text.indexOf(current, from);
    if (i === -1) return starts;
    starts.push(i);
    from = i + current.length;
  }
}

function matchesInParagraph(p: DocxParagraph, current: string, occurrenceBase: number): TextMatch[] {
  const text = paragraphEditText(p.element);
  const out: TextMatch[] = [];
  for (const start of occurrenceStarts(text, current)) {
    const end = start + current.length;
    out.push({
      location: p.location,
      occurrence: occurrenceBase + out.length,
      start,
      end,
      text,
      before: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
      after: text.slice(end, end + CONTEXT_CHARS),
      replaceable: true,
      paragraph: p.element,
      paragraphIndex: p.cell === null ? Number(/^body\[(\d+)\]$/.exec(p.location)?.[1] ?? NaN) : null,
    });
  }
  return out;
}

/** The parts `apply_redlines` cannot edit but still reports hits in, in the
 * Python's order: footnotes, endnotes, comments, then headers, then footers. */
function unsupportedParts(pkg: DocxPackage): Array<{ name: string; label: string }> {
  const names = pkg.partNames();
  const out: Array<{ name: string; label: string }> = [];
  for (const [name, label] of [
    ['word/footnotes.xml', 'footnotes'],
    ['word/endnotes.xml', 'endnotes'],
    ['word/comments.xml', 'comment'],
  ] as const) {
    if (names.includes(name)) out.push({ name, label });
  }
  for (const name of names.filter(n => /^word\/header\d*\.xml$/.test(n))) out.push({ name, label: name.slice('word/'.length, -'.xml'.length) });
  for (const name of names.filter(n => /^word\/footer\d*\.xml$/.test(n))) out.push({ name, label: name.slice('word/'.length, -'.xml'.length) });
  return out;
}

function unsupportedMatches(pkg: DocxPackage, current: string, occurrenceBase: number, warn: (message: string) => void): TextMatch[] {
  const out: TextMatch[] = [];
  for (const { name, label } of unsupportedParts(pkg)) {
    let root: Element | null;
    try {
      root = pkg.part(name).documentElement;
    } catch (err) {
      if (err instanceof UnsafeXmlError || err instanceof MalformedXmlError) {
        warn(`skipping ${name}: ${err.message}`);
        continue;
      }
      throw err;
    }
    if (root === null) continue;
    let paragraphIndex = 0;
    for (const p of descendants(root)) {
      if (!isW(p, 'p')) continue;
      const text = [...descendants(p)]
        .filter(n => isW(n, 't'))
        .map(n => n.textContent ?? '')
        .join('');
      for (const start of occurrenceStarts(text, current)) {
        const end = start + current.length;
        out.push({
          location: `${label}[${paragraphIndex}]`,
          occurrence: occurrenceBase + out.length,
          start,
          end,
          text,
          before: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
          after: text.slice(end, end + CONTEXT_CHARS),
          replaceable: false,
          paragraph: null,
          paragraphIndex: null,
        });
      }
      paragraphIndex += 1;
    }
  }
  return out;
}

/**
 * Every occurrence of `current`, numbered the way the Python numbered them:
 * body paragraphs first (python-docx `document.paragraphs`), then every
 * table cell paragraph (`document.tables`), then the parts that cannot be
 * edited.
 */
export function collectMatches(pkg: DocxPackage, current: string, warn: (message: string) => void = () => {}): TextMatch[] {
  const model = modelOf(pkg);
  const matches: TextMatch[] = [];
  for (const p of model.paragraphs) if (p.cell === null) matches.push(...matchesInParagraph(p, current, matches.length));
  for (const p of model.paragraphs) if (p.cell !== null) matches.push(...matchesInParagraph(p, current, matches.length));
  matches.push(...unsupportedMatches(pkg, current, matches.length, warn));
  return matches;
}

export function formatMatch(m: TextMatch): FormattedMatch {
  return {
    location: m.location,
    occurrence: m.occurrence,
    start: m.start,
    replaceable: m.replaceable,
    before: truncate(m.before.trim(), 80),
    after: truncate(m.after.trim(), 80),
  };
}

function asInt(v: unknown): number | null {
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim() === '' ? NaN : v) : NaN;
  return Number.isInteger(n) ? n : null;
}

export function selectMatch(matches: TextMatch[], spec: MatchSpec | null | undefined): { match: TextMatch | null; reason: string | null } {
  if (spec === undefined || spec === null) {
    if (matches.length === 1) return { match: matches[0]!, reason: null };
    return { match: null, reason: `Found ${matches.length} matches; add a match disambiguator` };
  }
  if (typeof spec !== 'object') return { match: null, reason: 'match must be an object' };

  let selected = matches;
  if ('occurrence' in spec) {
    const occ = asInt(spec.occurrence);
    if (occ === null) return { match: null, reason: 'match.occurrence must be an integer' };
    selected = selected.filter(m => m.occurrence === occ);
  }
  if ('location' in spec) {
    const loc = String(spec.location);
    selected = selected.filter(m => m.location === loc);
  }
  if ('paragraph_index' in spec) {
    const idx = asInt(spec.paragraph_index);
    if (idx === null) return { match: null, reason: 'match.paragraph_index must be an integer' };
    selected = selected.filter(m => m.paragraphIndex === idx);
  }
  if ('before' in spec) {
    const before = String(spec.before);
    selected = selected.filter(m => m.before.endsWith(before));
  }
  if ('after' in spec) {
    const after = String(spec.after);
    selected = selected.filter(m => m.after.startsWith(after));
  }
  if ('context' in spec) {
    const context = String(spec.context);
    selected = selected.filter(m => m.text.includes(context));
  }
  if (selected.length === 1) return { match: selected[0]!, reason: null };
  if (selected.length === 0) return { match: null, reason: 'match disambiguator selected no matches' };
  return { match: null, reason: `match disambiguator still selected ${selected.length} matches` };
}

function bodyOf(pkg: DocxPackage): Element {
  const root = pkg.document.documentElement;
  if (root === null) throw new Error('word/document.xml has no root');
  for (const c of children(root)) if (isW(c, 'body')) return c;
  throw new Error('word/document.xml has no w:body');
}

/** True when `current` appears in the body's deleted text — the warning
 * the Python raised when a match failed because the text was struck. */
export function textInTrackedDeletions(pkg: DocxPackage, current: string): boolean {
  const deleted = [...descendants(bodyOf(pkg))]
    .filter(n => isW(n, 'delText'))
    .map(n => n.textContent ?? '')
    .join('');
  return deleted.includes(current);
}

// ── Plain replacement ──────────────────────────────────────────────────────

interface RunRange {
  start: number;
  end: number;
  run: Element;
}

function runRanges(p: Element): RunRange[] {
  const out: RunRange[] = [];
  let pos = 0;
  for (const run of editableRuns(p)) {
    const len = runEditText(run).length;
    out.push({ start: pos, end: pos + len, run });
    pos += len;
  }
  return out;
}

/** `replace_in_paragraph`: the replacement goes into the FIRST matched run
 * (inheriting its `rPr`), middle runs are cleared, the last keeps its
 * suffix. Returns false when the text at `start` is no longer `current`. */
export function replaceInParagraph(p: Element, current: string, proposed: string, start: number): boolean {
  const full = paragraphEditText(p);
  if (full.slice(start, start + current.length) !== current) return false;
  const end = start + current.length;
  const affected = runRanges(p).filter(r => r.end > start && r.start < end);
  if (affected.length === 0) return false;
  const first = affected[0]!;
  const last = affected[affected.length - 1]!;
  const prefix = runEditText(first.run).slice(0, start - first.start);
  const suffix = runEditText(last.run).slice(end - last.start);
  if (first.run === last.run) {
    setRunText(first.run, prefix + proposed + suffix);
  } else {
    setRunText(first.run, prefix + proposed);
    for (const mid of affected.slice(1, -1)) setRunText(mid.run, '');
    setRunText(last.run, suffix);
  }
  return true;
}

// ── Tracked changes ────────────────────────────────────────────────────────

type IdAllocator = () => number;

function revisionIdAllocator(pkg: DocxPackage): IdAllocator {
  let max = 0;
  for (const el of descendants(bodyOf(pkg))) {
    if (!isW(el, 'ins') && !isW(el, 'del')) continue;
    const id = Number(attr(el, 'id') ?? '0');
    if (Number.isInteger(id)) max = Math.max(max, id);
  }
  let next = max + 1;
  return () => next++;
}

function revisionElement(doc: Document, tag: 'ins' | 'del', author: string, when: string, alloc: IdAllocator): Element {
  const el = w(doc, tag);
  el.setAttributeNS(W_NS, 'w:id', String(alloc()));
  el.setAttributeNS(W_NS, 'w:author', author);
  el.setAttributeNS(W_NS, 'w:date', when);
  return el;
}

/** `_split_run`: a deep copy before the run takes the left half, the run
 * keeps the right. Both keep `rPr`; tabs and breaks rebuild from the text. */
function splitRun(run: Element, offset: number): { left: Element; right: Element } {
  const full = runEditText(run);
  const left = run.cloneNode(true) as Element;
  run.parentNode!.insertBefore(left, run);
  setRunText(left, full.slice(0, offset));
  setRunText(run, full.slice(offset));
  return { left, right: run };
}

function newInsRun(doc: Document, text: string, templateRpr: Element | null): Element {
  const r = w(doc, 'r');
  if (templateRpr !== null) r.appendChild(templateRpr.cloneNode(true));
  setRunText(r, text);
  return r;
}

function rPrOf(run: Element): Element | null {
  for (const c of children(run)) if (isW(c, 'rPr')) return c;
  return null;
}

/** `w:t` → `w:delText`: xmldom cannot rename, so the element is rebuilt. */
function toDelText(run: Element): void {
  const doc = run.ownerDocument as Document;
  for (const t of [...children(run)]) {
    if (!isW(t, 't')) continue;
    const del = w(doc, 'delText');
    for (let i = 0; i < t.attributes.length; i += 1) {
      const a = t.attributes.item(i)!;
      del.setAttribute(a.name, a.value);
    }
    while (t.firstChild !== null) del.appendChild(t.firstChild);
    run.replaceChild(del, t);
  }
}

type RegionStatus = 'ok' | 'not_found' | 'nested';

/** `_apply_tracked_region`: strike `[coreStart, coreEnd)`, insert `insCore`. */
function applyTrackedRegion(p: Element, coreStart: number, coreEnd: number, insCore: string, author: string, when: string, alloc: IdAllocator): RegionStatus {
  const doc = p.ownerDocument as Document;
  const delLen = coreEnd - coreStart;
  const ranges = runRanges(p);
  let affected: RunRange[];
  if (delLen > 0) {
    affected = ranges.filter(r => r.end > coreStart && r.start < coreEnd);
  } else {
    // Pure insertion: the run containing the point, preferring the one the
    // point ends in over the one it starts.
    affected = ranges.filter(r => r.start <= coreStart && coreStart <= r.end).slice(-1);
  }

  if (affected.length === 0 && delLen === 0 && ranges.length === 0) {
    const ins = revisionElement(doc, 'ins', author, when, alloc);
    ins.appendChild(newInsRun(doc, insCore, null));
    p.appendChild(ins);
    return 'ok';
  }
  if (affected.length === 0) return 'not_found';
  for (const a of affected) if (a.run.parentNode !== p) return 'nested';

  const templateRpr = rPrOf(affected[0]!.run);

  if (delLen === 0) {
    const anchor = affected[0]!;
    const { left } = splitRun(anchor.run, coreStart - anchor.start);
    const ins = revisionElement(doc, 'ins', author, when, alloc);
    ins.appendChild(newInsRun(doc, insCore, templateRpr));
    left.parentNode!.insertBefore(ins, left.nextSibling);
    return 'ok';
  }

  // Carve the deleted core out to whole runs.
  const first = affected[0]!;
  if (coreStart > first.start) splitRun(first.run, coreStart - first.start);
  const last = affected[affected.length - 1]!;
  if (coreEnd < last.end) {
    // If first and last are the same run, its text now begins at coreStart
    // after the split above.
    const beginsAt = last.run === first.run && coreStart > first.start ? coreStart : last.start;
    splitRun(last.run, coreEnd - beginsAt);
  }

  const core: Element[] = [];
  let pos = 0;
  for (const run of editableRuns(p)) {
    const s = pos;
    const e = pos + runEditText(run).length;
    pos = e;
    if (s >= coreStart && e <= coreEnd && e > s) core.push(run);
  }
  if (core.length === 0) return 'not_found';

  const del = revisionElement(doc, 'del', author, when, alloc);
  core[0]!.parentNode!.insertBefore(del, core[0]!);
  for (const r of core) {
    del.appendChild(r); // moves the element
    toDelText(r);
  }
  if (insCore !== '') {
    const ins = revisionElement(doc, 'ins', author, when, alloc);
    ins.appendChild(newInsRun(doc, insCore, templateRpr));
    del.parentNode!.insertBefore(ins, del.nextSibling);
  }
  return 'ok';
}

/** `tracked_replace_in_paragraph`: regions back to front; the whole item is
 * refused before anything mutates when any region lands in nested content. */
export function trackedReplaceInParagraph(p: Element, current: string, proposed: string, start: number, author: string, when: string, alloc: IdAllocator): RegionStatus {
  const full = paragraphEditText(p);
  if (full.slice(start, start + current.length) !== current) return 'not_found';
  const regions = computeReplacementRegions(current, proposed);
  if (regions.length === 0) return 'ok';

  const ranges = runRanges(p);
  for (const region of regions) {
    const lo = start + region.start;
    const hi = start + region.end;
    for (const r of ranges) {
      const touches = hi > lo ? r.end > lo && r.start < hi : r.start <= lo && lo <= r.end;
      if (touches && r.run.parentNode !== p) return 'nested';
    }
  }
  for (const region of [...regions].reverse()) {
    const status = applyTrackedRegion(p, start + region.start, start + region.end, region.insert, author, when, alloc);
    if (status !== 'ok') return status;
  }
  return 'ok';
}

// ── The driver ─────────────────────────────────────────────────────────────

/**
 * `main()` without the file I/O: resolves every item against the pristine
 * package, applies back to front, adds comments, and returns the Python's
 * result JSON. The package's `document.xml` (and the comments part) are
 * left dirty for the caller to `save()`.
 */
export function applyRedlines(pkg: DocxPackage, items: RedlineItem[], opts: ApplyOptions): RedlineResult {
  const now = opts.now ?? new Date();
  const when = revisionDate(now);
  const alloc = opts.track ? revisionIdAllocator(pkg) : null;
  const result: RedlineResult = { applied: [], skipped: [], warnings: [], tracked: opts.track, stats: { regions: 0, comments: 0, paragraphs: 0 } };
  const touchedParagraphs = new Set<Element>();

  type Resolved = { index: number; item: RedlineItem; match: TextMatch };
  const resolved: Resolved[] = [];
  items.forEach((item, index) => {
    const current = typeof item.current === 'string' ? item.current : '';
    if (current === '') {
      result.skipped.push({ index, current: '', reason: 'current text must not be empty' });
      return;
    }
    const matches = collectMatches(pkg, current);
    if (matches.length === 0) {
      if (textInTrackedDeletions(pkg, current)) {
        result.warnings.push({ index, current: truncate(current), warning: 'Text appears only inside tracked deletions (w:del); deleted text is not editable' });
      }
      result.skipped.push({ index, current: truncate(current), reason: 'Text not found in document' });
      return;
    }
    const { match, reason } = selectMatch(matches, item.match);
    if (match === null) {
      result.skipped.push({ index, current: truncate(current), reason: reason ?? 'no match', matches: matches.map(formatMatch) });
      return;
    }
    if (!match.replaceable) {
      result.skipped.push({ index, current: truncate(current), reason: `Selected match is in unsupported content: ${match.location}`, matches: [formatMatch(match)] });
      return;
    }
    resolved.push({ index, item, match });
  });

  // Descending start, stable — of two items with the same target the earlier
  // one wins and the later is caught by the pre-replace text check.
  const ordered = resolved.map((r, i) => ({ r, i })).sort((a, b) => b.r.match.start - a.r.match.start || a.i - b.i);
  for (const { r } of ordered) {
    const { index, item, match } = r;
    const current = item.current;
    const proposed = typeof item.proposed === 'string' ? item.proposed : '';
    const author = item.author ?? opts.defaultAuthor ?? 'Unknown';
    const paragraph = match.paragraph!;
    let replaced: boolean;
    if (opts.track) {
      const status = trackedReplaceInParagraph(paragraph, current, proposed, match.start, author, when, alloc!);
      if (status === 'nested') {
        result.skipped.push({ index, current: truncate(current), reason: NESTED_REASON });
        continue;
      }
      replaced = status === 'ok';
      if (replaced) result.stats.regions += computeReplacementRegions(current, proposed).length;
    } else {
      replaced = replaceInParagraph(paragraph, current, proposed, match.start);
      if (replaced) result.stats.regions += 1;
    }
    if (!replaced) {
      result.skipped.push({ index, current: truncate(current), reason: OVERLAP_REASON });
      continue;
    }
    touchedParagraphs.add(paragraph);
    const comment = item.comment;
    if (typeof comment === 'string' && comment !== '') {
      if (addComment(pkg, paragraph, comment, author, now)) result.stats.comments += 1;
      else result.warnings.push({ index, current: truncate(current), warning: 'Comment skipped: paragraph has no runs to anchor the comment to' });
    }
    result.applied.push({ index, location: match.location, occurrence: match.occurrence });
  }

  result.applied.sort((a, b) => a.index - b.index);
  result.skipped.sort((a, b) => a.index - b.index);
  result.warnings.sort((a, b) => a.index - b.index);
  result.stats.paragraphs = touchedParagraphs.size;
  if (result.applied.length > 0) pkg.touch(DOCUMENT_PART);
  return result;
}

/** The Python's exit-code rule, for callers that want it: 2 on any skip. */
export function redlineExitCode(result: RedlineResult): 0 | 2 {
  return result.skipped.length > 0 ? 2 : 0;
}
