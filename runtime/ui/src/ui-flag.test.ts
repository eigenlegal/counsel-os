import './test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { bootstrapToken, clearToken, TOKEN_KEY } from './api/token';
import { bootstrapUiFlag, isSessionOnly, onUiFlagChange, readUiFlag, setUiFlag, stripUiParam, UI_FLAG_KEY } from './ui-flag';

/**
 * A tab whose storage refuses writes (Safari private mode, blocked site
 * data). `spyOn` cannot express this: happy-dom's `localStorage` is a Proxy
 * that ignores assignment to a method name, and its class-method binder has
 * already pinned an own, bound `setItem` on the instance, so a spy on
 * `Storage.prototype` is shadowed too. `defineProperty` goes through the
 * Proxy's own trap, which both replaces the method and stops the rebinding.
 */
function blockWrites(): () => void {
  const original = localStorage.setItem;
  const swap = (value: unknown): void => {
    Object.defineProperty(localStorage, 'setItem', { configurable: true, writable: true, value });
  };
  swap(() => {
    throw new Error('blocked');
  });
  return () => swap(original);
}

afterEach(() => {
  // `setUiFlag('v2')` FIRST, then clear: v2 is the default, so setting it
  // removes the key and drops the module's session copy. Clearing first and
  // setting after would leave `'v1'` stored and every later test reading the
  // wrong default.
  setUiFlag('v2');
  localStorage.clear();
  clearToken();
  sessionStorage.clear();
  history.replaceState(null, '', '/#/');
});

describe('readUiFlag', () => {
  test('nothing stored and no fragment is v2 — the default since 2026-08-30', () => {
    expect(readUiFlag()).toBe('v2');
  });

  test('a stored v1 is v1', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    expect(readUiFlag()).toBe('v1');
  });

  test('a stored v2 is still v2 — tabs that opted in early keep working', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v2');
    expect(readUiFlag()).toBe('v2');
  });

  test('a stored value that names neither design is the default', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v3');
    expect(readUiFlag()).toBe('v2');
  });

  test('is pure — a fragment it has not been handed changes nothing', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    history.replaceState(null, '', '/#/?ui=v2');
    expect(readUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/?ui=v2');
  });
});

describe('bootstrapUiFlag', () => {
  test('?ui=v1 in the fragment wins for this load, is persisted, and leaves the fragment', () => {
    history.replaceState(null, '', '/#/?ui=v1');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v1');
    expect(location.hash).toBe('#/');
  });

  test('?ui=v2 is obeyed too, and persists as the absent key the default is', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    history.replaceState(null, '', '/#/?ui=v2');
    expect(bootstrapUiFlag()).toBe('v2');
    // Nothing stored: v2 is what an untouched browser gets, so the choice is
    // recorded by REMOVING the opt-out, not by writing the default down.
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();
    expect(location.hash).toBe('#/');
  });

  test('a fragment with other params keeps them', () => {
    history.replaceState(null, '', '/#/vault?path=a.md&ui=v1');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/vault?path=a.md');
  });

  test('a ui value that names neither design is dropped, not obeyed and not left behind', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    history.replaceState(null, '', '/#/settings?ui=v3');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/settings');
  });

  test('the &-pair form a reader types after the printed URL is obeyed', () => {
    history.replaceState(null, '', '/#ui=v1');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v1');
    // Nothing of the flag is left in the address bar.
    expect(location.hash).toBe('');
  });

  test('a bare route is not read as pairs', () => {
    history.replaceState(null, '', '/#/vault');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(location.hash).toBe('#/vault');
  });

  test('no ui param leaves the fragment and the stored choice alone', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    history.replaceState(null, '', '/#/vault?path=a.md');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/vault?path=a.md');
  });
});

describe('setUiFlag', () => {
  test('v1 stores the key, v2 removes it, and listeners hear both', () => {
    const seen: string[] = [];
    const off = onUiFlagChange(flag => seen.push(flag));
    expect(setUiFlag('v1')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v1');
    expect(setUiFlag('v2')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();
    off();
    setUiFlag('v1');
    expect(seen).toEqual(['v1', 'v2']);
  });

  test('blocked storage still switches for the session and reports it', () => {
    const unblock = blockWrites();
    try {
      expect(setUiFlag('v1')).toEqual({ persisted: false });
      expect(readUiFlag()).toBe('v1');
      // The fact outlives the component that caused it — see `isSessionOnly`.
      expect(isSessionOnly()).toBe(true);
    } finally {
      unblock();
    }
    // And a write that lands clears it again.
    expect(setUiFlag('v1')).toEqual({ persisted: true });
    expect(isSessionOnly()).toBe(false);
  });
});

/**
 * The order the page actually runs them in (`main.tsx`): the token is taken
 * out of the fragment first, then the flag is read from what is left. Both
 * forms of the printed URL are tested here, because the one that reads best
 * to a person — `&ui=v1` — is the one that used to be dropped, and the
 * near miss — `?ui=v1` after the token — corrupts the credential.
 *
 * `ui=v1` is now the interesting value: v2 is what the printed URL opens on
 * its own, so the only thing left to ask the URL for is the classic design.
 */
describe('the printed URL with the flag appended', () => {
  test('#token=…&ui=v1 gives the tab its token AND the classic design', () => {
    history.replaceState(null, '', '/#token=abc123&ui=v1');
    expect(bootstrapToken()).toBe('abc123');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('abc123');
    // Neither the credential nor the flag survives in the address bar.
    expect(location.hash).toBe('');
  });

  test('#token=…&/?ui=v1 — the form the e2e types — works too', () => {
    history.replaceState(null, '', '/#token=abc123&/?ui=v1');
    expect(bootstrapToken()).toBe('abc123');
    expect(bootstrapUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/');
  });

  test('#token=…&ui=v2 still works, and still leaves nothing behind', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    history.replaceState(null, '', '/#token=abc123&ui=v2');
    expect(bootstrapToken()).toBe('abc123');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(location.hash).toBe('');
  });

  test('#token=…?ui=v1 is the spelling that eats the token, and is still not obeyed', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v1');
    // The stored opt-out is what makes this readable: the page shows v1
    // because of the KEY, not because of the fragment, which never arrived.
    history.replaceState(null, '', '/#token=abc123?ui=v1');
    // `token=` runs to the end of the pair, so the `?` and everything after
    // it is taken for part of the credential. Documented, not fixed: the
    // fragment is pairs, and a `?` inside one is not a separator.
    expect(bootstrapToken()).toBe('abc123?ui=v1');
    // v1 because of the STORED key — the fragment contributed nothing; it
    // left with the credential.
    expect(bootstrapUiFlag()).toBe('v1');
  });

  test('#token=…?ui=v1 with nothing stored stays on the default', () => {
    history.replaceState(null, '', '/#token=abc123?ui=v1');
    expect(bootstrapToken()).toBe('abc123?ui=v1');
    expect(bootstrapUiFlag()).toBe('v2');
  });
});

describe('stripUiParam', () => {
  test('removes only the ui param', () => {
    expect(stripUiParam('#/?ui=v2')).toBe('/');
    expect(stripUiParam('#/?ui=v1')).toBe('/');
    expect(stripUiParam('#/vault?path=a.md&ui=v1')).toBe('/vault?path=a.md');
    expect(stripUiParam('#/settings')).toBe('/settings');
    expect(stripUiParam('')).toBe('');
  });

  test('removes it from the &-pair form, and keeps every other pair verbatim', () => {
    expect(stripUiParam('#ui=v1')).toBe('');
    expect(stripUiParam('#token=abc&ui=v1')).toBe('token=abc');
    expect(stripUiParam('#/vault?path=a%2Fb.md&ui=v2')).toBe('/vault?path=a%2Fb.md');
  });
});
