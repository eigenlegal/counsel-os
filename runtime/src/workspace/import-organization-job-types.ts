import { z } from 'zod';
import { ModelChoice } from './model-choice';
import { ImportChoice, ImportEntryIds } from './import-types';

export const OrganizationJobStart = z.object({
  requestId: z.string().uuid(), expectedRevisionId: z.string().uuid(),
  modelChoice: ModelChoice, shareForSuggestions: z.literal(true),
  instruction: z.string().trim().max(2000).default(''),
}).strict();
export const OrganizationJobControl = z.object({
  expectedRevisionId: z.string().uuid(), action: z.enum(['pause', 'resume']),
}).strict();
export const OrganizationJobApply = z.object({
  expectedRevisionId: z.string().uuid(), expectedBatchRevisionId: z.string().uuid(),
  selection: z.enum(['high', 'selected', 'unfiled']), entryIds: ImportEntryIds.optional(),
}).strict().refine(value => value.selection === 'selected' ? !!value.entryIds : !value.entryIds);
export const OrganizationJobState = z.object({
  request: OrganizationJobStart,
  status: z.enum(['running', 'paused', 'complete', 'failed']),
  message: z.string().max(4000), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  calls: z.number().int().nonnegative(),
}).strict();
export const OrganizationSuggestion = z.object({
  entryId: z.string().uuid(), path: z.string().max(1000), before: ImportChoice, choice: ImportChoice,
  reason: z.string().min(1).max(1000), confidence: z.enum(['high', 'moderate', 'low']),
  evidenceQuote: z.string().min(1).max(500), partial: z.boolean(),
  sharedMatters: z.array(z.object({ id: z.string().uuid(), title: z.string() }).strict()).max(70),
  sharedGroups: z.array(z.object({ title: z.string(), evidence: z.string() }).strict()).max(40),
}).strict();
export type OrganizationSuggestion = z.infer<typeof OrganizationSuggestion>;
export type OrganizationFailure = { entryId: string; path: string; before: ImportChoice; reason: string };
export type ImportFilingSummary = {
  matters: number; practice: number; external: number; unfiled: number; profiles: number;
  groups: Array<{ title: string; files: number; isNew: boolean }>; groupCount: number;
};
export type OrganizationJob = z.infer<typeof OrganizationJobState> & {
  revisionId: string; eligible: number; analyzed: number; high: number; attention: number; applied: number;
  skipped: number; waiting: number; total: number; offset: number;
  failed: number; retrying: number; reviewed: number; remaining: number;
  failures: Array<OrganizationFailure & { attempts: number; protected: boolean }>;
  summary: ImportFilingSummary;
  suggestions: Array<OrganizationSuggestion & { applied: boolean; stale: boolean; reviewed?: boolean }>;
};
