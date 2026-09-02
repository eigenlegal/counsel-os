/** The classification scorer (spec §4.1): one answer, exact or an accepted
 * alias, after the same normalization every other scorer uses. */
import { ClassificationExpected } from '../fixture';
import { normalize, type ScoreContext, type ScoreResult } from './types';

export function scoreClassification(expectedRaw: unknown, raw: unknown, _ctx: ScoreContext = {}): ScoreResult {
  const expected = ClassificationExpected.parse(expectedRaw);
  const out = (typeof raw === 'object' && raw !== null ? raw : {}) as { answer?: unknown };
  const answer = normalize(typeof raw === 'string' ? raw : out.answer);
  const accepted = [expected.answer, ...expected.accept].map(normalize);
  const exact = answer !== '' && accepted.includes(answer) ? 1 : 0;
  return {
    score: exact,
    terms: { exact },
    notes: exact === 1 ? [] : [`Answered "${answer || '(nothing)'}"; expected ${accepted.map(a => `"${a}"`).join(' or ')}.`],
  };
}
