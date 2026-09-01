/**
 * A tiny `.docx` writer for tests. It produces the minimum package Word
 * accepts — content types, package rels, `document.xml`, its rels — plus
 * optional `numbering.xml`, `comments.xml`, `header1.xml`, and any raw part
 * a test wants to plant. Nothing here needs Python or Word, which is the
 * point: the Python tests generated fixtures with python-docx at test time.
 */
import { zipSync } from 'fflate';

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export interface RunSpec {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  /** Wrap the run in `w:ins` with these attributes. */
  ins?: { author: string; date: string };
  /** Wrap the run in `w:del` (text becomes `w:delText`). */
  del?: { author: string; date: string };
  /** Wrap the run in `w:moveTo` / `w:moveFrom`. */
  moveTo?: { author: string; date: string };
  moveFrom?: { author: string; date: string };
  /** Wrap the run in `w:hyperlink r:id="…"`. */
  hyperlink?: string;
  tab?: boolean;
  br?: boolean;
  /** A `w:drawing` placeholder, for the "dropped with a warning" path. */
  drawing?: boolean;
  /** A `w:fldSimple` around the run. */
  field?: string;
  /** A footnote reference run. */
  footnoteRef?: string;
}

export interface ParagraphSpec {
  style?: string;
  numId?: string;
  ilvl?: number;
  runs: Array<string | RunSpec>;
  /** Anchor a comment (by id) around all the runs. */
  comment?: string;
}

export interface CellSpec {
  paragraphs: ParagraphSpec[];
  gridSpan?: number;
  vMerge?: 'restart' | 'continue';
}

export interface TableSpec {
  rows: CellSpec[][];
}

export type BlockSpec = ParagraphSpec | { table: TableSpec };

export interface NumberingLevel {
  start?: number;
  numFmt?: string;
  lvlText: string;
}

export interface CommentSpec {
  id: string;
  author: string;
  date: string;
  initials?: string;
  text: string;
}

export interface DocxSpec {
  blocks: BlockSpec[];
  /** `numId` → levels (index = ilvl). Every num maps to its own abstractNum. */
  numbering?: Record<string, NumberingLevel[]>;
  comments?: CommentSpec[];
  /** Paragraphs for `word/header1.xml`. */
  header?: ParagraphSpec[];
  /** Paragraphs for `word/footnotes.xml` (one footnote, id 1). */
  footnotes?: ParagraphSpec[];
  /** Raw parts planted verbatim — hostile XML, extra files, anything. */
  rawParts?: Record<string, string | Uint8Array>;
}

const FIXED_MTIME = new Date(Date.UTC(2000, 0, 1));

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function runXml(spec: string | RunSpec): string {
  const r = typeof spec === 'string' ? { text: spec } : spec;
  const rPr = r.bold || r.italic ? `<w:rPr>${r.bold ? '<w:b/>' : ''}${r.italic ? '<w:i/>' : ''}</w:rPr>` : '';
  let body = '';
  if (r.tab) body += '<w:tab/>';
  if (r.br) body += '<w:br/>';
  if (r.drawing) body += '<w:drawing><wp:inline xmlns:wp="urn:wp"/></w:drawing>';
  if (r.footnoteRef !== undefined) body += `<w:footnoteReference w:id="${esc(r.footnoteRef)}"/>`;
  if (r.text !== undefined) {
    const tag = r.del !== undefined || r.moveFrom !== undefined ? 'w:delText' : 'w:t';
    body += `<${tag} xml:space="preserve">${esc(r.text)}</${tag}>`;
  }
  let xml = `<w:r>${rPr}${body}</w:r>`;
  if (r.field !== undefined) xml = `<w:fldSimple w:instr="${esc(r.field)}">${xml}</w:fldSimple>`;
  if (r.hyperlink !== undefined) xml = `<w:hyperlink r:id="${esc(r.hyperlink)}">${xml}</w:hyperlink>`;
  const wrap = (tag: string, a: { author: string; date: string }): string =>
    `<${tag} w:id="${nextId()}" w:author="${esc(a.author)}" w:date="${esc(a.date)}">${xml}</${tag}>`;
  if (r.ins !== undefined) xml = wrap('w:ins', r.ins);
  if (r.del !== undefined) xml = wrap('w:del', r.del);
  if (r.moveTo !== undefined) xml = wrap('w:moveTo', r.moveTo);
  if (r.moveFrom !== undefined) xml = wrap('w:moveFrom', r.moveFrom);
  return xml;
}

let idCounter = 100;
function nextId(): number {
  idCounter += 1;
  return idCounter;
}

export function paragraphXml(p: ParagraphSpec): string {
  const pPrParts: string[] = [];
  if (p.style !== undefined) pPrParts.push(`<w:pStyle w:val="${esc(p.style)}"/>`);
  if (p.numId !== undefined) pPrParts.push(`<w:numPr><w:ilvl w:val="${p.ilvl ?? 0}"/><w:numId w:val="${esc(p.numId)}"/></w:numPr>`);
  const pPr = pPrParts.length > 0 ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';
  let runs = p.runs.map(runXml).join('');
  if (p.comment !== undefined) {
    runs = `<w:commentRangeStart w:id="${esc(p.comment)}"/>${runs}<w:commentRangeEnd w:id="${esc(p.comment)}"/><w:r><w:commentReference w:id="${esc(p.comment)}"/></w:r>`;
  }
  return `<w:p>${pPr}${runs}</w:p>`;
}

function tableXml(t: TableSpec): string {
  const rows = t.rows
    .map(row => {
      const cells = row
        .map(cell => {
          const tcPr: string[] = [];
          if (cell.gridSpan !== undefined) tcPr.push(`<w:gridSpan w:val="${cell.gridSpan}"/>`);
          if (cell.vMerge !== undefined) tcPr.push(cell.vMerge === 'restart' ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>');
          const pr = tcPr.length > 0 ? `<w:tcPr>${tcPr.join('')}</w:tcPr>` : '';
          return `<w:tc>${pr}${cell.paragraphs.map(paragraphXml).join('')}</w:tc>`;
        })
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');
  return `<w:tbl>${rows}</w:tbl>`;
}

function blockXml(b: BlockSpec): string {
  return 'table' in b ? tableXml(b.table) : paragraphXml(b);
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export function documentXml(blocks: BlockSpec[]): string {
  return (
    XML_DECL +
    `<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${blocks.map(blockXml).join('')}<w:sectPr/></w:body></w:document>`
  );
}

function numberingXml(numbering: Record<string, NumberingLevel[]>): string {
  const ids = Object.keys(numbering);
  const abstracts = ids
    .map((numId, i) => {
      const levels = numbering[numId]!
        .map(
          (lvl, ilvl) =>
            `<w:lvl w:ilvl="${ilvl}"><w:start w:val="${lvl.start ?? 1}"/><w:numFmt w:val="${esc(lvl.numFmt ?? 'decimal')}"/><w:lvlText w:val="${esc(lvl.lvlText)}"/></w:lvl>`,
        )
        .join('');
      return `<w:abstractNum w:abstractNumId="${i}">${levels}</w:abstractNum>`;
    })
    .join('');
  const nums = ids.map((numId, i) => `<w:num w:numId="${esc(numId)}"><w:abstractNumId w:val="${i}"/></w:num>`).join('');
  return XML_DECL + `<w:numbering xmlns:w="${W_NS}">${abstracts}${nums}</w:numbering>`;
}

function commentsXml(comments: CommentSpec[]): string {
  const items = comments
    .map(
      c =>
        `<w:comment w:id="${esc(c.id)}" w:author="${esc(c.author)}" w:date="${esc(c.date)}" w:initials="${esc(c.initials ?? c.author.slice(0, 2))}"><w:p><w:r><w:t xml:space="preserve">${esc(c.text)}</w:t></w:r></w:p></w:comment>`,
    )
    .join('');
  return XML_DECL + `<w:comments xmlns:w="${W_NS}">${items}</w:comments>`;
}

const CONTENT_TYPES_HEAD =
  XML_DECL +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>';

const PACKAGE_RELS =
  XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

/** The package as bytes. Deterministic: fixed timestamps, stored (level 0). */
export function buildDocx(spec: DocxSpec): Uint8Array {
  const enc = new TextEncoder();
  const parts: Record<string, Uint8Array> = {};
  const overrides: string[] = [];
  const docRels: string[] = [];

  parts['word/document.xml'] = enc.encode(documentXml(spec.blocks));
  if (spec.numbering !== undefined) {
    parts['word/numbering.xml'] = enc.encode(numberingXml(spec.numbering));
    overrides.push('<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>');
    docRels.push('<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>');
  }
  if (spec.comments !== undefined) {
    parts['word/comments.xml'] = enc.encode(commentsXml(spec.comments));
    overrides.push('<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>');
    docRels.push('<Relationship Id="rIdCom" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>');
  }
  if (spec.header !== undefined) {
    parts['word/header1.xml'] = enc.encode(XML_DECL + `<w:hdr xmlns:w="${W_NS}" xmlns:r="${R_NS}">${spec.header.map(paragraphXml).join('')}</w:hdr>`);
    overrides.push('<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>');
    docRels.push('<Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>');
  }
  if (spec.footnotes !== undefined) {
    parts['word/footnotes.xml'] = enc.encode(
      XML_DECL + `<w:footnotes xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:footnote w:id="1">${spec.footnotes.map(paragraphXml).join('')}</w:footnote></w:footnotes>`,
    );
    overrides.push('<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>');
    docRels.push('<Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>');
  }
  docRels.push('<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>');

  parts['[Content_Types].xml'] = enc.encode(CONTENT_TYPES_HEAD + overrides.join('') + '</Types>');
  parts['_rels/.rels'] = enc.encode(PACKAGE_RELS);
  parts['word/_rels/document.xml.rels'] = enc.encode(
    XML_DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + docRels.join('') + '</Relationships>',
  );
  for (const [name, value] of Object.entries(spec.rawParts ?? {})) {
    parts[name] = typeof value === 'string' ? enc.encode(value) : value;
  }

  const zippable: Record<string, [Uint8Array, { level: 0; mtime: Date }]> = {};
  for (const [name, bytes] of Object.entries(parts)) zippable[name] = [bytes, { level: 0, mtime: FIXED_MTIME }];
  return zipSync(zippable);
}

/** Shorthand: one paragraph per string. */
export function simpleDocx(...paragraphs: string[]): Uint8Array {
  return buildDocx({ blocks: paragraphs.map(text => ({ runs: [text] })) });
}
