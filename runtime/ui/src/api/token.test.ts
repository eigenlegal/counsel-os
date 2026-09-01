import '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { bootstrapToken, clearToken, getToken, readToken, splitTokenFromHash, storeToken, TOKEN_KEY, tokenFromPaste, TokenMissingError } from './token';

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

describe('tokenFromPaste', () => {
  const hex = 'a'.repeat(32) + '0123456789abcdef'.repeat(2);

  test('the whole printed URL', () => {
    expect(tokenFromPaste(`http://127.0.0.1:7431/#token=${hex}`)).toBe(hex);
  });

  test('a bare fragment, with or without the hash, and the raw hex', () => {
    expect(tokenFromPaste(`#token=${hex}`)).toBe(hex);
    expect(tokenFromPaste(`token=${hex}`)).toBe(hex);
    expect(tokenFromPaste(hex)).toBe(hex);
  });

  test('surrounding whitespace and upper-case hex are tolerated', () => {
    expect(tokenFromPaste(`  ${hex.toUpperCase()}\n`)).toBe(hex);
  });

  test('anything that is not a 64-hex token is null', () => {
    expect(tokenFromPaste('')).toBeNull();
    expect(tokenFromPaste('   ')).toBeNull();
    expect(tokenFromPaste('http://127.0.0.1:7431/')).toBeNull();
    expect(tokenFromPaste('#token=abc123')).toBeNull();
    expect(tokenFromPaste(hex.slice(0, 63))).toBeNull();
    expect(tokenFromPaste(`${hex}z`)).toBeNull();
    expect(tokenFromPaste('#/vault?path=matters%2Facme.md')).toBeNull();
  });

  test('a route sharing the fragment does not hide the token', () => {
    expect(tokenFromPaste(`http://127.0.0.1:7431/#/vault&token=${hex}`)).toBe(hex);
  });
});

describe('storeToken', () => {
  test('writes the tab store and memory, never the URL', () => {
    globalThis.history.replaceState(null, '', '/#/chat');
    storeToken('f'.repeat(64));
    expect(readToken()).toBe('f'.repeat(64));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('f'.repeat(64));
    expect(globalThis.location.hash).toBe('#/chat');
  });
});
