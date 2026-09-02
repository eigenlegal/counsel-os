import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * `.counsel/retro.json` — when the practice last ran a retro, and in which
 * thread. Runtime bookkeeping, so it lives under `.counsel/` next to the
 * threads and the content state, written through `node:fs` like they are
 * (the vault store refuses that prefix on purpose: no model-reachable tool
 * can touch it).
 */
export interface RetroState {
  /** ISO time the last retro thread was opened. */
  lastRetroAt?: string;
  threadId?: string;
  /** The period that retro covered: `from` is `null` for "all time". */
  period?: { from: string | null; to: string };
}

export function retroStatePath(vaultRoot: string): string {
  return join(vaultRoot, '.counsel', 'retro.json');
}

/** `{}` when there has never been a retro, or the file is unreadable — a
 * corrupt state file must not stop a retro from starting. */
export function readRetroState(vaultRoot: string): RetroState {
  const path = retroStatePath(vaultRoot);
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const rec = parsed as Record<string, unknown>;
    const out: RetroState = {};
    if (typeof rec['lastRetroAt'] === 'string') out.lastRetroAt = rec['lastRetroAt'];
    if (typeof rec['threadId'] === 'string') out.threadId = rec['threadId'];
    const period = rec['period'];
    if (typeof period === 'object' && period !== null) {
      const p = period as Record<string, unknown>;
      if (typeof p['to'] === 'string' && (p['from'] === null || typeof p['from'] === 'string')) {
        out.period = { from: p['from'] as string | null, to: p['to'] };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Atomic: the file is either the old state or the new one. */
export function writeRetroState(vaultRoot: string, state: RetroState): void {
  const path = retroStatePath(vaultRoot);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
}
