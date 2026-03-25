---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## Overview

# Data Privacy

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** personal data, personal information, PII, personally identifiable information, data processing, data controller, data processor, data subject, data protection, privacy policy, privacy notice, consent management, data breach, data retention, data deletion, right to erasure, opt-out, opt-in, cookies, tracking, cross-border data transfer, standard contractual clauses, SCCs, binding corporate rules, data protection officer, DPO, data protection impact assessment, DPIA, data mapping, data inventory, de-identification, anonymization, pseudonymization, behavioral advertising, targeted advertising, biometric data, geolocation data, sensitive personal data, special categories of data, data minimization, purpose limitation, lawful basis, legitimate interest, consumer health data, children's data, COPPA, student data, FERPA, parental consent, age verification, breach notification, data portability, data subject access request, DSAR, cross-context behavioral advertising, global privacy control, GPC, transfer impact assessment, TIA, adequacy decision, sub-processor
**Clause types:** data processing agreement (DPA), data protection addendum, privacy provisions, confidentiality and data handling clauses, data sharing agreements, joint controller agreements, sub-processor clauses, data transfer mechanisms, data breach notification clauses, data retention schedules, data subject access request procedures, consent mechanisms, cookie policies, parental consent provisions, age-gating provisions
**Regulatory references:** GDPR, General Data Protection Regulation, CCPA, California Consumer Privacy Act, CPRA, California Privacy Rights Act, VCDPA, CPA (Colorado Privacy Act), CTDPA, HIPAA, FERPA, COPPA, GLBA, PIPEDA, LGPD, POPIA, PDPA, UK GDPR, UK Data Protection Act 2018, ePrivacy Directive, Privacy Shield, EU-US Data Privacy Framework, APEC CBPR, PIPL, APPI, PIPA, DPDPA, Law 25 (Quebec)
**Relationship patterns:** vendor/service provider handling personal data, SaaS platforms processing user data, adtech or martech agreements, employer-employee data collection, consumer-facing products, cross-border data sharing, B2B data partnerships, analytics providers, cloud service agreements, platforms directed to children, ed-tech providers

## Sub-File Loading

| Sub-File | Load When |
|----------|-----------|
| `gdpr.md` | Parties are in the EU/EEA, data subjects are EU residents, UK GDPR applies, or GDPR is referenced explicitly |
| `ccpa-cpra.md` | California residents' data is involved, "sale" or "sharing" of personal information is discussed, or CCPA/CPRA is referenced |
| `us-state-privacy.md` | Company operates in or targets residents of Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Iowa, Indiana, Tennessee, or other states with comprehensive privacy laws |
| `international.md` | Parties or data subjects are in Canada, Brazil, Singapore, Australia, Japan, South Korea, India, China, or other non-US/EU jurisdictions |
| `coppa.md` | Product or service is directed to children under 13, collects data from children, or involves age verification or parental consent |
| `consent-mechanics.md` | Agreement addresses consent collection, cookie consent, opt-in/opt-out mechanisms, consent withdrawal, or granular consent for multiple processing purposes |
| `breach-notification.md` | Agreement contains breach notification clauses, incident response provisions, or regulatory notification timelines |
| `cross-border-transfers.md` | Data flows across national borders, SCCs or BCRs are referenced, adequacy decisions are relied on, or Transfer Impact Assessments are required |
| `data-subject-rights.md` | Agreement addresses consumer/data subject request handling, access rights, deletion rights, portability, or objection mechanisms |
| `data-processing-agreements.md` | A DPA, data protection addendum, or service provider agreement governing personal data processing is being drafted or reviewed |

**Cross-area loading:** If HIPAA applies (healthcare data, covered entity, business associate) → also load `healthcare/hipaa-compliance.md` if available, and flag HIPAA-GDPR interaction if EU health data is involved. If GLBA applies (financial institution data) → also load `financial-services/compliance-licensing.md`. If FERPA applies (student education records) → flag FERPA-COPPA interaction for ed-tech platforms.

## Quick Reference

- **gdpr.md** — EU/EEA data protection: lawful basis, DPAs, DPIAs, 72-hour breach notification, cross-border transfer mechanisms
- **ccpa-cpra.md** — California privacy: $25M/100K thresholds, sale vs. sharing, consumer rights with 45-day response, service provider contracts
- **us-state-privacy.md** — State-by-state comparison: scope thresholds, consumer rights, enforcement models, sensitive data definitions
- **international.md** — Global privacy laws: PIPEDA, LGPD, PDPA, PIPL, APPs, APPI, PIPA, DPDPA with breach timelines and transfer mechanisms
- **coppa.md** — Children's data: under-13 threshold, verifiable parental consent, operator obligations, FTC enforcement
- **consent-mechanics.md** — Consent requirements across jurisdictions: freely given, specific, informed, granular, withdrawal rights
- **breach-notification.md** — Cross-jurisdiction breach timelines: GDPR 72 hours, HIPAA 60 days, state-by-state AG notification thresholds
- **cross-border-transfers.md** — Transfer mechanisms: SCCs (2021), adequacy decisions, Schrems II supplementary measures, TIAs, APEC CBPR
- **data-subject-rights.md** — Rights by jurisdiction: access, deletion, portability, objection with response timelines and exceptions
- **data-processing-agreements.md** — Mandatory DPA clauses: GDPR Art. 28, CCPA service provider requirements, state-law DPA provisions
