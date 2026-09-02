import { z } from 'zod';
import { DEFAULT_TENANT, type Tool, type VaultStore } from '../core/types';
import { daysUntil, parseIsoDate, vaultDocket, type DocketEntry } from '../vault/docket';
import { FsVaultStore } from '../vault/fs-store';
import { readVaultConfig } from '../vault/resolve-root';
import { fsSearch } from '../vault/search';

export interface DocketToolOptions {
  vaultRoot: string;
  /** The vault store, when the caller has one; else a plain one over `vaultRoot`. */
  vault?: VaultStore;
  now?: () => Date;
}

export interface DocketSweepOutput {
  /** The window in days the caller asked for. */
  window: number;
  today: string;
  /** Entries due within the window, overdue ones first. */
  deadlines: Array<DocketEntry & { daysUntil: number }>;
  /** Entries past the window, for the count only. */
  later: number;
  /** Malformed dates the sweep could not read. */
  skipped: number;
}

/**
 * `docket_sweep` in TypeScript (packaging spec §3.3): the same sweep Home's
 * docket runs (`runtime/src/vault/docket.ts`), so the model and the page
 * read one docket. Replaces `scripts/docket_sweep.py`, which resolved off
 * the repo root and could not exist beside a compiled binary.
 */
export function docketSweepTool(opts: DocketToolOptions): Tool<{ days: number }, DocketSweepOutput> {
  return {
    name: 'docket_sweep',
    description:
      'Sweep the vault for upcoming deadlines (read-only): every matter\'s `deadlines:` frontmatter (and a scalar `deadline:`), classified overdue / due within the window / later. Returns {window, today, deadlines[], later, skipped}.',
    inputSchema: z.object({ days: z.number().int().positive().default(60).describe('The window in days.') }),
    platforms: new Set(['macos', 'linux', 'windows', 'hosted']),
    async execute({ days }) {
      const now = (opts.now ?? (() => new Date()))();
      const vault = opts.vault ?? new FsVaultStore(opts.vaultRoot, { search: fsSearch() });
      const view = await vaultDocket(vault, DEFAULT_TENANT, readVaultConfig(opts.vaultRoot), now);
      const deadlines: DocketSweepOutput['deadlines'] = [];
      let later = 0;
      for (const entry of view.deadlines) {
        const date = parseIsoDate(entry.date);
        const until = date === null ? Number.POSITIVE_INFINITY : daysUntil(date, now);
        if (until <= days) deadlines.push({ ...entry, daysUntil: until });
        else later += 1;
      }
      return { window: days, today: now.toISOString().slice(0, 10), deadlines, later, skipped: view.skipped };
    },
  };
}
