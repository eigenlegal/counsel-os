import { z } from 'zod';
import { ModelChoice } from './model-choice';
import { SourceFilingSuggestion } from './source-organization';

const Id = z.string().uuid(), Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const AutoFilingEnable = z.object({ expectedRevisionId: Id.nullable(), modelChoice: ModelChoice,
  shareForSuggestions: z.literal(true), instruction: z.string().trim().max(2000).default('') }).strict();
export const AutoFilingControl = z.object({ expectedRevisionId: Id, action: z.enum(['pause','resume','check']) }).strict();
export const AutoFilingSettings = z.object({ mode: z.enum(['running','paused','failed']), modelChoice: ModelChoice,
  activeRunId: Id.nullable().default(null),
  instruction: z.string().max(2000), message: z.string().max(2000), calls: z.number().int().nonnegative(),
  enabledAt: z.string().datetime(), updatedAt: z.string().datetime() }).strict();
export const AutoFilingResult = z.object({ sourceId: Id, sourceVersion: Hash, fingerprint: Hash,
  title: z.string().min(1).max(300), suggestion: SourceFilingSuggestion, partial: z.boolean(),
  candidateMatters: z.array(z.object({ id: Id, title: z.string().max(300) }).strict()).max(50) }).strict();
export const AutoFilingReview = z.object({ action: z.enum(['apply','dismiss']),
  items: z.array(z.object({ id: Id, fingerprint: Hash }).strict()).min(1).max(100)
    .refine(items => new Set(items.map(item => item.id)).size === items.length),
  confirmAccessChanges: z.literal(true).optional() }).strict()
  .refine(input => input.action !== 'apply' || input.confirmAccessChanges === true, 'Confirm the selected filing and matter access changes.');
export const AutoFilingQuery = z.object({ view: z.enum(['ready','history','blocked']).default('ready'),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0) }).strict();
export type FilingResult = z.infer<typeof AutoFilingResult> & { id: string; state: 'ready'|'applied'|'dismissed'|'superseded'; createdAt: string; stale: boolean };
export interface AutoFilingStatus {
  settings: (z.infer<typeof AutoFilingSettings> & { revisionId: string }) | null;
  queued: number; running: number; ready: number; handled: number; blocked: number; protected: number;
  total: number; offset: number; items: FilingResult[];
  issues: Array<{ sourceId: string; title: string; message: string }>;
}
