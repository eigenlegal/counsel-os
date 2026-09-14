import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, userEvent } from '../test/dom';
import { PracticeDocumentPage, PracticeDocumentModal } from './PracticeDocument';
import { PracticePreferences } from './PracticePreferences';
import { PracticeDocumentProposalCard } from './PracticeDocumentProposal';
import { legacyPracticeContent, type PracticeDocumentView } from '../../../src/workspace/practice-document';
import type { Snapshot, Turn } from './api';

const originalFetch = globalThis.fetch;
const before: PracticeDocumentView = { ...legacyPracticeContent(null, null, null), basis: 'a'.repeat(64), saved: null };
const proposal = { id: crypto.randomUUID(), before, body: '# How I work\n\nKeep **useful detail**.\n\nAttribute my changes to Synthetic Avery.',
  identityName: 'Synthetic Avery', word: { ...before.word, author: 'Synthetic Avery' }, requestQuote: 'Please update my practice', reason: 'Your requested preferences.',
  review: 'pending' as const, appliedBasis: null, undoBasis: null };
const turn = { id: 'synthetic-turn', status: 'complete', state: { practiceDocumentProposal: proposal } } as Turn;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); location.hash = ''; });

test('Your practice is one document with a chat entry point, not a prescribed tab taxonomy', () => {
  render(<PracticePreferences data={{ practiceDocument: before, sources: [] } as unknown as Snapshot} changed={() => {}} editProfile={() => {}} view="documents" />);
  expect(screen.getByRole('heading', { name: 'Your practice' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Develop in chat' })).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: 'Preference views' })).toBeNull();
  expect(screen.queryByText('NDA review instructions')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('free-form editing has one text box, retains exact Markdown, and saves only on explicit action', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const writes: Array<{ url: string; body: any }> = [];
  globalThis.fetch = (async (url, options) => {
    if (!options?.body) return Response.json({ key: 'practice-document', revisionId: null, writeId: null, value: null, updatedAt: null });
    const body = JSON.parse(String(options.body)); writes.push({ url: String(url), body });
    return Response.json(String(url).endsWith('/practice-document') ? { ...before, body: body.body, useInChats: body.useInChats, basis: 'b'.repeat(64) } : { ...body, revisionId: crypto.randomUUID(), updatedAt: new Date().toISOString() });
  }) as typeof fetch;
  render(<PracticeDocumentPage value={before} changed={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Write or paste text' }));
  const field = screen.getByRole('textbox', { name: 'Practice document' });
  await waitFor(() => expect((field as HTMLTextAreaElement).disabled).toBe(false));
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  const text = '# Arbitrary heading\n\nFor tax audits, **preserve chronology**.\n\nDo not shorten this.';
  await userEvent.setup({ document }).type(field, text);
  expect(writes.filter(write => write.url.endsWith('/practice-document'))).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Save text' }));
  await waitFor(() => expect(writes.find(write => write.url.endsWith('/practice-document'))).toBeTruthy());
  expect(writes.find(write => write.url.endsWith('/practice-document'))!.body).toEqual({ body: text, useInChats: true, expectedBasis: before.basis });
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(screen.getByRole('heading', { name: 'Arbitrary heading' })).toBeTruthy();
});

test('chat review shows the full prose and applied Word author, with a separate explicit confirmation', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const posts: unknown[] = [];
  globalThis.fetch = (async (_url, options) => {
    if (!options?.body) return Response.json(before);
    posts.push(JSON.parse(String(options.body)));
    return Response.json({ ...turn, state: { practiceDocumentProposal: { ...proposal, review: 'applied' } } });
  }) as typeof fetch;
  render(<PracticeDocumentProposalCard turn={turn} onChanged={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Save for future work' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Review practice update' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save for future work' }) as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByRole('heading', { name: 'How I work' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Proposed applied details' })).toBeTruthy();
  expect(screen.getAllByText('Synthetic Avery').length).toBeGreaterThan(0);
  expect(posts).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Previous text' }));
  expect(screen.getByText('No saved text.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Proposed text' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save for future work' }));
  await waitFor(() => expect(posts).toHaveLength(1));
  expect(posts[0]).toEqual({ proposalId: proposal.id, action: 'apply', useInChats: true });
});

test('imported instructions require an explicit attach action, and chat handoff does not send a message', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const posts: Array<{ url: string; body: any }> = [];
  const id = crypto.randomUUID(), revisionId = crypto.randomUUID();
  globalThis.fetch = (async (url, options) => { posts.push({ url: String(url), body: JSON.parse(String(options?.body)) });
    return Response.json(String(url).endsWith('/conversations') ? { id } : {}); }) as typeof fetch;
  render(<PracticeDocumentPage value={before} changed={() => {}} imported={[{ title: 'Working preferences', revisionId }]} />);
  expect(posts).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Develop from these files' }));
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]!.body.value.attachments).toEqual([revisionId]);
  expect(posts.some(post => post.url.endsWith('/send'))).toBe(false);
});

test('stale practice updates cannot be confirmed; running responses have no review controls', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async () => Response.json({ ...before, basis: 'changed' })) as unknown as typeof fetch;
  const view = render(<PracticeDocumentProposalCard turn={turn} onChanged={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review practice update' }));
  await waitFor(() => expect(screen.getByText(/cannot overwrite the newer version/)).toBeTruthy());
  expect((screen.getByRole('button', { name: 'Save for future work' }) as HTMLButtonElement).disabled).toBe(true);
  view.unmount(); render(<PracticeDocumentProposalCard turn={{ ...turn, status: 'running' }} onChanged={() => {}} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('setup modal closes after a successful chat handoff, but remains open on failure', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  let closed = 0, fail = true;
  globalThis.fetch = (async (url) => fail ? Response.json({ error: 'Synthetic connection failure' }, { status: 500 })
    : Response.json(String(url).endsWith('/conversations') ? { id: crypto.randomUUID() } : {})) as typeof fetch;
  render(<PracticeDocumentModal value={before} close={() => { closed++; }} changed={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Develop in chat' }));
  await waitFor(() => expect(screen.getByText('Synthetic connection failure')).toBeTruthy());
  expect(closed).toBe(0);
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Develop in chat' }));
  await waitFor(() => expect(closed).toBe(1));
});

test('an unsaved document in the setup modal is retained when handing off to chat', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  let closed = false;
  const posts: Array<{ url: string; body: any }> = [];
  globalThis.fetch = (async (url, options) => {
    if (!options?.body) return Response.json({ key: 'practice-document', revisionId: null, value: null, updatedAt: null });
    const body = JSON.parse(String(options.body)); posts.push({ url: String(url), body });
    return Response.json(String(url).endsWith('/conversations') ? { id: crypto.randomUUID() }
      : { ...body, revisionId: crypto.randomUUID(), updatedAt: new Date().toISOString() });
  }) as typeof fetch;
  render(<PracticeDocumentModal value={before} close={() => { closed = true; }} changed={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Write or paste text' }));
  const field = screen.getByRole('textbox', { name: 'Practice document' });
  await waitFor(() => expect((field as HTMLTextAreaElement).disabled).toBe(false));
  await userEvent.setup({ document }).type(field, 'Keep this unsaved practice instruction.');
  fireEvent.click(screen.getByRole('button', { name: 'Develop this draft in chat' }));
  await waitFor(() => expect(closed).toBe(true));
  expect(posts.some(post => post.body.key === 'practice-document' && post.body.value.body === 'Keep this unsaved practice instruction.')).toBe(true);
  expect(posts.some(post => post.body.key?.startsWith('chat:') && post.body.value.message.includes('Keep this unsaved practice instruction.'))).toBe(true);
  expect(posts.some(post => post.url.endsWith('/send') || post.url.endsWith('/practice-document'))).toBe(false);
});
