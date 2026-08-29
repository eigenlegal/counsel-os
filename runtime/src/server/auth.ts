import { createHash, timingSafeEqual } from 'node:crypto';

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

/** True when the request carries the server's bearer token. */
export function isAuthorized(req: Request, expected: string): boolean {
  const presented = bearerToken(req);
  return presented !== null && tokensMatch(presented, expected);
}
