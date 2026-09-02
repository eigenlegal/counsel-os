import { describe, expect, test } from 'bun:test';
import { timeoutInWords } from './Health';

describe('timeoutInWords', () => {
  test('whole minutes and seconds read as words; anything else stays in ms', () => {
    expect(timeoutInWords(600_000)).toBe('10 minutes');
    expect(timeoutInWords(60_000)).toBe('1 minute');
    expect(timeoutInWords(45_000)).toBe('45 seconds');
    expect(timeoutInWords(1_500)).toBe('1500 ms');
  });
});
