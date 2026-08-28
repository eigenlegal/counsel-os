import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { toHarnessJsonSchema } from './schema';

const nested = z.object({
  files: z.array(z.string()),
  nested: z.object({ a: z.number() }).optional(),
});

// The CLI's `--schema <file>` path builds its Zod type with
// `z.fromJSONSchema()`. On zod 4.4.3 that round-trip is what actually emits
// `"additionalProperties": {}` — the empty *schema object* Codex rejected in
// spike 9.3-E. A schema built directly with `z.object()` already serializes
// `additionalProperties: false` on this version, so both shapes are pinned
// here: the sanitizer must handle either and a zod bump must not regress it.
const roundTripped = z.fromJSONSchema({
  type: 'object',
  properties: { files: { type: 'array', items: { type: 'string' } } },
  required: ['files'],
});

function walk(node: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  visit(node as Record<string, unknown>);
  for (const value of Object.values(node as Record<string, unknown>)) walk(value, visit);
}

function collect(node: unknown, key: string): unknown[] {
  const found: unknown[] = [];
  walk(node, obj => {
    if (key in obj) found.push(obj[key]);
  });
  return found;
}

describe('toHarnessJsonSchema', () => {
  test('the raw zod output carries the keys the harnesses reject', () => {
    expect((z.toJSONSchema(nested) as Record<string, unknown>).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(typeof (z.toJSONSchema(roundTripped) as Record<string, unknown>).additionalProperties).toBe('object');
  });

  test('no $schema key survives, at any depth', () => {
    expect(collect(toHarnessJsonSchema(nested), '$schema')).toEqual([]);
    expect(collect(toHarnessJsonSchema(roundTripped), '$schema')).toEqual([]);
  });

  test('no object-valued additionalProperties survives, at any depth', () => {
    for (const schema of [nested, roundTripped]) {
      const values = collect(toHarnessJsonSchema(schema), 'additionalProperties');
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(v).toBe(false);
    }
  });

  test('the schema itself is otherwise preserved', () => {
    const out = toHarnessJsonSchema(nested);
    expect(out.type).toBe('object');
    expect(out.required).toEqual(['files']);
    const props = out.properties as Record<string, Record<string, unknown>>;
    expect(props.files).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(props.nested!.type).toBe('object');
  });

  test('does not mutate the zod output it was handed', () => {
    const out = toHarnessJsonSchema(nested);
    expect(out).not.toBe(z.toJSONSchema(nested));
    expect((z.toJSONSchema(nested) as Record<string, unknown>).$schema).toBeDefined();
  });
});
