import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { repoContentSource } from '../content/repo';
import type { Location, ProviderProbe } from '../setup/detect';
import type { SetupResult } from '../setup/run';
import { API_PREFIXES, type App } from './routes';
import { createSetupApp, SETUP_REQUIRED } from './setup-routes';

const REPO = resolve(import.meta.dir, '../../..');
const TOKEN = 'setup-test-token';

function tree(): { home: string; dist: string; base: string } {
  const base = mkdtempSync(join(tmpdir(), 'setup-app-'));
  const dist = join(base, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>counsel-os</title>');
  return { home: join(base, 'home'), dist, base };
}

const locations: Location[] = [{ path: '/h/Documents/Counsel OS', kind: 'new', exists: false, writable: true, suggested: true }];
const providers: ProviderProbe[] = [
  { id: 'claude-sub/claude-opus-5', vendor: 'Claude', model: 'Opus 5', connection: 'subscription', installed: true, signedIn: true, usable: true, state: 'signed in' },
];

function app(onSetup: (vault: string, result: SetupResult) => void | Promise<void> = () => {}, extra: Partial<Parameters<typeof createSetupApp>[0]> = {}): { app: App; home: string; base: string } {
  const { home, dist, base } = tree();
  const built = createSetupApp({
    token: TOKEN,
    tenant: 'default',
    distDir: dist,
    content: repoContentSource(REPO),
    home,
    pluginRoot: REPO,
    env: {},
    detect: () => locations,
    probe: async () => providers,
    onSetup,
    ...extra,
  });
  return { app: built, home, base };
}

function call(a: App, method: string, path: string, opts: { body?: unknown; token?: string | null } = {}): Promise<Response> {
  const token = opts.token === undefined ? TOKEN : opts.token;
  const headers: Record<string, string> = {};
  if (token !== null) headers['authorization'] = `Bearer ${token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  return a(new Request(`http://127.0.0.1:7431${path}`, { method, headers, ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }) }));
}

describe('the setup app', () => {
  test('health says setup, the page is served, the token is still required', async () => {
    const { app: a } = app();
    const health = await call(a, 'GET', '/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ setup: true, vault: null, tenant: 'default', providers: [], default: null, stepTimeoutMs: 600_000 });
    expect((await call(a, 'GET', '/health', { token: null })).status).toBe(401);
    expect((await call(a, 'GET', '/setup/detect', { token: 'wrong' })).status).toBe(401);
    const page = await call(a, 'GET', '/', { token: null });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('counsel-os');
  });

  test('every vault-backed route is a 409, not a guess', async () => {
    const { app: a } = app();
    for (const [method, path] of [['GET', '/threads'], ['POST', '/threads'], ['GET', '/vault/list'], ['GET', '/vault/overview'], ['GET', '/settings'], ['GET', '/proposals?status=pending'], ['GET', '/docket'], ['GET', '/runs']] as const) {
      const res = await call(a, method, path, method === 'POST' ? { body: {} } : {});
      expect({ method, path, status: res.status }).toEqual({ method, path, status: 409 });
      expect(await res.json()).toEqual(SETUP_REQUIRED);
    }
    expect((await call(a, 'GET', '/setup/nope')).status).toBe(404);
  });

  test('the probes answer through the injected functions', async () => {
    const { app: a } = app();
    expect(await (await call(a, 'GET', '/setup/detect')).json()).toEqual({ locations });
    expect(await (await call(a, 'GET', '/setup/providers')).json()).toEqual({ providers });
  });

  test('POST /setup: a bad body is a 400 with issues; a refused vault is a 400 with the reason', async () => {
    const { app: a } = app();
    const bad = await call(a, 'POST', '/setup', { body: { vault: 'relative', identity: { name: '', role: 'partner' } } });
    expect(bad.status).toBe(400);
    const issues = ((await bad.json()) as { issues: Array<{ path: unknown[] }> }).issues.map(i => i.path.join('.'));
    expect(issues).toContain('vault');
    expect(issues).toContain('identity.name');
    expect(issues).toContain('identity.role');
    expect((await call(a, 'POST', '/setup', { body: 'not json' })).status).toBe(400);

    const refused = await call(a, 'POST', '/setup', { body: { vault: join(REPO, 'x'), identity: { name: 'J', role: 'solo' }, git: false } });
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({ reason: 'inside-plugin' });
  });

  test('POST /setup seeds, hands the vault to onSetup, and answers with the result', async () => {
    const switched: string[] = [];
    const { app: a, home, base } = app(vault => {
      switched.push(vault);
    });
    const vault = join(base, 'Counsel OS');
    const res = await call(a, 'POST', '/setup', { body: { vault, identity: { name: 'Jack Wang', role: 'solo', organization: 'Eigen Legal', jurisdiction: 'MA' }, practice: 'contracts', git: false } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { vault: string; result: SetupResult };
    expect(body.vault).toBe(vault);
    expect(body.result.groups.law.written).toBe(196);
    expect(switched).toEqual([vault]);
    expect(existsSync(join(vault, 'config.md'))).toBe(true);
    expect(readFileSync(join(home, 'legal-root'), 'utf8')).toBe(vault);
  });

  test('a switch that throws is a 400 and the setup app keeps serving', async () => {
    const { app: a, base } = app(() => {
      throw new Error('--dist overlaps the vault');
    });
    const res = await call(a, 'POST', '/setup', { body: { vault: join(base, 'v'), identity: { name: 'J', role: 'solo' }, git: false } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'switch-failed', error: '--dist overlaps the vault' });
    expect((await call(a, 'GET', '/health')).status).toBe(200);
  });
});

describe('API_PREFIXES', () => {
  test('reserves setup, so the setup routes are never served as static', () => {
    expect(API_PREFIXES).toContain('setup');
  });
});
