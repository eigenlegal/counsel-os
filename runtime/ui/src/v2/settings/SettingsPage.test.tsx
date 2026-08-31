import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health as HealthData, SettingsView } from '../../api/types';
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
});

describe('SettingsPage', () => {
  test('is grouped in the spec order', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    // By its LABEL: the group's own heading says "Default provider" too.
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());
    // Descendant, not child: `Health` draws its own heading inside its own
    // section, one level under the group card.
    const headings = Array.from(document.querySelectorAll('.v2-group h2'), el => el.textContent);
    expect(headings).toEqual(['Default provider', 'Step timeout', 'Providers', 'Task routes', 'Test', 'Runtime']);
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
    // Typing opened the combobox's suggestion list, and react-aria
    // aria-hides everything outside an open popup — including Save. Close
    // it the way a keyboard user would before reaching for the button.
    await user.keyboard('{Escape}');
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

  test('one Save, below every card it writes — not inside Task routes', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Task routes (JSON)')).toBeTruthy());

    const save = screen.getByRole('button', { name: 'Save' });
    // The button belongs to the form's footer, not to any one group.
    expect(save.closest('.v2-group')).toBeNull();
    expect(save.closest('.v2-save')).not.toBeNull();
    expect(screen.getByText(/Saves Default provider, Step timeout, Providers and Task routes/)).toBeTruthy();

    await userEvent.click(save);
    await waitFor(() => expect(screen.getByText(/^Saved\./)).toBeTruthy());
    // The confirmation reads beside the button that caused it.
    expect(screen.getByText(/^Saved\./).closest('.v2-save')).not.toBeNull();
  });
});
