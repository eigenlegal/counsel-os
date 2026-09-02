import './test/dom';

import { describe, expect, test } from 'bun:test';
import { parseHash, proposalFromHash, routeFromHash, threadFromHash, vaultPathFromHash } from './app';

/**
 * The fragment router. `#/` became Home in the step-6 redesign (spec §3.1);
 * chat moved under `#/chat`, parameterized by `?thread=` — old `#/`
 * deep-links land on Home, which the spec accepts.
 */
describe('parseHash', () => {
  test('an empty fragment and the root are home', () => {
    expect(routeFromHash('')).toBe('home');
    expect(routeFromHash('#')).toBe('home');
    expect(routeFromHash('#/')).toBe('home');
  });

  test('chat lives under #/chat, with or without a thread', () => {
    expect(routeFromHash('#/chat')).toBe('chat');
    expect(routeFromHash('#/chat?thread=t-1')).toBe('chat');
    expect(routeFromHash('#/chat/anything')).toBe('chat');
  });

  test('a bare surface route is that surface', () => {
    expect(routeFromHash('#/vault')).toBe('vault');
    expect(routeFromHash('#/settings')).toBe('settings');
    expect(routeFromHash('#/models')).toBe('models');
    expect(routeFromHash('#/models?task=review')).toBe('models');
    expect(routeFromHash('#/models/anything')).toBe('models');
  });

  test('a query on the fragment does NOT send the vault to chat', () => {
    expect(routeFromHash('#/vault?path=practice/x.md')).toBe('vault');
    expect(routeFromHash('#/settings?anything=1')).toBe('settings');
  });

  test('a leading # is optional — the fragment arrives both ways', () => {
    expect(routeFromHash('/vault?path=a.md')).toBe('vault');
    expect(routeFromHash('/chat?thread=t-1')).toBe('chat');
  });

  test('an unknown route falls back to home rather than a blank page', () => {
    expect(routeFromHash('#/nope')).toBe('home');
    expect(routeFromHash('#/vaults')).toBe('home');
    expect(routeFromHash('#token=abc')).toBe('home');
  });

  test('the params come back parsed, and only from the query half', () => {
    const { route, params } = parseHash('#/vault?path=a.md&other=1');
    expect(route).toBe('vault');
    expect(params.get('path')).toBe('a.md');
    expect(params.get('other')).toBe('1');
    expect(parseHash('#/vault').params.get('path')).toBeNull();
  });
});

describe('threadFromHash', () => {
  test('reads the thread the chat fragment names', () => {
    expect(threadFromHash('#/chat?thread=t-1')).toBe('t-1');
    expect(threadFromHash(`#/chat?thread=${encodeURIComponent('214e6cd3-01ba-433f-828a-ff75c4c04e80')}`)).toBe(
      '214e6cd3-01ba-433f-828a-ff75c4c04e80',
    );
  });

  test('no thread, an empty thread, and a non-chat route are all null', () => {
    expect(threadFromHash('#/chat')).toBeNull();
    expect(threadFromHash('#/chat?thread=')).toBeNull();
    expect(threadFromHash('#/vault?thread=t-1')).toBeNull();
    expect(threadFromHash('#/')).toBeNull();
  });
});

describe('proposalFromHash', () => {
  test('reads the docket anchor and nothing else', () => {
    expect(proposalFromHash('#/chat?thread=t-1&proposal=p-9')).toBe('p-9');
    expect(proposalFromHash('#/chat?thread=t-1')).toBeNull();
    expect(proposalFromHash('#/vault?proposal=p-9')).toBeNull();
  });
});

describe('vaultPathFromHash', () => {
  test('reads the file the fragment names', () => {
    expect(vaultPathFromHash('#/vault?path=practice/x.md')).toBe('practice/x.md');
  });

  test('decodes what the tree and the proposal card encoded', () => {
    for (const path of ['matters/a/b.md', 'matters/Acme Corp/notes.md', 'matters/re #12.md', 'matters/a&b.md']) {
      expect(vaultPathFromHash(`#/vault?path=${encodeURIComponent(path)}`)).toBe(path);
    }
  });

  test('no path, an empty path, and a non-vault route are all "nothing open"', () => {
    expect(vaultPathFromHash('#/vault')).toBeNull();
    expect(vaultPathFromHash('#/vault?path=')).toBeNull();
    expect(vaultPathFromHash('#/')).toBeNull();
    expect(vaultPathFromHash('#/settings?path=x.md')).toBeNull();
  });
});
