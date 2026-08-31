import { cleanup, render, screen, userEvent, within } from '../test/dom';

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, test } from 'bun:test';
import type { Health, ProviderInfo } from '../api/types';
import type { ThreadHeader } from '../api/types';
import { Rail, railLabel } from './Rail';

const fake: ProviderInfo = {
  id: 'fake/fake',
  kind: 'direct',
  auth: 'local',
  capabilities: { tools: true, caching: false, thinking: false, contextTokens: 8192, auth: 'local' },
};
const claude: ProviderInfo = {
  id: 'claude-sub/claude-opus-5',
  kind: 'harness',
  auth: 'subscription',
  capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' },
};

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [fake],
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
      onOpenDraft={() => {}}
      onDelete={() => {}}
      onSetDefault={() => {}}
      {...over}
    />,
  );
}

/**
 * The real `styles.css`, in the test DOM.
 *
 * happy-dom resolves descendant selectors and reports computed styles, so
 * the icon rail's collapse rule can be asserted for what it is instead of
 * being taken on trust — `display: none` there would strip the accessible
 * name off every nav link, and a markup-only test cannot see that.
 */
function loadStylesheet(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  document.head.appendChild(style);
  return style;
}

afterEach(() => {
  cleanup();
  for (const style of document.head.querySelectorAll('style')) style.remove();
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

  test('the footer is the provider plate: vendor on line 1, model · connection on line 2', () => {
    mount();
    const foot = document.querySelector('.v2-foot') as HTMLElement;
    expect(foot.querySelector('.v2-plate-vendor')?.textContent).toBe('fake');
    expect(foot.querySelector('.v2-plate-detail')?.textContent).toBe('fake/fake · local');
    expect(foot.getAttribute('title')).toBe('fake/fake · local — switch model');
    // The green dot: the saved default is the one answering.
    expect(foot.querySelector('.v2-dot')?.classList.contains('v2-dot-amber')).toBe(false);
  });

  test('a known provider gets its designed lockup', () => {
    mount({ health: { ...health, providers: [claude], default: claude.id } });
    const foot = document.querySelector('.v2-foot') as HTMLElement;
    expect(foot.querySelector('.v2-plate-vendor')?.textContent).toBe('Claude');
    expect(foot.querySelector('.v2-plate-detail')?.textContent).toBe('Opus 5 · subscription');
  });

  test('saved-default-not-loaded: AMBER dot, explanation in the title, no label note', () => {
    // The saved default names a provider this runtime did not load. The
    // parenthetical swap note the label used to carry moved into the dot +
    // title (cou-90) — the plate itself stays calm.
    const swapped: Health = { ...health, default: 'openai/nope' };
    mount({ health: swapped });
    const foot = document.querySelector('.v2-foot') as HTMLElement;
    expect(foot.querySelector('.v2-dot')?.classList.contains('v2-dot-amber')).toBe(true);
    expect(foot.querySelector('.v2-foot-note')).toBeNull();
    expect(foot.querySelector('.v2-plate-vendor')?.textContent).toBe('fake');
    expect(foot.getAttribute('title')).toBe('fake/fake · local — saved default openai/nope not loaded — switch model');
  });

  test('clicking the footer opens the switcher: one lockup per loaded provider + Open Settings', async () => {
    mount({ health: { ...health, providers: [fake, claude] } });
    expect(document.querySelector('.v2-switch-pop')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /fake\/fake/ }));
    const menu = screen.getByRole('menu', { name: 'Switch model' });
    const vendors = Array.from(menu.querySelectorAll('.v2-plate-vendor'), (el: Element) => el.textContent);
    expect(vendors).toEqual(['fake', 'Claude']);
    const details = Array.from(menu.querySelectorAll('.v2-plate-detail'), (el: Element) => el.textContent);
    expect(details).toEqual(['fake/fake · local', 'Opus 5 · subscription']);
    // The row in use carries the dot's ink; the other keeps the column.
    const dots = Array.from(menu.querySelectorAll('.v2-dot'), (el: Element) => el.classList.contains('v2-dot-off'));
    expect(dots).toEqual([false, true]);
    expect(screen.getByText('Open Settings')).toBeTruthy();
  });

  test('picking a provider saves it as the default and closes the popover', async () => {
    const picked: string[] = [];
    mount({ health: { ...health, providers: [fake, claude] }, onSetDefault: id => picked.push(id) });
    await userEvent.click(screen.getByRole('button', { name: /fake\/fake/ }));
    await userEvent.click(screen.getByText('Claude'));
    expect(picked).toEqual(['claude-sub/claude-opus-5']);
    expect(document.querySelector('.v2-switch-pop')).toBeNull();
    expect(location.hash).not.toBe('#/settings');
  });

  test('re-picking the provider already in use is a no-op, not a save', async () => {
    const picked: string[] = [];
    mount({ health: { ...health, providers: [fake, claude] }, onSetDefault: id => picked.push(id) });
    await userEvent.click(screen.getByRole('button', { name: /fake\/fake/ }));
    // Scoped to the menu: the footer plate says `fake/fake · local` too.
    await userEvent.click(within(screen.getByRole('menu', { name: 'Switch model' })).getByText('fake/fake · local'));
    expect(picked).toEqual([]);
    expect(document.querySelector('.v2-switch-pop')).toBeNull();
  });

  test('Open Settings stays, as the final row', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: /fake\/fake/ }));
    const items = Array.from(document.querySelectorAll('.v2-switch-item'), el => el.textContent);
    expect(items[items.length - 1]).toBe('Open Settings');
    await userEvent.click(screen.getByText('Open Settings'));
    expect(location.hash).toBe('#/settings');
    expect(document.querySelector('.v2-switch-pop')).toBeNull();
  });

  test('collapsed: labels and conversations disappear, the icons stay', () => {
    mount({ collapsed: true, route: 'vault' });
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeTruthy();
    expect(screen.queryByText('Conversations')).toBeNull();
    expect(screen.queryByText('NDA residuals fallback')).toBeNull();
    // The links are still there for navigation, named by their labels.
    expect(screen.getByRole('link', { name: 'Vault' })).toBeTruthy();
  });

  test('collapsed: the labels are hidden from the EYE, never from the name', () => {
    loadStylesheet();
    mount({ collapsed: true, route: 'vault' });

    // Markup contract: every nav link and the footer still carry their label.
    for (const name of ['Home', 'Chat', 'Vault', 'Settings']) {
      const link = screen.getByRole('link', { name });
      expect(link.querySelector('.v2-lbl')?.textContent).toBe(name);
    }
    expect(document.querySelector('.v2-foot .v2-lbl .v2-plate-detail')?.textContent).toBe('fake/fake · local');

    // Style contract: clipped to 1px, NOT `display: none`. `display: none`
    // takes the element out of the accessibility tree, which would leave a
    // screen-reader user four unnamed links (WCAG 2.4.4 / 4.1.2).
    const label = screen.getByRole('link', { name: 'Vault' }).querySelector('.v2-lbl') as HTMLElement;
    const style = globalThis.getComputedStyle(label);
    expect(style.display).not.toBe('none');
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.clipPath).toBe('inset(50%)');
  });

  test('expanded: the labels are on screen, unclipped', () => {
    loadStylesheet();
    mount({ collapsed: false, route: 'home' });
    const label = screen.getByRole('link', { name: 'Vault' }).querySelector('.v2-lbl') as HTMLElement;
    expect(globalThis.getComputedStyle(label).position).not.toBe('absolute');
  });

  test('an empty list stays quiet — Home carries the one empty-state copy (cou-82)', () => {
    mount({ threads: [], draft: false, selected: null });
    expect(screen.queryByText('No threads yet.')).toBeNull();
    expect(document.querySelector('.v2-rail-list')?.children.length).toBe(0);
  });

  test('a draft is the current row and New is disabled', () => {
    mount({ draft: true, selected: null });
    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'New conversation' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('the draft row is a button that reaches onOpenDraft (cou-88)', async () => {
    let opened = 0;
    mount({ draft: true, selected: null, onOpenDraft: () => (opened += 1) });
    await userEvent.click(screen.getByRole('button', { name: 'Open the new conversation' }));
    expect(opened).toBe(1);
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
