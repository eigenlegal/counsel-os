import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ModelField, ModelPicker } from './ModelPicker';
import type { ModelChoice } from './api';

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
function catalog(kind: 'codex' | 'claude-code', id: string, label: string) {
  const calls: string[] = [];
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url: string, options: RequestInit) => {
    calls.push(String(url));
    expect(String(url)).toContain('/connection/models');
    expect(JSON.parse(String(options.body))).toEqual({ kind });
    return Response.json({ kind, models: [{ id, label }], source: kind === 'codex' ? 'cli-bundled' : 'cli-aliases', note: 'Metadata only; account access is not verified.' });
  }) as typeof fetch;
  return calls;
}

test('loading Astra in the shared Settings/chat field preserves the current model and exact-ID escape hatch', async () => {
  const calls = catalog('codex', 'gpt-6-astra', 'GPT-6-Astra');
  const changes: string[] = [];
  render(<ModelField kind="codex" value="gpt-5.6-sol" onChange={value => changes.push(value)} />);
  expect(calls).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Load model choices' }));
  await screen.findByRole('option', { name: 'GPT-6-Astra' });
  expect((screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement).value).toBe('gpt-5.6-sol');
  expect(changes).toEqual([]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Model' }), { target: { value: 'gpt-6-astra' } });
  expect(changes).toEqual(['gpt-6-astra']);
  expect(screen.getByRole('option', { name: 'Enter an exact model ID…' })).toBeTruthy();
  expect(calls).toHaveLength(1);
});

test('Fable stays opt-in and an explicit chat choice retains the existing Claude billing method', async () => {
  const calls = catalog('claude-code', 'fable', 'Fable');
  const config = { kind: 'claude-code' as const, model: 'sonnet', claudeBilling: 'subscription' as const };
  const saved: Array<ModelChoice | null> = [];
  let closed = false;
  render(<ModelPicker config={config} label="Claude Code" choice={null} onClose={() => { closed = true; }} onSave={async value => { saved.push(value); }} />);
  await screen.findByRole('option', { name: 'Fable' });
  const select = screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement;
  expect(select.disabled).toBe(true);
  expect(select.value).toBe('sonnet');
  expect(saved).toEqual([]);
  expect(screen.getByText(/Claude Code may apply its own model fallback/)).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox', { name: /Use workspace default/ }));
  fireEvent.change(select, { target: { value: 'fable' } });
  fireEvent.click(screen.getByRole('button', { name: 'Use for this chat' }));
  await waitFor(() => expect(closed).toBe(true));
  expect(saved).toEqual([{ kind: 'claude-code', model: 'fable', claudeBilling: 'subscription' }]);
  expect(config.model).toBe('sonnet');
  expect(calls).toHaveLength(1);
});
