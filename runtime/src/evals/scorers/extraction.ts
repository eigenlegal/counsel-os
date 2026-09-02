/**
 * The extraction scorer (spec §4.1): the answer is a bag of named fields;
 * the fixture names the fields it wants and the words that prove each one.
 * Recall over the required fields, precision over everything the model
 * produced (a field the fixture never asked for counts against it), so an
 * extractor that pads its answer with guesses does not win on recall alone.
 */
import { ExtractionExpected } from '../fixture';
import { containsAny, normalize, weighted, type ScoreContext, type ScoreResult } from './types';

export const EXTRACTION_WEIGHTS = { recall: 0.7, precision: 0.3 } as const;

export function scoreExtraction(expectedRaw: unknown, raw: unknown, ctx: ScoreContext = {}): ScoreResult {
  const expected = ExtractionExpected.parse(expectedRaw);
  const out = (typeof raw === 'object' && raw !== null ? raw : {}) as { fields?: Record<string, unknown> };
  const fields = typeof out.fields === 'object' && out.fields !== null ? out.fields : {};

  const valueOf = (v: unknown): string => normalize(Array.isArray(v) ? v.map(String).join(' ') : v);
  const names = Object.keys(expected.fields);
  const required = names.filter(n => expected.fields[n]!.required);
  const hit = names.filter(n => n in fields && containsAny(valueOf(fields[n]), expected.fields[n]!.match_any));
  const spurious = Object.keys(fields).filter(n => !(n in expected.fields));
  const requiredHit = hit.filter(n => expected.fields[n]!.required);

  const terms = {
    recall: required.length === 0 ? (names.length === 0 ? 1 : hit.length / names.length) : requiredHit.length / required.length,
    precision: hit.length + spurious.length === 0 ? 1 : hit.length / (hit.length + spurious.length),
  };
  const notes: string[] = [];
  const missed = required.filter(n => !hit.includes(n));
  if (missed.length > 0) notes.push(`Missed: ${missed.join(', ')}.`);
  if (spurious.length > 0) notes.push(`Not asked for: ${spurious.join(', ')}.`);
  return { score: weighted(terms, EXTRACTION_WEIGHTS, ctx.weights), terms, notes };
}
