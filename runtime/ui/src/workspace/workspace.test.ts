import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { href, parseRoute } from './api';

describe('workspace navigation', () => {
  test('empty or unknown routes return to the overview', () => {
    expect(parseRoute('').page).toBe('home');
    expect(parseRoute('#/not-a-route').page).toBe('home');
  });
  test('all standalone surfaces have their own route', () => {
    for (const page of [
      'home',
      'matters',
      'knowledge',
      'references',
      'work',
      'search',
      'settings',
      'imports',
    ] as const)
      expect(parseRoute(href(page)).page).toBe(page);
  });
  test('record and exact revision identity survive navigation', () => {
    const route = parseRoute(href('references', { id: 'source-id', revision: 'revision-id' }));
    expect(route).toEqual({
      page: 'references',
      id: 'source-id',
      revision: 'revision-id',
      query: undefined,
    });
  });
  test('query punctuation and Unicode cannot become fragment parameters', () => {
    const query = '通知 & id=not-a-record # language';
    const route = parseRoute(href('search', { q: query, id: undefined }));
    expect(route.query).toBe(query);
    expect(route.id).toBeUndefined();
  });
  test('revision-only citation links do not require a current parent lookup in the caller', () => {
    expect(parseRoute(href('knowledge', { revision: 'original-version' }))).toEqual({
      page: 'knowledge',
      revision: 'original-version',
      id: undefined,
      query: undefined,
    });
  });
});

function luminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe('workspace accessibility foundation', () => {
  const css = readFileSync(new URL('./workspace.css', import.meta.url), 'utf8');
  const token = (name: string) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1]!;
  test('primary and secondary text meet 4.5:1 on both reading and workspace surfaces', () => {
    for (const ink of [token('ink'), token('muted'), '#5b6e89'])
      for (const background of [token('surface'), token('paper')])
        expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.5);
  });
  test('primary actions and navigation have readable labels', () => {
    expect(contrast('#ffffff', token('blue'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#becddd', token('navy'))).toBeGreaterThanOrEqual(4.5);
  });
  test('reduced motion and visible focus are part of the stylesheet', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain(':focus-visible');
    expect(css).not.toContain('fonts.googleapis');
    expect(css).not.toContain('@import');
  });
});
