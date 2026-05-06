import { describe, expect, test } from 'bun:test';
import type { BrowserManager } from './browser-manager';
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
import { dispatchCommand } from './server';

function intersections(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter(value => b.has(value));
}

describe('browse command registry and dispatch', () => {
  test('command sets contain expected command names', () => {
    expect(READ_COMMANDS.has('text')).toBe(true);
    expect(READ_COMMANDS.has('network')).toBe(true);
    expect(WRITE_COMMANDS.has('goto')).toBe(true);
    expect(WRITE_COMMANDS.has('cookie-import-browser')).toBe(true);
    expect(META_COMMANDS.has('chain')).toBe(true);
    expect(META_COMMANDS.has('snapshot')).toBe(true);
  });

  test('command sets are disjoint', () => {
    expect(intersections(READ_COMMANDS, WRITE_COMMANDS)).toEqual([]);
    expect(intersections(READ_COMMANDS, META_COMMANDS)).toEqual([]);
    expect(intersections(WRITE_COMMANDS, META_COMMANDS)).toEqual([]);
  });

  test('unknown command returns a hint with valid commands', async () => {
    const res = await dispatchCommand(
      { command: 'unknown-command', args: [] },
      {} as BrowserManager,
      async () => {},
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; hint: string };
    expect(body.error).toBe('Unknown command: unknown-command');
    expect(body.hint).toContain('text');
    expect(body.hint).toContain('goto');
    expect(body.hint).toContain('snapshot');
  });

  test('meta commands dispatch through handleMetaCommand', async () => {
    const bm = {
      getCurrentUrl: () => 'https://example.test/current',
    } as unknown as BrowserManager;

    const res = await dispatchCommand({ command: 'url', args: [] }, bm, async () => {});

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('https://example.test/current');
  });

  test('handler errors are returned as JSON without aborting dispatch', async () => {
    const res = await dispatchCommand(
      { command: 'tab', args: ['not-a-number'] },
      {} as BrowserManager,
      async () => {},
    );

    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Usage: browse tab <id>');
  });
});
