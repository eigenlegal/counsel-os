---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [us-federal, us-state, international]
---
## Trade Secrets

# Trade Secrets

## Applicability

Load when the matter involves confidential business information protection, NDAs, trade secret
audits, employee departure protocols, non-compete enforcement related to trade secrets, trade
secret misappropriation claims, DTSA federal actions, inevitable disclosure doctrine, or reverse
engineering disputes.

## Key Requirements

### Definition and Elements

- **Trade secret (UTSA/DTSA definition)**: Information — including formulas, patterns, compilations,
  programs, devices, methods, techniques, processes, financial data, customer lists, business
  strategies, and negative know-how (what does not work) — that satisfies two elements:
  1. **Derives independent economic value** from not being generally known or readily ascertainable
     by proper means by others who can obtain economic value from its disclosure or use
  2. **Subject to reasonable efforts** to maintain its secrecy
- **Broad scope**: Unlike patents or copyrights, trade secrets can protect virtually any type of
  business information with no fixed term, no registration requirement, and no subject matter limitations.

### Federal Protection: DTSA (18 U.S.C. 1836)

- **Defend Trade Secrets Act (2016)**: Creates a **federal civil cause of action** for trade secret
  misappropriation. Requires the trade secret to relate to a product or service used in, or intended
  for use in, **interstate or foreign commerce**.

- **Ex parte seizure (18 U.S.C. 1836(b)(2))**:
  - Available in **extraordinary circumstances** to prevent propagation or dissemination
  - Requirements: (1) other remedies inadequate, (2) immediate and irreparable injury, (3) balance
    of hardships favors seizure, (4) likely to succeed on merits, (5) person possesses the trade
    secret, (6) matter described with reasonable particularity, (7) risk of destruction if notice given
  - Hearing must be held within **7 days** of the seizure
  - Applicant may be liable for wrongful seizure damages if the seizure was unjustified

- **Remedies under DTSA**:
  - Injunctive relief (reasonable period, not exceeding the time the secret would have remained
    secret plus time to eliminate any commercial advantage)
  - Damages for actual loss **and** unjust enrichment (or a reasonable royalty in lieu)
  - **Exemplary damages up to 2x actual damages** for willful and malicious misappropriation
  - **Attorney fees** for willful and malicious misappropriation
  - Statute of limitations: **3 years** from date misappropriation is discovered or should have been

### State Protection: UTSA

- **Uniform Trade Secrets Act**: Adopted in **48 states** plus D.C. (New York and North Carolina
  have their own common law frameworks). State and federal claims can be brought concurrently.
- **Key state variations**:
  - Statute of limitations ranges from **2 to 5 years** (UTSA default: 3 years)
  - Definition of "improper means" varies
  - Specificity required in identifying the alleged trade secret varies
  - Some states require greater particularity earlier in litigation
- **Preemption**: UTSA generally preempts conflicting state common law tort claims (e.g., unfair
  competition, unjust enrichment) based on the same factual allegations as a trade secret claim.

### Reasonable Measures to Maintain Secrecy

- **Administrative controls**:
  - Written confidentiality policies distributed to all personnel
  - Employee and contractor NDAs executed before access to confidential information
  - Employee training on trade secret identification and handling procedures
  - Exit interview procedures and return-of-materials certifications
  - Periodic trade secret audits to identify and classify protected information

- **Physical controls**:
  - Restricted access areas (badge access, locked rooms)
  - Visitor sign-in and escort requirements
  - Locked storage for physical documents
  - Clean-desk policies

- **Technical controls**:
  - Role-based access controls and multi-factor authentication
  - Encryption at rest and in transit
  - Network segmentation isolating sensitive systems
  - Data loss prevention (DLP) tools monitoring for exfiltration
  - Logging and monitoring of access to sensitive information
  - Device management and remote wipe capabilities

- **Contractual controls**:
  - NDAs with employees, contractors, vendors, and business partners
  - Non-compete and non-solicitation agreements (where enforceable)
  - Confidentiality provisions in joint development, licensing, and vendor agreements

- **Failure threshold**: Courts assess whether measures are "reasonable under the circumstances" —
  not perfect. However, **lack of any meaningful measures** is typically fatal to a trade secret claim.

### Misappropriation

- **Improper means**: Theft, bribery, misrepresentation, breach of duty to maintain secrecy,
  electronic intrusion, and espionage. **Excludes** reverse engineering and independent development.
- **Acquisition**: Acquiring a trade secret by a person who knows or has reason to know it was
  obtained through improper means.
- **Disclosure or use**: Disclosure or use without consent by someone who acquired it through
  improper means, through a relationship of trust, or by accident or mistake (and knew or should
  have known of the trade secret status).

### Whistleblower Immunity (18 U.S.C. 1833(b))

- **Scope**: Individuals may disclose trade secrets **in confidence** to a government official or to
  an attorney, **solely for the purpose of reporting or investigating a suspected violation of law**.
- **Court filings**: Trade secrets may be disclosed in a complaint or other document filed in a
  lawsuit, **provided the filing is made under seal**.
- **Employer notice obligation**: Employers **must provide notice** of this immunity in any contract
  or agreement governing trade secrets or confidential information (directly or by cross-reference
  to a policy document).
- **Consequence of failure to provide notice**: The employer is precluded from recovering
  **exemplary damages or attorney fees** in a DTSA action against that employee/contractor.

### Inevitable Disclosure Doctrine

- **Theory**: A court may enjoin a former employee from working for a competitor when the new
  position would **inevitably lead to disclosure** of the former employer's trade secrets, even
  without evidence of actual or threatened misappropriation.
- **Jurisdictional split**:
  - **Recognized**: Illinois, several other states apply the doctrine
  - **Rejected**: California — no injunction absent evidence of actual or threatened misappropriation
  - **Limited/skeptical**: Many states apply the doctrine narrowly or not at all
- **Risk factors courts consider**: Degree of similarity between old and new positions, sensitivity
  of trade secrets exposed, overlap of competitor's products/strategies, and employee bad faith.
- **Practical impact**: Even where available, courts are reluctant to impose broad injunctions.
  More commonly used to support limited restrictions (specific projects, time-limited injunctions).

### Reverse Engineering and Independent Development

- **Legitimate means**: Reverse engineering of a **lawfully acquired product** and independent
  development are not misappropriation and are complete defenses.
- **Contractual restrictions**: Parties may contractually prohibit reverse engineering (common in
  software licenses and NDAs). Enforceability varies by jurisdiction and context.
- **Limitation**: If a product is obtained through improper means, reverse engineering it does not
  cure the misappropriation.

## Interaction with Other Areas

- **Patents**: Patent filing requires public disclosure, destroying trade secret status. Trade secret
  has no fixed term and no government filing, but no protection against independent discovery.
- **SaaS/Technology**: Vendor agreements must protect proprietary algorithms and source code.
  Source code escrow raises trade secret concerns if release conditions are triggered.
- **Employment**: NDAs, PIIAs, exit procedures, garden leave, and non-competes are primary
  protection tools. California BPC 16600 limits non-competes but trade secret protections remain.
- **Open Source**: Copyleft obligations can force source code disclosure, potentially undermining
  trade secret protection for proprietary code combined with copyleft-licensed OSS.
- **Litigation**: Misappropriation claims often involve expedited TRO/PI motions, forensic
  investigation, protective orders, and criminal referral coordination (Economic Espionage Act,
  18 U.S.C. 1831-1839).
- **Data Privacy**: Employee monitoring for trade secret protection must comply with ECPA, state
  wiretapping statutes, and GDPR (for EU employees).
- **International Trade**: EU Trade Secrets Directive (2016/943) provides harmonized EU protection.
  TRIPS Article 39 requires WTO members to protect undisclosed information.

## Sources

- [DTSA (18 U.S.C. 1836) - Cornell LII](https://www.law.cornell.edu/uscode/text/18/1836)
- [Uniform Trade Secrets Act - Uniform Law Commission](https://www.uniformlaws.org/committees/community-home?CommunityKey=3a2538fb-e030-4e2d-a9e2-90373dc05b93)
- [Economic Espionage Act (18 U.S.C. 1831-1839) - Cornell LII](https://www.law.cornell.edu/uscode/text/18/part-I/chapter-90)
- [Restatement (Third) of Unfair Competition, Sections 39-45](https://www.ali.org/)
