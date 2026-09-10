import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ImportBackgroundOrganization, organizationRequest } from './ImportBackgroundOrganization';
import { ImportChoice } from '../../../src/workspace/import-types';
import type { ImportBatch } from '../../../src/workspace/import-types';
import type { OrganizationJob } from '../../../src/workspace/import-organization-job-types';
import type { Snapshot } from './api';

const original = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = original; });
const batch = { id: 'batch', revisionId: 'batch-version' } as ImportBatch;
const data = { connection: { ready: true, label: 'Fixture connection', config: { kind: 'codex', model: 'fixture-model' } } } as Snapshot;
const before = ImportChoice.parse({ title: 'File', destination: 'source' });
function fixture(options: { status?: OrganizationJob['status']; absent?: boolean; failure?: boolean } = {}) {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  let job = options.absent ? null : { revisionId: 'job-version', status: options.status ?? 'complete', message: 'Saved progress',
    request: { requestId: 'request', expectedRevisionId: 'batch-version', modelChoice: { kind: 'codex', model: 'fixture-model' }, shareForSuggestions: true, instruction: '' },
    createdAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z', calls: 1, analyzed: 3, eligible: 3, waiting: 0,
    skipped: 0, high: 1, attention: 2, applied: 0, total: 3, offset: 0,
    suggestions: [
      { entryId: 'first', path: 'Downloads/scan.txt', before, choice: { ...before, matterTitle: 'Acme NDA' }, reason: 'The content identifies this NDA.', confidence: 'high', evidenceQuote: 'Acme NDA', partial: true, sharedMatters: [], sharedGroups: [], applied: false, stale: false },
      { entryId: 'second', path: 'company.txt', before, choice: before, reason: 'Company background, no deal identified.', confidence: 'low', evidenceQuote: 'Acme company background', partial: false, sharedMatters: [], sharedGroups: [], applied: false, stale: false },
      { entryId: 'third', path: 'edited.txt', before, choice: before, reason: 'Earlier suggestion', confidence: 'high', evidenceQuote: 'Earlier', partial: false, sharedMatters: [], sharedGroups: [], applied: false, stale: true },
    ] } as OrganizationJob | null;
  const calls: Array<{ path: string; body: unknown }> = [];
  globalThis.fetch = (async (url, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string), path = String(url); calls.push({ path, body });
      if (options.failure) return Response.json({ error: 'This review changed. Reload before applying suggestions.' }, { status: 409 });
      if (path.endsWith('-apply') && job) job = { ...job, high: 0, applied: 1, suggestions: job.suggestions.map(item => item.entryId === 'first' ? { ...item, applied: true } : item) };
    }
    return Response.json(job);
  }) as typeof fetch;
  render(<ImportBackgroundOrganization batch={batch} data={data} changed={() => {}} />);
  return calls;
}
test('whole-batch clear suggestions are explicit; uncertainty and edited choices are not silently applied', async () => {
  const calls = fixture();
  fireEvent.click(await screen.findByRole('button', { name: 'Review organization' }));
  expect(calls).toHaveLength(0);
  expect((screen.getByRole('checkbox', { name: 'company.txt' }) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('checkbox', { name: 'edited.txt' }) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText('Confidence: high · Partial excerpt')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Apply 1 clear suggestions' }));
  await waitFor(() => expect(calls).toHaveLength(1));
  expect(calls[0]).toEqual({ path: '/api/workspace/imports/batch/organization-apply', body: {
    expectedRevisionId: 'job-version', expectedBatchRevisionId: 'batch-version', selection: 'high' } });
  expect(calls.every(call => !call.path.endsWith('/commit'))).toBe(true);
});
test('active background jobs can be paused but cannot be applied while running', async () => {
  const calls = fixture({ status: 'running' });
  const button = await screen.findByRole('button', { name: 'Pause organization' });
  expect((screen.getByRole('button', { name: 'Review organization' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button);
  await waitFor(() => expect(calls[0]?.body).toEqual({ expectedRevisionId: 'job-version', action: 'pause' }));
});
test('stale review keeps the modal and choices visible without importing', async () => {
  const calls = fixture({ failure: true });
  fireEvent.click(await screen.findByRole('button', { name: 'Review organization' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply 1 clear suggestions' }));
  await waitFor(() => expect(screen.getAllByText('This review changed. Reload before applying suggestions.').length).toBeGreaterThan(0));
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(calls).toHaveLength(1);
});
test('new organization pins the configured model and discloses AI use; no ready connection keeps manual intake available', () => {
  const request = organizationRequest(batch, data, 'Keep the matters separate.');
  expect(request.modelChoice).toEqual({ kind: 'codex', model: 'fixture-model' });
  expect(request.shareForSuggestions).toBe(true); expect(request.instruction).toBe('Keep the matters separate.');
  expect(() => organizationRequest(batch, { connection: { ready: false } } as Snapshot)).toThrow('manually');
});
