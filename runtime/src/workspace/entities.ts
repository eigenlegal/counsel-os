import { z } from 'zod';

const Id = z.string().uuid();
const Text = z.string().trim().max(2000);
export const AgreementKind = z.enum(['nda', 'vendor', 'other']);
export const ValueBasis = z.enum(['total', 'annual']);
/** Decimal strings avoid floating-point threshold rounding and implicit FX. */
export const MoneyAmount = z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/, 'Use a nonnegative amount with at most two decimal places, without commas or a currency symbol.');
const Currency = z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.');
export const Entity = z.object({
  id: Id, name: z.string().trim().min(1).max(200), aliases: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  jurisdiction: z.string().trim().max(200).default(''),
  registeredAddress: Text.default(''), noticeAddress: Text.default(''), noticeEmail: z.union([z.email().max(300), z.literal('')]).default(''),
  sourceNote: Text.default(''), active: z.boolean().default(true),
}).strict();
export const Signatory = z.object({ id: Id, name: z.string().trim().min(1).max(200),
  title: z.string().trim().max(200).default(''), sourceNote: Text.default(''), active: z.boolean().default(true) }).strict();
export const SigningRule = z.object({
  id: Id, label: z.string().trim().min(1).max(200), entityIds: z.array(Id).min(1).max(50),
  agreementKinds: z.array(AgreementKind).min(1).max(3), signatoryId: Id,
  valueLimit: z.object({ maximum: MoneyAmount, currency: Currency, basis: ValueBasis.nullable() }).strict().nullable().default(null),
  fallback: z.boolean().default(false), active: z.boolean().default(true), sourceNote: Text.default(''),
}).strict().refine(value => !value.fallback || !value.valueLimit, 'A fallback cannot also have a value limit.');
const unique = (values: string[]) => new Set(values).size === values.length;
const RegistryFieldsObject = z.object({
  availableToChats: z.boolean().default(false), entities: z.array(Entity).max(50).default([]),
  signatories: z.array(Signatory).max(100).default([]), rules: z.array(SigningRule).max(100).default([]),
}).strict();
function validateRegistry(value: z.infer<typeof RegistryFieldsObject>, ctx: z.RefinementCtx) {
  const entities = new Set(value.entities.map(e => e.id)), people = new Set(value.signatories.map(p => p.id));
  if (!unique([...value.entities.map(e => e.id), ...value.signatories.map(p => p.id), ...value.rules.map(r => r.id)]))
    ctx.addIssue({ code: 'custom', message: 'Each entity, signatory and rule needs its own identity.' });
  for (const rule of value.rules) {
    if (!people.has(rule.signatoryId) || rule.entityIds.some(id => !entities.has(id)))
      ctx.addIssue({ code: 'custom', message: 'Signing rules must refer to saved entities and signatories.' });
    if (!unique(rule.entityIds) || !unique(rule.agreementKinds))
      ctx.addIssue({ code: 'custom', message: 'Choose each entity and agreement type once per rule.' });
  }
}
export const EntityRegistryFields = RegistryFieldsObject.superRefine(validateRegistry);
export const EntityRegistryInput = RegistryFieldsObject.extend({ expectedRevisionId: Id.nullable() }).superRefine(validateRegistry);
export const EntityRegistry = RegistryFieldsObject.extend({ revisionId: Id, version: z.number().int().positive(), updatedAt: z.iso.datetime() }).superRefine(validateRegistry);
export type Entity = z.infer<typeof Entity>;
export type Signatory = z.infer<typeof Signatory>;
export type SigningRule = z.infer<typeof SigningRule>;
export type EntityRegistry = z.infer<typeof EntityRegistry>;
export type EntityRegistryFields = z.infer<typeof EntityRegistryFields>;
export function registryFields(value: EntityRegistry | null | undefined): EntityRegistryFields {
  return EntityRegistryFields.parse(value ? { availableToChats: value.availableToChats, entities: value.entities, signatories: value.signatories, rules: value.rules } : {});
}
export function entityCatalog(registry: EntityRegistry | null | undefined) {
  if (!registry?.availableToChats) return null;
  return { revisionId: registry.revisionId, version: registry.version,
    entities: registry.entities.filter(e => e.active).map(e => ({ id: e.id, name: e.name, aliases: e.aliases })),
    note: 'User-recorded practice-wide signing entities, not client records or verified corporate facts. Read the selected entity with counsel_read_entity; do not infer the contracting entity from the profile. Check signatory routing with counsel_check_signatory. Missing fields remain unknown.' };
}
export function readEntity(registry: EntityRegistry | null | undefined, id: string) {
  const entity = registry?.availableToChats ? registry.entities.find(e => e.id === Id.parse(id) && e.active) : null;
  if (!entity || !registry) throw new Error('This signing entity is not available in this response’s saved registry.');
  const rules = registry.rules.filter(r => r.active && r.entityIds.includes(entity.id));
  return { revisionId: registry.revisionId, version: registry.version, entity, rules,
    signatories: registry.signatories.filter(p => rules.some(r => r.signatoryId === p.id)),
    note: 'These are user-recorded details and routing rules. Empty fields are unknown. Do not invent an address, title or authority. This does not approve or sign an agreement.' };
}
export const SignatoryCheckInput = z.object({
  entityId: Id, agreementKind: AgreementKind.nullable(), amount: MoneyAmount.nullable().default(null),
  currency: Currency.nullable().default(null), valueBasis: ValueBasis.nullable().default(null),
}).strict();
export type SignatoryCheckInput = z.infer<typeof SignatoryCheckInput>;
export interface SignatoryCheck {
  registryRevisionId: string | null; registryVersion: number | null; input: SignatoryCheckInput;
  outcome: 'suggested' | 'needs-information' | 'conflict' | 'no-rule' | 'unavailable';
  entity: { id: string; name: string } | null; signatory: Signatory | null;
  rules: Array<{ id: string; label: string }>; reasons: string[];
  note: string;
}
const minorUnits = (value: string): bigint => {
  const [whole, fraction = ''] = MoneyAmount.parse(value).split('.');
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
};
/** Unknown facts and overlapping rules stop routing; a fallback is not a way around uncertainty. */
export function checkSignatory(registry: EntityRegistry | null | undefined, raw: z.input<typeof SignatoryCheckInput>): SignatoryCheck {
  const input = SignatoryCheckInput.parse(raw);
  const entity = registry?.availableToChats ? registry.entities.find(e => e.id === input.entityId && e.active) : null;
  const result: SignatoryCheck = { registryRevisionId: registry?.revisionId ?? null, registryVersion: registry?.version ?? null,
    input, outcome: 'unavailable', entity: entity ? { id: entity.id, name: entity.name } : null,
    signatory: null, rules: [], reasons: [],
    note: 'Routing suggestion under user-recorded rules, not verified authority, approval, signature execution or legal advice. Check the supplied agreement facts and any separate restrictions before using a signature block.' };
  if (!entity || !registry) { result.reasons = ['This signing entity is not available in the saved registry.']; return result; }
  if (input.agreementKind === null) { result.outcome = 'needs-information'; result.reasons = ['Identify the agreement type before selecting a signatory.']; return result; }
  const candidates = registry.rules.filter(r => r.active && r.entityIds.includes(entity.id) && r.agreementKinds.includes(input.agreementKind!));
  const matched: SigningRule[] = [], unresolved: SigningRule[] = [];
  for (const rule of candidates.filter(r => !r.fallback)) {
    if (!rule.valueLimit) { matched.push(rule); continue; }
    const limit = rule.valueLimit;
    const missing = !limit.basis ? 'Confirm what value basis the saved limit uses.'
      : input.amount === null ? 'Provide the agreement value.'
      : input.currency === null ? 'Provide the agreement currency.'
      : input.currency !== limit.currency ? `The saved limit is in ${limit.currency}; no currency conversion or other-currency authority is defined.`
      : input.valueBasis === null ? 'Identify whether the supplied value is total committed value or annual spend.'
      : input.valueBasis !== limit.basis ? `The saved limit uses ${limit.basis === 'total' ? 'total committed value' : 'annual spend'}; supply the value on that basis.` : null;
    if (missing) { unresolved.push(rule); result.reasons.push(`${rule.label}: ${missing}`); }
    else if (minorUnits(input.amount!) <= minorUnits(limit.maximum)) matched.push(rule);
  }
  if (unresolved.length) {
    result.outcome = 'needs-information'; result.rules = [...matched, ...unresolved].map(({ id, label }) => ({ id, label })); return result;
  }
  const applicable = matched.length ? matched : candidates.filter(r => r.fallback);
  result.rules = applicable.map(({ id, label }) => ({ id, label }));
  if (!applicable.length) { result.outcome = 'no-rule'; result.reasons = ['No recorded signing rule covers these facts. Ask for the signatory instead of guessing.']; return result; }
  if (new Set(applicable.map(r => r.signatoryId)).size > 1) {
    result.outcome = 'conflict'; result.reasons = ['The applicable rules name different signatories. Resolve the conflict before choosing one.']; return result;
  }
  const person = registry.signatories.find(p => p.id === applicable[0]!.signatoryId && p.active);
  if (!person) { result.outcome = 'needs-information'; result.reasons = ['The applicable signatory is inactive. Update the rule or confirm who should sign.']; return result; }
  result.outcome = 'suggested'; result.signatory = person;
  result.reasons = applicable.map(rule => rule.valueLimit
    ? `${rule.label}: value is within the inclusive ${rule.valueLimit.currency} ${rule.valueLimit.maximum} limit.`
    : rule.fallback ? `${rule.label}: no primary rule applies to the supplied facts.` : `${rule.label}: entity and agreement type match.`);
  return result;
}
