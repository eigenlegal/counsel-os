import { z } from 'zod';

export const EcfrPublication = z.object({
  publisher: z.literal('ecfr'),
  title: z.number().int().min(1).max(50),
  section: z.string().regex(/^\d{1,4}[a-z]?\.\d{1,5}[a-z]?(?:-\d{1,3})?$/),
  requestedDate: z.iso.date().nullable(),
  versionDate: z.iso.date(),
  publisherCurrentThrough: z.iso.date(),
  url: z.url().startsWith('https://www.ecfr.gov/'),
}).strict();
export const StatuteLookup = z.object({
  title: z.number().int().min(1).max(54),
  section: z.string().regex(/^\d{1,6}[a-z]{0,3}(?:-\d{1,4}[a-z]?)?$/),
}).strict();
export type StatuteLookup = z.infer<typeof StatuteLookup>;
export const UscPublication = StatuteLookup.extend({
  publisher: z.literal('uscode'), requestedDate: z.null(),
  versionDate: z.iso.date(), publisherCurrentThrough: z.iso.date(),
  lawsInEffectOn: z.iso.date(), currentThroughPublicLaw: z.string().regex(/^\d{3}-\d{1,4}$/),
  url: z.url().startsWith('https://uscode.house.gov/view.xhtml?'),
}).strict();
export const Publication = z.discriminatedUnion('publisher', [EcfrPublication, UscPublication]);
export type Publication = z.infer<typeof Publication>;
export const AuthorityLookup = EcfrPublication.pick({ title: true, section: true }).extend({
  asOf: z.iso.date().optional().describe('Omit for the publisher’s latest available version. Supply a date for historical research, not a guessed effective date.'),
}).strict();
export type AuthorityLookup = z.infer<typeof AuthorityLookup>;
export interface AuthorityReceipt {
  sourceId: string; revisionId: string; title: string; version: number;
  publication: Publication; retrievedAt: string; checkedAt: string;
  reused: boolean; notes: string[];
}
