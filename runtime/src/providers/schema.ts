import { z, type ZodType } from 'zod';

/**
 * Converts a Zod schema to the JSON Schema shape both harnesses accept.
 *
 * `z.toJSONSchema()` (Zod 4) output is rejected by *both* harnesses, for
 * different reasons (spike 9.3-B / 9.3-E, `docs/superpowers/spikes/2026-08-28-runtime-spikes.md`):
 *
 * - Claude: the emitted `"$schema": "https://json-schema.org/draft/2020-12/schema"`
 *   key makes the Claude Code CLI reject the whole schema before the turn
 *   starts — `--json-schema is not a valid JSON Schema: no schema with key or
 *   ref "https://json-schema.org/draft/2020-12/schema"`.
 * - Codex: Zod emits `"additionalProperties": {}` (an empty *schema* object).
 *   OpenAI's structured-output validator requires a boolean there and fails
 *   with `In context=('additionalProperties',), schema must have a 'type' key.`
 *   `false` is also what its strict mode wants.
 *
 * Both fixes are safe for the other harness, so one sanitizer serves both.
 * Nothing may hand raw `z.toJSONSchema()` output to a harness.
 */
export function toHarnessJsonSchema(schema: ZodType): Record<string, unknown> {
  return sanitize(z.toJSONSchema(schema)) as Record<string, unknown>;
}

function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitize);
  if (node === null || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === '$schema') continue;
    // An object here means "any extra property allowed" in JSON Schema terms;
    // both harnesses want the boolean form, and `false` (closed object) is the
    // only one OpenAI strict mode accepts.
    if (key === 'additionalProperties' && typeof value === 'object' && value !== null) {
      out[key] = false;
      continue;
    }
    out[key] = sanitize(value);
  }
  return out;
}
