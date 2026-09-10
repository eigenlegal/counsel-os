import { z } from 'zod';

/** One local lawyer, not an account or multi-user authorization model. */
export const ProfileFields = z
  .object({
    name: z.string().trim().min(1, 'Enter your name.').max(200),
    role: z.string().trim().max(200).default(''),
    organization: z.string().trim().max(200).default(''),
    organizationContext: z.string().trim().max(2_000).default(''),
    practiceAreas: z.string().trim().max(1_000).default(''),
    jurisdictions: z.string().trim().max(1_000).default(''),
    principles: z.string().trim().max(3_000).default(''),
    voice: z.string().trim().max(2_000).default(''),
    escalationThresholds: z.string().trim().max(2_000).default(''),
    applyToChats: z.boolean().default(true),
  })
  .strict();
export type ProfileFields = z.infer<typeof ProfileFields>;
export const ProfileInput = ProfileFields.extend({
  expectedRevisionId: z.string().uuid().nullable(),
}).strict();
export const WorkspaceProfile = ProfileFields.extend({
  id: z.string().uuid(),
  revisionId: z.string().uuid(),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
}).strict();
export type WorkspaceProfile = z.infer<typeof WorkspaceProfile>;
