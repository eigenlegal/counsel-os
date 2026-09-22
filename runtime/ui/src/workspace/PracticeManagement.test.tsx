import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { RecordActions } from './RecordActions';
import { RecordTrash } from './RecordTrash';
import { PracticeFiling } from './PracticeFiling';
import type { Snapshot } from './api';

const originalFetch = globalThis.fetch;
let calls: Array<{ path: string; body?: any }>, fail: boolean;
const impact = { kind: 'knowledge', id: 'report', title: 'Synthetic retrospective', state: 'active', version: 'a'.repeat(64), inUse: false, fileCount: 0,
  retained: [{ kind: 'source', id: 'original', title: 'Original report' }] };
beforeEach(() => {
  calls = []; fail = false; sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url, init) => {
    const path = String(url), body = init?.body ? JSON.parse(String(init.body)) : undefined; calls.push({ path, body });
    if (body) return fail ? Response.json({ error: 'This record changed. Reopen the action.' }, { status: 409 }) : Response.json({ sourceId: 'original' });
    if (path.includes('/trash?')) return Response.json({ records: [], total: 0, hasMore: false });
    return Response.json(impact);
  }) as typeof fetch;
});
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });

test('practice Trash describes separate originals and only changes the confirmed item', async () => {
  let changed = false; render(<RecordActions kind="knowledge" id="report" changed={() => { changed = true; }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
  expect(await screen.findByText('Synthetic retrospective')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Original report/ }).getAttribute('href')).toContain('references');
  expect(screen.getByText(/All versions of this item will leave Practice/)).toBeTruthy();
  expect(calls.some(c => c.body)).toBe(false);
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  await waitFor(() => expect(changed).toBe(true));
  expect(calls.find(c => c.body)).toEqual({ path: '/api/workspace/knowledge/report/manage', body: { action: 'trash', expectedVersion: impact.version, confirm: true } });
});

test('filing requires a destination and confirmation, retaining stale errors without claiming success', async () => {
  let filed = ''; render(<PracticeFiling id="report" data={{ matters: [] } as unknown as Snapshot} filed={id => { filed = id; }} />);
  fireEvent.click(screen.getByRole('button', { name: 'File as document' }));
  await screen.findByText('Synthetic retrospective');
  expect(screen.getByRole('button', { name: 'File document and remove guidance' }).hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('File in'), { target: { value: 'practice' } });
  fail = true;
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  expect(await screen.findByText('This record changed. Reopen the action.')).toBeTruthy();
  expect(filed).toBe('');
  expect(calls.find(c => c.body)).toEqual({ path: '/api/workspace/knowledge/report/file-document', body: { destination: 'practice', matterId: null, expectedVersion: impact.version, confirm: true } });
});

test('filing as a reference opens the filed document, and cancel never files', async () => {
  let filed = ''; render(<PracticeFiling id="report" data={{ matters: [] } as unknown as Snapshot} filed={id => { filed = id; }} />);
  fireEvent.click(screen.getByRole('button', { name: 'File as document' })); await screen.findByText('Synthetic retrospective');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true })); expect(calls.some(c => c.body)).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'File as document' })); await screen.findByText('Synthetic retrospective');
  fireEvent.change(screen.getByLabelText('File in'), { target: { value: 'external' } });
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  await waitFor(() => expect(filed).toBe('original'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Trash provides a separate Practice items view', async () => {
  render(<RecordTrash changed={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Practice items' }));
  await waitFor(() => expect(calls.some(c => c.path.includes('/trash?kind=knowledge'))).toBe(true));
  expect(await screen.findByRole('heading', { name: 'Nothing here' })).toBeTruthy();
});
