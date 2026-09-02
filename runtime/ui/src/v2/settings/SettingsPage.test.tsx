import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import { onUnauthorized } from '../../api/unauthorized';
import type { Health as HealthData, ProviderInfo, SettingsView } from '../../api/types';
import { SettingsPage } from './SettingsPage';

const health: HealthData = { vault: '/Users/jack/legal', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 120000 };

const fakeProvider: ProviderInfo = {
  id: 'fake/fake',
  kind: 'direct',
  auth: 'local',
  capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' },
};

const view: SettingsView = {
  file: '/Users/jack/.counsel-os/providers.yaml',
  registry: {
    default: 'fake/fake',
    providers: [{ id: 'openai-compatible/local', baseURL: 'http://127.0.0.1:11434/v1' }],
    // One of everything a route can hold, so rendering and saving cover the
    // whole shape.
    tasks: { review: { prefer: 'fake/fake', require: { contextTokens: 1000 }, allow_remote: false } },
  },
  effective: {
    default: 'fake/fake',
    stepTimeoutMs: 120000,
    providers: [fakeProvider],
  },
};

const realFetch = globalThis.fetch;
let puts: unknown[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(onPut: (body: unknown) => Response, getView: SettingsView = view): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/settings' && (init?.method ?? 'GET') === 'GET') return json(getView);
    // The Content group reads its own status; an all-current answer keeps
    // these tests about the registry form.
    if (url === '/content/status') {
      return json({ shippedVersion: '0.0.0', vaultVersion: '0.0.0', receivedAt: null, lawManagement: 'plugin', autoApplyLawUpdates: false, items: [], counts: { current: 0, 'update-available': 0, 'user-modified': 0, 'vault-only': 0, missing: 0, 'upstream-changed': 0 } });
    }
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
  test('is grouped by what the operator came to do, each group with a purpose line', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());
    // Descendant, not child: `Health` draws its own heading inside its own
    // section, one level under the group card.
    const headings = Array.from(document.querySelectorAll('.v2-group h2'), el => el.textContent);
    expect(headings).toEqual(['Providers', 'Default provider', 'Task routes', 'Step timeout', 'Test', 'Content', 'Runtime']);
    // The plain-language purpose lines (cou-84), one under each heading.
    expect(screen.getByText(/The models this runtime can call/)).toBeTruthy();
    expect(screen.getByText(/The model that answers when nothing more specific applies/)).toBeTruthy();
    expect(screen.getByText(/Send one kind of work to a particular model/)).toBeTruthy();
    expect(screen.getByText(/before the runtime cancels it and reports a timeout/)).toBeTruthy();
    expect(screen.getByText(/What is actually running right now/)).toBeTruthy();
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

  test('one Save, below every card it writes', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Task')).toBeTruthy());

    const save = screen.getByRole('button', { name: 'Save' });
    // The button belongs to the form's footer, not to any one group.
    expect(save.closest('.v2-group')).toBeNull();
    expect(save.closest('.v2-save')).not.toBeNull();
    expect(screen.getByText(/Saves Providers, Default provider, Task routes and Step timeout/)).toBeTruthy();

    await userEvent.click(save);
    await waitFor(() => expect(screen.getByText(/^Saved\./)).toBeTruthy());
    // The confirmation reads beside the button that caused it.
    expect(screen.getByText(/^Saved\./).closest('.v2-save')).not.toBeNull();
  });

  test('a task route renders as a structured row and round-trips on save', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Task')).toBeTruthy());

    expect((screen.getByLabelText('Task') as HTMLInputElement).value).toBe('review');
    expect((screen.getByLabelText('Provider') as HTMLInputElement).value).toBe('fake/fake');
    expect((screen.getByLabelText('min context (tokens)') as HTMLInputElement).value).toBe('1000');
    expect((screen.getByLabelText('remote models') as HTMLSelectElement).value).toBe('no');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect((puts[0] as { tasks: unknown }).tasks).toEqual({
      review: { prefer: 'fake/fake', require: { contextTokens: 1000 }, allow_remote: false },
    });
  });

  test('an unfinished route is stopped in the page, never sent', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add route' })).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Add route' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('name the kind of work this route matches')).toBeTruthy());
    expect(puts).toHaveLength(0);
  });

  test('a route naming an unloaded provider warns about the fallback', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Provider')).toBeTruthy());

    const user = userEvent.setup({ document });
    const prefer = screen.getByLabelText('Provider') as HTMLInputElement;
    await user.clear(prefer);
    await user.type(prefer, 'nobody/loaded');
    expect(screen.getByText(/This route will fall back to the default/)).toBeTruthy();
  });

  test('the catalog picker prefills a provider row without saving anything', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Provider to add' })).toBeTruthy());
    const user = userEvent.setup({ document });
    const before = (screen.getAllByLabelText('Id') as HTMLInputElement[]).length;
    await user.type(screen.getByRole('combobox', { name: 'Provider to add' }), 'Ollama');
    await user.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const ids = screen.getAllByLabelText('Id') as HTMLInputElement[];
    expect(ids).toHaveLength(before + 1);
    expect(ids.map(el => el.value)).toContain('ollama/');
    // Prefilled only: nothing was PUT.
    expect(puts).toHaveLength(0);
  });

  test('the Claude start appears when the built-in is loaded, and sets the default', async () => {
    const claude: ProviderInfo = { ...fakeProvider, id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription' };
    install(
      () => json(view),
      { ...view, effective: { ...view.effective, providers: [fakeProvider, claude] } },
    );
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByText(/already loaded as/)).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Make it the default' }));
    expect((screen.getByLabelText('Default provider') as HTMLInputElement).value).toBe('claude-sub/claude-opus-5');
    // The button disappears once it IS the default — nothing left to do.
    expect(screen.queryByRole('button', { name: 'Make it the default' })).toBeNull();
  });

  test('the timeout is echoed in words', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Step timeout (ms)')).toBeTruthy());

    // Empty: the effective fallback, in ms and in words.
    expect(screen.getByText(/Not set — the runtime uses .* ms \(2 minutes\)/)).toBeTruthy();

    await userEvent.type(screen.getByLabelText('Step timeout (ms)'), '90000');
    expect(screen.getByText('That is 1 minute 30 seconds.')).toBeTruthy();
  });
});

describe('SettingsPage, the default provider field (cou-93 item 3)', () => {
  test('shows the EFFECTIVE default when the file sets none, says so, and offers no button to make the default the default', async () => {
    const claude: ProviderInfo = { ...fakeProvider, id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription' };
    install(
      () => json(view),
      { file: view.file, registry: {}, effective: { default: 'claude-sub/claude-opus-5', stepTimeoutMs: 600000, providers: [claude] } },
    );
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());
    expect((screen.getByLabelText('Default provider') as HTMLInputElement).value).toBe('claude-sub/claude-opus-5');
    expect(screen.getByText(/Built-in default/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Make it the default' })).toBeNull();
  });
});

describe('SettingsPage, signing out', () => {
  test('Runtime has "Sign out of this browser": it POSTs /session/clear and the app hears unauthorized', async () => {
    const calls: { url: string; method: string }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      if (url === '/settings' && method === 'GET') return json(view);
      if (url === '/session/clear' && method === 'POST') return new Response(null, { status: 204 });
      throw new Error(`unexpected fetch: ${method} ${url}`);
    }) as unknown as typeof fetch;
    let reported = 0;
    const off = onUnauthorized(() => (reported += 1));
    try {
      render(<SettingsPage health={health} />);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out of this browser' })).toBeTruthy());
      await userEvent.click(screen.getByRole('button', { name: 'Sign out of this browser' }));
      await waitFor(() => expect(reported).toBe(1));
      expect(calls.some(c => c.url === '/session/clear' && c.method === 'POST')).toBe(true);
      expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    } finally {
      off();
    }
  });
});

describe('SettingsPage, the vendor catalog (providers spec §3, §6)', () => {
  async function pick(text: string): Promise<void> {
    const user = userEvent.setup({ document });
    await user.clear(screen.getByRole('combobox', { name: 'Provider to add' }));
    await user.type(screen.getByRole('combobox', { name: 'Provider to add' }), text);
    await user.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  }

  test('the picker covers the catalog in three groups and prefills prefix, key variable and a preset base URL', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Provider to add' })).toBeTruthy());
    // No button per vendor: one field, one Add.
    expect(screen.queryByRole('button', { name: 'Add Google Gemini' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    await pick('Google Gemini');
    const ids = screen.getAllByLabelText('Id') as HTMLInputElement[];
    expect(ids.map(el => el.value)).toContain('google/');
    const keys = screen.getAllByLabelText('key variable (optional)') as HTMLInputElement[];
    expect(keys.map(el => el.value)).toContain('GOOGLE_GENERATIVE_AI_API_KEY');
    await pick('LM Studio');
    const urls = screen.getAllByLabelText('baseURL') as HTMLInputElement[];
    expect(urls.map(el => el.value)).toContain('http://127.0.0.1:1234/v1');
    await pick('Kimi (Moonshot)');
    expect((screen.getAllByLabelText('baseURL') as HTMLInputElement[]).map(el => el.value)).toContain('https://api.moonshot.ai/v1');
    expect(puts).toHaveLength(0);
  });

  test('each provider row says where its text goes, from its id and base URL', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Provider to add' })).toBeTruthy());
    // The fixture's row is an OpenAI-compatible loopback server: local.
    expect(screen.getAllByRole('note').some((el: Element) => el.textContent?.includes('local · nothing leaves this machine'))).toBe(true);
    await pick('Google Gemini');
    expect(screen.getAllByRole('note').some((el: Element) => el.textContent?.includes('cloud · text goes to Google'))).toBe(true);
    // The copy never sends a lawyer to set an environment variable.
    expect(document.body.textContent).not.toMatch(/environment variable before you start/);
  });

  test('an unverified preset says so before it is added', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Provider to add' })).toBeTruthy());
    const user = userEvent.setup({ document });
    await user.type(screen.getByRole('combobox', { name: 'Provider to add' }), 'SambaNova');
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('note').some((el: Element) => el.textContent?.includes('not verified'))).toBe(true);
  });
});

describe('SettingsPage, provider keys (providers spec §5)', () => {
  test('a keyed row shows its key control from keySet, the Runtime ledger says where keys live, and the copy no longer sends a lawyer to the environment', async () => {
    const google: ProviderInfo = { ...fakeProvider, id: 'google/gemini-2.5-pro', auth: 'apikey', keySet: false, locality: 'cloud', handles: { company: 'Google', termsUrl: 'https://ai.google.dev/gemini-api/terms' } };
    install(
      () => json(view),
      {
        ...view,
        registry: { ...view.registry, providers: [{ id: 'google/gemini-2.5-pro' }] },
        effective: { ...view.effective, providers: [fakeProvider, google] },
        secrets: { where: 'keychain' },
      },
    );
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('group', { name: 'Key for google/gemini-2.5-pro' })).toBeTruthy());
    expect(screen.getByText('not set')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'paste a key' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'get a key' })).toBeTruthy();
    // The ledger's Keys fact.
    expect(screen.getByText('Keychain')).toBeTruthy();
    // Copy: the purpose line names the Keychain, and mentions the environment once, for headless use only.
    const purpose = screen.getByText(/The models this runtime can call/).textContent ?? '';
    expect(purpose).toContain('Keychain');
    expect(purpose.match(/environment/g)?.length ?? 0).toBe(1);
    expect(purpose).not.toContain('OPENAI_API_KEY');
  });

  test('a runtime without a store: the ledger says so and the row offers no paste', async () => {
    const google: ProviderInfo = { ...fakeProvider, id: 'google/gemini-2.5-pro', auth: 'apikey', keySet: 'env' };
    install(() => json(view), { ...view, registry: { providers: [{ id: 'google/gemini-2.5-pro' }] }, effective: { ...view.effective, providers: [google] }, secrets: null });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByText(/environment only/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'paste a key' })).toBeNull();
  });
});
