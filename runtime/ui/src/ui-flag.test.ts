import './test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
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
  localStorage.clear();
  setUiFlag('v1');
  history.replaceState(null, '', '/#/');
});

describe('readUiFlag', () => {
  test('nothing stored and no fragment is v1', () => {
    expect(readUiFlag()).toBe('v1');
  });

  test('a stored v2 is v2', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v2');
    expect(readUiFlag()).toBe('v2');
  });

  test('is pure — a fragment it has not been handed changes nothing', () => {
    history.replaceState(null, '', '/#/?ui=v2');
    expect(readUiFlag()).toBe('v1');
    expect(location.hash).toBe('#/?ui=v2');
  });
});

describe('bootstrapUiFlag', () => {
  test('?ui=v2 in the fragment wins for this load, is persisted, and leaves the fragment', () => {
    history.replaceState(null, '', '/#/?ui=v2');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(location.hash).toBe('#/');
  });

  test('a fragment with other params keeps them', () => {
    history.replaceState(null, '', '/#/vault?path=a.md&ui=v2');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(location.hash).toBe('#/vault?path=a.md');
  });

  test('a ui value that is not v2 is dropped, not obeyed and not left behind', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v2');
    history.replaceState(null, '', '/#/settings?ui=v1');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(location.hash).toBe('#/settings');
  });

  test('no ui param leaves the fragment and the stored choice alone', () => {
    localStorage.setItem(UI_FLAG_KEY, 'v2');
    history.replaceState(null, '', '/#/vault?path=a.md');
    expect(bootstrapUiFlag()).toBe('v2');
    expect(location.hash).toBe('#/vault?path=a.md');
  });
});

describe('setUiFlag', () => {
  test('v2 stores the key, v1 removes it, and listeners hear both', () => {
    const seen: string[] = [];
    const off = onUiFlagChange(flag => seen.push(flag));
    expect(setUiFlag('v2')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(setUiFlag('v1')).toEqual({ persisted: true });
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();
    off();
    setUiFlag('v2');
    expect(seen).toEqual(['v2', 'v1']);
  });

  test('blocked storage still switches for the session and reports it', () => {
    const unblock = blockWrites();
    try {
      expect(setUiFlag('v2')).toEqual({ persisted: false });
      expect(readUiFlag()).toBe('v2');
      // The fact outlives the component that caused it — see `isSessionOnly`.
      expect(isSessionOnly()).toBe(true);
    } finally {
      unblock();
    }
    // And a write that lands clears it again.
    expect(setUiFlag('v2')).toEqual({ persisted: true });
    expect(isSessionOnly()).toBe(false);
  });
});

describe('stripUiParam', () => {
  test('removes only the ui param', () => {
    expect(stripUiParam('#/?ui=v2')).toBe('/');
    expect(stripUiParam('#/vault?path=a.md&ui=v2')).toBe('/vault?path=a.md');
    expect(stripUiParam('#/settings')).toBe('/settings');
    expect(stripUiParam('')).toBe('');
  });
});
