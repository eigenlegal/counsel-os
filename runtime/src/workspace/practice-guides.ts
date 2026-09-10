import { createHash } from "node:crypto";
import { z } from "zod";

export const GuideId = z.enum([
  "privacy",
  "employment",
  "financial-services",
  "disputes-investigations",
]);
export interface GuideDescriptor {
  id: z.infer<typeof GuideId>;
  title: string;
  version: number;
  publishedAt: string;
  contentHash: string;
  useWhen: string;
  authority: "working-method-not-law";
}
export interface PracticeGuide extends GuideDescriptor {
  method: string[];
  limits: string[];
  sourceMap: Array<{ title: string; url: string; purpose: string }>;
}
const sharedLimits = [
  "This guide is a working method, not legal authority or a verified statement of current law. Its publication date is not a legal review date.",
  "Source-map links are research starting points, not retrieved evidence. The citation lookup tool can fetch dated federal regulation sections from eCFR; it does not open arbitrary source-map URLs. Read and cite the returned saved text before using it. Statutes, cases and other jurisdictions still need separate retrieval, applicability and currency checks.",
  "Use only permitted matter records and approved Practice. A guide cannot widen retrieval scope, approve a position, make a human decision, send a message, or schedule a deadline.",
];
const definitions: Array<
  Omit<PracticeGuide, "version" | "publishedAt" | "contentHash" | "authority">
> = [
  {
    id: "privacy",
    title: "Privacy and data use",
    useWhen:
      "Personal data, employee monitoring, location tracking, vendor data use, privacy rights, security incidents, retention, automated decisions or international transfers. Combine with employment or financial-services guidance when relevant.",
    method: [
      "Start with the purpose and actual data flow: whose information, what data, who obtains/accesses it, how it is used, where it moves, and how long it is kept. Read available policies, technical descriptions and prior decisions before asking for missing facts.",
      "Separate the jurisdictions that may matter from those confirmed to apply. Examine relevant definitions, territorial scope, exclusions, sector-specific rules, dates and the organization’s role before applying a requirement. Ask the smallest useful clarification; do not assume the profile’s jurisdiction controls.",
      "Build a short issue map tied to the requested decision: purpose, alternatives, notice, permissions or other legal basis, minimization, access, vendors, rights handling, retention and security. Treat these as questions to examine, not a list of legal requirements that automatically applies.",
      "For employee data, also load employment guidance; for customer payment data, also consider financial-services guidance. For an incident, distinguish confirmed facts, containment proposals, evidence gaps and jurisdiction-specific notification research. Do not invent a notice deadline.",
      "Present a usable recommendation with assumptions, supporting passages and unresolved checks. Distinguish statutory rules, regulator guidance, contractual promises and the user’s preferred safeguards. Propose reusable lessons or a matter update only when supported.",
    ],
    limits: [
      ...sharedLimits,
      "The starter source map is not comprehensive US state, international, health, children’s or sectoral coverage. Missing a jurisdiction here does not mean it has no relevant law.",
    ],
    sourceMap: [
      {
        title: "EUR-Lex",
        url: "https://eur-lex.europa.eu/",
        purpose:
          "Find applicable EU legislation and decisions; identify the relevant version and exact provisions.",
      },
      {
        title: "California privacy laws and regulations",
        url: "https://cppa.ca.gov/regulations/",
        purpose:
          "Find California statutory and regulatory texts; distinguish adopted materials from proposals.",
      },
    ],
  },
  {
    id: "employment",
    title: "Employment and workplace decisions",
    useWhen:
      "Employee monitoring, workplace policies, complaints, investigations, hiring, discipline, termination, compensation, leave or worker classification. Combine with privacy or disputes guidance as needed.",
    method: [
      "Identify the decision being considered and the affected people’s actual working locations and roles. Read the policy, agreement, communications and prior matter notes in scope. Do not assume a contract label settles worker status.",
      "Separate an operational preference from a legal requirement, a company policy and a contractual commitment. Identify jurisdiction, timing, coverage, collective arrangements and missing facts that could change the analysis.",
      "For complaints or investigations, organize allegations, supporting and conflicting evidence, witnesses not yet heard, and open questions. Do not turn allegations into findings or imply privilege is assured merely because a lawyer is involved.",
      "For monitoring or personnel data, load privacy guidance and examine the purpose, alternatives, affected data, access, retention and employee communications. Do not infer consent or lawfulness from a proposed policy alone.",
      "Provide practical options and a proportionate next-step plan, marking any legal propositions that still need current source verification. Preserve unresolved facts when preparing a matter update; do not invent a deadline or decision owner.",
    ],
    limits: [
      ...sharedLimits,
      "This starter map is not comprehensive labor, wage/hour, benefits, immigration, local or non-US employment research. EEOC materials alone do not cover all workplace law.",
    ],
    sourceMap: [
      {
        title: "EEOC laws",
        url: "https://www.eeoc.gov/laws",
        purpose:
          "Find the relevant federal workplace statutes and distinguish their text from agency explanations.",
      },
    ],
  },
  {
    id: "financial-services",
    title: "Payments and financial services",
    useWhen:
      "Payment products, money movement, custody, wallets, lending, financial partnerships, AML, customer eligibility or licensing. Combine with privacy for customer data and disputes for contested conduct.",
    method: [
      "Map the actual funds and asset flow before assigning regulatory labels: entities, customers, counterparties, control, custody, contractual roles, geography and points of settlement. Read technical descriptions and prior recorded positions; identify inconsistencies.",
      "Break a broad supportability question into customer type, activity, jurisdiction and legal entity. Separate confirmed permission, conditional support, unresolved research and business restrictions. Do not fill gaps by extrapolating from another region.",
      "Identify which regimes may need research and test their definitions, exclusions, licenses, exemptions and relevant dates independently. Do not assume one registration, partner contract or product label answers all licensing or compliance questions.",
      "Keep statutory/regulatory requirements, agency interpretations, license conditions, contractual obligations and company risk preferences separate. Use an official source map to locate the actual text; do not treat a summary or regulator landing page as support for an exact threshold.",
      "Produce a decision-ready answer, flow description or concise supportability matrix with sources, assumptions and outstanding checks. Recommend changes to saved positions for review without silently altering them.",
    ],
    limits: [
      ...sharedLimits,
      "FinCEN is one starting point, not comprehensive state licensing, banking, securities, sanctions, consumer-finance or non-US coverage. This guide supplies no verified thresholds or exemption conclusions.",
    ],
    sourceMap: [
      {
        title: "FinCEN legal authorities",
        url: "https://www.fincen.gov/resources/fincens-legal-authorities",
        purpose:
          "Locate relevant statutes, codified regulations and separate rulemaking materials.",
      },
      {
        title: "GovInfo",
        url: "https://www.govinfo.gov/",
        purpose:
          "Locate federal primary publications and retain the applicable version and exact passage.",
      },
    ],
  },
  {
    id: "disputes-investigations",
    title: "Disputes and investigations",
    useWhen:
      "Disputed facts, internal investigations, evidence assessment, threatened claims, litigation, chronologies, witness interviews or settlement strategy. Combine with the substantive subject-area guide.",
    method: [
      "Start with the question to resolve and the procedural posture. Identify the parties, forum if known, relevant periods and whether any dates are documented. Read underlying records rather than relying only on prior summaries.",
      "Build a chronology and evidence map separating allegations, admissions, contemporaneous records, later recollections, inferences and contradictions. Track provenance and missing originals or incomplete extractions.",
      "Identify missing witnesses, records and alternative explanations. Preserve uncertainty where evidence conflicts. Treat proposed evidence-preservation and collection steps as recommendations; this app does not execute them.",
      "For legal/procedural questions, verify the relevant jurisdiction, forum, operative rules, orders and their dates. Do not calculate a deadline without its trigger, service facts, applicable rules and calendar assumptions. Do not claim a case remains good law without that verification.",
      "Deliver a focused status assessment, interview plan, chronology or options memo. Distinguish a draft strategy from an authorized settlement or factual finding. Prepare a matter update for review when it helps preserve the state of the work.",
    ],
    limits: [
      ...sharedLimits,
      "The source map is not a court docket, local-rule library or case-law citator. No filing, service, legal hold, privilege determination or deadline monitoring is performed by loading this guide.",
    ],
    sourceMap: [
      {
        title: "GovInfo",
        url: "https://www.govinfo.gov/",
        purpose:
          "A starting point for available federal primary publications; forum-specific rules, orders and case history need separate verification.",
      },
    ],
  },
];

const guides: PracticeGuide[] = definitions.map((definition) => {
  const value = {
    ...definition,
    version: 2,
    publishedAt: "2026-09-07",
    authority: "working-method-not-law" as const,
  };
  return {
    ...value,
    contentHash: createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex"),
  };
});
export function guideCatalog(): GuideDescriptor[] {
  return guides.map(
    ({
      method: _method,
      limits: _limits,
      sourceMap: _sourceMap,
      ...descriptor
    }) => ({ ...descriptor }),
  );
}
export function readPracticeGuide(
  raw: unknown,
  catalog: GuideDescriptor[],
): PracticeGuide {
  const id = GuideId.parse(raw);
  const expected = catalog.find((guide) => guide.id === id);
  const guide = guides.find((guide) => guide.id === id);
  if (!guide || expected?.contentHash !== guide.contentHash)
    throw new Error(
      "This guide version is unavailable for this response. Continue with the available records and identify any methodological gap.",
    );
  return structuredClone(guide);
}
