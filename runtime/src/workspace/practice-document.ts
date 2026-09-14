import { z } from 'zod';
import { PRODUCT_NAME } from '../core/brand';
import type { WorkspaceProfile } from './profile';
import { EntityRegistryFields, registryFields, type EntityRegistry } from './entities';
import { FilenamePattern, FilenameLabel, RevisionAuthor, preferenceSnapshot, type WorkingPreferences } from './working-preferences';

export const PracticeText = z.string().max(64_000, 'Your practice document can contain up to 64,000 characters. Nothing has been shortened.');
export const PracticeWord = z.object({
  author: RevisionAuthor, filenamePattern: FilenamePattern,
  redlineLabel: FilenameLabel, draftLabel: FilenameLabel,
}).strict();
const Content = z.object({
  body: PracticeText, useInChats: z.boolean(), identityName: RevisionAuthor.nullable(),
  word: PracticeWord, entities: EntityRegistryFields,
}).strict();
export const PracticeDocument = Content.extend({
  revisionId: z.string().uuid(), version: z.number().int().positive(), updatedAt: z.iso.datetime(),
}).strict();
export type PracticeDocument = z.infer<typeof PracticeDocument>;
export const PracticeDocumentView = Content.extend({ body: z.string().max(2_000_000), basis: z.string(), saved: PracticeDocument.nullable() }).strict();
export type PracticeDocumentView = z.infer<typeof PracticeDocumentView>;
export const PracticeDocumentInput = z.object({ body: PracticeText, useInChats: z.boolean(), expectedBasis: z.string() }).strict();
export const PracticeDocumentDraft = z.object({ body: PracticeText, useInChats: z.boolean(), before: z.object({ basis: z.string().length(64) }).strict() }).strict();
export type PracticeDocumentDraft = z.infer<typeof PracticeDocumentDraft>;

/** Model output is a proposal, never a write. Exact execution values are reviewed
 * with the prose and live in the SAME versioned document, not competing settings. */
export const PracticeSuggestion = z.object({
  body: PracticeText.describe('The complete updated practice document in ordinary Markdown. Preserve unrelated content. No mandatory headings or contract categories.'),
  identityName: RevisionAuthor.nullable().optional().describe('Only when the user specifies their own name. Never infer identity from a team roster or login.'),
  word: PracticeWord.optional().describe('Only for explicitly requested Word output changes. Resolve exact values from the proposed text; do not guess. Preserve unchanged values.'),
  entities: EntityRegistryFields.optional().describe('Optional exact entity/signatory routing derived from the user’s requested changes. Preserve unrelated records and IDs. Missing currency, value basis or authority must not be invented.'),
  requestQuote: z.string().trim().min(1).max(4000), reason: z.string().trim().min(1).max(1000),
}).strict();
export const PracticeUpdateRequest = PracticeSuggestion.omit({ body: true }).extend({
  body: PracticeText.optional(),
  edits: z.array(z.object({ current: z.string().min(1).max(64_000), proposed: PracticeText }).strict()).min(1).max(40).optional(),
}).strict().refine(value => (value.body !== undefined) !== (value.edits !== undefined), 'Provide either the complete body or exact text edits, not both.');
export function updatePracticeText(before: string, request: z.infer<typeof PracticeUpdateRequest>): string {
  if (request.body !== undefined) return request.body;
  // Resolve every anchor against the same version. Never modify a replacement
  // from an earlier edit or silently choose among duplicate passages.
  const changes = request.edits!.map(edit => {
    const start = before.indexOf(edit.current);
    if (start < 0 || before.indexOf(edit.current, start + 1) >= 0) throw new Error('Use an exact, unique passage from the saved practice document.');
    return { start, end: start + edit.current.length, text: edit.proposed };
  }).sort((a, b) => a.start - b.start);
  if (changes.some((change, index) => index > 0 && change.start < changes[index - 1]!.end)) throw new Error('Practice edits cannot overlap.');
  let body = before;
  for (const change of changes.reverse()) body = body.slice(0, change.start) + change.text + body.slice(change.end);
  return PracticeText.parse(body);
}
export const PracticeDocumentProposal = PracticeSuggestion.extend({
  id: z.string().uuid(), before: PracticeDocumentView,
  review: z.enum(['pending', 'applied', 'dismissed', 'undone']),
  appliedBasis: z.string().nullable(), undoBasis: z.string().nullable(),
}).strict();
export type PracticeDocumentProposal = z.infer<typeof PracticeDocumentProposal>;
export const PracticeDocumentReview = z.object({
  proposalId: z.string().uuid(), action: z.enum(['apply', 'dismiss', 'undo']), useInChats: z.boolean().optional(),
}).strict();

/** Lossless text assembly for older workspaces. Headings are migration labels,
 * not a template: users may rename, remove or reorganize them freely. */
export function legacyPracticeContent(profile: WorkspaceProfile | null, preferences: WorkingPreferences | null, registry: EntityRegistry | null) {
  const sections: string[] = [];
  const add = (label: string, text: string | undefined) => { if (text) sections.push(`## ${label}\n\n${text}`); };
  if (profile) {
    add('About me', [profile.name, profile.role, profile.organization].filter(Boolean).join('\n\n'));
    for (const [key, label] of [['organizationContext', 'Organization context'], ['practiceAreas', 'Practice areas'], ['jurisdictions', 'Jurisdictions'], ['principles', 'Principles'], ['voice', 'Writing and communication'], ['escalationThresholds', 'Escalation']] as const) add(label, profile[key]);
  }
  if (preferences) for (const [key, label] of [['writingInstructions', 'Writing preferences'], ['signingInstructions', 'Signing guidance'], ['generalReview', 'Document review'], ['ndaReview', 'NDA review']] as const) add(label, preferences[key]);
  const snapshot = preferenceSnapshot(preferences, profile);
  const word = PracticeWord.parse({ author: snapshot?.word.author ?? PRODUCT_NAME, filenamePattern: snapshot?.word.filenamePattern ?? '{document} - {variant}',
    redlineLabel: snapshot?.word.redlineLabel ?? 'redline', draftLabel: snapshot?.word.draftLabel ?? 'draft' });
  if (preferences) add('Word output', `Attribute new changes and comments to ${word.author}.\n\nFilename pattern: ${word.filenamePattern}\n\nRedline label: ${word.redlineLabel}\n\nDraft label: ${word.draftLabel}`);
  if (registry) {
    for (const e of registry.entities) add(e.name, [!e.active ? 'Inactive entity.' : '', e.aliases.length ? `Also known as: ${e.aliases.join(', ')}` : '', e.jurisdiction,
      e.registeredAddress && `Registered address: ${e.registeredAddress}`, e.noticeAddress && `Notice address: ${e.noticeAddress}`, e.noticeEmail && `Notice email: ${e.noticeEmail}`, e.sourceNote].filter(Boolean).join('\n\n'));
    for (const p of registry.signatories) add(p.name, [p.title, !p.active ? 'Inactive signatory.' : '', p.sourceNote].filter(Boolean).join('\n\n'));
    for (const rule of registry.rules) add(rule.label, [
      `${registry.signatories.find(p => p.id === rule.signatoryId)?.name ?? 'Unknown signatory'}: ${rule.agreementKinds.join(', ')} agreements for ${rule.entityIds.map(id => registry.entities.find(e => e.id === id)?.name ?? 'Unknown entity').join('; ')}.`,
      rule.valueLimit ? `Up to and including ${rule.valueLimit.maximum} ${rule.valueLimit.currency}; ${rule.valueLimit.basis === 'annual' ? 'annual spend' : rule.valueLimit.basis === 'total' ? 'total committed value' : 'value basis not confirmed'}.` : '',
      rule.fallback ? 'Fallback when no other recorded rule applies.' : '', !rule.active ? 'Inactive rule.' : '', rule.sourceNote,
    ].filter(Boolean).join('\n\n'));
  }
  return { body: sections.join('\n\n'), useInChats: profile?.applyToChats ?? true, identityName: profile?.name ?? null, word, entities: registryFields(registry) };
}
