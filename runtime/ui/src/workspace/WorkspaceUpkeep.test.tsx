import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { WorkspaceUpkeep } from './WorkspaceUpkeep';
import type { Snapshot } from './api';
import type { UpkeepStatus } from '../../../src/workspace/upkeep-types';

const original = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = original; sessionStorage.clear(); });
const data = { matters: [], connection: { ready: true, label: 'Synthetic connection', config: { kind: 'codex', model: 'fixture' } } } as unknown as Snapshot;
function setup(options: { stale?: boolean; many?: boolean } = {}) {
  sessionStorage.setItem('counsel-os.token', 'fixture'); const calls: Array<{ path: string; body: any }> = [];
  let dismissed = false;
  const item = { kind: 'source' as const, targetId: 'source', code: 'unfiled' as const, version: 'version', title: 'Acme NDA', detail: 'Choose a location.', checkedAt: '2026-09-08T12:00:00Z' };
  globalThis.fetch = (async (url, init) => {
    const path = String(url), body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ path, body });
    if (body) {
      if (options.stale) return Response.json({ error: 'This item changed. Refresh the check.' }, { status: 409 });
      if (path.endsWith('/decision')) dismissed = body.action === 'dismiss';
      if (path.endsWith('/preview')) return Response.json({ expectedVersion: 'v', files: [{ sourceId: 'source', title: item.title }] });
      return Response.json({});
    }
    const view = path.includes('view=dismissed'), second = path.includes('offset=50');
    return Response.json({ pending: 0, failed: 0, attention: dismissed ? 0 : 1, dismissed: dismissed ? 1 : 0,
      total: options.many ? 51 : view === dismissed ? 1 : 0, offset: second ? 50 : 0,
      items: view === dismissed ? [second ? { ...item, targetId: 'another', title: 'Another document' } : item] : [], errors: [],
      history: [{ id: 'run', reason: 'periodic', startedAt: item.checkedAt, completedAt: item.checkedAt, checked: 1 }],
    } satisfies UpkeepStatus);
  }) as typeof fetch;
  render(<WorkspaceUpkeep data={data} />); return calls;
}
async function open() { fireEvent.click(await screen.findByRole('button', { name: 'Review organization' })); await screen.findByRole('heading', { name: 'Acme NDA' }); }

test('viewing never changes records or calls AI; explicit leave-as-is and restore use exact finding versions', async () => {
  const calls = setup(); await open();
  expect(calls.every(c => c.body === undefined)).toBe(true);
  expect(screen.getByRole('button', { name: 'To review (1)' }).className).toBe('selected');
  expect(screen.getByText('These local checks cover', { exact: false })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open file' }).getAttribute('href')).toContain('id=source');
  fireEvent.click(screen.getByRole('button', { name: 'Leave as is' }));
  await waitFor(() => expect(calls.filter(c => c.body)).toHaveLength(1));
  expect(calls.find(c => c.body)!.body).toEqual({ kind: 'source', targetId: 'source', code: 'unfiled', expectedVersion: 'version', action: 'dismiss' });
  fireEvent.click(await screen.findByRole('button', { name: 'Left as is (1)' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Return to review' }));
  await waitFor(() => expect(calls.filter(c => c.body)).toHaveLength(2));
  expect(calls.filter(c => c.body)[1]!.body.action).toBe('restore');
});
test('manual check is separate and stale decisions leave the finding visible with a useful error', async () => {
  const calls = setup({ stale: true }); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Leave as is' }));
  expect(await screen.findByText('This item changed. Refresh the check.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Acme NDA' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
  await waitFor(() => expect(calls.some(c => c.path.endsWith('/upkeep/check') && JSON.stringify(c.body) === '{}')).toBe(true));
  expect(calls.some(c => c.path.includes('/suggest'))).toBe(false);
});
test('pagination requests the next bounded page rather than silently limiting the review to its first page', async () => {
  const calls = setup({ many: true }); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('heading', { name: 'Another document' });
  expect(calls.some(c => c.path.includes('offset=50'))).toBe(true);
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
});
test('AI help opens the existing reviewed filing flow without starting a model call', async () => {
  const calls = setup(); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Suggest filing' }));
  expect(await screen.findByRole('dialog', { name: 'Review filing with Counsel' })).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', { name: 'Generate suggestions' }) as HTMLButtonElement).disabled).toBe(false));
  expect(calls.filter(c => c.body).map(c => c.path)).toEqual(['/api/workspace/source-organization/preview']);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await screen.findByRole('dialog', { name: 'Workspace upkeep' })).toBeTruthy();
});

test('switching views never briefly presents the previous findings with the opposite action', async () => {
  setup(); await open();
  const fetch = globalThis.fetch; let release!: (value: Response) => void;
  globalThis.fetch = ((url, init) => String(url).includes('view=dismissed')
    ? new Promise<Response>(resolve => { release = resolve; }) : fetch(url, init)) as typeof fetch;
  fireEvent.click(screen.getByRole('button', { name: 'Left as is (0)' }));
  expect(screen.queryByRole('heading', { name: 'Acme NDA' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Return to review' })).toBeNull();
  release(Response.json({ pending: 0, failed: 0, attention: 1, dismissed: 0, total: 0, offset: 0, items: [], history: [], errors: [] }));
  await screen.findByText('No current findings have been left as is.');
});
