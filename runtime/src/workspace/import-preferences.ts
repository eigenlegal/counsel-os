import { z } from 'zod';
import { WorkingPreferenceFields, RevisionAuthor } from './working-preferences';

export const IMPORT_WORKING_FIELDS = [
  { key: 'writingInstructions', label: 'Writing instructions', aliases: ['writing instructions', 'writing preferences', 'writing and communication', 'voice'], multiline: true },
  { key: 'generalReview', label: 'General document review', aliases: ['general review', 'general document review', 'document review instructions'], multiline: true },
  { key: 'ndaReview', label: 'NDA review instructions', aliases: ['nda review', 'nda review instructions', 'nda instructions', 'nda preferences'], multiline: true },
  { key: 'signingInstructions', label: 'Signing guidance', aliases: ['signing instructions', 'signing guidance', 'signing rules', 'signatory instructions'], multiline: true },
  { key: 'customAuthor', label: 'Word author', aliases: ['word author', 'revision author', 'redline author', 'custom author'], multiline: false },
  { key: 'filenamePattern', label: 'Word filename pattern', aliases: ['word filename pattern', 'filename pattern'], multiline: false },
  { key: 'redlineLabel', label: 'Redline filename label', aliases: ['redline label', 'redline filename label'], multiline: false },
  { key: 'draftLabel', label: 'Draft filename label', aliases: ['draft label', 'draft filename label'], multiline: false },
] as const;
export type ImportWorkingField = typeof IMPORT_WORKING_FIELDS[number]['key'];
const fields = WorkingPreferenceFields.shape;
// Unwrap defaults: a partial import must never reset an unselected preference.
export const ImportPreferenceChanges = z.object({
  writingInstructions: fields.writingInstructions.unwrap().optional(),
  signingInstructions: fields.signingInstructions.unwrap().optional(),
  generalReview: fields.generalReview.unwrap().optional(),
  ndaReview: fields.ndaReview.unwrap().optional(),
  filenamePattern: fields.filenamePattern.unwrap().optional(),
  redlineLabel: fields.redlineLabel.unwrap().optional(),
  draftLabel: fields.draftLabel.unwrap().optional(),
  customAuthor: RevisionAuthor.optional(),
  authorMode: z.literal('custom').optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Choose at least one preference.')
  .refine(value => (value.customAuthor !== undefined) === (value.authorMode === 'custom'), 'Review the Word author name and mode together.');
export type ImportPreferenceChanges = z.infer<typeof ImportPreferenceChanges>;
export const ImportPreferenceReview = z.object({
  expectedRevisionId: z.string().uuid().nullable(), changes: ImportPreferenceChanges,
}).strict();
export type ImportPreferenceReview = z.infer<typeof ImportPreferenceReview>;
export interface ImportPreferenceMapping {
  suggestion: Partial<Record<ImportWorkingField, string>>;
  warnings: string[];
  unmappedSections: string[];
}
const normalize = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[\s_&-]+/g, ' ').trim();
const fieldFor = (label: string) => IMPORT_WORKING_FIELDS.find(field => field.aliases.some(alias => normalize(alias) === normalize(label)) || normalize(field.key) === normalize(label));

/** Exact labeled text, not an interpretation of legal authority or a command runner.
 * Proposed fields are local drafts; only the separately reviewed patch can affect settings.
 */
export function mapImportPreferences(body: string): ImportPreferenceMapping {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const headings: Array<{ line: number; level: number; label: string }> = [];
  const outside: boolean[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    outside[index] = !fence && !marker;
    if (marker) {
      if (!fence) fence = { char: marker[1]![0]!, length: marker[1]!.length };
      else if (fence.char === marker[1]![0] && marker[1]!.length >= fence.length) fence = null;
    } else if (!fence) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (match) headings.push({ line: index, level: match[1]!.length, label: match[2]!.trim() });
    }
  }
  const values = new Map<ImportWorkingField, string[]>(), covered = new Set<number>();
  const add = (key: ImportWorkingField, value: string) => {
    value = value.trim();
    if (!IMPORT_WORKING_FIELDS.find(field => field.key === key)!.multiline) value = value.replace(/^(["'`])(.*)\1$/, '$2');
    if (value) values.set(key, [...(values.get(key) ?? []), value]);
  };
  for (const [index, heading] of headings.entries()) {
    if (covered.has(index)) continue;
    const field = fieldFor(heading.label);
    if (!field) continue;
    // Another recognized field is never silently swallowed into this one.
    const end = headings.slice(index + 1).find(next => next.level <= heading.level || fieldFor(next.label))?.line ?? lines.length;
    add(field.key, lines.slice(heading.line + 1, end).join('\n'));
    for (const [childIndex, child] of headings.entries()) if (child.line >= heading.line && child.line < end) covered.add(childIndex);
  }
  const containers = ['word output', 'word preferences', 'working preferences', 'document preferences'];
  const metadataEnd = headings.find(heading => heading.level >= 2 || fieldFor(heading.label))?.line ?? lines.length;
  let parentIndex = -1;
  for (let index = 0; index < lines.length; index++) {
    if (!outside[index]) continue;
    while (headings[parentIndex + 1] && headings[parentIndex + 1]!.line < index) parentIndex++;
    const parent = headings[parentIndex];
    // No settings extracted from examples, company rosters, or arbitrary paragraphs.
    if (index >= metadataEnd && (!parent || !containers.includes(normalize(parent.label)))) continue;
    const match = lines[index]!.match(/^([\w][\w _-]*):[ \t]*(.*)$/);
    const field = match && fieldFor(match[1]!);
    if (!field || !match) continue;
    let value = match[2]!.trim();
    if (/^[|>][-+]?\s*$/.test(value)) {
      const block: string[] = [];
      while (index + 1 < lines.length && (/^[ \t]+\S/.test(lines[index + 1]!) || !lines[index + 1]!.trim())) block.push(lines[++index]!);
      const indent = Math.min(...block.filter(line => line.trim()).map(line => line.match(/^[ \t]*/)![0].length));
      value = block.map(line => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n').trim();
    } else value = value.replace(/^(["'`])(.*)\1$/, '$2');
    add(field.key, value);
  }
  const suggestion: ImportPreferenceMapping['suggestion'] = {}, warnings: string[] = [];
  for (const field of IMPORT_WORKING_FIELDS) {
    const candidates = [...new Set(values.get(field.key) ?? [])];
    if (candidates.length > 1) warnings.push(`${field.label} has conflicting entries. Nothing was selected; review the original and enter the intended wording.`);
    else if (candidates[0]) {
      const value = candidates[0];
      const schema = field.key === 'customAuthor' ? RevisionAuthor : fields[field.key].unwrap();
      if (!schema.safeParse(value).success || (field.key === 'customAuthor' && /^(me|my name|profile|myself|you|your name)$/i.test(value)))
        warnings.push(`${field.label} cannot be mapped as written. Nothing was shortened or applied; enter a valid value after reviewing the original.`);
      else suggestion[field.key] = value;
    }
  }
  return { suggestion, warnings, unmappedSections: [...new Set(headings.filter((heading, index) => !covered.has(index) && heading.level >= 2).map(heading => heading.label))].slice(0, 30) };
}

export interface ImportPreferenceSelection { files: number; review: ImportPreferenceReview | null; conflicts: string[] }
export function combineImportPreferences(reviews: ImportPreferenceReview[]): ImportPreferenceSelection {
  const changes: Record<string, string> = {}, conflicts = new Set<string>();
  for (const review of reviews) for (const [key, value] of Object.entries(review.changes)) {
    if (changes[key] !== undefined && changes[key] !== value)
      conflicts.add(IMPORT_WORKING_FIELDS.find(field => field.key === key)?.label ?? 'Word author');
    else changes[key] = value;
  }
  if (reviews.some(review => review.expectedRevisionId !== reviews[0]!.expectedRevisionId)) conflicts.add('Preferences changed between file reviews');
  return { files: reviews.length, conflicts: [...conflicts], review: !reviews.length || conflicts.size ? null
    : ImportPreferenceReview.parse({ expectedRevisionId: reviews[0]!.expectedRevisionId, changes }) };
}
