import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * How a request proves it may use the API.
 *
 * THE THREAT MODEL. The runtime listens on 127.0.0.1 only, so the attacker
 * is not on the network: it is a web page in the same browser (any site
 * the operator has open) or another local process. A page cannot read a
 * loopback response without a credential it does not have — that is what
 * the bearer token is for — and the token never travels in a URL that a
 * server sees (the printed link carries it in the fragment).
 *
 * TWO CREDENTIALS, ONE SECRET. A request is accepted with either
 *   1. `Authorization: Bearer <token>` — what the page sends after reading
 *      the printed link once, and what the plugin adapter and tests send; or
 *   2. the `counsel_session` cookie, whose VALUE IS the same token. The
 *      server sets it on the first bearer-authenticated response, so the
 *      browser remembers the sign-in across tabs and across restarts of the
 *      runtime (the token itself is per install now, not per process).
 *
 * WHY A COOKIE IS SAFE HERE, AND WHY THAT IS NOT ENOUGH. The cookie is
 * `HttpOnly` (no script can read it) and `SameSite=Strict` (the browser
 * attaches it only to requests whose SITE is the cookie's). But "site" is
 * the registrable domain or the IP — it IGNORES THE PORT. A page served by
 * some other local tool on 127.0.0.1:8080 is same-SITE with this runtime,
 * so a Strict cookie WOULD ride along on its cross-ORIGIN fetch. That is
 * the one hole, and `cookieAllowedForOrigin` closes it: a cookie may
 * authenticate a request only when the browser says the request came from
 * this very origin (or from the address bar).
 *
 * WHAT BROWSERS SEND. Every current browser adds `Sec-Fetch-Site` to every
 * request: `same-origin` (this page), `same-site` (another port or
 * subdomain), `cross-site`, or `none` (the user typed or clicked a bookmark).
 * Only the first and last may use the cookie. `Origin` is sent on every
 * cross-origin request and on every non-GET; when present it must be this
 * server's own `http://<host>` exactly — a null origin (a sandboxed frame)
 * fails that test. A client that sends neither header is not a browser;
 * to hold the cookie at all it already holds the secret, so it is accepted.
 *
 * NO `Secure` FLAG: the runtime speaks plain http on loopback (browsers
 * treat 127.0.0.1 as a secure context, but a `Secure` cookie is not
 * portable across them on http). The cookie never leaves the machine.
 *
 * ROTATION. `serve --new-token` mints a fresh secret; every cookie holding
 * the old one is then a wrong token and gets a 401, which is the page's cue
 * to show the session-lost screen. `POST /session/clear` drops the cookie
 * from one browser without rotating.
 */

export const SESSION_COOKIE = 'counsel_session';

/** A year: the sign-in should outlive a browser restart, not just a tab. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Pulls the bearer credential out of an `Authorization` header. Anything
 * else — no header, another scheme, an empty credential — is `null`, which
 * the caller treats exactly like a wrong token.
 */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer[ \t]+(\S+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

/** The session cookie's value, or `null` when the request carries none. */
export function sessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return value === '' ? null : value;
  }
  return null;
}

/**
 * Constant-time token comparison. Both sides are hashed first so the compare
 * is over two fixed-length digests: `timingSafeEqual` throws on a length
 * mismatch, and short-circuiting on length would leak the token's length to
 * anyone who can time the loopback socket.
 */
export function tokensMatch(presented: string, expected: string): boolean {
  const digest = (s: string): Buffer => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(digest(presented), digest(expected));
}

/**
 * Whether the browser vouches that this request came from this origin (or
 * the address bar) — the condition under which a cookie may authenticate
 * it. See the module comment for why `SameSite=Strict` alone is not that.
 */
export function cookieAllowedForOrigin(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.get('origin');
  if (origin !== null) {
    const host = req.headers.get('host');
    if (host === null) return false;
    if (origin.toLowerCase() !== `http://${host.toLowerCase()}`) return false;
  }
  return true;
}

export type AuthVia = 'bearer' | 'cookie';

/**
 * Which credential authorized the request, or `null`. The bearer is checked
 * first: a request carrying a WRONG bearer and a right cookie is refused —
 * a client that names a credential must be right about it.
 */
export function authorize(req: Request, expected: string): AuthVia | null {
  const presented = bearerToken(req);
  if (presented !== null) return tokensMatch(presented, expected) ? 'bearer' : null;
  const cookie = sessionCookie(req);
  if (cookie !== null && cookieAllowedForOrigin(req) && tokensMatch(cookie, expected)) return 'cookie';
  return null;
}

/** True when the request carries the server's token, either way. */
export function isAuthorized(req: Request, expected: string): boolean {
  return authorize(req, expected) !== null;
}

/** The `Set-Cookie` value that signs this browser in. */
export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Strict`;
}

/** The `Set-Cookie` value that signs this browser out. */
export const CLEAR_SESSION_COOKIE = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;

/**
 * The same response with the sign-in cookie attached. A new `Response` is
 * built rather than the headers mutated: `Response.json` hands back
 * immutable headers, and a streaming body (the step's SSE) passes through
 * untouched.
 */
export function withSessionCookie(res: Response, token: string): Response {
  const headers = new Headers(res.headers);
  headers.append('set-cookie', sessionCookieHeader(token));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
