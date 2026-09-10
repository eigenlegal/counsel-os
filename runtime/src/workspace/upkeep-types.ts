import { z } from 'zod';

export const UpkeepQuery = z.object({
  view: z.enum(['attention','dismissed']).default('attention'),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
}).strict();
export const UpkeepDecision = z.object({
  kind: z.enum(['source','import']), targetId: z.string().uuid(),
  code: z.enum(['unfiled','partial','source-links','import-review','import-links']),
  expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.enum(['dismiss','restore']),
}).strict();
export type UpkeepKind = z.infer<typeof UpkeepDecision>['kind'];
export type UpkeepCode = z.infer<typeof UpkeepDecision>['code'];
export interface UpkeepFinding {
  kind: UpkeepKind; targetId: string; code: UpkeepCode; version: string;
  title: string; detail: string; checkedAt: string;
}
export interface UpkeepRun {
  id: string; reason: 'changes' | 'periodic' | 'manual'; startedAt: string;
  completedAt: string | null; checked: number;
}
export interface UpkeepStatus {
  pending: number; failed: number; attention: number; dismissed: number;
  total: number; offset: number; items: UpkeepFinding[]; history: UpkeepRun[];
  errors: Array<{ kind: UpkeepKind; targetId: string; error: string }>;
}
