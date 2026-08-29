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
