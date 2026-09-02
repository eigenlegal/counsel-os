import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleDocx } from '../docx/test/builder';
import { dropWritten, readWritten, recordWritten, snapshotPath, textOfFile, writtenPath } from './written';

function root(): string {
  const r = mkdtempSync(join(tmpdir(), 'written-'));
  mkdirSync(join(r, 'matters', 'acme'), { recursive: true });
  return r;
}

const CFG = { mattersPath: 'matters' };

describe('the written-file record (routing-and-evals spec §7, lawyer edits)', () => {
  test('recording a markdown file keeps its hash, its text hash, and a snapshot, owner-only', () => {
    const r = root();
    writeFileSync(join(r, 'matters', 'acme', 'notes.md'), '# Notes\n\nCounsel wrote this.\n');
    const entry = recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write', runId: 'run-1', threadId: 't-1', at: '2026-09-02T10:00:00.000Z' });
    expect(entry).not.toBeNull();
    expect(entry!.format).toBe('text');
    expect(entry!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(entry!.textHash).toBe(entry!.hash);
    const file = readWritten(r);
    expect(file.files['matters/acme/notes.md']).toEqual(entry!);
    expect(readFileSync(snapshotPath(r, entry!.textHash), 'utf8')).toBe('# Notes\n\nCounsel wrote this.\n');
    if (process.platform !== 'win32') {
      expect(statSync(writtenPath(r)).mode & 0o777).toBe(0o600);
      expect(statSync(snapshotPath(r, entry!.textHash)).mode & 0o777).toBe(0o600);
    }
  });

  test('a Word file is recorded by its bytes and its accept-all text', () => {
    const r = root();
    const bytes = simpleDocx('Term of five years.', 'Governing law: Delaware.');
    writeFileSync(join(r, 'matters', 'acme', 'nda.docx'), bytes);
    const entry = recordWritten(r, CFG, { path: 'matters/acme/nda.docx', kind: 'artifact' });
    expect(entry!.format).toBe('docx');
    expect(entry!.textHash).not.toBe(entry!.hash);
    expect(readFileSync(snapshotPath(r, entry!.textHash), 'utf8')).toBe('Term of five years.\nGoverning law: Delaware.\n');
    expect(textOfFile(bytes, 'matters/acme/nda.docx')).toBe('Term of five years.\nGoverning law: Delaware.\n');
  });

  test('only files under the matters folder are recorded; the record is off with `outcomes: off`; a missing file records nothing', () => {
    const r = root();
    mkdirSync(join(r, 'entities'), { recursive: true });
    writeFileSync(join(r, 'entities', 'acme.md'), '# Acme\n');
    expect(recordWritten(r, CFG, { path: 'entities/acme.md', kind: 'proposal' })).toBeNull();
    writeFileSync(join(r, 'matters', 'acme', 'x.md'), 'x\n');
    expect(recordWritten(r, { ...CFG, outcomes: false }, { path: 'matters/acme/x.md', kind: 'write' })).toBeNull();
    expect(recordWritten(r, CFG, { path: 'matters/acme/none.md', kind: 'write' })).toBeNull();
    expect(existsSync(writtenPath(r))).toBe(false);
  });

  test('re-recording a path replaces its entry and removes the old snapshot; dropping removes both', () => {
    const r = root();
    const p = join(r, 'matters', 'acme', 'notes.md');
    writeFileSync(p, 'one\n');
    const first = recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' })!;
    writeFileSync(p, 'two\n');
    const second = recordWritten(r, CFG, { path: 'matters/acme/notes.md', kind: 'write' })!;
    expect(existsSync(snapshotPath(r, first.textHash))).toBe(false);
    expect(existsSync(snapshotPath(r, second.textHash))).toBe(true);
    expect(Object.keys(readWritten(r).files)).toEqual(['matters/acme/notes.md']);
    dropWritten(r, 'matters/acme/notes.md');
    expect(readWritten(r).files).toEqual({});
    expect(existsSync(snapshotPath(r, second.textHash))).toBe(false);
  });

  test('a corrupt record reads as empty', () => {
    const r = root();
    mkdirSync(join(r, '.counsel'), { recursive: true });
    writeFileSync(writtenPath(r), '{not json');
    expect(readWritten(r)).toEqual({ version: 1, files: {} });
  });
});
