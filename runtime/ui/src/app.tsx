import { Shell } from './v2/Shell';

/** The three surfaces the fragment routes between. */
type Route = 'chat' | 'vault' | 'settings';

/** Spec §5, word for word: the page cannot fix this itself — the token is
 * printed by the process that owns it. */
export const TOKEN_MESSAGE = 'token missing or stale — restart `counsel-os serve` and open the printed URL';

/** The fragment split into the part that picks a surface and the part that
 * parameterizes it — `#/vault?path=matters/acme/notes.md`. The query lives
 * in the FRAGMENT, not the URL's own query string: the token lives there
 * too, and neither is anything the server should ever see. */
export function parseHash(hash: string): { route: Route; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const params = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
  if (path === '/vault' || path.startsWith('/vault/')) return { route: 'vault', params };
  if (path === '/settings' || path.startsWith('/settings/')) return { route: 'settings', params };
  return { route: 'chat', params };
}

export function routeFromHash(hash: string): Route {
  return parseHash(hash).route;
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
