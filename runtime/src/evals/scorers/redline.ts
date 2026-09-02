/**
 * The redline scorer (spec §4.1): the model's edits are applied to the
 * fixture's Word document through the real `applyRedlines`, so what is
 * scored is what a lawyer would get back — not a description of edits.
 *
 * Terms: `covered` (each expected edit found among the model's items with a
 * matching replacement), `applied` (items that landed without a skip),
 * `untouched` (nothing the fixture protects was edited), `comments` (every
 * item explains itself, when the fixture requires it).
 */
import { applyRedlines, openDocx, type RedlineItem } from '../../docx';
import { RedlineExpected } from '../fixture';
import { containsAny, normalize, weighted, type ScoreContext, type ScoreResult } from './types';

export const REDLINE_WEIGHTS = { covered: 0.5, applied: 0.3, untouched: 0.1, comments: 0.1 } as const;

export function scoreRedline(expectedRaw: unknown, raw: unknown, ctx: ScoreContext = {}): ScoreResult {
  const expected = RedlineExpected.parse(expectedRaw);
  const out = (typeof raw === 'object' && raw !== null ? raw : {}) as { items?: unknown };
  const items = (Array.isArray(out.items) ? out.items : []).filter(
    (i): i is RedlineItem => typeof i === 'object' && i !== null && typeof (i as RedlineItem).current === 'string' && typeof (i as RedlineItem).proposed === 'string',
  );
  const notes: string[] = [];

  if (ctx.readDocument === undefined) throw new Error('the redline scorer needs readDocument in its context');
  const pkg = openDocx(ctx.readDocument(expected.document));
  const result = items.length === 0 ? null : applyRedlines(pkg, items, { track: true, defaultAuthor: 'eval' });

  const covered = expected.items.filter(e =>
    items.some(i => normalize(i.current).includes(normalize(e.current)) && containsAny(normalize(i.proposed), e.proposed_any)),
  );
  const touchedProtected = expected.must_not_touch.filter(p => items.some(i => normalize(i.current).includes(normalize(p))));
  const withComment = items.filter(i => typeof i.comment === 'string' && i.comment.trim() !== '');

  const terms = {
    covered: expected.items.length === 0 ? 1 : covered.length / expected.items.length,
    applied: result === null ? 0 : items.length === 0 ? 0 : result.applied.length / items.length,
    untouched: touchedProtected.length === 0 ? 1 : 0,
    comments: !expected.require_comments ? 1 : items.length === 0 ? 0 : withComment.length / items.length,
  };
  const missed = expected.items.filter(e => !covered.includes(e)).map(e => e.current);
  if (missed.length > 0) notes.push(`Did not make the expected edit${missed.length === 1 ? '' : 's'}: ${missed.map(m => `"${m.slice(0, 60)}"`).join('; ')}.`);
  if (result !== null && result.skipped.length > 0) notes.push(`${result.skipped.length} of ${items.length} edits did not apply: ${result.skipped.map(s => s.reason).slice(0, 3).join('; ')}.`);
  if (touchedProtected.length > 0) notes.push(`Edited protected text: ${touchedProtected.map(t => `"${t.slice(0, 60)}"`).join('; ')}.`);
  if (expected.require_comments && withComment.length < items.length) notes.push(`${items.length - withComment.length} edit${items.length - withComment.length === 1 ? '' : 's'} without a comment.`);
  if (items.length === 0) notes.push('No edits were produced.');

  return { score: weighted(terms, REDLINE_WEIGHTS, ctx.weights), terms, notes };
}
