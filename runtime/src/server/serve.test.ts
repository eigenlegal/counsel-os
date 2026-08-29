import { afterEach, describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { counselHome, runtimeFilePath, startServer, type RunningServer, type RuntimeFile } from './serve';

let running: RunningServer | undefined;

afterEach(async () => {
  await running?.stop();
  running = undefined;
});

function fixture(): { vault: string; pluginRoot: string; env: NodeJS.ProcessEnv } {
  const vault = mkdtempSync(join(tmpdir(), 'serve-vault-'));
  const pluginRoot = mkdtempSync(join(tmpdir(), 'serve-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  const home = mkdtempSync(join(tmpdir(), 'serve-home-'));
  return { vault, pluginRoot, env: { ...process.env, COUNSEL_OS_HOME: home } };
}

describe('startServer', () => {
  test('binds loopback, publishes runtime.json 0600, and cleans it up on stop', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({
      vault,
      pluginRoot,
      port: 0,
      env,
      registryFile: join(vault, 'no-such-providers.yaml'),
    });

    const file = runtimeFilePath(env);
    expect(counselHome(env)).toBe(env.COUNSEL_OS_HOME!);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).mode & 0o777).toBe(0o600);

    const contents = JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile;
    expect(contents.port).toBe(running.port);
    expect(contents.token).toBe(running.token);
    expect(contents.vault).toBe(vault);
    expect(contents.pid).toBe(process.pid);
    expect(Number.isNaN(Date.parse(contents.startedAt))).toBe(false);

    // The published token is the one the server actually accepts, and it is
    // required.
    const health = await fetch(`${running.url}/health`, {
      headers: { authorization: `Bearer ${contents.token}` },
    });
    expect(health.status).toBe(200);
    expect(((await health.json()) as { vault: string }).vault).toBe(vault);
    expect((await fetch(`${running.url}/health`)).status).toBe(401);

    await running.stop();
    running = undefined;
    expect(existsSync(file)).toBe(false);
  });

  test('COUNSEL_OS_HOME redirects the codex homes and the provider registry', async () => {
    const { vault, pluginRoot, env } = fixture();
    const home = env.COUNSEL_OS_HOME!;
    // No `registryFile`: this is the whole point — the DEFAULT registry path
    // has to follow the override, not the developer's real home.
    writeFileSync(join(home, 'providers.yaml'), 'default: ollama/gemma4:e4b\n', 'utf8');

    running = await startServer({ vault, pluginRoot, port: 0, env });

    // Each thread's Codex home holds a copy of `auth.json`, so it must land
    // under the home the operator pointed at, not under the real `$HOME`.
    const threadId = '11111111-2222-4333-8444-555555555555';
    expect(running.store.codexHomeFor(threadId)).toBe(join(home, 'codex', threadId));

    const health = await fetch(`${running.url}/health`, {
      headers: { authorization: `Bearer ${running.token}` },
    });
    expect(health.status).toBe(200);
    expect(((await health.json()) as { default: string }).default).toBe('ollama/gemma4:e4b');
  });

  test('a busy default port falls through to an OS-assigned one', async () => {
    const a = fixture();
    const b = fixture();
    // No explicit port: the first takes DEFAULT_PORT (unless something else
    // already holds it, in which case both fall through), the second must
    // land somewhere else rather than failing to start.
    const first = await startServer({ vault: a.vault, pluginRoot: a.pluginRoot, env: a.env, registryFile: join(a.vault, 'none.yaml') });
    const second = await startServer({ vault: b.vault, pluginRoot: b.pluginRoot, env: b.env, registryFile: join(b.vault, 'none.yaml') });
    try {
      expect(second.port).not.toBe(first.port);
      const health = await fetch(`${second.url}/health`, { headers: { authorization: `Bearer ${second.token}` } });
      expect(health.status).toBe(200);
    } finally {
      await first.stop();
      await second.stop();
    }
  });

  test('a runtime.json another process now owns survives stop()', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') });
    const file = runtimeFilePath(env);

    // A second `serve` took over the handshake: the file now points at that
    // server. This one shutting down must not delete the live server's file
    // and leave the adapter with nothing to read.
    const theirs = { port: 9999, token: 'theirs', vault, pid: process.pid + 1, startedAt: new Date().toISOString() };
    writeFileSync(file, JSON.stringify(theirs), 'utf8');

    await running.stop();
    running = undefined;
    expect(existsSync(file)).toBe(true);
    expect((JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile).token).toBe('theirs');
  });

  test('a leftover world-readable runtime.json ends up 0600', async () => {
    const { vault, pluginRoot, env } = fixture();
    const file = runtimeFilePath(env);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, '{"stale":true}', 'utf8');
    chmodSync(file, 0o644);

    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') });

    // writeFileSync's mode applies only on create, so an overwrite in place
    // would have kept 0644 and published the token to every local account.
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect((JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile).token).toBe(running.token);
  });

  test('a fresh token per process', async () => {
    const a = fixture();
    const b = fixture();
    const first = await startServer({ vault: a.vault, pluginRoot: a.pluginRoot, port: 0, env: a.env, registryFile: join(a.vault, 'none.yaml') });
    const second = await startServer({ vault: b.vault, pluginRoot: b.pluginRoot, port: 0, env: b.env, registryFile: join(b.vault, 'none.yaml') });
    try {
      expect(first.token).not.toBe(second.token);
      expect(first.port).not.toBe(second.port);
      // One server's token is no good at the other.
      const crossed = await fetch(`${second.url}/health`, { headers: { authorization: `Bearer ${first.token}` } });
      expect(crossed.status).toBe(401);
    } finally {
      await first.stop();
      await second.stop();
    }
  });
});
