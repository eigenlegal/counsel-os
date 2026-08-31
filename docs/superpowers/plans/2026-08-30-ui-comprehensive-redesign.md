# UI Comprehensive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the workbench's three surfaces around one identity — a Home dashboard behind one ask box, a Chat whose trust story is source citations and tracked-changes proposal slips, and a Vault that is a real reading environment — plus the small read-only runtime endpoints that feed them honestly.

**Architecture:** The runtime gains three read-only reads (`/vault/overview`, `/proposals?status=pending`, `/vault/search`) and metadata on the existing two; nothing writes, nothing calls a model. The UI keeps the one workbench (`v2/` under `runtime/ui/src/`, shared `chat/turns.ts` + `vault/{Tree,markdown,sanitize}`), re-tokened to the brief/ledger design language: `#/` becomes Home, chat moves to `#/chat?thread=<id>`, the rail becomes the mockups' 216px rail (56px icon rail on Vault), and the chat workspace stays mounted across every route (the keep-stream invariant from PR #28).

**Tech Stack:** Bun 1.3.x, TypeScript (strict, `noUncheckedIndexedAccess`), React 18, Vite 6, `marked`, `diff@^8.0.4` (already installed — `diffWords` for the redline, `diffLines` stays for the line view), `happy-dom` + `@testing-library/react` under `bun test`, Playwright `1.58.2` for e2e, `Bun.YAML` for frontmatter.

**Spec:** `docs/superpowers/specs/2026-08-30-ui-comprehensive-redesign-design.md` (mockups — the design truth for CSS values, structure and copy: `docs/superpowers/specs/img-redesign/mock-{home,chat,vault}.html`)

## Global Constraints

- **The brief/ledger motif is the design language** (spec header, founder amendment 1): double-rule dividers, dotted leaders, small-caps run-in headings, statuses as set text — *italic serif `pending` (accent), `✓ approved · time` (green)*. **NO left-accent-border panels. NO pill badges.** (The `.v2-pill` class NAME survives for test/e2e continuity, restyled to set text; a markdown `blockquote`'s left rule is document typography, not a panel accent, and stays.)
- **Tracked-changes redlines** (founder amendment 2): `diffWords(current, proposed)` rendered inline as **React text nodes** — `<del>` strike red / `<ins>` underline green — **NEVER innerHTML**. `vault/sanitize.ts` (via `renderMarkdown`) stays the **only** HTML sink in the app. Changed blocks only by default; `whole document` and `line diff` (the existing `unifiedHunks`) one click away.
- **Tokens exactly as spec §2.** Dark: bg `#171412` / raised `#1e1a17` / hover `#262019`; ink `#ece5da` / `#b8ad9e` / `#877c6d`; hairline `#322b24`, strong `#3e352c`; accent `#d99a4e` (on-accent `#1a1410`); green `#7fbf8e`, red `#e08a7e`, amber `#d9b04e`. Light: paper `#faf7f1`, ink `#241f19`; status ramp ≥4.5:1: accent `#a8681f`, green `#3f7a4f`, amber `#996d10`, red `#b4483a`; **diff/redline tints opaque, never alpha** (light tints `#e7f0e4` ins / `#f6e3dd` del, from the mock swatch row). Serif `"Iowan Old Style", Charter, Georgia` for prose/documents/matter names/greetings/thread titles; sans for UI labels; mono for paths. One strong container per screen; radius 9–14px where boxes remain; one shadow token.
- **Founder rules bind:** no gates, no pipelines, no wizards — primitives only. **Starter chips are prompt-fills, never flows.** This evolves the one workbench in place (v1 is gone; no toggle).
- **Keep-stream invariant (PR #28):** the chat workspace stays MOUNTED across routes — hidden off `#/chat`, never unmounted. A route change must not abort a step in flight.
- **API additions are read-only, exactly as spec §4:** `GET /vault/list` gains `{ mtimeMs, size }` and excludes dotfiles/`.git*`/`node_modules` (the same skip set as `fsSearch`); `GET /vault/overview` (new); `GET /proposals?status=pending` (new, bounded scan); `GET /vault/read` adds `mtimeMs`. Plus `GET /vault/search?q=` (see resolved ambiguities — §3.4's ⌘K flow needs it and it is the same read-only spirit). **No writes, no new state, no model calls.**
- `routes.ts` `API_PREFIXES` gains `'proposals'` — the routes.test.ts source-scan test enforces the list, and a prefix missing from it would serve the route as unauthenticated static. `runtime/ui/vite.config.ts`'s proxy list mirrors it.
- Root `bun run test` stays scoped to `runtime/src browse/src scripts`. UI tests run with `bun run ui:test`. `e2e/` is never added to `bun test`.
- The UI unit suite and the runtime suite stay green after **every** task. `bun run e2e` goes red at Task 2 (routes change) and is rewritten green in Task 6 — the one allowed exception.
- Commit messages use the repo prefixes `runtime:` / `ui:` / `e2e:` / `docs:`. **No `Co-Authored-By` and no `Claude-Session` trailers.**
- No subscription calls anywhere in this plan. Servers run `--fake`; the one optional live check is Ollama (`ollama/gemma4:e4b`).
- **A live `counsel-os serve` may be running from this checkout.** Execute in a worktree (superpowers:using-git-worktrees); any server this plan starts binds ports **≥7495** (e2e already uses 7499; the screenshot server uses 7497) with a throwaway `COUNSEL_OS_HOME`.

---

## File structure

```
runtime/src/
  core/types.ts                      Entry + { mtimeMs?, size? }; VaultStore + mtime?()
  vault/fs-store.ts                  + isJunkName(); list() filters + stats; mtime()
  vault/search.ts                    walk uses isJunkName (shared skip set)
  vault/overview.ts   (+ .test.ts)   parseFrontmatter, titleOf, prettifyName, vaultOverview
  loop/pending-proposals.ts (+test)  pendingProposals (bounded newest-N scan)
  server/routes.ts                   API_PREFIXES + 'proposals'; /vault/overview, /vault/search,
                                     /proposals; /vault/read + mtimeMs
runtime/ui/
  vite.config.ts                     proxy + '/proposals'
  src/
    app.tsx  (+ app.test.tsx)        Route + 'home'; #/chat; threadFromHash, proposalFromHash
    styles.css                       token swap (light+dark ramps), motif utilities, per-surface CSS
    api/types.ts                     VaultEntry/VaultFile fields; VaultOverview, MatterOverview,
                                     PendingProposal, VaultHit
    settings/Health.tsx              dotted-leader fact rows (markup only; behavior unchanged)
    vault/FileView.tsx               DELETED in Task 3 (Reader supersedes it; behaviors move over)
    v2/
      icons.tsx                      nav SVGs lifted from the mockups
      time.ts (+ time.test.ts)       relTime()
      Rail.tsx (+ .test.tsx)         REWRITTEN: brand · nav icons · CONVERSATIONS · model footer;
                                     56px icon collapse
      Shell.tsx (+ .test.tsx)        rail global, home route, hash-driven thread selection,
                                     composer seed, startAsk
      Drawer.tsx (+ .test.tsx)       420px; Tree + Reader (outline off)
      threads.ts                     + defaultProviderId()
      verbs.ts (+ verbs.test.ts)     + workLineOf()
      redline.ts (+ .test.ts)        wordDiff, redlineBlocks (Task 5)
      home/home.ts (+ .test.ts)      greetingFor, sublineFor, sortMatters, dueLabel, nextActionOf,
                                     parseDeadline, withAttachments, STARTERS, starterFill
      home/HomePage.tsx (+ .test)    greeting · ask box · docket · starters · matters · conversations
      chat/Chat.tsx (+ .test)        thread header, matterChipOf, initialAsk, proposal anchor
      chat/Turn.tsx (+ .test)        WorkLine above serif prose; citations
      chat/WorkLine.tsx (+ .test)    one quiet work line, expandable to Steps
      chat/cite.ts (+ .test.ts)      readPathsOf, linkCitations
      chat/ProposalCard.tsx (+test)  REWRITTEN: document slip + tracked-changes redline
      chat/Strip.tsx (+ .test)       one hairline line: DONE · n sources · n pending · details ⌄
      chat/Composer.tsx (+ .test)    picker removed; seed support; ⌘⏎
      vault/tree.ts (+ .test.ts)     groupRoot, monthLabel, KNOWLEDGE_DIRS
      vault/VaultTree.tsx (+ .test)  grouped, humanized tree; Other files (n)
      vault/frontmatter.ts (+test)   splitFrontmatter, readerModel, prettifyName (client)
      vault/outline.ts (+ .test.ts)  outlineOf
      vault/Reader.tsx (+ .test)     crumbs · serif H1 · meta · fm leaders · 68ch markdown ·
                                     outline · ask bar (supersedes FileView)
      vault/VaultPage.tsx (+ .test)  300px tree pane + Reader; ⌘K; search replaces tree
e2e/paths.ts                         seeded matter gains frontmatter
e2e/ui.spec.ts                       REWRITTEN: home → ask → slip → docket → vault story
docs/superpowers/spikes/2026-08-28-runtime-spikes.md   + "## Step 6 — comprehensive redesign"
docs/superpowers/spikes/img/redesign-{home,chat,vault}-{dark,light}.png
```

Shared names every task relies on (defined in the task named):

| Name | Defined in | Signature |
|---|---|---|
| `isJunkName` | T1 `vault/fs-store.ts` | `isJunkName(name: string): boolean` |
| `Entry` (extended) | T1 `core/types.ts` | `{ path: string; kind: 'file' \| 'dir'; mtimeMs?: number; size?: number }` |
| `VaultStore.mtime?` | T1 `core/types.ts` | `mtime?(tenant: Tenant, path: string): Promise<number \| null>` |
| `parseFrontmatter` / `titleOf` / `prettifyName` | T1 `vault/overview.ts` | `parseFrontmatter(source: string): { frontmatter: Record<string, string>; body: string }` · `titleOf(source: string, path: string): string` · `prettifyName(fileName: string): string` |
| `vaultOverview` / `VaultOverview` / `MatterOverview` | T1 `vault/overview.ts` | `vaultOverview(vault: VaultStore, tenant: Tenant, cfg: VaultConfig): Promise<VaultOverview>` · `VaultOverview = { matters: MatterOverview[]; groups: { practice: number; knowledge: number; other: number } }` · `MatterOverview = { path: string; title: string; frontmatter: Record<string, string>; mtimeMs: number }` (matters sorted by `mtimeMs` ascending) |
| `pendingProposals` / `PendingProposal` | T1 `loop/pending-proposals.ts` | `pendingProposals(store: ThreadStore, tenant: Tenant, opts?: { limit?: number }): Promise<PendingProposal[]>` · `PendingProposal = { threadId: string; threadTitle: string; id: string; path: string; rationale: string; at: string }` (newest first; `DEFAULT_SCAN_LIMIT = 20` newest threads scanned) |
| HTTP | T1 `server/routes.ts` | `GET /vault/overview` → `VaultOverview` · `GET /proposals?status=pending` → `PendingProposal[]` · `GET /vault/search?q=` → `{ path, snippet, score }[]` · `GET /vault/read` → `{ path, content, version, mtimeMs }` · `GET /vault/list` entries carry `mtimeMs`/`size` |
| UI wire types | T1 `api/types.ts` | `VaultEntry` + `mtimeMs?`/`size?` · `VaultFile` + `mtimeMs?: number \| null` · `VaultOverview` · `MatterOverview` · `PendingProposal` · `VaultHit = { path: string; snippet: string; score: number }` |
| `Route` / `threadFromHash` / `proposalFromHash` | T2 `app.tsx` | `type Route = 'home' \| 'chat' \| 'vault' \| 'settings'` (exported) · `threadFromHash(hash: string): string \| null` · `proposalFromHash(hash: string): string \| null` |
| `relTime` | T2 `v2/time.ts` | `relTime(value: string \| number, now?: Date): string` — `'2h ago'`, `'yesterday'`, `'Aug 27'` |
| `Rail` / `footerLabel` / `railLabel` | T2 `v2/Rail.tsx` | `Rail({ route, threads, selected, draft, busy?, health, collapsed, onSelect, onNew, onDelete })` · `footerLabel(health: Health \| null): string` |
| Motif CSS | T2 `styles.css` | `.rule-double` `.runin` `.leader` `.v2-status{,-pending,-approved,-rejected}` — and `.v2-pill` restyled to set text |
| `ComposerSeed` / Shell `askAbout` | T3 `chat/Composer.tsx` / `Shell.tsx` | `ComposerSeed = { text: string; nonce: number }` · Composer prop `seed?: ComposerSeed` · Shell passes `onAsk={askAbout}` to VaultPage/Drawer |
| `groupRoot` / `monthLabel` / `TreeGroups` | T3 `v2/vault/tree.ts` | `groupRoot(rootEntries: VaultEntry[], overview: VaultOverview): TreeGroups` · `monthLabel({ path, mtimeMs }): string` · `TreeGroups = { mattersDir: string \| null; matters: MatterOverview[]; practice: VaultEntry[]; knowledge: VaultEntry[]; other: VaultEntry[] }` |
| `splitFrontmatter` / `readerModel` | T3 `v2/vault/frontmatter.ts` | `splitFrontmatter(source): { rows: FmRow[]; body: string }` · `readerModel(source, path): { title: string; rows: FmRow[]; body: string }` · `FmRow = { key: string; value: string }` |
| `outlineOf` | T3 `v2/vault/outline.ts` | `outlineOf(body: string): string[]` |
| `Reader` / `MISSING_FILE_NOTE` | T3 `v2/vault/Reader.tsx` | `Reader({ path, outline?, onAsk? })` — fetches `/vault/read`, supersedes `FileView` |
| `greetingFor` / `sublineFor` / `sortMatters` / `dueLabel` / `nextActionOf` / `withAttachments` / `STARTERS` / `starterFill` | T4 `v2/home/home.ts` | see Task 4 Interfaces |
| `defaultProviderId` | T4 `v2/threads.ts` | `defaultProviderId(health: Health): string` |
| Shell `startAsk` / Chat `initialAsk` | T4 | `startAsk(message: string): void` · Chat prop `initialAsk?: { text: string; nonce: number }` |
| `wordDiff` / `redlineBlocks` / `WordSpan` / `RedlineBlock` | T5 `v2/redline.ts` | `wordDiff(before: string, after: string): WordSpan[]` · `redlineBlocks(spans: WordSpan[]): RedlineBlock[]` · `WordSpan = { kind: 'same' \| 'ins' \| 'del'; text: string }` · `RedlineBlock = { spans: WordSpan[]; changed: boolean }` |
| `readPathsOf` / `linkCitations` | T5 `v2/chat/cite.ts` | `readPathsOf(tools: ToolCallView[]): string[]` · `linkCitations(source: string, readPaths: string[]): string` |
| `workLineOf` / `WorkLine` | T5 `v2/verbs.ts` / `v2/chat/WorkLine.tsx` | `workLineOf(tools: ToolCallView[]): WorkLineParts` · `WorkLineParts = { searched: boolean; listed: boolean; read: string[]; proposed: number; other: number }` |
| `matterChipOf` / `stripLine` / `statusText` | T5 | `matterChipOf(events: ThreadEvent[]): string \| null` (Chat.tsx) · `stripLine(turn: AssistantTurn): string` (Strip.tsx) · `statusText(status, decidedAt?): { className: string; label: string }` (ProposalCard.tsx) |

---

### Task 1: Runtime reads — list metadata + junk filter, `/vault/overview`, `/proposals`, `/vault/search`

**Files:**
- Modify: `runtime/src/core/types.ts` (the `Entry` interface, ~line 88; the `VaultStore` interface, ~line 99)
- Modify: `runtime/src/vault/fs-store.ts` (export `isJunkName`; `list()`; new `mtime()`)
- Modify: `runtime/src/vault/search.ts` (the walk's skip line uses `isJunkName`; delete `SKIP_DIRS`)
- Create: `runtime/src/vault/overview.ts`, `runtime/src/vault/overview.test.ts`
- Create: `runtime/src/loop/pending-proposals.ts`, `runtime/src/loop/pending-proposals.test.ts`
- Modify: `runtime/src/server/routes.ts` (`API_PREFIXES`; four route additions), `runtime/src/server/routes.test.ts`
- Modify: `runtime/src/vault/fs-store.test.ts` (new describe)
- Modify: `runtime/ui/vite.config.ts` (proxy `'/proposals'`)
- Modify: `runtime/ui/src/api/types.ts` (wire types)

**Interfaces:**
- Consumes: `FsVaultStore`, `RESERVED_DIR`, `hashContent` (`vault/fs-store.ts`); `fsSearch` (`vault/search.ts`); `readVaultConfig`, `VaultConfig` (`vault/resolve-root.ts`); `ThreadStore`, `ThreadHeader`, `ThreadEvent` (`threads/store.ts`); the routes.test.ts helpers `call`, `appWith`, `appWithFake`, and its `store`/`vaultRoot` fixtures; `Bun.YAML.parse` (already how `providers/registry.ts` parses YAML).
- Produces: everything in the shared-names table rows T1 — later tasks call the endpoints and read the UI wire types exactly as spelled there.

- [ ] **Step 1: Write the failing store tests**

Append to `runtime/src/vault/fs-store.test.ts` (extend the file's imports if any of `mkdirSync`, `writeFileSync`, `mkdtempSync` from `node:fs`, `tmpdir` from `node:os`, `join` from `node:path` are missing — most already are there):

```ts
describe('list metadata and junk filtering (redesign spec §4)', () => {
  let root: string;
  let store: FsVaultStore;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'junk-'));
    store = new FsVaultStore(root);
    mkdirSync(join(root, 'practice'));
    mkdirSync(join(root, 'node_modules'));
    mkdirSync(join(root, '.git'));
    writeFileSync(join(root, '.DS_Store'), 'junk');
    writeFileSync(join(root, '.gitignore'), 'junk');
    writeFileSync(join(root, 'note.md'), 'A note.\n');
  });

  test('list excludes dotfiles, .git*, node_modules — the same skip set as fsSearch', async () => {
    const entries = await store.list('default', '');
    expect(entries.map(e => e.path).sort()).toEqual(['note.md', 'practice']);
  });

  test('entries carry mtimeMs and size', async () => {
    const entries = await store.list('default', '');
    for (const entry of entries) {
      expect(typeof entry.mtimeMs).toBe('number');
      expect(typeof entry.size).toBe('number');
      expect(entry.mtimeMs!).toBeGreaterThan(0);
    }
    const note = entries.find(e => e.path === 'note.md')!;
    expect(note.size).toBe('A note.\n'.length);
  });

  test('mtime answers a real path with a number and a missing one with null', async () => {
    expect(await store.mtime('default', 'note.md')).toBeGreaterThan(0);
    expect(await store.mtime('default', 'nope.md')).toBeNull();
    // The same path guards as every other method: escapes throw.
    await expect(store.mtime('default', '../x')).rejects.toThrow('path outside vault');
  });

  test('isJunkName names the set', () => {
    for (const name of ['.DS_Store', '.git', '.gitignore', '.counsel', '.Counsel', 'node_modules']) {
      expect(isJunkName(name)).toBe(true);
    }
    for (const name of ['matters', 'practice', 'nda.md', '..foo.md'.slice(1)]) {
      expect(isJunkName(name)).toBe(false);
    }
  });
});
```

Also add `isJunkName` to the file's import from `./fs-store`.

- [ ] **Step 2: Run to see them fail**

Run: `bun test runtime/src/vault/fs-store.test.ts`
Expected: FAIL — `isJunkName` is not exported; `mtime` is not a function; `mtimeMs` undefined.

- [ ] **Step 3: Implement — `isJunkName`, `list` metadata, `mtime`, the `Entry`/`VaultStore` types**

In `runtime/src/core/types.ts`, replace the `Entry` interface:

```ts
export interface Entry {
  path: string;
  kind: 'file' | 'dir';
  /** Filesystem metadata (redesign spec §4): recency for the tree's month
   * labels and the home cards. Optional so in-memory test stores need not
   * fake a filesystem. */
  mtimeMs?: number;
  size?: number;
}
```

and add to the `VaultStore` interface (beside `version`):

```ts
  /** The path's mtime in ms, or `null` when it does not exist. Optional:
   * only `GET /vault/read` uses it, and only when the store has one. */
  mtime?(tenant: Tenant, path: string): Promise<number | null>;
```

In `runtime/src/vault/fs-store.ts`, add below `RESERVED_DIR`:

```ts
/** Directory entries that are never a user's knowledge: the runtime's own
 * `.counsel/` (any casing), dotfiles and dotdirs (`.DS_Store`, `.git*`,
 * `.obsidian`), and `node_modules`. ONE predicate, used by both `list()` and
 * `fsSearch`'s walk, so the tree and the search can never disagree about
 * what a vault holds (redesign spec §4). */
export function isJunkName(name: string): boolean {
  return name.startsWith('.') || name.toLowerCase() === RESERVED_DIR || name === 'node_modules';
}
```

Replace `list` and add `mtime`:

```ts
  async list(tenant: Tenant, dir: string): Promise<Entry[]> {
    const full = this.abs(tenant, dir);
    const names = await readdir(full);
    const out: Entry[] = [];
    for (const name of names) {
      if (isJunkName(name)) continue;
      const s = await stat(join(full, name));
      out.push({
        path: join(dir, name),
        kind: s.isDirectory() ? 'dir' : 'file',
        mtimeMs: s.mtimeMs,
        size: s.size,
      });
    }
    return out;
  }

  async mtime(tenant: Tenant, path: string): Promise<number | null> {
    try {
      return (await stat(this.abs(tenant, path))).mtimeMs;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
```

In `runtime/src/vault/search.ts`: import `isJunkName` from `./fs-store`, delete the `SKIP_DIRS` const (and its comment), and replace the walk's skip line

```ts
        if (name.startsWith('.') || name.toLowerCase() === RESERVED_DIR || SKIP_DIRS.has(name)) continue;
```

with

```ts
        if (isJunkName(name)) continue;
```

(`RESERVED_DIR` stays imported only if still referenced elsewhere in the file; drop it from the import if not.)

- [ ] **Step 4: Run the vault suite; fix the one exact-equality assertion**

Run: `bun test runtime/src/vault`
Expected: the new tests pass; the two existing `list` tests still pass (they compare `kind:path` shapes, not whole objects).

Then in `runtime/src/server/routes.test.ts` (~line 634) the read/list test compares whole entries. Replace

```ts
    expect(entries).toEqual([{ path: 'matters/acme/notes.md', kind: 'file' }]);
```

with

```ts
    expect(entries).toEqual([
      { path: 'matters/acme/notes.md', kind: 'file', mtimeMs: expect.any(Number), size: expect.any(Number) },
    ]);
```

Run: `bun test runtime/src/server/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing overview tests**

`runtime/src/vault/overview.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { parseFrontmatter, prettifyName, titleOf, vaultOverview } from './overview';

const CFG = { entitiesPath: 'entities', mattersPath: 'matters' };

let root: string;
let store: FsVaultStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'overview-'));
  store = new FsVaultStore(root);
});

describe('parseFrontmatter', () => {
  test('reads the block and hands back the body', () => {
    const { frontmatter, body } = parseFrontmatter('---\ntitle: Acme NDA\ndeadline: 2026-09-12\n---\n# H1\nBody.\n');
    expect(frontmatter).toEqual({ title: 'Acme NDA', deadline: '2026-09-12' });
    expect(body).toBe('# H1\nBody.\n');
  });

  test('no frontmatter, unterminated frontmatter, and broken YAML are all just a body', () => {
    expect(parseFrontmatter('# H1\n').frontmatter).toEqual({});
    expect(parseFrontmatter('---\ntitle: x\n# never closed\n').frontmatter).toEqual({});
    const broken = parseFrontmatter('---\n: [unbalanced\n---\nBody.\n');
    expect(broken.frontmatter).toEqual({});
    expect(broken.body).toBe('Body.\n');
  });

  test('scalars come back as strings; nested structures are skipped', () => {
    const { frontmatter } = parseFrontmatter('---\ndeadline: 2026-09-12\ncount: 3\nnested:\n  a: 1\n---\nBody.\n');
    expect(frontmatter['count']).toBe('3');
    expect(frontmatter['nested']).toBeUndefined();
  });
});

describe('titleOf', () => {
  test('frontmatter title beats the H1 beats the prettified filename', () => {
    expect(titleOf('---\ntitle: From FM\n---\n# From H1\n', 'matters/x.md')).toBe('From FM');
    expect(titleOf('# From H1\nBody.\n', 'matters/x.md')).toBe('From H1');
    expect(titleOf('no headings\n', 'matters/2026-06-vendora-worldpay-documentation.md')).toBe(
      'Vendora worldpay documentation',
    );
  });
});

describe('prettifyName', () => {
  test('strips the date prefix and the extension, spaces the dashes', () => {
    expect(prettifyName('2026-06-vendora-worldpay.md')).toBe('Vendora worldpay');
    expect(prettifyName('acme_nda.md')).toBe('Acme nda');
    expect(prettifyName('notes.md')).toBe('Notes');
  });
});

describe('vaultOverview', () => {
  test('a vault with no matters dir still answers, with empty matters', async () => {
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toEqual([]);
    expect(overview.groups).toEqual({ practice: 0, knowledge: 0, other: 0 });
  });

  test('matters carry title, frontmatter and mtime, oldest first; junk never counts', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(join(root, 'matters', '.DS_Store'), 'junk');
    writeFileSync(
      join(root, 'matters', '2026-06-vendora.md'),
      '---\ntitle: Vendora × Worldpay\nstage: working\nnext_action: send document list\ndeadline: 2026-09-12\n---\nBody.\n',
    );
    writeFileSync(join(root, 'matters', 'acme.md'), '# Acme Corp — NDA\nTerm: 2 years\n');
    mkdirSync(join(root, 'practice'));
    writeFileSync(join(root, 'practice', 'nda.md'), '# NDA\n');
    mkdirSync(join(root, 'memory'));
    writeFileSync(join(root, 'memory', 'decisions.md'), '# Decisions\n');
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\n');

    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters.map(m => m.title).sort()).toEqual(['Acme Corp — NDA', 'Vendora × Worldpay']);
    const vendora = overview.matters.find(m => m.path === 'matters/2026-06-vendora.md')!;
    expect(vendora.frontmatter['next_action']).toBe('send document list');
    expect(vendora.frontmatter['deadline']).toBe('2026-09-12');
    expect(vendora.mtimeMs).toBeGreaterThan(0);
    // Oldest first (the tree reads top-down through time).
    const times = overview.matters.map(m => m.mtimeMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // practice: its 1 entry; knowledge: memory's 1 entry; other: config.md.
    expect(overview.groups).toEqual({ practice: 1, knowledge: 1, other: 1 });
  });

  test('a matters entry that is not markdown is skipped', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(join(root, 'matters', 'signed.pdf'), 'not text');
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toEqual([]);
  });
});
```

- [ ] **Step 6: Run to see them fail**

Run: `bun test runtime/src/vault/overview.test.ts`
Expected: FAIL — `Cannot find module './overview'`.

- [ ] **Step 7: Implement `runtime/src/vault/overview.ts`**

```ts
import type { Entry, Tenant, VaultStore } from '../core/types';
import type { VaultConfig } from './resolve-root';

/**
 * `GET /vault/overview` (redesign spec §4): one read-only call that feeds
 * the home page and the vault tree's top — the matters with their
 * frontmatter, humanized titles and recency, plus how much lives under the
 * other root groups. No writes, no new state, no model calls.
 */

export interface MatterOverview {
  path: string;
  /** Frontmatter `title`, else the first H1, else the prettified filename
   * (spec §3.4 "humanized titles"). */
  title: string;
  /** Scalar frontmatter only, every value as a string. The server does not
   * interpret the fields — absent fields simply don't render (spec §4). */
  frontmatter: Record<string, string>;
  mtimeMs: number;
}

export interface VaultOverview {
  /** Sorted by mtime, oldest first — the order the mock tree reads in. */
  matters: MatterOverview[];
  groups: { practice: number; knowledge: number; other: number };
}

/** The fixed knowledge roots; the entities dir comes from config. */
const KNOWLEDGE_ROOTS = ['memory', 'law'] as const;

/**
 * Splits `---` frontmatter off a markdown source. `Bun.YAML` (the same
 * parser `providers/registry.ts` trusts) reads the block; anything that is
 * not a flat map of scalars degrades to `{}` rather than failing the
 * listing — a matter with odd frontmatter is still a matter.
 */
export function parseFrontmatter(source: string): { frontmatter: Record<string, string>; body: string } {
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) return { frontmatter: {}, body: source };
  const firstNl = source.indexOf('\n');
  const end = source.indexOf('\n---', firstNl);
  if (end === -1) return { frontmatter: {}, body: source };
  const bodyNl = source.indexOf('\n', end + 1);
  const body = bodyNl === -1 ? '' : source.slice(bodyNl + 1);
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(source.slice(firstNl + 1, end));
  } catch {
    return { frontmatter: {}, body };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { frontmatter: {}, body };
  const frontmatter: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined || typeof value === 'object') continue;
    frontmatter[key] = String(value);
  }
  return { frontmatter, body };
}

/** `2026-06-vendora-worldpay.md` → `Vendora worldpay`: extension off, a
 * leading `YYYY-MM[-DD]-` date off, dashes and underscores to spaces, first
 * letter up. The last-resort title (spec §3.4). */
export function prettifyName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}(-\d{2})?-/, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? fileName : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function titleOf(source: string, path: string): string {
  const { frontmatter, body } = parseFrontmatter(source);
  const fmTitle = frontmatter['title']?.trim();
  if (fmTitle !== undefined && fmTitle !== '') return fmTitle;
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1 !== null) return h1[1]!.trim();
  return prettifyName(path.slice(path.lastIndexOf('/') + 1));
}

/** A listing that treats "the directory is not there" as "it is empty" —
 * `vault/overview` must answer on a vault with no matters dir (spec §5). */
async function listOr(vault: VaultStore, tenant: Tenant, dir: string): Promise<Entry[]> {
  try {
    return await vault.list(tenant, dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return [];
    throw err;
  }
}

export async function vaultOverview(vault: VaultStore, tenant: Tenant, cfg: VaultConfig): Promise<VaultOverview> {
  const matters: MatterOverview[] = [];
  for (const entry of await listOr(vault, tenant, cfg.mattersPath)) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.md')) continue;
    let source: string;
    try {
      source = await vault.read(tenant, entry.path);
    } catch {
      continue; // vanished between list and read — skip, never fail the call
    }
    const { frontmatter } = parseFrontmatter(source);
    matters.push({
      path: entry.path,
      title: titleOf(source, entry.path),
      frontmatter,
      mtimeMs: entry.mtimeMs ?? 0,
    });
  }
  matters.sort((a, b) => a.mtimeMs - b.mtimeMs);

  const knowledgeRoots = new Set<string>([...KNOWLEDGE_ROOTS, cfg.entitiesPath]);
  let practice = 0;
  let knowledge = 0;
  let other = 0;
  for (const entry of await listOr(vault, tenant, '.')) {
    if (entry.path === cfg.mattersPath) continue;
    if (entry.kind === 'dir' && entry.path === 'practice') practice += (await listOr(vault, tenant, entry.path)).length;
    else if (entry.kind === 'dir' && knowledgeRoots.has(entry.path)) knowledge += (await listOr(vault, tenant, entry.path)).length;
    else other += 1;
  }
  return { matters, groups: { practice, knowledge, other } };
}
```

- [ ] **Step 8: Run to see them pass**

Run: `bun test runtime/src/vault/overview.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing pending-proposals tests**

`runtime/src/loop/pending-proposals.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadStore } from '../threads/store';
import { pendingProposals } from './pending-proposals';

let store: ThreadStore;

function proposal(id: string, at: string, status: 'pending' | 'approved' | 'rejected') {
  return {
    t: 'proposal' as const,
    at,
    id,
    path: `practice/standards/${id}.md`,
    content: 'CONTENT',
    rationale: `Rationale for ${id}.`,
    status,
    expectedVersion: null,
  };
}

beforeEach(() => {
  store = new ThreadStore(mkdtempSync(join(tmpdir(), 'pending-')), {
    codexHomeRoot: mkdtempSync(join(tmpdir(), 'pending-codex-')),
  });
});

describe('pendingProposals', () => {
  test('pending only, newest first, with the thread title', async () => {
    const a = await store.create('default', { title: 'NDA residuals fallback' });
    await store.append('default', a.id, proposal('p-old', '2026-08-30T09:00:00.000Z', 'pending'));
    await store.append('default', a.id, proposal('p-approved', '2026-08-30T09:30:00.000Z', 'approved'));
    const b = await store.create('default', {});
    await store.append('default', b.id, proposal('p-new', '2026-08-30T10:00:00.000Z', 'pending'));

    const listed = await pendingProposals(store, 'default');
    expect(listed.map(p => p.id)).toEqual(['p-new', 'p-old']);
    expect(listed[1]).toEqual({
      threadId: a.id,
      threadTitle: 'NDA residuals fallback',
      id: 'p-old',
      path: 'practice/standards/p-old.md',
      rationale: 'Rationale for p-old.',
      at: '2026-08-30T09:00:00.000Z',
    });
    // A titleless thread reads as Untitled, the same word the rail uses.
    expect(listed[0]!.threadTitle).toBe('Untitled');
  });

  test('the scan is bounded to the newest N threads', async () => {
    const older = await store.create('default', { title: 'older' });
    await store.append('default', older.id, proposal('p-buried', '2026-08-30T08:00:00.000Z', 'pending'));
    // Touching the newer thread LAST makes it the newest by updatedAt.
    const newer = await store.create('default', { title: 'newer' });
    await store.append('default', newer.id, proposal('p-seen', '2026-08-30T11:00:00.000Z', 'pending'));

    const listed = await pendingProposals(store, 'default', { limit: 1 });
    expect(listed.map(p => p.id)).toEqual(['p-seen']);
  });

  test('an empty store answers an empty list', async () => {
    expect(await pendingProposals(store, 'default')).toEqual([]);
  });
});
```

- [ ] **Step 10: Run to see them fail**

Run: `bun test runtime/src/loop/pending-proposals.test.ts`
Expected: FAIL — `Cannot find module './pending-proposals'`.

- [ ] **Step 11: Implement `runtime/src/loop/pending-proposals.ts`**

```ts
import type { Tenant } from '../core/types';
import type { ThreadEvent, ThreadStore } from '../threads/store';

/**
 * `GET /proposals?status=pending` (redesign spec §4): every proposal still
 * waiting on the founder, across threads, for the home docket. Read-only —
 * it scans thread logs and writes nothing.
 *
 * Bounded on purpose: only the newest `limit` threads (by `updatedAt`) are
 * read. A vault with years of threads must not pay a full-log scan to draw
 * the home page, and a proposal in a thread nobody has touched in that long
 * is not "awaiting your decision" in any sense the docket should press.
 */
export const DEFAULT_SCAN_LIMIT = 20;

export interface PendingProposal {
  threadId: string;
  threadTitle: string;
  id: string;
  path: string;
  rationale: string;
  at: string;
}

export async function pendingProposals(
  store: ThreadStore,
  tenant: Tenant,
  opts: { limit?: number } = {},
): Promise<PendingProposal[]> {
  const limit = opts.limit ?? DEFAULT_SCAN_LIMIT;
  const headers = await store.list(tenant);
  const newest = [...headers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);

  const out: PendingProposal[] = [];
  for (const header of newest) {
    let events: ThreadEvent[];
    try {
      ({ events } = await store.get(tenant, header.id));
    } catch {
      continue; // a thread deleted mid-scan is not the docket's problem
    }
    for (const ev of events) {
      if (!('t' in ev) || ev.t !== 'proposal' || ev.status !== 'pending') continue;
      out.push({
        threadId: header.id,
        threadTitle: header.title?.trim() || 'Untitled',
        id: ev.id,
        path: ev.path,
        rationale: ev.rationale,
        at: ev.at,
      });
    }
  }
  out.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}
```

- [ ] **Step 12: Run to see them pass**

Run: `bun test runtime/src/loop/pending-proposals.test.ts`
Expected: PASS.

- [ ] **Step 13: Write the failing route tests**

Append to `runtime/src/server/routes.test.ts` (add `fsSearch` to the imports: `import { fsSearch } from '../vault/search';`, and `writeFileSync`/`mkdirSync` are already imported):

```ts
describe('redesign reads (spec §4)', () => {
  test('GET /vault/overview answers matters + groups; an empty vault answers empty', async () => {
    const app = appWithFake();
    const empty = (await (await call(app, 'GET', '/vault/overview')).json()) as { matters: unknown[] };
    expect(empty.matters).toEqual([]);

    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(
      join(vaultRoot, 'matters', '2026-06-vendora.md'),
      '---\ntitle: Vendora × Worldpay\ndeadline: 2026-09-12\nnext_action: send document list\n---\nBody.\n',
    );
    mkdirSync(join(vaultRoot, 'practice'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'nda.md'), '# NDA\n');
    writeFileSync(join(vaultRoot, 'note.md'), 'stray\n');

    const res = await call(app, 'GET', '/vault/overview');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      matters: Array<{ path: string; title: string; frontmatter: Record<string, string>; mtimeMs: number }>;
      groups: { practice: number; knowledge: number; other: number };
    };
    expect(body.matters.map(m => m.title)).toEqual(['Vendora × Worldpay']);
    expect(body.matters[0]!.frontmatter['next_action']).toBe('send document list');
    expect(body.groups).toEqual({ practice: 1, knowledge: 0, other: 1 });
  });

  test('GET /proposals lists pending only, with thread titles; other statuses are 400', async () => {
    const app = appWithFake();
    const a = await store.create('default', { title: 'NDA residuals fallback' });
    await store.append('default', a.id, {
      t: 'proposal',
      at: '2026-08-30T10:00:00.000Z',
      id: 'p-1',
      path: 'practice/standards/nda.md',
      content: 'X',
      rationale: 'Record the fallback.',
      status: 'pending',
      expectedVersion: null,
    });
    const b = await store.create('default', { title: 'Vendora docs' });
    await store.append('default', b.id, {
      t: 'proposal',
      at: '2026-08-30T11:00:00.000Z',
      id: 'p-2',
      path: 'memory/decisions.md',
      content: 'Y',
      rationale: 'Log it.',
      status: 'approved',
      expectedVersion: null,
    });

    const res = await call(app, 'GET', '/proposals?status=pending');
    expect(res.status).toBe(200);
    const listed = (await res.json()) as Array<{ id: string; threadId: string; threadTitle: string }>;
    expect(listed.map(p => p.id)).toEqual(['p-1']);
    expect(listed[0]!.threadTitle).toBe('NDA residuals fallback');
    // Defaulting to pending is fine; anything else is not implemented.
    expect((await call(app, 'GET', '/proposals')).status).toBe(200);
    expect((await call(app, 'GET', '/proposals?status=approved')).status).toBe(400);
    // And it is API surface: no token, no answer.
    expect((await call(app, 'GET', '/proposals', { token: null })).status).toBe(401);
  });

  test('GET /vault/search runs the store search; a missing q is 400', async () => {
    writeFileSync(join(vaultRoot, 'indemnity.md'), 'The indemnity cap is 12 months.\n');
    const app = appWith([new FakeModelProvider([{ text: 'hi' }])], {
      vault: new FsVaultStore(vaultRoot, { search: fsSearch() }),
    });
    const res = await call(app, 'GET', '/vault/search?q=indemnity');
    expect(res.status).toBe(200);
    const hits = (await res.json()) as Array<{ path: string; snippet: string; score: number }>;
    expect(hits.map(h => h.path)).toEqual(['indemnity.md']);
    expect(hits[0]!.snippet).toContain('indemnity cap');
    expect((await call(app, 'GET', '/vault/search')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/search?q=')).status).toBe(400);
  });

  test('GET /vault/read carries mtimeMs', async () => {
    writeFileSync(join(vaultRoot, 'note.md'), 'A note.\n');
    const app = appWithFake();
    const body = (await (await call(app, 'GET', '/vault/read?path=note.md')).json()) as { mtimeMs: unknown };
    expect(typeof body.mtimeMs).toBe('number');
  });
});
```

And inside the existing `describe('API_PREFIXES', …)` add:

```ts
  test('reserves proposals for the redesign docket', () => {
    expect(API_PREFIXES).toContain('proposals');
  });
```

- [ ] **Step 14: Run to see them fail**

Run: `bun test runtime/src/server/routes.test.ts`
Expected: FAIL — 404s on the three new routes, `mtimeMs` undefined, `API_PREFIXES` missing `proposals`.

- [ ] **Step 15: Implement the routes**

In `runtime/src/server/routes.ts`:

Add imports:

```ts
import { pendingProposals } from '../loop/pending-proposals';
import { vaultOverview } from '../vault/overview';
import { readVaultConfig } from '../vault/resolve-root';
```

Change the prefix list (the source-scan test enforces this — a route under a prefix not on the list would be served as tokenless static):

```ts
export const API_PREFIXES: readonly string[] = ['health', 'threads', 'runs', 'vault', 'settings', 'proposals'];
```

Add the handlers beside `vaultList` (inside `createApp`):

```ts
  const vaultRead = async (url: URL): Promise<Response> => {
    const raw = url.searchParams.get('path');
    if (raw === null || raw === '') throw new HttpError(400, 'path is required');
    const path = vaultPath(raw);
    try {
      return json({
        path,
        content: await deps.vault.read(deps.tenant, path),
        version: await deps.vault.version(deps.tenant, path),
        // Optional on the interface so in-memory stores need not fake a
        // filesystem; `null` then, the same as "no mtime to show".
        mtimeMs: (await deps.vault.mtime?.(deps.tenant, path)) ?? null,
      });
    } catch (err) {
      vaultFailure(err);
    }
  };

  /** One call for home + the tree top (redesign spec §4). The config is
   * re-read per request so a `matters_path` edit takes effect on reload. */
  const vaultOverviewRoute = async (): Promise<Response> =>
    json(await vaultOverview(deps.vault, deps.tenant, readVaultConfig(deps.vaultRoot)));

  /** The vault search the ⌘K field runs (spec §3.4) — the same `SearchFn`
   * behind the model's `vault_search` tool, read-only. */
  const vaultSearchRoute = async (url: URL): Promise<Response> => {
    const q = url.searchParams.get('q');
    if (q === null || q.trim() === '') throw new HttpError(400, 'q is required');
    return json(await deps.vault.search(deps.tenant, q));
  };

  /** The docket's feed (spec §4). Only the pending listing exists; an
   * explicit other status is a 400 so a future caller cannot read
   * "everything" as "pending". */
  const proposalsRoute = async (url: URL): Promise<Response> => {
    const status = url.searchParams.get('status') ?? 'pending';
    if (status !== 'pending') throw new HttpError(400, `unsupported status: ${status}`);
    return json(await pendingProposals(deps.store, deps.tenant));
  };
```

(the shown `vaultRead` REPLACES the existing one — the only change is the `mtimeMs` line.)

Extend the dispatch — replace the two-branch `vault` block with:

```ts
      if (segments.length === 2 && first === 'vault' && method === 'GET') {
        if (second === 'read') return await vaultRead(url);
        if (second === 'list') return await vaultList(url);
        if (second === 'overview') return await vaultOverviewRoute();
        if (second === 'search') return await vaultSearchRoute(url);
      }

      if (segments.length === 1 && first === 'proposals' && method === 'GET') {
        return await proposalsRoute(url);
      }
```

In `runtime/ui/vite.config.ts`, extend the proxy list:

```ts
const API_PREFIXES = ['/health', '/threads', '/runs', '/vault', '/settings', '/proposals'];
```

- [ ] **Step 16: Add the UI wire types**

Append to / edit `runtime/ui/src/api/types.ts` — replace `VaultEntry` and `VaultFile`, append the rest:

```ts
/** One entry of `GET /vault/list`. `path` is vault-relative, from the root
 * — the tree needs the whole path to ask for the level below it. `mtimeMs`
 * and `size` arrived with the redesign (spec §4); optional so an older
 * runtime still parses. */
export interface VaultEntry {
  path: string;
  kind: 'file' | 'dir';
  mtimeMs?: number;
  size?: number;
}

/** `GET /vault/read` — 200. `version` is the content hash the vault stores;
 * it is what a proposal's `expectedVersion` is compared against. */
export interface VaultFile {
  path: string;
  content: string;
  /** `null` if the file went away between the read and the hash. */
  version: string | null;
  /** `null` when the store has no filesystem behind it. */
  mtimeMs?: number | null;
}

/** `GET /vault/overview` (redesign spec §4). COPIED from
 * `runtime/src/vault/overview.ts`; a change there is a change here. */
export interface MatterOverview {
  path: string;
  title: string;
  frontmatter: Record<string, string>;
  mtimeMs: number;
}

export interface VaultOverview {
  matters: MatterOverview[];
  groups: { practice: number; knowledge: number; other: number };
}

/** `GET /proposals?status=pending`. COPIED from
 * `runtime/src/loop/pending-proposals.ts`. */
export interface PendingProposal {
  threadId: string;
  threadTitle: string;
  id: string;
  path: string;
  rationale: string;
  at: string;
}

/** One hit of `GET /vault/search`. COPIED from `Hit` in
 * `runtime/src/core/types.ts`. */
export interface VaultHit {
  path: string;
  snippet: string;
  score: number;
}
```

- [ ] **Step 17: Run everything**

Run:
```bash
bun test runtime/src/server/routes.test.ts && bun run test && bun run typecheck:runtime && bun run typecheck:ui && bun run ui:test
```
Expected: all green (the UI suite is untouched by types that are additive/optional).

- [ ] **Step 18: Commit**

```bash
git add runtime/src/core/types.ts runtime/src/vault/fs-store.ts runtime/src/vault/fs-store.test.ts \
  runtime/src/vault/search.ts runtime/src/vault/overview.ts runtime/src/vault/overview.test.ts \
  runtime/src/loop/pending-proposals.ts runtime/src/loop/pending-proposals.test.ts \
  runtime/src/server/routes.ts runtime/src/server/routes.test.ts \
  runtime/ui/vite.config.ts runtime/ui/src/api/types.ts
git commit -m "runtime: redesign reads — vault overview, pending proposals, vault search, list metadata + junk filter"
```

---

### Task 2: Design system + shell — tokens, motif, rail, routes, Settings restyle

**Files:**
- Modify: `runtime/ui/src/app.tsx` (Route + `'home'`; export `Route`; `threadFromHash`, `proposalFromHash`), `runtime/ui/src/app.test.tsx` (replace)
- Create: `runtime/ui/src/v2/time.ts`, `runtime/ui/src/v2/time.test.ts`, `runtime/ui/src/v2/icons.tsx`
- Rewrite: `runtime/ui/src/v2/Rail.tsx`, `runtime/ui/src/v2/Rail.test.tsx`
- Modify: `runtime/ui/src/v2/Shell.tsx` (rail global, home route, `openThread`, hash sync), `runtime/ui/src/v2/Shell.test.tsx` (replace)
- Modify: `runtime/ui/src/styles.css` (tokens, motif, rail, shell, settings/health restyle)
- Modify: `runtime/ui/src/settings/Health.tsx` (dotted-leader fact rows)

**Interfaces:**
- Consumes: T1's wire types; existing `Chat`, `Drawer`, `VaultPage`, `SettingsPage` (rendered as-is until Tasks 3–5 replace their internals); `parseHash`/`vaultPathFromHash`; `Health` from `api/types`.
- Produces: `Route` (exported), `threadFromHash(hash): string | null`, `proposalFromHash(hash): string | null`; `relTime(value, now?)`; `HomeIcon`/`ChatIcon`/`VaultIcon`/`SettingsIcon`; `Rail({ route, threads, selected, draft, busy?, health, collapsed, onSelect, onNew, onDelete })`, `railLabel(thread)`, `footerLabel(health)`; Shell's `openThread(id)` behavior (select + `history.replaceState('#/chat?thread=…')`, never a remount of the same thread); the token set and motif classes (`.rule-double`, `.runin`, `.leader`, `.v2-status*`, restyled `.v2-pill`); rail classes `.v2-rail .v2-rail-icons .v2-brand .v2-mark .v2-nav .v2-lbl .v2-rail-section .v2-rail-list .v2-thread .v2-draft .v2-foot .v2-dot`. The home route renders a stub `<main class="v2-page v2-home">` that **Task 4 replaces with `HomePage`**.
- Note: `bun run e2e` goes red at this task (routes changed) and stays red until Task 6 rewrites the story. `bun run ui:test` must stay green.

- [ ] **Step 1: Write the failing router tests**

Replace `runtime/ui/src/app.test.tsx` in full:

```tsx
import './test/dom';

import { describe, expect, test } from 'bun:test';
import { parseHash, proposalFromHash, routeFromHash, threadFromHash, vaultPathFromHash } from './app';

/**
 * The fragment router. `#/` became Home in the step-6 redesign (spec §3.1);
 * chat moved under `#/chat`, parameterized by `?thread=` — old `#/`
 * deep-links land on Home, which the spec accepts.
 */
describe('parseHash', () => {
  test('an empty fragment and the root are home', () => {
    expect(routeFromHash('')).toBe('home');
    expect(routeFromHash('#')).toBe('home');
    expect(routeFromHash('#/')).toBe('home');
  });

  test('chat lives under #/chat, with or without a thread', () => {
    expect(routeFromHash('#/chat')).toBe('chat');
    expect(routeFromHash('#/chat?thread=t-1')).toBe('chat');
    expect(routeFromHash('#/chat/anything')).toBe('chat');
  });

  test('a bare surface route is that surface', () => {
    expect(routeFromHash('#/vault')).toBe('vault');
    expect(routeFromHash('#/settings')).toBe('settings');
  });

  test('a query on the fragment does NOT send the vault to chat', () => {
    expect(routeFromHash('#/vault?path=practice/x.md')).toBe('vault');
    expect(routeFromHash('#/settings?anything=1')).toBe('settings');
  });

  test('a leading # is optional — the fragment arrives both ways', () => {
    expect(routeFromHash('/vault?path=a.md')).toBe('vault');
    expect(routeFromHash('/chat?thread=t-1')).toBe('chat');
  });

  test('an unknown route falls back to home rather than a blank page', () => {
    expect(routeFromHash('#/nope')).toBe('home');
    expect(routeFromHash('#/vaults')).toBe('home');
    expect(routeFromHash('#token=abc')).toBe('home');
  });

  test('the params come back parsed, and only from the query half', () => {
    const { route, params } = parseHash('#/vault?path=a.md&other=1');
    expect(route).toBe('vault');
    expect(params.get('path')).toBe('a.md');
    expect(params.get('other')).toBe('1');
    expect(parseHash('#/vault').params.get('path')).toBeNull();
  });
});

describe('threadFromHash', () => {
  test('reads the thread the chat fragment names', () => {
    expect(threadFromHash('#/chat?thread=t-1')).toBe('t-1');
    expect(threadFromHash(`#/chat?thread=${encodeURIComponent('214e6cd3-01ba-433f-828a-ff75c4c04e80')}`)).toBe(
      '214e6cd3-01ba-433f-828a-ff75c4c04e80',
    );
  });

  test('no thread, an empty thread, and a non-chat route are all null', () => {
    expect(threadFromHash('#/chat')).toBeNull();
    expect(threadFromHash('#/chat?thread=')).toBeNull();
    expect(threadFromHash('#/vault?thread=t-1')).toBeNull();
    expect(threadFromHash('#/')).toBeNull();
  });
});

describe('proposalFromHash', () => {
  test('reads the docket anchor and nothing else', () => {
    expect(proposalFromHash('#/chat?thread=t-1&proposal=p-9')).toBe('p-9');
    expect(proposalFromHash('#/chat?thread=t-1')).toBeNull();
    expect(proposalFromHash('#/vault?proposal=p-9')).toBeNull();
  });
});

describe('vaultPathFromHash', () => {
  test('reads the file the fragment names', () => {
    expect(vaultPathFromHash('#/vault?path=practice/x.md')).toBe('practice/x.md');
  });

  test('decodes what the tree and the proposal card encoded', () => {
    for (const path of ['matters/a/b.md', 'matters/Acme Corp/notes.md', 'matters/re #12.md', 'matters/a&b.md']) {
      expect(vaultPathFromHash(`#/vault?path=${encodeURIComponent(path)}`)).toBe(path);
    }
  });

  test('no path, an empty path, and a non-vault route are all "nothing open"', () => {
    expect(vaultPathFromHash('#/vault')).toBeNull();
    expect(vaultPathFromHash('#/vault?path=')).toBeNull();
    expect(vaultPathFromHash('#/')).toBeNull();
    expect(vaultPathFromHash('#/settings?path=x.md')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `cd runtime/ui && bun test src/app.test.tsx`
Expected: FAIL — `''` routes to `chat` not `home`; `threadFromHash`/`proposalFromHash` are not exported.

- [ ] **Step 3: Implement the router**

In `runtime/ui/src/app.tsx`, replace the `Route` type and `parseHash`, and add the two readers (everything else stays):

```tsx
/** The four surfaces the fragment routes between (redesign spec §3.1). */
export type Route = 'home' | 'chat' | 'vault' | 'settings';

export function parseHash(hash: string): { route: Route; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const params = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
  if (path === '/chat' || path.startsWith('/chat/')) return { route: 'chat', params };
  if (path === '/vault' || path.startsWith('/vault/')) return { route: 'vault', params };
  if (path === '/settings' || path.startsWith('/settings/')) return { route: 'settings', params };
  // `#/` is Home now (spec §3.1) — and so is anything unknown: the landing
  // page is the safe place to fall.
  return { route: 'home', params };
}

/** The thread `#/chat?thread=…` names, or `null` for a draft/bare chat. */
export function threadFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'chat') return null;
  const id = params.get('thread');
  return id === null || id === '' ? null : id;
}

/** The docket's anchor: `#/chat?thread=…&proposal=…` scrolls the thread to
 * that proposal slip (spec §3.2 "Review →"). */
export function proposalFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'chat') return null;
  const id = params.get('proposal');
  return id === null || id === '' ? null : id;
}
```

Run: `cd runtime/ui && bun test src/app.test.tsx`
Expected: PASS.

- [ ] **Step 4: Write and pass the relTime tests**

`runtime/ui/src/v2/time.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { relTime } from './time';

const NOW = new Date('2026-08-30T14:00:00.000Z');

describe('relTime', () => {
  test('the ramp: just now → minutes → hours → yesterday → a date', () => {
    expect(relTime('2026-08-30T13:59:40.000Z', NOW)).toBe('just now');
    expect(relTime('2026-08-30T13:42:00.000Z', NOW)).toBe('18m ago');
    expect(relTime('2026-08-30T12:00:00.000Z', NOW)).toBe('2h ago');
    expect(relTime('2026-08-29T13:00:00.000Z', NOW)).toBe('yesterday');
    expect(relTime('2026-08-27T10:00:00.000Z', NOW)).toBe('Aug 27');
  });

  test('takes epoch ms too — mtimes come that way', () => {
    expect(relTime(new Date('2026-08-30T12:00:00.000Z').getTime(), NOW)).toBe('2h ago');
  });
});
```

`runtime/ui/src/v2/time.ts`:

```ts
/** The quiet relative time every surface prints (mock copy: `2h ago`,
 * `yesterday`, `Aug 27`) — one implementation so home, chat and the vault
 * reader never disagree about what "recently" reads as. */
export function relTime(value: string | number, now: Date = new Date()): string {
  const then = new Date(value);
  const ms = now.getTime() - then.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 2 * 86_400_000) return 'yesterday';
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

Run: `cd runtime/ui && bun test src/v2/time.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the nav icons**

`runtime/ui/src/v2/icons.tsx` — the four outline icons, paths lifted verbatim from the mockups:

```tsx
/** The rail's outline icons (mock-{home,chat,vault}.html — same four SVGs
 * on every page). 16×16, stroked with currentColor so the token ramp colors
 * them. */

function Icon({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <svg className="v2-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      {children}
    </svg>
  );
}

export function HomeIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2 6.8 8 2l6 4.8V14H9.8v-3.8H6.2V14H2z" />
    </Icon>
  );
}

export function ChatIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2.5 3.5h11v7.6H6.6L3.4 14v-2.9H2.5z" />
    </Icon>
  );
}

export function VaultIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2 3h4.4L8 4.8h6V13H2z" />
    </Icon>
  );
}

export function SettingsIcon(): JSX.Element {
  return (
    <Icon>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}
```

(Add `import type React from 'react';` if `tsc` asks for the namespace.)

- [ ] **Step 6: Write the failing Rail tests**

Replace `runtime/ui/src/v2/Rail.test.tsx` in full:

```tsx
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
```

- [ ] **Step 7: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/Rail.test.tsx`
Expected: FAIL — the current Rail has no nav links, no footer, no `collapsed`.

- [ ] **Step 8: Rewrite `runtime/ui/src/v2/Rail.tsx`**

```tsx
import type { Health, ThreadHeader } from '../api/types';
import type { Route } from '../app';
import { ChatIcon, HomeIcon, SettingsIcon, VaultIcon } from './icons';

export interface RailProps {
  route: Route;
  threads: ThreadHeader[];
  selected: string | null;
  /** True while the main pane holds a draft — a conversation with no thread
   * yet. The draft is a row so the reader can see where they are. */
  draft: boolean;
  busy?: boolean;
  /** `/health` — the footer's `● <default model> · <auth>` (spec §3.1). */
  health: Health | null;
  /** True on the vault route: the rail collapses to a 56px icon rail
   * (spec §3.1). */
  collapsed: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/** The title the first send gave the thread, or `Untitled`. */
export function railLabel(thread: ThreadHeader): string {
  const title = thread.title?.trim() ?? '';
  return title !== '' ? title : 'Untitled';
}

/** The rail footer (spec §3.3: the model picker moved out of the composer
 * and into the rail; clicking it opens Settings). */
export function footerLabel(health: Health | null): string {
  if (health === null) return '…';
  const model = health.default ?? 'no default model';
  const auth = health.providers.find(p => p.id === health.default)?.auth;
  return auth === undefined ? model : `${model} · ${auth}`;
}

export function Rail({
  route,
  threads,
  selected,
  draft,
  busy = false,
  health,
  collapsed,
  onSelect,
  onNew,
  onDelete,
}: RailProps): JSX.Element {
  return (
    <aside className={collapsed ? 'v2-rail v2-rail-icons' : 'v2-rail'} aria-label="Rail">
      <div className="v2-brand">
        <span className="v2-mark" aria-hidden="true" />
        <span className="v2-lbl">counsel-os</span>
      </div>
      <nav className="v2-nav" aria-label="Surfaces">
        <a href="#/" aria-current={route === 'home' ? 'page' : undefined}>
          <HomeIcon />
          <span className="v2-lbl">Home</span>
        </a>
        <a href="#/chat" aria-current={route === 'chat' ? 'page' : undefined}>
          <ChatIcon />
          <span className="v2-lbl">Chat</span>
        </a>
        <a href="#/vault" aria-current={route === 'vault' ? 'page' : undefined}>
          <VaultIcon />
          <span className="v2-lbl">Vault</span>
        </a>
        <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>
          <SettingsIcon />
          <span className="v2-lbl">Settings</span>
        </a>
      </nav>
      {collapsed ? null : (
        <>
          <div className="v2-rail-section">
            <span>Conversations</span>
            <button type="button" className="v2-rail-new" aria-label="New conversation" onClick={onNew} disabled={busy || draft}>
              ＋
            </button>
          </div>
          <ul className="v2-rail-list" aria-label="Threads">
            {draft ? (
              <li className="v2-draft" aria-current="true">
                <span className="v2-thread-title">New conversation</span>
              </li>
            ) : null}
            {threads.map(thread => (
              <li key={thread.id} className="v2-thread" aria-current={thread.id === selected && !draft ? 'true' : undefined}>
                <button type="button" className="v2-thread-open" onClick={() => onSelect(thread.id)}>
                  <span className="v2-thread-title">{railLabel(thread)}</span>
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
        </>
      )}
      <button
        type="button"
        className="v2-foot"
        title={health === null ? undefined : `${footerLabel(health)} — open Settings`}
        onClick={() => {
          globalThis.location.hash = '#/settings';
        }}
      >
        <span className="v2-dot" aria-hidden="true" />
        <span className="v2-lbl">{footerLabel(health)}</span>
      </button>
    </aside>
  );
}
```

Run: `cd runtime/ui && bun test src/v2/Rail.test.tsx`
Expected: PASS (the icon-rail label visibility is CSS — `getByRole('link', { name })` still resolves by the hidden span's text, which is why the test asserts the class rather than computed style).

- [ ] **Step 9: Swap the tokens and add the motif CSS**

In `runtime/ui/src/styles.css`:

**(a)** Replace the whole `:root { … }` block and the `@media (prefers-color-scheme: dark)` block that follows it with (values verbatim from spec §2 / the mockups; the light values the spec leaves open — raised/hover/sunken/lines/muted inks — are derived to sit on the paper ramp):

```css
:root {
  color-scheme: light dark;

  /* light — paper (spec §2) */
  --bg: #faf7f1;
  --bg-raised: #ffffff;
  --bg-sunken: #f4efe7;
  --bg-hover: #f1ece3;
  --fg: #241f19;
  --fg-muted: #5f584d;
  --fg-faint: #8a8071;
  --border: #e6dfd2;
  --border-strong: #d8cfbf;
  --accent: #a8681f;
  --accent-ink: #ffffff;
  --ok: #3f7a4f;
  --warn: #996d10;
  --amber: #996d10;
  --error: #b4483a;
  /* diff/redline tints: opaque, never alpha (spec §2, light row) */
  --ins-bg: #e7f0e4;
  --del-bg: #f6e3dd;

  --serif: "Iowan Old Style", Charter, Georgia, serif;
  --sans: -apple-system, "Inter", "Segoe UI", system-ui, sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  --radius: 10px;
  --radius-lg: 14px;
  --shadow: 0 1px 2px rgba(36, 31, 25, 0.06), 0 8px 24px rgba(36, 31, 25, 0.08);
  --rail-w: 216px;
  --rail-w-icons: 56px;
  --drawer-w: 420px;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* dark (spec §2, verbatim) */
    --bg: #171412;
    --bg-raised: #1e1a17;
    --bg-sunken: #1e1a17;
    --bg-hover: #262019;
    --fg: #ece5da;
    --fg-muted: #b8ad9e;
    --fg-faint: #877c6d;
    --border: #322b24;
    --border-strong: #3e352c;
    --accent: #d99a4e;
    --accent-ink: #1a1410;
    --ok: #7fbf8e;
    --warn: #d9b04e;
    --amber: #d9b04e;
    --error: #e08a7e;
    --ins-bg: #233227;
    --del-bg: #362420;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.18);
  }
}
```

**(b)** Under the `body` rule, change the base font to `font: 14px/1.55 var(--sans);` (the mockups' base size).

**(c)** Append a motif section after the `.muted` rule:

```css
/* ── The brief/ledger motif (redesign spec §2) ─────────────────────────── */

/* Docket rule: a double rule opens a ruled entry, a hairline closes it. */
.rule-double { border-top: 3px double var(--border-strong); }

/* Small-caps run-in heading (`DOCKET · 1 AWAITING YOUR DECISION`). */
.runin {
  font: 600 11px/1 var(--sans);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-faint);
}
.runin em { color: var(--accent); font-style: normal; }

/* Dotted leader for every label→value row. Lives in a flex row. */
.leader {
  flex: 1;
  border-bottom: 1px dotted var(--border-strong);
  margin: 0 6px;
  transform: translateY(-4px);
  min-width: 24px;
}

/* Set-text statuses: italic serif, colored — never pills, never borders. */
.v2-status { font: italic 600 13px/1 var(--serif); }
.v2-status-pending { color: var(--accent); }
.v2-status-approved, .v2-status-done { color: var(--ok); }
.v2-status-rejected { color: var(--error); }
```

**(d)** Restyle the two badge shapes to set text — replace the `.badge { … }` rule and the `.v2-pill { … }` rule (their color modifier rules below each stay untouched):

```css
/* Set text, not a pill (redesign: statuses as set text). The class NAMES
 * survive — tests and the e2e story address them — but the box is gone. */
.badge {
  font: italic 600 0.85rem/1 var(--serif);
  text-transform: none;
  letter-spacing: 0;
  border: none;
  border-radius: 0;
  padding: 0;
  white-space: nowrap;
}

.v2-pill {
  font: italic 600 0.85rem/1 var(--serif);
  text-transform: none;
  letter-spacing: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  color: var(--fg-muted);
}
```

**(e)** Delete the `/* ── v2 shell ── */` block's `.v2-top`, `.v2-brand`, `.v2-top nav`, `.v2-top nav a`, `.v2-top-meta`, `.v2-top-vault`, `.v2-top-model` rules (the top bar is gone — the rail owns brand/nav/model now), and replace `.v2-shell` / `.v2-work` / `.v2-work.v2-drawer-open`:

```css
.v2-shell { display: flex; height: 100vh; }
.v2-main-col { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.v2-work { display: grid; grid-template-columns: 1fr; flex: 1; min-height: 0; }
.v2-work.v2-drawer-open { grid-template-columns: 1fr var(--drawer-w); }
```

**(f)** Replace the whole `/* ── v2 rail ── */` section (mock rail CSS, adapted to the tokens):

```css
/* ── The rail (mock-home.html .rail) ─────────────────────────────────── */

.v2-rail {
  width: var(--rail-w);
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg);
  overflow-y: auto;
}
.v2-brand { font: 600 15px/1 var(--serif); letter-spacing: 0.01em; padding: 6px 10px 16px; display: flex; align-items: center; gap: 8px; }
.v2-mark { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg, var(--accent), #b3762f); display: inline-block; flex-shrink: 0; }
.v2-nav { display: flex; flex-direction: column; gap: 1px; }
.v2-nav a { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; color: var(--fg-muted); text-decoration: none; font-weight: 500; }
.v2-nav a[aria-current="page"] { background: var(--bg-hover); color: var(--fg); }
.v2-nav a:hover { background: var(--bg-raised); }
.v2-nav-icon { width: 16px; height: 16px; opacity: 0.75; flex-shrink: 0; }
.v2-rail-section {
  margin-top: 20px;
  padding: 0 10px 6px;
  font: 600 10.5px/1 var(--sans);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--fg-faint);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.v2-rail-new { background: none; border: none; color: var(--fg-faint); padding: 0 2px; font-size: 13px; }
.v2-rail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.v2-thread, .v2-draft { display: flex; align-items: center; border-radius: 8px; color: var(--fg-muted); font-size: 13px; }
.v2-thread[aria-current="true"], .v2-draft[aria-current="true"] { background: var(--bg-hover); color: var(--fg); }
.v2-thread:hover { background: var(--bg-raised); }
.v2-draft { padding: 6px 10px; font-style: italic; }
.v2-thread-open { flex: 1; min-width: 0; text-align: left; background: none; border: none; padding: 6px 10px; color: inherit; }
.v2-thread-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v2-thread-delete { background: none; border: none; color: var(--fg-faint); padding: 0 8px; }
.v2-foot { margin-top: auto; padding: 10px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--fg-faint); background: none; border: none; text-align: left; }
.v2-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); flex-shrink: 0; }

/* Icon rail on the vault route (mock-vault.html .rail): 56px, no labels. */
.v2-rail.v2-rail-icons { width: var(--rail-w-icons); padding: 14px 8px; align-items: center; }
.v2-rail-icons .v2-lbl { display: none; }
.v2-rail-icons .v2-brand { padding: 4px 0 14px; }
.v2-rail-icons .v2-nav a { justify-content: center; padding: 9px; }
.v2-rail-icons .v2-foot { justify-content: center; padding: 10px 0; }
```

**(g)** Settings + health restyle (spec §3.5 — motif, grouping and behavior unchanged). Replace the `.facts { … }`, `.facts dt`, `.facts dd` rules and the `.v2-group` / group-heading rules:

```css
/* Dotted-leader facts (spec §3.5). */
.facts { margin: 0 0 0.8rem; }
.fact { display: flex; align-items: baseline; font-size: 0.85rem; padding: 2px 0; }
.fact dt { color: var(--fg-faint); }
.fact dd { margin: 0; word-break: break-all; }

/* Groups are ruled entries now, not cards: a double rule opens each, a
 * small-caps run-in names it. */
.v2-group { border: none; border-top: 3px double var(--border-strong); border-radius: 0; background: none; box-shadow: none; padding: 12px 2px 16px; }
.v2-group > h2, .v2-group .settings-health > h2 {
  font: 600 11px/1 var(--sans);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-faint);
  margin-bottom: 12px;
}
```

- [ ] **Step 10: Give Health its leader rows**

In `runtime/ui/src/settings/Health.tsx`, replace the `<dl className="facts">…</dl>` block with (a `<div>` is valid inside `<dl>`):

```tsx
      <dl className="facts">
        <div className="fact">
          <dt>Vault</dt>
          <span className="leader" aria-hidden="true" />
          <dd>
            <code>{health === null ? '…' : health.vault}</code>
          </dd>
        </div>
        <div className="fact">
          <dt>Tenant</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{health === null ? '…' : health.tenant}</dd>
        </div>
        <div className="fact">
          <dt>Config file</dt>
          <span className="leader" aria-hidden="true" />
          <dd>
            <code>{file}</code>
          </dd>
        </div>
        <div className="fact">
          <dt>Default</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{effective.default === null ? <span className="muted">none — no provider resolves</span> : <code>{effective.default}</code>}</dd>
        </div>
        <div className="fact">
          <dt>Step timeout</dt>
          <span className="leader" aria-hidden="true" />
          <dd>{effective.stepTimeoutMs} ms</dd>
        </div>
      </dl>
```

- [ ] **Step 11: Write the failing Shell tests**

Replace `runtime/ui/src/v2/Shell.test.tsx` in full:

```tsx
import { act, cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import type { Health, SettingsView, Thread, ThreadEvent, ThreadHeader } from '../api/types';
import { Shell } from './Shell';

const realFetch = globalThis.fetch;
const at = '2026-08-30T10:00:00.000Z';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

const acme: ThreadHeader = {
  id: 't-1',
  title: 'Acme NDA term',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  sessions: {},
};
const beta: ThreadHeader = {
  id: 't-2',
  title: 'Beta MSA scope',
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T11:00:00.000Z',
  sessions: {},
};

const settings: SettingsView = {
  file: '/tmp/providers.yaml',
  registry: { default: 'fake/fake', providers: [] },
  effective: { default: 'fake/fake', stepTimeoutMs: 600_000, providers: [] },
};

/** A transcript whose finished turn raised a pending proposal — the way the
 * drawer opens now ("open in vault" on the slip; the rail's Vault link is a
 * page, spec §3.1). */
const proposalEvents: ThreadEvent[] = [
  { t: 'user', at, content: 'record it' },
  { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
  {
    t: 'proposal',
    at,
    id: 'p-1',
    path: 'practice/standards/nda.md',
    content: '# NDA\nTerm: 3 years\n',
    rationale: 'Record the fallback.',
    status: 'pending',
    expectedVersion: null,
  },
  { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function install(opts: { events?: ThreadEvent[] } = {}): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/health')) return json(health);
    if (url.startsWith('/runs')) return json([]);
    if (url === '/threads') return json([acme, beta]);
    if (url.startsWith('/vault/read')) return json({ path: 'practice/standards/nda.md', content: '# NDA\nTerm: 2 years\n', version: 'abc1234def0', mtimeMs: 1 });
    if (url.startsWith('/vault/list')) return json([]);
    if (url.startsWith('/settings')) return json(settings);
    const match = /^\/threads\/(.+)$/.exec(url);
    if (match !== null) {
      const header = match[1] === 't-2' ? beta : acme;
      return json({ header, events: match[1] === 't-1' ? (opts.events ?? []) : [] } satisfies Thread);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

function chatNode(): Element | null {
  return document.querySelector('section.v2-chat');
}

function workNode(): Element | null {
  return document.querySelector('.v2-work');
}

function goTo(hash: string): void {
  act(() => {
    history.replaceState(null, '', `/${hash}`);
    globalThis.dispatchEvent(new Event('hashchange'));
  });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  history.replaceState(null, '', '/#/chat');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

describe('Shell', () => {
  test('on #/chat, opens the most recent thread and lists both in the rail', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(screen.getByText('Beta MSA scope')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Acme NDA term');
    await waitFor(() =>
      expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toBe('No messages yet. Ask counsel something.'),
    );
  });

  test('#/chat?thread=t-2 in the fragment opens that thread', async () => {
    history.replaceState(null, '', '/#/chat?thread=t-2');
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
  });

  test('#/ is Home: the workspace is hidden but the chat stays mounted', async () => {
    history.replaceState(null, '', '/#/');
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
  });

  test('re-selecting the thread already open changes nothing', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    const composer = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    await userEvent.type(composer, 'half-written question');

    await userEvent.click(screen.getByText('Acme NDA term'));

    expect(chatNode()).toBe(before);
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('half-written question');
  });

  test('selecting a different thread remounts the chat and rewrites the hash', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    await userEvent.click(screen.getByText('Beta MSA scope'));

    await waitFor(() => expect(chatNode()).not.toBe(before));
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
    expect(location.hash).toBe('#/chat?thread=t-2');
  });

  test('a stale empty list cannot reopen a draft over the thread just created', async () => {
    const fresh: ThreadHeader = {
      id: 't-9',
      title: 'Check the cap.',
      createdAt: '2026-08-29T12:00:00.000Z',
      updatedAt: '2026-08-29T12:00:00.000Z',
      sessions: {},
    };
    let releaseList = (): void => {};
    const listHeld = new Promise<void>(resolve => {
      releaseList = resolve;
    });
    let created = false;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (method === 'POST' && url === '/threads') {
        created = true;
        releaseList();
        return json(fresh);
      }
      if (url === '/threads') {
        const snapshot = created ? [fresh] : [];
        if (!created) await listHeld;
        return json(snapshot);
      }
      if (url.endsWith('/steps')) {
        return new Response('event: done\ndata: {"type":"done","output":null}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      }
      if (url.startsWith('/threads/')) return json({ header: fresh, events: [] } satisfies Thread);
      throw new Error(`unexpected fetch: ${method} ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await userEvent.type(await screen.findByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeTruthy());
    expect(document.querySelector('li.v2-draft')).toBeNull();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Check the cap.');
    // And the hash now names the thread, without a remount having happened.
    expect(location.hash).toBe('#/chat?thread=t-9');
  });

  test('a draft started while the thread list is loading is not overruled', async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await waitFor(() => expect(screen.getByText('Beta MSA scope')).toBeTruthy());

    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
    expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toContain('the thread is created when you send');
  });

  test('on #/vault the rail collapses to icons and the workspace hides, chat intact', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    goTo('#/vault');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeTruthy();
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    expect(chatNode()).toBe(before);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeNull();
  });

  test('a step in flight survives a trip to the vault page and back', async () => {
    const step: { signal: AbortSignal | null } = { signal: null };
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/steps')) {
        step.signal = init?.signal ?? null;
        return await new Promise<Response>(() => {});
      }
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.type(await screen.findByLabelText('Message'), 'Is the cap mutual?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());
    expect(step.signal).not.toBeNull();
    const before = chatNode();

    goTo('#/vault');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    expect(chatNode()).toBe(before);
    expect(step.signal?.aborted).toBe(false);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(step.signal?.aborted).toBe(false);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
  });

  test('open in vault on a proposal opens the drawer; Esc closes it', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
    expect(location.hash).toBe('#/chat');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();
  });

  test('the drawer is still open after a trip to settings', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();

    goTo('#/settings');
    await waitFor(() => expect(document.querySelector('.v2-page')).toBeTruthy());
    expect(workNode()?.hasAttribute('hidden')).toBe(true);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
  });
});
```

- [ ] **Step 12: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/Shell.test.tsx`
Expected: FAIL — no home route, no `v2-rail-icons`, the rail has no health/footer props, `#/chat` renders nothing yet.

- [ ] **Step 13: Rework `runtime/ui/src/v2/Shell.tsx`**

Replace the component (imports at top of file):

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import { readToken } from '../api/token';
import { onUnauthorized } from '../api/unauthorized';
import type { Health, ThreadHeader } from '../api/types';
import { parseHash, threadFromHash, TOKEN_MESSAGE, vaultPathFromHash, type Route } from '../app';
import { Chat } from './chat/Chat';
import { Drawer } from './Drawer';
import { Rail } from './Rail';
import { SettingsPage } from './settings/SettingsPage';
import { VaultPage } from './vault/VaultPage';

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
 * The workbench (redesign spec §3.1): the rail on the left of EVERYTHING
 * (216px; a 56px icon rail on the vault route), then the main column —
 * Home at `#/`, the chat workspace at `#/chat?thread=<id>`, the vault and
 * settings pages.
 *
 * The keep-stream invariant (PR #28) still holds: the chat workspace is
 * HIDDEN off `#/chat`, never unmounted — unmounting aborts the step stream
 * and records the run `abandoned`. Thread selection is written INTO the
 * fragment (`?thread=`), but a rail click selects directly and rewrites the
 * hash with `replaceState` — the `hashchange` listener is for navigation
 * that arrives from outside (home rows, the docket's Review anchor, a
 * pasted link).
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
  const [listed, setListed] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, path: null });
  const [drawerRevision, setDrawerRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const listSeq = useRef(0);

  const openDrawer = useCallback((path: string | null): void => {
    setDrawer(current => ({ open: true, path: path ?? current.path }));
  }, []);
  const closeDrawer = useCallback((): void => setDrawer(current => ({ ...current, open: false })), []);

  const drawerRef = useRef(drawer);
  drawerRef.current = drawer;

  const fileDecided = useCallback((path: string): void => {
    const open = drawerRef.current;
    if (open.open && open.path === path) setDrawerRevision(revision => revision + 1);
  }, []);

  const selectThread = (id: string): void => {
    if (id === selected && !draft) return;
    setSelected(id);
    setDraft(false);
    setChatKey(k => k + 1);
  };

  /** A rail/home click: select AND put the thread in the fragment, without
   * waiting on a hashchange (deterministic under tests, and a no-op remount
   * for the thread already on screen). */
  const openThread = (id: string): void => {
    selectThread(id);
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', `#/chat?thread=${encodeURIComponent(id)}`);
  };

  const newDraft = (): void => {
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
  };

  const openDraft = (): void => {
    newDraft();
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
  };

  /** Kept current for the hashchange listener, which must see this render's
   * `selected`/`draft` without re-subscribing. */
  const selectRef = useRef(selectThread);
  selectRef.current = selectThread;

  useEffect(() => {
    const onHashChange = (): void => {
      const hash = globalThis.location.hash;
      setRoute(parseHash(hash).route);
      setVaultPath(vaultPathFromHash(hash));
      const id = threadFromHash(hash);
      if (id !== null) selectRef.current(id);
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => onUnauthorized(() => setUnauthorized(true)), []);

  const loadThreads = useCallback(async (): Promise<{ threads: ThreadHeader[]; fresh: boolean }> => {
    const ticket = ++listSeq.current;
    const list = await fetchJson<ThreadHeader[]>('/threads');
    const sorted = [...list].sort(byRecent);
    const fresh = ticket === listSeq.current;
    if (fresh) setThreads(sorted);
    return { threads: sorted, fresh };
  }, []);

  useEffect(() => {
    if (unauthorized) return;
    void (async () => {
      try {
        setHealth(await fetchJson<Health>('/health'));
        const { threads: list, fresh } = await loadThreads();
        if (!fresh) return;
        // The fragment may already name the thread (a pasted link, the
        // docket's Review). It wins over "most recent" when it exists.
        const wanted = threadFromHash(globalThis.location.hash);
        const first = wanted !== null && list.some(t => t.id === wanted) ? wanted : (list[0]?.id ?? null);
        if (!draftRef.current) setSelected(current => current ?? first);
        if (first === null) setDraft(true);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
        setDraft(true);
      } finally {
        setListed(true);
      }
    })();
  }, [unauthorized, loadThreads]);

  const deleteThread = async (id: string): Promise<void> => {
    if (!globalThis.confirm('Delete this thread? Its transcript cannot be recovered from here.')) return;
    setBusy(true);
    setError(null);
    try {
      await fetchJson<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const { threads: list } = await loadThreads();
      if (selected === id) {
        const next = list[0]?.id ?? null;
        if (next === null) openDraft();
        else openThread(next);
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
      <Rail
        route={route}
        threads={threads}
        selected={selected}
        draft={draft}
        busy={busy}
        health={health}
        collapsed={route === 'vault'}
        onSelect={openThread}
        onNew={openDraft}
        onDelete={id => void deleteThread(id)}
      />
      <div className="v2-main-col">
        {error === null ? null : (
          <p className="v2-notice v2-notice-error" role="alert">
            {error}
          </p>
        )}

        {/* The chat workspace stays MOUNTED on every route and is only
            HIDDEN off `#/chat` — the keep-stream invariant (PR #28). */}
        <div className={drawer.open ? 'v2-work v2-drawer-open' : 'v2-work'} hidden={route !== 'chat'}>
          <main className="v2-main">
            {health === null || (!draft && !listed) ? (
              <p className="muted v2-empty">Loading…</p>
            ) : (
              <Chat
                key={chatKey}
                threadId={draft ? null : selected}
                health={health}
                onThreadCreated={header => {
                  setSelected(header.id);
                  setDraft(false);
                  // The fragment now names the thread — replaceState, so no
                  // hashchange, so no remount mid-stream.
                  globalThis.history.replaceState(null, '', `#/chat?thread=${encodeURIComponent(header.id)}`);
                  void loadThreads();
                }}
                onThreadTouched={() => void loadThreads()}
                onFileDecided={fileDecided}
                onOpenFile={openDrawer}
              />
            )}
          </main>
          {drawer.open ? (
            <Drawer path={drawer.path} revision={drawerRevision} onOpen={path => openDrawer(path)} onClose={closeDrawer} />
          ) : null}
        </div>

        {route === 'home' ? (
          // Task 4 replaces this stub with <HomePage …/>.
          <main className="v2-page v2-home" aria-label="Home">
            <p className="muted v2-empty">Home lands in Task 4.</p>
          </main>
        ) : null}

        {route === 'vault' ? (
          <VaultPage
            path={vaultPath}
            onOpen={path => {
              globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
            }}
          />
        ) : null}

        {route === 'settings' ? (
          <main className="v2-page">
            <SettingsPage health={health} />
          </main>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 14: Run the whole UI suite; typecheck; build**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: `tsc` clean; every suite passes — `app`, `time`, `Rail`, `Shell` new/updated, and the untouched suites (Chat, Composer, ProposalCard, Steps, Strip, Turn, Drawer, Tree, FileView, sanitize, settings, api) still green: nothing they render changed, only tokens. Vite build succeeds.

- [ ] **Step 15: Look at it once**

In the worktree: `bun run ui:build`, then
```bash
mkdir -p /tmp/counsel-t2/home /tmp/counsel-t2/vault/matters
printf 'counsel-os-config: true\nlegal_root: /tmp/counsel-t2/vault\n' > /tmp/counsel-t2/vault/config.md
COUNSEL_OS_HOME=/tmp/counsel-t2/home bun runtime/src/cli.ts serve --port 7496 --vault /tmp/counsel-t2/vault --fake > /tmp/counsel-t2/serve.log 2>&1 &
sleep 3 && grep -o 'http://127.0.0.1:7496/#token=[^ ]*' /tmp/counsel-t2/serve.log
```
Open the printed URL. Expected: warm paper (or the dark ramp under a dark OS theme), the 216px rail with brand/nav/CONVERSATIONS/footer, `#/` a stub, `#/chat` the thread pane, `#/vault` collapses the rail to icons, Settings shows double-ruled groups with dotted-leader facts and set-text statuses. Then `kill %1`.

- [ ] **Step 16: Commit**

```bash
git add runtime/ui/src/app.tsx runtime/ui/src/app.test.tsx runtime/ui/src/v2/time.ts runtime/ui/src/v2/time.test.ts \
  runtime/ui/src/v2/icons.tsx runtime/ui/src/v2/Rail.tsx runtime/ui/src/v2/Rail.test.tsx \
  runtime/ui/src/v2/Shell.tsx runtime/ui/src/v2/Shell.test.tsx runtime/ui/src/styles.css runtime/ui/src/settings/Health.tsx
git commit -m "ui: brief/ledger tokens + motif, the rail shell, home route, settings restyle"
```

---

### Task 3: Vault surface — grouped tree, ⌘K search, the reading pane, drawer reuse

**Files:**
- Create: `runtime/ui/src/v2/vault/tree.ts`, `tree.test.ts`, `VaultTree.tsx`, `VaultTree.test.tsx`
- Create: `runtime/ui/src/v2/vault/frontmatter.ts`, `frontmatter.test.ts`, `outline.ts`, `outline.test.ts`
- Create: `runtime/ui/src/v2/vault/Reader.tsx`, `Reader.test.tsx`
- Rewrite: `runtime/ui/src/v2/vault/VaultPage.tsx`, `VaultPage.test.tsx`
- Modify: `runtime/ui/src/v2/Drawer.tsx`, `Drawer.test.tsx` (Reader replaces FileView; 420px)
- Modify: `runtime/ui/src/v2/chat/Composer.tsx` (the `seed` prop), `Composer.test.tsx` (one new test)
- Modify: `runtime/ui/src/v2/Shell.tsx` (`askAbout`, `seed` state → Chat; `onAsk` → VaultPage/Drawer), `runtime/ui/src/v2/chat/Chat.tsx` (pass `seed` through to Composer)
- Delete: `runtime/ui/src/vault/FileView.tsx`, `runtime/ui/src/vault/FileView.test.tsx` (Reader supersedes it — the 404 `missingNote`, the host-path scrubbing and the stale-read guard all move into Reader and its test)
- Modify: `runtime/ui/src/styles.css` (vault CSS)

**Interfaces:**
- Consumes: T1's `/vault/overview`, `/vault/search`, `VaultEntry.mtimeMs`; `orderEntries`, `baseName` from `src/vault/Tree.tsx` (the shared lazy Tree itself stays — the drawer's top pane still uses it); `relTime` (T2); `isMarkdown`, `renderMarkdown` (`vault/markdown.ts` — still the only HTML sink); Shell/Route from T2.
- Produces: everything in the shared-names table rows T3. `Reader({ path, outline = false, onAsk? })` exports `MISSING_FILE_NOTE` and `withoutHostPaths` (moved from FileView, verbatim). `VaultPage({ path, onOpen, onAsk? })`. `Drawer` keeps its props and gains `onAsk?`. `Composer` gains `seed?: ComposerSeed` (`{ text: string; nonce: number }`); `Chat` gains `seed?: ComposerSeed` and forwards it. Shell's `askAbout(path)` seeds the composer with `` `Regarding \`${path}\`: ` `` and navigates to `#/chat`.
- CSS classes later tasks and the e2e rely on: `.v2-vault .v2-vtree .v2-vsearch .v2-vgroup .v2-vrow .v2-vrow-ind .v2-vname .v2-vmonth .v2-vother .v2-vresults .v2-vempty .v2-doc .v2-doc-crumbs .v2-doc-head .v2-doc-meta .v2-fm .v2-fm-row .v2-doc-md .v2-outline .v2-askbar`.

- [ ] **Step 1: Write and pass the pure helpers — grouping, months, frontmatter, outline**

`runtime/ui/src/v2/vault/tree.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { groupRoot, monthLabel } from './tree';

const overview: VaultOverview = {
  matters: [
    { path: 'matters/2026-04-sinai-license.md', title: 'Sinai content license', frontmatter: {}, mtimeMs: 100 },
    { path: 'matters/acme.md', title: 'Acme Corp — NDA', frontmatter: {}, mtimeMs: 200 },
  ],
  groups: { practice: 2, knowledge: 1, other: 4 },
};

const root: VaultEntry[] = [
  { path: 'matters', kind: 'dir' },
  { path: 'practice', kind: 'dir' },
  { path: 'memory', kind: 'dir' },
  { path: 'law', kind: 'dir' },
  { path: 'entities', kind: 'dir' },
  { path: 'config.md', kind: 'file' },
  { path: 'scratch', kind: 'dir' },
];

describe('groupRoot', () => {
  test('matters from the overview; practice, knowledge and the rest from the root listing', () => {
    const groups = groupRoot(root, overview);
    expect(groups.mattersDir).toBe('matters');
    expect(groups.matters.map(m => m.title)).toEqual(['Sinai content license', 'Acme Corp — NDA']);
    expect(groups.practice.map(e => e.path)).toEqual(['practice']);
    expect(groups.knowledge.map(e => e.path)).toEqual(['memory', 'law', 'entities']);
    expect(groups.other.map(e => e.path)).toEqual(['config.md', 'scratch']);
  });

  test('with no matters at all, a root "matters" dir still does not leak into Other', () => {
    const groups = groupRoot(root, { matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
    expect(groups.matters).toEqual([]);
    expect(groups.other.map(e => e.path)).toEqual(['config.md', 'scratch']);
  });
});

describe('monthLabel', () => {
  test('the filename date wins; mtime is the fallback', () => {
    expect(monthLabel({ path: 'matters/2026-04-sinai-license.md', mtimeMs: 0 })).toBe('Apr');
    expect(monthLabel({ path: 'matters/acme.md', mtimeMs: new Date('2026-06-15T00:00:00Z').getTime() })).toBe('Jun');
  });
});
```

`runtime/ui/src/v2/vault/tree.ts`:

```ts
import type { MatterOverview, VaultEntry, VaultOverview } from '../../api/types';

/** The root dirs that read as Knowledge (spec §3.4: memory, law, entities). */
export const KNOWLEDGE_DIRS: ReadonlySet<string> = new Set(['memory', 'law', 'entities']);

export interface TreeGroups {
  mattersDir: string | null;
  matters: MatterOverview[];
  practice: VaultEntry[];
  knowledge: VaultEntry[];
  /** Everything else the server still lists (spec §3.4 "Other files (n)"). */
  other: VaultEntry[];
}

/**
 * The vault root, grouped the way a practice reads it. Matters come from the
 * overview (humanized, dated); the matters DIRECTORY is excluded from Other
 * — the group replaces it. With an empty overview the conventional `matters`
 * dir is still treated as the matters home rather than "other".
 */
export function groupRoot(rootEntries: VaultEntry[], overview: VaultOverview): TreeGroups {
  const first = overview.matters[0]?.path;
  const cut = first?.indexOf('/') ?? -1;
  const mattersDir = first !== undefined && cut > 0 ? first.slice(0, cut) : null;
  const practice: VaultEntry[] = [];
  const knowledge: VaultEntry[] = [];
  const other: VaultEntry[] = [];
  for (const entry of rootEntries) {
    if (entry.kind === 'dir' && (entry.path === mattersDir || (mattersDir === null && entry.path === 'matters'))) continue;
    if (entry.kind === 'dir' && entry.path === 'practice') practice.push(entry);
    else if (entry.kind === 'dir' && KNOWLEDGE_DIRS.has(entry.path)) knowledge.push(entry);
    else other.push(entry);
  }
  return { mattersDir, matters: overview.matters, practice, knowledge, other };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** The quiet right-aligned month (spec §3.4): the filename's `YYYY-MM-`
 * date when it has one, else the file's mtime. */
export function monthLabel(matter: { path: string; mtimeMs: number }): string {
  const base = matter.path.slice(matter.path.lastIndexOf('/') + 1);
  const dated = /^\d{4}-(\d{2})/.exec(base);
  if (dated !== null) {
    const month = Number(dated[1]);
    if (month >= 1 && month <= 12) return MONTHS[month - 1]!;
  }
  return MONTHS[new Date(matter.mtimeMs).getMonth()]!;
}
```

`runtime/ui/src/v2/vault/frontmatter.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { prettifyName, readerModel, splitFrontmatter } from './frontmatter';

describe('splitFrontmatter', () => {
  test('simple key: value rows, underscores spaced for display', () => {
    const { rows, body } = splitFrontmatter('---\nstage: working\nnext_action: send document list\n---\n# H1\nBody.\n');
    expect(rows).toEqual([
      { key: 'stage', value: 'working' },
      { key: 'next action', value: 'send document list' },
    ]);
    expect(body).toBe('# H1\nBody.\n');
  });

  test('no frontmatter and unterminated frontmatter are just a body', () => {
    expect(splitFrontmatter('# H1\n').rows).toEqual([]);
    expect(splitFrontmatter('---\nstage: working\n').rows).toEqual([]);
    expect(splitFrontmatter('---\nstage: working\n').body).toBe('---\nstage: working\n');
  });

  test('nested and valueless lines are skipped, not mangled', () => {
    const { rows } = splitFrontmatter('---\nstage: working\nnested:\n  a: 1\n---\nBody.\n');
    expect(rows).toEqual([{ key: 'stage', value: 'working' }]);
  });
});

describe('readerModel', () => {
  test('frontmatter title beats the H1 beats the prettified filename; the H1 leaves the body', () => {
    const fm = readerModel('---\ntitle: From FM\n---\n# From H1\nBody.\n', 'matters/x.md');
    expect(fm.title).toBe('From FM');
    expect(fm.body).not.toContain('# From H1');

    const h1 = readerModel('# From H1\nBody.\n', 'matters/x.md');
    expect(h1.title).toBe('From H1');
    expect(h1.body).toBe('Body.\n');

    const bare = readerModel('no headings\n', 'matters/2026-06-vendora-worldpay.md');
    expect(bare.title).toBe('Vendora worldpay');
  });
});

describe('prettifyName', () => {
  test('date prefix and extension off, dashes spaced, first letter up', () => {
    expect(prettifyName('2026-06-vendora-worldpay.md')).toBe('Vendora worldpay');
    expect(prettifyName('acme_nda.md')).toBe('Acme nda');
  });
});
```

`runtime/ui/src/v2/vault/frontmatter.ts`:

```ts
/**
 * The reader's client-side frontmatter split (spec §3.4: frontmatter as a
 * two-column dotted-leader block). Simple `key: value` lines only — nested
 * YAML is a structure, not a fact row, and the server's
 * `runtime/src/vault/overview.ts` owns real parsing.
 */

export interface FmRow {
  key: string;
  value: string;
}

export function splitFrontmatter(source: string): { rows: FmRow[]; body: string } {
  if (!/^---\r?\n/.test(source)) return { rows: [], body: source };
  const lines = source.split('\n');
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { rows: [], body: source };
  const rows: FmRow[] = [];
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(line);
    if (m !== null) rows.push({ key: m[1]!.replace(/_/g, ' '), value: m[2]!.trim() });
  }
  return { rows, body: lines.slice(end + 1).join('\n') };
}

/** Same rule as the server's `prettifyName` (`runtime/src/vault/overview.ts`)
 * — copied, not imported: `runtime/ui` must not pull `runtime/src` into a
 * browser bundle. A change there is a change here. */
export function prettifyName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}(-\d{2})?-/, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? fileName : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface ReaderModel {
  title: string;
  rows: FmRow[];
  /** The body with its first H1 removed — the reader draws the title
   * itself, in the dochead (spec §3.4). */
  body: string;
}

export function readerModel(source: string, path: string): ReaderModel {
  const { rows, body } = splitFrontmatter(source);
  const fmTitle = rows.find(r => r.key === 'title')?.value;
  const h1 = /^#\s+(.+)$/m.exec(body);
  const title = fmTitle ?? h1?.[1]?.trim() ?? prettifyName(path.slice(path.lastIndexOf('/') + 1));
  const stripped = h1 === null ? body : body.replace(h1[0], '').replace(/^\n+/, '');
  return { title, rows: rows.filter(r => r.key !== 'title'), body: stripped };
}
```

`runtime/ui/src/v2/vault/outline.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { outlineOf } from './outline';

describe('outlineOf', () => {
  test('H2s in order; H1s and H3s are not sections', () => {
    expect(outlineOf('# Title\n## Background\ntext\n### sub\n## Next steps\n')).toEqual(['Background', 'Next steps']);
  });

  test('a ## inside a fence is code, not a section', () => {
    expect(outlineOf('## Real\n```\n## fake\n```\n## Also real\n')).toEqual(['Real', 'Also real']);
  });

  test('no H2s, no outline', () => {
    expect(outlineOf('just prose\n')).toEqual([]);
  });
});
```

`runtime/ui/src/v2/vault/outline.ts`:

```ts
/** The reading pane's outline column (spec §3.4): the body's H2s, in order.
 * Fenced code is skipped so an example heading is not a section. */
export function outlineOf(body: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^##\s+(.+)$/.exec(line);
    if (m !== null) out.push(m[1]!.trim());
  }
  return out;
}
```

Run: `cd runtime/ui && bun test src/v2/vault/tree.test.ts src/v2/vault/frontmatter.test.ts src/v2/vault/outline.test.ts`
Expected: PASS.

- [ ] **Step 2: Write the failing Reader tests**

`runtime/ui/src/v2/vault/Reader.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import { MISSING_FILE_NOTE, Reader, withoutHostPaths } from './Reader';

const realFetch = globalThis.fetch;

const SOURCE = [
  '---',
  'stage: working',
  'counterparty: Worldpay',
  'deadline: 2026-09-12',
  '---',
  '# Vendora × Worldpay — documentation requests',
  '',
  '## Background',
  'Some prose.',
  '',
  '## Next steps',
  'More prose.',
  '',
].join('\n');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(read: () => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/read')) return read();
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('Reader', () => {
  test('crumbs, the serif title, version + updated, leader facts, markdown body', async () => {
    install(() =>
      json({ path: 'matters/2026-06-vendora.md', content: SOURCE, version: '4576a07bcd', mtimeMs: Date.now() - 2 * 3_600_000 }),
    );
    render(<Reader path="matters/2026-06-vendora.md" />);

    await waitFor(() => expect(screen.getByText('Vendora × Worldpay — documentation requests')).toBeTruthy());
    // Crumbs: the containing path in mono, the filename strong.
    expect(document.querySelector('.v2-doc-crumbs')?.textContent).toContain('matters');
    expect(document.querySelector('.v2-doc-crumbs b')?.textContent).toBe('2026-06-vendora.md');
    // Meta: updated <ago> · version <7>.
    expect(document.querySelector('.v2-doc-meta')?.textContent).toBe('updated 2h ago · version 4576a07');
    // Frontmatter rows with leaders.
    expect(screen.getByText('counterparty')).toBeTruthy();
    expect(screen.getByText('Worldpay')).toBeTruthy();
    expect(document.querySelectorAll('.v2-fm-row .leader').length).toBe(3);
    // The body renders as markdown, WITHOUT a duplicate H1.
    expect(document.querySelectorAll('.v2-doc-md h1').length).toBe(0);
    expect(document.querySelector('.v2-doc-md h2')?.textContent).toBe('Background');
  });

  test('the outline column lists the H2s when asked for', async () => {
    install(() => json({ path: 'matters/x.md', content: SOURCE, version: null, mtimeMs: null }));
    render(<Reader path="matters/x.md" outline />);
    await waitFor(() => expect(document.querySelector('.v2-outline')).toBeTruthy());
    expect(Array.from(document.querySelectorAll('.v2-outline div'), el => el.textContent)).toEqual([
      'Background',
      'Next steps',
    ]);
  });

  test('a 404 is the missing-file note, not an error', async () => {
    install(() => json({ error: 'not found' }, 404));
    render(<Reader path="practice/standards/nda.md" />);
    await waitFor(() => expect(screen.getByText(MISSING_FILE_NOTE)).toBeTruthy());
    expect(document.querySelector('.notice-error')).toBeNull();
  });

  test('the ask bar hands the path over', async () => {
    install(() => json({ path: 'matters/x.md', content: '# X\nBody.\n', version: null, mtimeMs: null }));
    const asked: string[] = [];
    render(<Reader path="matters/x.md" onAsk={path => asked.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Ask counsel about this file/ })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /Ask counsel about this file/ }));
    expect(asked).toEqual(['matters/x.md']);
  });

  test('a non-markdown file renders raw', async () => {
    install(() => json({ path: 'matters/notes.txt', content: '<b>not bold</b>\n', version: null, mtimeMs: null }));
    render(<Reader path="matters/notes.txt" />);
    await waitFor(() => expect(document.querySelector('pre.vault-raw')).toBeTruthy());
    expect(document.querySelector('.v2-doc b')).toBeNull();
  });
});

describe('withoutHostPaths', () => {
  test('keeps the last two segments of an absolute path and vault-relative ones intact', () => {
    expect(withoutHostPaths("ENOENT: no such file, open '/Users/x/vault/matters/nda.md'")).toBe(
      "ENOENT: no such file, open 'matters/nda.md'",
    );
    expect(withoutHostPaths('practice/standards/nda.md is missing')).toBe('practice/standards/nda.md is missing');
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/vault/Reader.test.tsx`
Expected: FAIL — `Cannot find module './Reader'`.

- [ ] **Step 4: Implement `runtime/ui/src/v2/vault/Reader.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultFile } from '../../api/types';
import { isMarkdown, renderMarkdown } from '../../vault/markdown';
import { relTime } from '../time';
import { readerModel } from './frontmatter';
import { outlineOf } from './outline';

/** Moved from FileView (which this component supersedes): a missing file is
 * a state, not a failure — "open in vault" on an unapproved proposal is the
 * likeliest click on the page. */
export const MISSING_FILE_NOTE = 'This file does not exist yet — approving a proposal that names it creates it.';

/** Moved verbatim from FileView: strips absolute host paths out of a read
 * error, keeping the last two segments — enough to recognize the file. */
export function withoutHostPaths(message: string): string {
  return message.replace(/(^|[\s'"(\[])(\/(?:[^\s'"()\[\]]+\/)+[^\s'"()\[\]]*)/g, (_m, lead: string, path: string) =>
    lead +
    path
      .split('/')
      .filter(segment => segment !== '')
      .slice(-2)
      .join('/'),
  );
}

export interface ReaderProps {
  path: string;
  /** The H2 outline column — on for the vault page's wide pane, off in the
   * 420px drawer (spec §3.4). */
  outline?: boolean;
  /** Renders the sticky "Ask counsel about this file ↵" bar. */
  onAsk?: (path: string) => void;
}

/**
 * The reading pane (spec §3.4): mono crumbs, serif H1 (the doc's title, not
 * the filename), `updated <ago> · version <7>`, frontmatter as dotted-leader
 * rows, markdown at a ~68ch serif measure, an H2 outline on wide viewports,
 * and the sticky ask bar. Read-only, like the FileView it replaces; the
 * markdown still flows through `renderMarkdown` — the one HTML sink.
 */
export function Reader({ path, outline = false, onAsk }: ReaderProps): JSX.Element {
  const [file, setFile] = useState<VaultFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let live = true;
    setFile(null);
    setError(null);
    setMissing(false);
    void (async () => {
      try {
        const read = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(path)}`);
        // A click on a second file while the first is in flight must not
        // paint the first one's contents under the second one's name.
        if (live) setFile(read);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        if (!live) return;
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setError(withoutHostPaths(err instanceof Error ? err.message : String(err)));
      }
    })();
    return () => {
      live = false;
    };
  }, [path]);

  const model = useMemo(() => (file === null ? null : readerModel(file.content, path)), [file, path]);
  const sections = useMemo(() => (model === null || !outline ? [] : outlineOf(model.body)), [model, outline]);
  const html = useMemo(() => (model === null || !isMarkdown(path) ? null : renderMarkdown(model.body)), [model, path]);

  // Which H2 the reader is at, for the outline highlight. Guarded: happy-dom
  // has no IntersectionObserver, and the highlight is a nicety, not layout.
  useEffect(() => {
    setCurrent(0);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const headings = Array.from(document.querySelectorAll('.v2-doc-md h2'));
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(headings.indexOf(entry.target));
        }
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [sections, html]);

  const crumbs = path.split('/').filter(s => s !== '');

  return (
    <article className="v2-doc">
      <nav className="v2-doc-crumbs" aria-label="Breadcrumb">
        {crumbs.map((part, i) => (
          <span key={`${i}-${part}`}>
            {i > 0 ? ' / ' : ''}
            {i === crumbs.length - 1 ? <b>{part}</b> : part}
          </span>
        ))}
      </nav>

      {error !== null ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : missing ? (
        <p className="muted v2-doc-missing" role="status">
          {MISSING_FILE_NOTE}
        </p>
      ) : file === null || model === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <header className="v2-doc-head">
            <h1>{model.title}</h1>
            <span className="v2-doc-meta">
              {[
                file.mtimeMs === undefined || file.mtimeMs === null ? null : `updated ${relTime(file.mtimeMs)}`,
                file.version === null ? null : `version ${file.version.slice(0, 7)}`,
              ]
                .filter(part => part !== null)
                .join(' · ')}
            </span>
          </header>

          {model.rows.length === 0 ? null : (
            <dl className="v2-fm">
              {model.rows.map(row => (
                <div className="v2-fm-row" key={row.key}>
                  <dt>{row.key}</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {html !== null ? (
            // Sanitized by `renderMarkdown` — the app's only HTML sink.
            <div className="markdown v2-doc-md" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="vault-raw">{file.content}</pre>
          )}

          {sections.length === 0 ? null : (
            <aside className="v2-outline" aria-label="Outline">
              {sections.map((section, i) => (
                <div key={section} className={i === current ? 'on' : undefined}>
                  {section}
                </div>
              ))}
            </aside>
          )}

          {onAsk === undefined ? null : (
            <div className="v2-askbar">
              <button type="button" onClick={() => onAsk(path)}>
                Ask counsel about this file <b>↵</b>
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
```

Run: `cd runtime/ui && bun test src/v2/vault/Reader.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing VaultTree + VaultPage tests**

`runtime/ui/src/v2/vault/VaultTree.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { VaultTree } from './VaultTree';

const realFetch = globalThis.fetch;

const overview: VaultOverview = {
  matters: [{ path: 'matters/2026-06-vendora.md', title: 'Vendora × Worldpay', frontmatter: {}, mtimeMs: 1 }],
  groups: { practice: 2, knowledge: 1, other: 1 },
};

const root: VaultEntry[] = [
  { path: 'matters', kind: 'dir' },
  { path: 'practice', kind: 'dir' },
  { path: 'memory', kind: 'dir' },
  { path: 'config.md', kind: 'file' },
];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/vault/list?dir=practice') {
      return json([
        { path: 'practice/standards', kind: 'dir' },
        { path: 'practice/playbooks', kind: 'dir' },
      ] satisfies VaultEntry[]);
    }
    if (url === '/vault/list?dir=practice%2Fstandards') {
      return json([{ path: 'practice/standards/nda.md', kind: 'file' }] satisfies VaultEntry[]);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('VaultTree', () => {
  test('groups render: humanized matters with a month, practice children, knowledge dirs, Other collapsed', async () => {
    render(<VaultTree overview={overview} root={root} selected={null} onOpen={() => {}} />);
    expect(screen.getByText('Matters')).toBeTruthy();
    expect(screen.getByText('Vendora × Worldpay')).toBeTruthy();
    expect(screen.getByText('Jun')).toBeTruthy();
    // Practice lists the practice/ CHILDREN (the mock's standards/playbooks).
    await waitFor(() => expect(screen.getByText('standards')).toBeTruthy());
    expect(screen.getByText('playbooks')).toBeTruthy();
    // Knowledge lists the knowledge dirs themselves.
    expect(screen.getByText('memory')).toBeTruthy();
    // Other is a collapsed count; its entries are not in the DOM yet.
    expect(screen.getByText('Other files (1)')).toBeTruthy();
    expect(screen.queryByText('config.md')).toBeNull();
  });

  test('a dir expands lazily; a file click opens; Other unfolds', async () => {
    const opened: string[] = [];
    render(<VaultTree overview={overview} root={root} selected={null} onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByText('standards')).toBeTruthy());

    await userEvent.click(screen.getByText('standards'));
    await waitFor(() => expect(screen.getByText('nda.md')).toBeTruthy());
    await userEvent.click(screen.getByText('nda.md'));
    expect(opened).toEqual(['practice/standards/nda.md']);

    await userEvent.click(screen.getByText('Other files (1)'));
    expect(screen.getByText('config.md')).toBeTruthy();

    await userEvent.click(screen.getByText('Vendora × Worldpay'));
    expect(opened).toEqual(['practice/standards/nda.md', 'matters/2026-06-vendora.md']);
  });
});
```

`runtime/ui/src/v2/vault/VaultPage.test.tsx` (replace in full):

```tsx
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { VaultHit, VaultOverview } from '../../api/types';
import { VaultPage } from './VaultPage';

const realFetch = globalThis.fetch;

const overview: VaultOverview = {
  matters: [{ path: 'matters/acme.md', title: 'Acme Corp — NDA', frontmatter: {}, mtimeMs: 1 }],
  groups: { practice: 0, knowledge: 0, other: 0 },
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

let hits: VaultHit[] = [];
let searched: string[] = [];

beforeEach(() => {
  hits = [];
  searched = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/overview')) return json(overview);
    if (url === '/vault/list') return json([{ path: 'matters', kind: 'dir' }]);
    if (url.startsWith('/vault/search')) {
      searched.push(new URL(`http://x${url}`).searchParams.get('q') ?? '');
      return json(hits);
    }
    if (url.startsWith('/vault/read')) return json({ path: 'matters/acme.md', content: '# Acme\nBody.\n', version: null, mtimeMs: null });
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('VaultPage', () => {
  test('⌘K focuses the search field', async () => {
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('Search the vault')).toBeTruthy());
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText('Search the vault'));
  });

  test('Enter runs the search; results replace the tree; clear restores it', async () => {
    hits = [{ path: 'matters/acme.md', snippet: 'Term: 2 years', score: 1 }];
    const opened: string[] = [];
    render(<VaultPage path={null} onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());

    await userEvent.type(screen.getByLabelText('Search the vault'), 'acme{Enter}');
    expect(searched).toEqual(['acme']);
    await waitFor(() => expect(screen.getByText('matters/acme.md')).toBeTruthy());
    // The grouped tree is replaced until the search clears (spec §3.4).
    expect(screen.queryByText('Acme Corp — NDA')).toBeNull();

    await userEvent.click(screen.getByText('matters/acme.md'));
    expect(opened).toEqual(['matters/acme.md']);

    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
  });

  test('no results is a designed empty state with a way out', async () => {
    hits = [];
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('Search the vault')).toBeTruthy());
    await userEvent.type(screen.getByLabelText('Search the vault'), 'zzz{Enter}');
    await waitFor(() => expect(screen.getByText(/No results for “zzz”/)).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
  });

  test('a path renders the Reader with its outline', async () => {
    render(<VaultPage path="matters/acme.md" onOpen={() => {}} />);
    await waitFor(() => expect(document.querySelector('.v2-doc')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Acme')).toBeTruthy());
  });
});
```

- [ ] **Step 6: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/vault/VaultTree.test.tsx src/v2/vault/VaultPage.test.tsx`
Expected: FAIL — no `VaultTree` module; VaultPage has no search field.

- [ ] **Step 7: Implement `VaultTree` and the new `VaultPage`**

`runtime/ui/src/v2/vault/VaultTree.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { baseName, orderEntries } from '../../vault/Tree';
import { groupRoot, monthLabel } from './tree';

export interface VaultTreeProps {
  overview: VaultOverview;
  /** The root listing (`GET /vault/list`), for the non-matter groups. */
  root: VaultEntry[];
  selected: string | null;
  onOpen(path: string): void;
}

/**
 * The grouped tree pane (spec §3.4): Matters (humanized titles, quiet
 * months), Practice (the practice/ children), Knowledge (memory · law ·
 * entities), and "Other files (n)" collapsed over everything else the
 * server still lists. Directories stay lazy — a level is fetched when
 * somebody opens it, once.
 */
export function VaultTree({ overview, root, selected, onOpen }: VaultTreeProps): JSX.Element {
  const groups = groupRoot(root, overview);
  const [levels, setLevels] = useState<Record<string, VaultEntry[] | undefined>>({});
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [otherOpen, setOtherOpen] = useState(false);
  const asked = useRef<Set<string>>(new Set());

  const ensure = useCallback((dir: string): void => {
    if (asked.current.has(dir)) return;
    asked.current.add(dir);
    void (async () => {
      try {
        const entries = await fetchJson<VaultEntry[]>(`/vault/list?dir=${encodeURIComponent(dir)}`);
        setLevels(prev => ({ ...prev, [dir]: orderEntries(entries) }));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setLevels(prev => ({ ...prev, [dir]: [] }));
      }
    })();
  }, []);

  // Practice shows its CHILDREN as the group's rows (the mock's
  // standards/playbooks), so those levels load eagerly.
  useEffect(() => {
    for (const entry of groups.practice) ensure(entry.path);
    // A new root listing can add a practice dir; `ensure` dedupes.
  }, [groups.practice, ensure]);

  const toggle = (dir: string): void => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
    ensure(dir);
  };

  const fileRow = (path: string, name: string, indent: boolean): JSX.Element => (
    <button
      key={path}
      type="button"
      className={indent ? 'v2-vrow v2-vrow-ind' : 'v2-vrow'}
      aria-current={selected === path ? 'page' : undefined}
      onClick={() => onOpen(path)}
    >
      <span className="v2-vname">{name}</span>
    </button>
  );

  const dirNode = (entry: VaultEntry, indent: boolean): JSX.Element => (
    <div key={entry.path}>
      <button
        type="button"
        className={indent ? 'v2-vrow v2-vdir v2-vrow-ind' : 'v2-vrow v2-vdir'}
        aria-expanded={open.has(entry.path)}
        onClick={() => toggle(entry.path)}
      >
        <span className="v2-tri" aria-hidden="true">
          {open.has(entry.path) ? '▾' : '▸'}
        </span>
        <span className="v2-vname">{baseName(entry.path)}</span>
      </button>
      {open.has(entry.path)
        ? (levels[entry.path] ?? []).map(child =>
            child.kind === 'dir' ? dirNode(child, true) : fileRow(child.path, baseName(child.path), true),
          )
        : null}
    </div>
  );

  return (
    <div className="v2-tlist">
      {groups.matters.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Matters</div>
          {groups.matters.map(matter => (
            <button
              key={matter.path}
              type="button"
              className="v2-vrow v2-vrow-ind"
              aria-current={selected === matter.path ? 'page' : undefined}
              onClick={() => onOpen(matter.path)}
            >
              <span className="v2-vname">{matter.title}</span>
              <span className="v2-vmonth">{monthLabel(matter)}</span>
            </button>
          ))}
        </>
      )}

      {groups.practice.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Practice</div>
          {groups.practice.flatMap(practice =>
            (levels[practice.path] ?? []).map(child =>
              child.kind === 'dir' ? dirNode(child, false) : fileRow(child.path, baseName(child.path), false),
            ),
          )}
        </>
      )}

      {groups.knowledge.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Knowledge</div>
          {groups.knowledge.map(entry => dirNode(entry, false))}
        </>
      )}

      {groups.other.length === 0 ? null : (
        <>
          <button type="button" className="v2-vrow v2-vdir v2-vother" aria-expanded={otherOpen} onClick={() => setOtherOpen(o => !o)}>
            <span className="v2-tri" aria-hidden="true">
              {otherOpen ? '▾' : '▸'}
            </span>
            <span className="v2-vname">Other files ({groups.other.length})</span>
          </button>
          {otherOpen
            ? groups.other.map(entry => (entry.kind === 'dir' ? dirNode(entry, true) : fileRow(entry.path, baseName(entry.path), true)))
            : null}
        </>
      )}
    </div>
  );
}
```

Replace `runtime/ui/src/v2/vault/VaultPage.tsx` in full:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultEntry, VaultHit, VaultOverview } from '../../api/types';
import { Reader } from './Reader';
import { VaultTree } from './VaultTree';

export interface VaultPageProps {
  /** The file named by `#/vault?path=…`, or `null` for the tree alone. */
  path: string | null;
  onOpen(path: string): void;
  /** The reading pane's "Ask counsel about this file ↵" (spec §3.4). */
  onAsk?: (path: string) => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The vault surface (spec §3.4): a ~300px tree pane — search on top (⌘K
 * focuses, Enter runs `/vault/search`, results replace the tree until
 * cleared), the grouped tree under it — and the reading pane.
 */
export function VaultPage({ path, onOpen, onAsk }: VaultPageProps): JSX.Element {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [root, setRoot] = useState<VaultEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<VaultHit[] | null>(null);
  const search = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, entries] = await Promise.all([
          fetchJson<VaultOverview>('/vault/overview'),
          fetchJson<VaultEntry[]>('/vault/list'),
        ]);
        setOverview(ov);
        setRoot(entries);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      }
    })();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = useCallback(async (): Promise<void> => {
    const q = query.trim();
    if (q === '') {
      setHits(null);
      return;
    }
    try {
      setHits(await fetchJson<VaultHit[]>(`/vault/search?q=${encodeURIComponent(q)}`));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    }
  }, [query]);

  const clear = (): void => {
    setQuery('');
    setHits(null);
  };

  return (
    <div className="v2-vault">
      <div className="v2-vtree">
        <div className="v2-vsearch">
          <input
            ref={search}
            aria-label="Search the vault"
            placeholder="Search the vault…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void runSearch();
              if (event.key === 'Escape') clear();
            }}
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </div>

        {hits !== null ? (
          <div className="v2-tlist v2-vresults" aria-label="Search results">
            <div className="v2-vgroup">
              Results{' '}
              <button type="button" className="v2-link" onClick={clear}>
                clear
              </button>
            </div>
            {hits.length === 0 ? (
              <p className="muted v2-vempty">
                No results for “{query.trim()}”.{' '}
                <button type="button" className="v2-link" onClick={clear}>
                  Clear the search
                </button>
              </p>
            ) : (
              hits.map(hit => (
                <button
                  key={hit.path}
                  type="button"
                  className="v2-vrow"
                  aria-current={path === hit.path ? 'page' : undefined}
                  onClick={() => onOpen(hit.path)}
                >
                  <span className="v2-vname" title={hit.snippet}>
                    {hit.path}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : error !== null ? (
          <p className="notice notice-error v2-vempty" role="alert">
            {error}
          </p>
        ) : overview === null || root === null ? (
          <p className="muted v2-vempty">Loading…</p>
        ) : (
          <VaultTree overview={overview} root={root} selected={path} onOpen={onOpen} />
        )}
      </div>

      <main className="v2-vault-main">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <Reader key={path} path={path} outline onAsk={onAsk} />
        )}
      </main>
    </div>
  );
}
```

Run: `cd runtime/ui && bun test src/v2/vault`
Expected: PASS.

- [ ] **Step 8: Swap the drawer's file view; wire the composer seed; retire FileView**

**(a)** `runtime/ui/src/v2/Drawer.tsx` — replace the FileView/Breadcrumb import and use with Reader (the shared lazy `Tree` on top stays):

```tsx
import { useEffect } from 'react';
import { Tree } from '../vault/Tree';
import { Reader } from './vault/Reader';

export interface DrawerProps {
  path: string | null;
  revision?: number;
  onOpen(path: string): void;
  onClose(): void;
  /** The reader's ask bar, when the shell offers it. */
  onAsk?: (path: string) => void;
}

/**
 * The vault beside the thread: the same reading pane as the vault page,
 * minus the outline, at 420px (spec §3.4). Closable by its button or Esc.
 */
export function Drawer({ path, revision = 0, onOpen, onClose, onAsk }: DrawerProps): JSX.Element {
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
        <Tree selected={path} expandToSelected onSelect={onOpen} />
      </div>
      <div className="v2-drawer-file">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <Reader key={`${path}#${revision}`} path={path} onAsk={onAsk} />
        )}
      </div>
    </aside>
  );
}
```

In `runtime/ui/src/v2/Drawer.test.tsx`, the assertions that addressed FileView change: `.vault-file-path` → the Reader's crumbs (`.v2-doc-crumbs b`), and the missing-note import moves — replace `import { Breadcrumb, MISSING_FILE_NOTE } from './vault/VaultPage'`-style references with `import { MISSING_FILE_NOTE } from './vault/Reader'`. Any test fetch mock for `/vault/read` must include `version` and `mtimeMs` keys (both may be `null`). Update those selectors/imports; the drawer's behaviors under test (Esc closes, tree renders, open page link) are unchanged.

**(b)** `runtime/ui/src/v2/chat/Composer.tsx` — add the seed. New export + prop and the sync block at the top of the component:

```tsx
/** A prefill pushed in from outside — the vault's "Ask counsel about this
 * file" (spec §3.4). The nonce distinguishes two asks about the same file. */
export interface ComposerSeed {
  text: string;
  nonce: number;
}
```

Add `seed?: ComposerSeed;` to `ComposerProps`, destructure it, and inside the component (right after `useState('')`):

```tsx
  const [seenSeed, setSeenSeed] = useState(0);
  if (seed !== undefined && seed.nonce !== seenSeed) {
    setSeenSeed(seed.nonce);
    setMessage(seed.text);
  }
```

Append a test to `runtime/ui/src/v2/chat/Composer.test.tsx` (match the file's existing render helper/props):

```tsx
  test('a seed fills the box once per nonce, and typing after it survives re-renders', async () => {
    const { rerender } = render(
      <Composer providers={providers} defaultProvider="fake/fake" streaming={false} onSend={() => {}} onStop={() => {}} seed={{ text: 'Regarding `matters/acme.md`: ', nonce: 1 }} />,
    );
    const box = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    expect(box.value).toBe('Regarding `matters/acme.md`: ');
    await userEvent.type(box, 'is the cap mutual?');
    rerender(
      <Composer providers={providers} defaultProvider="fake/fake" streaming={false} onSend={() => {}} onStop={() => {}} seed={{ text: 'Regarding `matters/acme.md`: ', nonce: 1 }} />,
    );
    expect(box.value).toBe('Regarding `matters/acme.md`: is the cap mutual?');
  });
```

**(c)** `runtime/ui/src/v2/chat/Chat.tsx` — pass it through: add `seed?: ComposerSeed;` to `ChatProps` (import the type from `./Composer`), destructure, and hand `seed={seed}` to the `<Composer …/>` at the bottom.

**(d)** `runtime/ui/src/v2/Shell.tsx` — the ask seed:

```tsx
import type { ComposerSeed } from './chat/Composer';
```

state + callback inside `Shell`:

```tsx
  const [seed, setSeed] = useState<ComposerSeed | undefined>(undefined);

  /** The vault's "Ask counsel about this file ↵": prefill the composer with
   * the path and go to chat (spec §3.4). A prompt-fill, not a flow. */
  const askAbout = useCallback((path: string): void => {
    setSeed(current => ({ text: `Regarding \`${path}\`: `, nonce: (current?.nonce ?? 0) + 1 }));
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
  }, []);
```

Pass `seed={seed}` to `<Chat …/>`, `onAsk={askAbout}` to `<VaultPage …/>` and to `<Drawer …/>`.

**(e)** Delete `runtime/ui/src/vault/FileView.tsx` and `runtime/ui/src/vault/FileView.test.tsx` (`git rm`); nothing imports them any more (`grep -rn "FileView" runtime/ui/src` must come back empty).

- [ ] **Step 9: The vault CSS**

Append to `runtime/ui/src/styles.css` (values lifted from mock-vault.html, tokens swapped in), and DELETE the old `.v2-vault { display:grid; grid-template-columns: minmax(14rem, 18rem) 1fr; … }` rule plus the `.v2-crumbs`/`.v2-crumb-sep`/`.v2-crumb-last` rules (breadcrumbs live in the Reader now):

```css
/* ── The vault surface (mock-vault.html) ─────────────────────────────── */

.v2-vault { display: flex; flex: 1; min-height: 0; }
.v2-vtree { width: 300px; flex-shrink: 0; border-right: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; }
.v2-vsearch {
  margin: 14px 12px 10px;
  background: var(--bg-raised);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 4px 8px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.v2-vsearch input { flex: 1; min-width: 0; background: none; border: none; padding: 3px; color: var(--fg); font-size: 13px; outline: none; }
.v2-vsearch input::placeholder { color: var(--fg-faint); }
.v2-vsearch kbd { font-size: 11px; border: 1px solid var(--border-strong); border-radius: 5px; padding: 0 5px; color: var(--fg-faint); }
.v2-tlist { overflow-y: auto; padding: 0 8px 14px; font-size: 13.5px; }
.v2-vgroup { padding: 10px 8px 4px; font: 600 10.5px/1 var(--sans); letter-spacing: 0.09em; text-transform: uppercase; color: var(--fg-faint); display: flex; justify-content: space-between; align-items: baseline; }
.v2-vrow {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  padding: 4.5px 8px;
  border: none;
  border-radius: 7px;
  background: none;
  color: var(--fg-muted);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}
.v2-vrow:hover { background: var(--bg-raised); }
.v2-vrow[aria-current="page"] { background: var(--bg-hover); color: var(--fg); }
.v2-vrow-ind { padding-left: 24px; }
.v2-vdir { font-weight: 500; }
.v2-tri { color: var(--fg-faint); font-size: 10px; width: 10px; flex-shrink: 0; }
.v2-vname { overflow: hidden; text-overflow: ellipsis; }
.v2-vmonth { margin-left: auto; font-size: 10.5px; color: var(--fg-faint); flex-shrink: 0; }
.v2-vother { color: var(--fg-faint); margin-top: 8px; }
.v2-vempty { margin: 12px; }

/* Reading pane (mock-vault.html .doc): ~68ch serif measure. */
.v2-vault-main { flex: 1; min-width: 0; overflow-y: auto; position: relative; }
.v2-doc { max-width: 760px; margin: 0 auto; padding: 44px 48px 90px; position: relative; }
.v2-drawer-file .v2-doc { padding: 8px 4px 40px; }
.v2-doc-crumbs { font: 12.5px var(--mono); color: var(--fg-faint); margin-bottom: 8px; }
.v2-doc-crumbs b { color: var(--fg-muted); font-weight: 500; }
.v2-doc-head { display: flex; align-items: baseline; gap: 14px; border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 24px; }
.v2-doc-head h1 { font: 600 24px/1.25 var(--serif); margin: 0; }
.v2-doc-meta { margin-left: auto; font: 12px var(--mono); color: var(--fg-faint); flex-shrink: 0; white-space: nowrap; }
.v2-fm { columns: 2; gap: 40px; margin: 0 0 26px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.v2-fm-row { display: flex; align-items: baseline; font-size: 13px; color: var(--fg-faint); padding: 2px 0; break-inside: avoid; }
.v2-fm-row dt { color: var(--fg-faint); }
.v2-fm-row dd { margin: 0; color: var(--fg); font-weight: 600; }
.v2-doc-md { font: 16.5px/1.7 var(--serif); color: var(--fg); max-width: 68ch; }
.v2-doc-md h2 { font: 600 18px/1.3 var(--serif); margin: 26px 0 10px; }
.v2-outline { position: sticky; float: right; top: 110px; width: 148px; margin-right: -170px; font-size: 11.5px; color: var(--fg-faint); border-left: 1px solid var(--border); padding-left: 10px; }
.v2-outline div { padding: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2-outline .on { color: var(--fg); }
@media (max-width: 1200px) { .v2-outline { display: none; } }
.v2-askbar { position: sticky; bottom: 24px; display: flex; justify-content: center; margin-top: 40px; }
.v2-askbar button { background: var(--bg-hover); border: 1px solid var(--border-strong); color: var(--fg); border-radius: 999px; padding: 9px 18px; font-size: 13px; box-shadow: var(--shadow); }
.v2-askbar b { color: var(--accent); }
```

Also change `--drawer-w` usage: the drawer width token is already `420px` from Task 2's `:root`.

- [ ] **Step 10: Run the whole UI suite; typecheck; build**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean; the deleted FileView suite is gone, Reader/VaultTree/VaultPage/tree/frontmatter/outline suites pass, Drawer + Shell suites pass with the updated selectors; build ok.

- [ ] **Step 11: Look at it once**

Same recipe as Task 2 Step 15 (port 7496, fresh scratch dir), with a matter seeded:
```bash
printf -- '---\ntitle: Vendora × Worldpay\ncounterparty: Worldpay\nnext_action: send document list\ndeadline: 2026-09-12\n---\n# Vendora × Worldpay\n\n## Background\nProse.\n\n## Next steps\nProse.\n' > /tmp/counsel-t2/vault/matters/2026-06-vendora.md
```
Expected on `#/vault`: icon rail; the grouped tree (Matters → "Vendora × Worldpay · Jun"); ⌘K focuses; a search replaces the tree; opening the matter shows crumbs → serif title → `updated … · version …` → leader facts → serif body, outline on a wide window; "Ask counsel about this file ↵" jumps to chat with the path prefilled.

- [ ] **Step 12: Commit**

```bash
git add runtime/ui/src/v2/vault runtime/ui/src/v2/Drawer.tsx runtime/ui/src/v2/Drawer.test.tsx \
  runtime/ui/src/v2/chat/Composer.tsx runtime/ui/src/v2/chat/Composer.test.tsx runtime/ui/src/v2/chat/Chat.tsx \
  runtime/ui/src/v2/Shell.tsx runtime/ui/src/styles.css
git rm runtime/ui/src/vault/FileView.tsx runtime/ui/src/vault/FileView.test.tsx
git commit -m "ui: vault surface — grouped tree, ⌘K search, the reading pane, drawer on the reader"
```

---

### Task 4: Home — greeting, ask box, docket, starters, matters, conversations

**Files:**
- Create: `runtime/ui/src/v2/home/home.ts`, `home.test.ts`, `HomePage.tsx`, `HomePage.test.tsx`
- Modify: `runtime/ui/src/v2/threads.ts` (add `defaultProviderId`), `runtime/ui/src/v2/threads.test.ts` (one describe)
- Modify: `runtime/ui/src/v2/Shell.tsx` (render `HomePage`; `startAsk`), `runtime/ui/src/v2/Shell.test.tsx` (home-stub assertion → HomePage)
- Modify: `runtime/ui/src/v2/chat/Chat.tsx` (the `initialAsk` prop), `runtime/ui/src/v2/chat/Chat.test.tsx` (one test)
- Modify: `runtime/ui/src/styles.css` (home CSS)

**Interfaces:**
- Consumes: T1's `/vault/overview` + `/proposals?status=pending` and their UI types; `relTime` (T2); `Tree` from `src/vault/Tree.tsx` (the attach-from-vault picker); Shell's `openThread` and `openDraft` (T2); `ComposerSeed` (T3).
- Produces: `greetingFor(now?: Date): string`; `sublineFor(counts: { nextActions: number; pending: number }): string | null`; `parseDeadline(fm: Record<string, string>): Date | null`; `nextActionOf(fm): string | null`; `sortMatters(matters: MatterOverview[]): MatterOverview[]`; `dueLabel(fm, now?): { text: string; hot: boolean }`; `withAttachments(text: string, paths: string[]): string`; `STARTERS: readonly string[]`; `starterFill(label: string): string`; `defaultProviderId(health: Health): string`; `HomePage({ threads, health, onAsk, onOpenThread })`; Shell `startAsk(message: string)`; Chat prop `initialAsk?: { text: string; nonce: number }` (sends once, on the default provider). Docket rows navigate to `#/chat?thread=<id>&proposal=<pid>` — **Task 5** consumes the `proposal` param (`proposalFromHash`, defined in T2) to anchor-scroll; setting it here is inert until then, which is fine.
- CSS classes Task 6 relies on: `.v2-home .v2-hi .v2-sub .v2-ask .v2-ask-chip .v2-ask-go .v2-docket .v2-docket-head .v2-docket-row .v2-docket-what .v2-docket-path .v2-docket-go .v2-starters .v2-home-cols .v2-home-card .v2-matter .v2-due .v2-due-hot .v2-na .v2-convo .v2-getting-started`.

- [ ] **Step 1: Write and pass the pure home helpers**

`runtime/ui/src/v2/home/home.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { MatterOverview } from '../../api/types';
import {
  dueLabel,
  greetingFor,
  nextActionOf,
  parseDeadline,
  sortMatters,
  starterFill,
  STARTERS,
  sublineFor,
  withAttachments,
} from './home';

const NOW = new Date('2026-08-30T14:00:00');

function matter(path: string, fm: Record<string, string>, mtimeMs: number): MatterOverview {
  return { path, title: path, frontmatter: fm, mtimeMs };
}

describe('greetingFor', () => {
  test('time of day, as set text', () => {
    expect(greetingFor(new Date('2026-08-30T09:00:00'))).toBe('Good morning.');
    expect(greetingFor(new Date('2026-08-30T14:00:00'))).toBe('Good afternoon.');
    expect(greetingFor(new Date('2026-08-30T20:00:00'))).toBe('Good evening.');
  });
});

describe('sublineFor', () => {
  test('honest counts, omitting what is zero; nothing to say is null', () => {
    expect(sublineFor({ nextActions: 3, pending: 1 })).toBe(
      'Three matters have open next-actions, and one proposal is waiting on you below.',
    );
    expect(sublineFor({ nextActions: 1, pending: 0 })).toBe('One matter has open next-actions.');
    expect(sublineFor({ nextActions: 0, pending: 2 })).toBe('Two proposals are waiting on you below.');
    expect(sublineFor({ nextActions: 0, pending: 0 })).toBeNull();
  });
});

describe('deadlines and next actions', () => {
  test('parseDeadline reads deadline or due; garbage is null', () => {
    expect(parseDeadline({ deadline: '2026-09-12' })?.getUTCDate()).toBe(12);
    expect(parseDeadline({ due: '2026-10-01' })).not.toBeNull();
    expect(parseDeadline({ deadline: 'soonish' })).toBeNull();
    expect(parseDeadline({})).toBeNull();
  });

  test('nextActionOf tries the frontmatter spellings', () => {
    expect(nextActionOf({ next_action: 'send document list' })).toBe('send document list');
    expect(nextActionOf({ nextAction: 'draft cover email' })).toBe('draft cover email');
    expect(nextActionOf({})).toBeNull();
  });

  test('dueLabel: date text, hot inside 14 days, quiet otherwise', () => {
    expect(dueLabel({ deadline: '2026-09-12' }, NOW)).toEqual({ text: 'due Sep 12', hot: true });
    expect(dueLabel({ deadline: '2026-10-01' }, NOW)).toEqual({ text: 'due Oct 1', hot: false });
    expect(dueLabel({}, NOW)).toEqual({ text: 'no deadline', hot: false });
  });

  test('sortMatters: deadline first (soonest up), then recency', () => {
    const sorted = sortMatters([
      matter('c.md', {}, 300),
      matter('a.md', { deadline: '2026-10-01' }, 100),
      matter('b.md', { deadline: '2026-09-12' }, 200),
      matter('d.md', {}, 400),
    ]);
    expect(sorted.map(m => m.path)).toEqual(['b.md', 'a.md', 'd.md', 'c.md']);
  });
});

describe('the ask box', () => {
  test('withAttachments folds path chips into the message', () => {
    expect(withAttachments('Review this.', ['matters/acme.md'])).toBe('Review this.\n\n`matters/acme.md`');
    expect(withAttachments('Review this. ', [])).toBe('Review this.');
  });

  test('starters are prompt-fills — text for the box, never a send', () => {
    expect(STARTERS).toEqual(['Review a contract', "What's our position on…", 'Draft a response', 'What changed this week?']);
    expect(starterFill('Review a contract')).toBe('Review this contract: ');
    expect(starterFill("What's our position on…")).toBe("What's our position on ");
    expect(starterFill('Draft a response')).toBe('Draft a response to ');
    expect(starterFill('What changed this week?')).toBe('What changed in the vault this week?');
  });
});
```

`runtime/ui/src/v2/home/home.ts`:

```ts
import type { MatterOverview } from '../../api/types';

/** Serif greeting by time of day (spec §3.2). */
export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const;

function countWord(n: number): string {
  return n < WORDS.length ? WORDS[n]! : String(n);
}

/**
 * The italic subline (spec §3.2): counts from real data, omitting what is
 * zero — never an invented "all quiet". `null` means say nothing.
 */
export function sublineFor(counts: { nextActions: number; pending: number }): string | null {
  const parts: string[] = [];
  if (counts.nextActions > 0) {
    parts.push(
      `${countWord(counts.nextActions)} matter${counts.nextActions === 1 ? ' has' : 's have'} open next-actions`,
    );
  }
  if (counts.pending > 0) {
    parts.push(
      counts.pending === 1
        ? 'one proposal is waiting on you below'
        : `${countWord(counts.pending)} proposals are waiting on you below`,
    );
  }
  if (parts.length === 0) return null;
  const joined = parts.join(', and ');
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

/** Deadlines come only from frontmatter the plugin conventions already
 * define (spec §4) — absent or unparseable fields simply don't render. */
export function parseDeadline(fm: Record<string, string>): Date | null {
  const raw = fm['deadline'] ?? fm['due'];
  if (raw === undefined) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

export function nextActionOf(fm: Record<string, string>): string | null {
  return fm['next_action'] ?? fm['nextAction'] ?? null;
}

/** Open matters sorted by deadline then recency (spec §3.2). */
export function sortMatters(matters: MatterOverview[]): MatterOverview[] {
  return [...matters].sort((a, b) => {
    const da = parseDeadline(a.frontmatter)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDeadline(b.frontmatter)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return b.mtimeMs - a.mtimeMs;
  });
}

export interface Due {
  text: string;
  /** Amber when the deadline is within 14 days (spec §3.2). */
  hot: boolean;
}

export function dueLabel(fm: Record<string, string>, now: Date = new Date()): Due {
  const deadline = parseDeadline(fm);
  if (deadline === null) return { text: 'no deadline', hot: false };
  const text = `due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  const days = (deadline.getTime() - now.getTime()) / 86_400_000;
  return { text, hot: days <= 14 };
}

/** `＋ attach from vault` inserts a path chip into the MESSAGE (spec §3.2):
 * the chips ride along as backticked paths on their own line. */
export function withAttachments(text: string, paths: string[]): string {
  const trimmed = text.trim();
  if (paths.length === 0) return trimmed;
  return `${trimmed}\n\n${paths.map(p => `\`${p}\``).join(' ')}`;
}

/** Prompt-fills only — they put words in the box and nothing else (founder
 * rule: starters are never flows). */
export const STARTERS: readonly string[] = [
  'Review a contract',
  "What's our position on…",
  'Draft a response',
  'What changed this week?',
];

export function starterFill(label: string): string {
  if (label === 'Review a contract') return 'Review this contract: ';
  if (label === "What's our position on…") return "What's our position on ";
  if (label === 'Draft a response') return 'Draft a response to ';
  return 'What changed in the vault this week?';
}
```

Run: `cd runtime/ui && bun test src/v2/home/home.test.ts`
Expected: PASS.

- [ ] **Step 2: `defaultProviderId`**

Append to `runtime/ui/src/v2/threads.test.ts`:

```ts
describe('defaultProviderId', () => {
  const provider = (id: string) => ({
    id,
    kind: 'direct' as const,
    auth: 'local' as const,
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 8192, auth: 'local' as const },
  });

  test('the loaded default, else the first loaded provider, else empty', () => {
    const base = { vault: '/v', tenant: 'default', stepTimeoutMs: 1 };
    expect(defaultProviderId({ ...base, providers: [provider('a'), provider('b')], default: 'b' })).toBe('b');
    expect(defaultProviderId({ ...base, providers: [provider('a')], default: 'ghost' })).toBe('a');
    expect(defaultProviderId({ ...base, providers: [], default: null })).toBe('');
  });
});
```

(add `defaultProviderId` to the import from `./threads`, and `import type { Health } from '../api/types';` is not needed — the literals above satisfy the type structurally.)

Append to `runtime/ui/src/v2/threads.ts`:

```ts
import type { Health } from '../api/types';

/** The provider a send with no picker uses (spec §3.3: the model picker
 * moved to the rail footer; the composer just sends). The same fallback the
 * old Composer had: the saved default only when it is actually loaded. */
export function defaultProviderId(health: Health): string {
  if (health.default !== null && health.providers.some(p => p.id === health.default)) return health.default;
  return health.providers[0]?.id ?? '';
}
```

Run: `cd runtime/ui && bun test src/v2/threads.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing HomePage tests**

`runtime/ui/src/v2/home/HomePage.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { Health, PendingProposal, ThreadHeader, VaultOverview } from '../../api/types';
import { HomePage } from './HomePage';

const realFetch = globalThis.fetch;

const health: Health = { vault: '/tmp/vault', tenant: 'default', providers: [], default: 'fake/fake', stepTimeoutMs: 1 };

const threads: ThreadHeader[] = [
  { id: 't-1', title: 'NDA residuals fallback', createdAt: '2026-08-30T08:00:00.000Z', updatedAt: '2026-08-30T08:00:00.000Z', sessions: {} },
];

const overview: VaultOverview = {
  matters: [
    {
      path: 'matters/2026-06-vendora.md',
      title: 'Vendora × Worldpay — documentation',
      frontmatter: { deadline: '2026-09-12', next_action: 'send document list' },
      mtimeMs: Date.now() - 2 * 3_600_000,
    },
  ],
  groups: { practice: 1, knowledge: 0, other: 0 },
};

let pending: PendingProposal[] = [];
let overviewBody: VaultOverview = overview;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  pending = [];
  overviewBody = overview;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  history.replaceState(null, '', '/#/');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/overview')) return json(overviewBody);
    if (url.startsWith('/proposals')) return json(pending);
    if (url.startsWith('/vault/list')) return json([]);
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

function mount(over: Partial<Parameters<typeof HomePage>[0]> = {}) {
  return render(<HomePage threads={threads} health={health} onAsk={() => {}} onOpenThread={() => {}} {...over} />);
}

describe('HomePage', () => {
  test('greeting, honest subline, matters with leaders and next-actions, conversations', async () => {
    mount();
    expect(document.querySelector('.v2-hi')?.textContent).toMatch(/^Good (morning|afternoon|evening)\.$/);
    await waitFor(() => expect(screen.getByText('Vendora × Worldpay — documentation')).toBeTruthy());
    expect(document.querySelector('.v2-sub')?.textContent).toBe('One matter has open next-actions.');
    expect(screen.getByText('due Sep 12')).toBeTruthy();
    expect(screen.getByText('send document list')).toBeTruthy();
    expect(screen.getByText(/touched 2h ago/)).toBeTruthy();
    expect(screen.getByText('NDA residuals fallback')).toBeTruthy();
    // The docket is HIDDEN entirely when nothing is pending (spec §3.2).
    expect(document.querySelector('.v2-docket')).toBeNull();
  });

  test('the docket lists pending proposals and Review navigates, anchored', async () => {
    pending = [
      {
        threadId: 't-1',
        threadTitle: 'NDA residuals fallback',
        id: 'p-1',
        path: 'practice/standards/nda.md',
        rationale: 'Record the narrow residuals carve-out as your NDA fallback',
        at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      },
    ];
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-head')?.textContent).toContain('1 awaiting your decision');
    expect(screen.getByText('Record the narrow residuals carve-out as your NDA fallback')).toBeTruthy();
    expect(document.querySelector('.v2-docket-path')?.textContent).toContain('practice/standards/nda.md');
    expect(document.querySelector('.v2-docket-path')?.textContent).toContain('“NDA residuals fallback”');

    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(location.hash).toBe('#/chat?thread=t-1&proposal=p-1');
  });

  test('Ask hands the message (with attachments) over and clears nothing else', async () => {
    const asked: string[] = [];
    mount({ onAsk: message => asked.push(message) });
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Ask counsel' })).toBeTruthy());
    await userEvent.type(screen.getByRole('textbox', { name: 'Ask counsel' }), 'Review the Acme NDA.');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(asked).toEqual(['Review the Acme NDA.']);
  });

  test('a starter fills the box and sends nothing', async () => {
    const asked: string[] = [];
    mount({ onAsk: message => asked.push(message) });
    await userEvent.click(screen.getByRole('button', { name: 'Review a contract' }));
    expect((screen.getByRole('textbox', { name: 'Ask counsel' }) as HTMLTextAreaElement).value).toBe('Review this contract: ');
    expect(asked).toEqual([]);
  });

  test('attach from vault inserts a path chip that rides with the message', async () => {
    const asked: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/vault/overview')) return json(overviewBody);
      if (url.startsWith('/proposals')) return json([]);
      if (url === '/vault/list') return json([{ path: 'matters', kind: 'dir' }]);
      if (url.startsWith('/vault/list?dir=matters')) return json([{ path: 'matters/acme.md', kind: 'file' }]);
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
    mount({ onAsk: message => asked.push(message) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Ask counsel' }), 'Review this.');

    await userEvent.click(screen.getByRole('button', { name: '＋ attach from vault' }));
    await userEvent.click(await screen.findByText('matters'));
    await userEvent.click(await screen.findByText('acme.md'));
    expect(screen.getByText('matters/acme.md')).toBeTruthy(); // the chip

    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(asked).toEqual(['Review this.\n\n`matters/acme.md`']);
  });

  test('an empty vault gets the quiet getting-started block in place of the grid', async () => {
    overviewBody = { matters: [], groups: { practice: 0, knowledge: 0, other: 0 } };
    mount({ threads: [] });
    await waitFor(() => expect(document.querySelector('.v2-getting-started')).toBeTruthy());
    expect(document.querySelector('.v2-home-cols')).toBeNull();
    expect(screen.getByRole('link', { name: /docs/ })).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/home/HomePage.test.tsx`
Expected: FAIL — `Cannot find module './HomePage'`.

- [ ] **Step 5: Implement `runtime/ui/src/v2/home/HomePage.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { Health, PendingProposal, ThreadHeader, VaultOverview } from '../../api/types';
import { Tree } from '../../vault/Tree';
import { railLabel } from '../Rail';
import { relTime } from '../time';
import { dueLabel, greetingFor, nextActionOf, sortMatters, starterFill, STARTERS, sublineFor, withAttachments } from './home';

export interface HomePageProps {
  /** The shell's thread list — home does not refetch what the rail has. */
  threads: ThreadHeader[];
  health: Health | null;
  /** The ask box: hand the message to the shell, which opens a draft chat
   * and sends it (the thread's title comes from the first line, as every
   * send's does). */
  onAsk: (message: string) => void;
  onOpenThread: (id: string) => void;
}

/**
 * Home (spec §3.2): the work itself behind one ask box. Serif greeting, an
 * honest subline, the docket (hidden entirely when empty), starter
 * prompt-fills, matters by deadline-then-recency, conversations. Data:
 * `/vault/overview` + `/proposals?status=pending`, fetched on mount —
 * navigating here re-mounts the page, so the docket is always current.
 */
export function HomePage({ threads, health, onAsk, onOpenThread }: HomePageProps): JSX.Element {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [pending, setPending] = useState<PendingProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const box = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, docket] = await Promise.all([
          fetchJson<VaultOverview>('/vault/overview'),
          fetchJson<PendingProposal[]>('/proposals?status=pending'),
        ]);
        setOverview(ov);
        setPending(docket);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const matters = overview === null ? [] : sortMatters(overview.matters);
  const nextActions = matters.filter(m => nextActionOf(m.frontmatter) !== null).length;
  const subline = sublineFor({ nextActions, pending: pending.length });

  const ask = (): void => {
    const message = withAttachments(text, attached);
    if (message === '') return;
    onAsk(message);
    setText('');
    setAttached([]);
    setPicking(false);
  };

  return (
    <main className="v2-page v2-home" aria-label="Home">
      <div className="v2-home-wrap">
        <div className="v2-hi">{greetingFor()}</div>
        {subline === null ? null : <div className="v2-sub">{subline}</div>}

        {error === null ? null : (
          <p className="v2-notice v2-notice-error" role="alert">
            {error}
          </p>
        )}

        <div className="v2-ask">
          <textarea
            ref={box}
            aria-label="Ask counsel"
            rows={2}
            placeholder="Ask counsel — review a contract, research a position, draft a response…"
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                ask();
              }
            }}
          />
          <div className="v2-ask-row">
            <button type="button" className="v2-ask-chip" aria-expanded={picking} onClick={() => setPicking(p => !p)}>
              ＋ attach from vault
            </button>
            {attached.map(path => (
              <span key={path} className="v2-ask-chip v2-ask-attached">
                {path}
              </span>
            ))}
            <button type="button" className="v2-ask-go" onClick={ask} disabled={withAttachments(text, attached) === ''}>
              Ask
            </button>
          </div>
          {picking ? (
            <div className="v2-ask-picker">
              <Tree
                selected={null}
                onSelect={path => {
                  setAttached(current => (current.includes(path) ? current : [...current, path]));
                  setPicking(false);
                }}
              />
            </div>
          ) : null}
        </div>

        {pending.length === 0 ? null : (
          <section className="v2-docket" aria-label="Docket">
            <div className="v2-docket-head runin">
              Docket · <em>{pending.length} awaiting your decision</em>
            </div>
            {pending.map(proposal => (
              <div className="v2-docket-row" key={proposal.id}>
                <div>
                  <div className="v2-docket-what">{proposal.rationale.split('\n')[0]}</div>
                  <div className="v2-docket-path">
                    {proposal.path} · proposed {relTime(proposal.at)} in “{proposal.threadTitle}”
                  </div>
                </div>
                <button
                  type="button"
                  className="v2-docket-go"
                  onClick={() => {
                    globalThis.location.hash = `#/chat?thread=${encodeURIComponent(proposal.threadId)}&proposal=${encodeURIComponent(proposal.id)}`;
                  }}
                >
                  Review
                </button>
              </div>
            ))}
          </section>
        )}

        <div className="v2-starters">
          {STARTERS.map(label => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setText(starterFill(label));
                box.current?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {overview !== null && matters.length === 0 ? (
          <div className="v2-getting-started rule-double">
            <p>Your vault has no matters yet — counsel files what it learns as you work.</p>
            <p>Ask a question above, or attach a contract from the vault to review.</p>
            <p>
              <a href="https://github.com/eigenlegal/counsel-os#readme">Getting-started docs →</a>
            </p>
          </div>
        ) : (
          <div className="v2-home-cols">
            <section className="v2-home-card" aria-label="Matters">
              <h3 className="runin">
                Matters
                <a href="#/vault">open vault →</a>
              </h3>
              {matters.map(matter => {
                const due = dueLabel(matter.frontmatter);
                const next = nextActionOf(matter.frontmatter);
                return (
                  <div className="v2-matter" key={matter.path}>
                    <div className="v2-matter-top">
                      <a className="v2-matter-name" href={`#/vault?path=${encodeURIComponent(matter.path)}`}>
                        {matter.title}
                      </a>
                      <span className="leader" aria-hidden="true" />
                      <span className={due.hot ? 'v2-due v2-due-hot' : 'v2-due'}>{due.text}</span>
                    </div>
                    <div className="v2-na">
                      {next === null ? null : (
                        <>
                          next: <b>{next}</b> ·{' '}
                        </>
                      )}
                      touched {relTime(matter.mtimeMs)}
                    </div>
                  </div>
                );
              })}
            </section>
            <section className="v2-home-card" aria-label="Conversations">
              <h3 className="runin">Conversations</h3>
              {threads.length === 0 ? (
                <p className="muted">No conversations yet.</p>
              ) : (
                threads.map(thread => (
                  <button type="button" className="v2-convo" key={thread.id} onClick={() => onOpenThread(thread.id)}>
                    <span className="v2-convo-title">{railLabel(thread)}</span>
                    <span className="leader" aria-hidden="true" />
                    <span className="v2-convo-when">{relTime(thread.updatedAt)}</span>
                  </button>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
```

Run: `cd runtime/ui && bun test src/v2/home/HomePage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the shell and the auto-send**

**(a)** `runtime/ui/src/v2/Shell.tsx`: import `HomePage`; add ask state beside `seed`:

```tsx
  const [initialAsk, setInitialAsk] = useState<{ text: string; nonce: number } | undefined>(undefined);

  /** The home ask box: open a fresh draft chat and send the message. The
   * draft path already creates the thread on send, titled from the first
   * line — home adds nothing the composer's own send does not do. */
  const startAsk = useCallback((message: string): void => {
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
    setInitialAsk(current => ({ text: message, nonce: (current?.nonce ?? 0) + 1 }));
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
  }, []);
```

Replace the Task-2 home stub with:

```tsx
        {route === 'home' ? (
          <HomePage threads={threads} health={health} onAsk={startAsk} onOpenThread={openThread} />
        ) : null}
```

and pass `initialAsk={initialAsk}` to `<Chat …/>`.

**(b)** `runtime/ui/src/v2/chat/Chat.tsx`: add to `ChatProps`:

```tsx
  /** A message to send as soon as this pane mounts — the home ask box. The
   * nonce marks it consumed so a re-render cannot double-send. */
  initialAsk?: { text: string; nonce: number };
```

and inside the component, after the `load` effect, with `defaultProviderId` imported from `../threads`:

```tsx
  const askedNonce = useRef(0);
  useEffect(() => {
    if (initialAsk === undefined || initialAsk.nonce === askedNonce.current) return;
    askedNonce.current = initialAsk.nonce;
    void send(initialAsk.text, defaultProviderId(health));
    // `send` is stable enough here: the nonce guard means this body runs
    // once per ask, whatever identity `send` has on later renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAsk]);
```

**(c)** In `runtime/ui/src/v2/Shell.test.tsx`, replace the home-stub assertion in the `#/ is Home` test — `screen.getByText('Home lands in Task 4.')` is gone; the test's existing `.v2-home` waitFor already matches the real page (its fetch mock must add `/vault/overview` → `json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } })` and `/proposals` → `json([])` — add those two lines to `install()`).

**(d)** Append one test to `runtime/ui/src/v2/chat/Chat.test.tsx` (using that file's existing fetch-mock helpers; it already mocks `POST /threads` and `/steps`):

```tsx
  test('initialAsk sends once, on the default provider, creating the thread', async () => {
    // Reuse the suite's draft-mode fetch mock (create → stream done).
    render(<Chat threadId={null} health={health} initialAsk={{ text: 'Review the Acme NDA.', nonce: 1 }} />);
    await waitFor(() => expect(calls.some(c => c.url === '/threads' && c.method === 'POST')).toBe(true));
    const step = calls.find(c => c.url.endsWith('/steps'))!;
    expect((step.body as { message: string; provider: string }).message).toBe('Review the Acme NDA.');
    expect((step.body as { provider: string }).provider).toBe('fake/fake');
  });
```

(adapt the `calls` bookkeeping to the file's existing pattern — it already records fetches; if it records only URLs, extend the recorder with `method` and parsed `body` the way `ProposalCard.test.tsx` does.)

- [ ] **Step 7: The home CSS**

Append to `runtime/ui/src/styles.css` (mock-home.html, tokens swapped):

```css
/* ── Home (mock-home.html) ───────────────────────────────────────────── */

.v2-home { flex: 1; overflow-y: auto; }
.v2-home-wrap { max-width: 920px; margin: 0 auto; padding: 52px 40px 60px; }
.v2-hi { font: 400 30px/1.3 var(--serif); margin-bottom: 6px; }
.v2-sub { color: var(--fg-muted); margin-bottom: 26px; font: italic 15px/1.5 var(--serif); }

.v2-ask { background: var(--bg-raised); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: 16px 18px 12px; box-shadow: var(--shadow); }
.v2-ask textarea { width: 100%; background: none; border: none; color: var(--fg); font: 16px/1.5 var(--sans); resize: none; outline: none; padding: 0; }
.v2-ask textarea::placeholder { color: var(--fg-faint); }
.v2-ask-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.v2-ask-chip { font-size: 12px; color: var(--fg-muted); border: 1px solid var(--border-strong); border-radius: 999px; padding: 3px 10px; background: var(--bg); }
.v2-ask-attached { font-family: var(--mono); }
.v2-ask-go { margin-left: auto; background: var(--accent); color: var(--accent-ink); border: none; border-radius: 9px; padding: 7px 16px; font-weight: 600; font-size: 13.5px; }
.v2-ask-picker { margin-top: 10px; max-height: 16rem; overflow-y: auto; border-top: 1px solid var(--border); }
.v2-ask-picker .vault-tree { border-right: none; background: transparent; }

/* The docket — a ruled entry, not a box (mock .queue). */
.v2-docket { border-top: 3px double var(--border-strong); border-bottom: 1px solid var(--border); margin-top: 22px; margin-bottom: 4px; padding: 12px 2px 14px; }
.v2-docket-head { margin-bottom: 8px; }
.v2-docket-row { display: flex; align-items: baseline; gap: 12px; padding: 4px 0; }
.v2-docket-what { font: 17px/1.4 var(--serif); color: var(--fg); }
.v2-docket-path { font: 12px var(--mono); color: var(--fg-faint); margin-top: 3px; }
.v2-docket-go { margin-left: auto; background: none; border: none; color: var(--accent); font: 600 13px var(--sans); flex-shrink: 0; cursor: pointer; }
.v2-docket-go::after { content: " →"; }

.v2-starters { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 26px; }
.v2-starters button { background: none; border: 1px solid var(--border); color: var(--fg-muted); border-radius: 999px; padding: 6px 13px; font-size: 12.5px; cursor: pointer; }

.v2-home-cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 36px; }
.v2-home-card h3 { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-strong); padding-bottom: 8px; margin: 0 0 4px; }
.v2-home-card h3 a { color: var(--fg-faint); font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 12px; text-decoration: none; }

.v2-matter { padding: 10px 0; border-top: 1px solid var(--border); }
.v2-matter:first-of-type { border-top: none; }
.v2-matter-top { display: flex; align-items: baseline; gap: 12px; }
.v2-matter-name { font: 500 15px/1.35 var(--serif); color: var(--fg); text-decoration: none; min-width: 0; }
.v2-due { font-size: 12px; color: var(--fg-faint); flex-shrink: 0; }
.v2-due-hot { color: var(--amber); font-weight: 600; }
.v2-na { font-size: 12px; color: var(--fg-muted); margin-top: 2px; }
.v2-na b { font-weight: 600; }

.v2-convo { display: flex; width: 100%; align-items: baseline; gap: 10px; padding: 8px 0; border: none; border-top: 1px solid var(--border); background: none; font-size: 13.5px; text-align: left; }
.v2-convo:first-of-type { border-top: none; }
.v2-convo-title { color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v2-convo-when { color: var(--fg-faint); font-size: 12px; flex-shrink: 0; }

.v2-getting-started { padding: 16px 2px; color: var(--fg-muted); font: 15px/1.6 var(--serif); }
```

- [ ] **Step 8: Run the whole UI suite; typecheck; build**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean and green — home suites new, Shell + Chat updated, everything else untouched.

- [ ] **Step 9: Look at it once**

Same server recipe (port 7496, the seeded vendora matter from Task 3 Step 11). Expected on `#/`: greeting, subline ("One matter has open next-actions."), ask box, starters filling the box, the matters column with `⋯ due Sep 12` leaders and `next: send document list · touched …`, conversations column; asking creates a thread and lands in it.

- [ ] **Step 10: Commit**

```bash
git add runtime/ui/src/v2/home runtime/ui/src/v2/threads.ts runtime/ui/src/v2/threads.test.ts \
  runtime/ui/src/v2/Shell.tsx runtime/ui/src/v2/Shell.test.tsx \
  runtime/ui/src/v2/chat/Chat.tsx runtime/ui/src/v2/chat/Chat.test.tsx runtime/ui/src/styles.css
git commit -m "ui: home — ask box, docket, starters, matters and conversations"
```

---

### Task 5: Chat — work line, source chips, tracked-changes proposal slips, strip, composer

**Files:**
- Create: `runtime/ui/src/v2/redline.ts`, `redline.test.ts`, `runtime/ui/src/v2/chat/cite.ts`, `cite.test.ts`, `runtime/ui/src/v2/chat/WorkLine.tsx`, `WorkLine.test.tsx`
- Modify: `runtime/ui/src/v2/verbs.ts` (`workLineOf`), `verbs.test.ts` (one describe)
- Modify: `runtime/ui/src/vault/sanitize.ts` (fragment-only hrefs), `sanitize.test.tsx` (one describe)
- Rewrite: `runtime/ui/src/v2/chat/ProposalCard.tsx`, `ProposalCard.test.tsx`
- Modify: `runtime/ui/src/v2/chat/Turn.tsx`, `Turn.test.tsx`; `Strip.tsx`, `Strip.test.tsx`; `Composer.tsx`, `Composer.test.tsx`; `Chat.tsx`, `Chat.test.tsx`
- Modify: `runtime/ui/src/styles.css` (chat CSS)

**Interfaces:**
- Consumes: `diffWords`/`diffLines` from `diff@^8.0.4` (installed); `unifiedHunks` (`v2/diff.ts`, unchanged — the line view); `proposalFromHash` (T2); `relTime` (T2); `defaultProviderId` (T4); `prettifyName` (T3 `v2/vault/frontmatter.ts`); `ComposerSeed` (T3); `Steps` (unchanged, now the work line's expanded detail).
- Produces: shared-table rows T5. The composer's `onSend` narrows to `(message: string) => void` — Chat picks the provider (`defaultProviderId(health)`); the model picker is GONE from the composer (it lives in the rail footer, T2). `ProposalCard` keeps `.v2-proposal` and `data-testid="proposal-<id>"`, adds `id="proposal-<id>"` (the docket anchor); its status is set text (`.v2-status-*`), never a pill. `Strip` keeps `.v2-strip` + `data-testid="run-<runId>"`; its summary becomes `DONE · 3 sources · 1 proposal pending · details ⌄`.
- CSS classes Task 6 relies on: `.v2-thread-head .v2-matter-chip .v2-work-line .v2-file-chip .v2-redline .v2-redline-block .v2-redline-toggle .v2-slip-head .v2-slip-why .v2-slip-acts .v2-slip-base` (plus the kept `.v2-proposal .v2-strip`).

- [ ] **Step 1: Write and pass the redline helpers**

`runtime/ui/src/v2/redline.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { redlineBlocks, wordDiff } from './redline';

describe('wordDiff', () => {
  test('a one-word change is one del and one ins in the document order', () => {
    const spans = wordDiff('Term: 2 years\n', 'Term: 3 years\n');
    expect(spans.filter(s => s.kind === 'del').map(s => s.text.trim())).toEqual(['2']);
    expect(spans.filter(s => s.kind === 'ins').map(s => s.text.trim())).toEqual(['3']);
    // Round trip: same + dels reconstruct the before, same + ins the after.
    expect(spans.filter(s => s.kind !== 'ins').map(s => s.text).join('')).toBe('Term: 2 years\n');
    expect(spans.filter(s => s.kind !== 'del').map(s => s.text).join('')).toBe('Term: 3 years\n');
  });

  test('an addition against an empty before is all ins', () => {
    const spans = wordDiff('', '# NDA\nTerm: 3 years\n');
    expect(spans.every(s => s.kind === 'ins')).toBe(true);
  });
});

describe('redlineBlocks', () => {
  const before = 'Alpha stays.\n\nResiduals: not offered.\n\nOmega stays.\n';
  const after = 'Alpha stays.\n\nResiduals: not offered; fallback = narrow carve-out.\n\nOmega stays.\n';

  test('paragraph blocks, with only the touched one marked changed', () => {
    const blocks = redlineBlocks(wordDiff(before, after));
    expect(blocks.length).toBe(3);
    expect(blocks.map(b => b.changed)).toEqual([false, true, false]);
    expect(blocks[0]!.spans.map(s => s.text).join('')).toBe('Alpha stays.');
    expect(blocks[1]!.spans.some(s => s.kind === 'ins')).toBe(true);
  });

  test('a document that is one paragraph is one block', () => {
    const blocks = redlineBlocks(wordDiff('one line\n', 'one changed line\n'));
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.changed).toBe(true);
  });
});
```

`runtime/ui/src/v2/redline.ts`:

```ts
/**
 * The tracked-changes redline (redesign spec §3.3, founder amendment 2):
 * `diffWords(current, proposed)` as data the card renders with REACT TEXT
 * NODES — `<del>`/`<ins>` elements, never innerHTML. The sanitizer
 * (`vault/sanitize.ts`) stays the app's only HTML sink; a redline never
 * goes near it.
 */
import { diffWords } from 'diff';

export interface WordSpan {
  kind: 'same' | 'ins' | 'del';
  text: string;
}

export function wordDiff(before: string, after: string): WordSpan[] {
  return diffWords(before, after).map(change => ({
    kind: change.added ? ('ins' as const) : change.removed ? ('del' as const) : ('same' as const),
    text: change.value,
  }));
}

export interface RedlineBlock {
  spans: WordSpan[];
  /** True when the block holds any ins/del — the "changed blocks only" view
   * (spec §3.3) renders exactly these. */
  changed: boolean;
}

/**
 * The span stream cut into paragraph blocks at the blank lines of UNCHANGED
 * text. Blank lines inside an ins/del belong to the change and stay in the
 * block — cutting there would split one edit across two blocks and lie
 * about its shape.
 */
export function redlineBlocks(spans: WordSpan[]): RedlineBlock[] {
  const blocks: RedlineBlock[] = [];
  let current: WordSpan[] = [];
  const flush = (): void => {
    if (current.length === 0) return;
    blocks.push({ spans: current, changed: current.some(s => s.kind !== 'same') });
    current = [];
  };
  for (const span of spans) {
    if (span.kind !== 'same' || !/\n\s*\n/.test(span.text)) {
      current.push(span);
      continue;
    }
    const parts = span.text.split(/\n\s*\n/);
    parts.forEach((part, i) => {
      const text = i === 0 ? part.replace(/\n$/, '') : part.replace(/^\n/, '').replace(/\n$/, '');
      if (text !== '') current.push({ kind: 'same', text });
      if (i < parts.length - 1) flush();
    });
  }
  flush();
  return blocks;
}
```

Run: `cd runtime/ui && bun test src/v2/redline.test.ts`
Expected: PASS.

- [ ] **Step 2: Write and pass the citation helpers**

`runtime/ui/src/v2/chat/cite.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { linkCitations, readPathsOf } from './cite';

function read(path: string): ToolCallView {
  return { id: `r-${path}`, name: 'vault_read', input: { path }, hasResult: true };
}

describe('readPathsOf', () => {
  test('unique vault_read paths, in first-read order; other tools ignored', () => {
    const tools: ToolCallView[] = [
      { id: 's', name: 'vault_search', input: { query: 'x' }, hasResult: true },
      read('practice/standards/nda.md'),
      read('matters/acme-nda.md'),
      read('practice/standards/nda.md'),
    ];
    expect(readPathsOf(tools)).toEqual(['practice/standards/nda.md', 'matters/acme-nda.md']);
  });
});

describe('linkCitations', () => {
  const paths = ['practice/standards/nda.md', 'memory/decisions.md'];

  test('backticked mentions of read files become vault links, by basename or full path', () => {
    const out = linkCitations('Your standard still says so `nda.md`, per `memory/decisions.md`.', paths);
    expect(out).toContain('[`nda.md`](#/vault?path=practice%2Fstandards%2Fnda.md)');
    expect(out).toContain('[`memory/decisions.md`](#/vault?path=memory%2Fdecisions.md)');
  });

  test('bare prose words and files the step never read are left alone', () => {
    expect(linkCitations('the nda.md file, unquoted', paths)).toBe('the nda.md file, unquoted');
    expect(linkCitations('see `other.md`', paths)).toBe('see `other.md`');
  });

  test('an already-linked mention is not double-wrapped', () => {
    const once = linkCitations('see `nda.md`', paths);
    expect(linkCitations(once, paths)).toBe(once);
  });
});
```

`runtime/ui/src/v2/chat/cite.ts`:

```ts
/**
 * Source chips (spec §3.3): derived — the files the step ACTUALLY read,
 * rendered when the model's text names them. No prompt change: this is a
 * transform on the markdown SOURCE (backticked mentions become markdown
 * links into the vault), so the output still flows through `renderMarkdown`
 * and its sanitizer like every other character of the answer.
 */
import type { ToolCallView } from '../../chat/turns';

export function readPathsOf(tools: ToolCallView[]): string[] {
  const out: string[] = [];
  for (const tool of tools) {
    if (tool.name !== 'vault_read') continue;
    const input = tool.input;
    if (typeof input !== 'object' || input === null) continue;
    const path = (input as Record<string, unknown>)['path'];
    if (typeof path === 'string' && path !== '' && !out.includes(path)) out.push(path);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function linkCitations(source: string, readPaths: string[]): string {
  let out = source;
  for (const path of readPaths) {
    const base = path.slice(path.lastIndexOf('/') + 1);
    const href = `#/vault?path=${encodeURIComponent(path)}`;
    for (const name of new Set([path, base])) {
      // Only backticked spellings; the lookaround keeps an existing markdown
      // link from being wrapped twice.
      const mention = new RegExp(`(?<!\\[)\`${escapeRegExp(name)}\`(?!\\]\\()`, 'g');
      out = out.replace(mention, `[\`${name}\`](${href})`);
    }
  }
  return out;
}
```

Run: `cd runtime/ui && bun test src/v2/chat/cite.test.ts`
Expected: PASS.

- [ ] **Step 3: Let the sanitizer keep fragment links (and test it)**

The citation links are `#/vault?path=…` — `safeHref` currently drops anything without an `https?:`/`mailto:` scheme, and `cleanAttributes` forces `target="_blank"` onto every kept link, which would open our own page in a new tab. Append to `runtime/ui/src/vault/sanitize.test.tsx` (import `safeHref` beside `sanitizeHtml` if it is not already):

```tsx
describe('fragment links (redesign source chips)', () => {
  test('a same-page #/vault link survives, without target=_blank', () => {
    const html = sanitizeHtml('<p><a href="#/vault?path=practice%2Fnda.md">nda.md</a></p>');
    const a = new DOMParser().parseFromString(html, 'text/html').querySelector('a')!;
    expect(a.getAttribute('href')).toBe('#/vault?path=practice%2Fnda.md');
    expect(a.getAttribute('target')).toBeNull();
  });

  test('scheme smuggling still dies; whitespace around a fragment is stripped', () => {
    expect(safeHref('javascript:alert(1)#/vault')).toBeNull();
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('#/vault?path=x')).toBe('#/vault?path=x');
    expect(safeHref('  #/vault')).toBe('#/vault');
  });
});
```

In `runtime/ui/src/vault/sanitize.ts`, replace `safeHref` with (the character class is the SAME one the current source uses — spelled with escapes):

```ts
export function safeHref(raw: string): string | null {
  const stripped = raw.replace(/[\u0000-\u0020\u007f]/g, '');
  // A same-page fragment has no scheme and no host: nothing to navigate to
  // but this page's own router. Checked on the STRIPPED string, so a
  // control-character-prefixed scheme cannot hide in front of it — and the
  // stripped string is what is returned, for the same reason.
  if (stripped.startsWith('#')) return stripped;
  return SAFE_SCHEME.test(stripped) ? raw.trim() : null;
}
```

and in `cleanAttributes`, replace the tail after the `safe === null` early-return with:

```ts
  el.setAttribute('href', safe);
  // A fragment link stays in THIS tab — it is this page's own router.
  if (safe.startsWith('#')) return;
  // A vault file opens in its own tab, and `noopener` keeps the opened page
  // from reaching back into this one through `window.opener`.
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener noreferrer');
```

Run: `cd runtime/ui && bun test src/vault/sanitize.test.tsx`
Expected: PASS — the whole existing suite plus the new describe.

- [ ] **Step 4: `workLineOf` + the WorkLine component**

Append to `runtime/ui/src/v2/verbs.test.ts` (the file's `tool()` helper already exists; add `workLineOf` to the import):

```ts
describe('workLineOf', () => {
  test('folds a turn into one line of parts', () => {
    const parts = workLineOf([
      tool('vault_search', { query: 'residuals' }),
      tool('vault_read', { path: 'practice/standards/nda.md' }),
      tool('vault_read', { path: 'matters/acme-nda.md' }),
      tool('vault_read', { path: 'practice/standards/nda.md' }),
      tool('propose_update', { path: 'practice/standards/nda.md', content: '' }),
      tool('web_fetch', { url: 'https://x' }),
    ]);
    expect(parts).toEqual({ searched: true, listed: false, read: ['nda.md', 'acme-nda.md'], proposed: 1, other: 1 });
  });

  test('nothing ran, nothing to say', () => {
    expect(workLineOf([])).toEqual({ searched: false, listed: false, read: [], proposed: 0, other: 0 });
  });
});
```

Append to `runtime/ui/src/v2/verbs.ts`:

```ts
export interface WorkLineParts {
  searched: boolean;
  listed: boolean;
  /** Unique basenames of the files read, in first-read order. */
  read: string[];
  proposed: number;
  other: number;
}

/** The one quiet work line (spec §3.3): "Searched the vault · read nda.md
 * acme-nda.md ⌄". Proposals are not "work" here — they get slips of their
 * own below the prose. */
export function workLineOf(tools: ToolCallView[]): WorkLineParts {
  const parts: WorkLineParts = { searched: false, listed: false, read: [], proposed: 0, other: 0 };
  for (const tool of tools) {
    if (tool.name === 'vault_search' || SEARCH_LIKE.test(tool.name)) parts.searched = true;
    else if (tool.name === 'vault_list') parts.listed = true;
    else if (tool.name === 'vault_read') {
      const path = pathOf(tool);
      if (path !== null) {
        const base = path.slice(path.lastIndexOf('/') + 1);
        if (!parts.read.includes(base)) parts.read.push(base);
      }
    } else if (tool.name === 'propose_update') parts.proposed += 1;
    else parts.other += 1;
  }
  return parts;
}
```

`runtime/ui/src/v2/chat/WorkLine.test.tsx`:

```tsx
import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { WorkLine } from './WorkLine';

function tool(name: string, input: unknown): ToolCallView {
  return { id: `${name}-${JSON.stringify(input)}`, name, input, hasResult: true, output: { ok: 1 } };
}

afterEach(cleanup);

describe('WorkLine', () => {
  test('one quiet line with filename chips; the chevron unfolds the full steps', async () => {
    const tools = [tool('vault_search', { query: 'residuals' }), tool('vault_read', { path: 'practice/standards/nda.md' })];
    render(<WorkLine tools={tools} ms={{}} />);
    const line = screen.getByRole('button', { name: /Searched the vault/ });
    expect(line.textContent).toContain('read');
    expect(document.querySelector('.v2-file-chip')?.textContent).toBe('nda.md');
    expect(document.querySelector('.v2-steps')).toBeNull();

    await userEvent.click(line);
    expect(document.querySelector('.v2-steps')).toBeTruthy();
    expect(screen.getByText('Searched')).toBeTruthy();
  });

  test('no tools, no line', () => {
    render(<WorkLine tools={[]} ms={{}} />);
    expect(document.querySelector('.v2-work-line')).toBeNull();
  });
});
```

`runtime/ui/src/v2/chat/WorkLine.tsx`:

```tsx
import { useState } from 'react';
import type { ToolCallView } from '../../chat/turns';
import { workLineOf } from '../verbs';
import { Steps } from './Steps';

export interface WorkLineProps {
  tools: ToolCallView[];
  ms: Record<string, number>;
  onOpenFile?: (path: string) => void;
}

/**
 * The turn's one quiet work line (spec §3.3): "Searched the vault · read
 * `nda.md` `acme-nda.md` ⌄" — filename chips, expandable to the full step
 * detail (the existing Steps timeline, show/hide and all).
 */
export function WorkLine({ tools, ms, onOpenFile }: WorkLineProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (tools.length === 0) return null;
  const parts = workLineOf(tools);
  const lead = [parts.searched ? 'Searched the vault' : null, parts.listed ? 'listed the vault' : null]
    .filter(part => part !== null)
    .join(' · ');
  return (
    <div className="v2-work-line-wrap">
      <button type="button" className="v2-work-line" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {lead}
        {lead !== '' && parts.read.length > 0 ? ' · ' : ''}
        {parts.read.length > 0 ? 'read ' : lead === '' ? 'worked ' : ''}
        {parts.read.map(base => (
          <span key={base} className="v2-file-chip">
            {base}
          </span>
        ))}
        {parts.other > 0 ? ` · ran ${parts.other} tool${parts.other === 1 ? '' : 's'}` : ''}
        <span className="v2-chev" aria-hidden="true">
          {' '}⌄
        </span>
      </button>
      {open ? <Steps tools={tools} ms={ms} onOpenFile={onOpenFile} /> : null}
    </div>
  );
}
```

Run: `cd runtime/ui && bun test src/v2/verbs.test.ts src/v2/chat/WorkLine.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing ProposalCard tests (the slip + redline)**

Replace `runtime/ui/src/v2/chat/ProposalCard.test.tsx` in full:

```tsx
import { act, cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { ProposalView } from '../../chat/turns';
import { ProposalCard } from './ProposalCard';

const at = '2026-08-29T10:00:00.000Z';

const proposal: ProposalView = {
  id: 'p-1',
  path: 'practice/standards/nda.md',
  rationale: 'Record the fallback so drafts start from the position you actually take.',
  content: '# NDA\n\nTerm: 2 years\n\nResiduals: not offered; fallback = narrow carve-out.\n',
  status: 'pending',
};

const CURRENT = {
  path: proposal.path,
  content: '# NDA\n\nTerm: 2 years\n\nResiduals: not offered.\n',
  version: 'abc1234def0',
  mtimeMs: 1,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];

function install(opts: { read?: () => Response; approve?: () => Response | Promise<Response> } = {}): void {
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

function marks(kind: 'ins' | 'del'): string[] {
  return Array.from(document.querySelectorAll(`.v2-redline ${kind}`), el => el.textContent ?? '');
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

describe('the proposal slip', () => {
  test('pending: tracked changes, changed blocks only, set-text status, against version, the anchor id', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').join('')).toContain('offered.'));
    expect(marks('ins').join('')).toContain('offered; fallback = narrow carve-out.');
    // Changed blocks only: the untouched "Term" paragraph is not shown.
    expect(document.querySelector('.v2-redline')?.textContent).not.toContain('Term: 2 years');
    expect(document.querySelectorAll('.v2-redline del').length).toBeGreaterThan(0);
    // Set text, not a pill.
    expect(document.querySelector('.v2-status-pending')?.textContent).toBe('pending');
    expect(screen.getByText('against version abc1234')).toBeTruthy();
    expect(document.getElementById('proposal-p-1')).toBeTruthy();
    expect(screen.getByText(proposal.rationale)).toBeTruthy();
  });

  test('whole document and line diff are one click away, and changes-only comes back', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('ins').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'whole document' }));
    expect(document.querySelector('.v2-redline')?.textContent).toContain('Term: 2 years');

    await userEvent.click(screen.getByRole('button', { name: 'line diff' }));
    expect(document.querySelector('.v2-diff')).toBeTruthy();
    expect(document.querySelector('.v2-redline')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'changes only' }));
    expect(document.querySelector('.v2-redline')?.textContent).not.toContain('Term: 2 years');
  });

  test('a proposal against a missing file is all insertions', async () => {
    install({ read: () => json({ error: 'not found' }, 404) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('ins').length).toBeGreaterThan(0));
    expect(marks('del')).toEqual([]);
  });

  test('script-looking content renders as literal text, never as HTML', async () => {
    install();
    const scripted = { ...proposal, content: '# NDA\n<script>alert(1)</script>\n' };
    render(<ProposalCard threadId="t-1" proposal={scripted} onReload={() => {}} />);
    await waitFor(() => expect(document.querySelector('.v2-redline')).toBeTruthy());
    expect(document.querySelector('.v2-redline script')).toBeNull();
    expect(document.querySelector('.v2-redline')?.textContent).toContain('<script>alert(1)</script>');
  });

  test('approve calls the API; the slip collapses to ✓ approved with the change one click away', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' }, version: 'new0000' }) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText(/✓ approved/)).toBeTruthy());
    expect(calls.at(-1)).toEqual({ url: '/threads/t-1/approve', body: { proposalId: 'p-1', decision: 'approve' } });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    // Collapsed: the redline folds away…
    expect(document.querySelector('.v2-redline')).toBeNull();
    // …and "view change ⌄" brings it back.
    await userEvent.click(screen.getByRole('button', { name: /view change/ }));
    expect(marks('ins').length).toBeGreaterThan(0);
  });

  test('a 409 conflict becomes the reload footer with both versions', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'expected-hash', actual: 'actual-hash' } }, 409) });
    let reloaded = 0;
    render(
      <ProposalCard
        threadId="t-1"
        proposal={proposal}
        onReload={() => {
          reloaded += 1;
        }}
      />,
    );
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));

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
        json(
          {
            error: 'proposal is not pending',
            proposal: { t: 'proposal', at, id: 'p-1', path: proposal.path, content: '', rationale: '', status: 'rejected', expectedVersion: null },
          },
          409,
        ),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(document.querySelector('.v2-status-rejected')?.textContent).toBe('rejected'));
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  test('when the current file cannot be loaded, the proposed content stands alone and says why', async () => {
    install({ read: () => json({ error: 'vault unreadable' }, 500) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(screen.getByText(/could not load current file: vault unreadable/)).toBeTruthy());
    expect(document.querySelector('.v2-proposal-raw')?.textContent).toBe(proposal.content);
    expect(document.querySelector('.v2-redline')).toBeNull();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('a live proposal with no content yet says the change is loading', async () => {
    install();
    const { content: _dropped, ...live } = proposal;
    render(<ProposalCard threadId="t-1" proposal={live} onReload={() => {}} />);
    expect(screen.getByText('loading the change…')).toBeTruthy();
    expect(screen.getByText(proposal.path)).toBeTruthy();
    await act(async () => {});
    expect(calls).toHaveLength(1);
  });

  test('open in vault hands the path to the drawer', async () => {
    install();
    const opened: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(opened).toEqual([proposal.path]);
  });

  test('with no drawer, open in vault is a link to the vault page', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    expect(screen.getByRole('link', { name: 'open in vault' }).getAttribute('href')).toBe(
      '#/vault?path=practice%2Fstandards%2Fnda.md',
    );
    await act(async () => {});
  });

  test('a reload with a decided proposal replaces the local state and clears the conflict', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'e-hash', actual: 'a-hash' } }, 409) });
    const { rerender } = render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText(/e-hash/)).toBeTruthy());

    rerender(<ProposalCard threadId="t-1" proposal={{ ...proposal, status: 'approved' }} onReload={() => {}} />);

    expect(screen.getByText(/✓ approved/)).toBeTruthy();
    expect(screen.queryByText(/e-hash/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  test('a decision in flight blocks a second one', async () => {
    let land: (res: Response) => void = () => {};
    install({
      approve: () =>
        new Promise<Response>(resolve => {
          land = resolve;
        }),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(calls.filter(call => call.url.endsWith('/approve'))).toHaveLength(1);
    await act(async () => {
      land(json({ proposal: { ...proposal, status: 'approved' } }));
    });
  });

  test('a decision tells the shell which path settled; a refused one tells nobody', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' } }) });
    const decided: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => decided.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decided).toEqual(['practice/standards/nda.md']));

    cleanup();
    calls = [];
    install({ approve: () => json({ error: 'this proposal is no longer pending' }, 409) });
    const refused: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => refused.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('this proposal is no longer pending')).toBeTruthy());
    expect(refused).toEqual([]);
  });
});
```

- [ ] **Step 6: Run to see them fail**

Run: `cd runtime/ui && bun test src/v2/chat/ProposalCard.test.tsx`
Expected: FAIL — the current card renders `.v2-diff-*` line hunks and a pill status.

- [ ] **Step 7: Rewrite `runtime/ui/src/v2/chat/ProposalCard.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { ApproveResult, ConflictBody, ProposalStatus, VaultFile } from '../../api/types';
import type { ProposalView } from '../../chat/turns';
import { unifiedHunks, type Hunk } from '../diff';
import { redlineBlocks, wordDiff, type RedlineBlock } from '../redline';

export interface ProposalCardProps {
  threadId: string;
  proposal: ProposalView;
  onReload: () => void;
  onDecided?: (path: string) => void;
  onOpenFile?: (path: string) => void;
}

interface Conflict {
  expected: string;
  actual: string;
}

type Current =
  | { state: 'loading' }
  | { state: 'ready'; content: string; version: string | null }
  | { state: 'failed'; message: string };

type RedlineView = 'changes' | 'whole' | 'lines';

/** Set-text status (spec §2): italic serif, never a pill. An approval made
 * on THIS card carries the decision time the mock shows (`✓ approved ·
 * 2:41 pm`); one read back from the log has no decision time to show. */
export function statusText(status: ProposalStatus, decidedAt?: string): { className: string; label: string } {
  if (status === 'pending') return { className: 'v2-status v2-status-pending', label: 'pending' };
  if (status === 'approved') {
    return {
      className: 'v2-status v2-status-approved',
      label: decidedAt === undefined ? '✓ approved' : `✓ approved · ${decidedAt}`,
    };
  }
  return { className: 'v2-status v2-status-rejected', label: 'rejected' };
}

/**
 * A proposed write as a DOCUMENT SLIP (spec §3.3): bounded by a double rule
 * top / hairline bottom, the content on the page — no card box, no accent
 * border (founder amendment 1). The change reads as Word-style tracked
 * changes: `diffWords` rendered inline as React text nodes (`<del>` strike /
 * `<ins>` underline) in the document's own serif — changed blocks only, with
 * `whole document` and `line diff` (the step-5 `unifiedHunks`) one click
 * away. NEVER through innerHTML: the sanitizer stays the app's only HTML
 * sink, and no part of a redline goes near it.
 *
 * Approved/rejected slips collapse to their set-text status with the change
 * one `view change ⌄` away. The current file is fetched ONCE, on mount —
 * not again after a decision — so a settled slip keeps showing what
 * changed. The 409 handling is unchanged from the step-5 card.
 */
export function ProposalCard({ threadId, proposal, onReload, onDecided, onOpenFile }: ProposalCardProps): JSX.Element {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [decidedAt, setDecidedAt] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<RedlineView>('changes');
  const [showChange, setShowChange] = useState(false);
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
        // every proposed word reads as an insertion.
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
      setDecidedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
      onDecided?.(proposal.path);
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

  // Both representations are memoized on the two texts — flipping views
  // recomputes nothing, and a re-render for `busy` recomputes nothing.
  const blocks: RedlineBlock[] | null = useMemo(
    () =>
      current.state === 'ready' && proposal.content !== undefined
        ? redlineBlocks(wordDiff(current.content, proposal.content))
        : null,
    [current, proposal.content],
  );
  const hunks: Hunk[] | null = useMemo(
    () =>
      current.state === 'ready' && proposal.content !== undefined ? unifiedHunks(current.content, proposal.content) : null,
    [current, proposal.content],
  );

  const settled = status !== 'pending';
  const text = statusText(status, decidedAt);
  const bodyShown = !settled || showChange;

  return (
    <section className="v2-proposal" id={`proposal-${proposal.id}`} data-testid={`proposal-${proposal.id}`}>
      <header className="v2-slip-head">
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
        <span className={text.className}>{text.label}</span>
      </header>

      <p className="v2-slip-why">{proposal.rationale}</p>

      {settled ? (
        <div className="v2-slip-acts">
          <button type="button" className="v2-link" aria-expanded={showChange} onClick={() => setShowChange(s => !s)}>
            view change ⌄
          </button>
        </div>
      ) : null}

      {!bodyShown ? null : proposal.content === undefined ? (
        // The stream's `proposal` event carries no content; the reload after
        // the step brings it.
        <p className="muted v2-proposal-loading" role="status">
          loading the change…
        </p>
      ) : current.state === 'loading' ? (
        <p className="muted" role="status">
          loading current file…
        </p>
      ) : (
        <>
          {current.state === 'failed' ? (
            <p className="v2-notice v2-notice-warn" role="status">
              could not load current file: {current.message}
            </p>
          ) : null}

          {blocks === null || hunks === null ? (
            <pre className="v2-proposal-raw">{proposal.content}</pre>
          ) : view === 'lines' ? (
            <LineDiff hunks={hunks} />
          ) : (
            <Redline blocks={blocks} changedOnly={view === 'changes'} />
          )}

          {blocks === null ? null : (
            <div className="v2-redline-toggle">
              showing{' '}
              <button type="button" className="v2-link" aria-pressed={view === 'changes'} onClick={() => setView('changes')}>
                changes only
              </button>
              {' · '}
              <button type="button" className="v2-link" aria-pressed={view === 'whole'} onClick={() => setView('whole')}>
                whole document
              </button>
              {' · '}
              <button type="button" className="v2-link" aria-pressed={view === 'lines'} onClick={() => setView('lines')}>
                line diff
              </button>
            </div>
          )}
        </>
      )}

      {status === 'pending' && conflict === null ? (
        <div className="v2-slip-acts">
          <button type="button" className="v2-primary" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </button>
          {current.state === 'ready' && current.version !== null ? (
            <span className="v2-slip-base">against version {current.version.slice(0, 7)}</span>
          ) : null}
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

/** The tracked-changes body: React text nodes inside del/ins — no HTML sink. */
function Redline({ blocks, changedOnly }: { blocks: RedlineBlock[]; changedOnly: boolean }): JSX.Element {
  const shown = changedOnly ? blocks.filter(b => b.changed) : blocks;
  const hidden = blocks.length - shown.length;
  return (
    <div className="v2-redline">
      {shown.length === 0 ? (
        <p className="muted">No changes — the file already says this.</p>
      ) : (
        shown.map((block, i) => (
          <p className="v2-redline-block" key={i}>
            {block.spans.map((span, j) =>
              span.kind === 'ins' ? (
                <ins key={j}>{span.text}</ins>
              ) : span.kind === 'del' ? (
                <del key={j}>{span.text}</del>
              ) : (
                <span key={j}>{span.text}</span>
              ),
            )}
          </p>
        ))
      )}
      {changedOnly && hidden > 0 ? (
        <p className="v2-redline-elided muted">
          ⋯ {hidden} unchanged {hidden === 1 ? 'block' : 'blocks'} hidden
        </p>
      ) : null}
    </div>
  );
}

/** The step-5 line diff, unchanged, as the third view. */
function LineDiff({ hunks }: { hunks: Hunk[] }): JSX.Element {
  return (
    <div className="v2-diff">
      {hunks.length === 0 ? (
        <p className="muted">No changes — the file already says this.</p>
      ) : (
        hunks.map((hunk, h) => (
          <pre className="v2-hunk" key={h}>
            {hunk.map((line, i) => (
              <span key={i} className={`v2-diff-line v2-diff-${line.kind}`}>
                {(line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' ') + line.text + '\n'}
              </span>
            ))}
          </pre>
        ))
      )}
    </div>
  );
}
```

(The old markdown `Preview` and its `isMarkdown`/`renderMarkdown` imports are GONE — the mock's three views are changes/whole/lines, and the whole-document redline reads the document with its changes in place, which is what the preview was for.)

Run: `cd runtime/ui && bun test src/v2/chat/ProposalCard.test.tsx`
Expected: PASS.

- [ ] **Step 8: The turn — work line above serif prose with citations; strip and composer**

**(a)** `runtime/ui/src/v2/chat/Turn.tsx`: replace the `Steps` import with `WorkLine` + the cite helpers, and give `Prose` the citation pass and click delegation. New imports:

```tsx
import { useMemo } from 'react';
import type { RunRecord } from '../../api/types';
import type { ToolCallView, Turn } from '../../chat/turns';
import { renderMarkdown } from '../../vault/markdown';
import { linkCitations, readPathsOf } from './cite';
import { ProposalCard } from './ProposalCard';
import { Strip } from './Strip';
import { WorkLine } from './WorkLine';
```

Replace the `Prose` component:

```tsx
/**
 * The assistant's answer as serif markdown, with SOURCE CHIPS (spec §3.3):
 * backticked mentions of files the step actually read become `#/vault`
 * links via `linkCitations` — a transform on the markdown SOURCE, so the
 * one HTML sink (`renderMarkdown` → the sanitizer) still renders every
 * character. A click on a chip opens the drawer instead of navigating.
 */
function Prose({ text, tools, onOpenFile }: { text: string; tools: ToolCallView[]; onOpenFile?: (path: string) => void }): JSX.Element {
  const html = useMemo(() => renderMarkdown(linkCitations(text, readPathsOf(tools))), [text, tools]);
  return (
    <div
      className="markdown v2-prose"
      onClick={event => {
        if (onOpenFile === undefined) return;
        const anchor = (event.target as Element).closest?.('a[href^="#/vault?path="]');
        if (anchor === null || anchor === undefined) return;
        const href = anchor.getAttribute('href') ?? '';
        const path = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('path');
        if (path === null || path === '') return;
        event.preventDefault();
        onOpenFile(path);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

and in `TurnView`'s assistant branches: the streaming `<Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />` becomes `<WorkLine tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />`; the finished branch gains the same `<WorkLine …/>` line ABOVE the prose; and every `<Prose text={turn.text} />` becomes `<Prose text={turn.text} tools={turn.tools} onOpenFile={onOpenFile} />`.

In `runtime/ui/src/v2/chat/Turn.test.tsx`, assertions that expected a bare `.v2-steps` while streaming now go through the work line: assert `.v2-work-line` exists, `userEvent.click` it, then assert `.v2-steps`. Add one citation test:

```tsx
  test('a backticked mention of a read file renders as a vault chip that opens the drawer', async () => {
    const opened: string[] = [];
    const turn: AssistantTurn = {
      kind: 'assistant',
      text: 'Your standard still says so `nda.md`.',
      tools: [{ id: 'r1', name: 'vault_read', input: { path: 'practice/standards/nda.md' }, hasResult: true, output: { content: 'x' } }],
      proposals: [],
      warnings: [],
      status: 'done',
    };
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    const chip = document.querySelector('.v2-prose a[href^="#/vault"]')!;
    expect(chip.textContent).toBe('nda.md');
    await userEvent.click(chip);
    expect(opened).toEqual(['practice/standards/nda.md']);
  });
```

(import `AssistantTurn` from `../../chat/turns` and `userEvent` from the test-dom module if the file lacks them.)

**(b)** `runtime/ui/src/v2/chat/Strip.tsx`: the summary becomes the mock's one hairline line; the expanded body (Steps + record + error) is unchanged except that the model/duration move INTO the record. Add:

```tsx
import { readPathsOf } from './cite';
```

```tsx
/** `3 sources · 1 proposal pending` — the collapsed line's middle
 * (spec §3.3). Empty when there is nothing to count. */
export function stripLine(turn: AssistantTurn): string {
  const sources = readPathsOf(turn.tools).length;
  const pending = turn.proposals.filter(p => p.status === 'pending').length;
  const parts: string[] = [];
  if (sources > 0) parts.push(`${sources} source${sources === 1 ? '' : 's'}`);
  if (pending > 0) parts.push(`${pending} proposal${pending === 1 ? '' : 's'} pending`);
  return parts.join(' · ');
}
```

The `<summary>` becomes:

```tsx
      <summary>
        <span className={`v2-pill v2-pill-${pill.kind} v2-strip-status`} title={pill.title}>
          {pill.label.toUpperCase()}
        </span>
        {stripLine(turn) === '' ? null : <span className="v2-strip-summary">{stripLine(turn)}</span>}
        {failed === 0 ? null : <span className="v2-strip-failed">{failed === 1 ? '1 failed' : `${failed} failed`}</span>}
        {empty === 0 ? null : <span className="v2-strip-empty">{empty === 1 ? '1 empty' : `${empty} empty`}</span>}
        <span className="v2-chevron" aria-hidden="true">
          details ⌄
        </span>
      </summary>
```

(the `summarize`/provider/duration/tokens spans leave the summary — delete their JSX and the now-unused `summarize` import if nothing else uses it). In the record `<dl>`, replace the conditional Model rows with unconditional ones plus the duration:

```tsx
            <dt>Model</dt>
            <dd>{provider === '' ? 'no provider' : <code>{provider}</code>}</dd>
            {run.durationMs === undefined ? null : (
              <>
                <dt>Duration</dt>
                <dd>{formatMs(run.durationMs)}</dd>
              </>
            )}
```

Update `runtime/ui/src/v2/chat/Strip.test.tsx`: the pill text is uppercase (`'DONE'`); `.v2-strip-summary` reads like `'1 source · 1 proposal pending'` (give the fixture turn one `vault_read` tool and one pending proposal); the provider and duration are asserted inside the opened `.v2-record` instead of the summary. Add:

```tsx
  test('stripLine counts sources and pending proposals, and says nothing about nothing', () => {
    const turn = emptyAssistantTurn({
      status: 'done',
      tools: [{ id: 'r1', name: 'vault_read', input: { path: 'matters/acme.md' }, hasResult: true, output: { content: 'x' } }],
      proposals: [{ id: 'p-1', path: 'practice/x.md', rationale: 'r', status: 'pending' }],
    });
    expect(stripLine(turn)).toBe('1 source · 1 proposal pending');
    expect(stripLine(emptyAssistantTurn({ status: 'done' }))).toBe('');
  });
```

(`emptyAssistantTurn` from `../../chat/turns` — the suite already imports the turn types.)

**(c)** `runtime/ui/src/v2/chat/Composer.tsx` — drop the model picker. Replace the whole file:

```tsx
import { useState } from 'react';

/** A prefill pushed in from outside — the vault's "Ask counsel about this
 * file" (spec §3.4). The nonce distinguishes two asks about the same file. */
export interface ComposerSeed {
  text: string;
  nonce: number;
}

export interface ComposerProps {
  streaming: boolean;
  disabled?: boolean;
  seed?: ComposerSeed;
  onSend: (message: string) => void;
  onStop: () => void;
}

/**
 * One box (spec §3.3): the message, `⌘⏎ to send`, Send/Stop. The model
 * picker moved to the rail footer — the chat sends on the runtime's
 * default provider, which Settings owns.
 */
export function Composer({ streaming, disabled = false, seed, onSend, onStop }: ComposerProps): JSX.Element {
  const [message, setMessage] = useState('');
  const [seenSeed, setSeenSeed] = useState(0);
  if (seed !== undefined && seed.nonce !== seenSeed) {
    setSeenSeed(seed.nonce);
    setMessage(seed.text);
  }

  const send = (): void => {
    const trimmed = message.trim();
    if (trimmed === '' || streaming || disabled) return;
    onSend(trimmed);
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
      <div className="v2-composer-box">
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
        <div className="v2-composer-actions">
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
      </div>
    </form>
  );
}
```

(This REPLACES Task 3's seed-in-the-old-composer version — the seed block carries over verbatim; the picker props go.) `runtime/ui/src/v2/chat/Chat.tsx`'s call site becomes:

```tsx
      <Composer
        streaming={streaming}
        seed={seed}
        onSend={message => void send(message, defaultProviderId(health))}
        onStop={stop}
      />
```

Update `runtime/ui/src/v2/chat/Composer.test.tsx`: delete the picker/swap-notice tests; every render drops `providers`/`defaultProvider`; `onSend` takes one argument (the Task 3 seed test keeps working with the narrowed props). Update `Chat.test.tsx` assertions that read the step body's `provider` — they now always expect the suite's `health.default`.

**(d)** `runtime/ui/src/v2/chat/Chat.tsx` — the thread header and the docket anchor. New imports:

```tsx
import { proposalFromHash } from '../../app';
import { relTime } from '../time';
import { prettifyName } from '../vault/frontmatter';
```

(and add `ThreadEvent` to the `api/types` type import). Add above the component:

```tsx
/** Best-effort, client-side (spec §3.3): the thread's matter chip is the
 * first matter file the thread read, prettified. `matters/` is the
 * conventional dir; a vault with a custom `matters_path` just shows no chip
 * — the chip is a courtesy, not a record. */
export function matterChipOf(events: ThreadEvent[]): string | null {
  for (const ev of events) {
    if ('t' in ev) continue;
    if (ev.type !== 'tool_call' || ev.name !== 'vault_read') continue;
    const input = ev.input;
    if (typeof input !== 'object' || input === null) continue;
    const path = (input as Record<string, unknown>)['path'];
    if (typeof path !== 'string' || !path.startsWith('matters/')) continue;
    return prettifyName(path.slice(path.lastIndexOf('/') + 1));
  }
  return null;
}
```

In the JSX, immediately above the transcript div:

```tsx
      {thread === null ? null : (
        <header className="v2-thread-head">
          <h1>{thread.header.title?.trim() || 'Untitled'}</h1>
          {matterChipOf(thread.events) === null ? null : (
            <span className="v2-matter-chip">matter: {matterChipOf(thread.events)}</span>
          )}
          <span className="v2-thread-date">{relTime(thread.header.createdAt)}</span>
        </header>
      )}
```

and the anchor scroll, after the `load` effect (guarded: happy-dom may not implement scrollIntoView):

```tsx
  // The docket's Review lands here with `&proposal=<id>` in the fragment:
  // scroll the slip into view once the transcript holding it has rendered.
  useEffect(() => {
    if (thread === null) return;
    const target = proposalFromHash(globalThis.location.hash);
    if (target === null) return;
    document.getElementById(`proposal-${target}`)?.scrollIntoView?.({ block: 'start' });
  }, [thread]);
```

Append to `runtime/ui/src/v2/chat/Chat.test.tsx` (adapt the mock-installer/fixture names to the suite's existing ones — it already installs a thread-returning fetch mock; extend it to accept events):

```tsx
  test('the thread header: serif title, matter chip from the first matter read, date', async () => {
    const events: ThreadEvent[] = [
      { t: 'user', at, content: 'check it' },
      { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
      { type: 'tool_call', at, id: 'c1', name: 'vault_read', input: { path: 'matters/acme-nda.md' } },
      { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
    ];
    installThread({ title: 'NDA residuals fallback' }, events);
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(document.querySelector('.v2-thread-head h1')?.textContent).toBe('NDA residuals fallback'));
    expect(document.querySelector('.v2-matter-chip')?.textContent).toBe('matter: Acme nda');
  });
```

- [ ] **Step 9: The chat CSS**

In `runtime/ui/src/styles.css`: DELETE the old `.v2-card`, `.v2-proposal { … border-left: 3px solid var(--accent); … }`, `.v2-proposal-head`, `.v2-proposal-tools`, `.v2-proposal-version`, `.v2-proposal-actions`, `.v2-preview` rules and the old `.v2-strip`/`.v2-strip > summary`/`.v2-strip-provider`/`.v2-strip-duration`/`.v2-strip-tokens`/`.v2-composer*`/`.v2-chevron`-rotation rules; change the two line-diff tints to the opaque tokens (`.v2-diff-add { background: var(--ins-bg); color: var(--ok); }` · `.v2-diff-del { background: var(--del-bg); color: var(--error); text-decoration: line-through; }`); then append:

```css
/* ── Chat (mock-chat.html) ───────────────────────────────────────────── */

.v2-thread-head { display: flex; align-items: baseline; gap: 12px; padding: 14px 40px 12px; border-bottom: 1px solid var(--border); }
.v2-thread-head h1 { font: 600 20px/1.3 var(--serif); margin: 0; }
.v2-matter-chip { font-size: 12px; color: var(--fg-muted); border: 1px solid var(--border); border-radius: 999px; padding: 2px 9px; }
.v2-thread-date { margin-left: auto; font-size: 12px; color: var(--fg-faint); }

/* One quiet work line. */
.v2-work-line-wrap { margin: 2px 0 4px; }
.v2-work-line { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; background: none; border: none; padding: 0; font-size: 12.5px; color: var(--fg-faint); text-align: left; cursor: pointer; }
.v2-file-chip { font: 11.5px var(--mono); background: var(--bg-raised); border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; color: var(--fg-muted); }
.v2-work-line-wrap .v2-steps { margin-top: 6px; border-left: none; padding-left: 0; }

/* Source chips: the citation links inside the prose. */
.v2-prose a[href^="#/vault"] {
  font: 11px var(--mono);
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 6px;
  color: var(--fg-muted);
  white-space: nowrap;
  vertical-align: 1px;
  text-decoration: none;
}
.v2-prose a[href^="#/vault"] code { background: none; border: none; padding: 0; font: inherit; color: inherit; }

/* The document slip: double rule top, hairline bottom — content on the
 * page, never a boxed card, never a left accent (founder amendment 1). */
.v2-proposal { border: none; border-top: 3px double var(--border-strong); border-bottom: 1px solid var(--border); border-radius: 0; margin: 20px 0; padding: 0; background: none; box-shadow: none; display: flex; flex-direction: column; }
.v2-slip-head { display: flex; align-items: baseline; gap: 10px; padding: 10px 2px; font-size: 13px; flex-wrap: wrap; }
.v2-tag { font: 700 10px/1 var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-faint); }
.v2-proposal-path { font: 12.5px var(--mono); color: var(--fg); word-break: break-all; }
.v2-slip-head .v2-status { margin-left: auto; }
.v2-slip-why { padding: 0 2px 10px; margin: 0; color: var(--fg-muted); font: 14.5px/1.5 var(--serif); }
.v2-slip-acts { display: flex; gap: 8px; align-items: center; padding: 10px 2px; }
.v2-slip-base { margin-left: auto; font-size: 12px; color: var(--fg-faint); }

/* Word-style tracked changes: the document itself, marked up inline. */
.v2-redline { border: 1px solid var(--border); border-radius: 6px; background: var(--bg-raised); padding: 14px 18px; margin: 0 0 2px; font: 15px/1.7 var(--serif); max-height: 24rem; overflow: auto; }
.v2-redline-block { margin: 0 0 12px; white-space: pre-wrap; }
.v2-redline-block:last-child { margin-bottom: 0; }
.v2-redline ins { color: var(--ok); background: var(--ins-bg); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.v2-redline del { color: var(--error); background: var(--del-bg); text-decoration: line-through; text-decoration-thickness: 1px; }
.v2-redline-elided { font-size: 12px; }
.v2-redline-toggle { font-size: 11.5px; color: var(--fg-faint); margin-top: 6px; }
.v2-redline-toggle .v2-link { color: var(--fg-faint); }
.v2-redline-toggle .v2-link[aria-pressed="true"] { color: var(--fg); text-decoration: none; font-weight: 600; }

/* The strip: one hairline line, not a box. */
.v2-strip { border: none; border-top: 1px solid var(--border); border-radius: 0; background: none; font-size: 12.5px; margin-top: 14px; }
.v2-strip > summary { display: flex; gap: 8px; align-items: center; padding: 10px 0 0; cursor: pointer; list-style: none; color: var(--fg-faint); }
.v2-strip > summary::-webkit-details-marker { display: none; }
.v2-strip-status { font: 600 11px/1 var(--sans); letter-spacing: 0.06em; font-style: normal; }
.v2-strip[data-status="error"], .v2-strip[data-status="timeout"] { border-top-color: var(--error); }
.v2-strip .v2-chevron { margin-left: auto; }
.v2-strip-body { padding: 8px 0 4px; border-top: none; }

/* The composer: the one strong container on the screen. */
.v2-composer { border-top: none; padding: 14px 40px 22px; background: none; }
.v2-composer-box { max-width: 720px; margin: 0 auto; background: var(--bg-raised); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: 12px 14px 10px; box-shadow: var(--shadow); }
.v2-composer-box textarea { width: 100%; background: none; border: none; color: var(--fg); font: 15px/1.5 var(--sans); resize: none; outline: none; padding: 0; }
.v2-composer-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.v2-composer-hint { margin-left: auto; font-size: 12px; }
.v2-primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }

/* The transcript column narrows to the mock's 720px measure. */
.v2-turn { max-width: 720px; }
```

- [ ] **Step 10: Run everything; look at it once**

Run: `bun run typecheck:ui && bun run ui:test && bun run ui:build`
Expected: clean and green across the suite — redline, cite, WorkLine, verbs, sanitize, ProposalCard, Turn, Strip, Composer, Chat, Shell, home, vault.

Then the Task 2 server recipe on port 7496 with `--fake --fake-script e2e/fake-script.json` and `practice/standards/nda.md` seeded as `# NDA\nTerm: 2 years\n`. Expected on a send: the quiet work line with filename chips → serif answer → the proposal as a slip with the tracked-changes redline (toggling changes/whole/line) → Approve collapses it to *✓ approved · time* → the strip reads `DONE · 1 source · details ⌄`.

- [ ] **Step 11: Commit**

```bash
git add runtime/ui/src/v2/redline.ts runtime/ui/src/v2/redline.test.ts runtime/ui/src/v2/verbs.ts runtime/ui/src/v2/verbs.test.ts \
  runtime/ui/src/v2/chat runtime/ui/src/vault/sanitize.ts runtime/ui/src/vault/sanitize.test.tsx runtime/ui/src/styles.css
git commit -m "ui: chat — work line, source chips, tracked-changes proposal slips, hairline strip, one-box composer"
```

---

### Task 6: e2e + screenshots (dark/light) + findings

**Files:**
- Modify: `e2e/paths.ts` (the seeded matter gains frontmatter), `e2e/ui.spec.ts` (rewrite the story)
- Modify: `docs/superpowers/spikes/2026-08-28-runtime-spikes.md` (append "## Step 6 — comprehensive redesign")
- Create: `docs/superpowers/spikes/img/redesign-home-dark.png`, `redesign-home-light.png`, `redesign-chat-dark.png`, `redesign-chat-light.png`, `redesign-vault-dark.png`, `redesign-vault-light.png`

**Interfaces:**
- Consumes: every DOM contract from Tasks 2–5, by the class names each task's Interfaces block published: `.v2-hi .v2-sub .v2-foot` and `nav[aria-label="Surfaces"]` (T2); `.v2-vsearch` input (`aria-label="Search the vault"`), `.v2-vrow .v2-doc-head .v2-fm .v2-doc-md .v2-rail-icons` (T3); `.v2-ask` textarea (`aria-label="Ask counsel"`), `.v2-docket .v2-docket-head .v2-docket-path` and the `Review` button (T4); `.v2-proposal .v2-redline .v2-status-pending .v2-status-approved .v2-work-line .v2-strip` (T5); `token()`/`nav()` helpers kept from the old spec; the fake script `e2e/fake-script.json` (unchanged: `vault_read matters/acme.md` + `propose_update practice/standards/nda.md` with `# NDA\nTerm: 3 years\n`, text `Done.`, twice).
- Produces: `bun run e2e` green on the redesign story; six theme screenshots; the step-6 findings section.
- Ports: the e2e web server stays on `PORT = 7499` (`e2e/paths.ts`); the screenshot server uses **7497** — both ≥7495, clear of any live `serve` on 7431.

- [ ] **Step 1: Machine prerequisite**

Run: `bunx playwright install chromium`
Expected: Chromium for Playwright `1.58.2` present (a no-op when already installed).

- [ ] **Step 2: Seed the matter with frontmatter**

In `e2e/paths.ts`, replace the `ACME` constant:

```ts
/** The matter the fake script's `vault_read` asks for — WITH frontmatter,
 * so the home cards and the reader's fact rows have something honest to
 * draw (redesign spec §3.2/§3.4). */
const ACME = `---
title: Acme Corp — NDA
counterparty: Acme Corp
stage: working
next_action: send document list
deadline: 2026-09-12
---
# Acme Corp — NDA

Counterparty: Acme Corp
Term: 2 years
`;
```

- [ ] **Step 3: Rewrite the story**

Replace `e2e/ui.spec.ts` in full:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RUNTIME_FILE, VAULT_DIR } from './paths';

/**
 * The redesigned workbench, end to end, against a real `counsel-os serve
 * --fake` (redesign spec §6): token bootstrap onto HOME, an ask from the ask
 * box that creates and names the thread, the proposal as a tracked-changes
 * slip, the docket's Review → anchored approve, the vault's ⌘K search and
 * reading pane, and settings. One test, one story — the docket needs the
 * pending proposal the ask created, and the vault check reads the file the
 * approval wrote.
 *
 * Nothing here calls a model: the provider is `fake/fake`, driven by
 * `e2e/fake-script.json`.
 */

/** The bearer token, from the handshake file the server publishes. */
async function token(): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const parsed = JSON.parse(readFileSync(RUNTIME_FILE, 'utf8')) as { token?: string };
      if (typeof parsed.token === 'string' && parsed.token !== '') return parsed.token;
    } catch (err) {
      last = err;
    }
    await new Promise(done => setTimeout(done, 100));
  }
  throw new Error(`no token in ${RUNTIME_FILE}: ${String(last)}`);
}

/** The rail's surface links (the nav kept its aria-label through the
 * redesign; a proposal slip also links into the vault, so stay scoped). */
function nav(page: Page, name: string) {
  return page.locator('nav[aria-label="Surfaces"]').getByRole('link', { name, exact: true });
}

test('home asks, the slip redlines, the docket reviews, the vault reads', async ({ page }) => {
  writeFileSync(join(VAULT_DIR, 'practice', 'standards', 'nda.md'), '# NDA\nTerm: 2 years\n');

  await test.step('the token in the fragment becomes the credential, and the landing page is Home', async () => {
    await page.goto(`/#token=${await token()}`);
    await expect(page.locator('.v2-hi')).toHaveText(/Good (morning|afternoon|evening)\./);
    // The rail footer is the model picker's new home (spec §3.3).
    await expect(page.locator('.v2-foot')).toContainText('fake/fake');
    await expect.poll(() => page.url()).not.toContain('token=');
    // The matters column reads the seeded frontmatter.
    await expect(page.locator('.v2-matter-name')).toContainText('Acme Corp — NDA');
    await expect(page.locator('.v2-due')).toHaveText('due Sep 12');
    await expect(page.locator('.v2-na')).toContainText('send document list');
    // No pending proposals yet: the docket is hidden entirely (spec §3.2).
    await expect(page.locator('.v2-docket')).toHaveCount(0);
  });

  await test.step('a starter fills the box; the ask creates and names the thread', async () => {
    await page.getByRole('button', { name: 'Review a contract' }).click();
    await expect(page.getByRole('textbox', { name: 'Ask counsel' })).toHaveValue('Review this contract: ');
    await page.getByRole('textbox', { name: 'Ask counsel' }).fill('Check the Acme NDA term.');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect.poll(() => page.url()).toContain('#/chat?thread=');
    await expect(page.locator('.v2-prose')).toHaveText('Done.');
    const threads = page.locator('[aria-label="Threads"] li.v2-thread');
    await expect(threads).toHaveCount(1);
    await expect(threads.first()).toContainText('Check the Acme NDA term.');
    // The thread header: serif title + the matter chip the read resolved.
    await expect(page.locator('.v2-thread-head h1')).toHaveText('Check the Acme NDA term.');
    await expect(page.locator('.v2-matter-chip')).toContainText('Acme');
    // The work line folds the tools into one quiet line.
    await expect(page.locator('.v2-work-line')).toContainText('read');
  });

  await test.step('the proposal is a tracked-changes slip against the file on disk', async () => {
    const slip = page.locator('.v2-proposal');
    await expect(slip).toHaveCount(1);
    await expect(slip.locator('.v2-proposal-path')).toHaveText('practice/standards/nda.md');
    await expect(slip.locator('.v2-redline del')).toContainText('2');
    await expect(slip.locator('.v2-redline ins')).toContainText('3');
    await expect(slip.locator('.v2-status-pending')).toHaveText('pending');

    // Whole document and line diff are one click away (spec §3.3).
    await slip.getByRole('button', { name: 'whole document' }).click();
    await expect(slip.locator('.v2-redline')).toContainText('# NDA');
    await slip.getByRole('button', { name: 'line diff' }).click();
    await expect(slip.locator('.v2-diff-del')).toContainText('Term: 2 years');
    await slip.getByRole('button', { name: 'changes only' }).click();
    await expect(slip.locator('.v2-redline')).toBeVisible();
  });

  await test.step('the docket lists the pending proposal; Review lands anchored; approve settles it', async () => {
    await nav(page, 'Home').click();
    await expect(page.locator('.v2-docket-head')).toContainText('1 awaiting your decision');
    await expect(page.locator('.v2-docket-path')).toContainText('practice/standards/nda.md');
    await expect(page.locator('.v2-sub')).toContainText('one proposal is waiting on you');

    await page.getByRole('button', { name: 'Review' }).click();
    await expect.poll(() => page.url()).toContain('proposal=');
    const slip = page.locator('.v2-proposal');
    await expect(slip).toBeVisible();

    await slip.getByRole('button', { name: 'Approve' }).click();
    await expect(slip.locator('.v2-status-approved')).toContainText('✓ approved');
    await expect(slip.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    // The strip is one hairline line now.
    await expect(page.locator('.v2-strip summary')).toContainText('DONE');
    await expect(page.locator('.v2-strip-summary')).toContainText('1 source');

    await nav(page, 'Home').click();
    await expect(page.locator('.v2-docket')).toHaveCount(0);
  });

  await test.step('the vault: icon rail, ⌘K search, the reading pane', async () => {
    await nav(page, 'Vault').click();
    await expect(page.locator('.v2-rail.v2-rail-icons')).toHaveCount(1);

    await page.keyboard.press('ControlOrMeta+k');
    const search = page.getByLabel('Search the vault');
    await expect(search).toBeFocused();
    await search.fill('acme');
    await search.press('Enter');
    await page.locator('.v2-vresults .v2-vrow', { hasText: 'matters/acme.md' }).click();

    // The reading pane: doc title (not the filename), fact leaders, body.
    await expect(page.locator('.v2-doc-head h1')).toHaveText('Acme Corp — NDA');
    await expect(page.locator('.v2-fm')).toContainText('counterparty');
    await expect(page.locator('.v2-fm')).toContainText('Acme Corp');
    await expect(page.locator('.v2-doc-md')).toContainText('Term: 2 years');

    // Clear the search; the grouped tree comes back and reads the approved
    // file through Practice → standards.
    await page.getByRole('button', { name: 'clear' }).click();
    await expect(page.locator('.v2-vgroup', { hasText: 'Matters' })).toBeVisible();
    await page.locator('.v2-vrow', { hasText: 'standards' }).click();
    await page.locator('.v2-vrow', { hasText: 'nda.md' }).click();
    await expect(page.locator('.v2-doc-md')).toContainText('Term: 3 years');
  });

  await test.step('settings still reports the runtime, in the motif', async () => {
    await nav(page, 'Settings').click();
    await expect(page.locator('.settings-health .facts')).toContainText('fake/fake');
  });
});
```

- [ ] **Step 4: Run it**

Run: `bun run e2e`
Expected: `1 passed` — the whole story, ~5 s. (This is the step that turns the suite green again after Tasks 2–5 changed the routes.)

- [ ] **Step 5: Screenshots, dark and light**

No subscription calls; `serve --fake` on port **7497** with a throwaway home + vault:

```bash
export SCRATCH=$(mktemp -d /tmp/counsel-step6.XXXX)
mkdir -p "$SCRATCH/home" "$SCRATCH/vault/matters" "$SCRATCH/vault/practice/standards"
printf 'counsel-os-config: true\nlegal_root: %s\n' "$SCRATCH/vault" > "$SCRATCH/vault/config.md"
cp e2e/.tmp/vault/matters/acme.md "$SCRATCH/vault/matters/acme.md" 2>/dev/null || printf -- '---\ntitle: Acme Corp — NDA\ncounterparty: Acme Corp\nstage: working\nnext_action: send document list\ndeadline: 2026-09-12\n---\n# Acme Corp — NDA\n\nCounterparty: Acme Corp\nTerm: 2 years\n' > "$SCRATCH/vault/matters/acme.md"
printf '# NDA\nTerm: 2 years\n' > "$SCRATCH/vault/practice/standards/nda.md"
bun run ui:build
COUNSEL_OS_HOME="$SCRATCH/home" bun runtime/src/cli.ts serve --port 7497 --vault "$SCRATCH/vault" --fake --fake-script e2e/fake-script.json > "$SCRATCH/serve.log" 2>&1 &
sleep 3 && grep -o 'http://127.0.0.1:7497/#token=[^ ]*' "$SCRATCH/serve.log" | head -1
```

Then the throwaway driver `e2e/.tmp/shots6.ts` (the directory is gitignored; create it if the e2e run removed it):

```ts
import { chromium, type ColorScheme } from 'playwright';

const url = process.argv[2];
if (url === undefined) throw new Error('usage: bun e2e/.tmp/shots6.ts "http://127.0.0.1:7497/#token=<token>"');
const out = 'docs/superpowers/spikes/img';

const browser = await chromium.launch();
for (const scheme of ['dark', 'light'] as ColorScheme[]) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: scheme });
  await page.goto(url);
  await page.waitForSelector('.v2-hi');
  await page.screenshot({ path: `${out}/redesign-home-${scheme}.png` });

  await page.getByRole('textbox', { name: 'Ask counsel' }).fill('Check the Acme NDA term.');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.waitForSelector('.v2-redline');
  await page.screenshot({ path: `${out}/redesign-chat-${scheme}.png` });

  await page.locator('nav[aria-label="Surfaces"]').getByRole('link', { name: 'Vault', exact: true }).click();
  await page.locator('.v2-vrow', { hasText: 'Acme Corp' }).click();
  await page.waitForSelector('.v2-doc-md');
  await page.screenshot({ path: `${out}/redesign-vault-${scheme}.png` });
  await page.close();
}
await browser.close();
```

Run: `bun e2e/.tmp/shots6.ts "<the printed token URL>"`
Expected: six PNGs under `docs/superpowers/spikes/img/`. Then `kill %1` and confirm `pgrep -fl 'cli.ts serve'` reports nothing on 7497 and `~/.counsel-os` was never written (the scratch `COUNSEL_OS_HOME` owns `runtime.json`).

- [ ] **Step 6: Write the findings**

Append to `docs/superpowers/spikes/2026-08-28-runtime-spikes.md`, in the same shape as the earlier steps:

```markdown
## Step 6 — comprehensive redesign

Date: <date>
Branch: <the worktree branch, Tasks 1–5 landed>
Spec: `docs/superpowers/specs/2026-08-30-ui-comprehensive-redesign-design.md` §6–§7

Question: do the three redesigned surfaces hold up end to end — Home's ask
box and docket, the tracked-changes slip, the vault's search and reading
pane — against the fake provider, in both themes?

### (a) `bun run e2e` — the redesign story · PASS / FAIL

<paste the runner's `list` output: the steps and wall time>

### (b) Screenshots

![Home, dark](img/redesign-home-dark.png)
![Home, light](img/redesign-home-light.png)
![Chat with the tracked-changes slip, dark](img/redesign-chat-dark.png)
![Chat with the tracked-changes slip, light](img/redesign-chat-light.png)
![The vault reading pane, dark](img/redesign-vault-dark.png)
![The vault reading pane, light](img/redesign-vault-light.png)

### Defects found in Step 6 (recorded, not fixed)

<numbered list; each: what, where (file), why it matters — contrast misses
against the ≥4.5:1 light-ramp requirement go here first>

### What the next plan should assume — Step 6

- <the routes: #/ is Home, chat under #/chat?thread=…>
- <what the founder should look at when judging the motif against the mocks>

### Throwaway artifacts — Step 6

<the scratch dir; the 7497 server killed; ~/.counsel-os untouched; six PNGs kept>
```

Fill every `<…>` with what actually happened; the section is a record, not a template.

- [ ] **Step 7: Commit**

```bash
git add e2e/paths.ts e2e/ui.spec.ts
git commit -m "e2e: the redesign story — home ask, tracked-changes slip, docket review, vault search"
git add docs/superpowers/spikes/2026-08-28-runtime-spikes.md docs/superpowers/spikes/img/redesign-home-dark.png \
  docs/superpowers/spikes/img/redesign-home-light.png docs/superpowers/spikes/img/redesign-chat-dark.png \
  docs/superpowers/spikes/img/redesign-chat-light.png docs/superpowers/spikes/img/redesign-vault-dark.png \
  docs/superpowers/spikes/img/redesign-vault-light.png
git commit -m "docs: step-6 findings — redesign e2e and dark/light screenshots"
```

---

## Self-review

**Spec coverage (section → task):** §1 three surfaces/one identity → T2 (shell+tokens), T3 (vault), T4 (home), T5 (chat). §2 tokens dark+light verbatim, serif/sans/mono roles, docket motif, dotted leaders, set-text statuses, document slips, one strong container per screen → T2 Step 9 (tokens + motif classes, pills/badges flattened to set text), T4 Step 7 (ask box = home's strong container), T5 Step 9 (slip + composer). §3.1 rail 216px/brand/nav/conversations/footer-from-`/health`, 56px icon rail on vault, routes `#/` `#/chat` `#/vault` `#/settings`, old `#/` → Home, keep-stream → T2 (Rail, parseHash, Shell `hidden` workspace + tests that a step survives route trips). §3.2 greeting/subline honest counts, ask box + attach chip + Ask creates a titled thread and navigates, docket (path/rationale/age/thread, Review → anchored, hidden when empty), starters as prompt-fills, matters deadline-then-recency with amber ≤14d + `next:`/`touched`, conversations, empty vault → getting-started → T4 (docket anchor consumed in T5 Step 8d). §3.3 thread header + matter chip + date, one work line with filename chips expandable, source chips derived from actual reads, slips in lifecycle order (transcript order preserved) with approved collapsed + `view change ⌄` and pending open with the tracked-changes redline + changes/whole/line views + Approve/Reject + `against version <7>`, one-line strip with `details ⌄`, composer one box ⌘⏎, model picker → rail footer → T5 + T2 (footer). §3.4 tree ~300px, ⌘K → Enter runs vault_search → results replace tree until cleared, groups Matters (humanized + month) / Practice / Knowledge / Other (n) collapsed, reading pane crumbs/serif H1/updated·version/frontmatter leaders/68ch/outline/ask-bar, drawer keeps the file view minus outline at 420px → T3 (+T1's endpoints). §3.5 settings restyle only → T2 Steps 9g–10. §4 all four API rows → T1 (list filter+metadata, overview, proposals bounded scan, read mtimeMs; no writes/state/model calls — every new route is a GET over existing stores). §5 empty states → docket hides (T4 test), matters → getting-started (T4 test), search → "No results for <q>" + clear (T3 test), overview with no matters dir → `matters: []` (T1 tests, server and route); 401/stream/409 paths untouched (T5 keeps the card's 409 logic verbatim; Shell's 401 page unchanged). §6 every named unit area has a test file in its task; e2e story + screenshots dark/light + spikes → T6; no subscription calls anywhere (fake only; the optional Ollama look is not even required). §7 build order = Tasks 1–6 exactly.

**Placeholder scan:** every code step carries the code; every test step carries test code plus its `bun test` command and expected outcome. The Task 2 home stub is named intermediate wiring that Task 4 Step 6a replaces. Steps that adapt EXISTING test files (Drawer T3-8a, Turn/Strip/Composer/Chat T5-8, Shell install() T4-6c) name the exact selectors/props changing and give the new assertion code; the executor reads the file being edited, which is in front of them. The T6 findings section is a record to fill from the run, each field named.

**Type consistency (checked against the shared-names table):** `Entry.mtimeMs?/size?` (T1) is what `VaultEntry` mirrors and `MatterOverview.mtimeMs` consumes (`?? 0` at the overview boundary). `vaultOverview(vault, tenant, cfg)` matches the route call `vaultOverview(deps.vault, deps.tenant, readVaultConfig(deps.vaultRoot))`. `pendingProposals(store, tenant)` ↔ `proposalsRoute`. `Route` gains `'home'` and is exported (T2) — `Rail.route: Route` and Shell both import it. `threadFromHash`/`proposalFromHash` return `string | null`; Shell consumes the first (T2), Chat the second (T5-8d), HomePage writes both params (T4-5). `footerLabel(health: Health | null)` tolerates the pre-`/health` render. `ComposerSeed { text; nonce }` is one shape across Composer (T3 → narrowed file T5-8c carries it verbatim), Chat's `seed` prop, Shell's `setSeed`; Chat's `initialAsk` uses the same `{ text; nonce }` shape by design. `Reader({ path, outline?, onAsk? })` is what VaultPage (`outline` on) and Drawer (`outline` off) render; `MISSING_FILE_NOTE`/`withoutHostPaths` move from FileView with their tests. `groupRoot(rootEntries, overview): TreeGroups` ↔ VaultTree's `groupRoot(root, overview)`. `wordDiff → WordSpan[] → redlineBlocks → RedlineBlock[]` is the exact pipeline ProposalCard's memo runs; `unifiedHunks`'s `Hunk`/`HunkLine` types are untouched and the `LineDiff` renderer matches the old `Diff` markup so `.v2-diff-del`/`.v2-diff-add` e2e selectors keep meaning. `defaultProviderId(health)` (T4) is called in Chat's `initialAsk` effect AND the T5 composer call site. `stripLine(turn: AssistantTurn)` uses `readPathsOf` from cite (same import in Turn). The e2e selectors in T6 all appear in a component above: `.v2-hi/.v2-sub/.v2-matter-name/.v2-due/.v2-na/.v2-docket*` (T4), `.v2-foot/.v2-rail-icons` + `nav[aria-label="Surfaces"]` + `[aria-label="Threads"] li.v2-thread` (T2), `.v2-vgroup/.v2-vrow/.v2-vresults/.v2-doc-head/.v2-fm/.v2-doc-md` + `aria-label="Search the vault"` (T3), `.v2-proposal/.v2-proposal-path/.v2-redline/.v2-status-*/.v2-work-line/.v2-thread-head/.v2-matter-chip/.v2-strip-summary` (T5), `.settings-health .facts` (T2 Health markup keeps the class).

**Resolved ambiguities (binding for execution, also flagged in the constraints):**
1. **`GET /vault/search` added** though spec §4's table omits it — §3.4's ⌘K flow ("Enter runs `vault_search`") has no other server path; it is read-only over the existing `SearchFn`, under the already-guarded `vault` prefix.
2. **Light-ramp secondary values** (raised/hover/sunken/borders/muted inks) are not in the spec; they are derived to sit on the paper ramp, with the specified values verbatim. The two diff tints come from the mock's swatch row (`#e7f0e4`/`#f6e3dd`); dark tints are made opaque too, honoring "opaque, never alpha" in both themes.
3. **Frontmatter key spellings** are not specified: the server passes the raw scalar map through untouched; the client reads `next_action`/`nextAction` and `deadline`/`due`, and absent fields don't render (spec §4's own rule).
4. **`groups` counts** = entries directly under each root group's directories; `other` = root entries outside matters/practice/knowledge (that is what "Other files (n)" shows).
5. **"anchored at the card"** = `#/chat?thread=<id>&proposal=<pid>` + `scrollIntoView` on `id="proposal-<pid>"`.
6. **"inserts a path chip into the message"** = an inline `Tree` picker under the ask box; chips render in the row and ride as backticked paths on the message's last line (`withAttachments`).
7. **The redline renders as serif pre-wrap TEXT**, not re-rendered markdown: "inside the document's own markdown styling" is honored typographically (same serif, same measure), because rendering ins/del through markdown would need innerHTML, which the constraints forbid.
8. **The old preview view is dropped** — the mock's toggle is exactly `changes only · whole document · line diff`, and the whole-document redline is the document as it would read.
9. **The matter chip is best-effort against the conventional `matters/` prefix** client-side (the spec says best-effort, client-side; a custom `matters_path` shows no chip).
10. **The drawer's file view is the Reader minus outline** and `FileView` is deleted with its behaviors moved — "the drawer keeps this file view" read as the NEW reading pane, per §3.4's own sentence.
11. **`#/chat` with no thread is the chat surface (draft)**; unknown routes fall to Home (the spec only says old `#/` lands on Home — Home is the safe fallback for everything unrecognized).
12. **`/proposals` accepts only `status=pending`** (400 otherwise): the spec defines just the pending listing, and answering everything to an unknown status would misread as "all".
13. **The getting-started link** points at the repo README (`https://github.com/eigenlegal/counsel-os#readme`) — the spec says "link to docs" without naming one.
14. **The docket row's headline** is the rationale's first line (§3.2 "title/rationale first line" — proposals have no title field anywhere in the event schema).
15. **Rail nav ≠ drawer:** the old "nav Vault opens the drawer on the chat route" behavior is gone — §3.1 gives the rail four surface routes and §3.4 gives the drawer to in-chat interactions ("open in vault", file chips), which is how the Shell tests now open it.
