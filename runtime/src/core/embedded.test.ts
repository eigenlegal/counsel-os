import { afterEach, describe, expect, test } from 'bun:test';
import type { ContentSource } from '../content/source';
import { embeddedContent, embeddedExtra, embeddedUi, isCompiled, registerEmbedded, resetEmbeddedForTests } from './embedded';

const fakeContent: ContentSource = {
  kind: 'embedded',
  list: () => ['primitives/read.md'],
  has: p => p === 'primitives/read.md',
  read: () => '# read',
  readBytes: () => new Uint8Array(),
};

afterEach(resetEmbeddedForTests);

describe('the embedded registry', () => {
  test('a checkout has nothing registered and is not compiled', () => {
    expect(embeddedUi()).toBeNull();
    expect(embeddedContent()).toBeNull();
    expect(embeddedExtra('knowledge/law/frontmatter-policy.json')).toBeNull();
    expect(isCompiled()).toBe(false);
  });

  test('the generated entry registers the UI, the content and the extras, and that means compiled', () => {
    registerEmbedded({ ui: { files: { 'index.html': '/$bunfs/root/index.html' } }, content: fakeContent, extras: { 'knowledge/law/frontmatter-policy.json': '/$bunfs/root/policy.json' } });
    expect(embeddedUi()?.files['index.html']).toBe('/$bunfs/root/index.html');
    expect(embeddedContent()?.read('primitives/read.md')).toBe('# read');
    expect(embeddedExtra('knowledge/law/frontmatter-policy.json')).toBe('/$bunfs/root/policy.json');
    expect(isCompiled()).toBe(true);
  });

  test('registering a part leaves the others as they were', () => {
    registerEmbedded({ content: fakeContent });
    registerEmbedded({ extras: { a: '/x' } });
    expect(embeddedContent()).toBe(fakeContent);
    expect(embeddedUi()).toBeNull();
    expect(embeddedExtra('a')).toBe('/x');
  });
});
