# UI Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a second set of UI surfaces (`v2`) behind an opt-in toggle: answer-first turns with a streaming step timeline, a redline proposal card, and a workbench shell with a vault drawer — without changing the API or the v1 surfaces.

**Architecture:** `app.tsx` reads a flag and mounts either the existing `App` (v1) or `v2/Shell`. v2 lives under `runtime/ui/src/v2/` and shares `api/`, `chat/turns.ts`, `vault/{Tree,FileView,markdown,sanitize}`, `settings/{registry-form,ProviderTest,Health}`. v2 styles are tokens plus `.v2-*` rules under `html[data-ui="v2"]` in the one `styles.css`. Thread titles come from the first send (`POST /threads` with `title`, already supported).

**Tech Stack:** Bun 1.3.x, TypeScript (strict, `noUncheckedIndexedAccess`), React 18, Vite 6, `marked`, `diff` (new), `happy-dom` + `@testing-library/react` under `bun test`, Playwright `1.58.2` for e2e.

**Spec:** `docs/superpowers/specs/2026-08-29-ui-design-pass-design.md`

## Global Constraints

- Rollout flag: `localStorage['counsel-os.ui']` is `'v2'` or absent. Settings shows a "Try the new design" switch. `#/?ui=v2` in the fragment also turns it on for one load (and persists). Default **off**.
- v2 is a second set of surfaces under `runtime/ui/src/v2/`. **v1 component files are untouched** except `app.tsx`, `main.tsx`, `styles.css`, and the settings toggle (`settings/Settings.tsx` renders the new `settings/DesignToggle.tsx`).
- Tokens, exactly as the spec lists, under `[data-ui="v2"]`: warm paper `--bg #fbfaf7`, `--fg #1f1d1a`, sunken `#f4f1ea`, border `#e8e3d9`, accent brown `#b45309` (proposals), status green `#2f7a3e` / amber `#b45309` / red `#b42318`; a dark counterpart under `prefers-color-scheme: dark`; `--serif: "Iowan Old Style", Charter, Georgia, serif` for assistant prose only; `--sans` system; spacing 4/8/12/16/24/32 px; radius 8 px; one shadow. No component library.
- Founder rule (step-3 spec §2) still binds: no gates, no flows, no contract-shaped structure. This pass changes how the surfaces read, not what counsel does.
- `vault/sanitize.ts` (via `vault/markdown.ts`'s `renderMarkdown`) is the **only** HTML sink. Every `dangerouslySetInnerHTML` in v2 receives `renderMarkdown(...)` output and nothing else.
- API contract unchanged. `POST /threads` with `{ title }` is already accepted (`CreateThreadBody` in `runtime/src/server/routes.ts`). Nothing is added to the runtime.
- Dependency added to `runtime/ui` only: `diff`. (The spec says `^7`; `diff@7` ships no types and needs the deprecated `@types/diff`, so this plan pins `diff@^8.0.4`, which ships its own types and has the same `diffLines` API.)
- Root `bun run test` stays scoped to `runtime/src browse/src scripts`. UI tests run with `bun run ui:test` (or `cd runtime/ui && bun test <file>`). `e2e/` is never added to `bun test`.
- Existing v1 tests stay green and unchanged.
- Commit messages use the repo prefixes `ui:` / `e2e:` / `docs:`. **No `Co-Authored-By` and no `Claude-Session` trailers.**
- No subscription calls anywhere in this plan. The one live check is Ollama (`ollama/gemma4:e4b`).

---

## File structure

```
runtime/ui/
  package.json                        + "diff": "^8.0.4"
  src/
    main.tsx                          renders <Root/> instead of <App/>
    app.tsx                           + Root(): reads the flag, sets <html data-ui>, mounts App (v1) or Shell (v2)
    ui-flag.ts                        readUiFlag(), setUiFlag(), onUiFlagChange(), stripUiParam(), UI_FLAG_KEY
    ui-flag.test.ts
    styles.css                        + html[data-ui="v2"] tokens and .v2-* rules (appended per task)
    settings/DesignToggle.tsx         the "Try the new design" switch (used by v1 Settings and v2 SettingsPage)
    settings/DesignToggle.test.tsx
    settings/Settings.tsx             + <DesignToggle/> at the top (the one v1 component edit)
    v2/
      Shell.tsx                       top bar, rail, main, drawer; owns drawer state + hash routing (reuses parseHash)
      Shell.test.tsx                  Esc closes the drawer; nav "Vault" on chat opens it
      Rail.tsx  Rail.test.tsx         thread list with titles + draft row + New
      Drawer.tsx  Drawer.test.tsx     320 px vault drawer: Tree + Breadcrumb + FileView, close button, Esc
      threads.ts  threads.test.ts     titleFor(message), createThread({ title })
      verbs.ts  verbs.test.ts         verbFor(), pathOf(), summarize()
      diff.ts  diff.test.ts           unifiedHunks(before, after) → Hunk[] (3 lines of context)
      chat/Chat.tsx  Chat.test.tsx    v1 load/stream/settle logic + draft-create-on-send + per-step ms
      chat/Turn.tsx                   user bubble / assistant turn: prose, Steps (live), proposals, Strip
      chat/Steps.tsx  Steps.test.tsx  timeline lines from the verb table, ms, show/hide
      chat/Strip.tsx  Strip.test.tsx  collapsed summary strip + expanded record
      chat/ProposalCard.tsx  (.test)  redline card: current file vs proposed, preview flip, approve/reject, 409
      chat/Composer.tsx  (.test)      v2 composer, ⌘⏎ sends, provider picker seeded from loaded providers
      vault/VaultPage.tsx  (.test)    full page: Tree + Breadcrumb + FileView
      settings/SettingsPage.tsx (.test) grouped form: Design · Default provider · Step timeout · Providers · Task routes · Test · Runtime
e2e/ui.spec.ts                        + the v2 test (same flow via `?ui=v2`, plus diff → approve → drawer → strip)
docs/superpowers/spikes/2026-08-28-runtime-spikes.md   + "## Step 5 — design pass"
docs/superpowers/spikes/img/design-pass-*.png
```

Shared names every task relies on (defined in the task named):

| Name | Defined in | Signature |
|---|---|---|
| `readUiFlag` / `setUiFlag` / `onUiFlagChange` | Task 1 `ui-flag.ts` | `readUiFlag(): 'v1' \| 'v2'` · `setUiFlag(flag): { persisted: boolean }` · `onUiFlagChange(fn: (flag) => void): () => void` |
| `openDrawer` | Task 1 `Shell.tsx` | `openDrawer(path: string \| null): void` — passed down as `onOpenFile` |
| `createThread` / `titleFor` | Task 2 `v2/threads.ts` | `createThread(init: { title: string }): Promise<ThreadHeader>` · `titleFor(message: string): string` |
| `verbFor` / `pathOf` / `summarize` | Task 2 `v2/verbs.ts` | `verbFor(tool: ToolCallView): { verb: string; object?: string }` · `pathOf(tool): string \| null` · `summarize(tools: ToolCallView[]): string` |
| `unifiedHunks` / `Hunk` | Task 3 `v2/diff.ts` | `unifiedHunks(before: string, after: string, context = 3): Hunk[]` · `type Hunk = { kind: 'ctx' \| 'add' \| 'del'; text: string }[]` |
| `Breadcrumb` | Task 4 `v2/vault/VaultPage.tsx` | `Breadcrumb({ path: string })` |

---

### Task 1: Flag, tokens, and the v2 shell skeleton

**Files:**
- Create: `runtime/ui/src/ui-flag.ts`, `runtime/ui/src/ui-flag.test.ts`
- Create: `runtime/ui/src/settings/DesignToggle.tsx`, `runtime/ui/src/settings/DesignToggle.test.tsx`
- Create: `runtime/ui/src/v2/Shell.tsx`, `runtime/ui/src/v2/Rail.tsx`, `runtime/ui/src/v2/Rail.test.tsx`, `runtime/ui/src/v2/Drawer.tsx`, `runtime/ui/src/v2/Drawer.test.tsx`
- Modify: `runtime/ui/src/app.tsx` (add `Root`), `runtime/ui/src/main.tsx` (render `Root`), `runtime/ui/src/settings/Settings.tsx` (render `DesignToggle`), `runtime/ui/src/styles.css` (append), `runtime/ui/package.json` (add `diff`)

**Interfaces:**
- Consumes (existing): `parseHash`, `vaultPathFromHash`, `TOKEN_MESSAGE`, `App` from `src/app.tsx`; `Tree`, `FileView` from `src/vault/`; v1 `Chat`, `Vault`, `Settings` (rendered by the skeleton until Tasks 2 and 4 replace them); `fetchJson`, `ApiError`, `readToken`, `onUnauthorized`.
- Produces: `readUiFlag(): 'v1' | 'v2'`; `setUiFlag(flag: 'v1' | 'v2'): { persisted: boolean }`; `onUiFlagChange(fn: (flag: 'v1' | 'v2') => void): () => void`; `stripUiParam(hash: string): string`; `UI_FLAG_KEY = 'counsel-os.ui'`; `DesignToggle()`; `Shell()` with `openDrawer(path: string | null)` passed to children as `onOpenFile`; `Rail({ threads, selected, draft, busy?, onSelect, onNew, onDelete })` and `railLabel(thread)`; `Drawer({ path, onOpen, onClose })`. The CSS class names `.v2-shell .v2-top .v2-work .v2-main .v2-rail .v2-thread .v2-drawer .v2-empty .v2-notice .v2-pill` used by later tasks.

- [ ] **Step 1: Add the `diff` dependency**

Run:
```bash
cd runtime/ui && bun add diff@^8.0.4 && cd ../.. && git diff --stat runtime/ui/package.json runtime/ui/bun.lock
```
Expected: `package.json` gains `"diff": "^8.0.4"` under `dependencies`; `bun.lock` updated. (Task 3 uses it; it is added here so `ui:build --frozen-lockfile` sees one lockfile change.)

- [ ] **Step 2: Write the failing flag tests**

`runtime/ui/src/ui-flag.test.ts`:

```ts
import './test/dom';

import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { onUiFlagChange, readUiFlag, setUiFlag, stripUiParam, UI_FLAG_KEY } from './ui-flag';

afterEach(() => {
  localStorage.clear();
  setUiFlag('v1');
  history.replaceState(null, '', '/#/');
});

describe('readUiFlag', () => {
  test('nothing stored and no fragment is v1', () => {
    expect(readUiFlag()).toBe('v1');
  });

  test('a stored v2 is v2', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v2');
    expect(readUiFlag()).toBe('v2');
  });

  test('?ui=v2 in the fragment wins for this load, is persisted, and leaves the fragment', () => {
    history.replaceState(null, '', '/#/?ui=v2');
    expect(readUiFlag()).toBe('v2');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(location.hash).toBe('#/');
  });

  test('a fragment with other params keeps them', () => {
    history.replaceState(null, '', '/#/vault?path=a.md&ui=v2');
    expect(readUiFlag()).toBe('v2');
    expect(location.hash).toBe('#/vault?path=a.md');
  });
});

describe('setUiFlag', () => {
  test('v2 stores the key, v1 removes it, and listeners hear both', () => {
    const seen: string[] = [];
    const off = onUiFlagChange(flag => seen.push(flag));
    expect(setUiFlag('v2')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(setUiFlag('v1')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();
    off();
    setUiFlag('v2');
    expect(seen).toEqual(['v2', 'v1']);
  });

  test('blocked storage still switches for the session and reports it', () => {
    const blocked = spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(setUiFlag('v2')).toEqual({ persisted: false });
      expect(readUiFlag()).toBe('v2');
    } finally {
      blocked.mockRestore();
    }
  });
});

describe('stripUiParam', () => {
  test('removes only the ui param', () => {
    expect(stripUiParam('#/?ui=v2')).toBe('/');
    expect(stripUiParam('#/vault?path=a.md&ui=v2')).toBe('/vault?path=a.md');
    expect(stripUiParam('#/settings')).toBe('/settings');
    expect(stripUiParam('')).toBe('');
  });
});
```

- [ ] **Step 3: Run the flag tests to see them fail**

Run: `cd runtime/ui && bun test src/ui-flag.test.ts`
Expected: FAIL — `Cannot find module './ui-flag'`.

- [ ] **Step 4: Implement `ui-flag.ts`**

`runtime/ui/src/ui-flag.ts`:

```ts
/**
 * The design-pass rollout flag (spec §2, "Rollout"). Default off.
 *
 * Three sources, in order: `?ui=v2` in the fragment (one load, and it is
 * persisted), the in-memory copy set this session, then
 * `localStorage['counsel-os.ui']`. The memory copy is what makes the switch
 * work in a tab whose storage is blocked — it holds for the session and the
 * toggle says so.
 */

export const UI_FLAG_KEY = 'counsel-os.ui';

export type UiFlag = 'v1' | 'v2';

type Listener = (flag: UiFlag) => void;

const listeners = new Set<Listener>();
let memory: UiFlag | null = null;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The `ui` param of the fragment's query half (`#/?ui=v2`), or `null`. */
function fragmentFlag(hash: string): UiFlag | null {
  const cut = hash.indexOf('?');
  if (cut === -1) return null;
  return new URLSearchParams(hash.slice(cut + 1)).get('ui') === 'v2' ? 'v2' : null;
}

/** The fragment (without its `#`) with the `ui` param removed. Pure. */
export function stripUiParam(hash: string): string {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  if (cut === -1) return raw;
  const params = new URLSearchParams(raw.slice(cut + 1));
  params.delete('ui');
  const rest = params.toString();
  return rest === '' ? raw.slice(0, cut) : `${raw.slice(0, cut)}?${rest}`;
}

/** Subscribes to flag changes; the returned function unsubscribes. */
export function onUiFlagChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Records the choice. `persisted` is false when storage refused it; the
 * memory copy still applies for this session. The `ui` fragment param, if
 * present, is removed so a later reload obeys the stored choice.
 */
export function setUiFlag(flag: UiFlag): { persisted: boolean } {
  memory = flag;
  let persisted = false;
  try {
    const store = storage();
    if (store !== null) {
      if (flag === 'v2') store.setItem(UI_FLAG_KEY, 'v2');
      else store.removeItem(UI_FLAG_KEY);
      persisted = true;
    }
  } catch {
    persisted = false;
  }
  const hash = globalThis.location?.hash ?? '';
  if (/[?&]ui=/.test(hash)) {
    const { pathname, search } = globalThis.location;
    globalThis.history?.replaceState(null, '', `${pathname}${search}#${stripUiParam(hash)}`);
  }
  for (const fn of [...listeners]) fn(flag);
  return { persisted };
}

export function readUiFlag(): UiFlag {
  const fromFragment = fragmentFlag(globalThis.location?.hash ?? '');
  if (fromFragment !== null) {
    setUiFlag(fromFragment);
    return fromFragment;
  }
  if (memory !== null) return memory;
  try {
    return storage()?.getItem(UI_FLAG_KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}
```

- [ ] **Step 5: Run the flag tests**

Run: `cd runtime/ui && bun test src/ui-flag.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Write the failing DesignToggle test**

`runtime/ui/src/settings/DesignToggle.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { readUiFlag, setUiFlag, UI_FLAG_KEY } from '../ui-flag';
import { DesignToggle } from './DesignToggle';

afterEach(() => {
  cleanup();
  localStorage.clear();
  setUiFlag('v1');
});

describe('DesignToggle', () => {
  test('is off by default and turns v2 on', async () => {
    render(<DesignToggle />);
    const toggle = screen.getByRole('switch', { name: 'Try the new design' }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    await userEvent.click(toggle);

    expect(toggle.checked).toBe(true);
    expect(readUiFlag()).toBe('v2');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(screen.queryByText(/this tab only/)).toBeNull();
  });

  test('says so when the choice could not be saved', async () => {
    const blocked = spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      render(<DesignToggle />);
      await userEvent.click(screen.getByRole('switch', { name: 'Try the new design' }));
      expect(screen.getByText(/this tab only/)).toBeTruthy();
      expect(readUiFlag()).toBe('v2');
    } finally {
      blocked.mockRestore();
    }
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `cd runtime/ui && bun test src/settings/DesignToggle.test.tsx`
Expected: FAIL — `Cannot find module './DesignToggle'`.

- [ ] **Step 8: Implement `DesignToggle.tsx`**

`runtime/ui/src/settings/DesignToggle.tsx`:

```tsx
import { useState } from 'react';
import { readUiFlag, setUiFlag, type UiFlag } from '../ui-flag';

/**
 * The "Try the new design" switch (spec §2, "Rollout"). Rendered by the v1
 * settings page and by the v2 one, so the founder can flip either way from
 * wherever they are. Flipping it remounts the shell (`Root` in `app.tsx`
 * listens); no reload.
 */
export function DesignToggle(): JSX.Element {
  const [flag, setFlag] = useState<UiFlag>(() => readUiFlag());
  const [sessionOnly, setSessionOnly] = useState(false);

  const change = (on: boolean): void => {
    const next: UiFlag = on ? 'v2' : 'v1';
    const { persisted } = setUiFlag(next);
    setFlag(next);
    setSessionOnly(!persisted);
  };

  return (
    <section className="settings-design">
      <h2>Design</h2>
      <label className="design-switch">
        <input type="checkbox" role="switch" checked={flag === 'v2'} onChange={e => change(e.target.checked)} />{' '}
        Try the new design
      </label>
      <p className="muted">Answer-first turns, a redline for every proposal, and the vault beside the thread.</p>
      {sessionOnly ? (
        <p className="notice notice-warning" role="status">
          The choice could not be saved (storage is blocked), so it applies to this tab only.
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 9: Run the DesignToggle test**

Run: `cd runtime/ui && bun test src/settings/DesignToggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 10: Mount the toggle in v1 Settings, add `Root`, render it**

In `runtime/ui/src/settings/Settings.tsx` add the import and render it first inside the settings section:

```tsx
import { DesignToggle } from './DesignToggle';
// …
  return (
    <section className="settings">
      <DesignToggle />
      <Health health={health} effective={view.effective} file={view.file} />
      {/* unchanged below */}
```

In `runtime/ui/src/app.tsx` add (imports at the top, `Root` at the bottom; the existing `App` stays as it is):

```tsx
import { onUiFlagChange, readUiFlag, type UiFlag } from './ui-flag';
import { Shell } from './v2/Shell';

/**
 * Picks the shell by the design flag and stamps it on `<html data-ui>` so the
 * v2 tokens in `styles.css` apply to the whole page, dialogs included.
 */
export function Root(): JSX.Element {
  const [ui, setUi] = useState<UiFlag>(() => readUiFlag());
  useEffect(() => onUiFlagChange(setUi), []);
  useEffect(() => {
    document.documentElement.dataset['ui'] = ui;
  }, [ui]);
  return ui === 'v2' ? <Shell /> : <App />;
}
```

In `runtime/ui/src/main.tsx` replace `import { App } from './app';` with `import { Root } from './app';` and `<App />` with `<Root />`.

- [ ] **Step 11: Write the failing Rail test**

`runtime/ui/src/v2/Rail.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ThreadHeader } from '../api/types';
import { Rail, railLabel } from './Rail';

const at = '2026-08-29T10:00:00.000Z';
const titled: ThreadHeader = { id: 't-1', title: 'Acme NDA term', createdAt: at, updatedAt: at, sessions: {} };
const untitled: ThreadHeader = { id: 't-2', createdAt: at, updatedAt: at, sessions: {} };

function noop(): void {}

afterEach(cleanup);

describe('railLabel', () => {
  test('is the title, or the creation date', () => {
    expect(railLabel(titled)).toBe('Acme NDA term');
    expect(railLabel(untitled)).toBe(new Date(at).toLocaleDateString());
  });
});

describe('Rail', () => {
  test('lists titles, marks the selected thread, and New starts a draft', async () => {
    let created = 0;
    const picked: string[] = [];
    render(
      <Rail
        threads={[titled, untitled]}
        selected="t-1"
        draft={false}
        onSelect={id => picked.push(id)}
        onNew={() => {
          created += 1;
        }}
        onDelete={noop}
      />,
    );
    expect(screen.getByText('Acme NDA term')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Acme NDA term');

    await userEvent.click(screen.getByText(new Date(at).toLocaleDateString()));
    expect(picked).toEqual(['t-2']);

    await userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
    expect(created).toBe(1);
  });

  test('a draft shows as the current row without a request', () => {
    render(<Rail threads={[titled]} selected={null} draft onSelect={noop} onNew={noop} onDelete={noop} />);
    expect(document.querySelector('li.v2-draft[aria-current="true"]')?.textContent).toContain('New conversation');
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
  });

  test('empty says so', () => {
    render(<Rail threads={[]} selected={null} draft={false} onSelect={noop} onNew={noop} onDelete={noop} />);
    expect(screen.getByText('No threads yet.')).toBeTruthy();
  });
});
```

- [ ] **Step 12: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/Rail.test.tsx`
Expected: FAIL — `Cannot find module './Rail'`.

- [ ] **Step 13: Implement `Rail.tsx`**

`runtime/ui/src/v2/Rail.tsx`:

```tsx
import type { ThreadHeader } from '../api/types';

export interface RailProps {
  threads: ThreadHeader[];
  selected: string | null;
  /** True while the main pane holds a draft — a conversation with no thread
   * yet. The draft is a row so the reader can see where they are. */
  draft: boolean;
  busy?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/** The title the first send gave the thread, or the day it was made. */
export function railLabel(thread: ThreadHeader): string {
  const title = thread.title?.trim() ?? '';
  return title !== '' ? title : new Date(thread.createdAt).toLocaleDateString();
}

export function Rail({ threads, selected, draft, busy = false, onSelect, onNew, onDelete }: RailProps): JSX.Element {
  return (
    <nav className="v2-rail" aria-label="Threads">
      <div className="v2-rail-head">
        <h2>Threads</h2>
        <button type="button" onClick={onNew} disabled={busy || draft}>
          New
        </button>
      </div>
      <ul className="v2-rail-list">
        {draft ? (
          <li className="v2-draft" aria-current="true">
            <span className="v2-thread-title">New conversation</span>
          </li>
        ) : null}
        {threads.map(thread => (
          <li key={thread.id} className="v2-thread" aria-current={thread.id === selected && !draft ? 'true' : undefined}>
            <button type="button" className="v2-thread-open" onClick={() => onSelect(thread.id)}>
              <span className="v2-thread-title">{railLabel(thread)}</span>
              <span className="v2-thread-date">{new Date(thread.updatedAt).toLocaleDateString()}</span>
            </button>
            <button
              type="button"
              className="v2-thread-delete"
              aria-label={`Delete ${railLabel(thread)}`}
              onClick={() => onDelete(thread.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {threads.length === 0 && !draft ? <p className="muted">No threads yet.</p> : null}
    </nav>
  );
}
```

- [ ] **Step 14: Run the Rail test**

Run: `cd runtime/ui && bun test src/v2/Rail.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 15: Write the failing Drawer test**

`runtime/ui/src/v2/Drawer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { Drawer } from './Drawer';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** The tree lists an empty root; a read returns one small file. */
function install(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/list')) return json([{ path: 'matters', kind: 'dir' }]);
    if (url.startsWith('/vault/read')) return json({ path: 'matters/acme.md', content: '# Acme\n', version: 'abc1234def' });
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('Drawer', () => {
  test('shows the tree, and the file when a path is open', async () => {
    render(<Drawer path="matters/acme.md" onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('matters')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy());
    expect(screen.getByText(/version abc1234def/)).toBeTruthy();
    // The full page is one link away, at the same path.
    expect((screen.getByRole('link', { name: 'open page' }) as HTMLAnchorElement).getAttribute('href')).toBe(
      '#/vault?path=matters%2Facme.md',
    );
  });

  test('with no path it asks for one', async () => {
    render(<Drawer path={null} onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Pick a file to read it.')).toBeTruthy());
    expect(screen.queryByRole('link', { name: 'open page' })).toBeNull();
  });

  test('the close button and Esc both close it', async () => {
    let closed = 0;
    render(
      <Drawer
        path={null}
        onOpen={() => {}}
        onClose={() => {
          closed += 1;
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close vault' }));
    expect(closed).toBe(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(2);
  });
});
```

- [ ] **Step 16: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/Drawer.test.tsx`
Expected: FAIL — `Cannot find module './Drawer'`.

- [ ] **Step 17: Implement `Drawer.tsx`**

`runtime/ui/src/v2/Drawer.tsx`:

```tsx
import { useEffect } from 'react';
import { FileView } from '../vault/FileView';
import { Tree } from '../vault/Tree';

export interface DrawerProps {
  /** The file open in the drawer, or `null` for the tree alone. */
  path: string | null;
  onOpen(path: string): void;
  onClose(): void;
}

/**
 * The vault beside the thread (spec §2, "Shell"): 320 px, the same `Tree`
 * and `FileView` as the full page, closable by its button or Esc. Opened
 * by the shell's `openDrawer` — from the nav link on the chat route, a
 * step's path, or a proposal's "open in vault".
 */
export function Drawer({ path, onOpen, onClose }: DrawerProps): JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="v2-drawer" aria-label="Vault drawer">
      <header className="v2-drawer-head">
        {path === null ? null : (
          <a className="v2-link v2-drawer-full" href={`#/vault?path=${encodeURIComponent(path)}`}>
            open page
          </a>
        )}
        <button type="button" className="v2-drawer-close" aria-label="Close vault" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="v2-drawer-tree">
        <Tree selected={path} onSelect={onOpen} />
      </div>
      <div className="v2-drawer-file">
        {path === null ? <p className="muted v2-empty">Pick a file to read it.</p> : <FileView key={path} path={path} />}
      </div>
    </aside>
  );
}
```

- [ ] **Step 18: Run the Drawer test**

Run: `cd runtime/ui && bun test src/v2/Drawer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 19: Implement `Shell.tsx`**

`runtime/ui/src/v2/Shell.tsx` (this task renders the v1 `Chat`, `Vault`, `Settings` inside it; Task 2 swaps `Chat`, Task 4 swaps the other two):

```tsx
import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import { readToken } from '../api/token';
import { onUnauthorized } from '../api/unauthorized';
import type { Health, ThreadHeader } from '../api/types';
import { parseHash, TOKEN_MESSAGE, vaultPathFromHash } from '../app';
import { Chat } from '../chat/Chat';
import { Settings } from '../settings/Settings';
import { Vault } from '../vault/Vault';
import { Drawer } from './Drawer';
import { Rail } from './Rail';

type Route = 'chat' | 'vault' | 'settings';

export interface DrawerState {
  open: boolean;
  path: string | null;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function byRecent(a: ThreadHeader, b: ThreadHeader): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/**
 * The workbench (spec §2, "Shell"): top bar, thread rail, the thread, and a
 * vault drawer on the right. `#/vault` and `#/settings` are still full
 * pages; on the chat route the nav's "Vault" opens the drawer instead, so a
 * file can be checked without leaving the thread.
 *
 * The chat is keyed by `chatKey`, which changes when the reader PICKS a
 * different thread or starts a draft — never when a draft becomes a thread
 * on its first send. Re-keying then would remount the chat mid-stream.
 */
export function Shell(): JSX.Element {
  const [route, setRoute] = useState<Route>(() => parseHash(globalThis.location.hash).route);
  const [vaultPath, setVaultPath] = useState<string | null>(() => vaultPathFromHash(globalThis.location.hash));
  const [unauthorized, setUnauthorized] = useState(() => readToken() === null);
  const [health, setHealth] = useState<Health | null>(null);
  const [threads, setThreads] = useState<ThreadHeader[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, path: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openDrawer = useCallback((path: string | null): void => {
    setDrawer(current => ({ open: true, path: path ?? current.path }));
  }, []);
  const closeDrawer = useCallback((): void => setDrawer(current => ({ ...current, open: false })), []);

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(parseHash(globalThis.location.hash).route);
      setVaultPath(vaultPathFromHash(globalThis.location.hash));
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => onUnauthorized(() => setUnauthorized(true)), []);

  const loadThreads = useCallback(async (): Promise<ThreadHeader[]> => {
    const list = await fetchJson<ThreadHeader[]>('/threads');
    const sorted = [...list].sort(byRecent);
    setThreads(sorted);
    return sorted;
  }, []);

  useEffect(() => {
    if (unauthorized) return;
    void (async () => {
      try {
        setHealth(await fetchJson<Health>('/health'));
        const list = await loadThreads();
        const first = list[0]?.id ?? null;
        setSelected(current => current ?? first);
        if (first === null) setDraft(true);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      }
    })();
  }, [unauthorized, loadThreads]);

  const selectThread = (id: string): void => {
    setSelected(id);
    setDraft(false);
    setChatKey(k => k + 1);
  };

  const newDraft = (): void => {
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
  };

  const deleteThread = async (id: string): Promise<void> => {
    if (!globalThis.confirm('Delete this thread? Its transcript cannot be recovered from here.')) return;
    setBusy(true);
    setError(null);
    try {
      await fetchJson<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const list = await loadThreads();
      if (selected === id) {
        const next = list[0]?.id ?? null;
        if (next === null) newDraft();
        else selectThread(next);
      }
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    } finally {
      setBusy(false);
    }
  };

  if (unauthorized) {
    return (
      <main className="page-message">
        <h1>counsel-os</h1>
        <p className="notice notice-error" role="alert">
          {TOKEN_MESSAGE}
        </p>
      </main>
    );
  }

  return (
    <div className="v2-shell">
      <header className="v2-top">
        <h1 className="v2-brand">counsel-os</h1>
        <nav aria-label="Surfaces">
          <a href="#/" aria-current={route === 'chat' ? 'page' : undefined}>
            Chat
          </a>
          <a
            href="#/vault"
            aria-current={route === 'vault' ? 'page' : undefined}
            onClick={
              route === 'chat'
                ? event => {
                    // On the chat route the vault is a drawer, not a page.
                    event.preventDefault();
                    openDrawer(null);
                  }
                : undefined
            }
          >
            Vault
          </a>
          <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>
            Settings
          </a>
        </nav>
        {health === null ? null : (
          <span className="v2-top-meta">
            <span className="v2-top-vault" title={health.vault}>
              {health.vault}
            </span>
            <span className="v2-top-model">{health.default ?? 'no default model'}</span>
          </span>
        )}
      </header>

      {error === null ? null : (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      )}

      {route === 'chat' ? (
        <div className={drawer.open ? 'v2-work v2-drawer-open' : 'v2-work'}>
          <Rail
            threads={threads}
            selected={selected}
            draft={draft}
            busy={busy}
            onSelect={selectThread}
            onNew={newDraft}
            onDelete={id => void deleteThread(id)}
          />
          <main className="v2-main">
            {health === null ? (
              <p className="muted v2-empty">Loading…</p>
            ) : draft || selected === null ? (
              // Task 2 replaces this branch with the v2 Chat's draft mode.
              <p className="muted v2-empty">New conversation. Send a message to start it.</p>
            ) : (
              <Chat key={chatKey} threadId={selected} health={health} onThreadTouched={() => void loadThreads()} />
            )}
          </main>
          {drawer.open ? <Drawer path={drawer.path} onOpen={path => openDrawer(path)} onClose={closeDrawer} /> : null}
        </div>
      ) : route === 'vault' ? (
        <Vault
          path={vaultPath}
          onOpen={path => {
            globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
          }}
        />
      ) : (
        <main className="v2-page">
          <Settings health={health} />
        </main>
      )}
    </div>
  );
}
```

- [ ] **Step 20: Append the v2 tokens and shell styles**

Append to `runtime/ui/src/styles.css`:

```css
/* ═══ v2 — the design pass (spec 2026-08-29-ui-design-pass) ═══════════════
 * Everything below applies only under <html data-ui="v2">. Shared v1
 * components (Tree, FileView, the settings form) pick up the tokens; the
 * v2 components use the .v2-* rules. */

html[data-ui="v2"] {
  --bg: #fbfaf7;
  --bg-sunken: #f4f1ea;
  --bg-raised: #ffffff;
  --fg: #1f1d1a;
  --fg-muted: #6b645b;
  --border: #e8e3d9;
  --accent: #b45309;
  --ok: #2f7a3e;
  --warn: #b45309;
  --error: #b42318;
  --serif: "Iowan Old Style", Charter, Georgia, serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px;
  --radius: 8px;
  --shadow: 0 1px 2px rgba(31, 29, 26, 0.06), 0 4px 12px rgba(31, 29, 26, 0.06);
  --rail-w: 240px;
  --drawer-w: 320px;
}

@media (prefers-color-scheme: dark) {
  html[data-ui="v2"] {
    --bg: #1b1917;
    --bg-sunken: #151311;
    --bg-raised: #23201c;
    --fg: #ece7dd;
    --fg-muted: #a39b8f;
    --border: #3a3531;
    --accent: #e0873a;
    --ok: #6fc283;
    --warn: #e0a24a;
    --error: #ff8f85;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.35);
  }
}

html[data-ui="v2"] body { font-size: 15px; }
html[data-ui="v2"] h1, html[data-ui="v2"] h2, html[data-ui="v2"] h3 { letter-spacing: -0.01em; }

/* ── v2 shell ─────────────────────────────────────────────────────────── */

.v2-shell { display: flex; flex-direction: column; height: 100vh; }
.v2-top {
  display: flex;
  align-items: center;
  gap: var(--s5);
  padding: var(--s2) var(--s4);
  border-bottom: 1px solid var(--border);
  background: var(--bg-raised);
}
.v2-brand { font-family: var(--serif); font-size: 1.1rem; font-weight: 600; margin: 0; }
.v2-top nav { display: flex; gap: var(--s4); }
.v2-top nav a { text-decoration: none; color: var(--fg-muted); padding: var(--s1) 0; border-bottom: 2px solid transparent; }
.v2-top nav a[aria-current="page"] { color: var(--fg); border-bottom-color: var(--accent); }
.v2-top-meta { margin-left: auto; display: flex; gap: var(--s3); align-items: baseline; font-size: 0.78rem; color: var(--fg-muted); }
.v2-top-vault { font-family: var(--mono); max-width: 36ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v2-top-model { padding: 1px var(--s2); border: 1px solid var(--border); border-radius: 999px; }

.v2-work { display: grid; grid-template-columns: var(--rail-w) 1fr; flex: 1; min-height: 0; }
.v2-work.v2-drawer-open { grid-template-columns: var(--rail-w) 1fr var(--drawer-w); }
.v2-main { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.v2-page { overflow-y: auto; padding: var(--s5) var(--s6); }
.v2-empty { margin: var(--s6) auto; text-align: center; }

.v2-notice { padding: var(--s2) var(--s3); border-radius: var(--radius); border: 1px solid currentColor; margin: var(--s2) var(--s4); }
.v2-notice p:last-child { margin-bottom: 0; }
.v2-notice-error { color: var(--error); }
.v2-notice-warn { color: var(--warn); }

.v2-pill {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px var(--s2);
  border-radius: 999px;
  border: 1px solid currentColor;
  color: var(--fg-muted);
}
.v2-pill-done, .v2-pill-approved, .v2-pill-ok { color: var(--ok); }
.v2-pill-running, .v2-pill-pending { color: var(--accent); }
.v2-pill-error, .v2-pill-timeout { color: var(--error); }
.v2-pill-abandoned, .v2-pill-rejected { color: var(--warn); }

.v2-link { background: none; border: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font-size: 0.85rem; }
.v2-link[aria-pressed="true"] { color: var(--fg); text-decoration: none; font-weight: 600; }

/* ── v2 rail ──────────────────────────────────────────────────────────── */

.v2-rail { border-right: 1px solid var(--border); background: var(--bg-sunken); overflow-y: auto; padding: var(--s3); }
.v2-rail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--s2); }
.v2-rail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.v2-thread, .v2-draft { display: flex; align-items: center; border-radius: var(--radius); padding: 0 var(--s1); }
.v2-thread[aria-current="true"], .v2-draft[aria-current="true"] { background: var(--bg-raised); box-shadow: var(--shadow); }
.v2-draft { padding: var(--s2) var(--s3); font-style: italic; color: var(--fg-muted); }
.v2-thread-open { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left; background: none; border: none; padding: var(--s2); }
.v2-thread-title { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v2-thread-date { color: var(--fg-muted); font-size: 0.72rem; }
.v2-thread-delete { background: none; border: none; color: var(--fg-muted); }

/* ── v2 drawer ────────────────────────────────────────────────────────── */

.v2-drawer { border-left: 1px solid var(--border); background: var(--bg-raised); display: flex; flex-direction: column; min-height: 0; box-shadow: var(--shadow); }
.v2-drawer-head { display: flex; align-items: center; justify-content: flex-end; gap: var(--s3); padding: var(--s2) var(--s3); border-bottom: 1px solid var(--border); }
.v2-drawer-close { background: none; border: none; font-size: 1.1rem; color: var(--fg-muted); }
.v2-drawer-tree { flex: 0 0 auto; max-height: 40%; overflow-y: auto; }
.v2-drawer-tree .vault-tree { border-right: none; background: transparent; }
.v2-drawer-file { flex: 1; min-height: 0; overflow-y: auto; padding: var(--s3) var(--s4); border-top: 1px solid var(--border); }
```

Also give the v1 toggle a little room (v1-neutral, functional): append

```css
.settings-design .design-switch { display: inline-flex; gap: 0.4rem; align-items: center; }
```

- [ ] **Step 21: Typecheck, run the whole UI suite, build**

Run:
```bash
bun run typecheck:ui && bun run ui:test && bun run ui:build
```
Expected: `tsc` clean; every UI test passes (the v1 suites unchanged, plus the new `ui-flag`, `DesignToggle`, `Rail`, `Drawer` files); Vite build succeeds.

- [ ] **Step 22: Look at it once**

Run `bun run ui:dev` alongside a `counsel-os serve --fake` (see `e2e/serve.ts` for the flags) and open the printed URL with `&/?ui=v2` appended after the token. Expected: warm-paper top bar with Chat / Vault / Settings, vault path and model on the right, the rail on the left, "New conversation…" in the main pane; clicking the nav "Vault" opens the drawer; Esc closes it; Settings shows the switch on; turning it off returns the v1 page without a reload.

- [ ] **Step 23: Commit**

```bash
git add runtime/ui/package.json runtime/ui/bun.lock runtime/ui/src/ui-flag.ts runtime/ui/src/ui-flag.test.ts \
  runtime/ui/src/settings/DesignToggle.tsx runtime/ui/src/settings/DesignToggle.test.tsx runtime/ui/src/settings/Settings.tsx \
  runtime/ui/src/app.tsx runtime/ui/src/main.tsx runtime/ui/src/styles.css \
  runtime/ui/src/v2/Shell.tsx runtime/ui/src/v2/Rail.tsx runtime/ui/src/v2/Rail.test.tsx runtime/ui/src/v2/Drawer.tsx runtime/ui/src/v2/Drawer.test.tsx
git commit -m "ui: design flag, v2 tokens, and the workbench shell skeleton (rail, drawer, toggle)"
```

---

### Task 2: The turn — verbs, Steps, Strip, Turn, v2 Chat (draft-create-on-send), Composer

**Files:**
- Create: `runtime/ui/src/v2/verbs.ts`, `verbs.test.ts`, `runtime/ui/src/v2/threads.ts`, `threads.test.ts`
- Create: `runtime/ui/src/v2/chat/Steps.tsx`, `Steps.test.tsx`, `Strip.tsx`, `Strip.test.tsx`, `Turn.tsx`, `Composer.tsx`, `Composer.test.tsx`, `Chat.tsx`, `Chat.test.tsx`
- Modify: `runtime/ui/src/v2/Shell.tsx` (import the v2 `Chat`; draft mode), `runtime/ui/src/styles.css` (append)

**Interfaces:**
- Consumes: `ToolCallView`, `AssistantTurn`, `Turn`, `applyStepEvent`, `buildTurns`, `emptyAssistantTurn` from `src/chat/turns.ts`; `pretty` from `src/chat/json.ts`; `fetchJson`, `streamStep`, `ApiError` from `src/api/client.ts`; `RunRecord`, `Thread`, `ThreadHeader`, `Health`, `ProviderInfo` from `src/api/types.ts`; v1 `ProposalCard` from `src/chat/ProposalCard.tsx` (until Task 3 replaces it); the Shell from Task 1 (`chatKey`, `draft`, `selected`, `openDrawer`).
- Produces: `verbFor(tool: ToolCallView): { verb: string; object?: string }`; `pathOf(tool: ToolCallView): string | null`; `summarize(tools: ToolCallView[]): string`; `titleFor(message: string): string`; `createThread(init: { title: string }): Promise<ThreadHeader>`; `Steps({ tools, ms, onOpenFile? })`; `Strip({ turn, run?, ms, onOpenFile? })` and `pillFor(turn, run?)`; `TurnView({ turn, threadId, run?, live?, liveMs?, onReload, onOpenFile? })`; `Chat({ threadId: string | null, health, onThreadCreated?, onThreadTouched?, onOpenFile? })`; `Composer` (same props as v1). Class names `.v2-prose .v2-steps .v2-step .v2-step-verb .v2-step-path .v2-strip .v2-strip-summary .v2-transcript .v2-composer`.

- [ ] **Step 1: Write the failing verbs tests**

`runtime/ui/src/v2/verbs.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../chat/turns';
import { pathOf, summarize, verbFor } from './verbs';

function tool(name: string, input: unknown = {}): ToolCallView {
  return { id: `${name}-1`, name, input, hasResult: true };
}

describe('verbFor', () => {
  test('the table', () => {
    expect(verbFor(tool('vault_read', { path: 'matters/acme.md' }))).toEqual({ verb: 'Read', object: 'matters/acme.md' });
    expect(verbFor(tool('vault_list', { dir: 'matters' }))).toEqual({ verb: 'Listed', object: 'matters' });
    expect(verbFor(tool('vault_search', { query: 'cap' }))).toEqual({ verb: 'Searched', object: 'cap' });
    expect(verbFor(tool('read_primitive', { name: 'evaluate' }))).toEqual({ verb: 'Consulted primitive', object: 'evaluate' });
    expect(verbFor(tool('propose_update', { path: 'practice/x.md', content: '' }))).toEqual({ verb: 'Proposed', object: 'practice/x.md' });
    expect(verbFor(tool('vault_write', { path: 'a.md' }))).toEqual({ verb: 'Wrote', object: 'a.md' });
  });

  test('grep-like names are searches; anything else is Ran <name>', () => {
    expect(verbFor(tool('vault_grep', { pattern: 'x' })).verb).toBe('Searched');
    expect(verbFor(tool('web_fetch', { url: 'https://x' }))).toEqual({ verb: 'Ran web_fetch' });
  });

  test('a non-object input has no object', () => {
    expect(verbFor(tool('vault_read', 'matters/acme.md'))).toEqual({ verb: 'Read' });
  });
});

describe('pathOf', () => {
  test('only file verbs carry a path', () => {
    expect(pathOf(tool('vault_read', { path: 'a.md' }))).toBe('a.md');
    expect(pathOf(tool('propose_update', { path: 'a.md' }))).toBe('a.md');
    expect(pathOf(tool('vault_search', { path: 'a.md' }))).toBeNull();
    expect(pathOf(tool('vault_read', {}))).toBeNull();
  });
});

describe('summarize', () => {
  test('counts reads, primitives and the rest', () => {
    expect(summarize([])).toBe('no tools');
    expect(summarize([tool('vault_read'), tool('vault_read'), tool('propose_update')])).toBe('read 2 files, ran 1 tool');
    expect(summarize([tool('vault_read')])).toBe('read 1 file');
    expect(summarize([tool('read_primitive'), tool('read_primitive'), tool('vault_list'), tool('vault_search')])).toBe(
      'consulted 2 primitives, ran 2 tools',
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/verbs.test.ts`
Expected: FAIL — `Cannot find module './verbs'`.

- [ ] **Step 3: Implement `verbs.ts`**

`runtime/ui/src/v2/verbs.ts`:

```ts
/**
 * Tool name → what a lawyer reads (spec §2, "Verb table"). One glance, no
 * raw JSON: `vault_read {path}` is the line "Read matters/acme.md".
 */
import type { ToolCallView } from '../chat/turns';

export interface Verb {
  verb: string;
  /** The `path` input when present; otherwise the first of name / query /
   * dir, which is what the other vault tools call their subject. */
  object?: string;
}

const TABLE: Record<string, string> = {
  vault_read: 'Read',
  vault_list: 'Listed',
  vault_search: 'Searched',
  read_primitive: 'Consulted primitive',
  propose_update: 'Proposed',
  vault_write: 'Wrote',
};

const SEARCH_LIKE = /grep|search|find/i;

/** The verbs whose object is a vault path a drawer can open. */
const FILE_VERBS: ReadonlySet<string> = new Set(['Read', 'Proposed', 'Wrote']);

function objectOf(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ['path', 'name', 'query', 'dir']) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export function verbFor(tool: ToolCallView): Verb {
  const verb = TABLE[tool.name] ?? (SEARCH_LIKE.test(tool.name) ? 'Searched' : `Ran ${tool.name}`);
  const object = objectOf(tool.input);
  return object === undefined ? { verb } : { verb, object };
}

/** The vault path a step line can open, or `null` when the step is not about one file. */
export function pathOf(tool: ToolCallView): string | null {
  const { verb } = verbFor(tool);
  if (!FILE_VERBS.has(verb)) return null;
  if (typeof tool.input !== 'object' || tool.input === null) return null;
  const path = (tool.input as Record<string, unknown>)['path'];
  return typeof path === 'string' && path !== '' ? path : null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "read 2 files, ran 1 tool" — the collapsed strip's one line. */
export function summarize(tools: ToolCallView[]): string {
  if (tools.length === 0) return 'no tools';
  let read = 0;
  let consulted = 0;
  let ran = 0;
  for (const tool of tools) {
    if (tool.name === 'vault_read') read += 1;
    else if (tool.name === 'read_primitive') consulted += 1;
    else ran += 1;
  }
  const parts: string[] = [];
  if (read > 0) parts.push(`read ${plural(read, 'file', 'files')}`);
  if (consulted > 0) parts.push(`consulted ${plural(consulted, 'primitive', 'primitives')}`);
  if (ran > 0) parts.push(`ran ${plural(ran, 'tool', 'tools')}`);
  return parts.join(', ');
}
```

- [ ] **Step 4: Run the verbs tests**

Run: `cd runtime/ui && bun test src/v2/verbs.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing threads tests**

`runtime/ui/src/v2/threads.test.ts`:

```ts
import './../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { createThread, titleFor } from './threads';

const realFetch = globalThis.fetch;

beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'test-token'));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('titleFor', () => {
  test('the first non-empty line, trimmed', () => {
    expect(titleFor('  Check the Acme cap.  \nSecond line.')).toBe('Check the Acme cap.');
    expect(titleFor('\n\nAfter blank lines')).toBe('After blank lines');
  });

  test('cut at 60 characters, no trailing space', () => {
    const long = 'a'.repeat(50) + ' ' + 'b'.repeat(20);
    expect(titleFor(long)).toBe('a'.repeat(50));
    expect(titleFor('x'.repeat(61))).toBe('x'.repeat(60));
  });
});

describe('createThread', () => {
  test('POSTs the title and returns the header', async () => {
    let sent: unknown;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: 't-9', title: 'Hi', createdAt: 'now', updatedAt: 'now', sessions: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const header = await createThread({ title: 'Hi' });
    expect(sent).toEqual({ title: 'Hi' });
    expect(header.id).toBe('t-9');
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/threads.test.ts`
Expected: FAIL — `Cannot find module './threads'`.

- [ ] **Step 7: Implement `threads.ts`**

`runtime/ui/src/v2/threads.ts`:

```ts
import { fetchJson } from '../api/client';
import type { ThreadHeader } from '../api/types';

/** Spec §2, "Thread titles": the first line, trimmed to 60 characters. */
export const TITLE_MAX = 60;

export function titleFor(message: string): string {
  const first = message.split('\n').find(line => line.trim() !== '') ?? '';
  const line = first.trim();
  return line.length <= TITLE_MAX ? line : line.slice(0, TITLE_MAX).trimEnd();
}

/** `POST /threads` — the route already accepts `title`; no API change. */
export function createThread(init: { title: string }): Promise<ThreadHeader> {
  return fetchJson<ThreadHeader>('/threads', { method: 'POST', body: JSON.stringify(init) });
}
```

- [ ] **Step 8: Run the threads tests**

Run: `cd runtime/ui && bun test src/v2/threads.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing Steps test**

`runtime/ui/src/v2/chat/Steps.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { Steps } from './Steps';

const running: ToolCallView = { id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' }, hasResult: false };
const done: ToolCallView = { ...running, output: { content: '# Acme', version: 'v1' }, isError: false, hasResult: true };

afterEach(cleanup);

describe('Steps', () => {
  test('a running step is a verb line with no time; the time appears with its result', () => {
    const { rerender } = render(<Steps tools={[running]} ms={{}} />);
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('matters/acme.md')).toBeTruthy();
    expect(screen.queryByText(/ms/)).toBeNull();
    expect(document.querySelector('.v2-step-running')).toBeTruthy();

    rerender(<Steps tools={[done]} ms={{ 'c-1': 18 }} />);
    expect(screen.getByText(/18 ms/)).toBeTruthy();
    expect(document.querySelector('.v2-step-ok')).toBeTruthy();
  });

  test('show reveals input and result; hide puts them away', async () => {
    render(<Steps tools={[done]} ms={{}} />);
    expect(screen.queryByText('Input')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByText('Input')).toBeTruthy();
    expect(screen.getByText('Result')).toBeTruthy();
    expect(screen.getByText(/"path": "matters\/acme.md"/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'hide' }));
    expect(screen.queryByText('Input')).toBeNull();
  });

  test('a file step opens its path when a drawer is offered', async () => {
    const opened: string[] = [];
    render(<Steps tools={[done]} ms={{}} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'matters/acme.md' }));
    expect(opened).toEqual(['matters/acme.md']);
  });

  test('an errored step says so', () => {
    render(<Steps tools={[{ ...done, isError: true, output: 'boom' }]} ms={{}} />);
    expect(screen.getByText('error')).toBeTruthy();
  });
});
```

- [ ] **Step 10: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/chat/Steps.test.tsx`
Expected: FAIL — `Cannot find module './Steps'`.

- [ ] **Step 11: Implement `Steps.tsx`**

`runtime/ui/src/v2/chat/Steps.tsx`:

```tsx
import { useState } from 'react';
import { pretty } from '../../chat/json';
import type { ToolCallView } from '../../chat/turns';
import { pathOf, verbFor } from '../verbs';

export interface StepsProps {
  tools: ToolCallView[];
  /** Milliseconds per tool id, once its result has landed. Absent = not
   * yet, or unknown. */
  ms: Record<string, number>;
  /** Opens a path in the vault drawer. When absent, paths are plain text. */
  onOpenFile?: (path: string) => void;
}

/**
 * The timeline (spec §2, "Turn while streaming"): one line per tool call —
 * "Read matters/acme.md · 18 ms" — with the raw input and result one
 * "show" away. The same list renders inside the finished strip.
 */
export function Steps({ tools, ms, onOpenFile }: StepsProps): JSX.Element | null {
  if (tools.length === 0) return null;
  return (
    <ol className="v2-steps">
      {tools.map(tool => (
        <Step key={tool.id} tool={tool} ms={ms[tool.id]} onOpenFile={onOpenFile} />
      ))}
    </ol>
  );
}

function Step({ tool, ms, onOpenFile }: { tool: ToolCallView; ms: number | undefined; onOpenFile?: (path: string) => void }): JSX.Element {
  const [shown, setShown] = useState(false);
  const { verb, object } = verbFor(tool);
  const path = pathOf(tool);
  const state = !tool.hasResult ? 'running' : tool.isError ? 'error' : 'ok';

  return (
    <li className={`v2-step v2-step-${state}`} data-testid={`step-${tool.id}`}>
      <span className="v2-step-verb">{verb}</span>{' '}
      {object === undefined ? null : path !== null && onOpenFile !== undefined ? (
        <button type="button" className="v2-step-path" onClick={() => onOpenFile(path)}>
          {object}
        </button>
      ) : (
        <code className="v2-step-object">{object}</code>
      )}
      {ms === undefined ? null : <span className="v2-step-ms"> · {Math.round(ms)} ms</span>}
      {state === 'running' ? (
        <span className="v2-step-wait" role="status" aria-label="running">
          …
        </span>
      ) : state === 'error' ? (
        <span className="v2-pill v2-pill-error">error</span>
      ) : null}
      <button type="button" className="v2-link v2-step-show" aria-expanded={shown} onClick={() => setShown(s => !s)}>
        {shown ? 'hide' : 'show'}
      </button>
      {shown ? (
        <div className="v2-step-detail">
          <h4>Input</h4>
          <pre>{pretty(tool.input)}</pre>
          {tool.hasResult ? (
            <>
              <h4>Result</h4>
              <pre>{pretty(tool.output)}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 12: Run the Steps test**

Run: `cd runtime/ui && bun test src/v2/chat/Steps.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 13: Write the failing Strip test**

`runtime/ui/src/v2/chat/Strip.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { RunRecord } from '../../api/types';
import { emptyAssistantTurn, type AssistantTurn } from '../../chat/turns';
import { pillFor, Strip } from './Strip';

const turn: AssistantTurn = emptyAssistantTurn({
  runId: 'r-1',
  provider: 'fake/fake',
  status: 'done',
  text: 'Done.',
  tools: [
    { id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' }, output: 'x', isError: false, hasResult: true },
    { id: 'c-2', name: 'vault_read', input: { path: 'matters/beta.md' }, output: 'x', isError: false, hasResult: true },
    { id: 'c-3', name: 'propose_update', input: { path: 'practice/x.md' }, output: 'ok', isError: false, hasResult: true },
  ],
});

const run: RunRecord = {
  runId: 'r-1',
  threadId: 't-1',
  tenant: 'default',
  startedAt: '2026-08-29T10:00:00.000Z',
  status: 'done',
  message: 'q',
  provider: 'fake/fake',
  primitivesRead: ['evaluate'],
  toolCalls: [
    { name: 'vault_read', ms: 18, isError: false },
    { name: 'vault_read', ms: 9, isError: false },
    { name: 'propose_update', ms: 3, isError: false },
  ],
  proposals: ['p-1'],
  usage: { inputTokens: 120, outputTokens: 40 },
  costUsd: 0.0012,
  durationMs: 1640,
};

afterEach(cleanup);

describe('pillFor', () => {
  test('the run record wins; a turn alone reads its own status', () => {
    expect(pillFor(turn, run)).toEqual({ kind: 'done', label: 'done' });
    expect(pillFor(turn, { ...run, status: 'timeout' })).toEqual({ kind: 'timeout', label: 'timed out' });
    expect(pillFor({ ...turn, status: 'error' })).toEqual({ kind: 'error', label: 'error' });
    expect(pillFor({ ...turn, status: 'streaming' })).toEqual({ kind: 'running', label: 'running' });
  });
});

describe('Strip', () => {
  test('collapsed: pill, summary, provider, duration, tokens', () => {
    render(<Strip turn={turn} run={run} ms={{}} />);
    expect(document.querySelector('summary .v2-pill')?.textContent).toBe('done');
    expect(screen.getByText('read 2 files, ran 1 tool')).toBeTruthy();
    expect(screen.getByText('fake/fake')).toBeTruthy();
    expect(screen.getByText('1.6 s')).toBeTruthy();
    expect(screen.getByText('120 in / 40 out')).toBeTruthy();
  });

  test('expanded: steps with their ms, primitives, proposals, cost, run id', async () => {
    render(<Strip turn={turn} run={run} ms={{ 'c-1': 18, 'c-2': 9, 'c-3': 3 }} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(document.querySelectorAll('.v2-step')).toHaveLength(3);
    expect(screen.getByText(/18 ms/)).toBeTruthy();
    expect(screen.getByText('evaluate')).toBeTruthy();
    expect(screen.getByText('p-1')).toBeTruthy();
    expect(screen.getByText('$0.0012')).toBeTruthy();
    expect(screen.getByText('r-1')).toBeTruthy();
  });

  test('an error record shows the message and the raw text', async () => {
    render(<Strip turn={{ ...turn, status: 'error' }} run={{ ...run, status: 'error', error: 'schema', errorText: '{"a":1}' }} ms={{}} />);
    expect(document.querySelector('summary .v2-pill')?.textContent).toBe('error');
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(screen.getByText('schema')).toBeTruthy();
    expect(screen.getByText('{"a":1}')).toBeTruthy();
  });
});
```

- [ ] **Step 14: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/chat/Strip.test.tsx`
Expected: FAIL — `Cannot find module './Strip'`.

- [ ] **Step 15: Implement `Strip.tsx`**

`runtime/ui/src/v2/chat/Strip.tsx`:

```tsx
import type { RunRecord, RunStatus } from '../../api/types';
import type { AssistantTurn } from '../../chat/turns';
import { summarize } from '../verbs';
import { Steps } from './Steps';

export interface StripProps {
  turn: AssistantTurn;
  /** The run record once `GET /runs?thread=` has it. */
  run?: RunRecord;
  /** Milliseconds per tool id (from the record, or measured live). */
  ms: Record<string, number>;
  onOpenFile?: (path: string) => void;
}

export interface Pill {
  kind: RunStatus;
  label: string;
}

/** The status pill: the record when there is one, else the turn's own state. */
export function pillFor(turn: AssistantTurn, run?: RunRecord): Pill {
  const kind: RunStatus = run?.status ?? (turn.status === 'error' ? 'error' : turn.status === 'done' ? 'done' : 'running');
  return { kind, label: kind === 'timeout' ? 'timed out' : kind };
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Sub-cent runs are the common case; two decimals would read as free. */
export function formatCost(usd: number): string {
  return usd === 0 ? '$0' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

/**
 * A finished turn's work, folded into one line (spec §2, "Turn when
 * finished"): pill · "read 2 files, ran 1 tool" · provider · duration ·
 * tokens · chevron. Open, it is the full record — the steps with show/hide,
 * primitives read, proposals, usage and cost, the run id.
 */
export function Strip({ turn, run, ms, onOpenFile }: StripProps): JSX.Element {
  const pill = pillFor(turn, run);
  const provider = run?.provider !== undefined && run.provider !== '' ? run.provider : (turn.provider ?? '');
  return (
    <details className="v2-strip" data-testid={run === undefined ? undefined : `run-${run.runId}`}>
      <summary>
        <span className={`v2-pill v2-pill-${pill.kind}`}>{pill.label}</span>
        <span className="v2-strip-summary">{summarize(turn.tools)}</span>
        {provider === '' ? null : <span className="v2-strip-provider">{provider}</span>}
        {run?.durationMs === undefined ? null : <span className="v2-strip-duration">{formatMs(run.durationMs)}</span>}
        {run?.usage === undefined ? null : (
          <span className="v2-strip-tokens">
            {run.usage.inputTokens} in / {run.usage.outputTokens} out
          </span>
        )}
        <span className="v2-chevron" aria-hidden="true">
          ›
        </span>
      </summary>

      <div className="v2-strip-body">
        <h4>Steps</h4>
        {turn.tools.length === 0 ? <p className="muted">No tools ran.</p> : <Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />}

        {run === undefined ? null : (
          <dl className="v2-record">
            <dt>Model</dt>
            <dd>{run.provider === '' ? 'no provider' : run.provider}</dd>
            {run.task === undefined ? null : (
              <>
                <dt>Task</dt>
                <dd>{run.task}</dd>
              </>
            )}
            <dt>Primitives read</dt>
            <dd>{run.primitivesRead.length === 0 ? 'none' : run.primitivesRead.join(', ')}</dd>
            <dt>Proposals</dt>
            <dd>
              {run.proposals.length === 0
                ? 'none'
                : run.proposals.map(id => (
                    <code key={id} className="v2-record-id">
                      {id}
                    </code>
                  ))}
            </dd>
            {run.usage === undefined ? null : (
              <>
                <dt>Usage</dt>
                <dd>
                  {run.usage.inputTokens} in / {run.usage.outputTokens} out
                  {run.costUsd === undefined ? '' : ' · '}
                  {run.costUsd === undefined ? null : <span className="v2-record-cost">{formatCost(run.costUsd)}</span>}
                </dd>
              </>
            )}
            <dt>Run</dt>
            <dd>
              <code>{run.runId}</code>
            </dd>
          </dl>
        )}

        {run?.error === undefined ? null : (
          <div className="v2-notice v2-notice-error">
            <p>{run.error}</p>
            {run.errorText === undefined ? null : <pre>{run.errorText}</pre>}
          </div>
        )}
      </div>
    </details>
  );
}
```

- [ ] **Step 16: Run the Strip test**

Run: `cd runtime/ui && bun test src/v2/chat/Strip.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 17: Implement `Turn.tsx`** (rendered through the Chat test below; no test of its own)

`runtime/ui/src/v2/chat/Turn.tsx`:

```tsx
import type { RunRecord } from '../../api/types';
// Task 3 replaces this import with `./ProposalCard` (the redline card).
import { ProposalCard } from '../../chat/ProposalCard';
import type { ToolCallView, Turn } from '../../chat/turns';
import { Steps } from './Steps';
import { Strip } from './Strip';

export interface TurnProps {
  turn: Turn;
  /** `null` only while the pane is a draft — no proposal can exist then. */
  threadId: string | null;
  run?: RunRecord;
  /** True only for the turn currently streaming. */
  live?: boolean;
  /** Milliseconds measured by the stream, per tool id, for the live turn. */
  liveMs?: Record<string, number>;
  onReload: () => void;
  onOpenFile?: (path: string) => void;
}

/** The record's per-call timings, keyed onto this turn's tool ids. The
 * record lists calls in order without ids, so it is paired by position and
 * checked by name; a `null` ms (never paired with a result) is left out. */
export function msFromRun(tools: ToolCallView[], run: RunRecord | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (run === undefined) return out;
  tools.forEach((tool, i) => {
    const call = run.toolCalls[i];
    if (call !== undefined && call.name === tool.name && call.ms !== null) out[tool.id] = call.ms;
  });
  return out;
}

/**
 * One turn (spec §2): a user bubble, or the assistant's answer FIRST, then
 * its proposals, then the strip. While streaming, the timeline runs above
 * the text so the reader sees the work as it happens.
 */
export function TurnView({ turn, threadId, run, live = false, liveMs = {}, onReload, onOpenFile }: TurnProps): JSX.Element {
  if (turn.kind === 'user') {
    return (
      <article className="v2-turn v2-turn-user">
        <p className="v2-user-text">{turn.content}</p>
      </article>
    );
  }

  const streaming = live && turn.status === 'streaming';
  const ms = { ...msFromRun(turn.tools, run), ...liveMs };

  return (
    <article className={streaming ? 'v2-turn v2-turn-assistant v2-live' : 'v2-turn v2-turn-assistant'}>
      {turn.warnings.map((message, i) => (
        <p className="v2-notice v2-notice-warn" key={`warning-${i}`} role="status">
          {message}
        </p>
      ))}

      {streaming ? (
        <>
          <Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />
          {turn.text === '' ? (
            <p className="v2-working" role="status">
              working…
            </p>
          ) : (
            <p className="v2-prose">{turn.text}</p>
          )}
        </>
      ) : (
        <>
          {turn.text === '' ? null : <p className="v2-prose">{turn.text}</p>}

          {turn.error === undefined ? null : (
            <div className="v2-notice v2-notice-error" role="alert">
              <p>{turn.error.message}</p>
              {turn.error.text === undefined ? null : (
                <details>
                  <summary>show answer</summary>
                  <pre>{turn.error.text}</pre>
                </details>
              )}
            </div>
          )}

          {threadId === null
            ? null
            : turn.proposals.map(proposal => (
                <ProposalCard key={proposal.id} threadId={threadId} proposal={proposal} onReload={onReload} />
              ))}

          <Strip turn={turn} run={run} ms={ms} onOpenFile={onOpenFile} />
        </>
      )}
    </article>
  );
}
```

- [ ] **Step 18: Write the failing Composer test**

`runtime/ui/src/v2/chat/Composer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ProviderInfo } from '../../api/types';
import { Composer } from './Composer';

function provider(id: string): ProviderInfo {
  return { id, kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } };
}

const PROVIDERS = [provider('fake/fake'), provider('ollama/qwen3')];

function noop(): void {}

afterEach(cleanup);

describe('v2 Composer', () => {
  test('Cmd+Enter sends and clears; Enter alone does not', async () => {
    const sent: Array<[string, string]> = [];
    render(<Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={(m, p) => sent.push([m, p])} onStop={noop} />);
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await userEvent.type(box, 'Check the cap.');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sent).toEqual([]);
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    expect(sent).toEqual([['Check the cap.', 'fake/fake']]);
    expect(box.value).toBe('');
  });

  test('a default no loaded provider answers to falls back to the first, and says so', () => {
    render(<Composer providers={PROVIDERS} defaultProvider="openai/nope" streaming={false} onSend={noop} onStop={noop} />);
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('fake/fake');
    expect(screen.getByText(/is not loaded/).textContent).toContain('openai/nope');
  });

  test('streaming disables the box and offers Stop', async () => {
    let stopped = 0;
    render(<Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming onSend={noop} onStop={() => { stopped += 1; }} />);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(stopped).toBe(1);
  });
});
```

- [ ] **Step 19: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/chat/Composer.test.tsx`
Expected: FAIL — `Cannot find module './Composer'`.

- [ ] **Step 20: Implement `Composer.tsx`**

`runtime/ui/src/v2/chat/Composer.tsx` (the v1 logic, including the seed-from-loaded-providers fix, in v2 dress):

```tsx
import { useState } from 'react';
import type { ProviderInfo } from '../../api/types';

export interface ComposerProps {
  providers: ProviderInfo[];
  /** `/health`'s `default`; `null` or an id no loaded provider answers to
   * when the saved default names a provider this runtime did not load. */
  defaultProvider: string | null;
  streaming: boolean;
  disabled?: boolean;
  onSend: (message: string, provider: string) => void;
  onStop: () => void;
}

/**
 * The message box and the model picker. ⌘⏎ / Ctrl⏎ sends; Enter makes a
 * paragraph. The picker is seeded from the LOADED providers, never blindly
 * from the saved default (the step-4 fix): a default naming an unloaded
 * provider falls back to the first loaded one, and the swap is said.
 */
export function Composer({ providers, defaultProvider, streaming, disabled = false, onSend, onStop }: ComposerProps): JSX.Element {
  const [message, setMessage] = useState('');
  const fallback = providers[0]?.id ?? '';
  const defaultLoaded = providers.some(p => p.id === defaultProvider);
  const [provider, setProvider] = useState(defaultLoaded ? (defaultProvider as string) : fallback);
  const swapped = !defaultLoaded && defaultProvider !== null && defaultProvider !== '' && fallback !== '';

  const send = (): void => {
    const trimmed = message.trim();
    if (trimmed === '' || streaming || disabled) return;
    onSend(trimmed, provider);
    setMessage('');
  };

  return (
    <form
      className="v2-composer"
      onSubmit={event => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        aria-label="Message"
        placeholder="Ask counsel…"
        rows={3}
        value={message}
        disabled={streaming || disabled}
        onChange={event => setMessage(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      {swapped ? (
        <p className="v2-notice v2-notice-warn v2-composer-note" role="status">
          default <code>{defaultProvider}</code> is not loaded — using <code>{fallback}</code>
        </p>
      ) : null}
      <div className="v2-composer-actions">
        <label className="v2-composer-model">
          <span className="v2-label">Model</span>
          <select aria-label="Model" value={provider} disabled={streaming || disabled} onChange={event => setProvider(event.target.value)}>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.id}
                {p.id === defaultProvider ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>
        <span className="v2-composer-hint muted">⌘⏎ to send</span>
        {streaming ? (
          <button type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="submit" className="v2-primary" disabled={disabled || message.trim() === ''}>
            Send
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 21: Run the Composer test**

Run: `cd runtime/ui && bun test src/v2/chat/Composer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 22: Write the failing v2 Chat test**

`runtime/ui/src/v2/chat/Chat.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health, Thread, ThreadEvent } from '../../api/types';
import { Chat } from './Chat';

const at = '2026-08-29T10:00:00.000Z';
const ANSWER = 'Hello from the model.';
const QUESTION = 'Check the Acme cap.';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [{ id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } }],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

function thread(id: string, events: ThreadEvent[]): Thread {
  return { header: { id, createdAt: at, updatedAt: at, sessions: {} }, events };
}

function answered(id: string): Thread {
  return thread(id, [
    { t: 'user', at, content: QUESTION },
    { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
    { type: 'tool_call', at, id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' } },
    { type: 'tool_result', at, id: 'c-1', name: 'vault_read', output: 'x' },
    { type: 'text', at, text: ANSWER },
    { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 2 } },
  ]);
}

function frame(ev: Record<string, unknown>): string {
  return `event: ${String(ev['type'])}\ndata: ${JSON.stringify({ ...ev, runId: 'r-1' })}\n\n`;
}

const SSE =
  frame({ type: 'tool_call', id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' } })
  + frame({ type: 'tool_result', id: 'c-1', name: 'vault_read', output: 'x' })
  + frame({ type: 'text', text: ANSWER })
  + frame({ type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function stream(body: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream', 'x-run-id': 'r-1' } },
  );
}

interface Call {
  method: string;
  url: string;
  body?: unknown;
}

const realFetch = globalThis.fetch;
let calls: Call[] = [];

/** `threadFor(n)` answers the nth `GET /threads/:id`. */
function install(threadFor: (n: number) => Promise<Response>): void {
  let loads = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    if (url.startsWith('/runs')) return json([]);
    if (method === 'POST' && url === '/threads') return json({ id: 't-9', title: QUESTION, createdAt: at, updatedAt: at, sessions: {} });
    if (url.endsWith('/steps')) return stream(SSE);
    if (url.startsWith('/threads/')) {
      loads += 1;
      return threadFor(loads);
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  }) as unknown as typeof fetch;
}

function composerIsUsable(): void {
  expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(false);
}

async function ask(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Message'), QUESTION);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('v2 Chat, from a draft', () => {
  test('the first send creates the thread with the first line as its title, then runs the step', async () => {
    install(async () => json(answered('t-9')));
    const created: string[] = [];
    render(<Chat threadId={null} health={health} onThreadCreated={header => created.push(header.id)} />);
    expect(screen.getByText(/New conversation/)).toBeTruthy();
    // A draft makes no request.
    expect(calls).toEqual([]);

    await ask();

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(calls[0]).toEqual({ method: 'POST', url: '/threads', body: { title: QUESTION } });
    expect(calls[1]!.url).toBe('/threads/t-9/steps');
    expect(created).toEqual(['t-9']);
    // Finished: the answer is prose, the work is a strip, the timeline is folded away.
    expect(document.querySelector('.v2-prose')?.textContent).toBe(ANSWER);
    expect(document.querySelector('.v2-strip .v2-strip-summary')?.textContent).toBe('read 1 file');
    composerIsUsable();
  });

  test('a failed create keeps the message on screen and frees the composer', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST' && String(input) === '/threads') return json({ error: 'disk full' }, 500);
      throw new Error(`unexpected fetch: ${String(input)}`);
    }) as unknown as typeof fetch;
    render(<Chat threadId={null} health={health} />);

    await ask();

    await waitFor(() => expect(screen.getByText(/disk full/)).toBeTruthy());
    expect(screen.getByText(QUESTION)).toBeTruthy();
    composerIsUsable();
  });
});

describe('v2 Chat, when the end-of-stream refetch fails', () => {
  test('keeps the answer, frees the composer, and offers Retry', async () => {
    install(async n => {
      if (n === 1) return json(thread('t-1', []));
      if (n === 2) return json({ error: 'the vault went away' }, 500);
      return json(answered('t-1'));
    });
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByText('No messages yet. Ask counsel something.')).toBeTruthy());

    await ask();

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(screen.getByText(QUESTION)).toBeTruthy();
    composerIsUsable();
    expect(screen.getByText(/the vault went away/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByText(/the vault went away/)).toBeNull());
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
  });
});
```

- [ ] **Step 23: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/chat/Chat.test.tsx`
Expected: FAIL — `Cannot find module './Chat'`.

- [ ] **Step 24: Implement the v2 `Chat.tsx`**

`runtime/ui/src/v2/chat/Chat.tsx` — the v1 `load()` / `settle()` / ticket pattern, copied, with three changes: the thread id lives in a ref so a draft can become a thread without a remount; `send` creates the thread first when there is none; tool timings are measured from the stream.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, streamStep } from '../../api/client';
import type { Health, RunRecord, Thread, ThreadHeader } from '../../api/types';
import { applyStepEvent, buildTurns, emptyAssistantTurn, type AssistantTurn, type Turn } from '../../chat/turns';
import { createThread, titleFor } from '../threads';
import { Composer } from './Composer';
import { TurnView } from './Turn';

export interface ChatProps {
  /** `null` is a draft: no thread exists until the first send creates one
   * with the message's first line as its title. */
  threadId: string | null;
  health: Health;
  /** The draft became a thread. The shell selects it WITHOUT re-keying this
   * component — a remount here would drop the stream in flight. */
  onThreadCreated?: (header: ThreadHeader) => void;
  onThreadTouched?: () => void;
  onOpenFile?: (path: string) => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * One thread: its transcript, the turn currently streaming, and the composer.
 *
 * History and the live turn are separate state. The transcript is whatever
 * `GET /threads/:id` last returned — never patched locally — and the live
 * turn is the stream's, held apart until the step ends and the thread is
 * refetched. `load` owns retiring the live turn (`settle`), on both its
 * paths, so any load that ends up owning a finished stream hands the
 * composer back.
 */
export function Chat({ threadId: initialThreadId, health, onThreadCreated, onThreadTouched, onOpenFile }: ChatProps): JSX.Element {
  /** The thread this pane is about. A ref, not only state: `load` and
   * `send` read it outside a render, and it changes exactly once — from
   * `null` to the id the first send created. Switching THREADS is the
   * shell's job, by re-keying this component. */
  const idRef = useRef<string | null>(initialThreadId);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);

  const [thread, setThread] = useState<Thread | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(initialThreadId !== null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [live, setLive] = useState<AssistantTurn | null>(null);
  const [frozen, setFrozen] = useState<Turn[]>([]);
  /** Milliseconds per tool id for the live turn, measured call → result. */
  const [liveMs, setLiveMs] = useState<Record<string, number>>({});

  const abort = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<AssistantTurn | null>(null);
  const pendingRef = useRef<string | null>(null);
  const started = useRef<Map<string, number>>(new Map());
  const seq = useRef(0);

  const showLive = (next: AssistantTurn | null): void => {
    liveRef.current = next;
    setLive(next);
  };
  const showPending = (next: string | null): void => {
    pendingRef.current = next;
    setPending(next);
  };

  /** Retires a finished stream's turn: dropped (`keep === false`, a load
   * installed a transcript containing it) or parked in `frozen` (`true`,
   * the load failed and the transcript on screen does not have it). Does
   * nothing while a step is running — the stream owns `live` then. */
  const settle = (keep: boolean): void => {
    if (abort.current !== null) return;
    const streamed = liveRef.current;
    const asked = pendingRef.current;
    if (streamed === null && asked === null) return;
    if (keep) {
      setFrozen(current => [
        ...current,
        ...(asked === null ? [] : [{ kind: 'user', content: asked } as Turn]),
        ...(streamed === null ? [] : [streamed]),
      ]);
    }
    showLive(null);
    showPending(null);
  };

  const load = useCallback(async (): Promise<void> => {
    const id = idRef.current;
    if (id === null) {
      setLoading(false);
      return;
    }
    const ticket = ++seq.current;
    setError(null);
    try {
      const [next, nextRuns] = await Promise.all([
        fetchJson<Thread>(`/threads/${encodeURIComponent(id)}`),
        fetchJson<RunRecord[]>(`/runs?thread=${encodeURIComponent(id)}`),
      ]);
      if (ticket !== seq.current) return;
      setThread(next);
      setRuns(nextRuns);
      setFrozen([]);
      settle(false);
      setLoading(false);
    } catch (err) {
      if (ticket !== seq.current) return;
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      settle(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const el = transcript.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [thread, live, pending, frozen]);

  const send = async (message: string, provider: string): Promise<void> => {
    setError(null);
    showPending(message);

    if (idRef.current === null) {
      try {
        const header = await createThread({ title: titleFor(message) });
        idRef.current = header.id;
        setThreadId(header.id);
        onThreadCreated?.(header);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(`could not start the thread: ${detail(err)}`);
        // No step ran. The message stays on screen (frozen) and the box is free.
        settle(true);
        return;
      }
    }
    const id = idRef.current;

    const controller = new AbortController();
    abort.current = controller;
    started.current = new Map();
    setLiveMs({});
    showLive(emptyAssistantTurn());

    try {
      await streamStep(
        id,
        { message, provider },
        event => {
          if (event.type === 'tool_call') started.current.set(event.id, performance.now());
          if (event.type === 'tool_result') {
            const t0 = started.current.get(event.id);
            if (t0 !== undefined) {
              const ms = Math.round(performance.now() - t0);
              setLiveMs(current => ({ ...current, [event.id]: ms }));
            }
          }
          const base = liveRef.current ?? emptyAssistantTurn();
          const tagged = base.runId === undefined && event.runId !== undefined ? { ...base, runId: event.runId } : base;
          showLive(applyStepEvent(tagged, event));
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        showLive(applyStepEvent(liveRef.current ?? emptyAssistantTurn(), { type: 'error', message: detail(err) }));
        setError(detail(err));
      }
    } finally {
      abort.current = null;
      await load();
      onThreadTouched?.();
    }
  };

  const stop = (): void => abort.current?.abort();
  const reload = (): void => void load();

  const runById = new Map(runs.map(run => [run.runId, run]));
  const turns: Turn[] = thread === null ? [] : buildTurns(thread.events);
  const streaming = live !== null;
  const isDraft = threadId === null && pending === null && frozen.length === 0;
  const empty = !loading && threadId !== null && turns.length === 0 && frozen.length === 0 && pending === null;

  return (
    <section className="v2-chat">
      <div className="v2-transcript" ref={transcript}>
        {loading ? <p className="muted v2-empty">Loading…</p> : null}
        {isDraft ? <p className="muted v2-empty">New conversation. Ask counsel something — the thread is created when you send.</p> : null}
        {empty ? <p className="muted v2-empty">No messages yet. Ask counsel something.</p> : null}

        {turns.map((turn, i) => (
          <TurnView
            key={i}
            turn={turn}
            threadId={threadId}
            {...(turn.kind === 'assistant' && turn.runId !== undefined && runById.has(turn.runId) ? { run: runById.get(turn.runId)! } : {})}
            onReload={reload}
            onOpenFile={onOpenFile}
          />
        ))}
        {frozen.map((turn, i) => (
          <TurnView key={`frozen-${i}`} turn={turn} threadId={threadId} onReload={reload} onOpenFile={onOpenFile} />
        ))}
        {pending === null ? null : <TurnView turn={{ kind: 'user', content: pending }} threadId={threadId} onReload={reload} />}
        {live === null ? null : <TurnView turn={live} threadId={threadId} live liveMs={liveMs} onReload={reload} onOpenFile={onOpenFile} />}
      </div>

      {error === null ? null : (
        <div className="v2-notice v2-notice-error v2-chat-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <Composer
        providers={health.providers}
        defaultProvider={health.default}
        streaming={streaming}
        onSend={(message, provider) => void send(message, provider)}
        onStop={stop}
      />
    </section>
  );
}
```

- [ ] **Step 25: Run the v2 Chat test**

Run: `cd runtime/ui && bun test src/v2/chat/Chat.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 26: Wire the v2 Chat into the Shell**

In `runtime/ui/src/v2/Shell.tsx` replace `import { Chat } from '../chat/Chat';` with `import { Chat } from './chat/Chat';` and replace the whole `<main className="v2-main">…</main>` block with:

```tsx
          <main className="v2-main">
            {health === null ? (
              <p className="muted v2-empty">Loading…</p>
            ) : (
              <Chat
                key={chatKey}
                threadId={draft ? null : selected}
                health={health}
                onThreadCreated={header => {
                  // The draft is now a thread; select it without re-keying.
                  setSelected(header.id);
                  setDraft(false);
                  void loadThreads();
                }}
                onThreadTouched={() => void loadThreads()}
                onOpenFile={openDrawer}
              />
            )}
          </main>
```

- [ ] **Step 27: Append the turn styles**

Append to `runtime/ui/src/styles.css`:

```css
/* ── v2 chat ──────────────────────────────────────────────────────────── */

.v2-chat { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.v2-transcript { flex: 1; overflow-y: auto; padding: var(--s5) var(--s6); display: flex; flex-direction: column; gap: var(--s5); }
.v2-turn { max-width: 56rem; width: 100%; margin: 0 auto; }
.v2-turn-user { display: flex; justify-content: flex-end; }
.v2-user-text {
  margin: 0;
  max-width: 44rem;
  padding: var(--s2) var(--s3);
  background: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  white-space: pre-wrap;
}
.v2-turn-assistant { display: flex; flex-direction: column; gap: var(--s3); }
.v2-prose { font-family: var(--serif); font-size: 1.06rem; line-height: 1.6; white-space: pre-wrap; margin: 0; }
.v2-working { color: var(--fg-muted); font-style: italic; margin: 0; }
.v2-turn-assistant .v2-notice { margin: 0; }
.v2-chat-error { display: flex; gap: var(--s3); align-items: center; justify-content: space-between; }

/* Steps timeline */
.v2-steps { list-style: none; margin: 0; padding: 0 0 0 var(--s3); border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: var(--s1); font-size: 0.88rem; }
.v2-step { color: var(--fg-muted); }
.v2-step-verb { color: var(--fg); font-weight: 600; }
.v2-step-object { font-family: var(--mono); font-size: 0.85em; }
.v2-step-path { background: none; border: none; padding: 0; font: inherit; font-family: var(--mono); font-size: 0.85em; color: var(--accent); text-decoration: underline; cursor: pointer; }
.v2-step-ms { font-variant-numeric: tabular-nums; }
.v2-step-wait { margin-left: var(--s1); }
.v2-step-show { margin-left: var(--s2); font-size: 0.78rem; }
.v2-step-detail { margin: var(--s1) 0 var(--s2); }
.v2-step-detail pre { font-size: 0.8rem; max-height: 16rem; overflow: auto; }
.v2-step-error .v2-step-verb { color: var(--error); }

/* Strip */
.v2-strip { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-raised); font-size: 0.85rem; }
.v2-strip > summary { display: flex; gap: var(--s3); align-items: center; padding: var(--s2) var(--s3); cursor: pointer; list-style: none; color: var(--fg-muted); }
.v2-strip > summary::-webkit-details-marker { display: none; }
.v2-strip-summary { color: var(--fg); }
.v2-strip-provider { font-family: var(--mono); font-size: 0.78rem; }
.v2-strip-duration, .v2-strip-tokens { font-variant-numeric: tabular-nums; }
.v2-chevron { margin-left: auto; transition: transform 120ms; }
.v2-strip[open] .v2-chevron { transform: rotate(90deg); }
.v2-strip-body { padding: 0 var(--s3) var(--s3); border-top: 1px solid var(--border); }
.v2-strip-body h4 { margin-top: var(--s3); }
.v2-record { display: grid; grid-template-columns: auto 1fr; gap: var(--s1) var(--s3); margin: var(--s3) 0 0; }
.v2-record dt { color: var(--fg-muted); }
.v2-record dd { margin: 0; }
.v2-record-id { margin-right: var(--s2); }

/* Composer */
.v2-composer { border-top: 1px solid var(--border); padding: var(--s3) var(--s6); display: flex; flex-direction: column; gap: var(--s2); background: var(--bg-raised); }
.v2-composer textarea { width: 100%; max-width: 56rem; margin: 0 auto; resize: vertical; font-family: inherit; border-radius: var(--radius); padding: var(--s2) var(--s3); }
.v2-composer-actions { display: flex; gap: var(--s3); align-items: center; justify-content: flex-end; max-width: 56rem; width: 100%; margin: 0 auto; }
.v2-composer-model { display: flex; gap: var(--s1); align-items: center; margin-right: auto; }
.v2-composer-hint { font-size: 0.78rem; }
.v2-composer-note { margin: 0 auto; max-width: 56rem; width: 100%; }
.v2-label { color: var(--fg-muted); font-size: 0.78rem; }
.v2-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
```

- [ ] **Step 28: Typecheck, whole UI suite, build**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean; all pass; build ok.

- [ ] **Step 29: Commit**

```bash
git add runtime/ui/src/v2 runtime/ui/src/styles.css
git commit -m "ui: v2 turn — step timeline, verb table, run strip, draft-create-on-send chat"
```

---

### Task 3: The redline — `diff.ts` and the v2 ProposalCard

**Files:**
- Create: `runtime/ui/src/v2/diff.ts`, `diff.test.ts`, `runtime/ui/src/v2/chat/ProposalCard.tsx`, `ProposalCard.test.tsx`
- Modify: `runtime/ui/src/v2/chat/Turn.tsx` (import the v2 card, pass `onOpenFile`), `runtime/ui/src/styles.css` (append)

**Interfaces:**
- Consumes: `diffLines` from `diff` (added in Task 1); `ProposalView` from `src/chat/turns.ts`; `ApproveResult`, `ConflictBody`, `ProposalStatus`, `VaultFile` from `src/api/types.ts`; `isMarkdown`, `renderMarkdown` from `src/vault/markdown.ts` (the sanitizer sink); `fetchJson`, `ApiError`; `TurnView`'s `onOpenFile?: (path: string) => void` from Task 2.
- Produces: `type Hunk = HunkLine[]`, `interface HunkLine { kind: 'ctx' | 'add' | 'del'; text: string }`, `unifiedHunks(before: string, after: string, context = 3): Hunk[]`; `ProposalCard({ threadId, proposal, onReload, onOpenFile? })`. Class names `.v2-proposal .v2-diff .v2-hunk .v2-diff-line .v2-diff-add .v2-diff-del .v2-diff-ctx .v2-preview .v2-proposal-path .v2-proposal-version` (the e2e in Task 5 uses `.v2-proposal`, `.v2-diff-del`, `.v2-diff-add`, the "open in vault" button and the `.v2-pill`).

- [ ] **Step 1: Write the failing diff tests**

`runtime/ui/src/v2/diff.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { unifiedHunks } from './diff';

const EIGHT = 'a\nb\nc\nd\ne\nf\ng\nh\n';

describe('unifiedHunks', () => {
  test('identical text has no hunks', () => {
    expect(unifiedHunks(EIGHT, EIGHT)).toEqual([]);
  });

  test('one changed line gets three lines of context on each side', () => {
    const hunks = unifiedHunks(EIGHT, EIGHT.replace('e\n', 'E\n'));
    expect(hunks).toHaveLength(1);
    expect(hunks[0]).toEqual([
      { kind: 'ctx', text: 'b' },
      { kind: 'ctx', text: 'c' },
      { kind: 'ctx', text: 'd' },
      { kind: 'del', text: 'e' },
      { kind: 'add', text: 'E' },
      { kind: 'ctx', text: 'f' },
      { kind: 'ctx', text: 'g' },
      { kind: 'ctx', text: 'h' },
    ]);
  });

  test('changes far apart are separate hunks; near ones merge', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `l${i + 1}`);
    const before = lines.join('\n') + '\n';
    const far = before.replace('l3\n', 'L3\n').replace('l17\n', 'L17\n');
    expect(unifiedHunks(before, far)).toHaveLength(2);
    const near = before.replace('l3\n', 'L3\n').replace('l6\n', 'L6\n');
    expect(unifiedHunks(before, near)).toHaveLength(1);
  });

  test('a new file is one all-add hunk; a deleted line is a del', () => {
    expect(unifiedHunks('', 'x\ny\n')).toEqual([[{ kind: 'add', text: 'x' }, { kind: 'add', text: 'y' }]]);
    const hunk = unifiedHunks('a\nb\nc\n', 'a\nc\n')[0]!;
    expect(hunk).toEqual([
      { kind: 'ctx', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'ctx', text: 'c' },
    ]);
  });

  test('a file with no trailing newline keeps its last line', () => {
    expect(unifiedHunks('a\nb', 'a\nB')).toEqual([[{ kind: 'ctx', text: 'a' }, { kind: 'del', text: 'b' }, { kind: 'add', text: 'B' }]]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/diff.test.ts`
Expected: FAIL — `Cannot find module './diff'`.

- [ ] **Step 3: Implement `diff.ts`**

`runtime/ui/src/v2/diff.ts`:

```ts
/**
 * A unified diff for the proposal card (spec §2, "Proposal card"): the
 * current vault file against the proposed content, line by line, with three
 * lines of context around each change. Thin wrapper over `diff`'s
 * `diffLines`; everything about how it reads is decided here.
 */
import { diffLines } from 'diff';

export interface HunkLine {
  kind: 'ctx' | 'add' | 'del';
  text: string;
}

export type Hunk = HunkLine[];

/** Every line of both texts, tagged, in unified order. */
function tagged(before: string, after: string): HunkLine[] {
  const out: HunkLine[] = [];
  for (const change of diffLines(before, after)) {
    const kind: HunkLine['kind'] = change.added ? 'add' : change.removed ? 'del' : 'ctx';
    const parts = change.value.split('\n');
    if (parts[parts.length - 1] === '') parts.pop();
    for (const text of parts) out.push({ kind, text });
  }
  return out;
}

export function unifiedHunks(before: string, after: string, context = 3): Hunk[] {
  const all = tagged(before, after);
  const hunks: Hunk[] = [];
  let start = -1;
  let end = -1;
  all.forEach((line, i) => {
    if (line.kind === 'ctx') return;
    if (start === -1) {
      start = Math.max(0, i - context);
      end = Math.min(all.length, i + context + 1);
      return;
    }
    if (i - context <= end) {
      end = Math.min(all.length, i + context + 1);
      return;
    }
    hunks.push(all.slice(start, end));
    start = Math.max(0, i - context);
    end = Math.min(all.length, i + context + 1);
  });
  if (start !== -1) hunks.push(all.slice(start, end));
  return hunks;
}
```

- [ ] **Step 4: Run the diff tests**

Run: `cd runtime/ui && bun test src/v2/diff.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing ProposalCard tests**

`runtime/ui/src/v2/chat/ProposalCard.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { ProposalView } from '../../chat/turns';
import { ProposalCard } from './ProposalCard';

const at = '2026-08-29T10:00:00.000Z';

const proposal: ProposalView = {
  id: 'p-1',
  path: 'practice/standards/nda.md',
  rationale: 'The term we agreed is not written down.',
  content: '# NDA\nTerm: 3 years\n',
  status: 'pending',
};

const CURRENT = { path: proposal.path, content: '# NDA\nTerm: 2 years\n', version: 'abc1234def0' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];

function install(opts: { read?: () => Response; approve?: () => Response } = {}): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    if (url.startsWith('/vault/read')) return opts.read === undefined ? json(CURRENT) : opts.read();
    if (url.endsWith('/approve')) {
      if (opts.approve === undefined) throw new Error('no approve response configured');
      return opts.approve();
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

function lines(kind: 'add' | 'del' | 'ctx'): string[] {
  return Array.from(document.querySelectorAll(`.v2-diff-${kind}`), el => el.textContent ?? '');
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('v2 ProposalCard', () => {
  test('renders the redline against the current file, with its version', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del')).toEqual(['-Term: 2 years\n']));
    expect(lines('add')).toEqual(['+Term: 3 years\n']);
    expect(lines('ctx')).toEqual([' # NDA\n']);
    expect(screen.getByText('against version abc1234')).toBeTruthy();
    expect(calls[0]!.url).toBe('/vault/read?path=practice%2Fstandards%2Fnda.md');
    expect(screen.getByText(proposal.rationale)).toBeTruthy();
  });

  test('a file that does not exist yet is all additions', async () => {
    install({ read: () => json({ error: 'not found' }, 404) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('add')).toEqual(['+# NDA\n', '+Term: 3 years\n']));
    expect(lines('del')).toEqual([]);
  });

  test('preview renders the proposed markdown through the sanitizer', async () => {
    install();
    const scripted = { ...proposal, content: '# NDA\n<script>alert(1)</script>\nTerm: 3 years\n' };
    render(<ProposalCard threadId="t-1" proposal={scripted} onReload={() => {}} />);
    await waitFor(() => expect(lines('add').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'preview' }));

    expect(document.querySelector('.v2-preview h1')?.textContent).toBe('NDA');
    expect(document.querySelector('.v2-preview script')).toBeNull();
    expect(document.querySelector('.v2-preview')?.textContent).not.toContain('alert(1)');
    expect(document.querySelector('.v2-diff')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'diff' }));
    expect(document.querySelector('.v2-diff')).toBeTruthy();
  });

  test('approve calls the API, shows the status, and keeps the diff readable', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' }, version: 'new0000' }) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText('approved')).toBeTruthy());
    expect(calls.at(-1)).toEqual({ url: '/threads/t-1/approve', body: { proposalId: 'p-1', decision: 'approve' } });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(lines('del')).toEqual(['-Term: 2 years\n']);
  });

  test('a 409 conflict becomes the reload footer with both versions', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'expected-hash', actual: 'actual-hash' } }, 409) });
    let reloaded = 0;
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => { reloaded += 1; }} />);
    await waitFor(() => expect(lines('del').length).toBe(1));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText(/file changed since/)).toBeTruthy());
    expect(screen.getByText(/expected-hash/)).toBeTruthy();
    expect(screen.getByText(/actual-hash/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloaded).toBe(1);
    expect(screen.queryByText(/expected-hash/)).toBeNull();
  });

  test('a 409 for an already-decided proposal adopts the settled status', async () => {
    install({
      approve: () =>
        json({ error: 'proposal is not pending', proposal: { t: 'proposal', at, id: 'p-1', path: proposal.path, content: '', rationale: '', status: 'rejected', expectedVersion: null } }, 409),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('rejected')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  test('when the current file cannot be loaded, the proposed content stands alone and says why', async () => {
    install({ read: () => json({ error: 'vault unreadable' }, 500) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(screen.getByText(/could not load current file: vault unreadable/)).toBeTruthy());
    expect(document.querySelector('.v2-proposal-raw')?.textContent).toBe(proposal.content);
    expect(document.querySelector('.v2-diff')).toBeNull();
    // Still decidable.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('a live proposal with no content yet says the diff is loading', async () => {
    install();
    const { content: _dropped, ...live } = proposal;
    render(<ProposalCard threadId="t-1" proposal={live} onReload={() => {}} />);
    expect(screen.getByText('loading diff…')).toBeTruthy();
    expect(screen.getByText(proposal.path)).toBeTruthy();
  });

  test('open in vault hands the path to the drawer', async () => {
    install();
    const opened: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(opened).toEqual([proposal.path]);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/chat/ProposalCard.test.tsx`
Expected: FAIL — `Cannot find module './ProposalCard'`.

- [ ] **Step 7: Implement the v2 `ProposalCard.tsx`**

`runtime/ui/src/v2/chat/ProposalCard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { ApproveResult, ConflictBody, ProposalStatus, VaultFile } from '../../api/types';
import type { ProposalView } from '../../chat/turns';
import { isMarkdown, renderMarkdown } from '../../vault/markdown';
import { unifiedHunks, type Hunk } from '../diff';

export interface ProposalCardProps {
  threadId: string;
  proposal: ProposalView;
  /** Refetches the thread. Offered after a conflict. */
  onReload: () => void;
  /** Opens the path in the vault drawer. Without it, "open in vault" is a
   * link to the full page. */
  onOpenFile?: (path: string) => void;
}

interface Conflict {
  expected: string;
  actual: string;
}

/** The vault file as it stands, fetched for the diff's left-hand side. */
type Current =
  | { state: 'loading' }
  | { state: 'ready'; content: string; version: string | null }
  | { state: 'failed'; message: string };

/**
 * A proposed write as a redline (spec §2, "Proposal card"): the current
 * file against the proposed content, approve / reject in place, a preview
 * of the proposed markdown one flip away. Still the only place the UI
 * writes the vault, and the 409 handling is the step-4 card's: the file
 * moved, nothing was written, show both versions and offer a reload.
 *
 * The current file is fetched ONCE, on mount — not again after a decision —
 * so an approved card keeps showing what changed rather than an empty diff
 * of the file against itself.
 */
export function ProposalCard({ threadId, proposal, onReload, onOpenFile }: ProposalCardProps): JSX.Element {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'diff' | 'preview'>('diff');
  const [current, setCurrent] = useState<Current>({ state: 'loading' });

  // A reload brings a fresh proposal in on the same key; the server's copy wins.
  const [syncedFrom, setSyncedFrom] = useState<ProposalStatus>(proposal.status);
  if (proposal.status !== syncedFrom) {
    setSyncedFrom(proposal.status);
    setStatus(proposal.status);
    setConflict(null);
    setError(null);
  }

  useEffect(() => {
    let live = true;
    setCurrent({ state: 'loading' });
    void (async () => {
      try {
        const file = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(proposal.path)}`);
        if (live) setCurrent({ state: 'ready', content: file.content, version: file.version });
      } catch (err) {
        if (!live) return;
        // A file that does not exist yet is an honest "before": empty, so
        // every proposed line reads as an addition.
        if (err instanceof ApiError && err.status === 404) setCurrent({ state: 'ready', content: '', version: null });
        else if (!(err instanceof ApiError && err.status === 401)) {
          setCurrent({ state: 'failed', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [proposal.path]);

  const decide = async (decision: 'approve' | 'reject'): Promise<void> => {
    setBusy(true);
    setConflict(null);
    setError(null);
    try {
      const result = await fetchJson<ApproveResult>(`/threads/${encodeURIComponent(threadId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ proposalId: proposal.id, decision }),
      });
      setStatus(result.proposal?.status ?? (decision === 'approve' ? 'approved' : 'rejected'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as ConflictBody | null;
        if (body?.conflict) {
          setConflict(body.conflict);
        } else {
          if (body?.proposal) setStatus(body.proposal.status);
          setError(body?.error ?? 'this proposal is no longer pending');
        }
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const hunks: Hunk[] | null =
    current.state === 'ready' && proposal.content !== undefined ? unifiedHunks(current.content, proposal.content) : null;

  return (
    <section className="v2-card v2-proposal" data-testid={`proposal-${proposal.id}`}>
      <header className="v2-proposal-head">
        <span className="v2-tag">proposal</span>
        <code className="v2-proposal-path">{proposal.path}</code>
        {onOpenFile === undefined ? (
          <a className="v2-link" href={`#/vault?path=${encodeURIComponent(proposal.path)}`}>
            open in vault
          </a>
        ) : (
          <button type="button" className="v2-link" onClick={() => onOpenFile(proposal.path)}>
            open in vault
          </button>
        )}
        <span className={`v2-pill v2-pill-${status}`}>{status}</span>
      </header>

      <p className="v2-proposal-rationale">{proposal.rationale}</p>

      {proposal.content === undefined ? (
        // The stream's `proposal` event carries no content; the reload after
        // the step brings it (spec §2, "Live proposal").
        <p className="muted v2-proposal-loading" role="status">
          loading diff…
        </p>
      ) : current.state === 'loading' ? (
        <p className="muted" role="status">
          loading current file…
        </p>
      ) : (
        <>
          <div className="v2-proposal-tools">
            <button type="button" className="v2-link" aria-pressed={view === 'diff'} onClick={() => setView('diff')}>
              diff
            </button>
            <button type="button" className="v2-link" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>
              preview
            </button>
            {current.state === 'ready' && current.version !== null ? (
              <span className="v2-proposal-version">against version {current.version.slice(0, 7)}</span>
            ) : null}
          </div>

          {current.state === 'failed' ? (
            <p className="v2-notice v2-notice-warn" role="status">
              could not load current file: {current.message}
            </p>
          ) : null}

          {view === 'preview' ? (
            <Preview path={proposal.path} content={proposal.content} />
          ) : hunks === null ? (
            <pre className="v2-proposal-raw">{proposal.content}</pre>
          ) : hunks.length === 0 ? (
            <p className="muted">No changes — the file already says this.</p>
          ) : (
            <Diff hunks={hunks} />
          )}
        </>
      )}

      {status === 'pending' && conflict === null ? (
        <div className="v2-proposal-actions">
          <button type="button" className="v2-primary" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </button>
        </div>
      ) : null}

      {conflict === null ? null : (
        <footer className="v2-notice v2-notice-error v2-proposal-conflict" role="alert">
          <p>The file changed since this was proposed, so nothing was written — reload the thread and ask again.</p>
          <dl className="v2-conflict">
            <dt>Expected</dt>
            <dd>
              <code>{conflict.expected}</code>
            </dd>
            <dt>Actual</dt>
            <dd>
              <code>{conflict.actual}</code>
            </dd>
          </dl>
          <button
            type="button"
            onClick={() => {
              setConflict(null);
              setError(null);
              onReload();
            }}
          >
            Reload
          </button>
        </footer>
      )}

      {error === null ? null : (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Diff({ hunks }: { hunks: Hunk[] }): JSX.Element {
  return (
    <div className="v2-diff">
      {hunks.map((hunk, h) => (
        <pre className="v2-hunk" key={h}>
          {hunk.map((line, i) => (
            <span key={i} className={`v2-diff-line v2-diff-${line.kind}`}>
              {(line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' ') + line.text + '\n'}
            </span>
          ))}
        </pre>
      ))}
    </div>
  );
}

/** The proposed file as it would read. `renderMarkdown` is the sanitizer's
 * one entry point — the only HTML sink in the app. */
function Preview({ path, content }: { path: string; content: string }): JSX.Element {
  return isMarkdown(path) ? (
    <div className="markdown v2-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
  ) : (
    <pre className="v2-preview">{content}</pre>
  );
}
```

- [ ] **Step 8: Run the ProposalCard tests**

Run: `cd runtime/ui && bun test src/v2/chat/ProposalCard.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 9: Use the v2 card in `Turn.tsx`**

In `runtime/ui/src/v2/chat/Turn.tsx` replace `import { ProposalCard } from '../../chat/ProposalCard';` (and its comment) with `import { ProposalCard } from './ProposalCard';`, and pass the drawer through:

```tsx
                <ProposalCard key={proposal.id} threadId={threadId} proposal={proposal} onReload={onReload} onOpenFile={onOpenFile} />
```

- [ ] **Step 10: Append the proposal styles**

Append to `runtime/ui/src/styles.css`:

```css
/* ── v2 proposal card ─────────────────────────────────────────────────── */

.v2-card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-raised); box-shadow: var(--shadow); }
.v2-proposal { padding: var(--s3) var(--s4); border-left: 3px solid var(--accent); display: flex; flex-direction: column; gap: var(--s2); }
.v2-proposal-head { display: flex; gap: var(--s3); align-items: center; flex-wrap: wrap; }
.v2-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); font-weight: 700; }
.v2-proposal-path { word-break: break-all; }
.v2-proposal-head .v2-pill { margin-left: auto; }
.v2-proposal-rationale { margin: 0; font-family: var(--serif); }
.v2-proposal-tools { display: flex; gap: var(--s3); align-items: baseline; font-size: 0.82rem; }
.v2-proposal-version { margin-left: auto; color: var(--fg-muted); font-family: var(--mono); font-size: 0.75rem; }
.v2-proposal-actions { display: flex; gap: var(--s2); }
.v2-proposal .v2-notice { margin: 0; }
.v2-diff { display: flex; flex-direction: column; gap: var(--s2); }
.v2-hunk { margin: 0; padding: var(--s2) 0; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-sunken); font-size: 0.82rem; line-height: 1.5; white-space: pre; overflow-x: auto; }
.v2-diff-line { display: block; padding: 0 var(--s3); }
.v2-diff-add { background: rgba(47, 122, 62, 0.14); color: var(--ok); }
.v2-diff-del { background: rgba(180, 35, 24, 0.12); color: var(--error); text-decoration: line-through; text-decoration-color: rgba(180, 35, 24, 0.5); }
.v2-diff-ctx { color: var(--fg-muted); }
.v2-preview { padding: var(--s3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-sunken); font-family: var(--serif); }
.v2-proposal-raw { margin: 0; }
.v2-conflict { display: grid; grid-template-columns: auto 1fr; gap: var(--s1) var(--s3); margin: 0 0 var(--s2); }
.v2-conflict dt { color: var(--fg-muted); font-size: 0.8rem; }
.v2-conflict dd { margin: 0; word-break: break-all; }
```

- [ ] **Step 11: Typecheck, whole UI suite, build**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean; all pass; build ok.

- [ ] **Step 12: Commit**

```bash
git add runtime/ui/src/v2/diff.ts runtime/ui/src/v2/diff.test.ts runtime/ui/src/v2/chat/ProposalCard.tsx runtime/ui/src/v2/chat/ProposalCard.test.tsx runtime/ui/src/v2/chat/Turn.tsx runtime/ui/src/styles.css
git commit -m "ui: v2 proposal card as a redline — unified diff, preview through the sanitizer, approve/reject, 409 reload"
```

---

### Task 4: Vault page, drawer polish, grouped settings page, keyboard

**Files:**
- Create: `runtime/ui/src/v2/vault/VaultPage.tsx`, `VaultPage.test.tsx`, `runtime/ui/src/v2/settings/SettingsPage.tsx`, `SettingsPage.test.tsx`, `runtime/ui/src/v2/Shell.test.tsx`
- Modify: `runtime/ui/src/v2/Drawer.tsx` (breadcrumb), `runtime/ui/src/v2/Shell.tsx` (use `VaultPage`, `SettingsPage`), `runtime/ui/src/styles.css` (append)

**Interfaces:**
- Consumes: `Tree`, `FileView` from `src/vault/`; `Health` from `src/settings/Health.tsx`; `ProviderTest` from `src/settings/ProviderTest.tsx`; `emptyRow`, `formFromRegistry`, `mapIssues`, `registryFromForm`, `FieldErrors`, `FormState`, `ProviderRow`, `Tri` from `src/settings/registry-form.ts`; `DesignToggle` from `src/settings/DesignToggle.tsx` (Task 1); `SettingsView`, `SettingsErrorBody`, `Health as HealthData` from `src/api/types.ts`; `Drawer`, `Shell` from Task 1.
- Produces: `VaultPage({ path, onOpen })`; `Breadcrumb({ path })` and `crumbs(path): string[]`; `SettingsPage({ health })`. Class names `.v2-vault .v2-vault-main .v2-crumbs .v2-crumb .v2-settings .v2-group` (the e2e in Task 5 uses the `switch` role and `.settings-health .facts`, which `Health` keeps).

- [ ] **Step 1: Write the failing VaultPage test**

`runtime/ui/src/v2/vault/VaultPage.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import { Breadcrumb, crumbs, VaultPage } from './VaultPage';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/list')) return json([{ path: 'matters', kind: 'dir' }, { path: 'matters/acme.md', kind: 'file' }]);
    if (url.startsWith('/vault/read')) return json({ path: 'matters/acme.md', content: '# Acme\n\nTerm: 2 years\n', version: 'abc1234def' });
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('crumbs', () => {
  test('splits a path into its segments', () => {
    expect(crumbs('practice/standards/nda.md')).toEqual(['practice', 'standards', 'nda.md']);
    expect(crumbs('nda.md')).toEqual(['nda.md']);
  });
});

describe('Breadcrumb', () => {
  test('renders every segment, the last one marked', () => {
    render(<Breadcrumb path="practice/standards/nda.md" />);
    expect(document.querySelectorAll('.v2-crumb')).toHaveLength(3);
    expect(document.querySelector('.v2-crumb-last')?.textContent).toBe('nda.md');
  });
});

describe('VaultPage', () => {
  test('with no path, the tree loads and asks for a file', async () => {
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText('matters')).toBeTruthy());
    expect(screen.getByText('Pick a file to read it.')).toBeTruthy();
  });

  test('with a path, the file renders under its breadcrumb and version', async () => {
    const opened: string[] = [];
    render(<VaultPage path="matters/acme.md" onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy());
    expect(document.querySelector('.v2-crumb-last')?.textContent).toBe('acme.md');
    expect(screen.getByText(/version abc1234def/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'matters' }));
    await userEvent.click(screen.getByRole('button', { name: 'acme.md' }));
    expect(opened).toEqual(['matters/acme.md']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/vault/VaultPage.test.tsx`
Expected: FAIL — `Cannot find module './VaultPage'`.

- [ ] **Step 3: Implement `VaultPage.tsx`**

`runtime/ui/src/v2/vault/VaultPage.tsx`:

```tsx
import { FileView } from '../../vault/FileView';
import { Tree } from '../../vault/Tree';

export interface VaultPageProps {
  /** The file named by `#/vault?path=…`, or `null` for the tree alone. */
  path: string | null;
  onOpen(path: string): void;
}

export function crumbs(path: string): string[] {
  return path.split('/').filter(segment => segment !== '');
}

/** Where the open file sits in the vault. Plain text — the tree beside it is
 * the navigation; this is orientation. */
export function Breadcrumb({ path }: { path: string }): JSX.Element {
  const parts = crumbs(path);
  return (
    <nav className="v2-crumbs" aria-label="Breadcrumb">
      {parts.map((part, i) => (
        <span key={`${i}-${part}`}>
          {i > 0 ? (
            <span className="v2-crumb-sep" aria-hidden="true">
              ›
            </span>
          ) : null}
          <span className={i === parts.length - 1 ? 'v2-crumb v2-crumb-last' : 'v2-crumb'}>{part}</span>
        </span>
      ))}
    </nav>
  );
}

/** The full vault page (spec §2, "Vault page + drawer"): the same `Tree`
 * and `FileView` as v1, with the v2 tokens, a breadcrumb, and the file
 * header `FileView` already draws (path + version). */
export function VaultPage({ path, onOpen }: VaultPageProps): JSX.Element {
  return (
    <div className="v2-vault">
      <Tree selected={path} onSelect={onOpen} />
      <main className="v2-vault-main">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <>
            <Breadcrumb path={path} />
            <FileView key={path} path={path} />
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run the VaultPage test**

Run: `cd runtime/ui && bun test src/v2/vault/VaultPage.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Drawer polish — the breadcrumb above the file**

In `runtime/ui/src/v2/Drawer.tsx` add `import { Breadcrumb } from './vault/VaultPage';` and change the file block to:

```tsx
      <div className="v2-drawer-file">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <>
            <Breadcrumb path={path} />
            <FileView key={path} path={path} />
          </>
        )}
      </div>
```

Run: `cd runtime/ui && bun test src/v2/Drawer.test.tsx` — Expected: PASS (3 tests, unchanged).

- [ ] **Step 6: Write the failing SettingsPage test**

`runtime/ui/src/v2/settings/SettingsPage.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health as HealthData, SettingsView } from '../../api/types';
import { setUiFlag } from '../../ui-flag';
import { SettingsPage } from './SettingsPage';

const health: HealthData = { vault: '/Users/jack/legal', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 120000 };

const view: SettingsView = {
  file: '/Users/jack/.counsel-os/providers.yaml',
  registry: { default: 'fake/fake', providers: [{ id: 'openai-compatible/local', baseURL: 'http://127.0.0.1:11434/v1' }] },
  effective: {
    default: 'fake/fake',
    stepTimeoutMs: 120000,
    providers: [{ id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } }],
  },
};

const realFetch = globalThis.fetch;
let puts: unknown[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(onPut: (body: unknown) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/settings' && (init?.method ?? 'GET') === 'GET') return json(view);
    if (url === '/settings' && init?.method === 'PUT') {
      const body: unknown = JSON.parse(String(init.body));
      puts.push(body);
      return onPut(body);
    }
    throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  puts = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
  localStorage.clear();
  setUiFlag('v1');
});

describe('SettingsPage', () => {
  test('is grouped in the spec order and carries the design switch', async () => {
    install(() => json(view));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByText('Default provider')).toBeTruthy());
    const headings = Array.from(document.querySelectorAll('.v2-group > h2'), el => el.textContent);
    expect(headings).toEqual(['Design', 'Default provider', 'Step timeout', 'Providers', 'Task routes', 'Test', 'Runtime']);
    expect(screen.getByRole('switch', { name: 'Try the new design' })).toBeTruthy();
    // The Test group keeps the step-4 confirm, word for word.
    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(screen.getByText('This uses one call on fake/fake.')).toBeTruthy();
  });

  test('saves the edited registry and shows a 422 inline', async () => {
    install(body => {
      const reg = body as { default?: string };
      return reg.default === 'ollama/gemma4:e4b' ? json({ error: 'unknown provider ollama/gemma4:e4b' }, 422) : json(view);
    });
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Default provider')).toBeTruthy());

    const input = screen.getByLabelText('Default provider') as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'ollama/gemma4:e4b');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('unknown provider ollama/gemma4:e4b')).toBeTruthy());
    expect(puts).toHaveLength(1);
    expect((puts[0] as { default: string }).default).toBe('ollama/gemma4:e4b');
    expect((puts[0] as { providers: unknown[] }).providers).toHaveLength(1);
  });

  test('a 400 lands on the field it names', async () => {
    install(() => json({ error: 'invalid', issues: [{ path: ['stepTimeoutMs'], message: 'must be positive' }] }, 400));
    render(<SettingsPage health={health} />);
    await waitFor(() => expect(screen.getByLabelText('Step timeout (ms)')).toBeTruthy());
    await userEvent.type(screen.getByLabelText('Step timeout (ms)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('must be positive')).toBeTruthy());
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/settings/SettingsPage.test.tsx`
Expected: FAIL — `Cannot find module './SettingsPage'`.

- [ ] **Step 8: Implement `SettingsPage.tsx`**

`runtime/ui/src/v2/settings/SettingsPage.tsx` — the v1 form's logic (bound to `registry`, never `effective`; client-side checks from `registry-form.ts`; 400 issues mapped to fields; 422 as a general error), laid out as groups:

```tsx
import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { Health as HealthData, SettingsErrorBody, SettingsView } from '../../api/types';
import { DesignToggle } from '../../settings/DesignToggle';
import { Health } from '../../settings/Health';
import { ProviderTest } from '../../settings/ProviderTest';
import {
  emptyRow,
  formFromRegistry,
  mapIssues,
  registryFromForm,
  type FieldErrors,
  type FormState,
  type ProviderRow,
  type Tri,
} from '../../settings/registry-form';

export interface SettingsPageProps {
  health: HealthData | null;
}

/**
 * Settings, grouped (spec §2, "Settings page"): Design · Default provider ·
 * Step timeout · Providers · Task routes · Test — then Runtime, read-only.
 * The form edits `providers.yaml` exactly as the v1 form does; only the
 * arrangement is new.
 */
export function SettingsPage({ health }: SettingsPageProps): JSX.Element {
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setView(await fetchJson<SettingsView>('/settings'));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  return (
    <div className="v2-settings">
      <section className="v2-group">
        <DesignToggleGroup />
      </section>

      {error !== null ? (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      ) : view === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <RegistryForm key={view.file} view={view} onSaved={setView} />
          <section className="v2-group">
            <h2>Test</h2>
            <p className="muted">Runs one real step on a scratch thread. Each test costs one model call.</p>
            {view.effective.providers.length === 0 ? (
              <p className="muted">Nothing to test — no provider is loaded.</p>
            ) : (
              <ul className="v2-test-list">
                {view.effective.providers.map(provider => (
                  <li key={provider.id}>
                    <code>{provider.id}</code>
                    <ProviderTest providerId={provider.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="v2-group">
            <Health health={health} effective={view.effective} file={view.file} />
          </section>
        </>
      )}
    </div>
  );
}

/** `DesignToggle` draws its own `<h2>Design</h2>`; the group wrapper above
 * gives it the same card as every other group. */
function DesignToggleGroup(): JSX.Element {
  return <DesignToggle />;
}

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: '', label: 'default' },
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];

function RegistryForm({ view, onSaved }: { view: SettingsView; onSaved(next: SettingsView): void }): JSX.Element {
  const [form, setForm] = useState<FormState>(() => formFromRegistry(view.registry));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const effectiveIds = view.effective.providers.map(p => p.id);
  const defaultIsKnown = form.default.trim() === '' || effectiveIds.includes(form.default.trim());

  const patch = (change: Partial<FormState>): void => {
    setForm(prev => ({ ...prev, ...change }));
    setSaved(false);
  };
  const patchRow = (index: number, change: Partial<ProviderRow>): void => {
    setForm(prev => ({ ...prev, providers: prev.providers.map((row, i) => (i === index ? { ...row, ...change } : row)) }));
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    setSaved(false);
    const built = registryFromForm(form);
    if (!built.ok) {
      setErrors(built.errors);
      setGeneral([]);
      return;
    }
    setErrors({});
    setGeneral([]);
    setBusy(true);
    try {
      const next = await fetchJson<SettingsView>('/settings', { method: 'PUT', body: JSON.stringify(built.registry) });
      setForm(formFromRegistry(next.registry));
      setSaved(true);
      onSaved(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        const body = err.body as SettingsErrorBody | null;
        const mapped = mapIssues(body?.issues ?? []);
        setErrors(mapped.fields);
        setGeneral([...(body?.error === undefined ? [] : [body.error]), ...mapped.general]);
      } else {
        setGeneral([err instanceof Error ? err.message : String(err)]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="v2-registry"
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      {general.length === 0 ? null : (
        <div className="v2-notice v2-notice-error" role="alert">
          {general.map(message => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {saved ? (
        <p className="v2-notice v2-notice-ok" role="status">
          Saved. The providers and the router were rebuilt in place.
        </p>
      ) : null}

      <section className="v2-group">
        <h2>Default provider</h2>
        <div className="field">
          <label htmlFor="v2-default">Default provider</label>
          <input id="v2-default" list="v2-default-options" value={form.default} onChange={e => patch({ default: e.target.value })} />
          <datalist id="v2-default-options">
            {effectiveIds.map(id => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <FieldError message={errors['default']} />
          {defaultIsKnown ? null : (
            <p className="v2-notice v2-notice-warn" role="status">
              No loaded provider is called <code>{form.default.trim()}</code>. Saving will leave every step falling back to the router.
            </p>
          )}
        </div>
      </section>

      <section className="v2-group">
        <h2>Step timeout</h2>
        <div className="field">
          <label htmlFor="v2-timeout">Step timeout (ms)</label>
          <input
            id="v2-timeout"
            type="number"
            min="1"
            step="1"
            value={form.stepTimeoutMs}
            placeholder={String(view.effective.stepTimeoutMs)}
            onChange={e => patch({ stepTimeoutMs: e.target.value })}
          />
          <FieldError message={errors['stepTimeoutMs']} />
        </div>
      </section>

      <section className="v2-group">
        <h2>Providers</h2>
        <p className="muted">
          Edits <code>{view.file}</code>. The built-ins are always loaded and never written here.
        </p>
        {form.providers.length === 0 ? <p className="muted">None configured.</p> : null}
        {form.providers.map((row, index) => (
          <div className="v2-provider" key={row.key}>
            <div className="v2-provider-grid">
              <div className="field">
                <label htmlFor={`v2-${row.key}-id`}>Id</label>
                <input id={`v2-${row.key}-id`} value={row.id} placeholder="openai/gpt-5.6" onChange={e => patchRow(index, { id: e.target.value })} />
                <FieldError message={errors[`providers.${index}.id`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-baseurl`}>baseURL</label>
                <input id={`v2-${row.key}-baseurl`} value={row.baseURL} placeholder="https://…" onChange={e => patchRow(index, { baseURL: e.target.value })} />
                <FieldError message={errors[`providers.${index}.baseURL`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-key`}>apiKeyEnv</label>
                <input id={`v2-${row.key}-key`} value={row.apiKeyEnv} placeholder="OPENAI_API_KEY" onChange={e => patchRow(index, { apiKeyEnv: e.target.value })} />
                <FieldError message={errors[`providers.${index}.apiKeyEnv`]} />
              </div>
              <TriField id={`v2-${row.key}-tools`} label="tools" value={row.tools} onChange={value => patchRow(index, { tools: value })} />
              <TriField id={`v2-${row.key}-caching`} label="caching" value={row.caching} onChange={value => patchRow(index, { caching: value })} />
              <TriField id={`v2-${row.key}-thinking`} label="thinking" value={row.thinking} onChange={value => patchRow(index, { thinking: value })} />
              <div className="field">
                <label htmlFor={`v2-${row.key}-context`}>contextTokens</label>
                <input id={`v2-${row.key}-context`} type="number" min="1" step="1" value={row.contextTokens} onChange={e => patchRow(index, { contextTokens: e.target.value })} />
                <FieldError message={errors[`providers.${index}.capabilities.contextTokens`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-auth`}>auth</label>
                <select id={`v2-${row.key}-auth`} value={row.auth} onChange={e => patchRow(index, { auth: e.target.value as ProviderRow['auth'] })}>
                  <option value="">default</option>
                  <option value="subscription">subscription</option>
                  <option value="apikey">apikey</option>
                  <option value="local">local</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="v2-link v2-remove"
              onClick={() => {
                patch({ providers: form.providers.filter((_, i) => i !== index) });
                setErrors({});
              }}
            >
              Remove provider {index + 1}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => patch({ providers: [...form.providers, emptyRow()] })}>
          Add provider
        </button>
      </section>

      <section className="v2-group">
        <h2>Task routes</h2>
        <div className="field">
          <label htmlFor="v2-tasks">Task routes (JSON)</label>
          <textarea
            id="v2-tasks"
            rows={8}
            spellCheck={false}
            value={form.tasks}
            placeholder={'{\n  "review": { "prefer": "claude-sub/claude-opus-5" }\n}'}
            onChange={e => patch({ tasks: e.target.value })}
          />
          <FieldError message={errors['tasks']} />
        </div>
        <button type="submit" className="v2-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </section>
    </form>
  );
}

function FieldError({ message }: { message?: string }): JSX.Element | null {
  if (message === undefined) return null;
  return (
    <p className="field-error v2-notice v2-notice-error" role="alert">
      {message}
    </p>
  );
}

function TriField({ id, label, value, onChange }: { id: string; label: string; value: Tri; onChange(value: Tri): void }): JSX.Element {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value as Tri)}>
        {TRI_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 9: Run the SettingsPage test**

Run: `cd runtime/ui && bun test src/v2/settings/SettingsPage.test.tsx`
Expected: PASS (3 tests). (The `Health` component's own `<h2>Runtime</h2>` is what the heading list's last entry matches; `DesignToggle`'s `<h2>Design</h2>` is the first.)

- [ ] **Step 10: Write the failing Shell keyboard test**

`runtime/ui/src/v2/Shell.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { Shell } from './Shell';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  history.replaceState(null, '', '/#/');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/health') return json({ vault: '/tmp/vault', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 1000 });
    if (url === '/threads') return json([]);
    if (url.startsWith('/vault/list')) return json([]);
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('Shell', () => {
  test('with no threads it opens a draft; nav Vault opens the drawer; Esc closes it', async () => {
    render(<Shell />);
    await waitFor(() => expect(screen.getByText(/New conversation/)).toBeTruthy());
    expect(screen.getByText('fake/fake')).toBeTruthy();
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();

    await userEvent.click(screen.getByRole('link', { name: 'Vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
    // Still on the chat route: the link opened a drawer, not a page.
    expect(location.hash).toBe('#/');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();
  });
});
```

- [ ] **Step 11: Run it to see it fail**

Run: `cd runtime/ui && bun test src/v2/Shell.test.tsx`
Expected: FAIL — `Cannot find module './Shell'` is NOT the failure (Shell exists since Task 1); it fails on `fake/fake` not found only if the top bar meta is missing. If it already passes, that is fine — this test locks the behaviour in for the Shell edits below.

- [ ] **Step 12: Mount the v2 pages in the Shell**

In `runtime/ui/src/v2/Shell.tsx` replace the imports `import { Settings } from '../settings/Settings';` and `import { Vault } from '../vault/Vault';` with:

```tsx
import { SettingsPage } from './settings/SettingsPage';
import { VaultPage } from './vault/VaultPage';
```

and replace the vault/settings branches of the render with:

```tsx
      ) : route === 'vault' ? (
        <VaultPage
          path={vaultPath}
          onOpen={path => {
            globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
          }}
        />
      ) : (
        <main className="v2-page">
          <SettingsPage health={health} />
        </main>
      )}
```

Run: `cd runtime/ui && bun test src/v2/Shell.test.tsx` — Expected: PASS (1 test).

- [ ] **Step 13: Append the page styles**

Append to `runtime/ui/src/styles.css`:

```css
/* ── v2 vault page + breadcrumb ───────────────────────────────────────── */

.v2-vault { display: grid; grid-template-columns: minmax(14rem, 18rem) 1fr; flex: 1; min-height: 0; }
.v2-vault-main { min-width: 0; overflow-y: auto; padding: var(--s5) var(--s6); }
.v2-vault-main .vault-file-view, .v2-drawer-file .vault-file-view { max-width: 56rem; }
.v2-vault-main .markdown, .v2-drawer-file .markdown { font-family: var(--serif); font-size: 1.02rem; line-height: 1.6; }
.v2-vault-main .markdown code, .v2-drawer-file .markdown code, .v2-vault-main .markdown pre, .v2-drawer-file .markdown pre { font-family: var(--mono); }
.v2-crumbs { display: flex; gap: var(--s1); align-items: baseline; font-size: 0.8rem; color: var(--fg-muted); margin-bottom: var(--s2); }
.v2-crumb-sep { margin: 0 var(--s1); }
.v2-crumb-last { color: var(--fg); font-weight: 600; }

/* ── v2 settings ──────────────────────────────────────────────────────── */

.v2-settings { max-width: 60rem; display: flex; flex-direction: column; gap: var(--s4); }
.v2-group { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-raised); padding: var(--s4) var(--s5); box-shadow: var(--shadow); }
.v2-group > h2, .v2-group .settings-design > h2, .v2-group .settings-health > h2 { margin-bottom: var(--s3); font-family: var(--serif); font-size: 1.05rem; }
.v2-registry { display: contents; }
.v2-provider { border-top: 1px dashed var(--border); padding-top: var(--s3); margin-top: var(--s3); }
.v2-provider:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.v2-provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--s2) var(--s3); }
.v2-remove { color: var(--error); }
.v2-test-list { list-style: none; margin: 0; padding: 0; }
.v2-test-list li { display: flex; gap: var(--s3); align-items: baseline; flex-wrap: wrap; padding: var(--s2) 0; border-bottom: 1px solid var(--border); }
.v2-notice-ok { color: var(--ok); }
```

- [ ] **Step 14: Typecheck, whole UI suite, build; look at the pages**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean; all pass; build ok. Then, with `ui:dev` + `serve --fake` and `?ui=v2`: `#/vault` shows the tree and, on a file, the breadcrumb over the serif file view; `#/settings` shows seven cards in the spec's order; ⌘⏎ sends; Esc closes the drawer.

- [ ] **Step 15: Commit**

```bash
git add runtime/ui/src/v2 runtime/ui/src/styles.css
git commit -m "ui: v2 vault page with breadcrumb, drawer polish, grouped settings page, Esc/⌘⏎"
```

---

### Task 5: e2e for both designs, screenshots, findings

**Files:**
- Modify: `e2e/ui.spec.ts` (add the v2 test; the v1 test stays as it is), `docs/superpowers/spikes/2026-08-28-runtime-spikes.md` (append "## Step 5 — design pass")
- Create: `docs/superpowers/spikes/img/design-pass-chat-strip.png`, `design-pass-proposal.png`, `design-pass-drawer.png`, `design-pass-settings.png`

**Interfaces:**
- Consumes: `VAULT_DIR`, `RUNTIME_FILE` from `e2e/paths.ts`; the fake script `e2e/fake-script.json` (`vault_read matters/acme.md`, `propose_update practice/standards/nda.md` with `# NDA\nTerm: 3 years\n`, text `Done.`); the v2 DOM from Tasks 1–4: `html[data-ui]`, `nav[aria-label="Threads"] li.v2-thread`, `.v2-transcript`, `.v2-prose`, `.v2-proposal`, `.v2-diff-del`, `.v2-diff-add`, `.v2-pill`, the "open in vault" button, `aside[aria-label="Vault drawer"]`, `.vault-file-path`, `.markdown`, `.v2-strip`, `.v2-strip-summary`, `.v2-step-verb`, the `switch` "Try the new design".
- Produces: `bun run e2e` covering both designs; the step-5 findings section.

- [ ] **Step 1: Machine prerequisite**

Run: `bunx playwright install chromium`
Expected: Chromium for Playwright `1.58.2` present (a no-op when already installed).

- [ ] **Step 2: Run the existing v1 flow to establish the baseline**

Run: `bun run e2e`
Expected: `1 passed` (the step-4 test, untouched by Tasks 1–4 — the v1 page is unchanged except the design switch on Settings).

- [ ] **Step 3: Add the v2 test**

In `e2e/ui.spec.ts`, extend the imports:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RUNTIME_FILE, VAULT_DIR } from './paths';
```

and append after the existing test:

```ts
/**
 * The same story in the new design (spec 2026-08-29-ui-design-pass §6),
 * turned on by `?ui=v2` in the fragment. It runs AFTER the v1 test on the
 * same server and vault, which the v1 approval has already written — so it
 * starts by putting a different "before" on disk, which is what makes the
 * redline show a deletion and an addition rather than nothing at all.
 */
test('the new design: a draft names its thread, the proposal is a redline, the drawer shows the file, the strip says done', async ({ page }) => {
  writeFileSync(join(VAULT_DIR, 'practice', 'standards', 'nda.md'), '# NDA\nTerm: 2 years\n');

  await test.step('?ui=v2 in the fragment turns the design on and leaves the URL', async () => {
    await page.goto(`/#token=${await token()}&/?ui=v2`);
    await expect(page.locator('html')).toHaveAttribute('data-ui', 'v2');
    await expect.poll(() => page.url()).not.toContain('token=');
    await expect.poll(() => page.url()).not.toContain('ui=');
    await expect(page.locator('.v2-top-model')).toHaveText('fake/fake');
  });

  const threads = page.locator('nav[aria-label="Threads"] li.v2-thread');
  const before = await threads.count();

  await test.step('New opens a draft and makes no thread', async () => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.locator('.v2-transcript')).toContainText('New conversation');
    await expect(threads).toHaveCount(before);
    await expect(page.locator('nav[aria-label="Threads"] li.v2-draft')).toHaveCount(1);
  });

  await test.step('the first send names the thread; the answer reads first, the work folds into a strip', async () => {
    await page.getByRole('textbox', { name: 'Message' }).fill('Check the Acme NDA term.');
    await page.getByRole('textbox', { name: 'Message' }).press('Meta+Enter');

    await expect(page.locator('.v2-prose')).toHaveText('Done.');
    await expect(threads).toHaveCount(before + 1);
    await expect(threads.first()).toContainText('Check the Acme NDA term.');
    await expect(page.locator('nav[aria-label="Threads"] li.v2-draft')).toHaveCount(0);
  });

  await test.step('the proposal is a redline of the current file, and approving it settles it', async () => {
    const card = page.locator('.v2-proposal');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.v2-proposal-path')).toHaveText('practice/standards/nda.md');
    await expect(card.locator('.v2-diff-del')).toContainText('Term: 2 years');
    await expect(card.locator('.v2-diff-add')).toContainText('Term: 3 years');
    await expect(card.locator('.v2-pill')).toHaveText('pending');

    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(card.locator('.v2-pill')).toHaveText('approved');
    await expect(card.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    // The redline stays readable after the decision.
    await expect(card.locator('.v2-diff-add')).toContainText('Term: 3 years');
  });

  await test.step('open in vault shows the written file in the drawer; Esc closes it', async () => {
    await page.locator('.v2-proposal').getByRole('button', { name: 'open in vault' }).click();
    const drawer = page.locator('aside[aria-label="Vault drawer"]');
    await expect(drawer).toHaveCount(1);
    await expect(drawer.locator('.vault-file-path')).toHaveText('practice/standards/nda.md');
    await expect(drawer.locator('.markdown h1')).toHaveText('NDA');
    await expect(drawer.locator('.markdown')).toContainText('Term: 3 years');
    // Still the thread underneath — the drawer did not navigate.
    await expect(page.locator('.v2-prose')).toHaveText('Done.');

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });

  await test.step('the strip says done, and opens into the record', async () => {
    const strip = page.locator('.v2-strip');
    await expect(strip).toHaveCount(1);
    await expect(strip.locator('summary .v2-pill')).toHaveText('done');
    await expect(strip.locator('.v2-strip-summary')).toHaveText('read 1 file, ran 1 tool');
    await expect(strip.locator('.v2-strip-provider')).toHaveText('fake/fake');

    await strip.locator('summary').click();
    await expect(strip.locator('.v2-step-verb')).toHaveText(['Read', 'Proposed']);
    await expect(strip.locator('.v2-record')).toContainText('Proposals');
  });

  await test.step('the vault page and settings are the new design too', async () => {
    await nav(page, 'Settings').click();
    await expect(page.getByRole('switch', { name: 'Try the new design' })).toBeChecked();
    await expect(page.locator('.settings-health .facts')).toContainText('fake/fake');

    await nav(page, 'Vault').click();
    await openDir(page, 'practice');
    await openDir(page, 'standards');
    await page.locator('button.vault-file', { hasText: 'nda.md' }).click();
    await expect(page.locator('.v2-crumb-last')).toHaveText('nda.md');
    await expect(page.locator('.v2-vault-main .markdown')).toContainText('Term: 3 years');
  });
});
```

- [ ] **Step 4: Run both flows**

Run: `bun run e2e`
Expected: `2 passed` — the v1 story and the v2 story, in that order, on one server.

- [ ] **Step 5: Commit the e2e**

```bash
git add e2e/ui.spec.ts
git commit -m "e2e: run the flow in the new design too — redline, approve, drawer, strip"
```

- [ ] **Step 6: One live step on Ollama, in the new design, and four screenshots**

No subscription provider is used. Everything lands in a scratch directory outside the repo; `~/.counsel-os` is never written.

```bash
export SCRATCH=$(mktemp -d /tmp/counsel-step5.XXXX)
mkdir -p "$SCRATCH/home" "$SCRATCH/vault/matters" "$SCRATCH/vault/practice/standards"
printf 'counsel-os-config: true\nlegal_root: %s\n' "$SCRATCH/vault" > "$SCRATCH/vault/config.md"
printf '# Acme Corp — NDA\n\nCounterparty: Acme Corp\nTerm: 2 years\nGoverning law: Delaware\n' > "$SCRATCH/vault/matters/acme.md"
printf 'default: ollama/gemma4:e4b\n' > "$SCRATCH/home/providers.yaml"
bun run ui:build
COUNSEL_OS_HOME="$SCRATCH/home" bun runtime/src/cli.ts serve --port 7431 --vault "$SCRATCH/vault" > "$SCRATCH/serve.log" 2>&1 &
sleep 3 && grep -o 'http://127.0.0.1:7431/#token=[^ ]*' "$SCRATCH/serve.log" | head -1
```

Open the printed URL with `&/?ui=v2` appended after the token. Ask: `What is the term and governing law of the Acme NDA? Then propose adding "Term: 3 years" to practice/standards/nda.md with a one-line rationale.` Wait for the strip to read `done`. Record: provider, duration, tokens, the answer, and whether the proposal card rendered a diff (against a missing file it is all additions). Do not approve it — the live run is a reading check.

Screenshots, with a throwaway script in the gitignored `e2e/.tmp/` (create the directory if the e2e run removed it): `e2e/.tmp/shots.ts`

```ts
import { chromium } from 'playwright';

const url = process.argv[2];
if (url === undefined) throw new Error('usage: bun e2e/.tmp/shots.ts "<printed url>&/?ui=v2"');
const out = 'docs/superpowers/spikes/img';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
await page.goto(url);
await page.waitForSelector('.v2-strip');
await page.locator('.v2-strip summary').first().click();
await page.screenshot({ path: `${out}/design-pass-chat-strip.png` });
await page.locator('.v2-proposal').first().screenshot({ path: `${out}/design-pass-proposal.png` });
await page.locator('.v2-proposal').getByRole('button', { name: 'open in vault' }).click();
await page.waitForSelector('aside[aria-label="Vault drawer"] .vault-file-view, aside[aria-label="Vault drawer"] .notice-error');
await page.screenshot({ path: `${out}/design-pass-drawer.png` });
await page.goto(url.replace(/#.*$/, '#/settings'));
await page.waitForSelector('.v2-settings .v2-group');
await page.screenshot({ path: `${out}/design-pass-settings.png`, fullPage: true });
await browser.close();
```

Run: `bun e2e/.tmp/shots.ts "http://127.0.0.1:7431/#token=<token>&/?ui=v2"`
Expected: four PNGs under `docs/superpowers/spikes/img/`. (The drawer screenshot's `.notice-error` alternative covers the case where the proposed file does not exist yet — the drawer then shows the read error, which is itself worth a look.) Then stop the server: `kill %1` (or `pkill -f 'cli.ts serve'`), and confirm `ls ~/.counsel-os` shows no `runtime.json` or `providers.yaml`.

- [ ] **Step 7: Write the findings**

Append to `docs/superpowers/spikes/2026-08-28-runtime-spikes.md`, in the same shape as "## Step 4 — web UI":

```markdown
## Step 5 — design pass

Date: <date>
Branch: `ui-design-pass` (Tasks 1–4 landed)
Spec: `docs/superpowers/specs/2026-08-29-ui-design-pass-design.md` §6

Question: does the new design hold up end to end — the flag, a draft that
names its thread, the step timeline and strip, the redline card, the drawer —
against the fake provider, and against a real local model?

### Setup

<the scratch home + vault as in Task 5 Step 6; Chromium for Playwright 1.58.2>

### (a) `bun run e2e` — v1 and v2 · PASS / FAIL

<paste the runner's `list` output: two tests, their steps, wall time>

### (b) One live step on Ollama, in v2 · PASS / FAIL

| | |
|---|---|
| Provider | `ollama/gemma4:e4b` |
| Duration | <from the strip> |
| Usage | <in / out> |
| Answer | "<the model's answer>" |
| Steps shown | <e.g. `Read matters/acme.md · 18 ms`, `Proposed practice/standards/nda.md · 3 ms`> |
| Proposal card | <diff rendered? all additions / with context; preview flip ok?> |
| Errors on screen | <none / what> |

![Chat with the strip expanded](img/design-pass-chat-strip.png)
![The proposal as a redline](img/design-pass-proposal.png)
![The vault drawer beside the thread](img/design-pass-drawer.png)
![Grouped settings with the design switch](img/design-pass-settings.png)

### Defects found in Step 5 (recorded, not fixed)

<numbered list; each: what, where (file), why it matters. Include anything the
live model did that the fake did not — a tool name outside the verb table, a
markdown answer shown as plain serif text, timing gaps.>

### What the next plan should assume — Step 5

- <v2 is behind the flag; default off; both e2e stories pass>
- <what the founder should compare when deciding on the default>

### Throwaway artifacts — Step 5

<the scratch dir; the server killed; `~/.counsel-os` untouched; four PNGs kept>
```

Fill every `<…>` with what actually happened; the section is a record, not a template.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/spikes/2026-08-28-runtime-spikes.md docs/superpowers/spikes/img/design-pass-chat-strip.png docs/superpowers/spikes/img/design-pass-proposal.png docs/superpowers/spikes/img/design-pass-drawer.png docs/superpowers/spikes/img/design-pass-settings.png
git commit -m "docs: step-5 findings — design pass e2e in both designs and a live Ollama step"
```

---

## Self-review

**Spec coverage (§2 rows → tasks):** Rollout (flag, switch, fragment, default off) → T1. Code layout (v2 dir, shared modules, v1 untouched, `app.tsx` picks) → T1 (`Root`), T2–T4 only add under `v2/` plus `styles.css`. Visual system tokens → T1 Step 20 (values verbatim; dark counterpart; serif for `.v2-prose` and the vault reader only). Shell (top bar with brand · nav · vault path · active model; rail; main; 320 px drawer with Tree + FileView, opened by nav Vault on chat / a step's path / "open in vault"; `#/vault` and `#/settings` stay) → T1 Shell + Drawer, T2 `onOpenFile` on Steps, T3 on the card, T4 pages. Thread titles (created on first send, `title` = first line ≤ 60, "New" is a draft with no request, list shows title falling back to a date label) → T2 `threads.ts` + Chat, T1 Rail. Turn while streaming (verb lines, `· ms` on result, show toggle, text below) → T2 Steps + Turn. Turn when finished (pill · summary · provider · duration · tokens · chevron; expanded record) → T2 Strip. Verb table → T2 verbs. Error turn (red pill + message, raw text under "show answer") → T2 Turn + Strip `pillFor`. Proposal card (brown accent, PROPOSAL tag, path, open in vault, rationale, unified diff via `diffLines`, Approve/Reject, "against version <7>", preview through the sanitizer, decided cards keep the diff, 409 → reload footer) → T3. Live proposal ("loading diff…" until reload) → T3. Vault page + drawer (same components, v2 tokens, header with path + version, breadcrumb) → T4. Settings grouped in the spec order with the confirm text kept (`ProviderTest` reused) → T4. Keyboard (⌘⏎, Esc) → T2 Composer test, T1 Drawer + T4 Shell test. §5 errors: 401 page → T1 Shell; stream error → T2; 409 → T3; settings 400/422 inline → T4; diff fetch failure fallback → T3; toggle persistence failure → T1. §6 tests: every named unit test has a file above; v1 tests untouched; Playwright twice with v2 extras → T5; screenshots + spikes section → T5. §7 order matches Tasks 1–5.

**Placeholder scan:** every code step carries the code; every test step carries the test and the `bun test` command with its expected outcome. The two "swap this import in the next task" notes (v1 `Chat` in T1 Shell, v1 `ProposalCard` in T2 Turn) are intermediate wiring that the named later step replaces, not deferred work. The findings section in T5 Step 7 is a record to fill from the run, with each field named.

**Type consistency:** `readUiFlag`/`setUiFlag`/`onUiFlagChange` (T1) are what `Root` (T1), `DesignToggle` (T1) and the T4 settings test call. `openDrawer(path: string | null)` (T1) is passed as `onOpenFile: (path: string) => void` (T2 Chat/Turn/Steps, T3 card) — a `string` argument satisfies `string | null`. `Steps({ tools, ms: Record<string, number>, onOpenFile? })` is what `Turn` and `Strip` render (T2). `pillFor(turn, run?)` returns `{ kind: RunStatus; label }` and the e2e reads `summary .v2-pill` (T5). `unifiedHunks` returns `Hunk[]` with `Hunk = HunkLine[]`, `HunkLine.kind ∈ 'ctx'|'add'|'del'` — the card's `Diff` and the `.v2-diff-<kind>` classes the tests and e2e query match. `createThread({ title })` returns `ThreadHeader`, consumed by `onThreadCreated(header)` in Chat (T2) and the Shell wiring (T2 Step 26). `Breadcrumb({ path })` (T4) is used by `VaultPage` and `Drawer`. `summarize` output `'read 1 file, ran 1 tool'` is asserted identically in T2's Chat test (`'read 1 file'`) and T5's e2e. The e2e selectors (`.v2-thread`, `.v2-draft`, `.v2-top-model`, `.v2-prose`, `.v2-proposal-path`, `.v2-strip-summary`, `.v2-strip-provider`, `.v2-step-verb`, `.v2-record`, `.v2-crumb-last`, `.v2-vault-main`, `aside[aria-label="Vault drawer"]`) all appear in the components above.

**Resolved ambiguities (also in the header constraints):** `diff@^8.0.4` instead of `^7` (types). On the chat route the nav "Vault" opens the drawer (spec wording); the full page stays reachable through the drawer's "open page" link and `#/vault` directly. "based on version" is shown as "against version <7>" from the fetched current file's `version`, because `ProposalView` (shared, untouched `chat/turns.ts`) carries no `expectedVersion`. `verbFor`'s fallback is the plain string `Ran <name>` (no literal backticks). The step object falls back to `name` / `query` / `dir` when there is no `path`, so "Consulted primitive" and "Searched" lines have a subject. `summarize` adds a "consulted N primitives" bucket so `read_primitive` does not read as "ran a tool". The v2 e2e test rewrites `nda.md` on disk before it starts (the v1 test already wrote the proposed text; otherwise the redline would be empty).
