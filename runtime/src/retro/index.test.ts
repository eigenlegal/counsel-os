import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadStore } from '../threads/store';
import { DEFAULT_RETRO_CADENCE_DAYS, periodLabel, readRetroState, retroCadenceDays, retroStatus, startRetro } from './index';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const cfg = { retroCadenceDays: undefined } as { retroCadenceDays?: number };

describe('retroCadenceDays', () => {
  test('quarterly by default, config.md overrides', () => {
    expect(retroCadenceDays({})).toBe(DEFAULT_RETRO_CADENCE_DAYS);
    expect(retroCadenceDays({ retroCadenceDays: 60 })).toBe(60);
  });
});

describe('retroStatus', () => {
  test('never run: due once the vault has enough to look back on', () => {
    const small = retroStatus({ state: {}, cfg, counts: { matters: 2, threads: 4 }, now: NOW });
    expect(small.due).toBe(false);
    expect(small.lastRetroAt).toBeNull();
    expect(small.reason).toContain('No retro yet');
    expect(retroStatus({ state: {}, cfg, counts: { matters: 3, threads: 0 }, now: NOW }).due).toBe(true);
    expect(retroStatus({ state: {}, cfg, counts: { matters: 0, threads: 10 }, now: NOW }).due).toBe(true);
  });

  test('last retro inside the cadence: not due, with the next date', () => {
    const s = retroStatus({ state: { lastRetroAt: '2026-06-05T00:00:00.000Z', threadId: 't' }, cfg, counts: { matters: 9, threads: 9 }, now: NOW });
    expect(s.due).toBe(false);
    expect(s.daysSince).toBe(88);
    expect(s.dueAt).toBe('2026-09-03T00:00:00.000Z');
    expect(s.threadId).toBe('t');
    expect(s.reason).toBe('Last retro 88 days ago · next due 2026-09-03');
  });

  test('older than the cadence: due', () => {
    const s = retroStatus({ state: { lastRetroAt: '2026-05-01T00:00:00.000Z' }, cfg, counts: { matters: 0, threads: 0 }, now: NOW });
    expect(s.due).toBe(true);
    expect(s.daysSince).toBe(123);
    expect(s.reason).toBe('Last retro 123 days ago');
    // A shorter cadence moves the line.
    expect(retroStatus({ state: { lastRetroAt: '2026-08-10T00:00:00.000Z' }, cfg: { retroCadenceDays: 14 }, counts: { matters: 0, threads: 0 }, now: NOW }).due).toBe(true);
  });

  test('an unreadable date counts as never', () => {
    expect(retroStatus({ state: { lastRetroAt: 'yesterday' }, cfg, counts: { matters: 5, threads: 0 }, now: NOW }).lastRetroAt).toBeNull();
  });
});

describe('startRetro', () => {
  test('opens a retro thread, records the state, returns the first message', async () => {
    const vaultRoot = mkdtempSync(join(tmpdir(), 'retro-start-'));
    const store = new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'retro-codex-')) });
    const start = await startRetro({ vaultRoot, tenant: 'default', store, now: () => NOW });
    expect(start.title).toBe('Retro · all time · to 2026-09-01');
    expect(start.period).toEqual({ from: null, to: NOW.toISOString() });
    expect(start.message).toContain('all time');
    expect(start.message).toContain('as a proposal');
    const header = await store.header('default', start.threadId);
    expect(header.task).toBe('retro');
    expect(header.title).toBe(start.title);
    expect(readRetroState(vaultRoot)).toEqual({ lastRetroAt: NOW.toISOString(), threadId: start.threadId, period: start.period });

    // The next retro starts where this one ended; an explicit --since wins.
    const later = new Date('2026-12-01T12:00:00.000Z');
    const second = await startRetro({ vaultRoot, tenant: 'default', store, now: () => later });
    expect(second.title).toBe('Retro · 2026-09-01 to 2026-12-01');
    const explicit = await startRetro({ vaultRoot, tenant: 'default', store, now: () => later }, { since: '2026-10-15' });
    expect(explicit.period.from).toBe('2026-10-15T00:00:00.000Z');
    const bad = await startRetro({ vaultRoot, tenant: 'default', store, now: () => later }, { since: 'last tuesday' });
    expect(bad.period.from).toBe(later.toISOString()); // the previous retro's time, not a guess
  });
});

describe('periodLabel', () => {
  test('all time and a dated span', () => {
    expect(periodLabel(null, NOW)).toBe('all time · to 2026-09-01');
    expect(periodLabel('2026-06-01T00:00:00.000Z', NOW)).toBe('2026-06-01 to 2026-09-01');
  });
});
