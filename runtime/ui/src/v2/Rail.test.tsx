import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { Health, ThreadHeader } from '../api/types';
import { footerLabel, Rail, railLabel } from './Rail';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [
    {
      id: 'fake/fake',
      kind: 'direct',
      auth: 'local',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 8192, auth: 'local' },
    },
  ],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

const acme: ThreadHeader = {
  id: 't-1',
  title: 'NDA residuals fallback',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
  sessions: {},
};
const untitled: ThreadHeader = { id: 't-2', createdAt: '2026-08-27T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', sessions: {} };

function mount(over: Partial<Parameters<typeof Rail>[0]> = {}) {
  return render(
    <Rail
      route="home"
      threads={[acme, untitled]}
      selected="t-1"
      draft={false}
      health={health}
      collapsed={false}
      onSelect={() => {}}
      onNew={() => {}}
      onDelete={() => {}}
      {...over}
    />,
  );
}

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
});

describe('Rail', () => {
  test('brand, the four surfaces, and the current one marked', () => {
    mount({ route: 'vault', collapsed: false });
    expect(screen.getByText('counsel-os')).toBeTruthy();
    for (const name of ['Home', 'Chat', 'Vault', 'Settings']) {
      expect(screen.getByRole('link', { name })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'Vault' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });

  test('conversations list titles, falling back to Untitled; the current row is marked', () => {
    mount();
    expect(screen.getByText('NDA residuals fallback')).toBeTruthy();
    expect(screen.getByText('Untitled')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('NDA residuals fallback');
    expect(railLabel(untitled)).toBe('Untitled');
  });

  test('the footer is the default model + auth, and opens Settings', async () => {
    mount();
    expect(footerLabel(health)).toBe('fake/fake · local');
    expect(footerLabel(null)).toBe('…');
    await userEvent.click(screen.getByRole('button', { name: /fake\/fake/ }));
    expect(location.hash).toBe('#/settings');
  });

  test('collapsed: labels and conversations disappear, the icons stay', () => {
    mount({ collapsed: true, route: 'vault' });
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeTruthy();
    expect(screen.queryByText('Conversations')).toBeNull();
    expect(screen.queryByText('NDA residuals fallback')).toBeNull();
    // The links are still there for navigation, named by their labels
    // (visually hidden, not removed — the icon rail is still a nav).
    expect(screen.getByRole('link', { name: 'Vault' })).toBeTruthy();
  });

  test('a draft is the current row and New is disabled', () => {
    mount({ draft: true, selected: null });
    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'New conversation' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('select and delete reach their handlers', async () => {
    const selected: string[] = [];
    const deleted: string[] = [];
    mount({ onSelect: id => selected.push(id), onDelete: id => deleted.push(id) });
    await userEvent.click(screen.getByText('NDA residuals fallback'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Untitled' }));
    expect(selected).toEqual(['t-1']);
    expect(deleted).toEqual(['t-2']);
  });
});
