import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, userEvent } from '../test/dom';
import { MatterPicker } from './MatterPicker';
const fetchOriginal = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = fetchOriginal; });
test('picker opens on search, waits for current results, preserves cancellation and chooses exact ids with the keyboard', async () => {
  sessionStorage.setItem('counsel-os.token', 'synthetic');
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return Response.json({ total: 1, items: [{ id: 'synthetic-id', title: 'Synthetic long matter name', kind: 'advisory', createdAt: '2026-01-01', activityAt: '2026-01-01', status: 'open' }] });
  }) as typeof fetch;
  let selected = 'conversation';
  render(<MatterPicker value="conversation" matters={[]} onChange={value => { selected = value; }} label="Conversation context"
    choices={[{ value: 'conversation', label: 'This conversation' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Conversation context' }));
  const input = screen.getByRole('combobox', { name: 'Search matters' });
  await userEvent.setup({ document }).type(input, 'Synthetic');
  expect(screen.queryByRole('option', { name: 'Synthetic long matter name' })).toBeNull();
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(selected).toBe('conversation');
  await waitFor(() => expect(screen.getByRole('option', { name: 'Synthetic long matter name' })).toBeTruthy());
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(selected).toBe('synthetic-id');
  expect(calls.every(url => url.startsWith('/api/workspace/matters/picker?'))).toBe(true);
});
