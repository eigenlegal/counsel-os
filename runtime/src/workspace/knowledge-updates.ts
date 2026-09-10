import { z } from 'zod';
import { EvidenceInput, type KnowledgeRevision } from './types';

export const KnowledgeUpdate = z
  .object({
    expectedRevisionId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    supportingEvidence: z.array(EvidenceInput).max(100).optional(),
    body: z
      .string()
      .min(1)
      .max(1_000_000)
      .refine((value) => !!value.trim(), 'Enter the proposed knowledge.'),
  })
  .strict();
export interface KnowledgeHistory {
  versions: Array<Omit<KnowledgeRevision, 'body'>>;
  totalVersions: number;
}
