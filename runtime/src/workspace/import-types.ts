import { z } from "zod";
import { ProfileFields } from "./profile";
import { ImportPreferenceReview, type ImportPreferenceSelection } from './import-preferences';

export const IMPORT_MAX_FILES = 10_000;
export const IMPORT_MAX_BYTES = 1_000_000_000;
export const IMPORT_MAX_TEXT_BYTES = 250_000_000;
export const IMPORT_MAX_MANIFEST_BYTES = 12_000_000;
export const ImportQuery = z.object({
  query: z.string().trim().max(200).default(''),
  status: z.enum(['all', 'attention', 'ready', 'waiting', 'excluded']).default('all'),
  offset: z.coerce.number().int().min(0).max(IMPORT_MAX_FILES).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
export const IMPORT_LOCAL_POLICY =
  "This selection contains a local-only workspace policy. This initial importer cannot preserve it; the batch cannot be committed.";
export const ImportPath = z
  .string()
  .min(1)
  .max(1_000)
  .refine((path) => {
    const parts = path.split("/");
    return (
      !/[\\\x00-\x1f\x7f]/.test(path) &&
      parts.length <= 20 &&
      parts.every(
        (part) => part && part !== "." && part !== ".." && part.length <= 200,
      )
    );
  }, "Use a relative folder path without traversal or control characters.");
export const ImportManifest = z
  .array(
    z
      .object({
        path: ImportPath,
        byteCount: z.number().int().nonnegative().max(1_000_000_000),
      })
      .strict(),
  )
  .min(1)
  .max(IMPORT_MAX_FILES)
  .refine(
    (items) => new Set(items.map((item) => item.path)).size === items.length,
    "The folder selection contains duplicate paths.",
  );
export const ImportCreate = z
  .object({
    clientId: z.string().uuid(),
    label: z.string().trim().min(1).max(200),
    files: ImportManifest,
  })
  .strict();
export const ImportMatterReference = z.object({
  matterId: z.string().uuid().nullable(),
  matterTitle: z.string().trim().min(1).max(200).nullable(),
}).strict().refine(value => !!value.matterId !== !!value.matterTitle, 'Name one existing or new matter.');
export type ImportMatterReference = z.infer<typeof ImportMatterReference>;
export const ImportChoice = z
  .object({
    title: z.string().trim().min(1).max(200),
    destination: z.enum([
      "source",
      "position",
      "method",
      "language",
      "pattern",
      "template",
      "profile",
      "skip",
    ]),
    collection: z.enum(['unfiled', 'external', 'practice']).default('unfiled'),
    matterId: z.string().uuid().nullable().default(null),
    matterTitle: z.string().trim().min(1).max(200).nullable().default(null),
    linkedMatters: z.array(ImportMatterReference).max(100).optional(),
    whenToUse: z.string().trim().max(2_000).default(""),
    jurisdiction: z.string().trim().max(500).default(""),
    profile: ProfileFields.nullable().default(null),
    preferences: ImportPreferenceReview.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => !(value.matterId && value.matterTitle),
    "Choose an existing matter or a new matter, not both.",
  ).refine(value => !value.linkedMatters?.length || value.destination === 'source' || value.destination === 'skip',
    'Additional matter sharing applies to source documents, not practice standards or profile fields.')
  .refine(value => !value.preferences || value.destination === 'profile' || value.destination === 'skip',
    'Review working preferences as a profile and preferences source.');
export type ImportChoice = z.infer<typeof ImportChoice>;
export const ImportEdit = z
  .object({ expectedRevisionId: z.string().uuid(), choice: ImportChoice })
  .strict();
export const ImportSelection = ImportQuery.omit({ offset: true, limit: true });
export const ImportEntryIds = z.array(z.string().uuid()).min(1).max(IMPORT_MAX_FILES)
  .refine(ids => new Set(ids).size === ids.length, 'Select each file only once.');
export const ImportBulkEdit = z.object({
  expectedRevisionId: z.string().uuid(), entryIds: ImportEntryIds,
  patch: z.object({
    destination: z.enum(['source', 'position', 'method', 'language', 'pattern', 'skip']).optional(),
    collection: z.enum(['unfiled', 'external', 'practice']).optional(),
    matterId: z.string().uuid().nullable().optional(),
    matterTitle: z.string().trim().min(1).max(200).nullable().optional(),
  }).strict().refine(value => Object.values(value).some(item => item !== undefined), 'Choose a change to apply.')
    .refine(value => (value.matterId === undefined) === (value.matterTitle === undefined), 'Provide both matter fields when changing the matter.'),
}).strict();
export const ImportChoiceEdits = z.object({ expectedRevisionId: z.string().uuid(),
  changes: z.array(z.object({ entryId: z.string().uuid(), choice: ImportChoice }).strict()).min(1).max(IMPORT_MAX_FILES),
}).strict().refine(value => new Set(value.changes.map(item => item.entryId)).size === value.changes.length, 'Select each file only once.');
export const ImportQueueAction = z.object({
  action: z.enum(["pause", "resume", "retry"]),
}).strict();
export const ImportCommit = z
  .object({
    expectedRevisionId: z.string().uuid(),
    allowPracticeWideTemplates: z.boolean().default(false),
    profile: ProfileFields.nullable().default(null),
    preferences: ImportPreferenceReview.nullable().optional(),
  })
  .strict();
export type ImportReceipt = {
  committedAt: string;
  matterIds: string[];
  items: {
    entryId: string;
    sourceId: string;
    sourceRevisionId: string;
    practiceId?: string;
    templateId?: string;
    placementRevisionId?: string | null;
  }[];
  profileRevisionId: string | null;
  workingPreferencesRevisionId?: string;
  undo?: { requestId: string; entryIds: string[]; completedAt: string; sourceIds: string[]; practiceIds: string[]; templateIds: string[] };
};
export interface ImportEntry {
  id: string;
  path: string;
  byteCount: number;
  hash: string | null;
  status: "pending" | "ready" | "error" | "skipped";
  reason: string;
  choice: ImportChoice;
  textStatus: "ready" | "partial" | "unavailable" | null;
  notes: string[];
  phase: "awaiting_upload" | "queued" | "processing" | "ready" | "error" | "skipped";
}
export interface ImportProgress {
  paused: boolean;
  problem: string | null;
  awaitingUpload: number;
  queued: number;
  processing: number;
  ready: number;
  errors: number;
  excluded: number;
}
export interface ImportBatch {
  id: string;
  label: string;
  revisionId: string;
  status: "review" | "committed" | "discarded";
  createdAt: string;
  entries: ImportEntry[];
  receipt: ImportReceipt | null;
  progress: ImportProgress;
  total: number;
  offset: number;
  selection: { included: number; templates: number; profiles: number; profile: z.infer<typeof ProfileFields> | null; linkedMatters?: number; preferences?: ImportPreferenceSelection };
}
export type ImportListItem = Omit<ImportBatch, 'entries' | 'total' | 'offset' | 'selection' | 'receipt'>;
export type ImportUploadPlan = Pick<ImportEntry, 'id' | 'path' | 'byteCount' | 'phase'> & { skip: boolean };
export function importSkipReason(path: string, size: number): string | null {
  if (
    path
      .split("/")
      .some(
        (part) =>
          part.startsWith(".") || /^(node_modules|__pycache__)$/i.test(part),
      ) ||
    /(^|\/)(AGENTS|CLAUDE|FRONTMATTER)\.md$/i.test(path)
  )
    return "Hidden or application-instruction files are not imported.";
  if (!/\.(md|txt|pdf|docx)$/i.test(path))
    return /\.doc$/i.test(path)
      ? "Convert legacy .doc to .docx first."
      : "Unsupported format. This import supports PDF, DOCX, TXT and Markdown.";
  if (!size) return "Empty file.";
  if (size > (/\.(md|txt)$/i.test(path) ? 500_000 : 25_000_000))
    return "File exceeds the format’s size limit.";
  return null;
}

/** Naming hints only, never instruction execution, approval, or legal classification. */
export function suggestImport(path: string): ImportChoice {
  const parts = path.split("/"),
    lower = parts.map((part) => part.toLowerCase());
  const name = parts.at(-1)!;
  let destination: ImportChoice["destination"] = "source";
  if (lower.includes("standards") || lower.includes("positions"))
    destination = "position";
  else if (lower.includes("methods")) destination = "method";
  else if (lower.includes("library") || lower.includes("clauses"))
    destination = "language";
  else if (lower.includes("templates")) destination = "template";
  else if (/^patterns\.(md|txt)$/i.test(name) && lower.includes("memory"))
    destination = "pattern";
  else if (/^profile\.(md|txt)$/i.test(name) && (parts.length === 1 || lower.at(-2) === 'practice')) destination = "profile";
  const matterIndex = lower.indexOf("matters");
  // Calendar buckets are not matters. Known layouts are optional hints only.
  const matterParts = parts.slice(matterIndex + 1, -1).filter(part => !/^\d{4}$/.test(part));
  const matterTitle = matterIndex >= 0
    ? (matterParts[0] ?? name.replace(/\.[^.]+$/, '')) : null;
  return ImportChoice.parse({
    title: name.replace(/\.(md|txt)$/i, "").replace(/[-_]/g, " "),
    destination,
    matterTitle,
  });
}
