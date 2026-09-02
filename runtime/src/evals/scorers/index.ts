import type { Fixture, FixtureDocument } from '../fixture';
import { scoreClassification } from './classification';
import { scoreExtraction } from './extraction';
import { scoreFindings } from './findings';
import { scoreRedline } from './redline';
import { scoreRubric } from './rubric';
import type { ScoreContext, ScoreResult } from './types';

export { scoreClassification, scoreExtraction, scoreFindings, scoreRedline, scoreRubric };
export { FINDINGS_WEIGHTS } from './findings';
export type { Judge, JudgeVerdict, ScoreContext, ScoreResult } from './types';
export { normalize } from './types';

/** Scores one answer against one fixture (or one of its documents) with the
 * fixture's scorer. The fixture's `weights` override the scorer's defaults. */
export async function scoreOutput(fixture: Fixture, doc: FixtureDocument | null, output: unknown, ctx: ScoreContext = {}): Promise<ScoreResult> {
  const block = doc ?? fixture;
  const expected = doc?.expected ?? fixture.expected;
  const c: ScoreContext = { ...ctx, ...(fixture.weights === undefined ? {} : { weights: fixture.weights }) };
  switch (fixture.scorer) {
    case 'findings':
      return scoreFindings(block, output, c);
    case 'extraction':
      return scoreExtraction(expected, output, c);
    case 'classification':
      return scoreClassification(expected, output, c);
    case 'redline':
      return scoreRedline(expected, output, c);
    case 'rubric':
      return scoreRubric(expected, output, c);
  }
}
