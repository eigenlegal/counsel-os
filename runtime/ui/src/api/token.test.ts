import '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { bootstrapToken, clearToken, getToken, readToken, splitTokenFromHash, TOKEN_KEY, TokenMissingError } from './token';

afterEach(() => {
  clearToken();
  sessionStorage.clear();
  globalThis.history.replaceState(null, '', '/');
});

describe('splitTokenFromHash', () => {
  test('takes the token out of the printed URL and leaves the home route', () => {
    expect(splitTokenFromHash('#token=abc123')).toEqual({ token: 'abc123', rest: '/' });
  });

  test('keeps a route that shares the fragment', () => {
    expect(splitTokenFromHash('#/vault&token=abc123')).toEqual({ token: 'abc123', rest: '/vault' });
  });

  test('reports no token for a plain route', () => {
    expect(splitTokenFromHash('#/settings')).toEqual({ token: null, rest: '/settings' });
  });

  test('decodes a percent-encoded token', () => {
    expect(splitTokenFromHash('#token=a%2Bb').token).toBe('a+b');
  });

  test('a fragment that will not decode does not throw', () => {
    // `decodeURIComponent` throws on a lone `%`; this runs before React
    // renders, so a throw here would be a blank page.
    expect(splitTokenFromHash('#token=%').token).toBe('%');
    expect(splitTokenFromHash('#token=%zz').token).toBe('%zz');
  });
});

describe('bootstrapToken', () => {
  test('stores the token and strips it from the fragment', () => {
    globalThis.history.replaceState(null, '', '/#token=secret-token');

    expect(bootstrapToken()).toBe('secret-token');

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('secret-token');
    expect(globalThis.location.hash).toBe('#/');
    expect(globalThis.location.href).not.toContain('secret-token');
  });

  test('survives a malformed fragment instead of blanking the page', () => {
    globalThis.history.replaceState(null, '', '/#token=%');
    expect(bootstrapToken()).toBe('%');
    expect(globalThis.location.hash).toBe('#/');
  });

  test('leaves a fragment with no token alone', () => {
    globalThis.history.replaceState(null, '', '/#/vault');
    expect(bootstrapToken()).toBeNull();
    expect(globalThis.location.hash).toBe('#/vault');
  });

  test('a reload with no fragment still reads the token this tab stored', () => {
    sessionStorage.setItem(TOKEN_KEY, 'stored-token');
    expect(bootstrapToken()).toBeNull();
    expect(readToken()).toBe('stored-token');
  });
});

describe('getToken', () => {
  test('throws TokenMissingError when this tab never got one', () => {
    expect(() => getToken()).toThrow(TokenMissingError);
  });
});
