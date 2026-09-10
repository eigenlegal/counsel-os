import { z } from 'zod';

export const OrganizeConversationInput = z
  .object({
    requestId: z.string().uuid(),
    matterId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    confirmShare: z.literal(true),
  })
  .strict()
  .refine(
    (value) => (value.matterId !== undefined) !== (value.title !== undefined),
    'Choose an existing matter or name a new one.',
  );

export const OutputInput = z
  .object({
    title: z.string().trim().min(1).max(300),
    kind: z.enum(['memo', 'assessment', 'email', 'chronology', 'draft', 'other']),
  })
  .strict();
export interface WorkOutput extends z.infer<typeof OutputInput> {
  createdAt: string;
}
export const MatterBriefInput = z
  .object({
    expectedRevisionId: z.string().uuid().nullable(),
    status: z.enum(['open', 'on-hold', 'closed']),
    summary: z.string().trim().max(12000),
    questions: z.string().trim().max(6000),
    nextActions: z.string().trim().max(6000),
  })
  .strict();
export interface MatterBrief extends Omit<z.infer<typeof MatterBriefInput>, 'expectedRevisionId'> {
  id: string;
  matterId: string;
  number: number;
  recordedAt: string;
}
