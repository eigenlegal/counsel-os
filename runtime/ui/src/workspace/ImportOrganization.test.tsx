import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ImportOrganization } from './ImportOrganization';
import { ImportChoice } from '../../../src/workspace/import-types';
import type { Snapshot } from './api';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const data = { matters: [], connection: { ready: true, label: 'Synthetic connection', config: { kind: 'codex', model: 'synthetic' } } } as unknown as Snapshot;
const before = ImportChoice.parse({ title: 'A file', destination: 'source' });
const result = { revisionId: 'revision', sharedMatters: [], suggestions: ['high', 'low'].map((confidence, i) => ({
  entryId: `entry-${i}`, path: `${i}.txt`, before, choice: { ...before, collection: 'external' },
  confidence, reason: 'This is third-party research.', evidenceQuote: 'Source text.', partial: true,
})) };
function setup(mode: 'bulk' | 'suggest', options: { saveError?: boolean } = {}) {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const calls: Array<{ path: string; body: any }> = [];
  let saved = 0, closed = 0;
  globalThis.fetch = (async (path: string, init: RequestInit) => {
    calls.push({ path, body: JSON.parse(String(init.body)) });
    return path.endsWith('/organize') ? Response.json(result)
      : options.saveError ? Response.json({ error: 'This import changed in another window.' }, { status: 409 }) : Response.json({});
  }) as typeof fetch;
  render(<ImportOrganization batchId="batch" revisionId="revision" entryIds={['entry-0', 'entry-1']} mode={mode} data={data}
    close={() => { closed++; }} saved={() => { saved++; }} />);
  return { calls, state: () => ({ saved, closed }) };
}
test('AI help requires an explicit run and a separate save; low-confidence rows stay unselected', async () => {
  const view = setup('suggest');
  expect(view.calls).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Generate suggestions' }));
  await screen.findByRole('button', { name: 'Save 1 suggested choices' });
  expect((screen.getByRole('checkbox', { name: '1.txt' }) as HTMLInputElement).checked).toBe(false);
  expect(view.calls).toHaveLength(1);
  expect(view.calls[0]!.body.shareForSuggestions).toBe(true);
  expect(view.state()).toEqual({ saved: 0, closed: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Save 1 suggested choices' }));
  await waitFor(() => expect(view.state().saved).toBe(1));
  expect(view.calls[1]!.body).toEqual({ expectedRevisionId: 'revision', changes: [{ entryId: 'entry-0', choice: result.suggestions[0]!.choice }] });
});
test('bulk organization changes only selected fields and does not make an AI request', async () => {
  const view = setup('bulk');
  expect((screen.getByRole('button', { name: 'Update import choices' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole('combobox', { name: 'Bulk import destination' }), { target: { value: 'external' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update import choices' }));
  await waitFor(() => expect(view.state().saved).toBe(1));
  expect(view.calls).toEqual([{ path: '/api/workspace/imports/batch/bulk', body: {
    expectedRevisionId: 'revision', entryIds: ['entry-0', 'entry-1'], patch: { destination: 'source', collection: 'external' },
  } }]);
});
test('stale review errors retain the choices without closing, refreshing their base or importing', async () => {
  const view = setup('suggest', { saveError: true });
  fireEvent.click(screen.getByRole('button', { name: 'Generate suggestions' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Save 1 suggested choices' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed in another window'));
  expect(view.state()).toEqual({ saved: 0, closed: 0 });
  expect(screen.getByRole('checkbox', { name: '0.txt' })).toBeTruthy();
  expect(view.calls).toHaveLength(2);
});
