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
