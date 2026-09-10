import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, within } from '../test/dom';
import { SidebarRecents } from './SidebarRecents';
import type { NavigationSnapshot } from '../../../src/workspace/navigation';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const initial = (): NavigationSnapshot => ({ pinned: [], recentChats: [{ kind: 'conversation', id: 'chat', title: 'Renewal discussion', running: true }],
  recentMatters: [{ kind: 'matter', id: 'matter', title: 'Long matter name — full accessible title' }], collapsed: { pinned: false, chats: false, matters: false } });

test('pins and collapses are explicit persisted commands, and visits only follow route changes', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const commands: Record<string, unknown>[] = [];
  let state = initial();
  globalThis.fetch = (async (_url: string, options: RequestInit) => {
    if (options.body) {
      const command = JSON.parse(String(options.body)); commands.push(command);
      if (command.action === 'pin') state = { ...state, pinned: command.pinned ? state.recentMatters : [], recentMatters: command.pinned ? [] : state.pinned };
      if (command.action === 'collapse') state = { ...state, collapsed: { ...state.collapsed, [command.section]: command.collapsed } };
    }
    return Response.json(state);
  }) as typeof fetch;
  const view = render(<SidebarRecents enabled page="matters" id="matter" close={() => {}} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pin Long matter name — full accessible title' })).toBeTruthy());
  expect(screen.getByText('Working…')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pin Long matter name — full accessible title' }));
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Pinned', exact: true })).getByRole('link').getAttribute('href')).toBe('#/matters?id=matter'));
  await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Unpin Long matter name — full accessible title'));
  expect(screen.getByRole('link', { name: 'Long matter name — full accessible title' }).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button', { name: 'Recent chats', exact: true }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Recent chats', exact: true }).getAttribute('aria-expanded')).toBe('false'));
  expect(screen.queryByText('Working…')).toBeNull();
  view.rerender(<SidebarRecents enabled page="matters" id="matter" close={() => {}} />);
  expect(commands.filter(command => command.action === 'visit')).toHaveLength(1);
  view.rerender(<SidebarRecents enabled page="home" id="chat" close={() => {}} />);
  await waitFor(() => expect(commands.filter(command => command.action === 'visit')).toHaveLength(2));
  expect(commands.every(command => !('at' in command))).toBe(true);
});

test('failed pins leave the existing shortcuts and a visible retryable control', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (_url: string, options: RequestInit) => options.body
    ? Response.json({ error: 'Pin could not be saved.' }, { status: 409 }) : Response.json(initial())) as typeof fetch;
  render(<SidebarRecents enabled page="home" close={() => {}} />);
  const button = await screen.findByRole('button', { name: 'Pin Long matter name — full accessible title' });
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Pin could not be saved.'));
  expect(screen.queryByRole('region', { name: 'Pinned', exact: true })).toBeNull();
  expect((button as HTMLButtonElement).disabled).toBe(false);
});

test('an older interface never calls navigation routes it cannot support', () => {
  let called = false;
  globalThis.fetch = (() => { called = true; throw new Error('Unexpected request'); }) as unknown as typeof fetch;
  render(<SidebarRecents enabled={false} page="home" close={() => {}} />);
  expect(called).toBe(false);
  expect(screen.queryByRole('region')).toBeNull();
});
