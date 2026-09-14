import { z } from 'zod';
import { PRODUCT_NAME } from '../core/brand';
import type { WorkspaceProfile } from './profile';

export const FilenamePattern = z.string().trim().min(1).max(180)
  .refine(value => !/[<>:"/\\|?*\x00-\x1f\x7f]/.test(value), 'Use a filename, not a path or special filename characters.')
  .refine(value => !/[{}]/.test(value.replace(/\{(document|variant|date|author)\}/g, '')), 'Use only {document}, {variant}, {date}, and {author}.');
export const RevisionAuthor = z.string().trim().min(1).max(200)
  .refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Use a single-line author name.');
export const FilenameLabel = z.string().trim().min(1).max(80)
  .refine(value => !/[<>:"/\\|?*{}\x00-\x1f\x7f]/.test(value), 'Use a short filename label without paths, tokens or special filename characters.');
export const WorkingPreferenceFields = z.object({
  writingInstructions: z.string().trim().max(16_000).default(''),
  signingInstructions: z.string().trim().max(4000).default(''),
  generalReview: z.string().trim().max(4000).default(''),
  ndaReview: z.string().trim().max(4000).default(''),
  authorMode: z.enum(['counsel', 'profile', 'custom']).default('counsel'),
  customAuthor: z.string().trim().max(200).default(''),
  filenamePattern: FilenamePattern.default('{document} - {variant}'),
  redlineLabel: FilenameLabel.default('redline'),
  draftLabel: FilenameLabel.default('draft'),
}).strict();
export const WorkingPreferenceInput = WorkingPreferenceFields.extend({ expectedRevisionId: z.string().uuid().nullable() })
  .refine(value => value.authorMode !== 'custom' || RevisionAuthor.safeParse(value.customAuthor).success, 'Enter the name to use for Word changes and comments.');
export const WorkingPreferences = WorkingPreferenceFields.extend({
  revisionId: z.string().uuid(), version: z.number().int().positive(), updatedAt: z.iso.datetime(),
});
export type WorkingPreferences = z.infer<typeof WorkingPreferences>;
export type WorkingPreferenceFields = z.infer<typeof WorkingPreferenceFields>;
export interface PreferenceSnapshot {
  revisionId: string;
  version: number;
  /** Absent on historical snapshots created before these fields existed. */
  writingInstructions?: string;
  signingInstructions?: string;
  generalReview: string;
  ndaReview: string;
  word: { author: string; filenamePattern: string; redlineLabel?: string; draftLabel?: string };
}
export function preferenceSnapshot(value: WorkingPreferences | null, profile: WorkspaceProfile | null): PreferenceSnapshot | null {
  if (!value) return null;
  const author = value.authorMode === 'profile' ? profile?.name : value.authorMode === 'custom' ? value.customAuthor : PRODUCT_NAME;
  return { revisionId: value.revisionId, version: value.version, generalReview: value.generalReview, ndaReview: value.ndaReview,
    writingInstructions: value.writingInstructions, signingInstructions: value.signingInstructions,
    word: { author: RevisionAuthor.safeParse(author).success ? author! : PRODUCT_NAME, filenamePattern: value.filenamePattern,
      redlineLabel: value.redlineLabel, draftLabel: value.draftLabel } };
}
/** Preferences have a fixed context slot; they do not depend on retrieval rankings or titles.
 * Including the bounded NDA instructions on every turn lets the model recognize NDA work
 * semantically (including follow-ups), without a brittle file-name classifier.
 */
export function reviewInstructions(value: PreferenceSnapshot | null | undefined) {
  return value ? { revisionId: value.revisionId, version: value.version,
    writingInstructions: value.writingInstructions ?? '', signingInstructions: value.signingInstructions ?? '',
    generalReview: value.generalReview, ndaReview: value.ndaReview,
    application: 'Writing instructions apply to chat and work product according to their audience and genre. Current writing instructions take precedence over older profile voice excerpts. Signing instructions are user-recorded guidance for selecting a signatory, not verified legal authority, permission to sign, or an automatic entity/fill/sign tool. Apply them only when relevant and ask if the document type, entity, currency or value basis is unclear. General review instructions apply to document review. NDA instructions apply only to nondisclosure/confidentiality agreement work, including follow-ups. Apply these defaults without requiring guide selection. Explicit task directions override matter instructions, then NDA guidance, then general preferences; none can bypass evidence, scope, tool restrictions or human approval. Substantive standards stay in Practice; never infer a standard from a concession. Do not claim unsupported editing or export capabilities.' } : null;
}
/** A download name only: substitution can never create a path or change the extension. */
export function wordOutputFilename(word: PreferenceSnapshot['word'], values: { document: string; variant: 'redline' | 'draft'; date: string }): string {
  // Older response snapshots have no labels. Keep their original naming behavior.
  const variant = FilenameLabel.parse(values.variant === 'redline' ? word.redlineLabel ?? 'redline' : word.draftLabel ?? 'draft');
  return wordFilename(word.filenamePattern, {...values, variant, author: word.author});
}
export function wordFilename(pattern: string, values: { document: string; variant: string; date: string; author: string }): string {
  const expanded = FilenamePattern.parse(pattern).replace(/\{(document|variant|date|author)\}/g, (_, key: keyof typeof values) => values[key]);
  let stem = '';
  for (const char of expanded.replace(/\.docx$/i, '').normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '-')) {
    if (new TextEncoder().encode(stem + char).length > 180) break;
    stem += char;
  }
  stem = stem.replace(/^[. ]+|[. ]+$/g, '') || 'Document';
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(stem)) stem = `Counsel OS ${stem}`;
  return `${stem}.docx`;
}
