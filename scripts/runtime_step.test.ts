import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider } from '../runtime/src/core/fake-provider';
import { Router } from '../runtime/src/router/router';
import { createApp, type App, type ServerDeps } from '../runtime/src/server/routes';
import { ThreadStore } from '../runtime/src/threads/store';
import { FsVaultStore } from '../runtime/src/vault/fs-store';

const TOKEN = 'test-token-0123456789';
const SCRIPT = join(import.meta.dir, 'runtime_step.sh');

type BunServer = ReturnType<typeof Bun.serve>;

let servers: BunServer[] = [];

afterEach(() => {
  for (const server of servers) server.stop(true);
  servers = [];
});

/** Serves `createApp(...)` on a random loopback port — no `startServer`, so
 * no live provider ever gets a chance to run. */
function serveFake(script: ConstructorParameters<typeof FakeModelProvider>[0]): { url: string; token: string } {
  const vaultRoot = mkdtempSync(join(tmpdir(), 'runtime-step-vault-'));
  const pluginRoot = mkdtempSync(join(tmpdir(), 'runtime-step-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  mkdirSync(join(pluginRoot, 'primitives'), { recursive: true });
  writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), 'DRAFT.\n', 'utf8');

  const provider = new FakeModelProvider(script);
  const deps: ServerDeps = {
    token: TOKEN,
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault: new FsVaultStore(vaultRoot),
    store: new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'runtime-step-codex-')) }),
    platform: 'macos',
    state: () => ({ providers: [provider], router: new Router({ default: provider.id }, [provider]), defaultId: provider.id }),
    // The script never touches `/settings`; the file only has to be a path
    // this test owns, so a stray write could not land anywhere real.
    settings: { file: join(vaultRoot, 'providers.yaml'), reload: () => {} },
  };
  const app: App = createApp(deps);
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app });
  servers.push(server);
  return { url: `http://127.0.0.1:${server.port}`, token: TOKEN };
}

/** Writes a fresh `COUNSEL_OS_HOME` with `runtime.json` pointing at `url`
 * (or an arbitrary dead port when `url` is omitted). Returns the dir to use
 * as both `COUNSEL_OS_HOME` and `TMPDIR` for the spawned script, so the
 * thread-id cache file lives inside it too. */
function homeFor(opts: { url?: string; token?: string } = {}): string {
  const home = mkdtempSync(join(tmpdir(), 'runtime-step-home-'));
  const port = opts.url ? Number(new URL(opts.url).port) : 1; // port 1: nothing listens there
  writeFileSync(
    join(home, 'runtime.json'),
    JSON.stringify({ port, token: opts.token ?? TOKEN, vault: home, pid: process.pid, startedAt: new Date().toISOString() }),
    'utf8',
  );
  return home;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function run(env: Record<string, string | undefined>, request = 'what is a force majeure clause?'): Promise<RunResult> {
  const proc = Bun.spawn(['bash', SCRIPT, request], {
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

/** One SSE frame, formatted the way `runtime/src/server/sse.ts` writes them. */
function sseFrame(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * A hand-rolled server exposing just enough of the real HTTP surface
 * (`/health`, `POST /threads`, `GET /threads/:id`, `POST
 * /threads/:id/steps`) to drive the adapter, but with the steps response
 * built by the caller — raw bytes, not `sseFromEvents` — so a test can hand
 * the script malformed frames, timed chunks, or a stream that ends with no
 * terminal event at all. No `createApp`, no provider, live or fake.
 */
function serveThreadShaped(threadId: string, respondSteps: () => Response): { url: string } {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/health') return Response.json({});
      if (url.pathname === '/threads' && req.method === 'POST') return Response.json({ id: threadId }, { status: 201 });
      if (url.pathname === `/threads/${threadId}` && req.method === 'GET') {
        return Response.json({ header: { id: threadId }, events: [] });
      }
      if (url.pathname === `/threads/${threadId}/steps` && req.method === 'POST') return respondSteps();
      return new Response('not found', { status: 404 });
    },
  });
  servers.push(server);
  return { url: `http://127.0.0.1:${server.port}` };
}

/** Runs the script and timestamps every chunk that reaches its stdout, so a
 * test can assert *when* text arrived, not just that it eventually did. */
async function runStreaming(
  env: Record<string, string | undefined>,
  request = 'what is a force majeure clause?',
): Promise<{ chunks: Array<{ text: string; at: number }>; exitCode: number }> {
  const proc = Bun.spawn(['bash', SCRIPT, request], { env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' });
  const chunks: Array<{ text: string; at: number }> = [];
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push({ text: decoder.decode(value), at: Date.now() });
  }
  const exitCode = await proc.exited;
  return { chunks, exitCode };
}

describe('runtime_step.sh', () => {
  test('relays the fake provider text to stdout and exits 0', async () => {
    const { url } = serveFake([{ text: 'a force majeure clause excuses non-performance.' }]);
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.stdout).toContain('a force majeure clause excuses non-performance.');
    expect(result.exitCode).toBe(0);
  });

  test('no runtime.json means exit 3 with empty stdout', async () => {
    const home = mkdtempSync(join(tmpdir(), 'runtime-step-home-'));

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('');
  });

  test('a runtime.json pointing at a dead port means exit 3', async () => {
    const home = homeFor(); // no server started at all — the port is unreachable

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('');
  });

  test('a provider error exits 1 and prints a warning to stderr', async () => {
    const { url } = serveFake([{ error: 'model exploded' }]);
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⚠');
    expect(result.stderr).toContain('model exploded');
  });

  test('a second run reuses the cached thread', async () => {
    const { url } = serveFake([{ text: 'first answer' }, { text: 'second answer' }]);
    const home = homeFor({ url });

    const first = await run({ COUNSEL_OS_HOME: home, TMPDIR: home }, 'first question');
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain('first answer');

    const second = await run({ COUNSEL_OS_HOME: home, TMPDIR: home }, 'second question');
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toContain('second answer');

    const listRes = await fetch(`${url}/threads`, { headers: { authorization: `Bearer ${TOKEN}` } });
    const threads = (await listRes.json()) as Array<{ id: string }>;
    expect(threads.length).toBe(1);

    const oneRes = await fetch(`${url}/threads/${threads[0]!.id}`, { headers: { authorization: `Bearer ${TOKEN}` } });
    const one = (await oneRes.json()) as { events: Array<Record<string, unknown>> };
    const userEvents = one.events.filter(ev => ev['t'] === 'user');
    expect(userEvents.length).toBe(2);
    expect(userEvents.map(ev => ev['content'])).toEqual(['first question', 'second question']);
  });

  test('a malformed data line is skipped, not fatal — text and done around it still work', async () => {
    const threadId = 'aaaaaaaa-0000-0000-0000-000000000001';
    const body =
      'event: text\ndata: not-json-at-all\n\n' + // malformed on purpose — not valid JSON at all
      sseFrame('text', { type: 'text', text: 'hello' }) +
      sseFrame('done', { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } });
    const { url } = serveThreadShaped(
      threadId,
      () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.stdout).toBe('hello');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
  });

  test('a proposal frame prints "→ proposal <path> (<id>)" to stderr and does not affect stdout/exit', async () => {
    const threadId = 'aaaaaaaa-0000-0000-0000-000000000005';
    const body =
      sseFrame('tool_call', { type: 'tool_call', id: 't1', name: 'propose_update', input: {} }) +
      sseFrame('tool_result', { type: 'tool_result', id: 't1', name: 'propose_update', output: { proposalId: 'prop-1' } }) +
      sseFrame('proposal', { type: 'proposal', id: 'prop-1', path: 'practice/standards/x.md', rationale: 'because' }) +
      sseFrame('text', { type: 'text', text: 'proposed it' }) +
      sseFrame('done', { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } });
    const { url } = serveThreadShaped(
      threadId,
      () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.stderr).toContain('→ proposal practice/standards/x.md (prop-1)');
    expect(result.stdout).toBe('proposed it');
    expect(result.exitCode).toBe(0);
  });

  test('text arrives incrementally, not buffered until the stream ends', async () => {
    const threadId = 'aaaaaaaa-0000-0000-0000-000000000002';
    const { url } = serveThreadShaped(threadId, () => {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(encoder.encode(sseFrame('text', { type: 'text', text: 'A' })));
          await new Promise(resolve => setTimeout(resolve, 300));
          controller.enqueue(encoder.encode(sseFrame('text', { type: 'text', text: 'B' })));
          controller.enqueue(
            encoder.encode(sseFrame('done', { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } })),
          );
          controller.close();
        },
      });
      return new Response(streamBody, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });
    const home = homeFor({ url });

    const { chunks, exitCode } = await runStreaming({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(exitCode).toBe(0);
    const combined = chunks.map(c => c.text).join('');
    expect(combined).toBe('AB');
    const aArrival = chunks.find(c => c.text.includes('A'))?.at;
    const bArrival = chunks.find(c => c.text.includes('B'))?.at;
    expect(aArrival).toBeDefined();
    expect(bArrival).toBeDefined();
    // The server held 'B' back for 300ms; a script that buffered until the
    // stream closed would deliver both in the same chunk, ~0ms apart.
    expect(bArrival! - aArrival!).toBeGreaterThanOrEqual(250);
  });

  test('text printed, then the stream is cut short with no terminal event: exit 1, not silent exit 3', async () => {
    const threadId = 'aaaaaaaa-0000-0000-0000-000000000003';
    const { url } = serveThreadShaped(threadId, () => {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(sseFrame('text', { type: 'text', text: 'partial' })));
          controller.close(); // no `done`, no `error` — simulates a provider that threw mid-stream
        },
      });
      return new Response(streamBody, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.stdout).toBe('partial');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⚠');
  });
});
