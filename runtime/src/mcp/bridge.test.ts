import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { toMcpTools } from './bridge';
import type { ToolDef } from '../core/types';

const add: ToolDef<{ a: number; b: number }, number> = {
  name: 'add', description: 'add', inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b,
};

describe('toMcpTools', () => {
  test('converts zod to JSON schema and wraps results as text content', async () => {
    const [spec] = toMcpTools([add], 'default');
    expect(spec!.inputSchema).toMatchObject({ type: 'object', properties: { a: { type: 'number' } } });
    const r = await spec!.handler({ a: 1, b: 2 });
    expect(r.content[0]!.text).toBe('3');
    expect(r.isError).toBeUndefined();
  });

  test('tool errors become isError results', async () => {
    const [spec] = toMcpTools([add], 'default');
    const r = await spec!.handler({ a: 'x' });
    expect(r.isError).toBe(true);
  });
});
