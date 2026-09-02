import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDocx, simpleDocx } from '../docx/test/builder';
import { DIFF_LINE_CAP, detectEdits, unifiedDiff, watchMatters } from './edits';
import { readOutcomes } from './store';
import { readWritten, recordWritten, snapshotPath } from './written';

function root(): string {
  const r = mkdtempSync(join(tmpdir(), 'edits-'));
  mkdirSync(join(r, 'matters', 'acme'), { recursive: true });
  return r;
}

const CFG = { mattersPath: 'matters' };
const DAY1 = new Date('2026-09-02T10:00:00.000Z');
const DAY1_LATER = new Date('2026-09-02T18:00:00.000Z');
const DAY2 = new Date('2026-09-03T09:00:00.000Z');

function edits(r: string) {
  return readOutcomes(r, { kind: 'file.edited-after-counsel' });
}

describe('unifiedDiff', () => {
  test('a one-line change is one hunk with context, counted', () => {
    const d = unifiedDiff('a\nb\nc\nd\ne\n', 'a\nb\nC\nd\ne\n');
    expect(d.stats).toEqual({ added: 1, removed: 1 });
    expect(d.truncated).toBe(false);
    expect(d.text).toBe('@@ -1,5 +1,5 @@\n a\n b\n-c\n+C\n d\n e\n');
  });

  test('identical texts diff to nothing', () => {
    expect(unifiedDiff('x\n', 'x\n')).toEqual({ text: '', stats: { added: 0, removed: 0 }, truncated: false });
  });

  test('the diff is capped at the line cap and says so', () => {
    const before = Array.from({ length: 600 }, (_, i) => `line ${i}`).join('\n');
    const after = Array.from({ length: 600 }, (_, i) => `LINE ${i}`).join('\n');
    const d = unifiedDiff(before, after);
    expect(d.stats).toEqual({ added: 600, removed: 600 });
    expect(d.truncated).toBe(true);
    expect(d.text.split('\n').length - 1).toBeLessThanOrEqual(DIFF_LINE_CAP);
  });
});

describe('detectEdits (routing-and-evals spec §7, lawyer edits)', () => {
  test('an unchanged file emits nothing; a changed markdown file emits one outcome with the diff and moves the record forward', () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, '# Notes\n\nTerm: five years.\n');
    recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write', runId: 'run-1', threadId: 't-1' });
    expect(detectEdits(r, CFG, { now: DAY1 })).toEqual({ checked: 1, edited: [], refreshed: [], missing: [] });
    expect(edits(r)).toHaveLength(0);

    writeFileSync(p, '# Notes\n\nTerm: three years.\n');
    const report = detectEdits(r, CFG, { now: DAY1 });
    expect(report.edited.map(e => e.path)).toEqual(['matters/acme/notes.md']);
    const [line] = edits(r);
    expect(line).toMatchObject({ kind: 'file.edited-after-counsel', path: 'matters/acme/notes.md', runId: 'run-1', threadId: 't-1', at: DAY1.toISOString() });
    expect(line!.detail).toMatchObject({ format: 'text', kind: 'write', stats: { added: 1, removed: 1 }, truncated: false });
    expect(line!.detail['diff']).toContain('-Term: five years.\n+Term: three years.\n');
    const entry = readWritten(r).files['matters/acme/notes.md']!;
    expect(entry.editedOn).toBe('2026-09-02');
    expect(existsSync(snapshotPath(r, entry.textHash))).toBe(true);
  });

  test('once per file per day: a second edit the same day is neither emitted nor absorbed; the next day reports everything since', () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, 'one\n');
    recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' });
    writeFileSync(p, 'two\n');
    detectEdits(r, CFG, { now: DAY1 });
    writeFileSync(p, 'three\n');
    expect(detectEdits(r, CFG, { now: DAY1_LATER }).edited).toEqual([]);
    expect(edits(r)).toHaveLength(1);
    writeFileSync(p, 'four\n');
    detectEdits(r, CFG, { now: DAY2 });
    const lines = edits(r);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.detail['diff']).toContain('-two\n+four\n');
  });

  test('a Word file compares its accept-all text: a metadata-only change refreshes the hash silently, a text change is an edit', () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'nda.docx');
    writeFileSync(p, simpleDocx('Term of five years.', 'Delaware law.'));
    recordWritten(r, CFG, { path: 'matters/acme/nda.docx', kind: 'artifact' });
    const before = readWritten(r).files['matters/acme/nda.docx']!;
    // Same text, different bytes: a header part Word would add on save.
    writeFileSync(p, buildDocx({ blocks: [{ runs: ['Term of five years.'] }, { runs: ['Delaware law.'] }], header: [{ runs: ['Draft'] }] }));
    expect(detectEdits(r, CFG, { now: DAY1 })).toMatchObject({ edited: [], refreshed: ['matters/acme/nda.docx'] });
    const after = readWritten(r).files['matters/acme/nda.docx']!;
    expect(after.hash).not.toBe(before.hash);
    expect(after.textHash).toBe(before.textHash);
    expect(edits(r)).toHaveLength(0);

    writeFileSync(p, simpleDocx('Term of three years.', 'Delaware law.'));
    detectEdits(r, CFG, { now: DAY1 });
    const [line] = edits(r);
    expect(line!.detail).toMatchObject({ format: 'docx', stats: { added: 1, removed: 1 } });
    expect(line!.detail['diff']).toContain('-Term of five years.\n+Term of three years.\n');
  });

  test('a file that vanished drops its record; `outcomes: off` scans nothing', () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, 'one\n');
    recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' });
    writeFileSync(p, 'two\n');
    expect(detectEdits(r, { ...CFG, outcomes: false }, { now: DAY1 })).toEqual({ checked: 0, edited: [], refreshed: [], missing: [] });
    const { rmSync } = require('node:fs') as typeof import('node:fs');
    rmSync(p);
    expect(detectEdits(r, CFG, { now: DAY1 }).missing).toEqual(['matters/acme/notes.md']);
    expect(readWritten(r).files).toEqual({});
  });

  test('the matters watcher scans after a debounce and can be closed', async () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, 'one\n');
    recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' });
    const scans: number[] = [];
    const watcher = watchMatters(r, CFG, { debounceMs: 40, onScan: report => scans.push(report.edited.length) });
    expect(watcher.active).toBe(true);
    await Bun.sleep(20);
    writeFileSync(p, 'two\n');
    const deadline = Date.now() + 3000;
    while (scans.length === 0 && Date.now() < deadline) await Bun.sleep(25);
    watcher.close();
    expect(scans).toEqual([1]);
    expect(edits(r)).toHaveLength(1);
    expect(watchMatters(join(r, 'nowhere'), CFG).active).toBe(false);
  });

  test('the watcher reads the `outcomes` switch at scan time, so turning the record off needs no restart', async () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, 'one\n');
    recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' });
    let outcomes = true;
    const scans: number[] = [];
    const watcher = watchMatters(r, () => ({ ...CFG, outcomes }), { debounceMs: 40, onScan: report => scans.push(report.checked) });
    expect(watcher.active).toBe(true);
    outcomes = false;
    await Bun.sleep(20);
    writeFileSync(p, 'two\n');
    const deadline = Date.now() + 3000;
    while (scans.length === 0 && Date.now() < deadline) await Bun.sleep(25);
    watcher.close();
    expect(scans).toEqual([0]);
    expect(edits(r)).toHaveLength(0);
  });
});
