import { z } from 'zod';
import { ModelChoice } from './model-choice';
import { WorkingPreferences } from './working-preferences';

const Id = z.string().uuid();
export const DraftKey = z.union([z.literal('working-preferences'), z.string().regex(/^chat:[a-zA-Z0-9:-]{1,150}$/)]);
export const ChatDraft = z.object({
  message: z.string().max(30_000), attachments: z.array(Id).max(12),
  scope: z.union([z.enum(['conversation', 'workspace', 'matters']), Id]), clientId: Id,
  selectedMatters: z.array(z.object({ id: Id, title: z.string().max(1000) }).strict()).max(40).optional(),
  createdId: Id.optional(), modelChoice: ModelChoice.nullable().optional(), submittedModelChoice: ModelChoice.optional(),
}).strict();
export type ChatDraft = z.infer<typeof ChatDraft>;
// Drafts preserve incomplete input (including an invalid/empty filename) verbatim.
// Saving actual preferences still goes through the stricter reviewed-settings API.
export const PreferenceDraft = z.object({
  fields: z.object({
    writingInstructions: z.string().max(16_000), signingInstructions: z.string().max(4000),
    generalReview: z.string().max(4000), ndaReview: z.string().max(4000),
    authorMode: z.enum(['counsel', 'profile', 'custom']), customAuthor: z.string().max(200),
    filenamePattern: z.string().max(180), redlineLabel: z.string().max(80), draftLabel: z.string().max(80),
  }).strict(), saved: WorkingPreferences.strict().nullable(),
}).strict();
export type PreferenceDraft = z.infer<typeof PreferenceDraft>;
export const DraftWrite = z.object({ key: DraftKey, expectedRevisionId: Id.nullable(), writeId: Id,
  value: z.union([ChatDraft, PreferenceDraft]).nullable(),
}).strict().refine(v => v.value === null || (v.key === 'working-preferences'
  ? PreferenceDraft.safeParse(v.value).success : ChatDraft.safeParse(v.value).success), 'Draft type does not match its location.');
export interface SavedDraft { key: string; revisionId: string | null; writeId: string | null; value: ChatDraft | PreferenceDraft | null; updatedAt: string | null }
export interface DraftSummary { key: string; revisionId: string; title: string; updatedAt: string }

export const DRAFT_SCHEMA = `CREATE TABLE workspace_drafts (
  key TEXT PRIMARY KEY, revision_id TEXT NOT NULL, write_id TEXT NOT NULL,
  value_json TEXT, updated_at TEXT NOT NULL
);`;
