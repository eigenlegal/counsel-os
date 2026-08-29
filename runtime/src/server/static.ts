import { realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Serving the built UI (spec §4.2). This runs BEFORE the bearer check, for
 * every non-API path, because the token reaches the page in the URL fragment
 * — which the browser never sends — so the shell has to load with no
 * credential at all. That makes this file the one place in the server where
 * an unauthenticated caller picks the path, and every rule below exists for
 * that reason: nothing outside `distDir` is ever readable, and nothing but a
 * regular file is ever served.
 */

/** Hashed build output. Vite fingerprints these names, so they are immutable
 * for as long as they exist, and a miss here is a miss rather than a route. */
export const ASSETS_PREFIX = '/assets/';

/** `ASSETS_PREFIX` as a `StaticTarget.rel` prefix (no leading slash). */
const ASSETS_DIR = 'assets/';

/** The SPA shell. Served for `/` and for every client-side route, and
 * `no-store` however it is asked for — it names the build's hashed assets,
 * so a cached copy points at files that may already be gone. */
const INDEX = 'index.html';

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/** The shell carries the app's version in its script tags, so a cached copy
 * is a stale app pointing at assets that may be gone. */
const SHELL_CACHE = 'no-store';

/** Everything else in `dist/` (a favicon, a manifest): cacheable, but only
 * after the server says it is still current. */
const REVALIDATE_CACHE = 'public, max-age=0, must-revalidate';

/**
 * The types the built UI actually emits. An unknown extension deliberately
 * falls to `application/octet-stream`: a file this list does not name is a
 * download, never something the browser is invited to run or render.
 */
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const HTML = CONTENT_TYPES['.html']!;

/** What `/` answers with before anyone has run the UI build. A 200, not an
 * error: the runtime is up and the API works: it is the page that is
 * missing, and the page says so itself. */
export const PLACEHOLDER_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>counsel-os</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:4rem auto;max-width:34rem;padding:0 1rem}
code{background:#eee;padding:.1em .35em;border-radius:3px}</style></head>
<body>
<h1>UI not built</h1>
<p>The counsel-os runtime is running, but the web UI has not been built.</p>
<p>Run <code>bun run ui:build</code>, then reload this page.</p>
</body>
</html>
`;

function contentType(file: string): string {
  return CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** What a request path resolves to inside `distDir`. `rel` is the path
 * RELATIVE to the dist root, after decoding and after `.` / `..` are
 * collapsed — the only spelling of the request that can safely be compared
 * against `assets/`, since `/assets/%2e%2e%2findex.html` starts with
 * `/assets/` and does not live there. `file` is the absolute real path when
 * it names a regular file, and `null` when it names nothing. */
export interface StaticTarget {
  rel: string;
  file: string | null;
}

/**
 * The path a request names, as a `StaticTarget` inside `distDir` — or `null`
 * when the path cannot be inside it at all, which the caller turns into the
 * SPA shell and never into a file.
 *
 * Three checks, and all three are needed:
 *
 * 1. Decoding first. `%2e%2e%2f` is `../`, and a check run against the raw
 *    pathname would pass it straight through to `resolve`, which decodes
 *    nothing. A NUL is rejected outright — it truncates the path for some
 *    syscalls and not for the checks above them.
 * 2. The lexical check (`relative`), which proves the SPELLING stays inside
 *    the root.
 * 3. `realpath`, which proves the FILESYSTEM does too. A symlink in `dist/`
 *    pointing at `~/.ssh/id_rsa` spells clean and reads a key, and `dist/`
 *    is a build directory — whatever the bundler drops there is served.
 *
 * Mirrors `FsVaultStore.abs` / `assertInsideRealRoot`; the difference is
 * that nothing here is ever created, so only paths that already exist matter
 * and there is no "nearest existing ancestor" case.
 */
export function resolveStaticTarget(distDir: string, pathname: string): StaticTarget | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // a malformed escape is not a path
  }
  if (decoded.includes('\0')) return null;
  // Forward slashes only, like vault paths: on a Windows host `resolve` and
  // `relative` read a backslash as a separator that the checks never saw.
  if (decoded.includes('\\')) return null;

  const rel = decoded.replace(/^\/+/, '');
  if (rel === '') return null; // `/` is the shell's job, not a file's

  const full = resolve(distDir, rel);
  const inside = relative(distDir, full);
  if (inside === '' || isAbsolute(inside) || inside.split(sep)[0] === '..') return null;
  // The caller keys its cache rules on this, so it is always the collapsed
  // path and always forward-slashed, whatever the host separator is.
  const target: StaticTarget = { rel: inside.split(sep).join('/'), file: null };

  let realRoot: string;
  let real: string;
  try {
    realRoot = realpathSync(distDir);
    real = realpathSync(full);
  } catch {
    return target; // no dist directory, or no such file: a real path, no file
  }
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return null;

  try {
    // Not a directory, not a fifo, not a device. `Bun.file` on a directory
    // fails at read time, which would be a 500 for a path a visitor chose.
    if (!statSync(real).isFile()) return target;
  } catch {
    return target;
  }
  return { rel: target.rel, file: real };
}

/** The resolved regular file a request names, or `null`. The whole of the
 * containment decision; `resolveStaticTarget` adds the relative path the
 * cache rules need. */
export function resolveStaticFile(distDir: string, pathname: string): string | null {
  return resolveStaticTarget(distDir, pathname)?.file ?? null;
}

/**
 * `nosniff` on every static answer. Content-type sniffing is what turns a
 * file this server labelled `application/octet-stream` into a script the
 * browser runs — and `dist/` is build output, so its contents are only as
 * trustworthy as the build that wrote them.
 */
const SECURITY_HEADERS: Record<string, string> = { 'x-content-type-options': 'nosniff' };

function fileResponse(method: string, file: string, cache: string, type = contentType(file)): Response {
  const headers: Record<string, string> = { ...SECURITY_HEADERS, 'content-type': type, 'cache-control': cache };
  if (method === 'HEAD') {
    // A HEAD must carry the headers a GET would and no body at all, and
    // `content-length` is the one header the body would otherwise supply.
    return new Response(null, { headers: { ...headers, 'content-length': String(statSync(file).size) } });
  }
  return new Response(Bun.file(file), { headers });
}

function notFound(pathname: string): Response {
  return Response.json({ error: `no such file: ${pathname}` }, { status: 404, headers: SECURITY_HEADERS });
}

function placeholder(method: string): Response {
  const headers = { ...SECURITY_HEADERS, 'content-type': HTML, 'cache-control': SHELL_CACHE };
  if (method === 'HEAD') {
    return new Response(null, { headers: { ...headers, 'content-length': String(Buffer.byteLength(PLACEHOLDER_HTML)) } });
  }
  return new Response(PLACEHOLDER_HTML, { headers });
}

/**
 * A handler for the built UI under `distDir`.
 *
 * `null` means "not mine": a method other than `GET`/`HEAD`, which the
 * caller answers with its own 404 rather than the shell. Nothing else
 * returns `null`, and nothing throws — a visitor must not be able to turn a
 * path into a 500.
 *
 * A path that resolves to no file is the SPA fallback (`index.html`), which
 * is how a client-side route survives a reload. The one exception is
 * `/assets/*`: those names are build output, and answering a missing script
 * with HTML would hand the browser a page to execute.
 */
export function serveStatic(distDir: string): (req: Request) => Promise<Response | null> {
  return async function staticHandler(req: Request): Promise<Response | null> {
    if (req.method !== 'GET' && req.method !== 'HEAD') return null;

    let pathname = '/';
    try {
      pathname = new URL(req.url).pathname;
    } catch {
      /* an unparsable URL gets the shell, like any other unknown path */
    }

    try {
      const target = resolveStaticTarget(distDir, pathname);
      // Both rules below key on the RESOLVED relative path, never on the
      // request's spelling: `/assets/%2e%2e%2findex.html` starts with
      // `/assets/` and is the shell (a year of immutable caching would
      // strand the browser on a dead build), and `/%61ssets/gone.js` does
      // not start with it and is an asset miss.
      const isAsset = target !== null && target.rel.startsWith(ASSETS_DIR);
      if (target?.file != null) {
        const cache = isAsset ? IMMUTABLE_CACHE : target.rel === INDEX ? SHELL_CACHE : REVALIDATE_CACHE;
        return fileResponse(req.method, target.file, cache);
      }
      if (isAsset) return notFound(pathname);

      const index = resolveStaticFile(distDir, `/${INDEX}`);
      if (index !== null) return fileResponse(req.method, index, SHELL_CACHE, HTML);
      return placeholder(req.method);
    } catch {
      // Every branch above is already guarded; this is the promise that a
      // static path never becomes a 500.
      return placeholder(req.method);
    }
  };
}
