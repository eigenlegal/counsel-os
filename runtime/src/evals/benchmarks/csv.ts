/**
 * A small RFC 4180 reader for the benchmarks' CSV and TSV files: quoted
 * fields may hold the delimiter, newlines and doubled quotes (MAUD's clause
 * column has all three). Rows come back keyed by the header line.
 */
export function parseDelimited(text: string, delimiter: ',' | '\t'): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  while (i < src.length) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"' && field === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (header === undefined) return [];
  return body
    .filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map(r => Object.fromEntries(header.map((h, k) => [h.trim(), r[k] ?? ''])));
}

export const parseCsv = (text: string): Record<string, string>[] => parseDelimited(text, ',');
export const parseTsv = (text: string): Record<string, string>[] => parseDelimited(text, '\t');
