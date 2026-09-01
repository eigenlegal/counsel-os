import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  PLACEMENTS,
  readContentState,
  readReceivedSnapshot,
  writeContentState,
  writeReceivedSnapshot,
  type ContentGroup,
  type ContentState,
} from '../setup/run';
import { parseFrontmatter } from '../vault/overview';
import { readVaultConfig, type VaultConfig } from '../vault/resolve-root';
import { unifiedDiff } from './diff';
import { bodyHash } from './hash';
import { MANIFEST } from './manifest';
import type { ContentSource } from './source';

/**
 * Content updates in the runtime (spec 2026-09-01 §6) — the rules of
 * `skills/update/SKILL.md` steps 4–7, mechanically:
 *
 * LAW is plugin-managed by default. Each shipped law file is compared to the
 * vault copy by frontmatter-stripped body hash, against BOTH the shipped
 * hash and the hash the vault last received (`.counsel/content-state.json`).
 * Vault == received and shipped differs → `update-available`. Vault differs
 * from received (or `managed-by: user`, or `law_management: user`) →
 * `user-modified`, reported and never written. Absent → `missing` (new law
 * content, offered as an add). Vault law files nothing ships → `vault-only`,
 * never touched.
 *
 * PRACTICE is user-owned and diverges by design. It is never diffed
 * seed-vs-vault as "updated guidance" and never overwritten. An upstream
 * change is detected against the RECEIVED seed (its hash, and the snapshot
 * under `.counsel/received/` for the diff); the user merges by hand. A
 * practice file the vault lacks is offered as an add.
 */

export type ItemStatus = 'current' | 'update-available' | 'user-modified' | 'vault-only' | 'missing' | 'upstream-changed';
export type ItemReason = 'managed-by' | 'law-management' | 'edited' | 'no-baseline';

export interface ContentItem {
  /** Vault-relative path (`law/data-privacy/gdpr.md`). */
  path: string;
  /** The shipped path it comes from, or `null` for a vault-only file. */
  shipped: string | null;
  group: 'law' | 'practice';
  /** The law area (first segment under `law/`) or the practice group. */
  area: string;
  status: ItemStatus;
  reason?: ItemReason;
  /** `upstream-changed` only: the unified diff to merge by hand. */
  diff?: string;
  /** What the diff was drawn against: the received snapshot, or — when a
   * vault predates snapshots — the vault copy itself (then the diff may show
   * the user's own edits too, and says so). */
  baseline?: 'received' | 'vault';
  /** True when `applyUpdates` may write this item. */
  applicable: boolean;
}

export interface ContentStatus {
  shippedVersion: string;
  /** The version the vault last received (content-state), or `null` for a
   * vault set up before the runtime kept one. */
  vaultVersion: string | null;
  receivedAt: string | null;
  lawManagement: VaultConfig['lawManagement'];
  autoApplyLawUpdates: boolean;
  items: ContentItem[];
  counts: Record<ItemStatus, number>;
}

export interface UpdateDeps {
  vaultRoot: string;
  content: ContentSource;
  /** Default: the generated manifest's version. */
  shippedVersion?: string;
  now?: () => Date;
}

export class UpdateError extends Error {
  constructor(
    message: string,
    public readonly paths: string[],
  ) {
    super(message);
    this.name = 'UpdateError';
  }
}

const NOT_LAW_CONTENT = new Set(['FRONTMATTER.md']);

function readIfFile(path: string): string | null {
  try {
    if (!statSync(path).isFile()) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function isUserManaged(text: string): boolean {
  const { frontmatter } = parseFrontmatter(text);
  return (frontmatter['managed-by'] ?? frontmatter['managed_by'] ?? '').trim().toLowerCase() === 'user';
}

/** Every `*.md` under `dir`, vault-relative, sorted; empty when absent. */
function walkMd(root: string, rel: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(root, rel)).sort();
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const path = `${rel}/${name}`;
    let isDir = false;
    try {
      isDir = statSync(join(root, path)).isDirectory();
    } catch {
      continue;
    }
    if (isDir) out.push(...walkMd(root, path));
    else if (name.endsWith('.md')) out.push(path);
  }
  return out;
}

function groupOf(group: ContentGroup): 'law' | 'practice' {
  return group === 'law' ? 'law' : 'practice';
}

function areaOf(vaultPath: string, group: ContentGroup): string {
  if (group === 'law') return vaultPath.split('/')[1] ?? '';
  return group;
}

export function contentStatus(deps: UpdateDeps): ContentStatus {
  const cfg = readVaultConfig(deps.vaultRoot);
  const state = readContentState(deps.vaultRoot);
  const received = state?.files ?? {};
  const items: ContentItem[] = [];
  const shippedVaultPaths = new Set<string>();

  for (const placement of PLACEMENTS) {
    const group = groupOf(placement.group);
    for (const shipped of deps.content.list(placement.from)) {
      const rel = `${placement.to}/${shipped.slice(placement.from.length + 1)}`;
      shippedVaultPaths.add(rel);
      const area = areaOf(rel, placement.group);
      const shippedText = deps.content.read(shipped);
      const shippedHash = bodyHash(shippedText);
      const vaultText = readIfFile(join(deps.vaultRoot, rel));
      const lastHash = received[rel]?.hash;
      const base = { path: rel, shipped, group, area };

      if (group === 'law') {
        if (cfg.lawManagement === 'user') {
          items.push({ ...base, status: 'user-modified', reason: 'law-management', applicable: false });
          continue;
        }
        if (vaultText === null) {
          items.push({ ...base, status: 'missing', applicable: true });
          continue;
        }
        if (isUserManaged(vaultText)) {
          items.push({ ...base, status: 'user-modified', reason: 'managed-by', applicable: false });
          continue;
        }
        const vaultHash = bodyHash(vaultText);
        if (vaultHash === shippedHash) {
          items.push({ ...base, status: 'current', applicable: false });
        } else if (lastHash !== undefined && vaultHash === lastHash) {
          items.push({ ...base, status: 'update-available', applicable: true });
        } else {
          items.push({ ...base, status: 'user-modified', reason: lastHash === undefined ? 'no-baseline' : 'edited', applicable: false });
        }
        continue;
      }

      // Practice.
      if (vaultText === null) {
        items.push({ ...base, status: 'missing', applicable: true });
        continue;
      }
      if (lastHash === undefined) {
        // No record of what was received: the only honest comparison is the
        // vault copy, framed as such.
        if (bodyHash(vaultText) === shippedHash) items.push({ ...base, status: 'current', applicable: false });
        else {
          items.push({
            ...base,
            status: 'upstream-changed',
            baseline: 'vault',
            diff: unifiedDiff(vaultText, shippedText, { from: `${rel} (your copy)`, to: `${shipped} (shipped)` }),
            applicable: false,
          });
        }
        continue;
      }
      if (shippedHash === lastHash) {
        items.push({ ...base, status: 'current', applicable: false });
        continue;
      }
      const snapshot = readReceivedSnapshot(deps.vaultRoot, rel);
      items.push({
        ...base,
        status: 'upstream-changed',
        baseline: snapshot === null ? 'vault' : 'received',
        diff: unifiedDiff(snapshot ?? vaultText, shippedText, {
          from: snapshot === null ? `${rel} (your copy)` : `${rel} (as received)`,
          to: `${shipped} (shipped)`,
        }),
        applicable: false,
      });
    }
  }

  // Vault-only law: the user's own areas and files. Never touched.
  if (cfg.lawManagement !== 'user') {
    for (const rel of walkMd(deps.vaultRoot, 'law')) {
      const name = rel.slice(rel.lastIndexOf('/') + 1);
      if (NOT_LAW_CONTENT.has(name) || shippedVaultPaths.has(rel)) continue;
      items.push({ path: rel, shipped: null, group: 'law', area: areaOf(rel, 'law'), status: 'vault-only', applicable: false });
    }
  }

  items.sort((a, b) => a.path.localeCompare(b.path));
  const counts: Record<ItemStatus, number> = { current: 0, 'update-available': 0, 'user-modified': 0, 'vault-only': 0, missing: 0, 'upstream-changed': 0 };
  for (const item of items) counts[item.status] += 1;

  return {
    shippedVersion: deps.shippedVersion ?? MANIFEST.version,
    vaultVersion: state?.version ?? null,
    receivedAt: state?.receivedAt ?? null,
    lawManagement: cfg.lawManagement,
    autoApplyLawUpdates: cfg.autoApplyLawUpdates,
    items,
    counts,
  };
}

export interface ApplyResult {
  applied: string[];
  /** Paths that were applicable when asked but had nothing to write (a
   * second click, a race with auto-apply). */
  skipped: string[];
}

/**
 * Writes the chosen items — and only items the rules allow. One refused
 * path refuses the whole call before anything is written, so a client that
 * asked for a user-modified file learns it rather than getting a partial
 * apply it did not ask for.
 */
export function applyUpdates(deps: UpdateDeps, paths: string[]): ApplyResult {
  const status = contentStatus(deps);
  const byPath = new Map(status.items.map(item => [item.path, item]));
  const refused = paths.filter(p => !(byPath.get(p)?.applicable ?? false));
  if (refused.length > 0) {
    throw new UpdateError(`not applicable: ${refused.join(', ')} — only law updates and missing files can be applied; user-modified and practice files are yours`, refused);
  }
  const now = deps.now ?? (() => new Date());
  const state: ContentState = readContentState(deps.vaultRoot) ?? { version: status.shippedVersion, receivedAt: now().toISOString(), files: {} };
  const applied: string[] = [];
  const skipped: string[] = [];
  for (const path of [...new Set(paths)]) {
    const item = byPath.get(path)!;
    if (item.shipped === null) {
      skipped.push(path);
      continue;
    }
    const text = deps.content.read(item.shipped);
    const target = join(deps.vaultRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
    state.files[path] = { hash: bodyHash(text), from: item.shipped };
    if (item.group === 'practice') writeReceivedSnapshot(deps.vaultRoot, path, text);
    applied.push(path);
  }
  state.version = status.shippedVersion;
  state.receivedAt = now().toISOString();
  writeContentState(deps.vaultRoot, state);
  return { applied, skipped };
}

/**
 * `auto_apply_law_updates: true`: every law `update-available` item, at
 * serve start, with no one asked. Returns what it wrote (empty when the
 * flag is off or nothing was pending). User-modified files are never in
 * the applicable set, so they are never touched here either.
 */
export function autoApplyLawUpdates(deps: UpdateDeps): ApplyResult {
  const status = contentStatus(deps);
  if (!status.autoApplyLawUpdates) return { applied: [], skipped: [] };
  const pending = status.items.filter(item => item.group === 'law' && item.status === 'update-available').map(item => item.path);
  if (pending.length === 0) return { applied: [], skipped: [] };
  return applyUpdates(deps, pending);
}

/** A vault that predates the runtime's content state has no baseline; the
 * status says so per item. This helper answers the one question a caller
 * asks before offering updates at all. */
export function hasContentState(vaultRoot: string): boolean {
  return existsSync(join(vaultRoot, '.counsel', 'content-state.json'));
}

const STATUS_WORDS: Record<ItemStatus, string> = {
  current: 'current',
  'update-available': 'update available',
  'user-modified': 'yours — left alone',
  'vault-only': 'yours — not shipped',
  missing: 'new — can be added',
  'upstream-changed': 'changed upstream — merge by hand',
};

/** The status as the CLI prints it: the ledger, then what applies. */
export function renderContentStatus(status: ContentStatus): string {
  const lines = [
    `Shipped ${status.shippedVersion} · vault received ${status.vaultVersion ?? 'unknown (no content state; a vault set up before the runtime kept one)'}`,
    status.lawManagement === 'user' ? 'law_management: user — law is yours; the runtime never syncs it' : '',
    '',
  ].filter(l => l !== undefined);
  const interesting = status.items.filter(i => i.status !== 'current');
  if (interesting.length === 0) lines.push('Everything is current.');
  for (const item of interesting) {
    lines.push(`${item.path.padEnd(52)} ${STATUS_WORDS[item.status]}${item.reason !== undefined ? ` (${item.reason})` : ''}`);
    if (item.diff !== undefined) lines.push(...item.diff.split('\n').map(l => `    ${l}`));
  }
  const applicable = status.items.filter(i => i.applicable).length;
  lines.push('', `${status.counts.current} current · ${status.counts['update-available']} updates · ${status.counts.missing} new · ${status.counts['user-modified']} yours · ${status.counts['upstream-changed']} to merge by hand · ${applicable} applicable`);
  return lines.filter(l => l !== '' || true).join('\n') + '\n';
}
