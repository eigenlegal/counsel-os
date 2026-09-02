/**
 * Edit detection (routing-and-evals spec §7, "lawyer edits"): every file in
 * the written record is compared with what is on disk. A change to the text
 * is the lawyer's edit and becomes one `file.edited-after-counsel` outcome
 * per file per day — the unified diff against counsel's version, capped —
 * and the record moves forward to the lawyer's version. A Word file that
 * changed bytes but not accept-all text (Word re-saved it) only refreshes
 * the hash. Runs at serve start, from the doctor, from retro evidence, and
 * from a light watcher on the matters folder.
 */
import { existsSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import type { VaultConfig } from '../vault/resolve-root';
import { appendOutcome, outcomesEnabled } from './store';
import { SNAPSHOT_CAP_BYTES, entryFor, readWritten, removeSnapshot, saveSnapshot, sha256, snapshotPath, textOfFile, writeWritten, type WrittenEntry } from './written';

/** The most lines an outcome's diff carries. */
export const DIFF_LINE_CAP = 400;
/** Above this many lines a side, the diff is prefix/suffix only. */
const LCS_LINE_CAP = 3000;
const CONTEXT = 3;

export interface DiffResult {
  text: string;
  stats: { added: number; removed: number };
  truncated: boolean;
}

type Op = { kind: ' ' | '-' | '+'; line: string };

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** The edit script between two line lists: common prefix and suffix
 * trimmed, then an LCS over the middle (or a plain replace when the middle
 * is too large to align). */
function editScript(a: string[], b: string[]): Op[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const ops: Op[] = a.slice(0, start).map(line => ({ kind: ' ', line }));
  if (midA.length > LCS_LINE_CAP || midB.length > LCS_LINE_CAP) {
    for (const line of midA) ops.push({ kind: '-', line });
    for (const line of midB) ops.push({ kind: '+', line });
  } else {
    // LCS lengths, then a walk back from the corner.
    const n = midA.length;
    const m = midB.length;
    const width = m + 1;
    const table = new Uint16Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        table[i * width + j] = midA[i] === midB[j] ? table[(i + 1) * width + j + 1]! + 1 : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        ops.push({ kind: ' ', line: midA[i]! });
        i += 1;
        j += 1;
      } else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) {
        ops.push({ kind: '-', line: midA[i]! });
        i += 1;
      } else {
        ops.push({ kind: '+', line: midB[j]! });
        j += 1;
      }
    }
    for (; i < n; i += 1) ops.push({ kind: '-', line: midA[i]! });
    for (; j < m; j += 1) ops.push({ kind: '+', line: midB[j]! });
  }
  for (const line of a.slice(endA)) ops.push({ kind: ' ', line });
  return ops;
}

/** A unified diff (hunks with `CONTEXT` lines, no file header), its stats,
 * and whether the text was cut at `cap` lines. */
export function unifiedDiff(before: string, after: string, cap: number = DIFF_LINE_CAP): DiffResult {
  const ops = editScript(splitLines(before), splitLines(after));
  const stats = { added: ops.filter(o => o.kind === '+').length, removed: ops.filter(o => o.kind === '-').length };
  if (stats.added === 0 && stats.removed === 0) return { text: '', stats, truncated: false };

  // Hunks: runs of changes with context, merged when the context overlaps.
  const changed = ops.map((o, i) => (o.kind === ' ' ? -1 : i)).filter(i => i >= 0);
  const hunks: Array<{ from: number; to: number }> = [];
  for (const i of changed) {
    const from = Math.max(0, i - CONTEXT);
    const to = Math.min(ops.length, i + CONTEXT + 1);
    const last = hunks[hunks.length - 1];
    if (last !== undefined && from <= last.to) last.to = to;
    else hunks.push({ from, to });
  }
  const out: string[] = [];
  let truncated = false;
  let oldLine = 1;
  let newLine = 1;
  let cursor = 0;
  for (const h of hunks) {
    for (; cursor < h.from; cursor += 1) {
      const op = ops[cursor]!;
      if (op.kind !== '+') oldLine += 1;
      if (op.kind !== '-') newLine += 1;
    }
    const slice = ops.slice(h.from, h.to);
    const oldCount = slice.filter(o => o.kind !== '+').length;
    const newCount = slice.filter(o => o.kind !== '-').length;
    const header = `@@ -${oldLine},${oldCount} +${newLine},${newCount} @@`;
    if (out.length + 1 + slice.length > cap) {
      truncated = true;
      const room = cap - out.length - 1;
      if (room > 0) {
        out.push(header);
        for (const op of slice.slice(0, room)) out.push(`${op.kind}${op.line}`);
      }
      break;
    }
    out.push(header);
    for (const op of slice) out.push(`${op.kind}${op.line}`);
    for (; cursor < h.to; cursor += 1) {
      const op = ops[cursor]!;
      if (op.kind !== '+') oldLine += 1;
      if (op.kind !== '-') newLine += 1;
    }
  }
  return { text: out.length === 0 ? '' : `${out.join('\n')}\n`, stats, truncated };
}

export interface EditReport {
  checked: number;
  edited: Array<{ path: string; format: WrittenEntry['format']; stats: DiffResult['stats'] | null; truncated: boolean }>;
  /** Byte change, same text: the record's hash was refreshed. */
  refreshed: string[];
  /** Recorded files no longer on disk: their records were dropped. */
  missing: string[];
}

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The scan. Synchronous and cheap when nothing changed (one hash per
 * recorded file). Writes only under `.counsel/`: the outcomes record and
 * the written record. Nothing when `outcomes: off`.
 */
export function detectEdits(vaultRoot: string, cfg: Pick<VaultConfig, 'mattersPath' | 'outcomes'>, opts: { now?: Date } = {}): EditReport {
  const report: EditReport = { checked: 0, edited: [], refreshed: [], missing: [] };
  if (!outcomesEnabled(cfg)) return report;
  const now = opts.now ?? new Date();
  const today = utcDay(now);
  const file = readWritten(vaultRoot);
  let dirty = false;
  const stale: string[] = [];

  for (const [path, entry] of Object.entries(file.files)) {
    const abs = join(vaultRoot, path);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      delete file.files[path];
      stale.push(entry.textHash);
      report.missing.push(path);
      dirty = true;
      continue;
    }
    report.checked += 1;
    const bytes = readFileSync(abs);
    const hash = sha256(bytes);
    if (hash === entry.hash) continue;

    let text: string | null = null;
    let textHash = hash;
    const tooBig = bytes.byteLength > SNAPSHOT_CAP_BYTES;
    if (!tooBig) {
      try {
        text = textOfFile(bytes, path);
        textHash = sha256(text);
      } catch {
        // A Word file mid-save, or one that is no longer a package: leave the
        // record alone and look again next time.
        continue;
      }
    }
    if (textHash === entry.textHash) {
      file.files[path] = { ...entry, hash };
      report.refreshed.push(path);
      dirty = true;
      continue;
    }
    // The lawyer's edit. Once per file per day: a repeat today is left for
    // tomorrow's line, which then covers everything since the last one.
    if (entry.editedOn === today) continue;

    const snapshot = snapshotPath(vaultRoot, entry.textHash);
    const diff = text !== null && existsSync(snapshot) ? unifiedDiff(readFileSync(snapshot, 'utf8'), text) : null;
    appendOutcome(vaultRoot, cfg, {
      at: now.toISOString(),
      kind: 'file.edited-after-counsel',
      path,
      ...(entry.runId === undefined ? {} : { runId: entry.runId }),
      ...(entry.threadId === undefined ? {} : { threadId: entry.threadId }),
      detail: {
        format: entry.format,
        kind: entry.kind,
        writtenAt: entry.at,
        stats: diff === null ? null : diff.stats,
        diff: diff === null ? null : diff.text,
        truncated: diff === null ? false : diff.truncated,
      },
    });
    report.edited.push({ path, format: entry.format, stats: diff === null ? null : diff.stats, truncated: diff === null ? false : diff.truncated });
    const next = entryFor(bytes, { path, kind: entry.kind, at: entry.at, editedOn: today, ...(entry.runId === undefined ? {} : { runId: entry.runId }), ...(entry.threadId === undefined ? {} : { threadId: entry.threadId }) });
    file.files[path] = next;
    saveSnapshot(vaultRoot, bytes, path, next);
    stale.push(entry.textHash);
    dirty = true;
  }

  if (dirty) {
    writeWritten(vaultRoot, file);
    for (const h of stale) removeSnapshot(vaultRoot, file, h);
  }
  return report;
}

export interface MattersWatcher {
  /** False when nothing is watched: the folder is missing, or the platform
   * refused a watch. The `outcomes` switch is read at scan time instead, so
   * flipping it in Settings needs no restart. */
  active: boolean;
  close(): void;
}

type EditConfig = Pick<VaultConfig, 'mattersPath' | 'outcomes'>;

/**
 * A light watcher on the matters folder: any change schedules one scan
 * after `debounceMs` of quiet (default 5 s). Never throws — a platform
 * without recursive watching just leaves the start-time scan and the
 * doctor's. `cfg` may be a getter, read fresh at every scan.
 */
export function watchMatters(
  vaultRoot: string,
  cfg: EditConfig | (() => EditConfig),
  opts: { debounceMs?: number; onScan?: (report: EditReport) => void; onError?: (message: string) => void } = {},
): MattersWatcher {
  const inactive: MattersWatcher = { active: false, close: () => undefined };
  const config = typeof cfg === 'function' ? cfg : () => cfg;
  const dir = join(vaultRoot, config().mattersPath);
  if (!existsSync(dir)) return inactive;
  let watcher: FSWatcher;
  try {
    watcher = watch(dir, { recursive: true });
  } catch (err) {
    opts.onError?.(err instanceof Error ? err.message : String(err));
    return inactive;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const scan = (): void => {
    timer = null;
    if (closed) return;
    try {
      const report = detectEdits(vaultRoot, config());
      opts.onScan?.(report);
    } catch (err) {
      opts.onError?.(err instanceof Error ? err.message : String(err));
    }
  };
  watcher.on('change', () => {
    if (closed) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(scan, opts.debounceMs ?? 5000);
  });
  watcher.on('error', err => {
    opts.onError?.(err instanceof Error ? err.message : String(err));
  });
  // The watch must not keep a process alive that is otherwise done.
  watcher.unref?.();
  return {
    active: true,
    close: () => {
      closed = true;
      if (timer !== null) clearTimeout(timer);
      watcher.close();
    },
  };
}
