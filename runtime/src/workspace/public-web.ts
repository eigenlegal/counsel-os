import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { TextDecoder } from 'node:util';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import type { ExtractedFile } from './files';

export const WEB_MAX_BYTES = 5_000_000;
export const WEB_MAX_TEXT = 500_000;
const blocked4 = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const)
  blocked4.addSubnet(address, prefix, 'ipv4');
const global6 = new BlockList(), blocked6 = new BlockList();
global6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const)
  blocked6.addSubnet(address, prefix, 'ipv6');
export function publicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !blocked4.check(address, 'ipv4')
    : family === 6 && global6.check(address, 'ipv6') && !blocked6.check(address, 'ipv6');
}

export function publicUrl(raw: string): URL {
  if (raw.length > 1000 || /[\s\\\u0000-\u001f\u007f]/.test(raw)) throw new Error('Use a public HTTP or HTTPS link without spaces or credentials.');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Use a complete public HTTP or HTTPS URL.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port
    || host.endsWith('.') || (!isIP(host) && (!host.includes('.') || /\.(localhost|local|internal|lan|home|test|invalid)$/i.test(host)))
    || (isIP(host) && !publicAddress(host)))
    throw new Error('Only public HTTP/HTTPS pages on standard ports are supported. Local, private and credential-bearing URLs are blocked.');
  url.hash = '';
  return url;
}

/** Only exact URLs present in user text or already-read evidence become targets.
 * Strip prose punctuation, not arbitrary query parameters or path content. */
export function textUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'\]]+/gi)) {
    let raw = match[0].replace(/[.,;:!?]+$/, '');
    while (raw.endsWith(')') && (raw.match(/\)/g)?.length ?? 0) > (raw.match(/\(/g)?.length ?? 0)) raw = raw.slice(0, -1);
    try { urls.add(publicUrl(raw).href); } catch { /* not fetchable */ }
    if (urls.size >= 200) break;
  }
  return [...urls];
}

export interface WebResponse { status: number; headers: Record<string, string | undefined>; bytes: Buffer }
export interface WebNetwork {
  resolve(host: string): Promise<Array<{ address: string; family: number }>>;
  request(url: URL, address: string, signal: AbortSignal): Promise<WebResponse>;
}

/** Socket destination is the checked IP, not another DNS lookup. Host/SNI and
 * certificate identity remain the requested hostname. No ambient proxy, cookies,
 * referer, auth, browser session, request body, scripts or subresource requests. */
export const publicWebNetwork: WebNetwork = {
  resolve: host => lookup(host, { all: true, verbatim: true }),
  request: (url, address, signal) => new Promise((resolve, reject) => {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const headers = { Host: url.host, Accept: 'text/html, text/plain, application/pdf',
      'Accept-Encoding': 'gzip, deflate, br', 'User-Agent': 'Counsel-OS/0.15 (public document retrieval)' };
    const receive = (response: IncomingMessage) => {
      const status = response.statusCode ?? 0;
      const responseHeaders = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value ?? '']));
      if (status < 200 || status >= 300) { response.destroy(); resolve({ status, headers: responseHeaders, bytes: Buffer.alloc(0) }); return; }
      if (Number(response.headers['content-length']) > WEB_MAX_BYTES) { response.destroy(); reject(new Error('This page exceeds the 5 MB retrieval limit.')); return; }
      const encoding = response.headers['content-encoding']?.trim().toLowerCase();
      const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : null;
      if (encoding && encoding !== 'identity' && !decoder) { response.destroy(); reject(new Error('Unsupported webpage compression.')); return; }
      const stream = decoder ? response.pipe(decoder) : response;
      const chunks: Buffer[] = []; let wireBytes = 0, decodedBytes = 0;
      const fail = (error: Error) => { response.destroy(); decoder?.destroy(); reject(error); };
      response.on('error', fail);
      response.on('aborted', () => fail(new Error('Webpage download was interrupted.')));
      response.on('data', chunk => { wireBytes += chunk.length; if (wireBytes > WEB_MAX_BYTES) fail(new Error('This page exceeds the 5 MB retrieval limit.')); });
      stream.on('error', fail);
      stream.on('data', chunk => {
        decodedBytes += chunk.length;
        if (decodedBytes > WEB_MAX_BYTES) { fail(new Error('This page exceeds the 5 MB expanded-text limit.')); return; }
        chunks.push(Buffer.from(chunk));
      });
      stream.on('end', () => resolve({ status, headers: responseHeaders, bytes: Buffer.concat(chunks) }));
    };
    const options = { hostname: address, port: url.protocol === 'https:' ? 443 : 80,
      path: url.pathname + url.search, method: 'GET', headers, signal, agent: false as const,
      maxHeaderSize: 32_768, family: isIP(address),
      ...(url.protocol === 'https:' ? { servername: isIP(host) ? '' : host, rejectUnauthorized: true,
        checkServerIdentity: (_: string, cert: Parameters<typeof checkServerIdentity>[1]) => checkServerIdentity(host, cert) } : {}) };
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(options, receive);
    request.on('error', reject); request.end();
  }),
};

async function cancellable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function downloadWebPage(raw: string, signal: AbortSignal, network = publicWebNetwork) {
  let url = publicUrl(raw);
  const visited = new Set<string>();
  for (let redirects = 0; redirects <= 4; redirects++) {
    signal.throwIfAborted();
    if (visited.has(url.href)) throw new Error('The page redirects in a loop.');
    visited.add(url.href);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }]
      : await cancellable(network.resolve(host), signal);
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(item => !publicAddress(item.address)))
      throw new Error('This hostname resolves to a private or unsupported network address. No page was fetched.');
    // Prefer IPv4 where available; keep each attempted socket pinned to a
    // validated public address. A connection failure is not a fresh DNS lookup.
    const address = addresses.find(item => item.family === 4) ?? addresses[0]!;
    const response = await cancellable(network.request(url, address.address, signal), signal);
    signal.throwIfAborted();
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.headers.location || redirects === 4) throw new Error('Too many redirects or missing redirect destination.');
      const next = publicUrl(new URL(response.headers.location, url).href);
      if (url.protocol === 'https:' && next.protocol !== 'https:') throw new Error('An insecure redirect was blocked.');
      url = next; continue;
    }
    if (response.status !== 200) throw new Error(`Public page retrieval failed (HTTP ${response.status}). Login-protected, blocked or unavailable pages may need an upload. Nothing was verified.`);
    if (!response.bytes.length || response.bytes.length > WEB_MAX_BYTES) throw new Error('The page is empty or exceeds the 5 MB retrieval limit.');
    return { ...response, url: url.href, redirects: [...visited] };
  }
  throw new Error('Unable to retrieve the page.');
}

export interface WebLink { url: string; title: string }
type HtmlNode = DefaultTreeAdapterMap['node'];
export const WEB_LIMITS = [
  'Public page fetched without browser login, scripts or subresources. Hidden, interactive or dynamically loaded content may be missing.',
  'The saved page is evidence of what was retrieved, not proof of the version governing a signing date or a comprehensive legal-currency check.',
];
export function extractWebHtml(bytes: Buffer, url: string, contentType: string) {
  if (!bytes.length || bytes.length > WEB_MAX_BYTES) throw new Error('Invalid webpage size.');
  const charset = contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1] ?? 'utf-8';
  let html: string;
  try { html = new TextDecoder(charset).decode(bytes); } catch { throw new Error('Unsupported webpage character encoding.'); }
  const document = parse(html, { scriptingEnabled: false });
  let nodes = 0, complex = false, title = '';
  const links = new Map<string, WebLink>();
  const omit = new Set(['script', 'style', 'template', 'noscript', 'head', 'nav', 'footer', 'form', 'button', 'input', 'select', 'textarea', 'iframe', 'object', 'embed', 'svg', 'canvas']);
  const flatten = (node: HtmlNode, depth: number): string => {
    if (++nodes > 80_000 || depth > 100) throw new Error('This page is too complex to extract safely.');
    if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value.replace(/\s+/g, ' ');
    if (!('childNodes' in node)) return '';
    if ('tagName' in node) {
      const attr = (name: string) => node.attrs.find(attribute => attribute.name === name)?.value;
      if (node.tagName === 'title') title ||= node.childNodes.map(child => flatten(child, depth + 1)).join('').trim();
      if (node.tagName === 'head') {
        const element = node.childNodes.find(child => 'tagName' in child && child.tagName === 'title');
        if (element) flatten(element, depth + 1);
      }
      if (omit.has(node.tagName) || attr('hidden') !== undefined || attr('aria-hidden') === 'true'
        || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr('style') ?? '')) return '';
      if (['table', 'img', 'math'].includes(node.tagName)) complex = true;
      const text = node.childNodes.map(child => flatten(child, depth + 1)).join('');
      if (node.tagName === 'a' && attr('href') && !attr('href')!.startsWith('#')) {
        try {
          const link = publicUrl(new URL(attr('href')!, url).href).href;
          if (!links.has(link) && links.size < 101) links.set(link, { url: link, title: text.trim().slice(0, 200) || link });
        } catch { /* inert unsupported link */ }
      }
      if (node.tagName === 'br') return '\n';
      if (/^(p|div|section|article|main|h[1-6]|li|tr|blockquote|pre|dt|dd)$/.test(node.tagName)) return `\n${text.trim()}\n`;
      if (/^(td|th)$/.test(node.tagName)) return `${text.trim()} | `;
      return text;
    }
    return node.childNodes.map(child => flatten(child, depth + 1)).join('');
  };
  const body = flatten(document, 0).replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 100) throw new Error('The page did not provide enough readable text. It may require JavaScript or a login; upload or paste the page instead.');
  if (body.length > WEB_MAX_TEXT) throw new Error('The page exceeds the 500,000-character reading limit. Use a more specific page or upload a copy.');
  if (/^(just a moment|access denied|attention required|sign in|log in|verify you are human)/i.test(title)
    || (body.length < 2000 && /enable javascript|verify you are human|checking your browser/i.test(body)))
    throw new Error('The site returned a login or browser challenge, not the requested document. Upload or paste a copy.');
  const notes = [...WEB_LIMITS, ...(complex ? ['Tables or graphics occur on this page; the plain-text view may not preserve their full meaning.'] : [])];
  const extracted: ExtractedFile = { body, textStatus: 'partial', mediaType: 'text/plain',
    extraction: { parser: 'counsel-web-html-v1', notes, sections: [] } };
  return { title: title.slice(0, 300) || new URL(url).hostname, extracted, links: [...links.values()].slice(0, 100), linksTruncated: links.size > 100 };
}
