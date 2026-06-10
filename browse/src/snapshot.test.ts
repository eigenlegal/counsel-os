import { describe, expect, test } from 'bun:test';
import { planSnapshot, parseSnapshotArgs } from './snapshot';

describe('planSnapshot nth() alignment', () => {
  test('duplicates get sequential nth indices; unique elements get null', () => {
    const tree = [
      '- banner:',
      '  - link "Home"',
      '  - link "Docs"',
      '- main:',
      '  - link "Docs"',
    ].join('\n');
    const { items } = planSnapshot(tree, {});
    const docs = items.filter(i => i.role === 'link' && i.name === 'Docs');
    expect(docs.map(d => d.nthIndex)).toEqual([0, 1]);
    const home = items.find(i => i.name === 'Home')!;
    expect(home.nthIndex).toBeNull();
  });

  test('depth-filtered duplicates still count toward nth (regression)', () => {
    // The first "Docs" link sits at depth 3 and is filtered out by -d 1.
    // The surviving top-level "Docs" is the SECOND such link on the page,
    // so its locator must be nth(1) — pre-fix it got nth(0) and clicked
    // the wrong element.
    const tree = [
      '- main:',
      '  - list:',
      '    - listitem:',
      '      - link "Docs"',
      '- link "Docs"',
    ].join('\n');
    const { items } = planSnapshot(tree, { depth: 1 });
    const docs = items.filter(i => i.role === 'link' && i.name === 'Docs');
    expect(docs).toHaveLength(1);
    expect(docs[0]!.nthIndex).toBe(1);
  });

  test('compact-filtered duplicates still count toward nth (regression)', () => {
    const tree = [
      '- generic',
      '- generic: payload',
    ].join('\n');
    const { items } = planSnapshot(tree, { compact: true });
    expect(items).toHaveLength(1);
    expect(items[0]!.nthIndex).toBe(1);
  });

  test('interactive filter skips non-interactive but keeps counting', () => {
    const tree = [
      '- heading "T" [level=1]',
      '- button "Go"',
      '- heading "T" [level=2]',
      '- button "Go"',
    ].join('\n');
    const { items } = planSnapshot(tree, { interactive: true });
    expect(items.some(i => i.role === 'heading')).toBe(false);
    const gos = items.filter(i => i.role === 'button');
    expect(gos.map(g => g.nthIndex)).toEqual([0, 1]);
  });

  test('output lines carry sequential refs', () => {
    const tree = ['- link "A"', '- link "B"'].join('\n');
    const { outputLines } = planSnapshot(tree, {});
    expect(outputLines[0]).toContain('@e1 [link] "A"');
    expect(outputLines[1]).toContain('@e2 [link] "B"');
  });

  test('metadata lines (e.g. /url) are ignored', () => {
    const tree = ['- link "A":', '  - /url: /a'].join('\n');
    const { items } = planSnapshot(tree, {});
    expect(items).toHaveLength(1);
  });
});

describe('parseSnapshotArgs', () => {
  test('parses combined flags', () => {
    const opts = parseSnapshotArgs(['-i', '-d', '2', '-s', '#main']);
    expect(opts.interactive).toBe(true);
    expect(opts.depth).toBe(2);
    expect(opts.selector).toBe('#main');
  });

  test('rejects unknown flags', () => {
    expect(() => parseSnapshotArgs(['--bogus'])).toThrow();
  });
});
