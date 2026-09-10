import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { CleanProposalButton } from './CleanProposal';
import type { WordExport } from './api';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const redline: WordExport = { id: 'redline', workId: 'work', name: 'Notice - redline.docx', contentHash: 'a'.repeat(64), inputHash: 'b'.repeat(64), template: 'counsel-redline-v1', createdAt: '2026-09-07T12:00:00Z', byteCount: 100, warnings: [] };
test('opening and cancelling create nothing; explicit confirmation creates a separately named download', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); const posts: unknown[] = [];
  const file = { ...redline, id: 'clean', name: 'Notice - clean proposal.docx', template: 'counsel-clean-proposal-v1', warnings: ['Comments remain.'] };
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === 'POST') { posts.push(JSON.parse(String(init.body))); return Response.json(file); }
    return Response.json(null);
  }) as typeof fetch;
  render(<CleanProposalButton redline={redline} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clean proposal…' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create clean proposal' }).hasAttribute('disabled')).toBe(false));
  expect(screen.getByText(/does not mark the agreement as accepted/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(posts).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Clean proposal…' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create clean proposal' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Create clean proposal' }));
  expect(await screen.findByRole('button', { name: 'Download clean proposal' })).toBeTruthy();
  expect(posts).toEqual([{ expectedContentHash: redline.contentHash, confirmProposal: true }]);
  expect(screen.getByText('Comments remain.')).toBeTruthy();
});
test('existing saved files reopen without another generation; unsupported originals leave an actionable error', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture'); let saved = false;
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === 'POST') return Response.json({ error: 'Resolve earlier revisions explicitly in Word.' }, { status: 409 });
    return Response.json(saved ? { ...redline, id: 'clean', name: 'Clean proposal.docx' } : null);
  }) as typeof fetch;
  render(<CleanProposalButton redline={redline} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clean proposal…' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create clean proposal' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Create clean proposal' }));
  expect(await screen.findByText('Resolve earlier revisions explicitly in Word.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); saved = true;
  fireEvent.click(screen.getByRole('button', { name: 'Clean proposal…' }));
  expect(await screen.findByRole('button', { name: 'Download clean proposal' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create clean proposal' })).toBeNull();
});
