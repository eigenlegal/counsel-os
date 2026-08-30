import './../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { createThread, titleFor } from './threads';

const realFetch = globalThis.fetch;

beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'test-token'));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('titleFor', () => {
  test('the first non-empty line, trimmed', () => {
    expect(titleFor('  Check the Acme cap.  \nSecond line.')).toBe('Check the Acme cap.');
    expect(titleFor('\n\nAfter blank lines')).toBe('After blank lines');
  });

  test('cut at 60 characters, no trailing space', () => {
    const long = 'a'.repeat(50) + ' ' + 'b'.repeat(20);
    expect(titleFor(long)).toBe('a'.repeat(50));
    expect(titleFor('x'.repeat(61))).toBe('x'.repeat(60));
  });
});

describe('createThread', () => {
  test('POSTs the title and returns the header', async () => {
    let sent: unknown;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: 't-9', title: 'Hi', createdAt: 'now', updatedAt: 'now', sessions: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const header = await createThread({ title: 'Hi' });
    expect(sent).toEqual({ title: 'Hi' });
    expect(header.id).toBe('t-9');
  });
});
