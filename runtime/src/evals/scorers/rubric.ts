/**
 * The rubric scorer (spec §4.1): prose graded criterion by criterion by an
 * injected judge, each verdict a pass/fail with a quote. A judge call that
 * fails leaves that criterion unscored and says so; when nothing could be
 * judged the score is `null` (spec §9), never a silent zero.
 */
import { RubricExpected } from '../fixture';
import { round, type ScoreContext, type ScoreResult } from './types';

export async function scoreRubric(expectedRaw: unknown, raw: unknown, ctx: ScoreContext = {}): Promise<ScoreResult> {
  const expected = RubricExpected.parse(expectedRaw);
  const answer = typeof raw === 'string' ? raw : typeof raw === 'object' && raw !== null && typeof (raw as { text?: unknown }).text === 'string' ? (raw as { text: string }).text : JSON.stringify(raw ?? '');
  if (ctx.judge === undefined) throw new Error('the rubric scorer needs a judge in its context');

  const terms: Record<string, number> = {};
  const notes: string[] = [];
  let weightJudged = 0;
  let weightPassed = 0;
  for (const c of expected.criteria) {
    try {
      const v = await ctx.judge({ id: c.id, text: c.text }, answer);
      terms[c.id] = v.pass ? 1 : 0;
      weightJudged += c.weight;
      if (v.pass) weightPassed += c.weight;
      else notes.push(`${c.id}: not met${v.quote ? ` — "${v.quote.slice(0, 120)}"` : ''}.`);
    } catch (err) {
      notes.push(`${c.id}: not judged (${err instanceof Error ? err.message : String(err)}).`);
    }
  }
  return { score: weightJudged === 0 ? null : round(weightPassed / weightJudged), terms, notes };
}
