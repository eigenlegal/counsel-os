import { describe, expect, test } from 'bun:test';
import { isTimeoutError, isConnectionError } from './cli';

describe('CLI error classification (Bun error shapes)', () => {
  test('timeout: Bun throws TimeoutError, Node convention is AbortError — both classify', () => {
    expect(isTimeoutError({ name: 'TimeoutError', code: 23 })).toBe(true);
    expect(isTimeoutError({ name: 'AbortError' })).toBe(true);
    expect(isTimeoutError({ name: 'TypeError' })).toBe(false);
    expect(isTimeoutError(undefined)).toBe(false);
  });

  test('connection: Bun uses ConnectionRefused, Node uses ECONNREFUSED — both classify', () => {
    expect(isConnectionError({ code: 'ConnectionRefused', message: 'Unable to connect. Is the computer able to access the url?' })).toBe(true);
    expect(isConnectionError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isConnectionError({ code: 'ECONNRESET' })).toBe(true);
    expect(isConnectionError({ code: 'ConnectionReset' })).toBe(true);
    expect(isConnectionError({ message: 'fetch failed' })).toBe(true);
    expect(isConnectionError({ name: 'TimeoutError' })).toBe(false);
    expect(isConnectionError(undefined)).toBe(false);
  });
});
