import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRetroState, retroStatePath, writeRetroState } from './state';

function vault(): string {
  return mkdtempSync(join(tmpdir(), 'retro-state-'));
}

describe('retro state', () => {
  test('no file is no retro yet', () => {
    expect(readRetroState(vault())).toEqual({});
  });

  test('round-trips, atomically, under .counsel', () => {
    const root = vault();
    const state = { lastRetroAt: '2026-06-01T10:00:00.000Z', threadId: 'abc', period: { from: null, to: '2026-06-01T10:00:00.000Z' } };
    writeRetroState(root, state);
    expect(retroStatePath(root)).toBe(join(root, '.counsel', 'retro.json'));
    expect(readRetroState(root)).toEqual(state);
  });

  test('a corrupt or foreign file reads as no retro, never as an error', () => {
    const root = vault();
    mkdirSync(join(root, '.counsel'), { recursive: true });
    writeFileSync(retroStatePath(root), '{not json', 'utf8');
    expect(readRetroState(root)).toEqual({});
    writeFileSync(retroStatePath(root), JSON.stringify({ lastRetroAt: 42, threadId: 'x', period: { from: 1 } }), 'utf8');
    expect(readRetroState(root)).toEqual({ threadId: 'x' });
  });
});
