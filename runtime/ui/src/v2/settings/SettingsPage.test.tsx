import { cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

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
    // The Models group reads the scoreboard; an empty one keeps these tests
    // about the registry form.
    if (url === '/evals/scoreboard') return json({ at: '2026-09-02T00:00:00.000Z', tasks: [] });
    // Every provider block asks its vendor what models it has. A test that
    // cares stubs its own; this is the quiet default.
    if (url.startsWith('/providers/') && url.includes('/models')) return json({ models: [], source: 'curated' });
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

/** The model field of the block showing `model`. Two rows of one vendor are
 * two blocks now, so a label alone is ambiguous. */
function modelField(label: string, value: string): HTMLInputElement {
  const found = (screen.getAllByLabelText(label) as HTMLInputElement[]).find(el => el.value === value);
  if (found === undefined) throw new Error(`no ${label} field showing ${value}`);
  return found;
}

/** The full catalog now sits behind "Someone else" — the common providers
 * are named and clicked directly. Tests that search it open it first. */
async function openCatalog(): Promise<HTMLElement> {
  const open = screen.queryByRole('combobox', { name: 'Search by maker or vendor' });
  if (open !== null) return open;
  // The page may still be loading its settings, so wait for the link
  // rather than deciding it is absent.
  await userEvent.click(await waitFor(() => screen.getByRole('button', { name: 'Someone else' })));
  return await waitFor(() => screen.getByRole('combobox', { name: 'Search by maker or vendor' }));
}

describe('SettingsPage', () => {
  test('is grouped by what the operator came to do, each group with a purpose line', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());
    // Descendant, not child: `Health` draws its own heading inside its own
    // section, one level under the group card.
    const headings = Array.from(document.querySelectorAll('.v2-group h2'), el => el.textContent);
    // No Models: a scoreboard is a measurement and a bar is a standing
    // decision, neither of which is a setting. They live on the Models page.
    expect(headings).toEqual(['Providers and models', 'Task routes', 'Step timeout', 'Test', 'Content', 'Runtime']);
    // The plain-language purpose lines (cou-84), one under each heading.
    expect(screen.getByText(/The providers this runtime can call/)).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy();
    expect(screen.getByText(/Send one kind of work to a particular model/)).toBeTruthy();
    expect(screen.getByText(/before the runtime cancels it and reports a timeout/)).toBeTruthy();
    expect(screen.getByText(/What is actually running right now/)).toBeTruthy();
    // The Test group keeps the step-4 confirm, word for word.
    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(screen.getByText('This uses one call on fake/fake.')).toBeTruthy();
  });

  test('saves the edited registry and shows a 422 inline', async () => {
    const ollama: ProviderInfo = { ...fakeProvider, id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' };
    install(
      body => {
        const reg = body as { default?: string };
        return reg.default === 'ollama/gemma4:e4b' ? json({ error: 'unknown provider ollama/gemma4:e4b' }, 422) : json(view);
      },
      { ...view, effective: { ...view.effective, providers: [fakeProvider, ollama] } },
    );
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());

    // "use this one" IS the save: the row carries the act that used to mean
    // reading an id off one group and typing it into another.
    await userEvent.click(screen.getByRole('button', { name: 'Use Ollama' }));

    await waitFor(() => expect(screen.getByText('unknown provider ollama/gemma4:e4b')).toBeTruthy());
    expect(puts).toHaveLength(1);
    expect((puts[0] as { default: string }).default).toBe('ollama/gemma4:e4b');
    expect((puts[0] as { providers: unknown[] }).providers).toHaveLength(1);
  });

  test('a save the page refuses does not move the default it refused', async () => {
    const ollama: ProviderInfo = { ...fakeProvider, id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' };
    install(() => json(view), { ...view, effective: { ...view.effective, providers: [fakeProvider, ollama] } });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());

    // A blank row makes the form invalid. Clicking "use this one" then used
    // to flip the table to the new default and send nothing — and the only
    // message said so from inside a collapsed disclosure.
    await openCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'or add a blank row' }));
    await userEvent.click(screen.getByRole('button', { name: 'Use Ollama' }));

    await waitFor(() => expect(screen.getByText('Nothing was saved. Correct the fields marked above.')).toBeTruthy());
    expect(puts).toHaveLength(0);
    // The table still says what is true on disk: the row that was clicked
    // did NOT become the default.
    const table = screen.getByRole('list', { name: 'Providers you can use' });
    const clicked = within(table).getAllByRole('listitem').find(r => (r.textContent ?? '').includes('Ollama'))!;
    expect(within(clicked).queryByText(/answers by default/)).toBeNull();
    expect(within(clicked).getByRole('button', { name: 'Use Ollama' })).toBeTruthy();
    // And the field it wants is on screen, not folded away.
    expect(screen.getByText('id is required')).toBeTruthy();
  });

  test('a provider you already have is not added twice', async () => {
    // One block per provider means one row per provider. A second row of a
    // vendor you have folds into the same block, so it had no model picker
    // and no key of its own — nothing on it could be filled in, and saving
    // it wrote an id with no model into the file.
    const ollama: ProviderInfo = { ...fakeProvider, id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' };
    install(() => json(view), { ...view, effective: { ...view.effective, providers: [fakeProvider, ollama] } });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());
    const before = screen.getAllByLabelText('Id').length;

    const user = userEvent.setup({ document });
    await user.type(await openCatalog(), 'Local runners · Ollama');
    await user.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.getByText(/You already have Ollama/)).toBeTruthy());
    expect(screen.getAllByLabelText('Id')).toHaveLength(before);
  });

  test('a blank row shows the one field it needs, without moving it', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());

    const before = screen.getAllByLabelText('Id').length;
    await openCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'or add a blank row' }));
    const ids = screen.getAllByLabelText('Id');
    expect(ids).toHaveLength(before + 1);

    // Visible because its fold is OPEN, not because the field lives
    // somewhere else while the vendor is unknown. Moving it once the id
    // became recognisable remounted the input and dropped focus mid-word.
    const added = ids[ids.length - 1] as HTMLElement;
    const fold = added.closest('details');
    expect(fold).not.toBeNull();
    expect((fold as HTMLDetailsElement).open).toBe(true);
    // A row that names a known vendor keeps its id folded away, where the
    // rest of its settings are.
    const known = ids[0] as HTMLElement;
    expect((known.closest('details') as HTMLDetailsElement).open).toBe(false);
  });

  test('a search nobody serves says so, instead of offering everything', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());

    const user = userEvent.setup({ document });
    const box = await openCatalog();
    // This field's own list: `queryAllByRole('option')` is document-wide,
    // and every other combobox on the page has one too.
    const list = (): HTMLElement[] => Array.from(box.closest('.v2-combo')?.querySelectorAll('[role="option"]') ?? []) as HTMLElement[];

    // A live query offers what it found…
    await user.type(box, 'gemini');
    await waitFor(() => expect(list().some(o => (o.textContent ?? '').includes('Google'))).toBe(true));

    // …and a dead one offers nothing. The old fallback answered it with the
    // whole catalog, which read as thirty-odd vendors that all serve it.
    await user.type(box, ' pro');
    await waitFor(() => expect(list()).toHaveLength(0));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByText(/Nothing matches/)).toBeTruthy());
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
    // The caption names which of the page's two rules this button is:
    // choosing a model or pasting a key writes at once, so the button does
    // not claim them.
    const caption = screen.getByText(/Saves the providers you added/).textContent ?? '';
    expect(caption).toContain('task routes');
    expect(caption).toContain('step timeout');
    expect(caption).toContain('applies at once');

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

  test('a maker finds the vendors that serve it — the founder’s "meta and google aren’t here"', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());

    // `userEvent.setup({ document })`: the direct API infers its document
    // from the element it is handed, and `keyboard` is given none.
    const user = userEvent.setup({ document });
    await user.type(await openCatalog(), 'llama');

    // Meta sells no API; every vendor that serves Llama has to answer to it,
    // or the maker looks absent from the app.
    // Annotated throughout: the late-bound `screen` (test/dom.ts) is a Proxy
    // whose queries come back untyped, so every callback below would be an
    // implicit `any`.
    const offered: string[] = screen.getAllByRole('option').map((o: HTMLElement) => o.textContent ?? '');
    expect(offered.some((o: string) => o.includes('Together AI'))).toBe(true);
    expect(offered.some((o: string) => o.includes('Ollama'))).toBe(true);
    expect(offered.every((o: string) => o.toLowerCase().includes('llama'))).toBe(false);
    // And the line under the box says WHY each one matched. The open popup
    // aria-hides the rest of the form, so close it the way a keyboard user
    // would before reading anything outside.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('.v2-add-provider-note')?.textContent ?? '').toMatch(/Llama/));
  });

  test('the catalog picker prefills a provider row without saving anything', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await openCatalog();
    const user = userEvent.setup({ document });
    const before = (screen.getAllByLabelText('Id') as HTMLInputElement[]).length;
    await user.type(await openCatalog(), 'Ollama');
    await user.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const ids = screen.getAllByLabelText('Id') as HTMLInputElement[];
    expect(ids).toHaveLength(before + 1);
    expect(ids.map(el => el.value)).toContain('ollama/');
    // Prefilled only: nothing was PUT.
    expect(puts).toHaveLength(0);
  });

  test('a built-in is in the list like anything else, and one click makes it answer', async () => {
    // It used to be a "guided start" that said Claude was loaded and offered
    // a button — a sentence about a model that was never in any list.
    const claude: ProviderInfo = { ...fakeProvider, id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription' };
    const both = { ...view, effective: { ...view.effective, providers: [fakeProvider, claude] } };
    // The PUT answers with the saved view — both models still loaded, and
    // the file now naming the one that answers.
    install(() => json({ ...both, registry: { ...view.registry, default: 'claude-sub/claude-opus-5' } }), both);
    render(<SettingsPage health={health} />);
    const table = await waitFor(() => screen.getByRole('list', { name: 'Providers you can use' }));
    const rows = within(table).getAllByRole('listitem').map(r => r.textContent ?? '');
    expect(rows.some(r => r.includes('Claude') && r.includes('your subscription'))).toBe(true);

    const claudeRow = within(table).getAllByRole('listitem').find(r => (r.textContent ?? '').includes('Claude'))!;
    await userEvent.click(within(claudeRow).getByRole('button', { name: /^Use / }));
    await waitFor(() => expect((puts[0] as { default: string }).default).toBe('claude-sub/claude-opus-5'));
    // And the row it is on says so, rather than offering the act again.
    await waitFor(() => expect(within(table).getByText(/answers by default/)).toBeTruthy());
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
    const table = await waitFor(() => screen.getByRole('list', { name: 'Providers you can use' }));
    // The row that answers says so, and says the choice is the runtime's
    // rather than one the practice saved.
    const row = within(table).getAllByRole('listitem').find(r => (r.textContent ?? '').includes('Claude'))!;
    expect(within(row).getByText(/answers by default/)).toBeTruthy();
    expect(within(row).getByText(/built in, not yet saved/)).toBeTruthy();
    expect(within(row).queryByRole('button', { name: /^Use / })).toBeNull();
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
    await user.clear(await openCatalog());
    await user.type(await openCatalog(), text);
    await user.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  }

  test('the picker covers the catalog in three groups and prefills prefix, key variable and a preset base URL', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await openCatalog();
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
    await openCatalog();
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
    await openCatalog();
    const user = userEvent.setup({ document });
    await user.type(await openCatalog(), 'SambaNova');
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
    // Copy: the group's opening line says where providers are saved and
    // where a key goes, and never sends a lawyer to an environment
    // variable — that is for headless use only.
    const opening = screen.getByText(/One key per provider/).textContent ?? '';
    expect(opening).toContain('Keychain');
    expect(opening).not.toContain('OPENAI_API_KEY');
  });

  test('a runtime without a store: the ledger says so and the row offers no paste', async () => {
    const google: ProviderInfo = { ...fakeProvider, id: 'google/gemini-2.5-pro', auth: 'apikey', keySet: 'env' };
    install(() => json(view), { ...view, registry: { providers: [{ id: 'google/gemini-2.5-pro' }] }, effective: { ...view.effective, providers: [google] }, secrets: null });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByText(/environment only/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'paste a key' })).toBeNull();
  });
});

describe('SettingsPage, the model picker on a provider row (providers spec §4)', () => {
  const openai: ProviderInfo = { ...fakeProvider, id: 'openai/gpt-5.6', auth: 'apikey', locality: 'cloud', keySet: true };
  const withRow: SettingsView = {
    ...view,
    registry: { ...view.registry, providers: [{ id: 'openai/gpt-5.6', apiKeyEnv: 'OPENAI_API_KEY' }] },
    effective: { ...view.effective, providers: [fakeProvider, openai] },
  };

  function installWithModels(answer: (url: string) => Response | null, served: SettingsView = withRow): { listed: string[] } {
    const listed: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/settings' && (init?.method ?? 'GET') === 'GET') return json(served);
      if (url === '/content/status') return json({ shippedVersion: '0.0.0', vaultVersion: '0.0.0', receivedAt: null, lawManagement: 'plugin', autoApplyLawUpdates: false, items: [], counts: { current: 0, 'update-available': 0, 'user-modified': 0, 'vault-only': 0, missing: 0, 'upstream-changed': 0 } });
      if (url === '/settings' && init?.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)));
        return json(served);
      }
      if (url.startsWith('/providers/')) {
        listed.push(url);
        const r = answer(url);
        if (r !== null) return r;
      }
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    }) as unknown as typeof fetch;
    return { listed };
  }

  test("the row lists the vendor's models with context sizes; a pick rewrites the id; refresh asks again", async () => {
    const { listed } = installWithModels(() => json({ models: [{ id: 'gpt-5.6', contextTokens: 400000 }, { id: 'gpt-5.6-mini', contextTokens: 128000 }], source: 'list' }));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getAllByLabelText('OpenAI model').length).toBeGreaterThan(0));
    expect(modelField('OpenAI model', 'gpt-5.6')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/2 models listed/).length).toBeGreaterThan(0));
    expect(listed).toEqual(['/providers/openai/models']);

    // Every provider has a block, so each control is reached through its
    // own — not by document-wide role.
    const block = modelField('OpenAI model', 'gpt-5.6').closest('.v2-yours-model') as HTMLElement;

    // Choosing from the list applies at once — no separate Save, and no
    // id to retype.
    await userEvent.click(within(block).getByRole('button', { name: 'Show models' }));
    await userEvent.click(screen.getByText('gpt-5.6-mini'));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect((puts[0] as { providers: { id: string }[] }).providers[0]!.id).toBe('openai/gpt-5.6-mini');

    // Re-query: a save rebuilds the form from the response, which mints new
    // row keys and so remounts the blocks — the node captured above is
    // detached, and clicking it would do nothing. Asking again is what
    // matters here, not the exact number of listings.
    const after = modelField('OpenAI model', 'gpt-5.6').closest('.v2-yours-model') as HTMLElement;
    await userEvent.click(within(after).getByRole('button', { name: 'refresh' }));
    await waitFor(() => expect(listed.some(u => u === '/providers/openai/models?refresh=1')).toBe(true));
  });

  test('only the row that is showing is rewritten, never every row of the vendor', async () => {
    // A practice with two OpenAI models. Rewriting by PREFIX gave both rows
    // the same id and lost the second row's own settings for good.
    const mini: ProviderInfo = { ...openai, id: 'openai/gpt-4o-mini' };
    const two: SettingsView = {
      ...withRow,
      registry: { ...view.registry, providers: [{ id: 'openai/gpt-5.6', apiKeyEnv: 'OPENAI_API_KEY' }, { id: 'openai/gpt-4o-mini', capabilities: { contextTokens: 128000 } }] },
      effective: { ...view.effective, providers: [fakeProvider, openai, mini] },
    };
    installWithModels(() => json({ models: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }], source: 'list' }), two);
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getAllByLabelText('OpenAI model').length).toBeGreaterThan(0));

    const block = modelField('OpenAI model', 'gpt-5.6').closest('.v2-yours-model') as HTMLElement;
    await userEvent.click(within(block).getByRole('button', { name: 'Show models' }));
    await userEvent.click(screen.getByText('gpt-5.6-mini'));

    await waitFor(() => expect(puts).toHaveLength(1));
    const sent = (puts[0] as { providers: { id: string; capabilities?: { contextTokens?: number } }[] }).providers;
    expect(sent.map(r => r.id)).toEqual(['openai/gpt-5.6-mini', 'openai/gpt-4o-mini']);
    // The other row is untouched, capabilities and all.
    expect(sent[1]!.capabilities?.contextTokens).toBe(128000);
  });

  test('the default and the routes follow the model that was actually on the block', async () => {
    // The block shows the model that ANSWERS. Deriving the old id here as
    // "the vendor's first loaded" instead disagreed with it, and left the
    // default naming a model that had just been renamed away.
    const mini: ProviderInfo = { ...openai, id: 'openai/gpt-4o-mini' };
    const defaulted: SettingsView = {
      ...withRow,
      registry: {
        ...view.registry,
        default: 'openai/gpt-4o-mini',
        providers: [{ id: 'openai/gpt-4o-mini' }],
        tasks: { review: { prefer: 'openai/gpt-4o-mini' } },
      },
      // `openai/gpt-5.6` loads FIRST and is not the default.
      effective: { ...view.effective, default: 'openai/gpt-4o-mini', providers: [openai, mini] },
    };
    installWithModels(() => json({ models: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }], source: 'list' }), defaulted);
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getAllByLabelText('OpenAI model').length).toBeGreaterThan(0));
    // The row the file names is the one with a block to edit.
    const block = modelField('OpenAI model', 'gpt-4o-mini').closest('.v2-yours-model') as HTMLElement;
    await userEvent.click(within(block).getByRole('button', { name: 'Show models' }));
    await userEvent.click(screen.getByText('gpt-5.6-mini'));

    await waitFor(() => expect(puts).toHaveLength(1));
    const body = puts[0] as { default: string; providers: { id: string }[]; tasks: Record<string, { prefer?: string }> };
    expect(body.providers.map(r => r.id)).toEqual(['openai/gpt-5.6-mini']);
    expect(body.default).toBe('openai/gpt-5.6-mini');
    expect(body.tasks['review']?.prefer).toBe('openai/gpt-5.6-mini');
  });

  test('a listing that failed is the runtime\'s sentence under the field, and the id is still typeable', async () => {
    installWithModels(() => json({ models: [], source: 'list', error: 'No key for OpenAI yet.' }));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByText('No key for OpenAI yet.')).toBeTruthy());
    const user = userEvent.setup({ document });
    const model = screen.getByLabelText('OpenAI model') as HTMLInputElement;
    await user.clear(model);
    await user.type(model, 'gpt-7');
    // A model the list does not carry is committed when the field is left,
    // not on every keystroke — one save, and it says `gpt-7`.
    expect(puts).toHaveLength(0);
    await user.click(screen.getByRole('heading', { name: 'Task routes' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect((puts[0] as { providers: { id: string }[] }).providers[0]!.id).toBe('openai/gpt-7');
  });

  test('a local runner row lists from its base URL', async () => {
    const { listed } = installWithModels(() => json({ models: [{ id: 'qwen3:32b' }], source: 'list' }));
    const lmstudio: ProviderInfo = { ...fakeProvider, id: 'lmstudio/qwen3:32b', auth: 'apikey', locality: 'local' };
    const local: SettingsView = {
      ...view,
      registry: { ...view.registry, providers: [{ id: 'lmstudio/qwen3:32b', baseURL: 'http://127.0.0.1:1234/v1' }] },
      effective: { ...view.effective, providers: [fakeProvider, lmstudio] },
    };
    globalThis.fetch = ((orig: typeof fetch) => (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/settings' && (init?.method ?? 'GET') === 'GET') return json(local);
      return orig(input, init);
    }) as unknown as typeof fetch)(globalThis.fetch);
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(listed).toEqual(['/providers/lmstudio/models?baseURL=http%3A%2F%2F127.0.0.1%3A1234%2Fv1']));
  });
});

describe('the enterprise vendors in Settings (providers spec §3 step 5)', () => {
  test('the picker lists them under Hosted API · enterprise; adding one prefills the row with its field set and defaults, no key variable', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await openCatalog();
    const user = userEvent.setup({ document });
    await user.type(await openCatalog(), 'Hosted API · enterprise · Google Vertex AI');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('link', { name: 'How to set up Google Vertex AI' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const ids = screen.getAllByLabelText('Id') as HTMLInputElement[];
    expect(ids.map(el => el.value)).toContain('vertex/');
    // The field set sits under the row: project empty, location defaulted.
    expect((screen.getByLabelText('Project') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Location') as HTMLInputElement).value).toBe('us-central1');
    // The provider gets its block at once, with its field set on it — the
    // fields are what tell the listing where to ask, so they come before
    // the model. (This runtime has no secret store, so the credentials line
    // says so rather than offering a paste.)
    const block = within(screen.getByRole('list', { name: 'Providers you can use' }))
      .getAllByRole('listitem')
      .find(li => (li.textContent ?? '').includes('Vertex'))!;
    expect(within(block).getByText(/not set up yet/)).toBeTruthy();
    expect(within(block).getByLabelText('Project')).toBeTruthy();
    expect(within(block).getByText(/fill in the fields above and save this provider/)).toBeTruthy();
    // No secret input is drawn, and no key-variable field for this row.
    expect(screen.queryByLabelText('Service account JSON (optional)')).toBeNull();
    expect(puts).toHaveLength(0);
  });
});

describe('the Task field (routing-and-evals spec §3)', () => {
  test('offers the closed taxonomy and still takes a typed name', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Task')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Show tasks' }));
    const listed = Array.from(document.querySelectorAll('.v2-combo-item'), el => el.textContent);
    expect(listed).toEqual(['review', 'redline', 'draft', 'research', 'extract', 'summarize', 'compare', 'remember', 'docket', 'retro', 'chat']);
    await userEvent.click(screen.getByText('redline'));
    await waitFor(() => expect(document.querySelector('.v2-combo-pop')).toBeNull());
    const field = screen.getByLabelText('Task') as HTMLInputElement;
    expect(field.value).toBe('redline');

    const user = userEvent.setup({ document });
    await user.clear(field);
    await user.type(field, 'classify');
    expect(field.value).toBe('classify');
  });
});

describe('SettingsPage, adding a provider (the founder’s "it’s unclear what to do")', () => {
  test('the common providers are named, and one click adds one', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('list', { name: 'Providers you can use' })).toBeTruthy());
    const before = screen.getAllByLabelText('Id').length;

    // No typing, no second button: the thing the page most wants you to do
    // is one click.
    await userEvent.click(screen.getByRole('button', { name: /OpenAI/ }));

    const ids = (screen.getAllByLabelText('Id') as HTMLInputElement[]).map(el => el.value);
    expect(ids).toHaveLength(before + 1);
    expect(ids).toContain('openai/');
    // Nothing was saved: a provider is set up on its block first.
    expect(puts).toHaveLength(0);
    // And it drops off the offer list, so every remaining choice is one you
    // can actually make.
    expect(screen.queryByRole('button', { name: /^OpenAI/ })).toBeNull();
  });

  test('a blank row can be TYPED into, one field, one focus', async () => {
    // The block used to be keyed on the row's prefix, which changes with
    // every keystroke in an Id field — so the block remounted and dropped
    // focus after each character. Setting the value in one go hid it, which
    // is why the suite missed it.
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await openCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'or add a blank row' }));

    const user = userEvent.setup({ document });
    const ids = screen.getAllByLabelText('Id') as HTMLInputElement[];
    const blank = ids[ids.length - 1]!;
    await user.click(blank);
    await user.keyboard('openai/gpt-5.6');

    const after = screen.getAllByLabelText('Id') as HTMLInputElement[];
    expect(after[after.length - 1]!.value).toBe('openai/gpt-5.6');
    expect(document.activeElement).toBe(after[after.length - 1]!);
  });

  test('a second row of a vendor you have is still editable and removable', async () => {
    // Folding by vendor hid it entirely: no fields, no Remove, and its
    // errors had nowhere to render — Save refused with nothing marked.
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await openCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'or add a blank row' }));
    await userEvent.click(screen.getByRole('button', { name: 'or add a blank row' }));

    expect(screen.getAllByLabelText('Id')).toHaveLength(3);
    // Scoped to the providers: a task route has a Remove of its own.
    const list = screen.getByRole('list', { name: 'Providers you can use' });
    expect(within(list).getAllByRole('button', { name: /^Remove / })).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByText('id is required')).toHaveLength(2));
    expect(puts).toHaveLength(0);
  });
});
