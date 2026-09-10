import { createHash } from 'node:crypto';
import type { Node } from '@xmldom/xmldom';
import { z } from 'zod';
import { parseXml } from '../docx/safety';
import { AuthorityLookup, Publication } from './authority-types';
import type { WorkspaceStore } from './store';
import type { AuthorityReceipt } from './authority-types';
import type { ExtractedFile } from './files';

const HOST = 'https://www.ecfr.gov';
const MAX_BYTES = 2_000_000;
const Titles = z.object({ titles: z.array(z.object({ number: z.number().int(), reserved: z.boolean(),
  up_to_date_as_of: z.iso.date().nullable(), processing_in_progress: z.boolean().optional(),
})).max(50), meta: z.object({ import_in_progress: z.boolean().optional() }).optional() });
export interface PublisherSnapshot {
  name: string; title: string; bytes: Buffer; extracted: ExtractedFile;
  publication: Publication; retrievedAt: string;
}
export const AUTHORITY_LIMITS = [
  'eCFR is the government’s editorial compilation, not the official legal edition. Check applicability, effective dates, delayed amendments, court orders and incorporated material separately.',
  'The dated XML and its text are retained locally. Retrieval time and the publisher’s current-through date are not a legal review or a guarantee that a rule applies.',
];

/** URLs are constructed from bounded citation fields, never from model-supplied
 * URLs, headers, search terms, client names or matter documents. No redirects,
 * credentials or publisher scripts are followed. Byte limits apply after decompression. */
export async function getPublisherBytes(host: 'https://www.ecfr.gov' | 'https://uscode.house.gov', path: string, signal: AbortSignal, transport: typeof fetch): Promise<Buffer> {
  signal.throwIfAborted();
  const response = await transport(host + path, { method: 'GET', signal, redirect: 'error', credentials: 'omit',
    headers: { Accept: 'application/json, application/xml, text/html', 'Accept-Encoding': 'gzip, deflate', 'User-Agent': 'Counsel/0.15 (citation lookup)' } });
  if (!response.ok || response.redirected) {
    await response.body?.cancel();
    throw new Error(`Publisher lookup failed (${response.status}). No current-law verification was completed.`);
  }
  if (response.url && new URL(response.url).origin !== host) { await response.body?.cancel(); throw new Error('Unexpected publisher response.'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The publisher returned no document.');
  const chunks: Uint8Array[] = []; let count = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      count += value.length;
      if (count > MAX_BYTES) throw new Error('This section exceeds the 2 MB research limit. Open the publisher’s version directly.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  return Buffer.concat(chunks);
}

/** XML structure is retained as evidence; text extraction never executes or
 * follows links. Inline formatting stays inline, block and table boundaries remain visible. */
export function extractAuthority(bytes: Buffer, input: AuthorityLookup): ExtractedFile {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Invalid publisher document size.');
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const doc = parseXml(xml, 'eCFR section');
  const root = doc.documentElement!;
  if (root.getAttribute('TYPE') !== 'SECTION' || root.getAttribute('N') !== input.section)
    throw new Error('The publisher did not return the requested section. Nothing was saved.');
  let nodes = 0, complex = false;
  function text(node: Node, depth: number): string {
    if (++nodes > 40_000 || depth > 50) throw new Error('This publisher document is too complex to extract safely.');
    if (node.nodeType === 3 || node.nodeType === 4) return (node.nodeValue ?? '').replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const name = node.nodeName.toUpperCase();
    if (['GRAPHIC', 'MATH', 'IMG', 'GPH', 'TABLE', 'GPOTABLE'].includes(name)) complex = true;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(name)) throw new Error('Unexpected executable publisher content.');
    const result = Array.from(node.childNodes).map(child => text(child, depth + 1)).join('');
    return ['HEAD', 'P', 'FP', 'XREF', 'CITA', 'SOURCE', 'AUTH', 'NOTE', 'ROW', 'TR', 'FTNT', 'HD'].includes(name)
      ? `\n${result.trim()}\n` : ['ENT', 'TD', 'TH'].includes(name) ? `${result.trim()} | ` : result;
  }
  const body = text(root, 0).replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 10 || body.length > 500_000) throw new Error('The requested section did not yield bounded, readable text.');
  const notes = [...AUTHORITY_LIMITS, ...(complex ? ['Tables, equations or graphics occur in this section. Plain text does not preserve their full meaning; inspect the publisher’s original.'] : [])];
  return { body, textStatus: complex ? 'partial' : 'ready', mediaType: 'text/plain',
    extraction: { parser: 'counsel-ecfr-v1', notes, sections: [{ label: `${input.title} CFR ${input.section}`, start: 0, end: body.length }] } };
}

let running = 0;
export async function withPublisherLimit<T>(signal: AbortSignal, work: (combined: AbortSignal) => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  if (running >= 2) throw new Error('Two publisher lookups are running. Try again when one finishes.');
  running++;
  try { return await work(AbortSignal.any([signal, AbortSignal.timeout(20_000)])); }
  finally { running--; }
}
export async function lookupAuthority(store: WorkspaceStore, raw: AuthorityLookup, signal: AbortSignal,
  options: { transport?: typeof fetch; now?: () => Date } = {}): Promise<AuthorityReceipt> {
  const input = AuthorityLookup.parse(raw);
  const transport = options.transport ?? fetch, now = options.now ?? (() => new Date());
  return withPublisherLimit(signal, async combined => {
    const catalog = Titles.parse(JSON.parse((await getPublisherBytes(HOST, '/api/versioner/v1/titles.json', combined, transport)).toString('utf8')));
    const title = catalog.titles.find(item => item.number === input.title);
    if (!title || title.reserved || !title.up_to_date_as_of) throw new Error('The publisher has no available version of this title.');
    if (catalog.meta?.import_in_progress || title.processing_in_progress)
      throw new Error('The publisher is updating this title. Try again after that update finishes.');
    const date = input.asOf ?? title.up_to_date_as_of;
    if (date < '2017-01-01' || date > title.up_to_date_as_of)
      throw new Error(`Choose a date between 2017-01-01 and the publisher’s current-through date, ${title.up_to_date_as_of}. Earlier historical coverage is not connected.`);
    const part = input.section.split('.')[0]!;
    const origin = `/api/versioner/v1/full/${date}/title-${input.title}.xml?part=${part}&section=${input.section}`;
    const bytes = await getPublisherBytes(HOST, origin, combined, transport);
    const extracted = extractAuthority(bytes, input);
    combined.throwIfAborted();
    const publication = Publication.parse({ publisher: 'ecfr', title: input.title, section: input.section,
      requestedDate: input.asOf ?? null, versionDate: date, publisherCurrentThrough: title.up_to_date_as_of,
      url: `${HOST}/on/${date}/title-${input.title}/section-${input.section}` });
    const checkedAt = now().toISOString();
    const { source, reused } = store.retainPublisherSnapshot({ name: `${input.title}-CFR-${input.section}-${date}.xml`,
      title: `${input.title} CFR ${input.section}`, bytes, extracted, publication, retrievedAt: checkedAt });
    return { sourceId: source.id, revisionId: source.latest.id, title: source.latest.title, version: source.latest.number,
      publication: source.latest.provenance.publication!, retrievedAt: source.latest.provenance.retrievedAt!, checkedAt, reused, notes: extracted.extraction.notes };
  });
}

export function publisherKey(publication: Publication): string {
  return `${publication.publisher}:${publication.title}:${publication.section}:${publication.requestedDate ?? 'latest'}`;
}
export const publisherHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
