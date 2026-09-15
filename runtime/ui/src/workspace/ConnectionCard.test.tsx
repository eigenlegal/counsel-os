import { afterEach, expect, test } from 'bun:test';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';
import { ConnectionCard } from './ConnectionCard';
import type { ConnectionConfig, ConnectionStatus } from './api';

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const status: ConnectionStatus = { config: null, ready: false, label: 'Not configured', storage: 'keychain', codexInstalled: true, claudeInstalled: true, qualification: 'test-fixture' };
function fixture() {
  const calls: Array<{ path: string; body: any }> = [];
  let saved: ConnectionConfig | null = null;
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url: string, options: RequestInit) => {
    const path = String(url), body = JSON.parse(String(options.body));
    calls.push({ path, body });
    if (path.endsWith('/connection/models')) return Response.json({ kind: body.kind,
      models: [{ id: `${body.kind}-choice`, label: `${body.kind} choice` }], source: 'cli-aliases', note: 'Metadata only.' });
    if (path.endsWith('/connection/check-sign-in')) return Response.json({ installed: true, loggedIn: true, billing: 'subscription', message: 'Local account found.' });
    if (path.endsWith('/connection')) { const { apiKey, ...config } = body; saved = config; return Response.json({ ...status, config: saved, ready: true }); }
    throw new Error(`Unexpected request: ${path}`);
  }) as typeof fetch;
  function Card() {
    const [value, setValue] = useState(status);
    return <ConnectionCard status={value} onChanged={() => setValue({ ...status, config: saved, ready: !!saved })} />;
  }
  render(<Card />);
  return calls;
}

test('Settings loads subscription lists automatically and refreshes after a local sign-in check', async () => {
  const calls = fixture();
  await screen.findByRole('option', { name: 'codex choice' });
  expect(calls.map(call => call.path)).toEqual(['/api/workspace/connection/models']);
  fireEvent.change(screen.getByLabelText('AI connection'), { target: { value: 'claude-code' } });
  await screen.findByRole('option', { name: 'claude-code choice' });
  fireEvent.change(screen.getByLabelText('Model', { exact: true }), { target: { value: 'claude-code-choice' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check local sign-in' }));
  await screen.findByText(/Your local sign-in matches/);
  await waitFor(() => expect(calls.filter(call => call.path.endsWith('/models'))).toHaveLength(3));
  await screen.findByRole('option', { name: 'claude-code choice' });
  expect((screen.getByLabelText('Model', { exact: true }) as HTMLSelectElement).value).toBe('claude-code-choice');
  expect(calls.filter(call => !call.path.endsWith('/models') && !call.path.endsWith('/check-sign-in'))).toEqual([]);
});

test('API discovery waits for a saved key, then loads automatically without sending keys to model listing or testing', async () => {
  const calls = fixture();
  await screen.findByRole('option', { name: 'codex choice' });
  fireEvent.change(screen.getByLabelText('AI connection'), { target: { value: 'openai-api' } });
  await userEvent.type(screen.getByLabelText('API key'), 'synthetic-only-secret');
  expect(calls).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Save connection' }));
  await screen.findByRole('option', { name: 'openai-api choice' });
  expect(calls.map(call => call.path)).toEqual(['/api/workspace/connection/models', '/api/workspace/connection', '/api/workspace/connection/models']);
  expect(calls[1]?.body.apiKey).toBe('synthetic-only-secret');
  expect(calls[2]?.body).toEqual({ kind: 'openai-api' });
  expect((screen.getByLabelText('Model', { exact: true }) as HTMLSelectElement).value).toBe('gpt-5.6-sol');
  expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe('');
});
