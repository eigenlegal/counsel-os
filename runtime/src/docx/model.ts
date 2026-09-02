/**
 * One document model for every reader of a `.docx`: paragraphs in document
 * order (body paragraphs and table-cell paragraphs alike), their runs, and
 * two text views — accept-all (the document as it reads once changes are
 * accepted) and reject-all (as it read before them). The three Python
 * scripts each walked the XML their own way; this is the one walk they all
 * port onto.
 *
 * The accept-all run walk is `apply_redlines.get_runs` exactly: a run counts
 * when it is a direct child of the paragraph, inside a `w:hyperlink`, or
 * inside a `w:ins`; a run under `w:del` (or `w:moveFrom`) does not. The
 * reject-all view flips that. `w:moveTo`/`w:moveFrom` are treated as
 * `w:ins`/`w:del`, as `extract_redlines` does.
 */
import type { Document, Element, Node } from '@xmldom/xmldom';
import { COMMENTS_PART, NUMBERING_PART, type DocxPackage } from './package';

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export type TextView = 'accept' | 'reject';

export interface ChangeMark {
  kind: 'ins' | 'del';
  author: string | null;
  date: string | null;
  /** The wrapper element (`w:ins`, `w:del`, `w:moveTo`, `w:moveFrom`). */
  element: Element;
}

export interface DocxRun {
  element: Element;
  /** Visible text: `w:t` and `w:delText`, with tab/br/cr as one space. */
  text: string;
  change: ChangeMark | null;
  inHyperlink: boolean;
  /** `true` when the run holds something the text views drop — a drawing,
   * an object, a field instruction, a footnote/endnote reference. */
  dropped: string | null;
}

export interface Numbering {
  numId: string;
  level: number;
}

export interface DocxParagraph {
  element: Element;
  /** Global index over every paragraph the walk reaches, in document order. */
  index: number;
  /** `body[N]` or `table[i].row[j].cell[k].p[m]` — the grammar the Python
   * scripts' `match.location` selectors use. */
  location: string;
  /** `null` outside any table; otherwise the table/row/cell coordinates. */
  cell: { table: number; row: number; cell: number } | null;
  style: string | null;
  numbering: Numbering | null;
  /** The rendered number ("3.2.") when numbering.xml defines it; else null. */
  numberLabel: string | null;
  runs: DocxRun[];
  /** Comment ids anchored in this paragraph (range starts + references). */
  commentIds: string[];
}

export interface DocxTable {
  index: number;
  element: Element;
  /** rows → cells → paragraph indices into `paragraphs`. */
  rows: number[][][];
}

const INS_TAGS = new Set(['ins', 'moveTo']);
const DEL_TAGS = new Set(['del', 'moveFrom']);

function isW(el: Node | null, local: string): el is Element {
  return el !== null && el.nodeType === 1 && (el as Element).localName === local && (el as Element).namespaceURI === W_NS;
}

function children(el: Element): Element[] {
  const out: Element[] = [];
  for (let n = el.firstChild; n !== null; n = n.nextSibling) if (n.nodeType === 1) out.push(n as Element);
  return out;
}

function attr(el: Element, local: string): string | null {
  const v = el.getAttributeNS(W_NS, local);
  return v === '' ? null : v;
}

/** Every descendant element, depth-first, in document order. */
function* descendants(el: Element): Generator<Element> {
  for (const child of children(el)) {
    yield child;
    yield* descendants(child);
  }
}

/** The text of one run, as `extract_redlines.run_text` reads it. */
export function runText(r: Element): string {
  const parts: string[] = [];
  for (const node of descendants(r)) {
    if (node.namespaceURI !== W_NS) continue;
    if (node.localName === 't' || node.localName === 'delText') parts.push(node.textContent ?? '');
    else if (node.localName === 'tab' || node.localName === 'br' || node.localName === 'cr') parts.push(' ');
  }
  return parts.join('');
}

function droppedContent(r: Element): string | null {
  for (const node of descendants(r)) {
    if (node.namespaceURI !== W_NS) continue;
    if (node.localName === 'drawing' || node.localName === 'pict' || node.localName === 'object') return 'drawing';
    if (node.localName === 'footnoteReference' || node.localName === 'endnoteReference') return 'footnote reference';
    if (node.localName === 'instrText' || node.localName === 'fldChar') return 'field';
  }
  return null;
}

/** The nearest tracked-change wrapper above `el`, stopping at `stop`. */
export function changeAncestor(el: Element, stop: Element): ChangeMark | null {
  let cur = el.parentNode;
  while (cur !== null && cur !== stop) {
    if (cur.nodeType === 1 && (cur as Element).namespaceURI === W_NS) {
      const e = cur as Element;
      if (INS_TAGS.has(e.localName ?? "")) return { kind: 'ins', author: attr(e, 'author'), date: attr(e, 'date'), element: e };
      if (DEL_TAGS.has(e.localName ?? "")) return { kind: 'del', author: attr(e, 'author'), date: attr(e, 'date'), element: e };
    }
    cur = cur.parentNode;
  }
  return null;
}

function hyperlinkAncestor(el: Element, stop: Element): boolean {
  let cur = el.parentNode;
  while (cur !== null && cur !== stop) {
    if (isW(cur, 'hyperlink')) return true;
    cur = cur.parentNode;
  }
  return false;
}

/** All runs of a paragraph — every `w:r` beneath it, in order, wherever it
 * sits (direct, in a hyperlink, in a change wrapper, in a field). */
export function runsOf(p: Element): DocxRun[] {
  const out: DocxRun[] = [];
  for (const node of descendants(p)) {
    if (!isW(node, 'r')) continue;
    out.push({
      element: node,
      text: runText(node),
      change: changeAncestor(node, p),
      inHyperlink: hyperlinkAncestor(node, p),
      dropped: droppedContent(node),
    });
  }
  return out;
}

/** The runs the given view keeps. Accept-all is `get_runs`: not under a
 * deletion. Reject-all: not under an insertion. */
export function runsFor(p: DocxParagraph, view: TextView): DocxRun[] {
  return p.runs.filter(r => (view === 'accept' ? r.change?.kind !== 'del' : r.change?.kind !== 'ins'));
}

export function textOf(p: DocxParagraph, view: TextView): string {
  return runsFor(p, view)
    .map(r => r.text)
    .join('');
}

function styleOf(p: Element): string | null {
  for (const pPr of children(p)) {
    if (!isW(pPr, 'pPr')) continue;
    for (const child of children(pPr)) if (isW(child, 'pStyle')) return attr(child, 'val');
  }
  return null;
}

function numberingOf(p: Element): Numbering | null {
  for (const pPr of children(p)) {
    if (!isW(pPr, 'pPr')) continue;
    for (const child of children(pPr)) {
      if (!isW(child, 'numPr')) continue;
      let numId: string | null = null;
      let level = 0;
      for (const n of children(child)) {
        if (isW(n, 'numId')) numId = attr(n, 'val');
        if (isW(n, 'ilvl')) level = Number(attr(n, 'val') ?? '0') || 0;
      }
      return numId === null ? null : { numId, level };
    }
  }
  return null;
}

/** `w:tcPr/w:gridSpan/@w:val`, at least 1. */
function gridSpanOf(tc: Element): number {
  for (const tcPr of children(tc)) {
    if (!isW(tcPr, 'tcPr')) continue;
    for (const c of children(tcPr)) {
      if (!isW(c, 'gridSpan')) continue;
      const n = Number(attr(c, 'val') ?? '1');
      return Number.isInteger(n) && n > 1 ? n : 1;
    }
  }
  return 1;
}

function commentIdsOf(p: Element): string[] {
  const ids = new Set<string>();
  for (const node of descendants(p)) {
    if (node.namespaceURI !== W_NS) continue;
    if (node.localName === 'commentRangeStart' || node.localName === 'commentReference') {
      const id = attr(node, 'id');
      if (id !== null) ids.add(id);
    }
  }
  return [...ids].sort();
}

// ── Numbering ──────────────────────────────────────────────────────────────

interface Level {
  start: number;
  numFmt: string;
  lvlText: string;
}

interface NumberingDefs {
  /** numId → levels by ilvl. */
  nums: Map<string, Level[]>;
}

function parseNumbering(pkg: DocxPackage): NumberingDefs {
  const nums = new Map<string, Level[]>();
  if (!pkg.hasPart(NUMBERING_PART)) return { nums };
  const root = pkg.part(NUMBERING_PART).documentElement;
  if (root === null) return { nums };
  const abstracts = new Map<string, Level[]>();
  for (const abs of children(root)) {
    if (!isW(abs, 'abstractNum')) continue;
    const id = attr(abs, 'abstractNumId');
    if (id === null) continue;
    const levels: Level[] = [];
    for (const lvl of children(abs)) {
      if (!isW(lvl, 'lvl')) continue;
      const ilvl = Number(attr(lvl, 'ilvl') ?? '0') || 0;
      let start = 1;
      let numFmt = 'decimal';
      let lvlText = '';
      for (const c of children(lvl)) {
        if (isW(c, 'start')) start = Number(attr(c, 'val') ?? '1') || 1;
        else if (isW(c, 'numFmt')) numFmt = attr(c, 'val') ?? 'decimal';
        else if (isW(c, 'lvlText')) lvlText = attr(c, 'val') ?? '';
      }
      levels[ilvl] = { start, numFmt, lvlText };
    }
    abstracts.set(id, levels);
  }
  for (const num of children(root)) {
    if (!isW(num, 'num')) continue;
    const numId = attr(num, 'numId');
    if (numId === null) continue;
    let absId: string | null = null;
    for (const c of children(num)) if (isW(c, 'abstractNumId')) absId = attr(c, 'val');
    const levels = absId === null ? undefined : abstracts.get(absId);
    if (levels !== undefined) nums.set(numId, levels);
  }
  return { nums };
}

const ROMAN: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function formatNumber(n: number, fmt: string): string {
  switch (fmt) {
    case 'lowerLetter':
      return String.fromCharCode(96 + ((n - 1) % 26) + 1).repeat(Math.ceil(n / 26));
    case 'upperLetter':
      return String.fromCharCode(64 + ((n - 1) % 26) + 1).repeat(Math.ceil(n / 26));
    case 'lowerRoman':
    case 'upperRoman': {
      let rest = n;
      let out = '';
      for (const [value, sym] of ROMAN) while (rest >= value) {
        out += sym;
        rest -= value;
      }
      return fmt === 'lowerRoman' ? out.toLowerCase() : out;
    }
    case 'bullet':
      return '•';
    case 'none':
      return '';
    default:
      return String(n);
  }
}

/** Renders `lvlText` (`%1.%2.`) with the counters for each level. */
function renderLabel(levels: Level[], counters: number[], level: number): string {
  const def = levels[level];
  if (def === undefined) return '';
  if (def.numFmt === 'bullet') return '•';
  return def.lvlText.replace(/%(\d)/g, (_m, d: string) => {
    const l = Number(d) - 1;
    const c = counters[l];
    const fmt = levels[l]?.numFmt ?? 'decimal';
    return c === undefined ? '' : formatNumber(c, fmt);
  });
}

// ── The model ──────────────────────────────────────────────────────────────

export class DocxModel {
  readonly paragraphs: DocxParagraph[] = [];
  readonly tables: DocxTable[] = [];
  readonly pkg: DocxPackage;

  constructor(pkg: DocxPackage) {
    this.pkg = pkg;
    const body = this.bodyElement();
    let bodyIndex = 0;
    const walkBlocks = (container: Element, inCell: { table: number; row: number; cell: number } | null, cellParas: number[] | null): void => {
      let cellP = 0;
      for (const child of children(container)) {
        if (isW(child, 'p')) {
          const location = inCell === null ? `body[${bodyIndex++}]` : `table[${inCell.table}].row[${inCell.row}].cell[${inCell.cell}].p[${cellP++}]`;
          const index = this.paragraphs.length;
          this.paragraphs.push({
            element: child,
            index,
            location,
            cell: inCell,
            style: styleOf(child),
            numbering: numberingOf(child),
            numberLabel: null,
            runs: runsOf(child),
            commentIds: commentIdsOf(child),
          });
          cellParas?.push(index);
        } else if (isW(child, 'tbl')) {
          const tableIndex = this.tables.length;
          const table: DocxTable = { index: tableIndex, element: child, rows: [] };
          this.tables.push(table);
          let rowIndex = 0;
          for (const tr of children(child)) {
            if (!isW(tr, 'tr')) continue;
            const row: number[][] = [];
            let cellIndex = 0;
            for (const tc of children(tr)) {
              if (!isW(tc, 'tc')) continue;
              const paras: number[] = [];
              walkBlocks(tc, { table: tableIndex, row: rowIndex, cell: cellIndex }, paras);
              row.push(paras);
              // python-docx numbers cells by GRID column: a cell spanning two
              // columns occupies two indices, so the cell after it is
              // `cell[2]`. The location grammar follows that, or a
              // `match.location` written for the Python script would miss.
              cellIndex += gridSpanOf(tc);
            }
            table.rows.push(row);
            rowIndex += 1;
          }
        } else if (isW(child, 'sdt')) {
          // A content control: its `w:sdtContent` holds ordinary blocks.
          for (const c of children(child)) if (isW(c, 'sdtContent')) walkBlocks(c, inCell, cellParas);
        }
      }
    };
    walkBlocks(body, null, null);
    this.applyNumbering();
  }

  private bodyElement(): Element {
    const root = this.pkg.document.documentElement;
    if (root === null) throw new Error('word/document.xml has no root');
    for (const c of children(root)) if (isW(c, 'body')) return c;
    throw new Error('word/document.xml has no w:body');
  }

  /** Walks the paragraphs in order, keeping a counter per (numId, level)
   * the way Word does: a paragraph at level L bumps L and resets everything
   * deeper; a level that has not started yet begins at its `start`. */
  private applyNumbering(): void {
    const defs = parseNumbering(this.pkg);
    if (defs.nums.size === 0) return;
    const counters = new Map<string, number[]>();
    for (const p of this.paragraphs) {
      if (p.numbering === null) continue;
      const levels = defs.nums.get(p.numbering.numId);
      if (levels === undefined) continue;
      const key = p.numbering.numId;
      const state = counters.get(key) ?? [];
      const level = p.numbering.level;
      for (let l = 0; l < level; l += 1) if (state[l] === undefined) state[l] = levels[l]?.start ?? 1;
      state[level] = state[level] === undefined ? (levels[level]?.start ?? 1) : state[level]! + 1;
      state.length = level + 1;
      counters.set(key, state);
      p.numberLabel = renderLabel(levels, state, level);
    }
  }

  /** Every element, for callers that need the raw tree (extract's comment
   * anchors, the non-body scans). */
  get document(): Document {
    return this.pkg.document;
  }
}

export function modelOf(pkg: DocxPackage): DocxModel {
  return new DocxModel(pkg);
}

export interface DocxComment {
  id: string;
  author: string;
  date: string;
  initials: string;
  /** The comment's paragraphs' `w:t` text, joined with single spaces and
   * trimmed — `extract_redlines` reads it this way. */
  text: string;
}

/** The comments part, in file order; empty when the document has none. */
export function commentsOf(pkg: DocxPackage): DocxComment[] {
  if (!pkg.hasPart(COMMENTS_PART)) return [];
  const root = pkg.part(COMMENTS_PART).documentElement;
  if (root === null) return [];
  const out: DocxComment[] = [];
  for (const c of children(root)) {
    if (!isW(c, 'comment')) continue;
    const texts: string[] = [];
    for (const node of descendants(c)) if (isW(node, 't')) texts.push(node.textContent ?? '');
    out.push({
      id: attr(c, 'id') ?? '',
      author: attr(c, 'author') ?? '',
      date: attr(c, 'date') ?? '',
      initials: attr(c, 'initials') ?? '',
      text: texts.join(' ').trim(),
    });
  }
  return out;
}

export { children, descendants, isW, attr };
