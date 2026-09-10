import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ImportLinks } from './ImportLinks';
import type { ImportBatch } from '../../../src/workspace/import-types';
import type { ImportLinkPreview } from '../../../src/workspace/import-links';

const original = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = original; sessionStorage.clear(); });
const batch = { id: 'batch', revisionId: 'revision', progress: { awaitingUpload: 0, queued: 0, processing: 0 } } as ImportBatch;
function setup(options: { organizing?: boolean; stale?: boolean } = {}) {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const preview = { revisionId: 'revision', expectedVersion: 'version', offset: 0, total: 2, scannedFiles: 1, omittedFiles: 2,
    truncated: false, matched: 1, unresolved: 1, shareable: 1, items: [
      { id: 'link', fromId: 'note', fromPath: 'Practice/nda.md', targetId: 'company', targetPath: 'Companies/background.md', href: '../Companies/background.md',
        form: 'markdown', quote: '[company](../Companies/background.md)', status: 'matched', candidates: [], candidateCount: 1,
        matter: { matterId: 'matter', matterTitle: null, title: 'Acme NDA' }, canShare: true, alreadyShared: false, note: 'Review before adding.' },
      { id: 'missing', fromId: 'note', fromPath: 'Practice/nda.md', targetId: null, targetPath: null, href: 'missing.docx',
        form: 'wiki', quote: '[[missing.docx]]', status: 'missing', candidates: [], candidateCount: 0, matter: null, canShare: false, alreadyShared: false, note: 'Not in the selection.' },
    ] } as ImportLinkPreview;
  const calls: Array<{ path: string; body: unknown }> = [];
  globalThis.fetch = (async (url, init) => {
    if (init?.method === 'POST') {
      calls.push({ path: String(url), body: JSON.parse(init.body as string) });
      if (options.stale) return Response.json({ error: 'The links changed. Review again.' }, { status: 409 });
      return Response.json({});
    }
    return Response.json(preview);
  }) as typeof fetch;
  render(<ImportLinks batch={batch} organizing={!!options.organizing} changed={() => {}} />);
  return calls;
}
test('finding links never grants access; selection changes only reviewed import choices', async () => {
  const calls = setup();
  const button = await screen.findByRole('button', { name: 'Review document links' });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(button);
  const checkbox = screen.getByRole('checkbox', { name: 'Practice/nda.md → Companies/background.md' }) as HTMLInputElement;
  expect(checkbox.checked).toBe(false); expect(calls).toHaveLength(0);
  expect((screen.getByRole('checkbox', { name: 'Practice/nda.md → missing.docx' }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(checkbox); fireEvent.click(screen.getByRole('button', { name: 'Add 1 link to import choices' }));
  await waitFor(() => expect(calls).toHaveLength(1));
  expect(calls[0]).toEqual({ path: '/api/workspace/imports/batch/links', body: { expectedRevisionId: 'revision', expectedVersion: 'version', linkIds: ['link'], confirmAccessChanges: true } });
  expect(calls.every(call => !call.path.endsWith('/commit'))).toBe(true);
});
test('active AI organization blocks link changes but keeps the evidence review available', async () => {
  const calls = setup({ organizing: true });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Review document links' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Review document links' }));
  expect((screen.getByRole('checkbox', { name: 'Practice/nda.md → Companies/background.md' }) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText('Pause AI organization before changing matter links.', { exact: false })).toBeTruthy();
  expect(calls).toHaveLength(0);
});
test('stale review preserves the dialog, selection and explicit error without importing', async () => {
  setup({ stale: true });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Review document links' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Review document links' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Practice/nda.md → Companies/background.md' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add 1 link to import choices' }));
  expect(await screen.findByText('The links changed. Review again.')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((screen.getByRole('checkbox', { name: 'Practice/nda.md → Companies/background.md' }) as HTMLInputElement).checked).toBe(true);
});
