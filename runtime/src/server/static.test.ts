import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStaticFile, serveStatic } from './static';

/** A `dist/` with the shape Vite produces: `index.html` plus `assets/`. */
function builtDist(): string {
  const dist = mkdtempSync(join(tmpdir(), 'static-dist-'));
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>counsel-os</title>\n', 'utf8');
  writeFileSync(join(dist, 'assets', 'app-abc123.js'), 'console.log(1)\n', 'utf8');
  writeFileSync(join(dist, 'assets', 'app-abc123.css'), 'body{}\n', 'utf8');
  return dist;
}

function get(path: string, method = 'GET'): Request {
  return new Request(`http://127.0.0.1:7431${path}`, { method });
}

describe('resolveStaticFile', () => {
  test('resolves a regular file under the dist root', () => {
    const dist = builtDist();
    expect(resolveStaticFile(dist, '/index.html')).toContain('index.html');
    expect(resolveStaticFile(dist, '/assets/app-abc123.js')).toContain('app-abc123.js');
  });

  test('refuses anything that is not a regular file inside the root', () => {
    const dist = builtDist();
    const outside = mkdtempSync(join(tmpdir(), 'static-outside-'));
    writeFileSync(join(outside, 'secret.txt'), 'SECRET\n', 'utf8');
    // A symlink inside dist pointing out of it: the spelling is clean and the
    // filesystem is not. This is the check `relative()` alone cannot make.
    symlinkSync(join(outside, 'secret.txt'), join(dist, 'escape.txt'));

    expect(resolveStaticFile(dist, '/escape.txt')).toBeNull();
    expect(resolveStaticFile(dist, '/../../etc/passwd')).toBeNull();
    expect(resolveStaticFile(dist, '/assets')).toBeNull(); // a directory
    expect(resolveStaticFile(dist, '/')).toBeNull();
    expect(resolveStaticFile(dist, '/missing.js')).toBeNull();
    expect(resolveStaticFile(dist, '/%2e%2e%2f%2e%2e%2fetc%2fpasswd')).toBeNull();
    expect(resolveStaticFile(dist, '/index.html%00.js')).toBeNull();
  });

  test('a dist directory that does not exist resolves nothing', () => {
    expect(resolveStaticFile(join(tmpdir(), 'static-no-such-dist'), '/index.html')).toBeNull();
  });
});

describe('serveStatic', () => {
  test('serves index.html for / with no token and no caching', async () => {
    const res = await serveStatic(builtDist())(get('/'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers.get('content-type')).toContain('text/html');
    expect(res!.headers.get('cache-control')).toBe('no-store');
    expect(await res!.text()).toContain('counsel-os');
  });

  test('serves a built asset with an immutable cache header', async () => {
    const serve = serveStatic(builtDist());
    const js = (await serve(get('/assets/app-abc123.js')))!;
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('text/javascript');
    expect(js.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await js.text()).toBe('console.log(1)\n');

    const css = (await serve(get('/assets/app-abc123.css')))!;
    expect(css.headers.get('content-type')).toContain('text/css');
  });

  test('a missing asset is a 404, not the SPA shell', async () => {
    const res = (await serveStatic(builtDist())(get('/assets/gone.js')))!;
    expect(res.status).toBe(404);
    // The shell would be served as HTML and a script tag would then execute
    // it — an asset miss has to fail as a miss.
    expect(res.headers.get('content-type')).not.toContain('text/html');
  });

  test('an escaping or reserved path falls back to the shell and never leaks a file', async () => {
    const dist = builtDist();
    const outside = mkdtempSync(join(tmpdir(), 'static-outside-'));
    writeFileSync(join(outside, 'secret.txt'), 'SECRET\n', 'utf8');
    symlinkSync(join(outside, 'secret.txt'), join(dist, 'escape.txt'));
    const serve = serveStatic(dist);

    for (const path of ['/../etc/passwd', '/.counsel/x', '/escape.txt', '/%2e%2e%2fetc%2fpasswd']) {
      const res = (await serve(get(path)))!;
      const body = await res.text();
      expect(res.status).toBe(200);
      expect(body).toContain('counsel-os');
      expect(body).not.toContain('SECRET');
      expect(body).not.toContain('root:');
    }
  });

  test('an unbuilt dist answers with the placeholder page, not a 404', async () => {
    const res = (await serveStatic(join(tmpdir(), 'static-no-such-dist'))(get('/')))!;
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('bun run ui:build');
  });

  test('HEAD gets the headers and no body', async () => {
    const res = (await serveStatic(builtDist())(get('/assets/app-abc123.js', 'HEAD')))!;
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe(String('console.log(1)\n'.length));
    expect(await res.text()).toBe('');
  });

  test('a write method is not static’s business', async () => {
    const serve = serveStatic(builtDist());
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect(await serve(get('/', method))).toBeNull();
    }
  });
});

describe('the cache rules follow the resolved path, not the spelling', () => {
  test('an encoded escape out of /assets/ does not get the immutable header', async () => {
    const res = (await serveStatic(builtDist())(get('/assets/%2e%2e%2findex.html')))!;
    // Decoded, this is `/assets/../index.html`, which resolves to the shell.
    // Keying the header on the raw pathname would cache the shell for a year
    // and strand the browser on a build whose assets are gone.
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).not.toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('counsel-os');
  });

  test('an encoded spelling of /assets/ still gets the assets-miss 404', async () => {
    const res = (await serveStatic(builtDist())(get('/%61ssets/gone.js')))!;
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).not.toContain('text/html');
  });

  test('index.html is no-store whether it is asked for by name or as the shell', async () => {
    const serve = serveStatic(builtDist());
    for (const path of ['/', '/index.html', '/a/client/route']) {
      const res = (await serve(get(path)))!;
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('content-type')).toContain('text/html');
    }
  });

  test('every static answer says nosniff', async () => {
    const dist = builtDist();
    const serve = serveStatic(dist);
    for (const path of ['/', '/index.html', '/assets/app-abc123.js', '/assets/gone.js', '/a/route']) {
      const res = (await serve(get(path)))!;
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    }
    // The placeholder is a response too, and it is the one served before any
    // build has run.
    const placeholder = (await serveStatic(join(tmpdir(), 'static-no-such-dist'))(get('/')))!;
    expect(placeholder.headers.get('x-content-type-options')).toBe('nosniff');
    // And a HEAD, which builds its headers on a separate path.
    const head = (await serve(get('/assets/app-abc123.js', 'HEAD')))!;
    expect(head.headers.get('x-content-type-options')).toBe('nosniff');
  });
});


describe('serveStatic over an embedded source (the compiled binary)', () => {
  const { resolveEmbeddedTarget } = require('./static') as typeof import('./static');

  function embedded(): import('./static').StaticSource {
    const dist = builtDist();
    return { kind: 'embedded', files: { 'index.html': join(dist, 'index.html'), 'assets/app-abc123.js': join(dist, 'assets', 'app-abc123.js'), 'assets/app-abc123.css': join(dist, 'assets', 'app-abc123.css') } };
  }

  test('serves an embedded asset immutable, the shell no-store, and a client route falls back to the shell', async () => {
    const handler = serveStatic(embedded());
    const js = (await handler(get('/assets/app-abc123.js')))!;
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('javascript');
    expect(js.headers.get('cache-control')).toContain('immutable');
    expect(await js.text()).toBe('console.log(1)\n');

    const shell = (await handler(get('/')))!;
    expect(shell.headers.get('cache-control')).toBe('no-store');
    expect(await shell.text()).toContain('counsel-os');

    const route = (await handler(get('/vault')))!;
    expect(await route.text()).toContain('counsel-os');
  });

  test('a missing asset is a 404, a spelled escape or traversal never matches a key', async () => {
    const source = embedded();
    const handler = serveStatic(source);
    expect((await handler(get('/assets/gone.js')))!.status).toBe(404);
    // A spelled escape collapses to the shell, exactly as the directory handler does: it is not an asset, so it never gets immutable caching.
    expect(resolveEmbeddedTarget(source, '/assets/%2e%2e%2findex.html')?.rel).toBe('index.html');
    expect(resolveEmbeddedTarget(source, '/../index.html')?.rel).toBe('index.html');
    expect(resolveEmbeddedTarget(source, '/%00')).toBeNull();
    expect(resolveEmbeddedTarget(source, '/assets')?.file ?? null).toBeNull();
  });

  test('HEAD carries the headers and the length, no body', async () => {
    const handler = serveStatic(embedded());
    const head = (await handler(get('/assets/app-abc123.css', 'HEAD')))!;
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe('7');
    expect(await head.text()).toBe('');
  });
});
