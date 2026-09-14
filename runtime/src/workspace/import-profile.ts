import { z } from 'zod';
import { ProfileFields } from './profile';

export const IMPORT_PROFILE_FIELDS = [
  { key: 'name', label: 'Name', limit: 200, aliases: ['name', 'full name', 'your name'] },
  { key: 'role', label: 'Role', limit: 200, aliases: ['role'] },
  { key: 'organization', label: 'Organization', limit: 200, aliases: ['organization', 'company'] },
  { key: 'jurisdictions', label: 'Jurisdictions', limit: 1000, aliases: ['jurisdiction', 'jurisdictions'] },
  { key: 'practiceAreas', label: 'Practice areas', limit: 1000, aliases: ['practice areas', 'practiceAreas'] },
  { key: 'organizationContext', label: 'Organization context', limit: 2000, aliases: ['organization context', 'organizationContext', 'business context'] },
  { key: 'principles', label: 'Principles and risk approach', limit: 3000, aliases: ['principles', 'principles and risk approach', 'philosophy'] },
  { key: 'voice', label: 'Writing and communication', limit: 2000, aliases: ['voice', 'writing and communication'] },
  { key: 'escalationThresholds', label: 'Escalation thresholds', limit: 2000, aliases: ['escalation thresholds', 'escalationThresholds', 'escalation triggers'] },
] as const;
type Field = typeof IMPORT_PROFILE_FIELDS[number]['key'];
export interface ImportProfileMapping {
  /** Editable draft: name may be empty. Saving still validates ProfileFields. */
  suggestion: ProfileFields | null;
  mapped: Field[];
  warnings: string[];
  unmappedSections: string[];
}
const normalize = (value: string) => value.toLowerCase().replace(/[\s_&-]+/g, ' ').trim();
const fieldFor = (label: string) => IMPORT_PROFILE_FIELDS.find(field => field.aliases.some(alias => normalize(alias) === normalize(label)));

/** Local, explicit labels only. Never choose a lawyer from a roster, execute instructions,
 * shorten preferences silently, or apply Word/signing/connection settings. Originals stay intact.
 */
export function mapImportProfile(body: string): ImportProfileMapping {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const headings: Array<{ line: number; level: number; label: string }> = [];
  const outsideCode: boolean[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    outsideCode[index] = !fence && !marker;
    if (marker) {
      if (!fence) fence = { char: marker[1]![0]!, length: marker[1]!.length };
      else if (marker[1]![0] === fence.char && marker[1]!.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) headings.push({ line: index, level: heading[1]!.length, label: heading[2]!.trim() });
  }
  const values = new Map<Field, string[]>();
  const add = (key: Field, value: string) => {
    if (value.trim()) values.set(key, [...(values.get(key) ?? []), value.trim()]);
  };
  // Top-level labeled fields only: names in Team/Identity sections are not the user's identity.
  const metadataEnd = headings.find(heading => heading.level >= 2 || fieldFor(heading.label))?.line ?? lines.length;
  for (let index = 0; index < metadataEnd; index++) {
    if (!outsideCode[index]) continue;
    const match = lines[index]!.match(/^([\w][\w _-]*):[ \t]*(.*)$/);
    const field = match && fieldFor(match[1]!);
    if (!field || !match) continue;
    let value = match[2]!.trim();
    if (/^[|>][-+]?\s*$/.test(value)) {
      const block: string[] = [];
      while (index + 1 < metadataEnd && (/^[ \t]+\S/.test(lines[index + 1]!) || !lines[index + 1]!.trim())) block.push(lines[++index]!);
      const indent = Math.min(...block.filter(line => line.trim()).map(line => line.match(/^[ \t]*/)![0].length));
      value = block.map(line => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n').trim();
    } else value = value.replace(/^(["'])(.*)\1$/, '$2');
    add(field.key, value);
  }
  const covered = new Set<number>();
  for (const [index, heading] of headings.entries()) {
    if (covered.has(index)) continue;
    const field = fieldFor(heading.label);
    if (!field) continue;
    const end = headings.slice(index + 1).find(next => next.level <= heading.level)?.line ?? lines.length;
    add(field.key, lines.slice(heading.line + 1, end).join('\n'));
    for (const [childIndex, child] of headings.entries()) if (child.line >= heading.line && child.line < end) covered.add(childIndex);
  }
  const draft: Partial<Record<Field, string>> = {}, warnings: string[] = [], mapped: Field[] = [];
  for (const field of IMPORT_PROFILE_FIELDS) {
    const candidates = [...new Set(values.get(field.key) ?? [])];
    if (candidates.length > 1) warnings.push(`${field.label} has conflicting entries. Choose the wording below; none was selected automatically.`);
    else if (candidates[0]?.length && candidates[0].length > field.limit) warnings.push(`${field.label} exceeds ${field.limit.toLocaleString('en-US')} characters. It was not shortened or applied. Enter a shorter version below; the full text stays in the original file.`);
    else if (candidates[0]) { draft[field.key] = candidates[0]; mapped.push(field.key); }
  }
  if (mapped.length && !draft.name) warnings.push('Enter your name to use these details. Counsel OS does not choose your identity from a team list.');
  const unmappedSections = headings.filter((heading, index) => !covered.has(index) && heading.level >= 2).map(heading => heading.label);
  if (new Set(unmappedSections).size > 30) warnings.push('Only the first 30 unmapped section names are listed. Review the full original for the remaining sections.');
  return { suggestion: mapped.length ? ProfileFields.extend({ name: ProfileFields.shape.name.or(z.literal('')) })
    .parse({ name: '', ...draft, applyToChats: false }) : null, mapped, warnings,
    unmappedSections: [...new Set(unmappedSections)].slice(0, 30) };
}
