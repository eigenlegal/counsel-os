import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { ToolRegistry } from './registry';
import type { Tool } from '../core/types';

function t(name: string, platforms: Tool['platforms']): Tool {
  return { name, description: name, inputSchema: z.object({}), platforms, execute: async () => name };
}

describe('ToolRegistry', () => {
  test('available filters by platform; unavailable explains what is needed', () => {
    const r = new ToolRegistry();
    r.register(t('docx', new Set(['macos'])));
    r.register(t('sweep', new Set(['macos', 'linux', 'windows', 'hosted'])));
    expect(r.available('linux').map(x => x.name)).toEqual(['sweep']);
    expect(r.unavailable('linux')).toEqual([{ name: 'docx', needs: ['macos'] }]);
    expect(r.available('macos').map(x => x.name).sort()).toEqual(['docx', 'sweep']);
  });

  test('duplicate names are rejected', () => {
    const r = new ToolRegistry();
    r.register(t('a', new Set(['linux'])));
    expect(() => r.register(t('a', new Set(['linux'])))).toThrow(/duplicate/);
  });
});
