---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

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
