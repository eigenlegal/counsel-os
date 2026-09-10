import { z } from 'zod';
import { MatterBriefInput } from './organization';

/** Conservative guard for explicit review-only wording in the current user request.
 * Never run against source text, model rationale or older conversation messages.
 * This covers common instructions, not arbitrary natural-language interpretation. */
export function briefReviewRequested(request: string): boolean {
  const text = request.toLowerCase().replace(/[’‘]/g, "'").replace(/[–—-]/g, ' ').replace(/\s+/g, ' ');
  const subject = '(?:matter(?: brief)?|brief|working notes|matter notes)';
  return new RegExp(`\\b${subject}\\b[^.!?]{0,120}\\bfor (?:my |human )?(?:review|approval)\\b`).test(text)
    || new RegExp(`\\b(?:review|approve)\\b[^.!?]{0,70}\\b${subject}\\b[^.!?]{0,70}\\bbefore\\b`).test(text)
    || new RegExp(`\\b(?:do not|don't|dont|never) (?:automatically )?(?:save|apply|update|change)\\b[^.!?]{0,60}\\b${subject}\\b`).test(text)
    || /\b(?:do not|don't|dont) (?:save|apply) (?:it|this|anything|changes)(?: yet| until| before| automatically|[.!?]|$)/.test(text)
    || /\b(?:let me|i (?:want|need) to) (?:review|approve)\b/.test(text);
}

export const BriefSuggestion = MatterBriefInput.omit({ expectedRevisionId: true })
  .extend({
    summary: z.string().trim().min(1).max(12_000),
    reason: z.string().trim().min(1).max(1_000),
    needsReview: z.boolean().optional().describe('Normally false: routine working notes save automatically. Use true when the user requests a suggestion for review, asks not to save changes, or an uncertain change needs a human decision. Matter status changes always require review.'),
  })
  .strict();
export const BriefProposal = BriefSuggestion.extend({
  id: z.string().uuid(),
  matterId: z.string().uuid(),
  basedOnRevisionId: z.string().uuid().nullable(),
  review: z.enum(['pending', 'applied', 'dismissed']),
  reviewedAt: z.string().datetime().nullable(),
  appliedRevisionId: z.string().uuid().nullable(),
  mode: z.enum(['automatic', 'review']).optional(),
  deferredReason: z.enum(['status-change', 'concurrent-change', 'requested-review']).optional(),
  undoneAt: z.string().datetime().optional(),
  undoRevisionId: z.string().uuid().optional(),
}).strict();
export type BriefProposal = z.infer<typeof BriefProposal>;
export const BriefReview = z
  .object({ proposalId: z.string().uuid(), action: z.enum(['apply', 'dismiss']) })
  .strict();
export const BriefUndo = z.object({ proposalId: z.string().uuid() }).strict();
