import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import type { Health as HealthData, SettingsView } from '../api/types';
import { Health } from './Health';

const health: HealthData = { vault: '/Users/jack/legal', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 120000, outcomes: true };
const effective: SettingsView['effective'] = { default: 'fake/fake', stepTimeoutMs: 120000, providers: [] };

const realFetch = globalThis.fetch;
let patches: unknown[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(answer: (body: { outcomes: boolean }) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/settings/vault' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { outcomes: boolean };
      patches.push(body);
      return answer(body);
    }
    throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  patches = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('the Decisions and marks switch (routing-and-evals spec §7)', () => {
  test('reads the runtime, and one set-text link flips it through PATCH /settings/vault', async () => {
    install(body => json({ outcomes: body.outcomes }));
    render(<Health health={health} effective={effective} file="/Users/jack/.counsel-os/providers.yaml" />);
    expect(screen.getByText('Decisions and marks')).toBeTruthy();
    expect(screen.getByText(/kept locally · on/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'turn off' }));
    await waitFor(() => expect(screen.getByText(/not kept · off/)).toBeTruthy());
    expect(patches).toEqual([{ outcomes: false }]);
    expect(screen.getByRole('button', { name: 'turn on' })).toBeTruthy();
  });

  test('an older runtime that does not report the switch shows no row', () => {
    const { outcomes: _drop, ...older } = health;
    render(<Health health={older} effective={effective} file="/x/providers.yaml" />);
    expect(screen.queryByText('Decisions and marks')).toBeNull();
  });

  test('a refused flip says so and keeps the runtime\'s answer', async () => {
    install(() => json({ error: 'config.md is read-only' }, 500));
    render(<Health health={health} effective={effective} file="/x/providers.yaml" />);
    await userEvent.click(screen.getByRole('button', { name: 'turn off' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/kept locally · on/)).toBeTruthy();
  });
});

describe('what the running process is', () => {
  const withBuild = (over: Partial<NonNullable<HealthData['runtime']>>): HealthData => ({
    ...health,
    runtime: { version: '0.14.0', startedAt: new Date().toISOString(), source: 'source', ...over },
  });

  test('names the version and the commit the process read', () => {
    install(() => json({ outcomes: true }));
    render(<Health health={withBuild({ commit: 'abc1234' })} effective={effective} file="/f.yaml" />);
    const running = screen.getByText('Running').closest('.fact')!;
    expect(running.textContent).toContain('0.14.0');
    expect(running.textContent).toContain('abc1234');
    expect(running.textContent).toMatch(/started .* ago|started just now/);
  });

  test('a process older than an hour says to restart it', () => {
    // The actual failure: a serve left up overnight kept answering from the
    // catalog it was born with, while handing the browser a UI rebuilt that
    // morning. Nothing on screen said so.
    install(() => json({ outcomes: true }));
    const yesterday = new Date(Date.now() - 19 * 3_600_000).toISOString();
    render(<Health health={withBuild({ startedAt: yesterday })} effective={effective} file="/f.yaml" />);
    const running = screen.getByText('Running').closest('.fact')!;
    expect(running.textContent).toContain('19 hours ago');
    expect(running.textContent).toContain('restart to pick up changes made since');
  });

  test('a fresh process does not nag', () => {
    install(() => json({ outcomes: true }));
    render(<Health health={withBuild({})} effective={effective} file="/f.yaml" />);
    expect(screen.getByText('Running').closest('.fact')!.textContent).not.toContain('restart to pick up');
  });

  test('a compiled binary is never called stale — it cannot drift', () => {
    install(() => json({ outcomes: true }));
    const old = new Date(Date.now() - 40 * 3_600_000).toISOString();
    render(<Health health={withBuild({ source: 'binary', startedAt: old })} effective={effective} file="/f.yaml" />);
    const running = screen.getByText('Running').closest('.fact')!;
    expect(running.textContent).toContain('2 days ago');
    expect(running.textContent).not.toContain('restart to pick up');
  });

  test('a runtime too old to say so says that', () => {
    install(() => json({ outcomes: true }));
    render(<Health health={health} effective={effective} file="/f.yaml" />);
    expect(screen.getByText(/an older runtime — restart it to see which/)).toBeTruthy();
  });
});
