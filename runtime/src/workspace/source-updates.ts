import { z } from 'zod';
import { FileInput } from './files';
import type { SourceRevision, Work } from './types';

export const SourceFileUpdate = FileInput.omit({ matterId: true })
  .extend({
    expectedRevisionId: z.string().uuid(),
  })
  .strict();
export const SourceTextUpdate = z
  .object({
    expectedRevisionId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    body: z
      .string()
      .min(1)
      .max(1_000_000)
      .refine((value) => !!value.trim(), 'Enter source text.'),
    origin: z.string().trim().min(1).max(1000),
    author: z.string().trim().max(1000).default(''),
    textStatus: z.enum(['ready', 'partial']).default('ready'),
  })
  .strict();
export interface SourceHistory {
  versions: Array<
    Pick<
      SourceRevision,
      'id' | 'number' | 'title' | 'textStatus' | 'receivedAt' | 'contentHash'
    > & { hasOriginal: boolean }
  >;
  totalVersions: number;
  affectedWork: Array<Pick<Work, 'id' | 'title' | 'matterId' | 'disposition' | 'recordedAt'>>;
  totalAffectedWork: number;
}
export interface SourceChange {
  sourceId: string;
  title: string;
  citedRevisionId: string;
  citedVersion: number;
  currentRevisionId: string;
  currentVersion: number;
}
export interface ReferenceChange extends Omit<SourceChange, 'sourceId'> {
  kind: 'source' | 'knowledge';
  recordId: string;
  via?: import('./reference-impact').DependencyNode[];
  viaTruncated?: boolean;
}
