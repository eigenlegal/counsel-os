import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import type { SettingsView } from '../api/types';
import { ProvidersForm } from './ProvidersForm';

const view: SettingsView = {
  file: '/home/jack/.counsel-os/providers.yaml',
  registry: {
    default: 'claude-sub/claude-opus-5',
    stepTimeoutMs: 120000,
    providers: [{ id: 'openai/gpt-5.6', apiKeyEnv: 'OPENAI_API_KEY' }],
  },
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
let calls: { url: string; method?: string; body: unknown }[] = [];

function respond(status: number, body: unknown): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      ...(init?.method === undefined ? {} : { method: init.method }),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('ProvidersForm', () => {
  test('is bound to the registry file, not to the effective runtime', () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    expect((screen.getByLabelText('Default provider') as HTMLInputElement).value).toBe('claude-sub/claude-opus-5');
    expect((screen.getByLabelText('Step timeout (ms)') as HTMLInputElement).value).toBe('120000');
    // The configured provider is in the form; the built-in that appears in
    // no file is NOT — writing it back would put it in the operator's YAML.
    expect((screen.getByLabelText('Id') as HTMLInputElement).value).toBe('openai/gpt-5.6');
  });

  test('submits the edited registry and adopts what the server answers', async () => {
    const saved: SettingsView[] = [];
    render(<ProvidersForm view={view} onSaved={next => saved.push(next)} />);

    // `userEvent.setup({ document })`, not the bare `userEvent.clear`: the
    // direct API infers its document from the element it is given, and
    // `clear` is the one call that is not given one — so it looks for a
    // global that happy-dom installs later than user-event reads it.
    const user = userEvent.setup({ document });
    await user.type(screen.getByLabelText('baseURL'), 'https://api.example.com/v1');
    await user.clear(screen.getByLabelText('Step timeout (ms)'));
    await user.type(screen.getByLabelText('Step timeout (ms)'), '90000');

    const answer: SettingsView = {
      ...view,
      registry: {
        default: 'claude-sub/claude-opus-5',
        stepTimeoutMs: 90000,
        providers: [{ id: 'openai/gpt-5.6', baseURL: 'https://api.example.com/v1', apiKeyEnv: 'OPENAI_API_KEY' }],
      },
    };
    respond(200, answer);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.url).toBe('/settings');
    expect(calls[0]!.method).toBe('PUT');
    expect(calls[0]!.body).toEqual({
      default: 'claude-sub/claude-opus-5',
      stepTimeoutMs: 90000,
      providers: [{ id: 'openai/gpt-5.6', baseURL: 'https://api.example.com/v1', apiKeyEnv: 'OPENAI_API_KEY' }],
    });
    await waitFor(() => expect(screen.getByText('Saved.')).toBeTruthy());
    expect(saved).toHaveLength(1);
  });

  test('a 422 is shown inline and the edits stay on screen', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    respond(422, { error: 'openai-compatible provider needs a baseURL' });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('openai-compatible provider needs a baseURL')).toBeTruthy());
    // Nothing was lost: the form still holds what the operator typed.
    expect((screen.getByLabelText('Id') as HTMLInputElement).value).toBe('openai/gpt-5.6');
    expect(screen.queryByText('Saved.')).toBeNull();
  });

  test('a 400 puts each issue under the field it names', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    respond(400, {
      error: 'invalid request body',
      issues: [
        {
          path: ['providers', 0, 'baseURL'],
          message: 'baseURL must be https://, or http:// to a loopback host (127.0.0.1, localhost, [::1])',
        },
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText(/baseURL must be https/)).toBeTruthy());
    const field = screen.getByLabelText('baseURL').closest('.field');
    expect(field?.querySelector('.field-error')?.textContent).toContain('baseURL must be https');
  });

  test('a provider row with no id is caught before the request goes out', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('id is required')).toBeTruthy());
    expect(calls).toHaveLength(0);
  });

  test('task JSON that will not parse is reported inline, not sent', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    // `{{` is user-event's escape for a literal brace — `{` alone starts a
    // key descriptor.
    await userEvent.setup({ document }).type(screen.getByLabelText('Task routes (JSON)'), '{{not json');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText(/not valid JSON/)).toBeTruthy());
    expect(calls).toHaveLength(0);
  });

  test('rows can be added and removed', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    expect(screen.getAllByLabelText('Id')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    expect(screen.getAllByLabelText('Id')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Remove provider 2' }));
    expect(screen.getAllByLabelText('Id')).toHaveLength(1);
  });

  test('a default that names no loaded provider gets a note under it', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    expect(screen.queryByText(/No loaded provider is called/)).toBeNull();

    const user = userEvent.setup({ document });
    await user.clear(screen.getByLabelText('Default provider'));
    await user.type(screen.getByLabelText('Default provider'), 'openai/not-loaded');

    expect(screen.getByText(/No loaded provider is called/)).toBeTruthy();
  });

  test('Test asks before it spends a call, then shows the result', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    // The warning is on the page, not in a dialog nothing can drive.
    expect(screen.getByText('This uses one call on claude-sub/claude-opus-5.')).toBeTruthy();
    expect(calls).toHaveLength(0);

    respond(200, { ok: true, usage: { inputTokens: 12, outputTokens: 3 }, ms: 640 });
    await userEvent.click(screen.getByRole('button', { name: 'Run the test' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('ok'));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/settings/test');
    expect(calls[0]!.body).toEqual({ provider: 'claude-sub/claude-opus-5' });
    expect(screen.getByRole('status').textContent).toContain('640 ms');
    expect(screen.getByRole('status').textContent).toContain('12 in / 3 out');
  });

  test('Cancel on the confirm spends nothing', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    respond(200, { ok: true, ms: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(calls).toHaveLength(0);
    expect(screen.queryByText(/This uses one call/)).toBeNull();
  });

  test('a provider that does not work is a result, not an error', async () => {
    render(<ProvidersForm view={view} onSaved={() => {}} />);
    respond(200, { ok: false, error: 'ANTHROPIC_API_KEY is not set', ms: 12 });

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Run the test' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('failed'));
    expect(screen.getByRole('status').textContent).toContain('ANTHROPIC_API_KEY is not set');
  });
});
