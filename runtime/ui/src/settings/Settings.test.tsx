import { cleanup, render, screen, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import type { Health as HealthData, SettingsView } from '../api/types';
import { Settings } from './Settings';

const health: HealthData = {
  vault: '/Users/jack/legal',
  tenant: 'default',
  providers: [],
  default: 'claude-sub/claude-opus-5',
  stepTimeoutMs: 120000,
};

const view: SettingsView = {
  file: '/Users/jack/.counsel-os/providers.yaml',
  registry: {},
  effective: {
    default: 'claude-sub/claude-opus-5',
    stepTimeoutMs: 120000,
    providers: [
      {
        id: 'claude-sub/claude-opus-5',
        kind: 'harness',
        auth: 'subscription',
        capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200000, auth: 'subscription' },
      },
    ],
  },
};

const realFetch = globalThis.fetch;

function serve(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('Settings', () => {
  test('shows what the runtime is, and the file that configures it', async () => {
    serve(200, view);
    render(<Settings health={health} />);

    await waitFor(() => expect(screen.getByText('/Users/jack/legal')).toBeTruthy());
    expect(screen.getByText('default')).toBeTruthy();
    expect(screen.getByText('120000 ms')).toBeTruthy();
    expect(screen.getAllByText('/Users/jack/.counsel-os/providers.yaml').length).toBeGreaterThan(0);
    // The providers table, from `effective` — the runtime, not the file.
    expect(screen.getByRole('columnheader', { name: 'Context' })).toBeTruthy();
    expect(screen.getByText('200,000')).toBeTruthy();
  });

  test('a runtime with no resolvable default says so instead of showing a blank', async () => {
    serve(200, { ...view, effective: { ...view.effective, default: null, providers: [] } });
    render(<Settings health={health} />);

    await waitFor(() => expect(screen.getByText(/no provider resolves/)).toBeTruthy());
    expect(screen.getByText('No providers are loaded.')).toBeTruthy();
  });

  test('a failed load says why rather than rendering an empty form', async () => {
    serve(500, { error: 'providers.yaml is not readable' });
    render(<Settings health={health} />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('providers.yaml is not readable'));
  });
});
