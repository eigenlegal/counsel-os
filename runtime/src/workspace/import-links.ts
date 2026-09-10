import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { Marked } from 'marked';
import { z } from 'zod';
import type { ImportChoice, ImportMatterReference } from './import-types';

export const ImportLinkQuery = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0),
  view: z.enum(['all', 'sharing', 'unresolved']).default('all') }).strict();
export const ImportLinkApply = z.object({ expectedRevisionId: z.string().uuid(), expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
  linkIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(100).refine(ids => new Set(ids).size === ids.length),
  confirmAccessChanges: z.literal(true) }).strict();
export const importLinkDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export type LinkFile = { id: string; path: string; status: string; choice: ImportChoice };
type Reference = { href: string; quote: string; form: 'markdown' | 'wiki' };
export type ResolvedImportLink = Reference & { id: string; fromId: string; fromPath: string;
  status: 'matched' | 'missing' | 'ambiguous' | 'excluded' | 'outside';
  targetId: string | null; targetPath: string | null; candidates: string[]; candidateCount: number };
export type ImportLinkItem = ResolvedImportLink & { matter: (ImportMatterReference & { title: string }) | null;
  canShare: boolean; alreadyShared: boolean; note: string };
export type ImportLinkPreview = { revisionId: string; expectedVersion: string; offset: number; total: number;
  scannedFiles: number; omittedFiles: number; truncated: boolean; matched: number; unresolved: number; shareable: number;
  items: ImportLinkItem[] };
const markdown = new Marked();

/** Explicit links only. Code/HTML are not instructions or references to traverse. */
export function noteReferences(body: string): { items: Reference[]; truncated: boolean } {
  const items: Reference[] = [], seen = new Set<string>();
  let truncated = false;
  const add = (item: Reference) => {
    if (!item.href || item.href.startsWith('#') || !body.includes(item.quote)) return;
    if (item.href.length > 2000 || item.quote.length > 2500) { truncated = true; return; }
    const key = `${item.form}:${item.href}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (items.length >= 100) { truncated = true; return; }
    items.push(item);
  };
  markdown.walkTokens(markdown.lexer(body), token => {
    if (token.type === 'link' || token.type === 'image') add({ href: token.href, quote: token.raw, form: 'markdown' });
    if (token.type === 'text' && !('tokens' in token && token.tokens))
      for (const match of token.raw.matchAll(/!?\[\[([^\]\r\n]+)\]\]/g))
        add({ href: match[1]!.split('|')[0]!.trim(), quote: match[0], form: 'wiki' });
  });
  return { items, truncated };
}

/** Inventory-only resolver: never reads a filesystem path, fetches a URL, or
 * searches outside the exact files the user supplied in this batch. */
export function importLinkResolver(files: LinkFile[]) {
  const exact = new Map<string, LinkFile[]>(), folded = new Map<string, LinkFile[]>();
  const suffix = new Map<string, LinkFile[]>();
  const insert = (map: Map<string, LinkFile[]>, key: string, file: LinkFile) => {
    const values = map.get(key) ?? []; if (!values.some(value => value.id === file.id)) values.push(file); map.set(key, values);
  };
  for (const file of files) {
    const aliases = [file.path, ...(/\.md$/i.test(file.path) ? [file.path.slice(0, -3)] : [])];
    for (const path of aliases) {
      insert(exact, path, file); insert(folded, path.toLowerCase(), file);
      const parts = path.split('/');
      for (let i = 0; i < parts.length; i++) insert(suffix, parts.slice(i).join('/').toLowerCase(), file);
    }
  }
  return (from: LinkFile, reference: Reference): ResolvedImportLink => {
    const base = { ...reference, id: importLinkDigest([from.id, reference.form, reference.href]), fromId: from.id, fromPath: from.path,
      targetId: null, targetPath: null, candidates: [] as string[], candidateCount: 0 };
    let target: string;
    try { target = decodeURIComponent(reference.href.split(/[?#]/)[0]!).replace(/\\/g, '/').trim(); }
    catch { return { ...base, status: 'outside' }; }
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/|~)/i.test(target) || /[\x00-\x1f\x7f]/.test(target)) return { ...base, status: 'outside' };
    const relative = posix.normalize(posix.join(posix.dirname(from.path), target));
    const relativeSyntax = /^\.{1,2}(\/|$)/.test(target);
    if (relativeSyntax && (relative === '..' || relative.startsWith('../'))) return { ...base, status: 'outside' };
    const lookup = (path: string) => exact.get(path) ?? folded.get(path.toLowerCase()) ?? [];
    let candidates = lookup(relative);
    if (!candidates.length && !relativeSyntax && reference.form === 'wiki') {
      candidates = lookup(target);
      if (!candidates.length) candidates = suffix.get(target.toLowerCase()) ?? [];
    }
    if (!candidates.length) return { ...base, status: 'missing' };
    if (candidates.length !== 1) return { ...base, status: 'ambiguous', candidates: candidates.slice(0, 10).map(file => file.path), candidateCount: candidates.length };
    const match = candidates[0]!;
    return { ...base, status: match.status !== 'ready' || ['skip', 'profile'].includes(match.choice.destination) ? 'excluded' : 'matched',
      targetId: match.id, targetPath: match.path, candidateCount: 1 };
  };
}

export const sameImportMatter = (a: ImportMatterReference, b: ImportMatterReference) =>
  !!a.matterId ? a.matterId === b.matterId : !b.matterId && a.matterTitle === b.matterTitle;
