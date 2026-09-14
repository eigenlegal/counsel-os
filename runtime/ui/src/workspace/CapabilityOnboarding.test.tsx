import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { PracticeSources } from './PracticeSources';
import { ChatCapabilityHints, ContextualChatHints } from './CapabilityHints';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import type { Snapshot } from './api';

const original = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = original; sessionStorage.clear(); location.hash = ''; });
function fixture() {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const posts: Array<{ url: string; body: any }> = [], gets: string[] = [];
  const id = crypto.randomUUID(), files = Array.from({ length: 14 }, (_, index) => ({ sourceId: crypto.randomUUID(), revisionId: crypto.randomUUID(),
    title: `Instructions ${index}`, reason: 'Content discovery.', partial: false }));
  globalThis.fetch = (async (url, init) => {
    if (init?.body) { posts.push({ url: String(url), body: JSON.parse(String(init.body)) }); return Response.json(String(url).endsWith('/conversations') ? { id } : {}); }
    gets.push(String(url)); const second = String(url).includes('offset=200');
    return Response.json({ items: second ? files.slice(13) : files.slice(0, 13), scanned: second ? 1 : 200, nextOffset: second ? null : 200 });
  }) as typeof fetch;
  return { posts, gets, id, files };
}

test('instruction discovery requires explicit selection, preserves it across pages, and only prepares an editable draft', async () => {
  const { posts, gets, files, id } = fixture(); let closed = 0;
  render(<PracticeSources batch="import-fixture" close={() => { closed++; }} />);
  const file = await screen.findByRole('checkbox', { name: /^Instructions 0 / });
  expect((file as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('button', { name: 'Continue in chat' }) as HTMLButtonElement).disabled).toBe(true);
  expect(posts).toHaveLength(0); expect(gets[0]).toContain('batch=import-fixture');
  fireEvent.click(file); fireEvent.click(screen.getByRole('button', { name: 'Next files' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: /^Instructions 13 / }));
  expect(screen.getByRole('button', { name: 'Remove Instructions 0' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue in chat' }));
  await waitFor(() => expect(closed).toBe(1));
  expect(posts.map(post => post.url.split('/').at(-1))).toEqual(['conversations', 'drafts']);
  expect(posts[1]!.body.value.attachments).toEqual([files[0]!.revisionId, files[13]!.revisionId]);
  expect(posts[1]!.body.value.message).toContain('before saving');
  expect(location.hash).toContain(id);
});

test('the picker enforces attachment capacity without silently dropping the thirteenth file', async () => {
  fixture(); render(<PracticeSources close={() => {}} />);
  await screen.findByRole('checkbox', { name: /^Instructions 0 / });
  for (let index = 0; index < 12; index++) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`^Instructions ${index} `) }));
  expect((screen.getByRole('checkbox', { name: /^Instructions 12 / }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Instructions 0' }));
  expect((screen.getByRole('checkbox', { name: /^Instructions 12 / }) as HTMLInputElement).disabled).toBe(false);
});

test('chat hints fill text only; document hints preserve exact viewed revision and matter hints preserve scope', async () => {
  const { posts } = fixture(); const messages: string[] = [];
  render(<ChatCapabilityHints choose={message => messages.push(message)} />);
  expect(document.querySelector('details')!.open).toBe(false);
  fireEvent.click(screen.getByText('What else can I ask Counsel to do?'));
  fireEvent.click(screen.getByRole('button', { name: 'Remember a preference' }));
  expect(messages[0]).toContain('before saving'); expect(posts).toHaveLength(0); cleanup();
  const revisionId = crypto.randomUUID();
  render(<ContextualChatHints source={{ revisionId, word: true }} />);
  fireEvent.click(screen.getByText('Work with this file in chat'));
  fireEvent.click(screen.getByRole('button', { name: 'Prepare tracked changes' }));
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]!.body.value.attachments).toEqual([revisionId]); cleanup();
  const matterId = crypto.randomUUID(); render(<ContextualChatHints matterId={matterId} />);
  fireEvent.click(screen.getByText('Keep this matter current with chat'));
  fireEvent.click(screen.getByRole('button', { name: 'Update the matter brief' }));
  await waitFor(() => expect(posts).toHaveLength(4));
  expect(posts[2]!.body).toEqual({ matterId, scope: 'matter' });
  expect(posts[3]!.body.value.scope).toBe(matterId);
});

test('current onboarding offers chat or free-form text and does not require a questionnaire', async () => {
  const { posts } = fixture(); let edited = 0;
  render(<WorkspaceWelcome data={{ interfaceVersion: 33, profile: null, connection: { ready: true, config: null, label: 'Fixture' } } as unknown as Snapshot}
    changed={() => {}} editProfile={() => { edited++; }} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add your profile' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Write or paste text' })); expect(edited).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Tell Counsel about your practice' }));
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]!.body.value.message).toContain('practice');
  expect(posts.every(post => !post.url.endsWith('/send'))).toBe(true);
});
