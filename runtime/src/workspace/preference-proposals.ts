import { z } from 'zod';

export const InstructionFields = z.object({
  writingInstructions: z.string().trim().max(16_000),
  signingInstructions: z.string().trim().max(4000),
  generalReview: z.string().trim().max(4000),
  ndaReview: z.string().trim().max(4000),
}).strict();
export const InstructionChanges = InstructionFields.partial().refine(value => Object.values(value).some(field => field !== undefined), 'Specify at least one instruction field.');
export const PreferenceSuggestion = z.object({
  changes: InstructionChanges.describe('Full replacement text for ONLY the instruction fields the user asked to change. Preserve unrelated guidance. An explicit empty string clears a field.'),
  requestQuote: z.string().trim().min(1).max(4000).describe('An exact quote from the current user message requesting this change for future work, not a quote from a document.'),
  reason: z.string().trim().min(1).max(1000),
}).strict();
export const PreferenceProposal = PreferenceSuggestion.extend({
  id: z.string().uuid(), basedOnRevisionId: z.string().uuid().nullable(), before: InstructionFields,
  review: z.enum(['pending', 'applied', 'dismissed', 'undone']),
  reviewedAt: z.iso.datetime().nullable(), appliedRevisionId: z.string().uuid().nullable(),
  undoneAt: z.iso.datetime().nullable(), undoRevisionId: z.string().uuid().nullable(),
}).strict();
export type PreferenceProposal = z.infer<typeof PreferenceProposal>;
export const PreferenceReview = z.object({ proposalId: z.string().uuid(), action: z.enum(['apply', 'dismiss', 'undo']) }).strict();
export const INSTRUCTION_LABELS: Record<keyof z.infer<typeof InstructionFields>, string> = {
  writingInstructions: 'Writing instructions', signingInstructions: 'Signing guidance',
  generalReview: 'General document review', ndaReview: 'NDA review instructions',
};
