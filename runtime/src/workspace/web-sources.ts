import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { WorkspaceStore } from './store';
import { extractDocument, extractText, type ExtractedFile } from './files';
import { downloadWebPage, extractWebHtml, publicUrl, WEB_LIMITS, WEB_MAX_TEXT, type WebLink, type WebNetwork } from './public-web';

export const WebLookup = z.object({ url: z.string().min(1).max(1000)
  .describe('Copy an exact public HTTP/HTTPS URL from the user request, a passage you read, or links returned by an earlier webpage retrieval. Never put private facts in a URL.') }).strict();
export interface WebReceipt {
  sourceId: string; revisionId: string; title: string; version: number;
  requestedUrl: string; url: string; retrievedAt: string; checkedAt: string;
  originalHash: string; mediaType: string; reused: boolean; notes: string[];
  links: WebLink[]; linksTruncated: boolean;
}
export interface WebSnapshot { title: string; name: string; bytes: Buffer; extracted: ExtractedFile; url: string; retrievedAt: string; mediaType: string }

let active = 0;
export async function lookupWebPage(store: WorkspaceStore, raw: z.input<typeof WebLookup>, signal: AbortSignal,
  options: { network?: WebNetwork; now?: () => Date } = {}): Promise<WebReceipt> {
  const input = WebLookup.parse(raw), requestedUrl = publicUrl(input.url).href;
  signal.throwIfAborted();
  if (active >= 2) throw new Error('Two webpage retrievals are running. Try again when one finishes.');
  active++;
  const combined = AbortSignal.any([signal, AbortSignal.timeout(25_000)]);
  try {
    const response = await downloadWebPage(requestedUrl, combined, options.network);
    const contentType = response.headers['content-type'] ?? '';
    const mediaType = contentType.split(';')[0]!.trim().toLowerCase();
    let extracted: ExtractedFile, title = new URL(response.url).hostname, extension: string, links: WebLink[] = [], linksTruncated = false;
    if (['text/html', 'application/xhtml+xml'].includes(mediaType)) {
      ({ extracted, title, links, linksTruncated } = extractWebHtml(response.bytes, response.url, contentType)); extension = 'html';
    } else if (mediaType === 'application/pdf') {
      extracted = await extractDocument(response.bytes, 'pdf', combined); extension = 'pdf';
      extracted = { ...extracted, extraction: { ...extracted.extraction, parser: 'counsel-web-pdf-v1', notes: [...WEB_LIMITS, ...extracted.extraction.notes] } };
    } else if (['text/plain', 'text/markdown'].includes(mediaType)) {
      extracted = extractText(response.bytes, 'webpage.txt'); extension = 'txt';
      extracted = { ...extracted, extraction: { ...extracted.extraction, parser: 'counsel-web-text-v1', notes: WEB_LIMITS } };
    } else throw new Error('This URL did not return an HTML page, plain text or PDF. Upload the document instead.');
    if (!extracted.body?.trim() || extracted.body.length > WEB_MAX_TEXT) throw new Error('This page has no readable text or exceeds the reading limit. Upload a readable copy.');
    combined.throwIfAborted();
    const checkedAt = (options.now?.() ?? new Date()).toISOString();
    const { source, reused } = store.retainWebSnapshot({ title, name: `webpage.${extension}`, bytes: response.bytes,
      extracted, url: response.url, retrievedAt: checkedAt, mediaType });
    return { sourceId: source.id, revisionId: source.latest.id, title: source.latest.title, version: source.latest.number,
      requestedUrl, url: response.url, retrievedAt: source.latest.provenance.retrievedAt!, checkedAt,
      originalHash: createHash('sha256').update(response.bytes).digest('hex'), mediaType, reused,
      notes: extracted.extraction.notes, links, linksTruncated };
  } finally { active--; }
}
