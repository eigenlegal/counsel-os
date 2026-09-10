import { DOMParser, type Node, type Element } from '@xmldom/xmldom';
import { StatuteLookup, UscPublication, type AuthorityReceipt } from './authority-types';
import { getPublisherBytes, withPublisherLimit } from './authorities';
import type { WorkspaceStore } from './store';
import type { ExtractedFile } from './files';

const HOST = 'https://uscode.house.gov';
export const STATUTE_LIMITS = [
  'U.S. House Office of the Law Revision Counsel preliminary U.S. Code. Check pending updates, source credits, statutory notes, effective dates and applicability separately. Non-positive-law titles are prima facie evidence; consult the enacted laws for controlling text.',
  'The publisher’s laws-in-effect date and public-law update marker are different. Neither the retrieval time nor these dates certify comprehensive current-law research. Cases, state law and historical editions are not retrieved by this tool.',
];
const classHas = (el: Element, name: string) => (el.getAttribute('class') ?? '').split(/\s+/).includes(name);

/** Parses inert HTML; no browser, scripts, external entities or links are run.
 * Require the publisher's document identity AND currency markers. Changes in
 * publisher layout fail closed, rather than storing a login/error/search page. */
export function extractStatute(bytes: Buffer, raw: StatuteLookup) {
  const input = StatuteLookup.parse(raw);
  if (!bytes.length || bytes.length > 2_000_000) throw new Error('Invalid publisher document size.');
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const safe = html.replace(/<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD XHTML 1\.0 Transitional\/\/EN" "http:\/\/www\.w3\.org\/TR\/xhtml1\/DTD\/xhtml1-transitional\.dtd">/i, '');
  if (/<!DOCTYPE|<!ENTITY/i.test(safe)) throw new Error('Unexpected publisher entity declaration.');
  const doc = new DOMParser({ onError: (level) => { if (level === 'fatalError') throw new Error('Malformed publisher page.'); } }).parseFromString(safe, 'text/html');
  const elements: Element[] = []; let nodes = 0;
  const inspect = (node: Node, depth: number) => {
    if (++nodes > 40_000 || depth > 60) throw new Error('Publisher page exceeds inspection limits.');
    if (node.nodeType === 1) elements.push(node as Element);
    for (const child of Array.from(node.childNodes ?? [])) inspect(child, depth + 1);
  };
  inspect(doc, 0);
  const viewers = elements.filter(el => el.getAttribute('id') === 'docViewer');
  if (viewers.length !== 1) throw new Error('The publisher did not return one statute section. Nothing was saved.');
  const viewer = viewers[0]!, sectionHtml = viewer.toString();
  const identity = [...sectionHtml.matchAll(/<!--\s*documentid:([^\s]+)\s+usckey:\d+\s+currentthrough:(\d{8})_(\d{3}-\d{1,4})\s/g)];
  if (identity.length !== 1 || identity[0]![1] !== `${input.title}_${input.section}`)
    throw new Error('Publisher section identity or currency marker did not match. Nothing was saved.');
  const marker = identity[0]!, date = marker[2]!, currentThrough = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
  const scoped: Element[] = [];
  const collect = (el: Element) => { scoped.push(el); for (const child of Array.from(el.childNodes)) if (child.nodeType === 1) collect(child as Element); };
  collect(viewer);
  const inEffect = scoped.filter(el => classHas(el, 'lawsInEffect'));
  const statement = inEffect.length === 1 ? (inEffect[0]!.textContent ?? '').trim() : '';
  const match = statement.match(/^Text contains those laws in effect on ([A-Z][a-z]+) (\d{1,2}), (\d{4})$/);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (!match || !months.includes(match[1]!)) throw new Error('Publisher laws-in-effect date is unavailable. Nothing was saved.');
  const lawsInEffectOn = `${match[3]}-${String(months.indexOf(match[1]!) + 1).padStart(2, '0')}-${match[2]!.padStart(2, '0')}`;
  let complex = false;
  function text(node: Node): string {
    if (node.nodeType === 3 || node.nodeType === 4) return (node.nodeValue ?? '').replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const el = node as Element, name = (el.localName ?? '').toLowerCase();
    // The public viewer embeds navigation scripts; omit them, never execute.
    if (['script', 'style', 'iframe', 'object', 'form', 'input', 'button'].includes(name)) return '';
    if (classHas(el, 'jumpTo') || classHas(el, 'expCite')) return '';
    if (['table', 'img', 'math', 'svg'].includes(name)) complex = true;
    const body = Array.from(el.childNodes).map(text).join('');
    return /^(p|div|h[1-6]|li|tr)$/.test(name) ? `\n${body.trim()}\n` : /^(td|th)$/.test(name) ? `${body.trim()} | ` : body;
  }
  const body = text(viewer).replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 40 || body.length > 500_000) throw new Error('The statute did not yield bounded readable text.');
  const publication = UscPublication.parse({ publisher: 'uscode', ...input, requestedDate: null,
    versionDate: currentThrough, publisherCurrentThrough: currentThrough, currentThroughPublicLaw: marker[3], lawsInEffectOn,
    url: `${HOST}/view.xhtml?req=granuleid:USC-prelim-title${input.title}-section${input.section}&num=0&edition=prelim` });
  const extracted: ExtractedFile = { body, textStatus: complex ? 'partial' : 'ready', mediaType: 'text/plain',
    extraction: { parser: 'counsel-uscode-v1', notes: [...STATUTE_LIMITS, ...(complex ? ['Tables or graphics require inspection of the publisher original.'] : [])],
      sections: [{ label: `${input.title} USC ${input.section}`, start: 0, end: body.length }] } };
  return { publication, extracted };
}

export async function lookupStatute(store: WorkspaceStore, raw: StatuteLookup, signal: AbortSignal,
  options: { transport?: typeof fetch; now?: () => Date } = {}): Promise<AuthorityReceipt> {
  const input = StatuteLookup.parse(raw);
  return withPublisherLimit(signal, async combined => {
    const path = `/view.xhtml?req=granuleid:USC-prelim-title${input.title}-section${input.section}&num=0&edition=prelim`;
    const bytes = await getPublisherBytes(HOST, path, combined, options.transport ?? fetch);
    const { publication, extracted } = extractStatute(bytes, input);
    combined.throwIfAborted();
    const checkedAt = (options.now?.() ?? new Date()).toISOString();
    const { source, reused } = store.retainPublisherSnapshot({ name: `${input.title}-USC-${input.section}.html`,
      title: `${input.title} USC ${input.section}`, bytes, publication, extracted, retrievedAt: checkedAt });
    return { sourceId: source.id, revisionId: source.latest.id, title: source.latest.title, version: source.latest.number,
      publication: source.latest.provenance.publication!, retrievedAt: source.latest.provenance.retrievedAt!, checkedAt,
      reused, notes: extracted.extraction.notes };
  });
}
