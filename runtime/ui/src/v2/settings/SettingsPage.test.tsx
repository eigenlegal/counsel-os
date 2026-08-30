import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health as HealthData, SettingsView } from '../../api/types';
import { setUiFlag } from '../../ui-flag';
import { SettingsPage } from './SettingsPage';

const health: HealthData = { vault: '/Users/jack/legal', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 120000 };

const view: SettingsView = {
  file: '/Users/jack/.counsel-os/providers.yaml',
  registry: { default: 'fake/fake', providers: [{ id: 'openai-compatible/local', baseURL: 'http://127.0.0.1:11434/v1' }] },
  effective: {
    default: 'fake/fake',
    stepTimeoutMs: 120000,
    providers: [{ id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } }],
  },
};

const realFetch = globalThis.fetch;
let puts: unknown[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(onPut: (body: unknown) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/settings' && (init?.method ?? 'GET') === 'GET') return json(view);
    if (url === '/settings' && init?.method === 'PUT') {
      const body: unknown = JSON.parse(String(init.body));
      puts.push(body);
      return onPut(body);
    }
    throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  puts = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
  localStorage.clear();
  setUiFlag('v1');
});

describe('SettingsPage', () => {
  test('is grouped in the spec order and carries the design switch', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    // By its LABEL: the group's own heading says "Default provider" too.
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());
    // Descendant, not child: `DesignToggle` and `Health` each draw their own
    // heading inside their own section, one level under the group card.
    const headings = Array.from(document.querySelectorAll('.v2-group h2'), el => el.textContent);
    expect(headings).toEqual(['Design', 'Default provider', 'Step timeout', 'Providers', 'Task routes', 'Test', 'Runtime']);
    expect(screen.getByRole('switch', { name: 'Try the new design' })).toBeTruthy();
    // The Test group keeps the step-4 confirm, word for word.
    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(screen.getByText('This uses one call on fake/fake.')).toBeTruthy();
  });

  test('saves the edited registry and shows a 422 inline', async () => {
    install(body => {
      const reg = body as { default?: string };
      return reg.default === 'ollama/gemma4:e4b' ? json({ error: 'unknown provider ollama/gemma4:e4b' }, 422) : json(view);
    });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());

    // `userEvent.setup({ document })`, not the bare `userEvent.clear`: the
    // direct API infers its document from the element it is given, and
    // `clear` is the one call that is not given one — so it looks for a
    // global that happy-dom installs later than user-event reads it.
    const user = userEvent.setup({ document });
    const input = screen.getByLabelText('Default provider') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'ollama/gemma4:e4b');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('unknown provider ollama/gemma4:e4b')).toBeTruthy());
    expect(puts).toHaveLength(1);
    expect((puts[0] as { default: string }).default).toBe('ollama/gemma4:e4b');
    expect((puts[0] as { providers: unknown[] }).providers).toHaveLength(1);
  });

  test('a 400 lands on the field it names', async () => {
    install(() => json({ error: 'invalid', issues: [{ path: ['stepTimeoutMs'], message: 'must be positive' }] }, 400));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Step timeout (ms)')).toBeTruthy());
    await userEvent.type(screen.getByLabelText('Step timeout (ms)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('must be positive')).toBeTruthy());
  });
});
