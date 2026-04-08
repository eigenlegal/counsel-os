---
counsel-os-type: law-area
content-version: "2026-04-08"
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
