import { Marked, type Token, type Tokens } from 'marked';
import { decodeHTML } from 'entities';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  TableLayoutType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  AlignmentType,
  LevelFormat,
  InternalHyperlink,
  Bookmark,
  Footer,
  PageNumber,
  type ParagraphChild,
  type IRunOptions,
  type IParagraphOptions,
  type INumberingOptions,
} from 'docx';
import type { ExportSnapshot } from './exports';
import { WorkspaceConflictError } from './types';

const WIDTH = 9360; // Letter, one-inch margins.
const markdown = new Marked({ gfm: true });
const headings = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

/** Parse Markdown as data, never as HTML/OOXML. No embedded files, external relationships or model calls. */
export async function renderWord(
  snapshot: ExportSnapshot,
): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  if (
    snapshot.answer.length > 250_000 ||
    JSON.stringify(snapshot).length > 750_000 ||
    snapshot.evidence.length > 100
  )
    throw new WorkspaceConflictError(
      'Word export supports answers up to 250,000 characters and 100 excerpts. Export a shorter answer.',
    );
  const warnings = new Set<string>();
  const references = new Map(
    snapshot.evidence.flatMap((e, i) => (e.key ? [[e.key, i + 1] as const] : [])),
  );
  const numbering: INumberingOptions['config'][number][] = [];
  let nodes = 0;
  const count = (depth: number) => {
    if (++nodes > 20_000 || depth > 24)
      throw new WorkspaceConflictError(
        'This answer is too complex to export. Simplify deeply nested formatting.',
      );
  };
  const safe = (text: string) => {
    // XML 1.0 cannot represent these characters. Refuse rather than silently lose content.
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]/u.test(text))
      throw new WorkspaceConflictError(
        'This answer contains characters that Word cannot represent. Copy and correct the text before exporting.',
      );
    return text;
  };
  const textRuns = (text: string, style: IRunOptions = {}, citations = true): ParagraphChild[] => {
    const parts = safe(text).split(/(\[S\d+\]|\n|\t)/g);
    return parts.filter(Boolean).map((part) => {
      if (part === '\n') return new TextRun({ ...style, break: 1 });
      if (part === '\t') return new TextRun({ ...style, children: ['\t'] });
      if (citations && /^\[S\d+\]$/.test(part)) {
        const number = references.get(part.slice(1, -1));
        if (number)
          return new InternalHyperlink({
            anchor: `source_${number}`,
            children: [new TextRun({ ...style, text: `[${number}]`, color: '234B78' })],
          });
        warnings.add(
          'Unverified source markers are labeled in the document; they are not supported by saved excerpts.',
        );
        return new TextRun({ ...style, text: `[unverified ${part.slice(1, -1)}]` });
      }
      return new TextRun({ ...style, text: part });
    });
  };
  const inline = (tokens: Token[], style: IRunOptions = {}, depth = 0): ParagraphChild[] =>
    tokens.flatMap((token) => {
      count(depth);
      switch (token.type) {
        case 'strong':
          return inline((token as Tokens.Strong).tokens, { ...style, bold: true }, depth + 1);
        case 'em':
          return inline((token as Tokens.Em).tokens, { ...style, italics: true }, depth + 1);
        case 'del':
          return inline((token as Tokens.Del).tokens, { ...style, strike: true }, depth + 1);
        case 'codespan':
          return textRuns(token.text, { ...style, font: 'Courier New' }, false);
        case 'br':
          return [new TextRun({ break: 1 })];
        case 'link': {
          const link = token as Tokens.Link;
          return [
            ...inline(link.tokens, style, depth + 1),
            ...(link.text === link.href
              ? []
              : textRuns(` (${decodeHTML(link.href)})`, style, false)),
          ];
        }
        case 'image':
          warnings.add('Images are not embedded. Image descriptions are retained as text.');
          return textRuns(`[Image: ${token.text || 'no description'}]`, style, false);
        case 'html':
          warnings.add('HTML is retained as literal text, not rendered or executed.');
          return textRuns(token.raw, style, false);
        case 'text':
          if ('tokens' in token && token.tokens) return inline(token.tokens, style, depth + 1);
          return textRuns(decodeHTML(token.text), style);
        default:
          if ('tokens' in token && Array.isArray(token.tokens))
            return inline(token.tokens, style, depth + 1);
          return textRuns('text' in token ? String(token.text) : token.raw, style);
      }
    });
  const paragraph = (children: ParagraphChild[], options: IParagraphOptions = {}) =>
    new Paragraph({ children, widowControl: true, spacing: { after: 140, line: 276 }, ...options });
  const blocks = (tokens: Token[], depth = 0, indent = 0): (Paragraph | Table)[] =>
    tokens.flatMap<Paragraph | Table>((token) => {
      count(depth);
      switch (token.type) {
        case 'space':
        case 'def':
          return [];
        case 'heading': {
          const heading = token as Tokens.Heading;
          return [
            paragraph(inline(heading.tokens), {
              heading: headings[Math.min(heading.depth, 6) - 1],
              keepNext: true,
            }),
          ];
        }
        case 'paragraph':
        case 'text':
          return [
            paragraph(
              'tokens' in token && token.tokens ? inline(token.tokens) : textRuns(token.text),
              { indent: { left: indent } },
            ),
          ];
        case 'blockquote':
          return blocks((token as Tokens.Blockquote).tokens, depth + 1, indent + 360);
        case 'code':
          return token.text.split('\n').map((line: string) =>
            paragraph(textRuns(line || ' ', { font: 'Courier New', size: 20 }, false), {
              spacing: { after: 0, line: 240 },
              indent: { left: indent },
            }),
          );
        case 'hr':
          return [paragraph([], { spacing: { after: 180 } })];
        case 'list': {
          const list = token as Tokens.List;
          const reference = `list_${numbering.length}`;
          numbering.push({
            reference,
            levels: [
              {
                level: 0,
                format: list.ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
                text: list.ordered ? '%1.' : '•',
                start: list.ordered ? Number(list.start) : 1,
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: indent + 360, hanging: 240 } } },
              },
            ],
          });
          return list.items.flatMap((item) => {
            count(depth + 1);
            const result: (Paragraph | Table)[] = [];
            let first = true;
            for (const child of item.tokens) {
              if (first && (child.type === 'text' || child.type === 'paragraph')) {
                result.push(
                  paragraph(
                    [
                      ...(item.task ? textRuns(item.checked ? '[x] ' : '[ ] ', {}, false) : []),
                      ...inline(
                        child.tokens ?? [{ type: 'text', raw: child.raw, text: child.text }],
                      ),
                    ],
                    { numbering: { reference, level: 0 } },
                  ),
                );
              } else {
                if (first) result.push(paragraph([], { numbering: { reference, level: 0 } }));
                result.push(...blocks([child], depth + 1, indent + 360));
              }
              first = false;
            }
            return result;
          });
        }
        case 'table': {
          const table = token as Tokens.Table;
          if (
            table.header.length > 6 ||
            table.rows.some((row) => row.some((cell) => cell.text.length > 1500))
          ) {
            warnings.add(
              'Wide or long-cell tables are expanded into labeled rows to preserve readable text.',
            );
            return table.rows.flatMap((row, rowIndex) => [
              paragraph(textRuns(`Table row ${rowIndex + 1}`, { bold: true }), { keepNext: true }),
              ...row.map((cell, i) =>
                paragraph([
                  ...inline(table.header[i]!.tokens, { bold: true }),
                  ...textRuns(': '),
                  ...inline(cell.tokens),
                ]),
              ),
            ]);
          }
          const weights = table.header.map((cell, i) =>
            Math.min(
              60,
              Math.max(12, cell.text.length, ...table.rows.map((row) => row[i]?.text.length ?? 0)),
            ),
          );
          const sum = weights.reduce((a, b) => a + b, 0);
          const widths = weights.map((n) => Math.floor((WIDTH * n) / sum));
          widths[widths.length - 1]! += WIDTH - widths.reduce((a, b) => a + b, 0);
          const border = { style: BorderStyle.SINGLE, color: 'D9D9D9', size: 4 };
          return [
            new Table({
              width: { size: WIDTH, type: WidthType.DXA },
              columnWidths: widths,
              layout: TableLayoutType.FIXED,
              borders: {
                top: border,
                bottom: border,
                left: border,
                right: border,
                insideHorizontal: border,
                insideVertical: border,
              },
              rows: [table.header, ...table.rows].map(
                (row, r) =>
                  new TableRow({
                    tableHeader: r === 0,
                    // Keep normal rows intact; exceptionally tall rows must be allowed to split.
                    cantSplit:
                      row.every((cell) => cell.text.length < 500) &&
                      row.reduce((n, cell) => n + cell.text.length, 0) < 1200,
                    children: row.map(
                      (cell, i) =>
                        new TableCell({
                          width: { size: widths[i]!, type: WidthType.DXA },
                          verticalAlign: VerticalAlign.CENTER,
                          margins: { top: 100, bottom: 100, left: 120, right: 120 },
                          shading: { type: ShadingType.CLEAR, fill: r === 0 ? 'E6ECF2' : 'FFFFFF' },
                          children: [
                            paragraph(inline(cell.tokens, { bold: r === 0, size: 21 }), {
                              spacing: { after: 0, line: 252 },
                              alignment:
                                table.align[i] === 'center'
                                  ? AlignmentType.CENTER
                                  : table.align[i] === 'right'
                                    ? AlignmentType.RIGHT
                                    : AlignmentType.LEFT,
                            }),
                          ],
                        }),
                    ),
                  }),
              ),
            }),
            paragraph([], { spacing: { after: 120 } }),
          ];
        }
        case 'html':
          warnings.add('HTML is retained as literal text, not rendered or executed.');
          return [paragraph(textRuns(token.raw, {}, false))];
        default:
          warnings.add('Some unsupported formatting is retained as literal text.');
          return [paragraph(textRuns(token.raw, {}, false))];
      }
    });
  const content = blocks(markdown.lexer(safe(snapshot.answer)));
  for (const e of snapshot.evidence) if (e.coverage) warnings.add(e.coverage);
  const appendix: (Paragraph | Table)[] = [];
  if (snapshot.evidence.length) {
    appendix.push(
      paragraph(textRuns('Sources and saved excerpts'), {
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        keepNext: true,
      }),
    );
    appendix.push(
      paragraph(
        textRuns(
          'References identify the saved versions supporting this work. They do not establish that the underlying information is current.',
        ),
      ),
    );
    snapshot.evidence.forEach((e, i) => {
      const id = e.target.kind === 'work' ? e.target.workId : e.target.revisionId;
      appendix.push(
        paragraph(
          [
            new Bookmark({
              id: `source_${i + 1}`,
              children: textRuns(`[${i + 1}] ${e.title}`, { bold: true }),
            }),
          ],
          { keepNext: true },
        ),
      );
      appendix.push(
        paragraph(
          textRuns(
            `${e.target.kind === 'source' ? 'Source' : e.target.kind === 'knowledge' ? 'Practice knowledge' : 'Prior work'}. ${e.locator || `Text characters ${e.start}–${e.end}`}.`,
            { size: 20 },
          ),
          { keepNext: true },
        ),
      );
      appendix.push(
        ...e.quote
          .split('\n')
          .map((line) => paragraph(textRuns(line || ' ', {}, false), { indent: { left: 240 } })),
      );
      appendix.push(
        paragraph(
          textRuns(
            `Saved ${e.target.kind === 'work' ? 'work' : 'revision'} ${id}\nSHA-256 ${e.contentHash}`,
            { size: 18, color: '555555' },
          ),
        ),
      );
    });
  }
  const status =
    snapshot.disposition === 'decision'
      ? `Recorded decision · ${snapshot.decisionBy}`
      : 'Draft · Not approved';
  const savedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(snapshot.recordedAt));
  const metadata = `${status}\nSaved ${savedDate}`;
  if (!snapshot.evidence.length) warnings.add('No verified excerpts are saved with this answer.');
  const doc = new Document({
    title: safe(snapshot.title),
    creator: 'Counsel OS',
    lastModifiedBy: 'Counsel OS',
    description: 'Export of saved workspace text; not an approval or redline.',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '000000' },
          paragraph: { spacing: { after: 140, line: 276 } },
        },
        title: {
          run: { font: 'Calibri', size: 44, bold: true, color: '000000' },
          paragraph: { spacing: { after: 160 }, keepNext: true },
        },
        ...Object.fromEntries(
          [1, 2, 3, 4, 5, 6].map((n) => [
            `heading${n}`,
            {
              run: {
                font: 'Calibri',
                size: n === 1 ? 30 : n === 2 ? 26 : 23,
                bold: true,
                color: '000000',
              },
              paragraph: { spacing: { before: 240, after: 120 }, keepNext: true },
            },
          ]),
        ),
      },
    },
    numbering: { config: numbering },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              paragraph(
                [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '555555' })],
                { alignment: AlignmentType.RIGHT },
              ),
            ],
          }),
        },
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          paragraph(textRuns(snapshot.title, {}, false), { heading: HeadingLevel.TITLE }),
          paragraph(textRuns(metadata, { size: 20, color: '555555' }), { spacing: { after: 260 } }),
          ...content,
          ...appendix,
          ...(warnings.size
            ? [
                paragraph(textRuns('Export notes'), {
                  heading: HeadingLevel.HEADING_2,
                  keepNext: true,
                }),
                ...[...warnings].map((w) => paragraph(textRuns(w, { size: 20 }))),
              ]
            : []),
        ],
      },
    ],
  });
  return { bytes: new Uint8Array(await Packer.toBuffer(doc)), warnings: [...warnings] };
}
