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
function fixture(options: { status?: OrganizationJob['status']; absent?: boolean; failure?: boolean; readFailure?: boolean; states?: string[]; legacy?: boolean; rejected?: boolean } = {}) {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  let job = options.absent ? null : { revisionId: 'job-version', status: options.status ?? 'complete', message: 'Saved progress',
    request: { requestId: 'request', expectedRevisionId: 'batch-version', modelChoice: { kind: 'codex', model: 'fixture-model' }, shareForSuggestions: true, instruction: '' },
    createdAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z', calls: 1, analyzed: 3, eligible: 3, waiting: 0,
    skipped: 0, high: options.legacy ? 1 : 0, attention: options.rejected ? 2 : 1, applied: options.legacy ? 0 : 1, total: options.rejected ? 4 : 3, offset: 0,
    failed: options.rejected ? 1 : 0, retrying: 0, reviewed: 0, remaining: 0,
    failures: options.rejected ? [{ entryId: 'rejected', path: 'bad-response.txt', before, reason: 'The supporting excerpt could not be matched to this file.', attempts: 2, protected: false }] : [],
    summary: { matters: 1, practice: 0, external: 0, unfiled: 2, profiles: 0, groupCount: 1, groups: [{ title: 'Acme NDA', files: 1, isNew: true }] },
    suggestions: [
      { entryId: 'first', path: 'Downloads/scan.txt', before, choice: { ...before, matterTitle: 'Acme NDA' }, reason: 'The content identifies this NDA.', confidence: 'high', evidenceQuote: 'Acme NDA', partial: true, sharedMatters: [], sharedGroups: [], applied: !options.legacy, stale: false },
      { entryId: 'second', path: 'company.txt', before, choice: before, reason: 'Company background, no deal identified.', confidence: 'low', evidenceQuote: 'Acme company background', partial: false, sharedMatters: [], sharedGroups: [], applied: false, stale: false },
      { entryId: 'third', path: 'edited.txt', before, choice: before, reason: 'Earlier suggestion', confidence: 'high', evidenceQuote: 'Earlier', partial: false, sharedMatters: [], sharedGroups: [], applied: false, stale: true, reviewed: true },
    ] } as OrganizationJob | null;
  const calls: Array<{ path: string; body: unknown }> = [];
  globalThis.fetch = (async (url, init) => {
    if (options.readFailure && init?.method !== 'POST') return Response.json({ error: 'Cannot check saved progress.' }, { status: 503 });
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string), path = String(url); calls.push({ path, body });
      if (options.failure) return Response.json({ error: 'This review changed. Reload before applying suggestions.' }, { status: 409 });
      if (path.endsWith('-apply') && job) job = { ...job, high: 0, applied: 1, suggestions: job.suggestions.map(item => item.entryId === 'first' ? { ...item, applied: true } : item) };
      if (path.endsWith('-control') && job) job = { ...job, status: body.action === 'pause' ? 'paused' : 'running' };
    }
    return Response.json(job);
  }) as typeof fetch;
  render(<ImportBackgroundOrganization batch={batch} data={data} changed={() => {}} onStateChange={state => options.states?.push(state)} />);
  return calls;
}
test('retained legacy suggestions remain reviewable; uncertainty and edited choices are not silently applied', async () => {
  const calls = fixture({ legacy: true });
  fireEvent.click(await screen.findByRole('button', { name: 'Review 1 exception' }));
  expect(calls).toHaveLength(0);
  expect((screen.getByRole('checkbox', { name: 'company.txt' }) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('checkbox', { name: 'edited.txt' }) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText('Confidence: high · Partial excerpt')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Prepare 1 retained suggestions' }));
  await waitFor(() => expect(calls).toHaveLength(1));
  expect(calls[0]).toEqual({ path: '/api/workspace/imports/batch/organization-apply', body: {
    expectedRevisionId: 'job-version', expectedBatchRevisionId: 'batch-version', selection: 'high' } });
  expect(calls.every(call => !call.path.endsWith('/commit'))).toBe(true);
});
test('active background jobs can be paused but cannot be applied while running', async () => {
  const states: string[] = [];
  const calls = fixture({ status: 'running', states });
  const button = await screen.findByRole('button', { name: 'Pause and review manually' });
  expect(screen.queryByRole('button', { name: 'Review 1 exception' })).toBeNull();
  expect(screen.getByRole('progressbar', { name: 'Files analyzed for organization' }).getAttribute('value')).toBe('3');
  expect(screen.getByText(/You don’t need to do anything yet/)).toBeTruthy();
  fireEvent.click(button);
  await waitFor(() => expect(calls[0]?.body).toEqual({ expectedRevisionId: 'job-version', action: 'pause' }));
  await screen.findByRole('heading', { name: 'AI organization paused' });
  expect(states.at(-1)).toBe('paused');
  expect((screen.getByRole('button', { name: 'Review 1 exception' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Resume organization' }));
  await screen.findByRole('button', { name: 'Pause and review manually' });
  expect(states.at(-1)).toBe('running');
});
test('loading and lost progress keep editing locked; an absent job explicitly enables manual review', async () => {
  const states: string[] = [];
  fixture({ absent: true, states });
  expect(states[0]).toBe('checking');
  await waitFor(() => expect(states.at(-1)).toBe('none'));
  cleanup();
  states.length = 0;
  fixture({ readFailure: true, states });
  await waitFor(() => expect(states.at(-1)).toBe('unavailable'));
  expect((screen.getByRole('button', { name: 'Organize with Counsel' }) as HTMLButtonElement).disabled).toBe(true);
});
test('clear choices are prepared server-side; UI shows grouped filing and exceptions without another apply step', async () => {
  const calls = fixture();
  await screen.findByRole('heading', { name: 'Organization ready to review' });
  expect(screen.getByText(/Clear choices are already prepared/)).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Prepared filing summary' })).toBeTruthy();
  expect(screen.getByText('1 filing choices prepared · 1 need review · 0 remaining')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Prepare .* retained suggestions/ })).toBeNull();
  expect(calls).toHaveLength(0);
  cleanup();
  fixture({ status: 'paused' });
  await screen.findByRole('heading', { name: 'AI organization paused' });
  expect(screen.getByText(/Your prepared choices are kept/)).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});
test('stale review keeps the modal and choices visible without importing', async () => {
  const calls = fixture({ failure: true, legacy: true });
  fireEvent.click(await screen.findByRole('button', { name: 'Review 1 exception' }));
  fireEvent.click(screen.getByRole('button', { name: 'Prepare 1 retained suggestions' }));
  await waitFor(() => expect(screen.getAllByText('This review changed. Reload before applying suggestions.').length).toBeGreaterThan(0));
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(calls).toHaveLength(1);
});
test('rejected files are counted and reviewable; one action can leave all exceptions unfiled without importing', async () => {
  const calls = fixture({ rejected: true });
  fireEvent.click(await screen.findByRole('button', { name: 'Review 2 exceptions' }));
  expect(screen.getByText('bad-response.txt')).toBeTruthy();
  expect(screen.getByText(/The retry also failed/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Leave 2 exceptions unfiled' }));
  await waitFor(() => expect(calls).toHaveLength(1));
  expect(calls[0]!.body).toEqual({ expectedRevisionId: 'job-version', expectedBatchRevisionId: 'batch-version', selection: 'unfiled' });
  expect(calls[0]!.path).not.toContain('/commit');
});
test('new organization pins the configured model and discloses AI use; no ready connection keeps manual intake available', () => {
  const request = organizationRequest(batch, data, 'Keep the matters separate.');
  expect(request.modelChoice).toEqual({ kind: 'codex', model: 'fixture-model' });
  expect(request.shareForSuggestions).toBe(true); expect(request.instruction).toBe('Keep the matters separate.');
  expect(() => organizationRequest(batch, { connection: { ready: false } } as Snapshot)).toThrow('manually');
});
