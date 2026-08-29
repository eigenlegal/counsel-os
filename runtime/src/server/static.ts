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

/**
 * The path a request names, as an absolute path to a real regular file
 * inside `distDir` — or `null` for everything else, which the caller turns
 * into the SPA shell or a 404 and never into a file.
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
export function resolveStaticFile(distDir: string, pathname: string): string | null {
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

  let realRoot: string;
  let real: string;
  try {
    realRoot = realpathSync(distDir);
    real = realpathSync(full);
  } catch {
    return null; // no dist directory, or no such file
  }
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return null;

  try {
    // Not a directory, not a fifo, not a device. `Bun.file` on a directory
    // fails at read time, which would be a 500 for a path a visitor chose.
    if (!statSync(real).isFile()) return null;
  } catch {
    return null;
  }
  return real;
}

function fileResponse(method: string, file: string, cache: string, type = contentType(file)): Response {
  const headers: Record<string, string> = { 'content-type': type, 'cache-control': cache };
  if (method === 'HEAD') {
    // A HEAD must carry the headers a GET would and no body at all, and
    // `content-length` is the one header the body would otherwise supply.
    return new Response(null, { headers: { ...headers, 'content-length': String(statSync(file).size) } });
  }
  return new Response(Bun.file(file), { headers });
}

function notFound(pathname: string): Response {
  return Response.json({ error: `no such file: ${pathname}` }, { status: 404 });
}

function placeholder(method: string): Response {
  const headers = { 'content-type': HTML, 'cache-control': SHELL_CACHE };
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
      const file = resolveStaticFile(distDir, pathname);
      if (file !== null) {
        const cache = pathname.startsWith(ASSETS_PREFIX) ? IMMUTABLE_CACHE : REVALIDATE_CACHE;
        return fileResponse(req.method, file, cache);
      }
      if (pathname.startsWith(ASSETS_PREFIX)) return notFound(pathname);

      const index = resolveStaticFile(distDir, '/index.html');
      if (index !== null) return fileResponse(req.method, index, SHELL_CACHE, HTML);
      return placeholder(req.method);
    } catch {
      // Every branch above is already guarded; this is the promise that a
      // static path never becomes a 500.
      return placeholder(req.method);
    }
  };
}
