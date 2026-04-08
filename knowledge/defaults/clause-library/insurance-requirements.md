---
counsel-os-type: clause-library
content-version: "2026-04-08"
---
## Insurance Requirements

# Insurance Requirements — Clause Library

## Required Coverage Types

### Standard
> During the Term and for a period of two (2) years thereafter, Vendor shall maintain, at its own expense, the following insurance coverage with carriers rated A- VII or better by A.M. Best:
>
> (a) **Commercial General Liability (CGL)**: $1,000,000 per occurrence and $2,000,000 annual aggregate, including coverage for bodily injury, property damage, personal and advertising injury, and products/completed operations;
>
> (b) **Professional Liability / Errors & Omissions (E&O)**: $2,000,000 per claim and $2,000,000 annual aggregate, covering wrongful acts, errors, omissions, and negligent performance of professional services;
>
> (c) **Cyber Liability / Technology Errors & Omissions**: $2,000,000 per claim and $2,000,000 annual aggregate, covering data breaches, network security failures, unauthorized access, privacy violations, regulatory fines (where insurable), and crisis management/notification costs;
>
> (d) **Workers' Compensation**: Statutory limits as required by applicable law, with Employer's Liability of $1,000,000 per accident / $1,000,000 disease per employee / $1,000,000 disease policy limit;
>
> (e) **Commercial Automobile Liability** (if applicable): $1,000,000 combined single limit, covering owned, hired, and non-owned vehicles.

### Aggressive (Customer-Favorable)
> During the Term and for a period of three (3) years thereafter, Vendor shall maintain, at its own expense, the following insurance coverage with carriers rated A- VIII or better by A.M. Best and licensed to do business in each jurisdiction where Services are performed:
>
> (a) **Commercial General Liability (CGL)**: $2,000,000 per occurrence and $5,000,000 annual aggregate, including coverage for bodily injury, property damage, personal and advertising injury, products/completed operations, and contractual liability;
>
> (b) **Professional Liability / Errors & Omissions (E&O)**: $5,000,000 per claim and $5,000,000 annual aggregate (or $10,000,000 for contracts exceeding $5,000,000 annual value), covering wrongful acts, errors, omissions, and negligent performance, including failure to render services and failure of technology to perform as represented;
>
> (c) **Cyber Liability / Technology Errors & Omissions**: $5,000,000 per claim and $5,000,000 annual aggregate (or $10,000,000 if Vendor processes, stores, or has access to sensitive personal data, protected health information, or payment card data), covering data breaches, network security failures, unauthorized access or disclosure, privacy violations, regulatory fines and penalties (where insurable), PCI-DSS assessment liability, crisis management, notification costs, credit monitoring, forensic investigation, and business interruption resulting from cyber events;
>
> (d) **Workers' Compensation**: Statutory limits with Employer's Liability of $1,000,000 per accident / $1,000,000 disease per employee / $1,000,000 disease policy limit;
>
> (e) **Commercial Automobile Liability** (if applicable): $1,000,000 combined single limit;
>
> (f) **Umbrella / Excess Liability**: $5,000,000 per occurrence and aggregate, in excess of CGL, Auto, and Employer's Liability;
>
> (g) **Crime / Fidelity Bond**: $2,000,000, covering employee dishonesty, theft, forgery, and computer fraud, including coverage for third-party (Customer) losses.
>
> Coverage limits shall be reviewed annually and adjusted proportionally to reflect increases in contract value. Vendor shall not materially reduce coverage without thirty (30) days' prior written notice to Customer.

### Vendor-Favorable
> During the Term, Vendor shall maintain commercially reasonable insurance coverage appropriate to the nature of its business. Specific coverage types and limits shall be at Vendor's discretion. Upon request, Vendor shall provide a summary of its insurance program, but shall not be required to disclose policy terms, limits, or carrier information.

### Minimum Acceptable
> During the Term and for one (1) year thereafter, Vendor shall maintain: (a) CGL of $1,000,000 per occurrence / $2,000,000 aggregate; (b) Professional Liability/E&O of $1,000,000 per claim; (c) Cyber Liability of $2,000,000 per claim (if Vendor processes personal data); and (d) Workers' Compensation at statutory limits. Carriers shall be rated A- VII or better by A.M. Best.

### Notes
The Vendor-Favorable "commercially reasonable insurance" language with no specified minimums provides no meaningful protection — the customer has no way to verify that the vendor's coverage is adequate. Always specify minimum coverage types, limits, and carrier ratings. Coverage limits should be calibrated to the contract value and risk profile: a $50K annual SaaS subscription does not need $10M in E&O coverage, but a multi-million dollar outsourcing deal does. Cyber liability coverage is increasingly critical and should be required whenever the vendor processes, stores, or accesses personal data, confidential information, or financial data. The post-termination tail (2-3 years for claims-made policies) is essential because claims often arise after the engagement ends. Crime/fidelity coverage (Aggressive) is appropriate when vendor personnel have access to customer funds, financial systems, or payment processing.

## Additional Insured

### Standard
> Vendor shall cause Customer, its parent, subsidiaries, Affiliates, and their respective officers, directors, and employees to be named as additional insureds on Vendor's CGL and Umbrella/Excess Liability policies. Such coverage shall be primary and non-contributory with respect to any other insurance maintained by Customer. Vendor shall obtain a waiver of subrogation in favor of Customer on all required policies.

### Aggressive (Customer-Favorable)
> Vendor shall cause Customer, its parent, subsidiaries, and Affiliates, and their respective officers, directors, employees, agents, and successors (collectively, "Customer Additional Insureds") to be named as additional insureds on Vendor's CGL, Umbrella/Excess Liability, and Auto Liability policies for both ongoing and completed operations. Such additional insured coverage shall: (a) be primary and non-contributory with respect to any insurance or self-insurance maintained by Customer Additional Insureds; (b) apply to the full limits of the policies, not sublimited; (c) include a waiver of subrogation in favor of Customer Additional Insureds; (d) not be subject to any cross-liability exclusion; and (e) not require a claim against or naming of Vendor as a prerequisite to coverage for Customer Additional Insureds. Vendor shall ensure that the additional insured endorsement is an ISO CG 20 10 (or broader) form, or its equivalent. Vendor's insurance shall apply separately to each insured against whom a claim is made.

### Vendor-Favorable
> Upon Customer's written request, Vendor shall use commercially reasonable efforts to cause Customer to be named as an additional insured on Vendor's CGL policy, to the extent permitted by Vendor's insurance carrier and subject to any additional premium charged by the carrier (which shall be Customer's responsibility).

### Minimum Acceptable
> Vendor shall name Customer as an additional insured on Vendor's CGL and Umbrella policies. Such coverage shall be primary and non-contributory, and Vendor shall provide a waiver of subrogation in favor of Customer.

### Notes
Additional insured status on the CGL policy is the single most important insurance requirement for customers — it provides the customer with a direct right to coverage under the vendor's policy for liabilities arising from the vendor's work. The Vendor-Favorable "commercially reasonable efforts" approach provides no assurance. Key points to insist on: primary and non-contributory (so the vendor's insurance pays first), waiver of subrogation (so the vendor's insurer cannot subrogate against the customer), and no cross-liability exclusion. Additional insured status on E&O and Cyber policies is generally not available — these are first-party professional policies, so do not request it. The ISO CG 20 10 form reference (Aggressive) specifies the industry standard endorsement and avoids disputes about scope.

## Certificate of Insurance

### Standard
> Vendor shall deliver to Customer a certificate of insurance evidencing the required coverage prior to commencing Services and annually thereafter upon each renewal. Certificates shall be issued on standard ACORD forms. Vendor shall cause its insurer(s) to provide Customer with at least thirty (30) days' prior written notice of cancellation, non-renewal, or material change to any required policy. Vendor shall provide updated certificates within ten (10) business days of any policy change.

### Aggressive (Customer-Favorable)
> Vendor shall deliver to Customer certificates of insurance evidencing all required coverage: (a) prior to the Effective Date (and no Services shall commence until certificates are received); (b) annually upon each policy renewal; (c) within ten (10) business days of any change, cancellation, or non-renewal of any required policy; and (d) promptly upon Customer's request. Certificates shall be issued on standard ACORD forms and shall: (i) identify the specific policy numbers, coverage types, limits, and deductibles/SIR for each required policy; (ii) confirm additional insured status, primary/non-contributory status, and waiver of subrogation; and (iii) identify the applicable endorsement forms. Vendor shall cause its insurer(s) to endeavor to provide Customer with at least sixty (60) days' prior written notice of cancellation or non-renewal and thirty (30) days' notice of material change. Vendor's obligation to maintain insurance is independent of its receipt of any payment from Customer. Customer shall have the right to request and review copies of actual policies and endorsements (with premiums redacted).

### Vendor-Favorable
> Upon request, Vendor shall provide a certificate of insurance evidencing its current coverage. Vendor shall have no obligation to provide advance notice of policy changes, cancellation, or non-renewal.

### Minimum Acceptable
> Vendor shall provide a certificate of insurance evidencing required coverage before commencing Services and annually thereafter. Vendor shall provide thirty (30) days' notice of cancellation or material change to required policies.

### Notes
Certificates of insurance are informational only — they do not confer rights or alter the underlying policy. However, they are the practical mechanism for verifying compliance and should be required. The notice of cancellation provision is important but has a practical limitation: most insurers will only agree to "endeavor to provide" notice (not a binding obligation), and ACORD forms now include standard language to this effect. The right to review actual policies (Aggressive) is important for high-value contracts because certificates can be inaccurate or incomplete. Requiring certificates before Services commence creates a practical enforcement mechanism — suspend any commencement until compliant certificates are received.

## Tail Coverage

### Standard
> If any required insurance is written on a claims-made basis, Vendor shall maintain such coverage (or purchase an extended reporting period endorsement, commonly known as "tail coverage") for a period of three (3) years following the termination or expiration of this Agreement, with retroactive dates no later than the Effective Date of this Agreement.

### Aggressive (Customer-Favorable)
> All claims-made policies required under this Agreement shall: (a) maintain a retroactive date no later than the Effective Date of this Agreement (or the date Vendor first began providing services, if earlier); and (b) be maintained continuously during the Term and for a period of five (5) years following the termination or expiration of this Agreement, or Vendor shall purchase an extended reporting period (tail) endorsement providing coverage for claims made during such five (5) year period arising from acts or omissions during the Term. Vendor shall provide Customer with evidence of tail coverage within thirty (30) days of termination. If Vendor fails to maintain tail coverage, Customer may purchase such coverage at Vendor's expense (or offset the cost against any amounts owed to Vendor). Vendor's obligation to maintain tail coverage shall survive termination.

### Vendor-Favorable
> If any required insurance is written on a claims-made basis, Vendor shall maintain such coverage during the Term. Vendor shall have no obligation to maintain or purchase tail coverage following termination or expiration.

### Minimum Acceptable
> Claims-made policies shall be maintained for at least three (3) years following termination, or Vendor shall purchase tail coverage for such period. Retroactive dates shall be no later than the Effective Date.

### Notes
This is one of the most commonly overlooked insurance provisions. Professional liability and cyber liability policies are almost always written on a claims-made basis, meaning they cover claims made during the policy period regardless of when the underlying act occurred. If coverage lapses after the engagement ends, there is no coverage for claims arising from the vendor's work — even if the wrongful act occurred during the engagement. Three years is market standard; five years (Aggressive) is appropriate for engagements involving sensitive data or high-value professional services where claims may take years to surface. The retroactive date requirement prevents the vendor from switching to a new carrier with a later retroactive date that would create a gap in coverage. The self-help remedy in the Aggressive version (Customer may purchase at Vendor's expense) addresses the practical problem that the customer has no leverage to compel tail coverage after termination.

## Coverage Adequacy

### Standard
> Vendor's obligation to maintain insurance shall not limit Vendor's liability under this Agreement. The insurance requirements set forth herein are minimum requirements only, and Vendor is responsible for any liabilities in excess of insurance coverage or not covered by insurance. Vendor shall be solely responsible for all deductibles and self-insured retentions (SIR) under its policies.

### Aggressive (Customer-Favorable)
> Vendor's obligation to maintain insurance shall not be construed to limit, qualify, or diminish Vendor's liability or obligations under this Agreement, including any indemnification obligations. The insurance requirements are minimum requirements, and Vendor is solely responsible for: (a) any liabilities in excess of its insurance coverage; (b) any liabilities not covered by, or excluded from, its insurance policies; (c) all deductibles and self-insured retentions; and (d) any gap in coverage resulting from policy exclusions, sublimits, or conditions. Vendor's self-insured retentions shall not exceed $100,000 per claim without Customer's prior written consent. Customer's approval or acceptance of Vendor's insurance certificates or policies shall not relieve Vendor of any obligation under this Section or constitute a waiver of any right. Vendor shall not cancel, reduce, or allow to lapse any required coverage without first providing replacement coverage meeting the requirements of this Section.

### Vendor-Favorable
> The maintenance of insurance is for Vendor's benefit and Customer's protection, but shall not be construed as satisfying any liability or indemnification obligation of Vendor.

### Minimum Acceptable
> Vendor's obligation to maintain insurance does not limit Vendor's liability under this Agreement. Vendor is responsible for all deductibles, self-insured retentions, and liabilities in excess of coverage.

### Notes
This section prevents the vendor from arguing that its liability is capped at its insurance limits or that the existence of insurance excuses direct liability. The Vendor-Favorable language, while brief, essentially says the same thing but omits the explicit allocation of deductibles and SIR. The SIR cap in the Aggressive version is important because large SIRs (sometimes $500K-$1M+) effectively mean the vendor is self-insured for most claims, undermining the purpose of the insurance requirement. If the vendor has large SIRs, confirm the vendor has adequate financial resources to fund them. The prohibition on cancellation or reduction without replacement coverage (Aggressive) closes the gap between the notice-of-cancellation provision and actual enforcement.
