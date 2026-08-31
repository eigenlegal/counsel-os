import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'bun:test';

/**
 * The token ramps, measured.
 *
 * Spec §2 says the light status ramp is "darkened to ≥4.5:1", but the values
 * it named measured 4.21 (accent) and 4.32 (amber) against its own paper —
 * so the spec was amended on 2026-08-30 and this file is what holds the
 * claim to account. Every ink these tokens paint is small text (11–13px UI
 * labels, 13px italic serif statuses), so 4.5:1 is the applicable WCAG AA
 * threshold, not the 3:1 large-text one.
 */

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** The `:root` block (light) and the `prefers-color-scheme: dark` one. */
function ramp(which: 'light' | 'dark'): Map<string, string> {
  const start = which === 'light' ? css.indexOf(':root {') : css.indexOf('@media (prefers-color-scheme: dark)');
  const end = which === 'light' ? css.indexOf('@media (prefers-color-scheme: dark)') : css.indexOf('* { box-sizing');
  const block = css.slice(start, end);
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    if (name !== undefined && value !== undefined) tokens.set(name, value);
  }
  return tokens;
}

/** WCAG 2.1 relative luminance, then the contrast ratio. */
function channel(byte: number): number {
  const c = byte / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => channel(Number.parseInt(hex.slice(i, i + 2), 16))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Every token that paints text a reader has to read. */
const INKS = ['--fg', '--fg-muted', '--fg-faint', '--accent', '--ok', '--warn', '--amber', '--error'];

/*
 * Dark `--fg-faint` was the one documented shortfall (#877c6d, 4.48:1 on
 * `--bg`). The final-review fix wave lightened it to #8c8172 so it clears
 * 4.5:1 on BOTH dark backgrounds; the ramp test below now enforces it like
 * every other ink, and the extra test pins the `--bg-raised` case the ramp
 * test does not measure.
 */

describe('the token ramps', () => {
  test('the ratio maths is right (white on black is 21:1, a colour on itself is 1:1)', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrast('#a8681f', '#a8681f')).toBeCloseTo(1, 5);
    // The two values spec §2 originally named, which is why it was amended.
    expect(contrast('#a8681f', '#faf7f1')).toBeCloseTo(4.21, 1);
    expect(contrast('#996d10', '#faf7f1')).toBeCloseTo(4.32, 1);
  });

  for (const which of ['light', 'dark'] as const) {
    test(`${which}: every ink clears 4.5:1 on its own background`, () => {
      const tokens = ramp(which);
      const bg = tokens.get('--bg');
      expect(bg).toBeDefined();
      for (const ink of INKS) {
        const value = tokens.get(ink);
        expect(value).toBeDefined();
        const ratio = contrast(value as string, bg as string);
        // The message names the offender — a bare `4.31 < 4.5` is useless.
        expect({ ink, ratio: Number(ratio.toFixed(2)), passes: ratio >= 4.5 }).toEqual({
          ink,
          ratio: Number(ratio.toFixed(2)),
          passes: true,
        });
      }
    });
  }

  test('dark --fg-faint clears 4.5:1 on the raised background too', () => {
    const tokens = ramp('dark');
    const raised = tokens.get('--bg-raised');
    expect(raised).toBeDefined();
    expect(contrast(tokens.get('--fg-faint') as string, raised as string)).toBeGreaterThanOrEqual(4.5);
  });

  test('light: the on-accent ink is readable on the accent it sits on', () => {
    const tokens = ramp('light');
    expect(contrast(tokens.get('--accent-ink') as string, tokens.get('--accent') as string)).toBeGreaterThanOrEqual(4.5);
  });

  test('the two ramps define the same colour tokens — nothing is light-only or dark-only', () => {
    const light = ramp('light');
    const dark = ramp('dark');
    for (const ink of INKS) {
      expect({ ink, inLight: light.has(ink), inDark: dark.has(ink) }).toEqual({ ink, inLight: true, inDark: true });
    }
  });
});
