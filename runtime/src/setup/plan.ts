import { isAbsolute } from 'node:path';
import { z } from 'zod';

/**
 * What first-run setup needs to know (spec 2026-09-01 §4): where the vault
 * goes, the three Express identity answers, the one practice question, and
 * the two switches. The CLI and the setup API both produce this; `runSetup`
 * consumes it.
 */

export const Role = z.enum(['in-house', 'outside', 'solo']);
export type Role = z.infer<typeof Role>;

export const SetupPlan = z.object({
  /** Absolute. `~` is the caller's to expand — the runtime never guesses a home here. */
  vault: z.string().min(1).refine(isAbsolute, { message: 'vault must be an absolute path' }),
  identity: z.object({
    name: z.string().trim().min(1, 'name is required'),
    organization: z.string().trim().default(''),
    role: Role,
    jurisdiction: z.string().trim().default(''),
  }),
  /** The Express question: "what kind of law do you practice, and for what
   * kind of organization or industry?" */
  practice: z.string().trim().default(''),
  /** Founder decision 2026-09-01: on by default. Seeded by a later stage;
   * carried here so the API shape is complete. */
  sampleMatter: z.boolean().default(true),
  /** A loaded provider id to write as the default, or nothing. */
  defaultProvider: z.string().trim().min(1).optional(),
  /** `git init` + initial commit when git is on PATH. */
  git: z.boolean().default(true),
  /** First-run: "Keep every matter on this machine unless I say otherwise"
   * → `default_locality: local` in config.md (providers spec §7). */
  staysLocalDefault: z.boolean().default(false),
});
export type SetupPlan = z.infer<typeof SetupPlan>;
export type SetupPlanInput = z.input<typeof SetupPlan>;

/** The Express rule (skills/setup/SKILL.md, phase 3): the deep-tuned profile
 * only when the answer is clearly in-house counsel at a SaaS / software
 * company. Anything else gets the honest general defaults. */
export function isSaasInHouse(plan: Pick<SetupPlan, 'identity' | 'practice'>): boolean {
  return plan.identity.role === 'in-house' && /\b(saas|software)\b/i.test(plan.practice);
}

function roleWords(role: Role): string {
  if (role === 'in-house') return 'in-house counsel';
  if (role === 'outside') return 'outside counsel';
  return 'solo practitioner';
}

function sentence(text: string): string {
  const t = text.trim();
  if (t === '') return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** `practice/profile.md`, tailored the way the setup skill tailors it. Both
 * bodies are the skill's literal templates with the identity filled in. */
export function profileFor(plan: SetupPlan): string {
  const { name, organization, role, jurisdiction } = plan.identity;
  const at = organization === '' ? '' : ` at ${organization}`;
  const jurisdictionLine = jurisdiction === '' ? '' : ` Primary jurisdiction: ${jurisdiction}.`;
  if (isSaasInHouse(plan)) {
    return `---
counsel-os-type: practice
---
# Practice Profile

## Identity
${name}, ${roleWords(role)}${at}. In-house counsel for a SaaS / software company. ${sentence(plan.practice)}${jurisdictionLine}

## Principles
Business-enabler posture: find the path to yes while managing material risk. Pragmatic — spend energy on the terms that move the needle (liability, data protection, IP, term/termination) and accept market-standard terms on the rest. Prefer mutual positions.

## Voice
Professional, plain-English. Lead with an executive summary and a clear recommendation; bullets over dense paragraphs. Direct internally, measured with counterparties.

## Escalation Thresholds
- **GREEN (proceed):** mutual, market-standard terms within the seeded positions.
- **YELLOW (one reviewer):** non-mutual liability caps, data-processing / privacy terms, IP assignment.
- **RED (senior review):** uncapped liability, broad indemnities, source-code escrow, anything touching regulated or customer data at scale.

_Emphasized law areas: data protection / privacy, IP ownership, commercial contracts, employment. These thresholds are starting points — set dollar triggers and adjust to your practice._
`;
  }
  return `---
counsel-os-type: practice
---
# Practice Profile

> These are general starting-point defaults, not tailored to your practice yet and not legal advice. Tell me how you actually work and I'll refine them.

## Identity
${name}, ${roleWords(role)}${at}. ${sentence(plan.practice)}${jurisdictionLine}

## Principles
Pragmatic, market-standard defaults for now. Tell me your risk posture and what you fight for first, and I'll tailor this.

## Voice
Professional, plain-English, executive-summary-first. Adjust anytime.

## Escalation Thresholds
General defaults — escalate uncapped liability, broad indemnities, and anything touching regulated or customer data; add dollar thresholds when you're ready. Placeholders; edit to your practice.
`;
}

/** `{legal_root}/config.md`, verbatim from the setup skill (Step 1). */
export function configFor(vault: string, opts: { defaultLocality?: 'local' | 'any' } = {}): string {
  const locality = opts.defaultLocality === 'local'
    ? 'default_locality: local        # every matter stays on this machine unless its frontmatter says stays_local: false'
    : '# default_locality: any          # local = every matter stays on this machine unless its frontmatter says stays_local: false';
  return `# Counsel OS Configuration

counsel-os-config: true
config_version: 1
legal_root: ${vault}

# Optional overrides (defaults shown — uncomment to customize):
# entities_path: entities
# matters_path: matters
# auto_apply_law_updates: false   # true = update applies law content without per-area approval
# law_management: plugin          # 'user' = you own ALL law content; update stops syncing it (/counsel-os:law-refresh maintains it)
${locality}
# entity_properties:
#   type_field: counsel-os-type
#   values: [counterparty, vendor, customer, prospect, matter]
`;
}

/** `{legal_root}/.gitignore`, verbatim from the setup skill (Step 6). */
export const VAULT_GITIGNORE = '.DS_Store\n*.tmp\n*~\n';

/** The frontmatter the setup skill adds to `memory/patterns.md`. */
export const MEMORY_FRONTMATTER = '---\ncounsel-os-type: memory-patterns\n---\n';
