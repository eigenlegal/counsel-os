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
