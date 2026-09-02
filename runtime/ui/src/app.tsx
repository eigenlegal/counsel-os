import { Shell } from './v2/Shell';

/** The four surfaces the fragment routes between (redesign spec §3.1). */
export type Route = 'home' | 'chat' | 'vault' | 'models' | 'settings';

/** The fragment split into the part that picks a surface and the part that
 * parameterizes it — `#/vault?path=matters/acme/notes.md`. The query lives
 * in the FRAGMENT, not the URL's own query string: the token lives there
 * too, and neither is anything the server should ever see. */
export function parseHash(hash: string): { route: Route; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const params = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
  if (path === '/chat' || path.startsWith('/chat/')) return { route: 'chat', params };
  if (path === '/vault' || path.startsWith('/vault/')) return { route: 'vault', params };
  if (path === '/models' || path.startsWith('/models/')) return { route: 'models', params };
  if (path === '/settings' || path.startsWith('/settings/')) return { route: 'settings', params };
  // `#/` is Home now (spec §3.1) — and so is anything unknown: the landing
  // page is the safe place to fall.
  return { route: 'home', params };
}

export function routeFromHash(hash: string): Route {
  return parseHash(hash).route;
}

/** The thread `#/chat?thread=…` names, or `null` for a draft/bare chat. */
export function threadFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'chat') return null;
  const id = params.get('thread');
  return id === null || id === '' ? null : id;
}

/** The docket's anchor: `#/chat?thread=…&proposal=…` scrolls the thread to
 * that proposal slip (spec §3.2 "Review →"). */
export function proposalFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'chat') return null;
  const id = params.get('proposal');
  return id === null || id === '' ? null : id;
}

/** The vault file the fragment names, or `null` for "the tree, nothing
 * open". */
export function vaultPathFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'vault') return null;
  const path = params.get('path');
  return path === null || path === '' ? null : path;
}

/**
 * The page. The workbench is the only design — the classic one was removed
 * on 2026-08-30 by founder decision, and with it the `ui` flag that used to
 * choose between them.
 */
export function Root(): JSX.Element {
  return <Shell />;
}
