import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { SourceOrganization } from './SourceOrganization';
import type { Snapshot } from './api';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const data = { matters: [], connection: { ready: true, label: 'Synthetic model', config: { kind: 'codex', model: 'fixture' } } } as unknown as Snapshot;
test('manual filing shows all selected identities and saves only after location selection and confirmation', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); const ids = Array.from({ length: 61 }, (_, i) => `s${i}`), calls: any[] = []; let saved = false;
  globalThis.fetch = (async (url, init) => {
    const input = JSON.parse(String(init?.body)); calls.push({ path: String(url), input });
    return Response.json(String(url).endsWith('/preview') ? { expectedVersion: 'version', files: ids.map(sourceId => ({ sourceId, title: sourceId })) } : {});
  }) as typeof fetch;
  render(<SourceOrganization sourceIds={ids} mode="manual" data={data} close={() => {}} saved={() => { saved = true; }} />);
  await screen.findByLabelText('Selected files destination');
  expect(screen.getByRole('button', { name: 'Organize 61 files' }).hasAttribute('disabled')).toBe(true);
  expect(calls).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Selected files destination'), { target: { value: 'practice' } });
  fireEvent.click(screen.getByRole('button', { name: 'Organize 61 files' }));
  await waitFor(() => expect(saved).toBe(true));
  expect(calls[1].input).toEqual({ sourceIds: ids, expectedVersion: 'version', confirmAccessChanges: true,
    changes: ids.map(sourceId => ({ sourceId, target: { collection: 'practice', matterId: null, matterTitle: null } })) });
});
test('AI suggestions require a separate save, uncertain rows stay unchecked and unfiled rows cannot be applied', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); const ids = ['one', 'two', 'three'], calls: any[] = [];
  globalThis.fetch = (async (url, init) => {
    const path = String(url), input = JSON.parse(String(init?.body)); calls.push({ path, input });
    if (path.endsWith('/preview')) return Response.json({ expectedVersion: 'version', files: ids.map(sourceId => ({ sourceId, title: sourceId })) });
    if (path.endsWith('/suggest')) return Response.json({ expectedVersion: 'version', sourceIds: ids, sharedMatters: [], suggestions: ids.map((sourceId, i) => ({ sourceId, title: sourceId,
      target: { collection: i === 2 ? 'unfiled' : 'external', matterId: null, matterTitle: null }, confidence: i === 0 ? 'high' : 'low', reason: 'Synthetic rationale', evidenceQuote: 'Exact quote', partial: true })) });
    return Response.json({});
  }) as typeof fetch;
  render(<SourceOrganization sourceIds={ids} mode="suggest" data={data} close={() => {}} saved={() => {}} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate suggestions' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Generate suggestions' }));
  const [first, second, third] = await screen.findAllByRole('checkbox');
  expect((first as HTMLInputElement).checked).toBe(true); expect((second as HTMLInputElement).checked).toBe(false);
  expect(third!.hasAttribute('disabled')).toBe(true);
  expect(calls).toHaveLength(2); expect(calls[1].input.shareForSuggestions).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Organize 1 file' }));
  await waitFor(() => expect(calls).toHaveLength(3));
  expect(calls[2].input.changes.map((item: any) => item.sourceId)).toEqual(['one']);
});
