/**
 * How the page gets its bearer token (spec §2, "Auth from the browser").
 *
 * `counsel-os serve` prints `http://127.0.0.1:<port>/#token=<token>`. The
 * fragment is the carrier because a fragment is the one part of a URL the
 * browser never sends to a server and no access log ever sees. On load the
 * page moves it into `sessionStorage` — per tab, gone when the tab closes —
 * and rewrites the fragment to the route it should have been, so a reload,
 * a copied URL, or a screenshot no longer carries the credential.
 */

export const TOKEN_KEY = 'counsel-os.token';

/** Thrown by `getToken` when no token was ever stored — the page turns this
 * into the spec §5 message rather than a failed request. */
export class TokenMissingError extends Error {
  readonly code = 'token_missing';
  constructor(message = 'no token in this tab') {
    super(message);
    this.name = 'TokenMissingError';
  }
}

/** The route a bare `#token=…` should leave behind. */
const HOME = '/';

export interface HashSplit {
  token: string | null;
  /** The fragment with the token removed, without its leading `#`. */
  rest: string;
}

/**
 * Splits `token=…` out of a fragment, keeping anything else in it.
 *
 * The printed URL is `#token=…` with nothing else, but the fragment is also
 * the router's, so a link someone bookmarks or a future `#/vault&token=…`
 * must not lose its route on the way through here.
 */
export function splitTokenFromHash(hash: string): HashSplit {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  let token: string | null = null;
  const kept: string[] = [];

  for (const part of raw.split('&')) {
    if (part === '') continue;
    if (part.startsWith('token=')) token = decode(part.slice('token='.length));
    else kept.push(part);
  }

  return { token, rest: kept.join('&') || HOME };
}

/**
 * `decodeURIComponent` throws on a malformed escape (`%`, `%zz`), and this
 * runs before React renders: a throw here is a blank page with the answer
 * only in the console. A fragment that will not decode is far more likely to
 * be a truncated paste than a real token, so the raw value is passed through
 * and the server gets to be the one that rejects it.
 */
function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function session(): Storage | null {
  // A tab with site data blocked throws on the property itself, not just on
  // `getItem`, so even reaching for it has to be guarded.
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Runs once, before React renders, so the first API call already has a
 * token. Returns the token it stored, or `null` when the fragment had none
 * (a reload, where the token is already in `sessionStorage`).
 *
 * The fragment is rewritten with `replaceState`: no history entry to go
 * "back" to the token, and no `hashchange` for the router to react to
 * before the app has even mounted.
 */
export function bootstrapToken(): string | null {
  const { token, rest } = splitTokenFromHash(globalThis.location?.hash ?? '');
  if (token === null || token === '') return null;

  const store = session();
  // A tab that cannot store it still gets to use it for this load: the
  // in-memory copy below is what every request reads first.
  if (store !== null) {
    try {
      store.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode, quota, blocked site data — the memory copy stands in */
    }
  }
  memoryToken = token;

  const { pathname, search } = globalThis.location;
  globalThis.history?.replaceState(null, '', `${pathname}${search}#${rest}`);
  return token;
}

/** Set by `bootstrapToken` so a tab with no usable `sessionStorage` still
 * works for the life of the page. */
let memoryToken: string | null = null;

/** The token, or `null` when this tab never received one. */
export function readToken(): string | null {
  if (memoryToken !== null) return memoryToken;
  try {
    return session()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The token, or `TokenMissingError`. Every API call goes through this. */
export function getToken(): string {
  const token = readToken();
  if (token === null || token === '') throw new TokenMissingError();
  return token;
}

/** Forgets the token — used by the tests, and by nothing in the app: a stale
 * token is reported, not cleared, so the page can say what went wrong. */
export function clearToken(): void {
  memoryToken = null;
  try {
    session()?.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
}
