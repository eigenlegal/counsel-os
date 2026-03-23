## Overview

# Insurance

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** insurance, policy, coverage, premium, deductible, retention, self-insured retention, SIR, excess, umbrella, claims-made, occurrence, insured, insurer, underwriter, broker, carrier, risk management, loss, claim, notice of claim, proof of loss, reservation of rights, denial of coverage, coverage dispute, bad faith, duty to defend, duty to indemnify, additional insured, certificate of insurance, COI, endorsement, rider, exclusion, sublimit, aggregate limit, per-occurrence limit, indemnity, hold harmless, named insured, policyholder, risk transfer, loss run, actuarial, reinsurance
**Clause types:** insurance requirements in commercial contracts, indemnification and insurance provisions, additional insured endorsements, waiver of subrogation, primary and non-contributory requirements, certificate of insurance provisions, minimum coverage requirements, self-insurance provisions, representations regarding insurance coverage, notice-of-loss provisions
**Regulatory references:** state insurance codes, state insurance department regulations, McCarran-Ferguson Act (federal deference to state insurance regulation), NAIC model laws, state unfair claims settlement practices acts, state bad faith statutes, ERISA (for certain employee benefit insurance), Affordable Care Act, state surplus lines laws, state admitted carrier requirements, Risk Retention Act
**Relationship patterns:** insured/insurer, policyholder/broker, additional insured/named insured, indemnitor/indemnitee (insurance requirements), landlord/tenant (insurance provisions), vendor/client (insurance requirements), employer/employee (workers' comp, benefits), contractor/project owner (construction insurance)

## Sub-Files

- `commercial-general-liability.md` — CGL (ISO CG 00 01): Coverage A/B/C, key exclusions, additional insured endorsements, occurrence trigger, duty to defend. Load when: bodily injury/property damage claims, commercial lease insurance requirements, vendor/contractor insurance provisions, additional insured issues.
- `professional-liability.md` — E&O and professional liability: claims-made trigger, retroactive dates, tail/ERP, Tech E&O, consent to settle, defense costs inside/outside limits. Load when: professional services agreements, technology/SaaS contracts, malpractice claims.
- `cyber-liability.md` — Cyber/privacy insurance: first-party (breach response, BI, ransomware) and third-party (regulatory defense, PCI fines, media). Load when: data breaches, ransomware, cyber insurance requirements, privacy regulatory proceedings.
- `directors-officers.md` — D&O liability: Side A/B/C coverage, fraud exclusion, insured-vs-insured, severability, allocation. Load when: corporate governance, securities litigation, derivative suits, executive indemnification.
- `employment-practices.md` — EPLI: discrimination, harassment, wrongful termination, retaliation, wage/hour exclusion, third-party coverage. Load when: employment claims, workplace harassment, termination disputes.
- `coverage-analysis.md` — Cross-cutting analysis: claims-made vs. occurrence triggers, excess/umbrella, aggregates, subrogation, additional insured priority, certificates, SIR vs. deductible, other insurance coordination. Load when: evaluating coverage adequacy, analyzing which policy responds, reviewing insurance requirements in contracts.
- `claims-procedures.md` — Claims handling: notice requirements, cooperation, defense counsel selection, reservation of rights, coverage litigation, hammer clauses, proof of loss. Load when: reporting claims, responding to ROR letters, coverage disputes, settlement negotiations under insurance policies.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Insurance is regulated at the state level under the McCarran-Ferguson Act; each state has its own insurance code governing policy forms, rates, claims handling, and insurer conduct.
- Duty to defend is typically broader than duty to indemnify — insurers must defend any claim that potentially falls within coverage, based on the allegations in the complaint (the "eight corners" or "four corners" rule in most states).
- Timely notice of claims is a policy condition; late notice may void coverage depending on the state (some states require prejudice to the insurer, others allow strict enforcement of notice deadlines).
- State unfair claims settlement practices acts impose statutory obligations on insurers for timely investigation, communication, and fair claims handling; bad faith claims can result in extracontractual damages and punitive damages.
- Workers' compensation insurance is mandatory in nearly all states; the exclusive remedy provision bars most employee tort claims against employers for workplace injuries.
- Self-insurance and captive insurance arrangements must comply with state-specific regulatory requirements.

---
## Claims Procedures

# Claims Procedures

## Applicability

Load this file when the matter involves reporting a claim to an insurer, responding
to a reservation of rights letter, disputing a coverage denial, managing defense
counsel selection, negotiating claim settlements, or advising on cooperation
obligations. Also load when evaluating bad faith or unfair claims settlement practices.

## Key Requirements

### Notice Requirements

- **What**: Timely notice to the insurer of claims and occurrences.
- **Threshold**: Claims-made: within the policy period or ERP. Occurrence: "as soon
  as practicable" or within 30–90 days.
- **Consequence**: Late notice may void coverage entirely (strict compliance states,
  ~15 states) or require the insurer to prove prejudice (~35 states).

- **Claims-made policies**: Notice is a condition precedent. Must report within
  the policy period or ERP. Late notice — even by one day — voids coverage in
  strict-compliance jurisdictions.
- **Occurrence policies**: Require notice "as soon as practicable" or within a
  fixed deadline (30–90 days). Measured from when the insured knew or should
  have known of the claim.
- **Prejudice requirement**: ~35 states require the insurer to prove actual
  prejudice before denying for late notice. ~15 states enforce strictly. For
  claims-made, most states apply strict compliance regardless.
- **Notice to whom**: Notice to the broker may NOT constitute notice to the
  insurer. Send directly to the insurer at the policy-specified address.
- **Content**: Date, description, claimant identity, estimated damages, policy
  number, all known circumstances. Over-include rather than under-include.
- **Notice of circumstances**: Report potential claims before they materialize.
  If a claim later arises, it relates back to the original notice date.

### Cooperation Clause

- **What**: Insured's duty to cooperate with the insurer's investigation and defense.
- **Threshold**: Full cooperation including depositions, document production,
  statements, and assisting defense counsel.
- **Consequence**: Material breach may void coverage if the insurer demonstrates
  substantial prejudice (majority rule) or upon any material breach (minority).

- **Voluntary payments**: Insured cannot make payments or assume obligations
  without insurer's prior written consent. Settling without consent may
  forfeit coverage. Exception: reasonable emergency measures.
- **Practical guidance**: Respond promptly. Document all communications.
  Consult coverage counsel before refusing any request.

### Defense Counsel Selection

- **What**: Who selects and controls defense counsel.
- **Threshold**: Under standard duty-to-defend policies, the insurer selects
  and controls defense counsel. Independent counsel rights are triggered by
  a conflict of interest (reservation of rights, coverage dispute).
- **Consequence**: Insured may lose the right to choose counsel; potential
  conflicts between the insurer's cost management and the insured's defense.

- **Standard rule**: Insurer selects panel counsel and controls defense strategy.
- **Independent counsel (Cumis counsel)**: When a conflict exists (ROR issued,
  coverage disputed, limits eroding), the insured selects independent counsel
  at insurer's expense. California Insurance Code Section 2860 codified this;
  Alaska, Connecticut, Florida adopted similar rules through case law.
- **Rate caps**: Independent counsel fees may be capped at panel counsel rates.
  Some states reject caps if independent counsel rates are reasonable.
- **Tripartite relationship**: Defense counsel owes duties to both insurer and
  insured. Insured is the primary client; privileged communications belong to
  the insured.

### Reservation of Rights (ROR)

- **What**: Insurer's formal notice that it is defending while reserving the
  right to deny coverage.
- **Threshold**: Must identify specific coverage issues and policy provisions.
  Generic or overly broad ROR may be insufficient.
- **Consequence**: Failure to properly respond may prejudice coverage rights.
  Insurer that defends without timely ROR may waive coverage defenses.

- **Insured's response**: (1) Engage coverage counsel, (2) determine if Cumis
  counsel rights are triggered, (3) respond to incorrect factual assertions,
  (4) preserve all relevant documents, (5) demand withdrawal or resolution path.
- **Waiver by insurer**: Defending without a timely ROR may waive coverage
  defenses. "Timely" is generally weeks, not months.
- **Non-waiver agreement**: Mutual agreement preserving both parties' rights.
  Less adversarial than ROR.

### Coverage Litigation

- **What**: Declaratory judgment actions to determine coverage obligations.
- **Threshold**: Filed when coverage disputes cannot be resolved by negotiation.
- **Consequence**: Significant legal costs; potential for extra-contractual
  damages (emotional distress, consequential damages, attorneys' fees, punitive
  damages) if insurer acted in bad faith.

- **Insurer-initiated DJ**: Filed early to resolve coverage before the underlying
  claim is tried. **Insured-initiated DJ**: Compel defense or challenge denial.
- **Parallel proceedings**: Tort action and DJ may proceed simultaneously. Some
  courts stay the DJ to prevent prejudice to the tort defense.
- **Bad faith**: Unreasonable denial may result in extra-contractual damages
  far exceeding policy limits.

### Settlement Authority and Hammer Clauses

- **What**: Who controls settlement and what happens if the insured refuses a
  reasonable settlement.
- **Threshold**: Under CGL, insurer generally controls settlement within limits.
  Under claims-made policies (E&O, D&O, EPLI), hammer clauses cap insurer
  liability if the insured refuses a recommended settlement.
- **Consequence**: Full hammer clause shifts 100% of excess liability to the
  insured if a reasonable settlement is refused.

- **Modified hammer**: Negotiate 50/50 or 70/30 split of excess. Any sharing
  arrangement is better than a full 100% hammer.
- **Consent-to-settle**: Gives insured veto power (medical malpractice, some
  E&O). Hammer clause is the insurer's counterbalance.
- **Excess exposure**: Unreasonable refusal to settle within limits may create
  bad faith liability for the full excess judgment.

### Proof of Loss

- **What**: Formal sworn statement required for first-party claims.
- **Threshold**: Due within 60–90 days of loss (policy-specific). Must detail
  amount, cause, circumstances, other insurance, with supporting documentation.
- **Consequence**: Untimely or inaccurate proof of loss may bar recovery.
  Material misrepresentations may void the entire claim or policy.

- Applies to: property, inland marine, cyber first-party, crime/fidelity policies.
- **Prompt-payment statutes**: Many states require insurers to pay undisputed
  portions within 30–60 days of satisfactory proof. Non-compliance triggers
  statutory interest, penalties, and attorneys' fees.
- **Examination under oath (EUO)**: Insurer may require an EUO as a coverage
  condition. Refusal may void coverage.

## Interaction with Other Areas

- **Litigation**: Coverage disputes are a primary source of insurance litigation.
  Bad faith claims can result in damages far exceeding policy limits.
- **Data Privacy**: Cyber claims require coordination with insurer's pre-approved
  panel vendors. Non-panel vendors without approval may reduce/void coverage.
- **All Coverage Types**: Claims procedures apply across all lines. Claims-made
  notice is stricter than occurrence. First-party requires proof of loss.
- **Consumer Protection**: NAIC Model 900 imposes obligations on insurers for
  prompt investigation, fair evaluation, and timely communication.

## Sources

- [NAIC — Unfair Claims Settlement Practices Model Act (Model 900)](https://content.naic.org/sites/default/files/inline-files/MDL-900.pdf)
- [NAIC — Unfair Property/Casualty Claims Settlement Practices](https://content.naic.org/cipr-topics/unfair-claims-settlement-practices)
- [IRMI — Claims-Made Policy Analysis](https://www.irmi.com/term/insurance-definitions/claims-made-policy)
- [California Insurance Code Section 2860 — Independent Counsel (Cumis)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=2860.&lawCode=INS)

---
## Commercial General Liability

# Commercial General Liability (CGL)

## Applicability

Load this file when the matter involves bodily injury or property damage claims,
commercial lease insurance requirements, vendor/contractor insurance provisions,
additional insured endorsements, or any contract requiring CGL coverage.
Also load for coverage disputes involving occurrence triggers, exclusion
applicability, or duty to defend vs. duty to indemnify.

## Key Requirements

### Standard ISO Form (CG 00 01)

- **What**: Three-part coverage structure for commercial liability.
- **Coverage A**: Bodily injury (BI) and property damage (PD) on an occurrence basis.
  Injury/damage must take place during the policy period regardless of when the
  claim is made. "Bodily injury" includes sickness, disease, and death. "Property
  damage" includes physical injury and loss of use of tangible property.
- **Coverage B**: Personal and advertising injury — libel, slander, false arrest,
  wrongful eviction, invasion of privacy, and copyright/trade dress infringement
  in advertising. Offense must be committed during the policy period.
- **Coverage C**: Medical payments — no-fault coverage for third-party medical
  expenses, typically $5,000–$10,000 per person, paid regardless of liability.
- **Supplementary payments**: Bail bonds (up to $250), first-aid expenses, defense
  costs, prejudgment and post-judgment interest — paid in addition to policy limits.

### Key Exclusions

- **What**: Events and liabilities excluded from CGL coverage.
- **Consequence**: Uninsured exposure if not addressed by endorsement or separate policy.

| Exclusion | Scope | Alternative Coverage |
|-----------|-------|---------------------|
| Expected/intended injury (a) | BI/PD the insured expected or intended; per-insured in most states | None — intentional acts are uninsurable |
| Contractual liability (b) | Assumed liability, EXCEPT "insured contracts" (leases, indemnification of municipalities, tort liability assumptions) | Insured contract exception restores most commercial contract coverage |
| Pollution (f) | Absolute exclusion for discharge/release of pollutants | Separate pollution liability policy |
| Professional services (j) | Acts, errors, omissions in professional services | Professional liability / E&O |
| Auto liability (g) | Ownership, maintenance, use of autos | Commercial auto policy |
| Workers' comp (d/e) | Employee injury arising from employment | Workers' compensation policy |
| Own work/product (l) | Damage to insured's completed work (subcontractor exception may apply) | Subcontractor exception; builder's risk |
| Impaired property (m) | Loss of use from product/work defect without physical injury | Product recall; Tech E&O |

### Additional Insured Endorsements

- **What**: Extensions of CGL coverage to third parties.
- **Threshold**: Must specify ISO CG 20 10 (ongoing operations) AND CG 20 37
  (completed operations), or equivalent blanket forms.
- **Consequence**: No coverage for the additional insured if the wrong form is
  used or the completed operations form is omitted.
- CG 20 10 (current edition): Covers additional insureds for BI/PD caused, in
  whole or in part, by the named insured's ongoing operations.
- CG 20 37: Covers additional insureds for BI/PD from the named insured's
  completed operations.
- Pre-2004 editions used broader "arising out of" language. Post-2004 editions
  use narrower "caused in whole or in part by" the named insured's acts/omissions.
- Blanket automatic additional insured endorsements (CG 20 33) add parties by
  operation of a written contract without individual endorsements.

### Occurrence vs. Claims-Made Trigger

- **What**: CGL is predominantly occurrence-based.
- **Threshold**: The policy in effect when BI/PD occurs responds, regardless of
  when the claim is made — even decades later.
- **Consequence**: Claims-made CGL (used for some contractors) creates tail/ERP
  exposure at policy transitions.
- For latent injuries (asbestos, environmental), multiple policy years may trigger
  depending on jurisdiction (exposure, manifestation, injury-in-fact, or
  continuous trigger theories).

### Limits Structure

- **What**: Per-occurrence and general aggregate limits.
- **Threshold**: Each occurrence limit typically $1M; general aggregate typically $2M;
  products-completed operations aggregate separately $2M.
- **Consequence**: Exhaustion of aggregate leaves insured self-insured for the
  remainder of the policy period.
- Per-project aggregate endorsement (CG 25 03): separate aggregate per project.
  Essential for construction contracts.
- Fire damage legal liability sub-limit: typically $100,000–$300,000.

### Duty to Defend vs. Duty to Indemnify

- **What**: Insurer's obligation to defend is broader than obligation to indemnify.
- **Threshold**: Under the "eight corners" or "four corners" rule, if the
  complaint's allegations potentially fall within coverage, the insurer must defend.
- **Consequence**: Insurer that wrongfully refuses to defend is liable for all
  defense costs, the full judgment (even above limits), and bad faith damages.
- Defense costs are paid IN ADDITION to policy limits under standard CGL.
- If any one claim in a multi-claim suit is potentially covered, the insurer
  must defend the entire suit.

### Waiver of Subrogation

- **What**: Endorsement (CG 24 04) waiving insurer's right to recover from
  designated parties.
- **Threshold**: Must be obtained BEFORE the loss occurs.
- **Consequence**: Post-loss waivers are generally unenforceable. Contractual
  obligation alone does not bind the insurer — actual endorsement required.

## Interaction with Other Areas

- **Employment**: CGL excludes employment-related claims (CG 21 47) — coordinate
  with EPLI and workers' compensation.
- **Data Privacy**: Coverage B may respond to some privacy claims, but most
  insurers have added cyber/data exclusions. Coordinate with cyber liability.
- **IP and Technology**: Advertising injury may cover some copyright infringement
  in advertising; patent infringement is excluded. Tech claims need Tech E&O.
- **Consumer Protection**: Product liability and consumer class actions are
  primary CGL exposures under Coverage A.
- **Litigation**: Duty-to-defend disputes are a frequent source of insurer/insured
  litigation. Engage coverage counsel early.

## Sources

- [ISO CG 00 01 — Commercial General Liability Coverage Form](https://www.iso.com)
- [NAIC — Commercial Lines Insurance](https://content.naic.org/consumer/commercial-lines.htm)
- [IRMI — Additional Insured Endorsements](https://www.irmi.com/term/insurance-definitions/additional-insured)
- [IRMI — CGL Coverage Analysis](https://www.irmi.com/term/insurance-definitions/commercial-general-liability)

---
## Coverage Analysis

# Coverage Analysis

## Applicability

Load this file when analyzing whether insurance coverage applies to a specific claim
or loss, evaluating the adequacy of an insurance program, reviewing insurance
requirements in commercial contracts, or advising on risk transfer and insurance
program structuring. Also load for disputes involving coverage triggers, priority of
coverage, coordination between multiple policies, or "other insurance" clause
interpretation.

## Key Requirements

### Claims-Made vs. Occurrence Triggers

- **What**: Determines which policy year responds to a given claim.
- **Consequence**: Incorrect trigger analysis leads to denied claims and
  uninsured losses.

- **Occurrence trigger**: Policy in effect when injury/damage occurs responds,
  regardless of when the claim is made. Dominant for CGL, property, auto,
  workers' comp. Provides "long tail" — a 20-year-old policy may respond.
- **Claims-made trigger**: Policy in effect when the claim is first made (and
  reported) responds, subject to the retroactive date. Dominant for E&O, D&O,
  EPLI, cyber. Requires careful retroactive date and tail/ERP management.
- **Trigger disputes (long-tail claims)**: For continuous/progressive injury
  (asbestos, environmental, construction defects), courts apply different theories:
  - Exposure trigger: policies during the exposure period respond.
  - Manifestation trigger: only the policy when injury becomes manifest responds.
  - Injury-in-fact trigger: policy when actual injury occurred (requires proof).
  - Continuous trigger (Keene): all policies from first exposure through
    manifestation respond pro rata.
- Applicable trigger theory varies by state and by coverage line.

### Excess and Umbrella Coverage

- **What**: Additional limits above primary policies.
- **Threshold**: Underlying policies must be maintained at specified limits for
  excess/umbrella to respond.
- **Consequence**: Gaps between primary and excess layers leave the insured
  unprotected for claims in the gap.

- **Following form excess**: Follows terms of the underlying policy. Provides
  additional limits only. Does not broaden or narrow coverage.
- **Umbrella (drop-down)**: Provides additional limits AND broader coverage for
  claims outside the underlying's scope, subject to SIR (typically $10K–$25K).
- **Drop-down**: When a claim falls within the umbrella but is excluded by the
  underlying, the umbrella drops down as primary, subject to SIR.
- **Maintenance of underlying**: If underlying coverage lapses, the insured is
  self-insured for the gap. The excess/umbrella may not respond.
- **Scheduled underlying**: Excess policies schedule specific underlying policies.
  Unscheduled claims may not trigger excess coverage.

### Aggregate Limits

- **What**: Maximum insurer payment for all claims during the policy period.
- **Threshold**: Standard CGL general aggregate: $2M. Products-completed operations
  aggregate: separate $2M.
- **Consequence**: Aggregate exhaustion leaves the insured entirely self-insured
  for the remainder of the policy period.

- **Per-project aggregate** (CG 25 03): separate aggregate per project. Essential
  for construction. **Per-location aggregate**: per scheduled location (real
  estate, retail).
- **Monitoring**: Request loss runs mid-term to track aggregate erosion.

### Subrogation and Waiver of Subrogation

- **What**: Insurer's right to recover from responsible third parties after paying
  a claim.
- **Threshold**: Waiver of subrogation must be obtained by endorsement BEFORE the
  loss occurs. Post-loss waivers are generally unenforceable.
- **Consequence**: Without a waiver endorsement, the insurer may sue the insured's
  contractual partners to recover paid claims, undermining business relationships.

- Common in: commercial leases, construction contracts, vendor agreements.
  Contractual obligation alone does not bind the insurer — actual policy
  endorsement is required.
- Anti-subrogation rule: some jurisdictions prevent subrogation against the
  insurer's own insured. Do not rely on this — obtain the endorsement.

### Additional Insured — Primary vs. Excess

- **What**: Coverage priority when both the named insured's and additional
  insured's own policies may respond.
- **Threshold**: Primary and non-contributory endorsement (CG 20 01 or equivalent)
  required for the named insured's policy to pay first.
- **Consequence**: Without the endorsement, "other insurance" clauses in both
  policies create pro-rata or equal-shares contribution, reducing the benefit
  of additional insured status.

- Post-2004 ISO endorsements use "caused, in whole or in part, by" (narrower
  than pre-2004 "arising out of"). No sole negligence coverage for the
  additional insured. Verify endorsement form and edition.

### Certificates of Insurance (COIs)

- **What**: Informational documents evidencing coverage on the date issued.
- **Threshold**: COIs do NOT modify, extend, or alter policy coverage.
- **Consequence**: Over-reliance on certificates creates a false sense of security.
  The certificate does not guarantee the additional insured has actual coverage.

- COIs do not: guarantee ongoing coverage, create additional insured status,
  modify policy terms, or obligate insurer to provide cancellation notice.
- Certificate holders should require: (1) contractual obligation to maintain
  coverage, (2) copies of actual endorsements, (3) notification obligations
  in the contract for policy changes.
- ACORD 25 (liability) and ACORD 28 (property) are standard forms.

### SIR vs. Deductible

- **What**: Structural differences in who pays first and who controls the defense.
- **Threshold**: Under an SIR, the insured must fund the full retention before the
  insurer's obligations (including defense) attach.
- **Consequence**: If the insured lacks resources to fund the SIR, the insurer's
  coverage may never attach. Additional insureds may need to satisfy the named
  insured's SIR before accessing coverage.

- **Deductible**: Insurer pays, then bills insured. Insurer controls defense.
- **SIR**: Insured pays full retention first; insurer's obligations then attach.
  Insured controls defense within the SIR layer.
- In contracts, specify maximum permissible SIR. Large SIRs ($500K+) may
  make additional insured coverage effectively illusory.

### Other Insurance Clauses — Priority

- **What**: Determines allocation when multiple policies respond to the same claim.
- **Threshold**: Clause types: primary, excess, pro-rata, escape.
- **Consequence**: Conflicting clauses (each policy claiming excess) create
  disputes, delays, and potential gaps.

- Conflicting excess clauses resolved by courts using equal shares, pro-rata by
  limits, or "closest to the risk." Specify "primary and non-contributory" in
  contracts, backed by the appropriate endorsement.

## Interaction with Other Areas

- **All Coverage Types**: Coverage analysis principles apply across all lines.
  Each coverage-type sub-file addresses trigger, limits, and exclusion specifics.
- **Litigation**: Coverage disputes are a significant source of litigation.
  Declaratory judgment actions, bad faith claims, and coverage discovery are common.
- **Corporate**: Insurance program structure is a key component of corporate risk
  management and board-level governance.

## Sources

- [NAIC — Insurance Information and Resources](https://content.naic.org)
- [IRMI — Insurance and Risk Management Glossary](https://www.irmi.com/online/insurance-glossary/default.aspx)
- [ISO — Commercial Lines Policy Forms and Endorsements](https://www.iso.com)
- [ACORD — Certificate of Insurance Standards](https://www.acord.org/standards-architecture/acord-forms)

---
## Cyber Liability

# Cyber Liability Insurance

## Applicability

Load this file when the matter involves data breaches, ransomware incidents, network
security failures, privacy regulatory proceedings, cyber insurance requirements in
contracts, or any claim involving unauthorized access, data loss, or technology-related
business interruption. Also load when reviewing cyber insurance requirements in vendor
agreements or assessing adequacy of an organization's cyber coverage.

## Key Requirements

### First-Party Coverages

- **What**: Covers the insured's own losses from cyber events.
- **Consequence**: No reimbursement for breach costs, lost income, or ransom
  payments if first-party coverage is absent or sub-limited.

- **Breach response costs**: Forensic investigation, legal counsel for regulatory
  compliance and privilege management, notification to affected individuals
  (required by all 50 states, GDPR, HIPAA), credit monitoring/identity theft
  services, public relations/crisis management. Typical sub-limit: $250K–$1M.
  Some policies provide pre-approved vendor panels.
- **Business interruption**: Lost net income and extra expenses from network
  security event causing system outage. Waiting period: typically 8–12 hours
  before coverage triggers. Dependent/contingent BI covers losses from third-party
  provider outages (cloud, SaaS, payment processors).
- **Data recovery**: Costs to restore, recreate, or recollect data and software
  damaged or destroyed by a covered cyber event.
- **Ransomware/cyber extortion**: Ransom payments (where legal) and response
  costs including negotiators and cryptocurrency procurement. Sub-limits: $100K–$500K.
  Coinsurance: 50% becoming standard in many markets post-2021.
  OFAC compliance mandatory — no payment to SDN list entities or sanctioned
  jurisdictions. Insureds must conduct OFAC screening before any ransom payment.

### Third-Party Coverages

- **What**: Covers liability to others from cyber events.
- **Consequence**: Uninsured regulatory fines, PCI assessments, and third-party
  claims if coverage is inadequate.

- **Regulatory defense and penalties**: Defense costs for proceedings by state AGs,
  FTC, HHS/OCR, GDPR supervisory authorities. Fines/penalties covered where
  insurable by law (varies by jurisdiction — many states prohibit coverage of
  punitive fines).
- **PCI fines and assessments**: Card brand fines/penalties for PCI-DSS
  non-compliance following a payment card breach. Typical sub-limit: $250K–$500K.
  PCI forensic investigation (PFI) costs may also be covered.
- **Privacy liability**: Third-party claims for unauthorized disclosure of
  personal information, failure to protect data, privacy rights violations, or
  failure to comply with the insured's own privacy policy.
- **Network security liability**: Claims arising from failure to prevent
  unauthorized access, malware transmission, or denial-of-service attacks
  originating from the insured's network.
- **Media liability**: Claims from digital/online content — defamation, copyright
  infringement, invasion of privacy through electronic publication.

### Key Exclusions

- **What**: Events and circumstances excluded from cyber coverage.
- **Consequence**: Denied claims and significant uninsured losses.

| Exclusion | Scope | Notes |
|-----------|-------|-------|
| Unencrypted data | Loss/theft of unencrypted data or portable devices | Encryption safe harbors may reduce notification obligations but not this exclusion |
| Known vulnerabilities | Failure to patch within 30–90 days of patch release | CVSS 7.0+ vulnerabilities are the primary focus; underwriters increasingly enforce |
| Infrastructure failure | Power grid, telecom, internet backbone outages | Only covers the insured's own network failures |
| War/cyber war | Nation-state attacks, cyber warfare | Lloyd's LMA 9574–9577 mandates explicit exclusions with attribution frameworks; NotPetya highlighted the gap |
| Intentional/criminal acts | Insured's own criminal conduct or intentional violations | Standard across all insurance lines |
| Prior known events | Events known before policy inception | Includes pre-existing breaches discovered during underwriting |
| Contractual liability | Liability assumed under contract beyond common law | Review whether contractual indemnity for data breaches is covered |

### Sub-Limits and Policy Structure

- **What**: Individual coverage sections subject to sub-limits below the aggregate.
- **Threshold**: Sub-limits for breach response, ransomware, PCI fines, and
  regulatory penalties are often $100K–$500K within a larger policy limit.
- **Consequence**: Actual recovery may be far less than the headline policy limit.
- Verify whether sub-limits erode or are in addition to the overall aggregate.
- Retention/deductible: $10K–$100K mid-market; $250K–$1M+ large enterprise.
  Separate retentions may apply to different coverage sections.

### Typical Market Limits

- **What**: Policy limit ranges by company size.
- **Threshold/Timeline**: Pricing stabilized 2024–2025 after significant
  2021–2023 rate increases driven by ransomware losses.

| Company Size | Revenue | Typical Aggregate |
|-------------|---------|-------------------|
| Small business | Under $50M | $1M–$2M |
| Mid-market | $50M–$500M | $5M–$10M |
| Large enterprise | $500M+ | $25M–$100M+ (multi-carrier tower) |

## Interaction with Other Areas

- **Data Privacy**: Primary insurance response for GDPR, CCPA/CPRA, HIPAA, and
  state breach notification obligations. Ensure breach response sub-limits match
  the volume of PII/PHI handled and that "personal information" definitions align
  with applicable privacy laws.
- **Professional Liability**: Tech E&O + Cyber bundles address both professional
  and cyber/privacy liability. Verify no gap between "failure to perform services"
  (E&O) and "failure to prevent unauthorized access" (cyber).
- **Financial Services**: PCI-DSS compliance addressed by cyber PCI coverage.
  Social engineering fraud (BEC) may be covered under cyber or crime/fidelity.
- **International Trade**: OFAC sanctions compliance mandatory for ransomware
  payments. Cyber war exclusions may bar nation-state attack coverage.
- **Consumer Protection**: Consumer class actions for privacy violations may be
  covered under the privacy liability section.

## Sources

- [NAIC — Cybersecurity and Data Privacy](https://content.naic.org/cipr-topics/cybersecurity)
- [ISO — Cyber Liability Coverage Forms](https://www.iso.com)
- [Lloyd's Market Association — Cyber War Exclusion Clauses (LMA 9574–9577)](https://www.lmalloyds.com/LMA/Underwriting/Non-Marine/Cyber/LMA_Cyber_Clauses.aspx)
- [OFAC — Sanctions Compliance Guidance for Ransomware Payments](https://ofac.treasury.gov/recent-actions/20201001)

---
## Directors Officers

# Directors & Officers (D&O) Liability Insurance

## Applicability

Load this file when the matter involves corporate governance, securities litigation,
shareholder derivative suits, SEC or DOJ enforcement actions, merger objection
litigation, executive indemnification, bankruptcy-related officer liability, or any
corporate document addressing D&O insurance requirements. Also load for coverage
disputes involving Side A/B/C, insured-vs-insured exclusions, or severability.

## Key Requirements

### Side A — Individual Director/Officer Coverage

- **What**: Direct coverage for individuals when the company cannot indemnify.
- **Threshold**: Triggered by corporate insolvency, statutory prohibition on
  indemnification (e.g., derivative suit settlements in Delaware), or refusal
  to indemnify.
- **Consequence**: Without Side A, directors/officers face personal asset exposure
  (homes, savings, retirement) for claims arising from their service.
- No retention applies — coverage is immediately accessible to individuals.
- Side A DIC (Difference in Conditions): standalone policy that drops down when
  the underlying ABC D&O fails to respond (insurer insolvency, coverage dispute,
  rescission, or limit exhaustion). Features: no retention, broader insuring
  agreements, fewer exclusions, priority of payment to individuals.
  Essential for public company directors.

### Side B — Company Reimbursement

- **What**: Reimburses the company for indemnification payments to directors/officers.
- **Threshold**: Subject to corporate retention — $100K–$500K (private);
  $500K–$2.5M (mid-cap public); $2.5M–$10M+ (large-cap public).
- **Consequence**: Company bears uninsured indemnification costs when Side B
  limits exhaust. Side B claims erode shared limits, reducing availability for
  Side A individual protection.

### Side C — Entity Coverage

- **What**: Coverage for the entity itself.
- **Threshold**: Public companies: securities claims only (Section 11, 10(b)).
  Private companies: typically all claims against the entity.
- **Consequence**: Entity bears defense costs for non-covered claim types if
  Side C scope is too narrow. Side C securities class action settlements
  ($20M–$40M average; $100M+ mega-settlements) are the primary driver of
  D&O limit erosion.
- Entity investigation coverage (some policies): defense costs for SEC/DOJ
  investigations targeting the entity before a formal claim is made.

### Key Exclusions

- **What**: Conduct and claim types excluded from D&O coverage.
- **Consequence**: Coverage forfeiture for excluded claims.

| Exclusion | Scope | Critical Detail |
|-----------|-------|----------------|
| Fraud/dishonesty | Excluded only after FINAL ADJUDICATION | Policy must defend fraud allegations until a court makes a final, non-appealable determination. Reject "in fact" language that may not require adjudication |
| Prior/pending litigation | Claims from known litigation or proceedings before the prior date | Prevents purchasing coverage after learning of potential claims |
| Insured vs. insured | Claims by one insured against another | Must carve out: (1) whistleblower/retaliation, (2) derivative suits, (3) employment claims by insured employees, (4) bankruptcy trustee claims |
| Professional services | Entity's professional services to clients | Covered by E&O, not D&O |
| Bodily injury/property damage | Physical harm claims | Covered by CGL, not D&O |
| ERISA | Breach of fiduciary duty under ERISA | Requires separate fiduciary liability coverage |

### Severability

- **What**: Whether one insured's conduct or knowledge is imputed to others.
- **Threshold**: Full severability (application + exclusions + non-imputation
  endorsement) is required to protect innocent directors.
- **Consequence**: Without severability, one officer's misrepresentation on
  the application can void coverage for ALL insureds, including innocent
  independent directors.
- Severability of the application: treated as if each insured submitted a
  separate application. CEO's misstatement does not void coverage for
  independent directors.
- Severability of exclusions: knowledge-based exclusions (fraud, prior
  knowledge) applied individually. One director's fraud does not trigger
  the exclusion for others.
- Non-imputation endorsement: explicitly prevents imputation of knowledge or
  conduct between insureds. Strongest form of severability protection.

### Allocation

- **What**: Division of covered and non-covered claims, parties, or damages.
- **Threshold**: Advancement-friendly policies advance 100% of defense costs
  pending final allocation. This is the preferred and expected standard.
- **Consequence**: Without advancement-friendly provisions, insureds must fund
  their pro-rata share of defense costs upfront, even if allocation is disputed.
- "Presumptive allocation" or "most favorable allocation" provisions resolve
  disputes in favor of maximum coverage for the insured.
- "Larger settlement" allocation for securities claims: divides between
  individual defendant contributions (Sides A/B) and entity contributions
  (Side C), based on relative fault.

## Interaction with Other Areas

- **Corporate**: D&O insurance must align with bylaws, charter indemnification
  provisions, and individual indemnification agreements. Advancement provisions
  should coordinate with Side B reimbursement.
- **Securities**: Side C covers securities class actions. Ensure "securities claim"
  definition encompasses state securities claims and SEC enforcement actions.
- **Employment**: Insured-vs-insured exclusion must carve out employment claims.
  EPLI covers entity; D&O covers individual officer personal liability.
- **Litigation**: D&O is a threshold consideration in derivative suits, securities
  litigation, and regulatory enforcement. Engage coverage counsel early.

## Sources

- [NAIC — Directors and Officers Liability Insurance](https://content.naic.org/cipr-topics/directors-and-officers-liability)
- [SEC — Corporate Governance and Officer/Director Obligations](https://www.sec.gov)
- [IRMI — D&O Insurance Definitions](https://www.irmi.com/term/insurance-definitions/directors-and-officers-liability-insurance)
- [Stanford Law School — Securities Class Action Clearinghouse](https://securities.stanford.edu)

---
## Employment Practices

# Employment Practices Liability Insurance (EPLI)

## Applicability

Load this file when the matter involves employment discrimination claims, harassment
allegations, wrongful termination disputes, retaliation claims, employment-related
class actions, or any contract requiring EPLI coverage. Also load when advising on
employment litigation risk, insurance adequacy, or the interplay between EPLI and
other management liability coverages (D&O, fiduciary).

## Key Requirements

### Core EPLI Coverage

- **What**: Claims-made coverage for wrongful employment practices.
- **Threshold**: Wrongful act must occur after the retroactive date; claim must be
  first made and reported during the policy period or applicable ERP.
- **Consequence**: No coverage for late-reported claims or acts before the
  retroactive date. Defense costs are typically inside limits (eroding).
- Covers claims by current, former, or prospective employees against the insured
  entity, its directors, officers, managers, and supervisors.
- Covers defense costs, settlements, and judgments. Front pay, back pay,
  compensatory damages, and (where insurable) punitive damages included.
- "Claim" broadly defined: written demands, civil proceedings, arbitration/mediation
  demands, EEOC or state/local agency charges, regulatory investigations.

### Covered Employment Practices

- **What**: Scope of wrongful acts within EPLI coverage.
- **Consequence**: Practices outside the policy's definition create uninsured exposure.

- **Discrimination**: Unlawful discrimination based on race, color, sex, age,
  disability, religion, national origin, sexual orientation, gender identity,
  pregnancy, genetic information (GINA), military/veteran status, and other
  protected characteristics under Title VII, ADA, ADEA, and state/local statutes.
- **Harassment**: Sexual harassment (quid pro quo and hostile work environment),
  non-sexual harassment based on protected characteristics, and entity liability
  for negligent hiring, supervision, or retention of harassing employees.
  Includes failure to prevent or respond to reported harassment.
- **Wrongful termination**: Termination violating federal/state law, public policy,
  or implied contract (including handbook promises). Includes constructive
  termination (intolerable working conditions forcing resignation).
- **Retaliation**: Adverse action in response to protected activity —
  whistleblowing (SOX, Dodd-Frank, FCA), discrimination complaints, FMLA leave
  requests, workers' comp claims, or participation in workplace investigations.
- **Other covered acts**: Failure to hire or promote, negligent evaluation,
  wrongful demotion/discipline, employment contract breach, defamation
  (negative references), invasion of employee privacy (monitoring, drug testing),
  wrongful infliction of emotional distress.

### Third-Party Coverage

- **What**: Extension to claims by non-employees (customers, vendors, patients).
- **Threshold**: Must be specifically requested and added by endorsement — not
  included in standard EPLI policies.
- **Consequence**: No coverage for third-party harassment or discrimination claims
  without the endorsement.
- Covers claims by non-employees alleging discrimination or harassment by the
  insured's employees in the course of their duties.
- Increasingly important for customer-facing businesses, healthcare, education,
  hospitality, and retail.
- Does not extend to consumer protection claims, product liability, or general
  negligence — those belong under CGL or other policies.

### Wage and Hour Exclusion

- **What**: Standard EPLI policies exclude all wage and hour claims.
- **Threshold**: FLSA, state wage payment acts, overtime, minimum wage, meal/rest
  break requirements, and tip credit/pooling disputes are all excluded.
- **Consequence**: Creates the single largest uninsured employment litigation
  exposure — wage/hour class actions are the largest employment litigation
  category by filings and settlement value.
- Limited coverage available by endorsement from some carriers: defense costs
  only (no indemnity), sub-limit of $100K–$500K, and higher retention.
- Full wage and hour coverage (defense + indemnity) is rare and expensive.
  Employers with significant exposure should explore dedicated policies.

### Retention and Deductible

- **What**: Per-claim retention, typically including defense costs.
- **Threshold**: $10K–$50K (small employers, under 100 employees); $50K–$250K
  (mid-market, 100–5,000 employees); $250K–$1M+ (large employers, 5,000+).
- **Consequence**: Insured bears full cost of claims below the retention.
- Retention includes both defense costs and indemnity — every dollar of defense
  within the retention reduces available amount before insurer's obligation attaches.
- Split retentions available: lower for EEOC/agency charges ($5K–$25K),
  higher for civil litigation ($50K–$250K).
- Class action claims may carry a separate, higher retention.

### Policy Limits

- **What**: Per-claim and annual aggregate limits.
- **Threshold**: $1M/$1M (small employers); $5M–$10M (mid-market); $10M–$25M+
  (large employers or high-risk industries).
- **Consequence**: Aggregate exhaustion leaves employer self-insured for
  remaining claims during the policy period.
- Defense costs erode both per-claim and aggregate limits. A single complex class
  action defense can consume $1M–$3M+ in defense costs alone.
- Excess EPLI available for higher limits, typically following form of the primary.

## Interaction with Other Areas

- **Employment Law**: EPLI is the primary insurance for employment law claims.
  Coordinate with employment practices, handbooks, anti-harassment training.
  Strong compliance programs may reduce both claims frequency and premiums.
- **Directors & Officers**: D&O insured-vs-insured exclusion must carve out
  employment claims. D&O covers personal liability of individual directors/officers;
  EPLI covers the entity and broader management.
- **Commercial General Liability**: CGL excludes employment-related claims
  (Employment-Related Practices Exclusion, ISO CG 21 47). EPLI fills this gap.
- **Workers' Compensation**: Workers' comp covers physical workplace injuries
  (no-fault). EPLI covers employment practices claims (discrimination, harassment,
  termination). Different risks; both must be maintained.
- **Fiduciary Liability**: ERISA-related claims (benefit plan administration)
  excluded from EPLI; require separate fiduciary liability coverage.

## Sources

- [NAIC — Employment Practices Liability Insurance](https://content.naic.org/cipr-topics/employment-practices-liability)
- [EEOC — Charge Statistics (FY 1997–2023)](https://www.eeoc.gov/data/charge-statistics-charges-filed-eeoc-fy-1997-through-fy-2023)
- [IRMI — EPLI Coverage Analysis](https://www.irmi.com/term/insurance-definitions/employment-practices-liability-insurance)
- [U.S. Department of Labor — Wage and Hour Division](https://www.dol.gov/agencies/whd)

---
## Professional Liability

# Professional Liability (Errors & Omissions)

## Applicability

Load this file when the matter involves professional services agreements, technology
services contracts, SaaS agreements, consulting engagements, or any claim alleging
negligent acts, errors, or omissions in professional duties. Also load for coverage
disputes involving claims-made triggers, retroactive dates, or extended reporting periods.

## Key Requirements

### Claims-Made Trigger

- **What**: Claim must be first made AND reported during the policy period.
- **Threshold**: Policy period or applicable extended reporting period (ERP).
- **Consequence**: No coverage for claims reported outside the policy period or ERP.
- Claims-made and reported: the claim must be first asserted against the insured
  during the policy period AND reported to the insurer during the same period.
- "Claim" typically includes written demands, civil proceedings, arbitration, and
  regulatory investigations. Broader definitions include threats of litigation.
- Notice of circumstances provision: allows reporting potential claims before they
  materialize. If a claim later arises from noticed circumstances, it relates back
  to the policy period when notice was given. Critical at policy transitions.
- Some policies allow reporting within a short discovery window (30–60 days)
  after the policy period; most require strict in-period reporting.

### Retroactive Date

- **What**: Earliest date from which wrongful acts are covered.
- **Threshold**: Acts before the retroactive date are excluded regardless of when
  the claim is made.
- **Consequence**: Advancing the retroactive date on renewal or carrier switch
  creates a gap for prior acts with no coverage under either policy.
- "Full prior acts" coverage (retroactive date = inception of first continuous
  policy) is the most favorable position.
- When switching carriers, the new policy's retroactive date must match or precede
  the prior policy's retroactive date.

### Extended Reporting Period (Tail Coverage)

- **What**: Period after policy expiration for reporting claims from prior acts.
- **Threshold**: Automatic ERP: 30–60 days. Supplemental tail: 1–3 years or
  unlimited at 100–200% of annual premium.
- **Consequence**: No coverage for claims arising after policy expiration if tail
  is not purchased within the election window (typically 30–60 days).
- Basic (automatic) ERP: included in most policies, triggered by cancellation or
  non-renewal (not by insured's voluntary carrier switch in most policies).
- Supplemental tail only covers claims for acts between the retroactive date and
  policy expiration — no new wrongful acts after expiration.
- Missing the tail election window permanently forfeits the right to purchase.

### Technology E&O

- **What**: Professional liability for technology products and services.
- **Threshold**: Standard E&O may exclude technology-specific claims; cyber
  liability may not cover professional service failures.
- **Consequence**: Gap in coverage for software defects, SaaS outages, data loss,
  and system integration errors.
- Covers: software defects, system failures and outages, SaaS service-level
  breaches, data loss or corruption, failure to perform as represented.
- Often bundled with cyber liability in "Tech E&O + Cyber" combination policies.
- Key distinction: Tech E&O covers third-party financial loss from tech failures;
  cyber liability covers breach response costs and privacy/security liability.
- Media liability (online content, defamation, IP infringement) may be included.

### Medical and Legal Malpractice

- **What**: Specialized professional liability for regulated professions.
- **Threshold**: State-specific mandatory minimums (e.g., $200K/$600K in some
  states for medical malpractice); Oregon mandates legal malpractice coverage.
- **Consequence**: Practice without required coverage violates state requirements.
- Medical malpractice: claims-made or occurrence-based. Consent-to-settle
  provisions are common, protecting physician reputation.
- Legal malpractice: claims-made trigger. Typical limits: $1M/$3M.
- Other regulated professions (architects, engineers, accountants) have
  specialized E&O forms tailored to their exposures.

### Consent to Settle (Hammer Clause)

- **What**: Insured's right to approve or reject proposed settlements.
- **Threshold**: If insured refuses a settlement recommended by insurer, the
  hammer clause caps insurer liability at the refused settlement amount plus
  defense costs to that point.
- **Consequence**: Insured bears 100% of any excess judgment above the refused
  settlement amount.
- Modified hammer clauses split excess liability (e.g., 50/50 or 70/30
  insurer/insured). Negotiate for modified or eliminated hammer clauses.
- Without a consent-to-settle clause, the insurer may settle without the
  insured's approval, potentially harming professional reputation.

### Defense Costs Inside vs. Outside Limits

- **What**: Whether defense costs erode ("burn") the indemnity limit.
- **Threshold**: Most professional liability policies include defense costs
  inside limits. Complex claims can generate $500K–$2M+ in defense costs.
- **Consequence**: Insured may exhaust the entire policy limit on defense alone,
  leaving nothing for settlement or judgment.
- Defense costs outside limits (DCOL) available at 10–25% premium increase.
  DCOL preserves the full indemnity limit.
- Verify whether defense costs erode the per-claim limit, aggregate, or both.

## Interaction with Other Areas

- **IP and Technology**: Technology E&O is the primary coverage for software and
  SaaS failures. Patent and trade secret claims may need separate IP defense.
- **Data Privacy**: Tech E&O + Cyber bundles address both service failures and
  breach liability. Ensure no gap between "failure to maintain security" (E&O)
  and "unauthorized access" (cyber).
- **Corporate (D&O)**: D&O excludes professional services claims; E&O is the
  appropriate coverage for the entity's professional liability.
- **Consumer Protection**: Professional services harming consumers may trigger
  both E&O claims and consumer protection regulatory proceedings.

## Sources

- [NAIC — Professional Liability Insurance](https://content.naic.org/cipr-topics/professional-liability)
- [ISO — Professional Liability Coverage Forms](https://www.iso.com)
- [IRMI — Claims-Made and Reported Policy](https://www.irmi.com/term/insurance-definitions/claims-made-and-reported-policy)
- [Oregon State Bar — Mandatory Professional Liability](https://www.osbar.org/plf/)
