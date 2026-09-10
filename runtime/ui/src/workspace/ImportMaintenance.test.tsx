import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ImportMaintenance } from './ImportMaintenance';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
test('duplicate review starts unselected; explicitly selecting all spans the page and submits only identities', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const posts: unknown[] = []; let saved = false;
  const items = Array.from({ length: 61 }, (_, i) => ({ entryId: `e${i}`, path: `File-${i}.txt`, sourceId: 'source', revisionId: 'revision', title: 'Original.txt', version: 1, matchingSources: 1 }));
  globalThis.fetch = (async (_url, init) => { if (init?.method === 'POST') { posts.push(JSON.parse(String(init.body))); return Response.json({}); }
    return Response.json({ expectedVersion: 'version', revisionId: 'batch-revision', items }); }) as typeof fetch;
  render(<ImportMaintenance batchId="batch" mode="duplicates" close={() => {}} saved={() => { saved = true; }} />);
  await screen.findByText('0 selected · 61 eligible');
  expect(screen.getByRole('button', { name: 'Skip 0 incoming copies' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getAllByRole('checkbox')).toHaveLength(50);
  fireEvent.click(screen.getByRole('button', { name: 'Select all eligible' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('checkbox', { name: 'Select File-60.txt' }).getAttribute('disabled')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Skip 61 incoming copies' }));
  await waitFor(() => expect(saved).toBe(true));
  expect(posts).toEqual([{ expectedVersion: 'version', entryIds: items.map(item => item.entryId) }]);
});
test('undo explains retained data and prevents selecting changed items; errors stay in the review', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); let posted: any;
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === 'POST') { posted = JSON.parse(String(init.body)); return Response.json({ error: 'Connections changed. Review again.' }, { status: 409 }); }
    return Response.json({ expectedVersion: 'version', undone: null, retainedMatterIds: ['matter'], profileRetained: true, items: [
      { entryId: 'safe', sourceId: 'one', title: 'Unused file', canUndo: true, reasons: [] },
      { entryId: 'kept', sourceId: 'two', title: 'Adopted position', canUndo: false, reasons: ['The practice item has been edited or reviewed.'] },
    ] });
  }) as typeof fetch;
  render(<ImportMaintenance batchId="batch" mode="undo" close={() => {}} saved={() => { throw new Error('Must not close'); }} />);
  await screen.findByText('Unused file');
  expect(screen.getByText(/Matters, your profile and working preferences are kept/)).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Select Adopted position' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Select all eligible' }));
  fireEvent.click(screen.getByRole('button', { name: 'Undo 1 addition' }));
  expect(await screen.findByText('Connections changed. Review again.')).toBeTruthy();
  expect(posted.entryIds).toEqual(['safe']); expect(posted.requestId).toBeTruthy();
});
