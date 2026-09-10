import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { SourceLinksReview } from './SourceLinks';
import type { SourceLinkPreview } from '../../../src/workspace/source-links';

const original = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = original; sessionStorage.clear(); });
const item = { id: 'link', fromId: 'note', fromPath: 'matters/note.md', href: 'Companies/Acme/background', quote: '[[Companies/Acme/background]]',
  form: 'wiki' as const, status: 'matched' as const, targetId: 'target', targetPath: 'Companies/Acme/background.md', targetTitle: 'Acme background', targetRevisionId: 'revision',
  candidateCount: 1, candidates: [], matter: { id: 'matter', title: 'Acme NDA' }, canShare: true, alreadyShared: false, crossImport: true, note: 'Make this document available to Acme NDA.' };
const preview: SourceLinkPreview = { sourceId: 'note', title: 'NDA history', path: 'matters/note.md', expectedVersion: 'current-version', offset: 0, total: 1,
  matched: 1, unresolved: 0, shareable: 1, truncated: false, items: [item] };
function setup(stale = false) {
  sessionStorage.setItem('counsel-os.token', 'fixture'); const calls: Array<{ path: string; body?: any }> = []; let saved = false, closed = false, changed = false;
  globalThis.fetch = (async (url, init) => {
    const path = String(url), body = init?.body ? JSON.parse(String(init.body)) : undefined; calls.push({ path, body });
    if (body) { if (stale) return Response.json({ error: 'The matching files changed. Check again.' }, { status: 409 }); saved = true; return Response.json({ added: 1 }); }
    return Response.json(saved ? { ...preview, total: 0, shareable: 0, items: [] } : preview);
  }) as typeof fetch;
  render(<SourceLinksReview sourceId="note" close={() => { closed = true; }} changed={() => { changed = true; }} />);
  return { calls, saved: () => saved, closed: () => closed, changed: () => changed };
}
test('review is read only; nothing is preselected; apply names immediate matter access and uses exact version', async () => {
  const fixture = setup(); const checkbox = await screen.findByRole('checkbox');
  expect((checkbox as HTMLInputElement).checked).toBe(false);
  expect(fixture.calls.every(c => !c.body)).toBe(true);
  expect(screen.getByText('Adding a link makes that document available', { exact: false })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open matched document' }).getAttribute('href')).toContain('revision=revision');
  fireEvent.click(checkbox); fireEvent.click(screen.getByRole('button', { name: 'Add 1 matter link' }));
  await screen.findByText('1 matter link added.', { exact: false });
  expect(fixture.calls.find(c => c.body)!.body).toEqual({ expectedVersion: 'current-version', linkIds: ['link'], confirmAccessChanges: true });
  expect(fixture.changed()).toBe(true); expect(fixture.saved()).toBe(true);
  expect(screen.getByRole('button', { name: 'Add 0 matter links' }).hasAttribute('disabled')).toBe(true);
});
test('stale review clears selection and cannot resubmit until refreshed; cancel changes nothing', async () => {
  const fixture = setup(true); fireEvent.click(await screen.findByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Add 1 matter link' }));
  await screen.findByText('The matching files changed. Check again.');
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Add 0 matter links' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
  await waitFor(() => expect(screen.queryByText('The matching files changed. Check again.')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(fixture.closed()).toBe(true); expect(fixture.changed()).toBe(false);
});
test('filters hide the previous rows immediately, so delayed responses cannot apply another view’s selection', async () => {
  const fixture = setup(); fireEvent.click(await screen.findByRole('checkbox'));
  const fetch = globalThis.fetch; let release!: (value: Response) => void;
  globalThis.fetch = ((url, init) => String(url).includes('view=unresolved') ? new Promise<Response>(resolve => { release = resolve; }) : fetch(url, init)) as typeof fetch;
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unresolved' } });
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.getByRole('button', { name: 'Add 0 matter links' }).hasAttribute('disabled')).toBe(true);
  release(Response.json({ ...preview, total: 0, items: [] })); await screen.findByText('No references in this view.');
  expect(fixture.calls.filter(c => c.body)).toHaveLength(0);
});
test('unresolved references cannot be selected; coverage limitations remain visible', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async () => Response.json({ ...preview, truncated: true, shareable: 0, items: [{ ...item, status: 'ambiguous', canShare: false,
    targetId: null, targetTitle: null, targetPath: null, candidates: ['A/background.md','B/background.md'], candidateCount: 2 }] })) as unknown as typeof fetch;
  render(<SourceLinksReview sourceId="note" close={() => {}} changed={() => {}} />);
  expect((await screen.findByRole('checkbox')).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText('This check has incomplete coverage:', { exact: false })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Open matched document' })).toBeNull();
});
