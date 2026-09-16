import { z } from 'zod';
import type { WorkOutput } from './organization';
import type { Extraction } from './files';
import type { SourcePlacement } from './source-library';
import { Publication } from './authority-types';

const Id = z.string().uuid();
const Title = z.string().trim().min(1).max(300);
const Text = z.string().max(2_000_000);
const Label = z.string().trim().min(1).max(1_000);
const Key = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,99}$/);

export const MatterInput = z
  .object({
    title: Title,
    kind: Label.optional(),
    summary: Text.default(''),
  })
  .strict();
export type MatterInput = z.input<typeof MatterInput>;
export interface Matter {
  id: string;
  title: string;
  kind: string | null;
  summary: string;
  createdAt: string;
}

/** Provenance is never an instruction to fetch this location. Publisher access
 * uses a separate citation-only service with application-constructed URLs. */
export const Provenance = z
  .object({
    origin: Label,
    author: Label.optional(),
    retrievedAt: z.iso.datetime().optional(),
    mediaType: Label.optional(),
    publication: Publication.optional(),
    originalHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export type Provenance = z.infer<typeof Provenance>;

export const SourceRevisionInput = z
  .object({
    title: Title,
    body: Text.nullable(),
    textStatus: z.enum(['ready', 'partial', 'unavailable']).default('ready'),
    provenance: Provenance,
  })
  .strict()
  .refine(
    (input) => (input.textStatus === 'unavailable' ? input.body === null : input.body !== null),
    { message: 'unavailable text must be null; ready or partial text must be supplied' },
  );
export type SourceRevisionInput = z.input<typeof SourceRevisionInput>;
export const SourceInput = z
  .object({
    kind: z.enum(['reference', 'document', 'authority']),
    revision: SourceRevisionInput,
    matterIds: z.array(Id).max(1_000).default([]),
    collection: z.enum(['external', 'practice']).optional(),
  })
  .strict();
export type SourceInput = z.input<typeof SourceInput>;
export interface SourceRevision {
  id: string;
  sourceId: string;
  number: number;
  title: string;
  body: string | null;
  textStatus: 'ready' | 'partial' | 'unavailable';
  contentHash: string | null;
  provenance: Provenance;
  receivedAt: string;
  extraction?: Extraction;
  original?: { name: string; byteCount: number };
}
export interface Source {
  lifecycle?: 'active' | 'trashed';
  id: string;
  kind: z.infer<typeof SourceInput>['kind'];
  createdAt: string;
  matterIds: string[];
  latest: SourceRevision;
  placement?: SourcePlacement;
}

/** Imported approval evidence, not a model's power to approve its own work.
 * Interactive proposal/approval transitions are a later application service. */
export const KnowledgeRevisionInput = z
  .object({
    title: Title,
    body: Text,
    status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
    approvedBy: Label.optional(),
    supportingEvidence: z.array(z.lazy(() => EvidenceInput)).max(100).optional(),
  })
  .strict()
  .refine((input) => (input.status === 'approved') === (input.approvedBy !== undefined), {
    message: 'only an approved revision must name its approving actor',
  });
export type KnowledgeRevisionInput = z.input<typeof KnowledgeRevisionInput>;
export const KnowledgeInput = z
  .object({
    kind: z.enum(['position', 'method', 'language', 'pattern']),
    ownership: z.enum(['user', 'maintained']).default('user'),
    matterId: Id.nullable().default(null),
    revision: KnowledgeRevisionInput,
  })
  .strict();
export type KnowledgeInput = z.input<typeof KnowledgeInput>;
export interface KnowledgeRevision {
  id: string;
  knowledgeId: string;
  number: number;
  title: string;
  body: string;
  contentHash: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  receivedAt: string;
  approvedAt: string | null;
  supportingEvidence?: Array<EvidenceInput & { title?: string }>;
}
export interface Knowledge {
  /** Display only; immutable revision titles remain available in history. */
  displayTitle?: string;
  /** The imported source is usable context independently of an app proposal/approval. */
  importedOriginal?: { sourceId: string; revisionId: string };
  id: string;
  kind: z.infer<typeof KnowledgeInput>['kind'];
  ownership: 'user' | 'maintained';
  matterId: string | null;
  createdAt: string;
  latest: KnowledgeRevision;
  active: KnowledgeRevision | null;
}

export const EvidenceTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('source'), revisionId: Id }).strict(),
  z.object({ kind: z.literal('knowledge'), revisionId: Id }).strict(),
  z.object({ kind: z.literal('work'), workId: Id }).strict(),
]);
export type EvidenceTarget = z.infer<typeof EvidenceTarget>;
export const EvidenceInput = z
  .object({
    target: EvidenceTarget,
    /** Exact quote and UTF-16 offset in the immutable, unrendered text. */
    quote: z.string().min(1).max(100_000),
    start: z.number().int().nonnegative(),
    locator: Label.optional(),
  })
  .strict();
export type EvidenceInput = z.infer<typeof EvidenceInput>;
export interface Evidence extends EvidenceInput {
  id: string;
  end: number;
  title: string;
  contentHash: string;
  provenance: Provenance | null;
}

export const WorkInput = z
  .object({
    title: Title,
    request: Text.min(1),
    answer: Text,
    matterId: Id.nullable().default(null),
    /** Omit for assistant output; supply only for a recorded human decision. */
    decisionBy: Label.optional(),
    evidence: z.array(EvidenceInput).max(1_000).default([]),
  })
  .strict();
export type WorkInput = z.input<typeof WorkInput>;
export interface Work {
  lifecycle?: 'active' | 'trashed';
  id: string;
  title: string;
  request: string;
  answer: string;
  matterId: string | null;
  disposition: 'draft' | 'decision';
  decisionBy: string | null;
  recordedAt: string;
  contentHash: string;
  evidence: Evidence[];
  output: WorkOutput | null;
  origin: { conversationId: string; turnId: string } | null;
}

export const SearchInput = z
  .object({
    query: z.string().max(1_000),
    matterId: Id.optional(),
    kinds: z
      .array(z.enum(['source', 'knowledge', 'work']))
      .min(1)
      .max(3)
      .default(['source', 'knowledge', 'work']),
    includeHistory: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();
export type SearchInput = z.input<typeof SearchInput>;
export interface SearchHit {
  kind: 'source' | 'knowledge' | 'work';
  recordId: string;
  revisionId: string | null;
  title: string;
  snippet: string;
  contentHash: string | null;
  status: SourceRevision['textStatus'] | KnowledgeRevision['status'] | Work['disposition'];
  matterIds: string[];
}
export interface SearchResult {
  hits: SearchHit[];
  truncated: boolean;
  coverage: {
    complete: boolean;
    gaps: Array<{
      sourceId: string;
      revisionId: string;
      title: string;
      textStatus: 'partial' | 'unavailable';
    }>;
  };
}

const SeedTarget = z.object({ kind: z.enum(['source', 'knowledge', 'work']), key: Key }).strict();
export const WorkspaceSeed = z
  .object({
    format: z.literal('counsel-workspace-seed'),
    schemaVersion: z.literal(1),
    id: Key,
    version: z.number().int().positive(),
    matters: z
      .array(MatterInput.extend({ key: Key }))
      .max(1_000)
      .default([]),
    sources: z
      .array(
        SourceInput.omit({ matterIds: true }).extend({
          key: Key,
          matterKeys: z.array(Key).default([]),
        }),
      )
      .max(1_000)
      .default([]),
    knowledge: z
      .array(
        KnowledgeInput.omit({ matterId: true }).extend({
          key: Key,
          matterKey: Key.optional(),
        }),
      )
      .max(1_000)
      .default([]),
    work: z
      .array(
        WorkInput.omit({ matterId: true, evidence: true }).extend({
          key: Key,
          matterKey: Key.optional(),
          evidence: z
            .array(EvidenceInput.omit({ target: true }).extend({ target: SeedTarget }))
            .max(1_000)
            .default([]),
        }),
      )
      .max(1_000)
      .default([]),
  })
  .strict();
export type WorkspaceSeed = z.input<typeof WorkspaceSeed>;
export interface SeedReceipt {
  seedId: string;
  version: number;
  hash: string;
  importedAt: string;
  alreadyImported: boolean;
  records: {
    matters: Record<string, string>;
    sources: Record<string, string>;
    sourceRevisions: Record<string, string>;
    knowledge: Record<string, string>;
    knowledgeRevisions: Record<string, string>;
    work: Record<string, string>;
  };
}

export class WorkspaceConflictError extends Error {}
export class WorkspaceNotFoundError extends Error {}
