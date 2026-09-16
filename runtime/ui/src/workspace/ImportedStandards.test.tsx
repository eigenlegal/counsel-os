import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ImportedStandards } from './ImportedStandards';
import { DocumentReader } from './DocumentReader';
import type { Snapshot } from './api';

const originalFetch = globalThis.fetch;
const data = { profile: { name: 'Synthetic Reviewer', revisionId: 'profile-version' } } as Snapshot;
const records = [{ id: 'one', revisionId: 'one-v1', title: 'Written notices', preview: 'Keep written notices.', category: 'language' }, { id: 'two', revisionId: 'two-v1', title: 'Review changes', preview: 'Keep proposed changes separate.', category: 'method' }];
let calls: Array<{ path: string; body?: any }>, result: unknown, postError: boolean;
beforeEach(() => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); calls = []; postError = false;
  result = { records, total: 2, page: 0, hasMore: false };
  globalThis.fetch = (async (url, init) => {
    const path = String(url), body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body });
    if (body) {
      if (postError) return Response.json({ error: 'Nothing was adopted. Reload and review again.' }, { status: 409 });
      const previous = result as { records: typeof records; total: number; page: number; hasMore: boolean };
      result = { ...previous, records: previous.records.filter(item => !body.selections.some((selected: { id: string }) => selected.id === item.id)), total: previous.total - body.selections.length };
      return Response.json({ adopted: body.selections.length });
    }
    if (path.includes('knowledge-revisions')) return Response.json({ id: 'one-v1', body: '## Our standard\nKeep **written notices**.' });
    return Response.json(result);
  }) as typeof fetch;
});
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const open = (overrides: Partial<Parameters<typeof ImportedStandards>[0]> = {}) => render(<ImportedStandards data={data} close={() => {}} saved={() => {}} setupProfile={() => {}} {...overrides} />);

test('starts unselected; reading and canceling never approve, full text loads only on request', async () => {
  let closed = false; open({ close: () => { closed = true; } });
  await screen.findByLabelText('Written notices');
  expect(screen.getByRole('button', { name: 'Approve items' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getAllByRole('checkbox').every((c: HTMLElement) => !(c as HTMLInputElement).checked)).toBe(true);
  expect(calls).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Read Written notices' }));
  expect(await screen.findByRole('heading', { name: 'Our standard' })).toBeTruthy();
  expect(calls[1]?.path).toBe('/api/workspace/knowledge-revisions/one-v1');
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  expect(closed).toBe(true); expect(calls.some(call => call.body)).toBe(false);
});

test('selection plus explicit confirmation pins exactly the selected revisions and current identity', async () => {
  let adopted = 0; open({ saved: n => { adopted = n; } });
  fireEvent.click(await screen.findByLabelText('Written notices'));
  const adopt = screen.getByRole('button', { name: 'Approve 1 item' });
  expect(adopt.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByLabelText('Use the selected material in my practice.'));
  fireEvent.click(adopt);
  await waitFor(() => expect(adopted).toBe(1));
  expect(calls.find(call => call.body)).toEqual({ path: '/api/workspace/practice-library/adopt', body: { selections: [{ id: 'one', expectedRevisionId: 'one-v1' }], expectedProfileRevisionId: 'profile-version', confirm: true } });
  expect(await screen.findByText('1 imported item awaiting approval')).toBeTruthy();
  expect(screen.queryByLabelText('Written notices')).toBeNull();
  expect(screen.getByLabelText('Review changes')).toBeTruthy();
  expect(screen.getByRole('dialog', { name: 'Review imported material' })).toBeTruthy();
  expect(screen.getByText('Method: working guidance')).toBeTruthy();
});

test('finishing the last batch leaves a clear completion state with no disabled approval controls', async () => {
  open();
  fireEvent.click(await screen.findByLabelText('Select this page'));
  expect(screen.getByText('Reusable language: starting text')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Use the selected material in my practice.'));
  fireEvent.click(screen.getByRole('button', { name: 'Approve 2 items' }));
  expect(await screen.findByText(/No unchanged imported material remains/)).toBeTruthy();
  expect(screen.getByText('0 imported items awaiting approval')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Close', exact: true })).toBeTruthy();
});

test('changing selection clears confirmation and stale batches require a fresh review', async () => {
  postError = true; open();
  fireEvent.click(await screen.findByLabelText('Written notices'));
  const confirmation = screen.getByLabelText('Use the selected material in my practice.') as HTMLInputElement;
  fireEvent.click(confirmation); fireEvent.click(screen.getByLabelText('Review changes'));
  expect(confirmation.checked).toBe(false);
  fireEvent.click(confirmation); fireEvent.click(screen.getByRole('button', { name: 'Approve 2 items' }));
  expect(await screen.findByText('Nothing was adopted. Reload and review again.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Approve items' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getAllByRole('checkbox').every((c: HTMLElement) => !(c as HTMLInputElement).checked)).toBe(true);
});

test('select this page does not imply unseen records are selected and paging clears the selection', async () => {
  result = { records, total: 53, page: 0, hasMore: true }; open();
  fireEvent.click(await screen.findByLabelText('Select this page'));
  expect(screen.getByText('2 selected')).toBeTruthy();
  result = { records: [records[0]], total: 53, page: 1, hasMore: false };
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('Page 2')).toBeTruthy());
  expect(screen.getByText('0 selected')).toBeTruthy();
  expect(calls.at(-1)?.path).toBe('/api/workspace/practice-library/imported-standards?page=1');
});

test('missing profile blocks adoption and provides a setup action', async () => {
  let setup = false; open({ data: { ...data, profile: null }, setupProfile: () => { setup = true; } });
  fireEvent.click(await screen.findByLabelText('Written notices'));
  expect(screen.queryByLabelText('Use the selected material in my practice.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Approve 1 item' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Set up profile' })); expect(setup).toBe(true);
});

test('exported status is folded into metadata while exact saved text remains available', () => {
  const text = '# Synthetic\n\nSaved review status: pending. Re-import does not carry over approval.\nSaved version: 1\n\n# Synthetic\n\n## Our position\nUse **written notices**. <img src="https://invalid.example/pixel">';
  const view = render(<DocumentReader text={text} markdown />);
  expect(screen.getByRole('heading', { name: 'Our position' })).toBeTruthy();
  expect(view.container.querySelector('.document-markdown')?.textContent).not.toContain('Saved review status');
  expect(view.container.querySelector('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Saved text' }));
  expect(view.container.querySelector('.record-prose')?.textContent).toBe(text);
});
