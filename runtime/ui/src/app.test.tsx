import './test/dom';

import { describe, expect, test } from 'bun:test';
import { parseHash, routeFromHash, vaultPathFromHash } from './app';

/**
 * The fragment router, which is the linchpin of the vault surface.
 *
 * It is tested as three pure functions rather than through a render because
 * the defect it exists to fix is a pure-string one: the previous matcher
 * compared the WHOLE fragment against `/vault`, so `#/vault?path=x` — the
 * shape every proposal-card link and every tree click produces — matched
 * nothing and fell through to chat. Every case below would have caught it.
 */
describe('parseHash', () => {
  test('an empty fragment and the home route are chat', () => {
    expect(routeFromHash('')).toBe('chat');
    expect(routeFromHash('#')).toBe('chat');
    expect(routeFromHash('#/')).toBe('chat');
  });

  test('a bare surface route is that surface', () => {
    expect(routeFromHash('#/vault')).toBe('vault');
    expect(routeFromHash('#/settings')).toBe('settings');
  });

  test('a query on the fragment does NOT send the vault to chat', () => {
    // The regression this router was rewritten for.
    expect(routeFromHash('#/vault?path=practice/x.md')).toBe('vault');
    expect(routeFromHash('#/settings?anything=1')).toBe('settings');
  });

  test('a leading # is optional — the fragment arrives both ways', () => {
    expect(routeFromHash('/vault?path=a.md')).toBe('vault');
  });

  test('an unknown route falls back to chat rather than a blank page', () => {
    expect(routeFromHash('#/nope')).toBe('chat');
    expect(routeFromHash('#/vaults')).toBe('chat');
    expect(routeFromHash('#token=abc')).toBe('chat');
  });

  test('a sub-path under a surface stays on that surface', () => {
    expect(routeFromHash('#/vault/anything')).toBe('vault');
    expect(routeFromHash('#/settings/providers')).toBe('settings');
  });

  test('the params come back parsed, and only from the query half', () => {
    const { route, params } = parseHash('#/vault?path=a.md&other=1');
    expect(route).toBe('vault');
    expect(params.get('path')).toBe('a.md');
    expect(params.get('other')).toBe('1');
    expect(parseHash('#/vault').params.get('path')).toBeNull();
  });
});

describe('vaultPathFromHash', () => {
  test('reads the file the fragment names', () => {
    expect(vaultPathFromHash('#/vault?path=practice/x.md')).toBe('practice/x.md');
  });

  test('decodes what the tree and the proposal card encoded', () => {
    // The exact round trip: `Tree`/`ProposalCard` write the hash with
    // `encodeURIComponent`, so the slashes arrive as `%2F` and a space or a
    // `#` in a filename must survive both directions.
    for (const path of ['matters/a/b.md', 'matters/Acme Corp/notes.md', 'matters/re #12.md', 'matters/a&b.md']) {
      expect(vaultPathFromHash(`#/vault?path=${encodeURIComponent(path)}`)).toBe(path);
    }
  });

  test('no path, an empty path, and a non-vault route are all "nothing open"', () => {
    expect(vaultPathFromHash('#/vault')).toBeNull();
    expect(vaultPathFromHash('#/vault?path=')).toBeNull();
    expect(vaultPathFromHash('#/vault?other=1')).toBeNull();
    expect(vaultPathFromHash('#/')).toBeNull();
    // A `path` on another surface is not a vault path.
    expect(vaultPathFromHash('#/settings?path=x.md')).toBeNull();
  });
});
