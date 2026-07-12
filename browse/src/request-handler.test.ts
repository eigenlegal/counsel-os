import { describe, expect, test } from 'bun:test';
import { createRequestHandler } from './server';
import type { BrowserManager } from './browser-manager';

const TOKEN = 'test-command-token';

function makeHandler() {
  const calls: any[] = [];
  const bm = {
    isHealthy: async () => true,
    getTabCount: () => 0,
    getCurrentUrl: () => 'about:blank',
  } as unknown as BrowserManager;

  const handler = createRequestHandler({
    bm,
    authToken: TOKEN,
    cookiePickerToken: 'test-picker-token',
    startTime: Date.now(),
    runCommand: async (body) => {
      calls.push(body);
      return new Response('ok', { status: 200 });
    },
  });
  return { handler, calls };
}

describe('request handler routing', () => {
  test('health responds without auth but never reaches the command path', async () => {
    // Only runCommand activity resets the idle timer — if unauthenticated
    // /health polls could reach it, a local poller (or a DNS-rebound page)
    // would keep the daemon and its imported cookies alive forever.
    const { handler, calls } = makeHandler();

    const resp = await handler(new Request('http://127.0.0.1:9400/health'));

    expect(resp.status).toBe(200);
    expect((await resp.json() as any).status).toBe('healthy');
    expect(calls.length).toBe(0);
  });

  test('unauthenticated /command is rejected without running anything', async () => {
    const { handler, calls } = makeHandler();

    const resp = await handler(new Request('http://127.0.0.1:9400/command', {
      method: 'POST',
      body: JSON.stringify({ command: 'status' }),
    }));

    expect(resp.status).toBe(401);
    expect(calls.length).toBe(0);
  });

  test('authenticated /command dispatches to the command runner', async () => {
    const { handler, calls } = makeHandler();

    const resp = await handler(new Request('http://127.0.0.1:9400/command', {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ command: 'status', args: [] }),
    }));

    expect(resp.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0].command).toBe('status');
  });

  test('unknown authenticated paths 404 without running anything', async () => {
    const { handler, calls } = makeHandler();

    const resp = await handler(new Request('http://127.0.0.1:9400/nope', {
      headers: { authorization: `Bearer ${TOKEN}` },
    }));

    expect(resp.status).toBe(404);
    expect(calls.length).toBe(0);
  });
});
