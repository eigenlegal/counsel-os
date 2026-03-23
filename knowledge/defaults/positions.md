## Acceptable Use

# Acceptable Use — Position

## Market Standard
Customer agrees to use the service in compliance with applicable laws and the vendor's acceptable use policy (AUP). Standard restrictions: no illegal activity, no infringement of third-party IP, no distribution of malware, no unauthorized access or security testing, no excessive resource consumption that degrades service for other customers. Vendor has the right to enforce violations with graduated consequences: notice, suspension of offending activity, and termination for material/repeated violations.

## Classification Guide
- **GREEN**: Restrictions limited to clearly illegal activity, IP infringement, malware distribution, and unauthorized access; graduated enforcement (written notice of violation, 15-day cure period, suspension of offending use only, then termination for material/repeated violations); AUP changes require 30+ days advance notice; no restriction on lawful competitive use; no content monitoring beyond what is required by law; carve-out for authorized penetration testing with 10 days notice; restrictions apply to the specific service, not customer's entire business.
- **YELLOW**: Broad restrictions including vague "harmful" or "objectionable" content; vendor may suspend entire account (not just offending activity) for violations; AUP changes with only 14 days notice; no cure period before suspension; no carve-out for authorized security testing; restrictions on competitive use or benchmarking; content monitoring for AUP compliance.
- **RED**: Vague restrictions that could encompass lawful business activity ("any activity that vendor deems harmful"); immediate termination without notice or cure for any AUP violation; vendor can modify AUP at any time without notice; restrictions on customer's right to use competing products; mandatory content monitoring and reporting; no appeal process for enforcement actions; AUP violations trigger uncapped indemnification.

## Escalate If
- AUP restrictions are so broad they could encompass lawful business activity.
- Vendor can terminate immediately for any AUP violation without notice or cure.
- Vendor can modify the AUP unilaterally at any time without notice.
- Restrictions limit customer's right to use competing products (anti-competitive).
- AUP violations trigger disproportionate consequences (uncapped indemnification, immediate data deletion).
- No carve-out for authorized security testing or penetration testing.
- Restrictions apply to customer's broader business operations, not just use of the service.

## Practical Guidance
- Acceptable use policies are often incorporated by reference from a URL, meaning the vendor can change them unilaterally. Require that AUP changes are subject to the same change-of-terms provisions as the main agreement (advance notice, right to object or terminate).
- Graduated enforcement is critical. A vendor should not be able to terminate your account (and access to your data) without first giving notice and an opportunity to cure. Reserve immediate suspension only for activity that poses imminent harm to the vendor's infrastructure or other customers.
- Anti-benchmarking clauses in AUPs restrict your ability to compare vendor performance with competitors. These are increasingly disfavored and should be resisted unless there is a specific justification.
- Security testing carve-outs are important for customers with mature security programs. Penetration testing against a SaaS vendor's production environment should be permitted with advance notice (10 days) and scope agreement.
- "Excessive use" restrictions in shared-infrastructure environments (multi-tenant SaaS) are reasonable, but the threshold should be defined (e.g., exceeding 3x the average usage for the customer tier) rather than left to vendor discretion.

## Key Negotiation Points
1. **Restriction scope** — limited to clearly illegal activity, IP infringement, malware, and unauthorized access; reject vague "harmful" or "objectionable" standards.
2. **Enforcement process** — written notice, 15-day cure period, suspension of offending activity (not entire account), then termination for material/repeated violations.
3. **AUP modification** — 30 days advance written notice; right to terminate if modification materially restricts lawful use.
4. **Security testing** — carve-out for authorized penetration testing with 10 days advance notice and scope agreement.
5. **Benchmarking** — no restriction on publishing or sharing benchmarking results.

## Common Traps
- **"Customer shall not use the service in any manner that vendor deems inappropriate"** — entirely subjective standard that gives the vendor unchecked enforcement discretion.
- **"Vendor may suspend or terminate customer's account immediately for any AUP violation"** — no graduated response; a minor violation could result in loss of access to all data.
- **"AUP available at [URL] and subject to change at any time"** — vendor can rewrite the rules unilaterally; combined with a termination-for-violation right, this is effectively a unilateral termination right.
- **"Customer shall not conduct any security testing against the service"** — prevents you from validating the vendor's security claims.
- **"Customer shall not use the service to compete with vendor"** — if the vendor is a platform provider and your business overlaps in any way, this restriction could be used to limit your core business operations.


---

## Ai Data Use

# AI & Data Use — Position

## Market Standard
Vendor does not use customer data (including inputs, outputs, and usage data) to train, improve, or develop AI/ML models without explicit prior written consent. Customer retains all rights to its data and any outputs generated using customer inputs. Vendor's AI features, if any, are disclosed with transparency about what models are used, how data flows, and whether third-party AI providers are involved. Opt-in (not opt-out) for any AI training on customer data.

## Classification Guide
- **GREEN**: Vendor explicitly prohibits use of customer data for AI/ML training, model improvement, or development; customer owns all outputs generated using customer data; vendor discloses all AI/ML models and third-party AI providers used in the service; opt-in required for any data use beyond service delivery; customer can disable AI features without losing core functionality; vendor warrants that pre-existing training data did not include customer's data without consent; no commingling of customer data with other customers' data for AI purposes; data processing agreements cover AI-specific use.
- **YELLOW**: Vendor has opt-out (not opt-in) mechanism for AI training on customer data; vague terms about "service improvement" that could include model training; output ownership unclear or shared between vendor and customer; third-party AI providers used but not fully disclosed; AI features cannot be disabled without losing significant functionality; vendor uses aggregated/anonymized data for model improvement without clear anonymization standards.
- **RED**: Vendor claims blanket license to use customer data for AI/ML training; no opt-out available; vendor claims ownership of outputs generated from customer inputs; customer data commingled with training data without consent; no disclosure of AI models or third-party AI providers; vendor's terms grant perpetual, irrevocable license to customer data for model development; no data processing safeguards specific to AI use; customer cannot determine whether their data was used in training.

## Escalate If
- Vendor claims any right to use customer data for AI/ML training without explicit opt-in consent.
- Vendor claims ownership of outputs generated from customer inputs or data.
- No disclosure of third-party AI providers involved in data processing.
- No opt-out mechanism for AI training or data use beyond service delivery.
- Customer data may be commingled with training data for model development.
- Vendor's privacy policy or terms of service grant broader AI data use rights than the enterprise agreement.
- AI-generated outputs may contain or expose other customers' data (model leakage risk).

## Practical Guidance
- AI data use clauses are rapidly evolving and vary dramatically across vendors. Many enterprise SaaS vendors added AI features in 2023-2025 under existing terms that did not anticipate AI use. Review the terms carefully for gaps.
- The distinction between "service delivery" and "service improvement" is critical. Vendor using your data to deliver the service you purchased is expected. Vendor using your data to train models that improve the service for all customers (or are sold separately) is a different value exchange entirely.
- Opt-in vs. opt-out matters enormously. Opt-out means your data is being used for training by default, and you must affirmatively act to stop it. Opt-in means your data is not used unless you explicitly agree. Always require opt-in.
- Third-party AI providers (OpenAI, Anthropic, Google) may have their own data use terms. If the vendor passes your data to a third-party AI provider, the chain of custody and data use rights must be clear end-to-end.
- Output ownership is a new frontier. Under current US copyright law, purely AI-generated content may not be copyrightable. Clarify contractually who owns outputs, regardless of copyright status.
- Check for conflicts between the enterprise agreement and the vendor's general terms of service or privacy policy. The enterprise agreement should explicitly supersede broader terms.

## Key Negotiation Points
1. **Training prohibition** — explicit prohibition on using customer data for AI/ML training, model improvement, or development without opt-in consent.
2. **Output ownership** — customer owns all outputs generated using customer data or inputs; vendor gets no license to outputs.
3. **Third-party AI disclosure** — vendor discloses all third-party AI providers; data flow and usage terms are transparent.
4. **Opt-in requirement** — any AI data use beyond service delivery requires explicit written opt-in, not default opt-out.
5. **Terms hierarchy** — enterprise agreement supersedes vendor's general terms of service and privacy policy on AI data use.

## Common Traps
- **"Vendor may use customer data to improve the service"** — "improve the service" is broad enough to include AI/ML training, feature development, and model optimization.
- **"Customer grants vendor a license to use data for providing and improving the service"** — standard SaaS language that now has a dramatically expanded meaning in the AI era.
- **"Vendor uses de-identified data for analytics and product improvement"** — "de-identified" is weaker than "anonymized" and may be reversible; "product improvement" includes model training.
- **"AI features are subject to vendor's AI terms at [URL]"** — separate AI terms that the vendor can modify unilaterally, potentially granting broader data use rights than the enterprise agreement.
- **"Customer acknowledges that AI outputs may not be accurate or complete"** — reasonable disclaimer, but watch for accompanying language that eliminates all vendor liability for AI outputs, including outputs that cause harm.


---

## Assignment Change Of Control

# Assignment & Change of Control — Position

## Market Standard
Neither party may assign the agreement without prior written consent of the other party, not to be unreasonably withheld, conditioned, or delayed. Exception: either party may assign to an affiliate or in connection with a merger, acquisition, or sale of all or substantially all of its assets, provided the assignee assumes all obligations in writing. Change of control defined as acquisition of 50%+ voting power, merger, or sale of substantially all assets. IPO is not a change of control.

## Classification Guide
- **GREEN**: Mutual anti-assignment with consent (not unreasonably withheld); affiliate assignment with 30 days written notice; change of control assignment permitted with written assumption of all obligations; option (not obligation) to terminate within 30-60 days if acquirer is a direct competitor; clear change-of-control definition (50%+ voting power, merger, asset sale); IPO explicitly excluded; pricing and SLA commitments survive assignment; assignee assumes data protection obligations.
- **YELLOW**: Asymmetric assignment rights moderately favoring one party; no direct competitor restriction; change of control triggers mandatory pricing renegotiation; affiliate assignment without notice; vague or missing change-of-control definition; no written assumption requirement; IPO treatment unclear; no specific survival of data protection obligations.
- **RED**: Entirely one-sided assignment rights (vendor can assign freely, customer cannot); free assignment to competitors without consent; automatic termination on change of control; no written assumption of obligations by assignee; consent can be withheld in sole discretion with no reasonableness standard; anti-assignment clause captures internal reorganizations or IPOs; silent on change of control entirely.

## Escalate If
- Vendor can freely assign but customer cannot.
- No change of control provision — agreement is silent on M&A scenarios.
- Assignment to a direct competitor is unrestricted.
- Change of control triggers automatic termination rather than an option to terminate.
- Assignee does not assume all obligations under the agreement in writing.
- Consent to assignment can be withheld in the other party's sole discretion.
- Anti-assignment clause is so broad it captures internal reorganizations or IPOs.

## Practical Guidance
- Change of control is the most commercially sensitive assignment scenario. If your vendor is acquired by a competitor, you may need to terminate and transition — but you need time to do so. An option to terminate within 30-60 days (not automatic termination) gives you control.
- "Not to be unreasonably withheld" is important but vague. Consider specifying grounds for reasonable refusal: material reduction in financial capacity, direct competitor status, regulatory prohibition, or inability to assume data protection obligations.
- Affiliate assignments are typically permitted without consent, but ensure the affiliate is bound by the same terms and the assigning party remains liable if the affiliate fails to perform.
- The written assumption of obligations is critical. Without it, the assignee may argue it is not bound by unfavorable terms.
- For data-intensive agreements, assignment or change of control may trigger data protection obligations — a new controller or processor may require DPA amendments, data transfer assessments, or data subject notification.
- In M&A transactions, anti-assignment clauses that require consent can create significant deal friction. Carving out M&A-related assignments (with assumption of obligations) avoids this while protecting both parties.

## Key Negotiation Points
1. **Consent standard** — "not unreasonably withheld, conditioned, or delayed" is the target; reject sole discretion.
2. **Competitor termination right** — option (not obligation) to terminate within 30-60 days if the acquirer is a direct competitor; define "direct competitor" specifically.
3. **Written assumption** — assignee must execute a written instrument assuming all obligations before assignment is effective.
4. **Change of control definition** — 50%+ voting power, merger, or sale of substantially all assets; explicitly exclude IPO and internal reorganizations.
5. **Survival of terms** — pricing, SLAs, data protection, and confidentiality obligations survive assignment without modification.

## Common Traps
- **"Either party may assign this agreement to a successor in interest"** — "successor in interest" is broad and could include asset purchasers who cherry-pick favorable contracts.
- **"Assignment is void without consent"** — creates a legal nullity rather than a breach. The assignment never happens, which may be worse than having the right to claim breach and seek damages.
- **"Change of control" that includes changes in board composition** — triggered by routine board turnover, creating unexpected consent requirements.
- **No ongoing liability for the assigning party** — if the assignee defaults, the original party has no continuing obligation, leaving you with a claim only against the assignee.
- **"This agreement shall be binding upon and inure to the benefit of the parties and their successors and assigns"** — standard boilerplate that can be read to override anti-assignment restrictions if not carefully drafted.


---

## Audit Rights

# Audit Rights — Position

## Market Standard
Customer has the right to audit vendor's compliance with the agreement, including security practices, data handling, and billing accuracy. Audits conducted annually during normal business hours with 30 days advance written notice. Vendor provides SOC 2 Type II reports to satisfy routine audit requests. On-site audit right preserved for cause (security incident, suspected breach, regulatory requirement). Vendor bears cost of audit if material non-compliance is found (variance exceeding 5%); customer bears cost otherwise.

## Classification Guide
- **GREEN**: Annual audit right with 30 days notice; SOC 2 Type II or ISO 27001 reports provided proactively to satisfy routine audits; on-site audit right preserved for cause (security incident, material breach, regulatory requirement); vendor bears audit cost if material non-compliance found (overcharge >5% or security deficiency); remediation plan required within 30 days of findings; audit covers security, data handling, billing, and regulatory compliance; audit by customer or qualified third-party auditor; records retained for 3+ years.
- **YELLOW**: Annual audit right but third-party auditor only (no direct customer audit); SOC 2 Type I only; no for-cause on-site audit right; customer bears all audit costs regardless of findings; remediation timeline of 60+ days; audit scope limited to billing only (no security or data handling); records retained for only 1-2 years; 60 days advance notice required.
- **RED**: No audit rights; vendor refuses to provide any security certifications or reports; quarterly audit requirements imposed on customer by vendor; audit scope excludes security and data handling entirely; vendor can deny audit requests at its discretion; no remediation obligations; vendor retains records for less than 1 year; audit findings are confidential to vendor only.

## Escalate If
- No audit rights of any kind are provided.
- Vendor refuses to provide SOC 2, ISO 27001, or equivalent security certifications.
- Audit scope explicitly excludes security practices or data handling.
- Vendor has sole discretion to deny audit requests.
- No remediation obligation for findings.
- Audit rights are one-sided (vendor audits customer but not vice versa).
- Quarterly audit frequency imposed on customer (excessive burden).

## Practical Guidance
- SOC 2 Type II reports are the most practical way to satisfy routine audit requirements. They cover a 6-12 month period and are independently verified. Accept them for annual compliance — but preserve the right to conduct on-site audits for cause.
- Billing audits for usage-based pricing are essential. Without audit rights, you are trusting the vendor's metering. Require access to raw usage data or an independent metering audit right.
- The 5% materiality threshold for cost-shifting is market standard. If the audit reveals overcharges exceeding 5%, the vendor should pay for the audit and refund the overcharges. Below 5%, customer bears the cost.
- Audit frequency matters. Annual is standard and sufficient for most vendors. Quarterly is excessive and signals distrust or regulatory overreach. For-cause audits (triggered by incidents) should always be available outside the annual schedule.
- Remediation timelines should be specific. "Vendor will address findings" is meaningless. "Vendor will deliver a remediation plan within 30 days and complete remediation within 90 days" is enforceable.
- For regulated industries (financial services, healthcare), audit rights may be mandated by regulation. OCC, FFIEC, and HIPAA all require audit access to critical vendors.

## Key Negotiation Points
1. **Frequency** — annual for routine; for-cause (unlimited) triggered by security incident, regulatory requirement, or suspected breach.
2. **Scope** — security practices, data handling, billing accuracy, and regulatory compliance; not limited to one area.
3. **Cost allocation** — vendor bears cost if material non-compliance found (>5% variance); customer bears cost otherwise.
4. **Certification acceptance** — SOC 2 Type II or ISO 27001 satisfies routine audits; on-site preserved for cause.
5. **Remediation** — plan within 30 days; completion within 90 days; re-audit right to verify remediation.

## Common Traps
- **"Vendor will make records available for inspection upon reasonable request"** — no defined frequency, no scope, and "reasonable" is subjective.
- **"Audit limited to vendor's facilities during normal business hours"** — excludes cloud infrastructure, sub-processors, and offshore operations where the real risks may lie.
- **"Customer may audit at customer's sole expense"** — even if the audit reveals massive overcharges or security failures, customer pays for the privilege of discovering them.
- **"Audit findings are vendor's confidential information"** — prevents customer from sharing findings with regulators, which may violate regulatory requirements.
- **"Vendor will provide annual SOC 2 report in lieu of all other audit rights"** — eliminates the right to audit for cause even after a security incident.


---

## Compliance Certifications

# Compliance & Certifications — Position

## Market Standard
Vendor represents and warrants compliance with all applicable laws and regulations, including data protection, anti-corruption, sanctions, and export controls. Vendor maintains relevant industry certifications (SOC 2 Type II, ISO 27001, PCI-DSS as applicable) and provides current certification reports upon request. Certifications renewed annually. Vendor notifies customer within 30 days of any material change in certification status, regulatory investigation, or enforcement action that could affect the services.

## Classification Guide
- **GREEN**: Vendor warrants ongoing compliance with all applicable laws (data protection, anti-corruption, sanctions, export controls); SOC 2 Type II or ISO 27001 certification maintained and reports provided annually; PCI-DSS certification for payment data processing; vendor notifies customer within 5 business days of material compliance events (loss of certification, regulatory investigation, enforcement action); compliance representations refreshed annually and upon renewal; vendor maintains written compliance program; regulatory change notification within 30 days.
- **YELLOW**: Compliance warranty limited to "material" applicable laws; SOC 2 Type I only or ISO 27001 without annual surveillance audit; certifications provided on request rather than proactively; 30-day notification of compliance events; no written compliance program requirement; compliance representations made only at signing (not ongoing); no regulatory change notification obligation.
- **RED**: No compliance-with-law warranty; no security certifications or vendor refuses to share reports; vendor disclaims knowledge of regulatory requirements; no notification of investigations, enforcement actions, or loss of certifications; compliance representations are "to vendor's knowledge" only; no anti-corruption or sanctions representations; vendor resists regulatory audit or inquiry cooperation.

## Escalate If
- No compliance-with-law warranty of any kind.
- Vendor lacks SOC 2, ISO 27001, or equivalent security certifications and refuses to obtain them.
- Vendor refuses to disclose certification status or share reports.
- No notification obligation for regulatory investigations or enforcement actions.
- Anti-corruption and sanctions representations are absent (especially for international vendors).
- Vendor's compliance representations are qualified with "to vendor's knowledge" or "to the best of vendor's belief."
- No cooperation obligation for regulatory audits or inquiries involving the customer.

## Practical Guidance
- "Compliance with applicable laws" is the minimum warranty. Without it, the vendor's regulatory failures become your operational risk. If the vendor loses a critical certification or violates data protection laws, your operations may be affected.
- SOC 2 Type II is the gold standard for SaaS vendors because it covers a 6-12 month audit period and tests operating effectiveness, not just design. Type I is a point-in-time snapshot and significantly weaker.
- For vendors handling payment data, PCI-DSS Level 1 certification is non-negotiable. Lower PCI levels involve self-assessment rather than independent audit.
- Anti-corruption (FCPA, UK Bribery Act) and sanctions (OFAC, EU sanctions) representations are essential for international engagements. A vendor violation can create secondary liability for your organization.
- Notification of compliance events should be prompt (5 business days) for events that directly affect the services, and 30 days for events that may affect the services. Distinguish between the two.
- Cooperation obligations are critical for regulated customers. If your regulator (OCC, FFIEC, SEC, FCA) needs to audit or investigate your vendor, the vendor must cooperate. Refusal to cooperate may put you in breach of your own regulatory obligations.

## Key Negotiation Points
1. **Scope of compliance warranty** — all applicable laws, not just "material" laws; ongoing, not just at signing.
2. **Certification requirements** — SOC 2 Type II or ISO 27001 minimum; PCI-DSS for payment data; annual renewal.
3. **Notification timing** — 5 business days for material events (loss of certification, regulatory action); 30 days for changes in regulatory landscape.
4. **Report access** — annual proactive delivery of certification reports; right to request ad hoc reports for cause.
5. **Regulatory cooperation** — vendor cooperates with customer's regulatory audits and inquiries at vendor's expense.

## Common Traps
- **"Vendor will comply with applicable laws in all material respects"** — "material respects" qualifier creates a gap for "immaterial" violations that could still affect your operations.
- **"Vendor maintains industry-standard security practices"** — not the same as holding a specific certification. "Industry standard" is subjective and unverifiable without a certification framework.
- **"Certification reports are vendor's confidential information and may not be shared"** — prevents you from sharing with your regulators, auditors, or board, which may violate your own compliance obligations.
- **"Vendor will notify customer of material changes in compliance status"** — "material" is undefined, and the vendor decides what is material.
- **"To vendor's knowledge, vendor complies with applicable laws"** — knowledge qualifier means the vendor is not responsible for violations it has not yet discovered, even through negligent oversight.


---

## Confidentiality

# Confidentiality — Position

## Market Standard
Mutual confidentiality obligations covering all non-public information disclosed by either party. Standard of care: at least the same degree of care used to protect own confidential information, but no less than reasonable care. Duration: 3-5 years from disclosure for general confidential information; indefinite for trade secrets. Standard exclusions: publicly known, independently developed, rightfully received from third parties, required by law with notice.

## Classification Guide
- **GREEN**: Mutual obligations; reasonable care standard (no less than own confidential information); 3-5 year duration with perpetual trade secret carve-out; standard exclusions; need-to-know dissemination limits; return/destruction within 30 days of termination with officer certification; compelled disclosure with prompt notice (within 5 business days) and cooperation for protective orders; injunctive relief acknowledged.
- **YELLOW**: 2-year duration for general information; marking requirements for all information including oral; broad residuals clause limited to general concepts; no explicit injunctive relief provision; permitted disclosure to affiliates without binding written obligations; no certification of destruction; 60-day return/destruction window.
- **RED**: One-sided obligations; duration under 2 years; no trade secret protection; broad residuals clause permitting unrestricted use of ideas, concepts, know-how, and techniques; no return/destruction obligation; no notice for compelled disclosure; receiving party can share with affiliates freely; no dissemination limits.

## Escalate If
- Confidentiality obligations are entirely one-sided.
- Duration is less than 2 years for general confidential information.
- No trade secret carve-out for extended/perpetual protection.
- Residuals clause permits unrestricted use of ideas and concepts from confidential information.
- No return/destruction obligation upon termination.
- Compelled disclosure provision lacks notice requirement.
- No injunctive relief acknowledgment for breach.
- Definition of "Confidential Information" excludes oral or visual disclosures entirely.

## Practical Guidance
- Residuals clauses are the most dangerous provision in confidentiality sections. A broad residuals clause ("Party may use ideas, concepts, know-how, and techniques retained in unaided memory") can effectively hollow out the entire NDA. Narrowing to "general skills and experience" is safer.
- Marking requirements create gaps. If only marked information is "Confidential," oral disclosures and demos are unprotected unless there is a follow-up designation period (typically 15-30 days).
- The distinction between "return or destroy" matters. Destruction is harder to verify. Require certification by an officer, not just an employee.
- Confidentiality provisions in commercial agreements often have shorter durations than standalone NDAs. Check whether the NDA survives or is superseded by the main agreement.
- Consider whether the agreement permits disclosure to potential acquirers or investors under NDA — this is standard for venture-backed companies and should be explicitly addressed.

## Key Negotiation Points
1. **Duration** — 3-5 years for general information; perpetual for trade secrets; resist anything under 3 years.
2. **Residuals clause** — narrow to "general skills and experience" or reject entirely; never accept "ideas, concepts, know-how, and techniques."
3. **Compelled disclosure mechanics** — notice required with enough time to seek protective order (minimum 5 business days where legally permitted).
4. **Return/destruction** — within 30 days of termination; officer certification; exception for archival copies required by law or backup systems.
5. **Standard of care** — "no less than reasonable care" is the floor; "same as own confidential information" is acceptable only if paired with the reasonable care floor.

## Common Traps
- **"Except as retained in unaided memory of personnel"** — this residuals clause guts confidentiality for anything discussed orally, which is most sensitive information.
- **Marking requirement with no oral/visual follow-up** — anything shown in a demo or discussed verbally is unprotected.
- **"Confidential Information does not include information that becomes publicly available"** — missing "through no fault of the receiving party" means the receiving party could leak it and then claim the exclusion.
- **Return/destruction "upon request" rather than "upon termination"** — if no one remembers to request, the obligation never triggers.
- **Survival clause that says "2 years from effective date" instead of "2 years from disclosure"** — information disclosed in year 3 of a 5-year deal gets zero protection.


---

## Data Protection

# Data Protection — Position

## Market Standard
Vendor processes customer personal data only on customer's documented instructions. A Data Processing Agreement (DPA) conforming to GDPR Article 28 requirements is executed. Vendor implements appropriate technical and organizational measures. Sub-processor use requires prior notice (30+ days) with customer right to object. Breach notification within 72 hours (aligned with GDPR Article 33). Data localization within EEA or approved jurisdictions with valid transfer mechanisms.

## Classification Guide
- **GREEN**: GDPR-compliant DPA with all Article 28 requirements; breach notification within 72 hours of discovery with detailed incident report within 5 days; sub-processor list published with 30+ days advance notice of changes and right to object and terminate; SOC 2 Type II or ISO 27001 certified; data processing within EEA or with SCCs and supplementary measures; data return in portable format within 30 days of termination; deletion within 90 days with certification; no AI/ML training on customer data.
- **YELLOW**: Breach notification between 72-96 hours; sub-processor list available but only 14 days advance notice of changes; SOC 2 Type I only; limited audit rights (once per year, third-party only); data processed outside EEA but with SCCs; vague AI/ML usage terms; data return within 60 days; no portable format requirement.
- **RED**: No DPA offered; breach notification over 96 hours or undefined; vendor claims rights to customer personal data; no sub-processor disclosure; no security certifications; data processed in jurisdictions without adequate protections or transfer mechanisms; vendor uses customer data for AI/ML training without explicit authorization; no data deletion upon termination; vendor retains data indefinitely.

## Escalate If
- Vendor claims ownership of or broad license to customer personal data.
- No DPA is offered or vendor refuses to sign a DPA.
- Breach notification exceeds 72 hours or has no defined timeline.
- Vendor refuses to disclose sub-processor list or changes.
- No data localization commitments and data may be processed in jurisdictions without adequate protections.
- Vendor refuses audit rights or independent certification.
- No data deletion/return obligations upon termination.
- Cross-border transfer mechanisms are absent or inadequate post-Schrems II.

## Practical Guidance
- GDPR, CCPA/CPRA, and emerging US state privacy laws impose specific processor obligations. A DPA is now table stakes, not a negotiation point.
- Post-Schrems II, SCCs alone may be insufficient. Require a Transfer Impact Assessment and supplementary technical measures (encryption, pseudonymization) for transfers to the US or other non-adequate jurisdictions.
- Sub-processor management is a growing regulatory focus. The right to object to new sub-processors is meaningless without a termination right if the objection is overruled.
- Breach notification timing starts "upon discovery" — watch for language that says "upon confirmation" or "upon completion of investigation," which delays the clock.
- AI/ML training on customer data is a rapidly evolving risk area. Any use of customer data for model training should require explicit opt-in, not just absence of opt-out.
- Data return format matters. Require a structured, commonly used, machine-readable format (CSV, JSON, API export), not proprietary formats that create lock-in.

## Key Negotiation Points
1. **Breach notification** — 72 hours from discovery is the standard; resist "without undue delay" without a defined outer limit.
2. **Sub-processor controls** — 30 days advance notice, right to object, right to terminate if objection is not accommodated.
3. **Audit rights** — at least annually; third-party audit reports (SOC 2 Type II) satisfy between on-site audits; on-site audit right preserved for cause.
4. **Data return/deletion** — return within 30 days in portable format; deletion within 90 days with written certification.
5. **Transfer mechanisms** — SCCs plus supplementary measures; Transfer Impact Assessment available on request.

## Common Traps
- **"Vendor will notify customer of a breach without undue delay"** — no defined timeline means potentially weeks of delay. Pin it to 72 hours.
- **"Sub-processors listed at [URL]"** — vendor can change sub-processors by updating a webpage. Require affirmative notice, not just URL monitoring.
- **"Customer may audit once per year upon 30 days notice at customer's expense"** — sounds reasonable, but combined with "during normal business hours" and "not to interfere with operations," it can be made practically impossible.
- **"Data will be deleted in accordance with vendor's standard retention policy"** — vendor's policy may retain data for years. Require deletion within a specific period (90 days) with certification.
- **"Vendor may use aggregated and anonymized data"** — if the anonymization is reversible or the aggregation is insufficient, this creates a backdoor to use personal data without restriction.


---

## Dispute Resolution

# Dispute Resolution — Position

## Market Standard
Multi-step escalation: good-faith negotiation between designated executives (15-30 days), then mediation (optional), then binding arbitration or litigation. Governing law specified (Delaware, New York, or England & Wales for well-developed commercial law). Arbitration under AAA, JAMS, or ICC rules. Carve-out for injunctive relief — either party may seek emergency relief in any court of competent jurisdiction without exhausting the escalation process.

## Classification Guide
- **GREEN**: Multi-step escalation (negotiation 15-30 days, then mediation or arbitration); governing law in well-developed commercial jurisdiction (Delaware, New York, California, England & Wales, Singapore); venue convenient for both parties or virtual hearings permitted; injunctive relief carve-out for IP and confidentiality; 1 arbitrator for disputes under $1M, 3 for disputes over $1M; prevailing party entitled to reasonable attorneys' fees; confidential proceedings; expert determination for technical disputes (SLA calculations).
- **YELLOW**: Direct to arbitration without negotiation step; governing law in a reasonable but less familiar jurisdiction; no mediation option; no prevailing party fee-shifting; arbitration in the other party's home jurisdiction with no virtual hearing option; waiver of jury trial without arbitration clause; small claims carve-out absent.
- **RED**: Foreign governing law with no nexus to either party or the transaction; mandatory litigation in an inconvenient distant jurisdiction; no injunctive relief carve-out; waiver of all equitable remedies; dispute resolution process with arbitration fees exceeding $50K for initiation; conflicting dispute resolution mechanisms in related agreements; class action waiver in consumer-facing context.

## Escalate If
- Governing law is a foreign jurisdiction with no connection to either party or the transaction.
- Mandatory arbitration in a jurisdiction inconvenient for our company with no virtual hearing option.
- No carve-out for injunctive relief from the escalation process.
- Dispute resolution requires proceedings in multiple jurisdictions.
- Waiver of jury trial without corresponding arbitration clause.
- Choice of law creates conflicts with mandatory local regulations (e.g., data protection).
- Class action waiver in a consumer-facing agreement.

## Practical Guidance
- Governing law determines how every ambiguity in the contract is resolved. Delaware and New York have the most developed bodies of commercial contract law. Choose them unless there is a specific reason not to.
- Arbitration is generally preferred for cross-border disputes because awards are enforceable in 170+ countries under the New York Convention. Court judgments are not.
- Confidentiality of proceedings is a significant advantage of arbitration. Litigation is generally public record.
- The injunctive relief carve-out is critical. Without it, a party leaking trade secrets could force you into a 6-month arbitration process before you can get a court order to stop the disclosure.
- For technical disputes (e.g., SLA measurements, acceptance testing), expert determination is faster and cheaper than full arbitration.
- Fee-shifting (prevailing party recovers attorneys' fees) discourages frivolous claims and levels the playing field between parties with different litigation budgets.

## Key Negotiation Points
1. **Governing law** — well-developed commercial jurisdiction with established precedent; avoid jurisdictions unfamiliar to either party.
2. **Escalation process** — negotiation first (15-30 days), then mediation or arbitration; avoid direct-to-litigation.
3. **Injunctive relief carve-out** — must be available for IP infringement, confidentiality breach, and data protection violations.
4. **Arbitration mechanics** — number of arbitrators based on dispute value; reputable rules (AAA, JAMS, ICC); virtual hearings available.
5. **Fee-shifting** — prevailing party recovers reasonable attorneys' fees; important deterrent against bad-faith claims.

## Common Traps
- **"All disputes shall be resolved exclusively by arbitration"** — without an injunctive relief carve-out, you cannot get emergency court orders to stop ongoing harm.
- **"Governing law of [foreign jurisdiction]" in a domestic US contract** — creates unexpected interpretive frameworks and potential conflicts with mandatory US regulations.
- **"Each party bears its own costs regardless of outcome"** — removes any deterrent for bringing frivolous claims or refusing reasonable settlements.
- **"Disputes shall be submitted to the courts of [city]"** — if the city is far from both parties, this becomes a practical barrier to justice.
- **Separate dispute resolution clauses in the MSA, SOW, and DPA** — creates conflicting mechanisms and potential jurisdictional disputes about which clause governs.


---

## Fees Payment

# Fees & Payment — Position

## Market Standard
Fees specified in an order form or pricing schedule. Net 30 payment terms from invoice date. Annual price increases capped at the lesser of CPI or 5%, with 60-90 days notice. Disputed invoices may be withheld in good faith without triggering breach, provided the undisputed portion is paid timely. Late payment interest at 1-1.5% per month or the maximum legal rate, whichever is lower. Suspension (not termination) of service after 30 days of non-payment with 10 days prior written notice.

## Classification Guide
- **GREEN**: Clear pricing schedule with all fees disclosed; Net 30 payment terms; annual increases capped at CPI or 3-5% (lesser of) with 60+ days advance notice; good-faith dispute rights for invoices; transparent usage metering with quarterly usage reports and audit rights; late payment triggers suspension (not termination) after 30 days with 10 days notice; reasonable late payment interest (1-1.5%/month); pro-rata refund of prepaid fees on termination for cause.
- **YELLOW**: Net 15 payment terms; annual increases capped at 5-7%; no good-faith dispute right; late payment interest above 1.5%/month; limited usage visibility with no audit rights; price increases with only 30 days notice; some ambiguity in included vs. extra charges; no pro-rata refund provision; quarterly prepayment required.
- **RED**: Unilateral price increases without cap or notice during the term; payment terms shorter than Net 15; prepayment for 12+ months without bankruptcy/termination protection; no invoice dispute right; automatic termination for late payment without cure period; no usage-based billing transparency or audit rights; hidden or undisclosed fees; late payment interest exceeding legal limits; no refund under any circumstance.

## Escalate If
- Fees can be increased unilaterally without notice or cap during the commitment term.
- Payment terms shorter than Net 15 or require prepayment for 12+ months.
- No right to dispute invoices in good faith.
- Late payment triggers automatic termination rather than suspension.
- No audit rights on usage-based billing.
- Hidden fees, implementation costs, or charges not disclosed in the agreement or order form.
- Taxes allocated entirely to customer without regard to applicable tax law.
- No refund of prepaid fees on termination for vendor's breach.

## Practical Guidance
- Pricing models (subscription, usage-based, tiered, per-seat) have different risk profiles. Usage-based pricing can spike unpredictably; subscription pricing is more predictable but less flexible. Consider whether a committed minimum plus usage overage provides the best balance.
- Prepayment for long periods concentrates credit risk. If the vendor goes bankrupt, prepaid fees may be unrecoverable. For annual prepayment over $100K, consider quarterly billing or require the vendor to maintain a standby letter of credit.
- "Paid or payable" matters for liability caps. If the cap is tied to fees paid and you prepay annually, a breach in month 1 gets a much higher cap than under monthly billing. Align billing terms and cap measurement.
- Usage-based pricing requires transparent metering with regular reports. Without audit rights, you are trusting the vendor's meter. Require access to a real-time usage dashboard and annual audit rights at vendor's expense if overcharges exceed 5%.
- Currency provisions in international contracts must specify billing currency and exchange rate risk allocation. Pin the exchange rate at invoice date, not payment date.

## Key Negotiation Points
1. **Price increase cap** — CPI or 3-5% (lesser of) with 60+ days notice; no increases during the initial term; increases only at renewal.
2. **Payment terms** — Net 30 is standard; resist anything shorter; Net 45-60 is achievable for large customers.
3. **Invoice dispute rights** — good-faith right to withhold disputed amounts without triggering breach or suspension; dispute resolution within 30 days.
4. **Usage transparency** — real-time dashboard, quarterly usage reports, annual audit right at vendor expense if overcharges exceed 5%.
5. **Fee completeness** — all-in pricing; order form lists every charge including implementation, training, integrations, support tiers, and overages.

## Common Traps
- **"Fees subject to change upon 30 days notice"** — this allows mid-term price increases with minimal notice, effectively making the contract month-to-month on pricing.
- **"Customer is responsible for all applicable taxes"** — without qualification, this could include vendor's income taxes. Specify: "Customer is responsible for sales, use, and VAT taxes; vendor is responsible for income taxes."
- **"Unused credits/prepaid amounts expire at the end of each term"** — creates a use-it-or-lose-it dynamic that benefits only the vendor.
- **Annual prepayment with no refund clause** — if vendor materially breaches in month 3, customer has already paid for 12 months with no path to recovery.
- **"Overage charges at vendor's then-current list price"** — list prices can be 3-5x the negotiated rate. Cap overages at the contracted per-unit rate or no more than 110% of that rate.


---

## Force Majeure

# Force Majeure — Position

## Market Standard
Neither party is liable for failure to perform obligations (other than payment obligations) due to events beyond its reasonable control. Standard qualifying events: natural disasters, war, terrorism, civil unrest, government orders, pandemics/epidemics, embargoes, widespread infrastructure failures. Affected party must provide notice within 5 business days and use commercially reasonable efforts to mitigate. Either party may terminate if the force majeure event continues for 60-90 days.

## Classification Guide
- **GREEN**: Mutual force majeure clause; standard list of qualifying events including pandemics; payment obligations explicitly excluded; notice required within 5 business days of the triggering event; commercially reasonable mitigation obligation; partial performance required to extent possible; either party may terminate after 60-90 days of continuous force majeure; obligations resume upon cessation of the event.
- **YELLOW**: Overly broad event list (20+ categories); no explicit pandemic inclusion or exclusion; termination trigger over 90 days (91-120 days); no explicit mitigation obligation; cyber-attacks included without carve-out for inadequate security; one-sided but with reasonable scope; no partial performance requirement; notice within 15 days.
- **RED**: One-sided force majeure (vendor only); excuses payment obligations; includes events within the party's control (financial difficulties, staffing shortages, market changes, currency fluctuations); no termination right regardless of duration; no notice or mitigation requirements; excludes pandemics entirely; includes economic hardship or "commercial impracticability."

## Escalate If
- Force majeure excuses payment obligations.
- No termination right after extended force majeure.
- Events within the party's control are included (financial difficulties, staffing issues).
- No mitigation obligation.
- No notice requirement for invoking force majeure.
- Force majeure is entirely one-sided (only benefits vendor).
- Pandemic exclusion in a post-COVID agreement.
- Economic hardship or market conditions included as qualifying events.

## Practical Guidance
- Post-COVID, force majeure clauses receive much greater scrutiny. Parties now negotiate these actively rather than treating them as boilerplate.
- Pandemics should remain a qualifying event, but "known pandemic" carve-outs are reasonable for new agreements — meaning the current COVID situation does not excuse performance, but a new pandemic does.
- Cyber-attacks as force majeure are debatable. A party that failed to implement reasonable security measures (no MFA, unpatched systems) should not benefit from force majeure for a cyber-attack. Include a carve-out: "cyber-attack, provided the affected party maintained commercially reasonable security measures."
- For SaaS/cloud vendors, their business continuity and disaster recovery capabilities should reduce reliance on force majeure. A well-architected cloud service should survive regional outages through redundancy.
- Supply chain disruptions present a gray area. Whether they qualify depends on foreseeability and the specific clause language. Pin down whether the clause requires "impossibility" or merely "impracticability."
- Government regulatory changes should be distinguished from force majeure events. A new regulation that makes performance more expensive is not the same as a government order that makes performance illegal.

## Key Negotiation Points
1. **Qualifying events** — standard list (natural disaster, war, pandemic, government order); reject financial difficulty, staffing, and market conditions.
2. **Payment exclusion** — payment obligations are never excused by force majeure; this is a bright line.
3. **Termination trigger** — 60-90 days of continuous force majeure; resist anything over 120 days.
4. **Mitigation obligation** — commercially reasonable efforts to mitigate and resume performance, including invoking DR/BC plans.
5. **Cyber-attack carve-out** — only qualifies if the affected party maintained commercially reasonable security measures.

## Common Traps
- **"Including but not limited to"** — an open-ended qualifier that allows a party to claim virtually any event as force majeure.
- **"Inability to obtain materials or supplies"** — this is a supply chain issue that the vendor should manage through alternative sourcing, not a true force majeure.
- **No expiration** — force majeure that suspends obligations indefinitely without a termination trigger locks you into a non-performing contract forever.
- **"Force majeure includes changes in law or regulation"** — if a new regulation makes the vendor's compliance more expensive, that is a business cost, not force majeure.
- **"The affected party's obligations are excused for the duration of the event"** — "excused" is stronger than "suspended." Excused obligations may not resume when the event ends.


---

## Indemnification

# Indemnification — Position

## Market Standard
Mutual indemnification for third-party claims arising from (a) IP infringement, (b) breach of confidentiality, and (c) gross negligence or willful misconduct. Vendor indemnifies for IP infringement of its product/service. Customer indemnifies for misuse of the service or customer-provided content/data. Indemnifying party defends, holds harmless, and pays damages. Cap on indemnification is typically 2x the general liability cap or a separate super-cap.

## Classification Guide
- **GREEN**: Mutual indemnification for IP infringement, confidentiality breach, and willful misconduct; vendor IP indemnity with cure path (modify, replace, license, or terminate with full refund); defense obligation included; standard notice and cooperation requirements; late notice reduces but does not eliminate obligation; super-cap of 2-3x the general liability cap.
- **YELLOW**: Asymmetric indemnification moderately favoring vendor; no cure path for IP infringement; broad first-party indemnification obligations beyond third-party claims; uncapped indemnification without insurance backing; no right to control defense; notice requirements that extinguish obligation entirely.
- **RED**: Entirely one-sided indemnification (customer only); vendor refuses IP infringement indemnity; uncapped indemnification for broad categories including consequential damages; indemnification for regulatory fines in jurisdictions where uninsurable; no defense obligation; vendor controls settlement including right to admit liability on customer's behalf.

## Escalate If
- Indemnification is entirely one-sided (customer indemnifies vendor but not vice versa).
- Vendor refuses to indemnify for IP infringement of its own product.
- No defense obligation accompanies the indemnity.
- Indemnification covers first-party losses beyond third-party claims without appropriate limits.
- Indemnification is fully uncapped with no insurance backing.
- No notice or cooperation requirements for the indemnified party.
- Settlement rights allow the indemnitor to admit liability or agree to injunctions binding the indemnified party without consent.

## Practical Guidance
- Indemnification and limitation of liability interact closely — ensure carve-outs align. If IP indemnification is carved out from the liability cap, confirm the indemnification section reflects that.
- The duty to defend is often more valuable than the duty to indemnify. Defense costs in IP litigation can exceed damages. Make sure both are included.
- IP indemnification cure paths should end with a termination-and-refund option, not just "modify or replace." If the vendor cannot cure the infringement, you need an exit.
- Regulatory fines present a gray area — some jurisdictions treat them as uninsurable penalties. Be cautious about accepting indemnification obligations for regulatory fines.
- For vendor IP indemnification, confirm coverage extends to the combination of vendor's product with customer's systems (combination claims are a common gap).

## Key Negotiation Points
1. **Scope** — third-party claims only vs. first-party losses; limit to third-party claims where possible.
2. **IP cure path** — modify, replace, license, or terminate with refund; all four options should be present.
3. **Defense control** — indemnifying party controls defense but cannot settle without indemnified party's consent for non-monetary terms.
4. **Cap on indemnification** — 2-3x the general liability cap is market; fully uncapped indemnification is aggressive.
5. **Notice mechanics** — prompt notice required but late notice only reduces the obligation proportionate to prejudice, not eliminates it.

## Common Traps
- **"Indemnify and hold harmless" without "defend"** — omitting the defense obligation means you may need to fund your own defense and seek reimbursement later.
- **Settlement consent that requires "not to be unreasonably withheld"** — sounds fair, but allows the indemnitor to pressure acceptance of unfavorable settlements.
- **Indemnification triggered by "allegations" rather than "third-party claims"** — broadens the trigger beyond actual lawsuits to any allegation, dramatically expanding scope.
- **Sole remedy language** — "indemnification is the indemnified party's sole and exclusive remedy" cuts off other contractual rights like breach of warranty claims.
- **Combination claims exclusion** — vendor excludes infringement arising from combination with other products, which is how most infringement claims actually arise.


---

## Insurance Requirements

# Insurance Requirements — Position

## Market Standard
Vendor maintains commercially reasonable insurance: Commercial General Liability (CGL) $1-2M per occurrence / $2-4M aggregate; Professional Liability / E&O $2-5M per claim; Cyber Liability / Technology E&O $5-10M (for vendors processing personal data); Workers' Compensation per statutory requirements; Umbrella/Excess Liability $5-10M. Coverage maintained during the term and for 2-3 years post-termination. Certificates of insurance provided annually and upon request.

## Classification Guide
- **GREEN**: CGL $2M/$4M; Professional Liability $5M; Cyber Liability $10M+ (for data-processing vendors); Workers' Comp at statutory minimums; Umbrella $5-10M; additional insured status on CGL; primary and non-contributory endorsement; waiver of subrogation; certificates provided proactively on an annual basis; 30 days written notice of material change or cancellation; tail coverage of 3 years for claims-made policies; self-insured retention under $250K.
- **YELLOW**: CGL $1M/$2M; Professional Liability $2M; Cyber Liability $5M; coverage amounts at lower end of acceptable range; no additional insured status; no waiver of subrogation; certificates available on request rather than proactively; no explicit tail coverage requirement; self-insured retention of $250K-$500K; 10 days notice of cancellation; no primary and non-contributory endorsement.
- **RED**: No cyber liability insurance for a data-processing vendor; CGL below $1M; Professional Liability below $1M; no Workers' Comp; vendor refuses to provide certificates of insurance; no post-termination tail coverage for claims-made policies; self-insured retention above $500K (effectively eliminates coverage for most claims); material exclusions that void coverage for foreseeable claims (e.g., data breach exclusion on a cyber policy); insurance requirements imposed on customer only.

## Escalate If
- Vendor refuses to carry cyber liability insurance while processing personal or sensitive data.
- Coverage amounts are materially below the ranges above relative to contract value or risk.
- No professional liability / E&O coverage for a services engagement.
- Vendor will not provide certificates of insurance upon request.
- No requirement to maintain coverage post-termination for claims-made policies.
- Insurance requirements are entirely one-sided (imposed on customer but not vendor).
- Self-insured retention exceeds $500K without verified financial capacity.

## Practical Guidance
- Insurance requirements should be proportionate to contract value and risk. A $50K/year SaaS vendor does not need $25M in cyber coverage, but a vendor processing millions of PII records does.
- Cyber liability coverage is now essential for any vendor with access to personal data or company systems. If a vendor does not carry cyber insurance, that is a signal about their security maturity and financial capacity.
- Claims-made policies require tail coverage. If the vendor switches insurers and the new policy does not have a retroactive date covering the full contract period, there is a gap in coverage.
- Additional insured status gives you direct rights under the vendor's CGL policy — you can make a claim directly without going through the vendor.
- Primary and non-contributory endorsement ensures the vendor's coverage pays first, before your own insurance is triggered.
- Waiver of subrogation prevents the vendor's insurer from suing you to recover amounts paid on claims.
- Verify that the vendor's self-insured retention (deductible) is reasonable relative to their financial capacity. A $1M SIR for a $5M revenue company means the insurance is effectively illusory.

## Key Negotiation Points
1. **Coverage types and amounts** — scale to contract value and data sensitivity; cyber liability is non-negotiable for data-processing vendors.
2. **Additional insured status** — on CGL policy; gives direct claim rights.
3. **Tail coverage** — 2-3 years post-termination for claims-made policies; specify retroactive date.
4. **Certificate delivery and notice** — annual proactive delivery; 30 days written notice of material change or cancellation.
5. **Self-insured retention** — must be reasonable relative to vendor's financial capacity; under $250K for mid-market vendors.

## Common Traps
- **"Vendor maintains commercially reasonable insurance"** — without specifying types and amounts, this is unenforceable. Always list specific coverage types and minimum amounts.
- **"Vendor will provide certificates upon request"** — without an annual delivery obligation, certificates are only provided if you remember to ask. Require proactive annual delivery.
- **"10 days notice of cancellation"** — not enough time to take protective action. Require 30 days for any material change, cancellation, or non-renewal.
- **High self-insured retention ($500K+)** — the vendor's insurance does not respond until losses exceed the SIR. For most contract disputes, the SIR is never reached, meaning the insurance is effectively nonexistent.
- **No tail coverage for claims-made policies** — claims-made policies only cover claims made during the policy period. If the vendor switches insurers post-termination, claims from the contract period may fall into a gap.


---

## Ip Ownership

# IP Ownership — Position

## Market Standard
Each party retains ownership of its pre-existing IP. Customer owns all customer data and customer-generated content. Vendor retains ownership of its platform, software, tools, and methodologies. Custom work product created specifically for the customer is assigned to the customer (work-for-hire plus assignment belt-and-suspenders), subject to a license-back to vendor for pre-existing IP and general tools embedded therein.

## Classification Guide
- **GREEN**: Clear three-way delineation (pre-existing IP, custom deliverables, customer data); customer owns customer data without exception; custom work product assigned with present-tense language ("hereby assigns"); vendor license-back limited to pre-existing IP and general tools; moral rights waiver included; vendor's use of aggregated data explicitly limited and requires anonymization; open-source components disclosed; escrow provision for critical vendor-retained IP.
- **YELLOW**: Vendor retains ownership of custom deliverables with broad perpetual, irrevocable, royalty-free license to customer; no explicit moral rights waiver; vague treatment of aggregated/anonymized data; no open-source disclosure requirement; no escrow provision; "agrees to assign" rather than "hereby assigns."
- **RED**: Vendor claims ownership of customer data or customer-generated content; no license to customer for vendor IP embedded in deliverables; broad vendor rights to use customer-specific work for other clients; no assignment or license survives termination; vendor claims rights to AI-generated outputs using customer data; no distinction between pre-existing IP and new work product.

## Escalate If
- Vendor claims ownership of customer data or customer-generated content.
- No license grant to customer for vendor pre-existing IP embedded in deliverables.
- Vendor claims ownership of custom work product without adequate license to customer.
- Assignment provisions lack present-tense language ("hereby assigns" vs. "agrees to assign").
- Vendor retains rights to use customer-specific deliverables for other clients without restriction.
- IP assignment does not survive termination.
- No provision for source code escrow if vendor retains IP in critical deliverables.
- AI-generated output ownership is unaddressed and customer data was used in generation.

## Practical Guidance
- Distinguish clearly between (a) vendor's platform/SaaS IP, (b) custom deliverables/work product, and (c) customer data/content. Each category has different ownership and licensing defaults.
- "Work made for hire" doctrine varies by jurisdiction and applies only to specific categories under US copyright law. A belt-and-suspenders approach (work-for-hire designation plus present-tense assignment) is essential.
- "Agrees to assign" creates a contractual obligation to assign in the future, which may not be enforceable if the vendor goes bankrupt. "Hereby assigns" creates an immediate transfer of rights.
- License-back provisions for vendor pre-existing IP must be broad enough for customer to use, modify, and maintain the deliverables without ongoing vendor dependency.
- Aggregated/anonymized data rights are a hidden IP issue. Specify: what data, what level of anonymization, for what purposes, and with what limitations.
- Open-source components in deliverables should be disclosed with their license types. Copyleft licenses (GPL) can infect proprietary code if not properly isolated.

## Key Negotiation Points
1. **Custom work product ownership** — assignment to customer is the standard for bespoke work; vendor license-back is the alternative for commercial off-the-shelf modifications.
2. **Assignment language** — "hereby assigns" (present tense, immediate) vs. "agrees to assign" (future obligation, weaker).
3. **Aggregated data rights** — explicitly limit vendor's rights; require irreversible anonymization; prohibit re-identification.
4. **Open-source disclosure** — require a bill of materials for all open-source components with license types.
5. **AI-generated content** — clarify ownership of outputs generated by AI tools using customer data or inputs.

## Common Traps
- **"Vendor retains all IP rights in the deliverables"** — in a custom development contract, this means customer paid for work it does not own and has only a license that may be revocable.
- **"Agrees to assign" without "hereby assigns"** — in bankruptcy, this may be treated as an executory contract and rejected by the trustee, leaving customer without IP rights.
- **"Vendor may use aggregated and de-identified data for any purpose"** — "de-identified" is weaker than "anonymized" under many privacy laws; "any purpose" includes selling to competitors.
- **No open-source disclosure** — customer discovers post-delivery that key components are under GPL, requiring disclosure of proprietary code.
- **"License to use deliverables" without modification rights** — customer cannot fix bugs, update, or maintain the deliverables without vendor involvement.


---

## Limitation Of Liability

# Limitation of Liability — Position

## Market Standard
Mutual cap on direct damages equal to 12 months of fees paid or payable under the agreement. Exclusion of consequential, indirect, incidental, special, and punitive damages for both parties. Uncapped liability for fraud, willful misconduct, gross negligence, death/bodily injury, and breach of confidentiality/data protection obligations (often as a "super-cap" of 2-3x the general cap).

## Classification Guide
- **GREEN**: Mutual cap at 12+ months of fees paid or payable; standard consequential damages exclusion with carve-outs for IP indemnity, data breach, and confidentiality; super-cap of 2-3x for carved-out obligations; uncapped for fraud, willful misconduct, and bodily injury; aggregate (not per-claim) cap; cap resets annually.
- **YELLOW**: Cap between 6-12 months of fees; asymmetric carve-outs favoring the other party; no data breach carve-out; per-claim cap rather than aggregate; cap based on amounts "paid" only (not "paid or payable"); super-cap below 2x; cap does not reset annually.
- **RED**: Cap below 6 months of fees; entirely one-sided limitation favoring vendor; no carve-outs for data breach or IP indemnification; vendor excludes all liability for data loss or security incidents; cap that effectively eliminates meaningful recovery; consequential damages exclusion with no mutual application.

## Escalate If
- Vendor demands unlimited liability from customer only (non-mutual).
- Cap is set below 6 months of fees or below the total contract value.
- No carve-outs for IP infringement, data breach, or confidentiality.
- Cap is based on amounts "paid" rather than "paid or payable" (disadvantages early-stage contracts).
- Vendor seeks to exclude liability for data breaches involving customer data.
- Insurance backing cannot be verified for uncapped or super-capped obligations.

## Practical Guidance
- The cap should be proportionate to contract value and risk. A $50K/year SaaS deal with a $50K liability cap may be reasonable; the same cap on a $5M outsourcing deal is not.
- "Paid or payable" protects you in year 1 of a multi-year deal — "paid" only means your cap is near zero at contract start.
- Aggregate caps provide more protection than per-claim caps. A $1M aggregate cap means total exposure is $1M; a $1M per-claim cap could produce unlimited aggregate exposure.
- Annual reset means the cap refreshes each contract year — important for long-term deals where cumulative liability could exceed the cap.
- Data breach liability is increasingly carved out from general caps, especially post-GDPR and under US state privacy laws. If a vendor resists a data breach carve-out, that is a significant signal about their security posture.

## Key Negotiation Points
1. **Cap amount and measurement basis** — 12 months of fees paid or payable is the anchor; push back on anything below.
2. **Carve-out scope** — which obligations sit outside the general cap (IP indemnity, data breach, confidentiality, willful misconduct).
3. **Super-cap level** — 2x or 3x the general cap for carved-out obligations, rather than fully uncapped.
4. **Per-claim vs. aggregate** — always prefer aggregate; per-claim caps create unpredictable exposure.
5. **Cap reset** — annual reset for multi-year deals; lifetime cap for short-term engagements.

## Common Traps
- **"Fees paid in the 12 months preceding the claim"** — in the first year, this could be one month of fees. Insist on "paid or payable."
- **Consequential damages exclusion that applies to indemnification** — if indemnification only covers "direct damages" and third-party claims include consequential elements, the exclusion guts the indemnity.
- **Cap applies to "all claims arising under the agreement"** — a single large data breach could consume the entire cap, leaving nothing for other claims.
- **"Vendor's total liability shall not exceed..."** — one-sided language that caps only the vendor's liability while leaving yours uncapped.
- **Exclusion of "loss of data"** from recoverable damages — effectively eliminates recovery for the most common harm in technology contracts.


---

## Most Favored Nation

# Most Favored Nation (MFN) — Position

## Market Standard
Vendor represents that the pricing and terms offered to customer are no less favorable than those offered to similarly situated customers for comparable volume, scope, and term. If vendor offers materially better pricing or terms to a comparable customer during the term, customer is entitled to the same benefit. MFN applies to pricing and key commercial terms (not all terms). Verification through annual certification or audit right. Duration limited to the term of the agreement.

## Classification Guide
- **GREEN**: Narrow MFN limited to pricing for comparable customers with similar volume, scope, and term; vendor provides annual written certification of compliance; customer has audit right to verify MFN compliance (at vendor's expense if violation found); adjustment is prospective (not retroactive); 30-day cure period for vendor to adjust pricing or provide equivalent value; MFN applies during the term only; clear definition of "comparable customer" (same industry, similar deal size within 20%, comparable term length).
- **YELLOW**: MFN covers pricing only (no commercial terms); no verification mechanism (no certification, no audit right); vendor self-certifies without accountability; retroactive adjustments not available; "comparable customer" not defined or defined too broadly; MFN extends 12 months post-termination; no cure period before adjustment.
- **RED**: Broad MFN covering all terms (not just pricing) across all customers regardless of volume or scope; retroactive price adjustments for the entire term; MFN triggered by any discount, promotion, or negotiated deal regardless of comparability; no reasonable definition of "comparable"; MFN extends indefinitely post-termination; MFN applies to vendor's entire product portfolio (not just the contracted service); reverse MFN imposed by vendor on customer (restricting customer from purchasing from competitors at lower prices).

## Escalate If
- MFN is so broad it covers all terms across all customers regardless of comparability.
- Retroactive adjustments required for the entire contract term.
- No definition of "comparable customer" or the definition is unreasonably broad.
- MFN extends beyond the contract term.
- Reverse MFN restricts customer's purchasing decisions.
- No verification mechanism (certification or audit right).
- MFN triggered by promotional or volume-based discounts to dissimilar customers.

## Practical Guidance
- MFN clauses are heavily negotiated because they limit the vendor's pricing flexibility. Vendors often resist broad MFN provisions because they constrain future sales deals. Expect significant pushback.
- The definition of "comparable customer" is the most important element. Without it, the MFN is either too broad (triggered by every discount to anyone) or too narrow (never triggered because no one is "comparable"). Define by industry, deal size (within 20%), term length, and volume.
- Verification is essential. An MFN without verification is unenforceable. Require annual certification at minimum, with an audit right for cause.
- Retroactive adjustments are aggressive. Most MFN provisions are prospective only — the better pricing applies going forward from the date the comparable deal is struck. Retroactive adjustments can create significant financial exposure for vendors and are often deal-breakers.
- Consider whether the MFN should apply to pricing only or also to key commercial terms (SLA commitments, liability caps, data protection terms). Pricing-only is more common and easier to administer.
- MFN provisions are rare in SaaS agreements and more common in procurement and supply contracts. In SaaS, benchmark clauses (right to compare pricing against industry benchmarks) are often a more practical alternative.

## Key Negotiation Points
1. **Scope** — pricing only or pricing plus key commercial terms; limited to the contracted service (not vendor's entire portfolio).
2. **Comparable customer definition** — same industry, similar volume (within 20%), comparable term length and scope.
3. **Verification** — annual written certification; audit right at vendor's expense if violation found.
4. **Adjustment mechanism** — prospective only (not retroactive); 30-day cure period for vendor to adjust.
5. **Duration** — during the term only; expires on termination.

## Common Traps
- **"Vendor represents that customer receives the most favorable pricing available"** — without defining "comparable customer," this is triggered by every promotional discount and volume deal, making it unmanageable.
- **"If vendor offers better terms to any customer..."** — "any customer" is too broad; a $10K deal and a $10M deal are not comparable.
- **"Customer may audit vendor's pricing records"** — opens vendor's entire customer book to review, which most vendors will never agree to. Limit to certification with audit for cause.
- **"MFN adjustment applies retroactively to the effective date"** — could create massive retroactive credits and is often a deal-breaker for vendors.
- **"Vendor will not offer more favorable terms to customer's competitors"** — this is a reverse MFN that restricts the vendor, not just the pricing. It can raise antitrust concerns if it limits competition.


---

## Non Solicitation

# Non-Solicitation — Position

## Market Standard
Mutual non-solicitation of employees during the term and for 12 months after termination. Covers direct solicitation and hiring of employees who were involved in the performance of the agreement. Does not restrict general advertising (job postings, career fairs) or employees who initiate contact independently. Customer non-solicitation (restricting solicitation of the other party's customers) is generally limited to during the term only.

## Classification Guide
- **GREEN**: Mutual non-solicitation of employees for 12 months post-termination; limited to employees directly involved in performing the agreement; general advertising and job postings explicitly excluded; employees who initiate contact independently are excluded; no customer non-solicitation post-termination; no geographic restriction beyond the scope of the engagement; liquidated damages for breach are reasonable (e.g., 50% of the solicited employee's first-year compensation); no restriction on hiring employees who were terminated by the other party.
- **YELLOW**: Non-solicitation period of 12-18 months post-termination; covers all employees (not just those involved in the engagement); no carve-out for general advertising; customer non-solicitation during the term only; vague definition of "solicit" that could encompass passive activities; liquidated damages of 100% of first-year compensation; applies to contractors in addition to employees.
- **RED**: Non-solicitation period exceeding 24 months post-termination; one-sided (restricts customer but not vendor); covers all employees regardless of involvement; broad customer non-solicitation extending 24+ months post-termination; no carve-out for general advertising or independent employee-initiated contact; geographic restrictions beyond the engagement scope; liquidated damages exceeding 100% of compensation; non-solicitation framed as "non-hire" (prohibiting hiring even if the employee approached independently).

## Escalate If
- Non-solicitation is one-sided (restricts your hiring but not the other party's).
- Period exceeds 18 months post-termination for employees.
- Customer non-solicitation extends beyond the term of the agreement.
- No carve-out for general advertising or employee-initiated contact.
- Non-solicitation is framed as "non-hire" rather than "non-solicit."
- Geographic scope extends beyond the engagement scope.
- Liquidated damages are punitive rather than compensatory.
- Enforceability is questionable under applicable employment law (e.g., California).

## Practical Guidance
- Non-solicitation is distinct from non-compete. Non-solicitation restricts active targeting of specific people. Non-compete restricts competitive activity broadly. Non-solicitation provisions are more likely to be enforceable, but enforcement varies significantly by jurisdiction.
- In California, non-solicitation provisions in commercial agreements (as opposed to employment agreements) are generally enforceable, but the landscape is evolving. Check current California law and any other applicable state laws.
- "Non-solicitation" vs. "non-hire" is a critical distinction. Non-solicitation means you cannot actively recruit their employees. Non-hire means you cannot hire them even if they apply to your public job posting on their own initiative. Non-hire provisions are much more restrictive and less likely to be enforceable.
- General advertising carve-outs are essential. Without them, posting a job opening on LinkedIn that an employee of the other party sees could technically violate the non-solicitation.
- Employee non-solicitation should be limited to employees who were directly involved in the engagement. A blanket non-solicitation covering all 10,000 employees of a large vendor is unreasonable.
- Liquidated damages should be reasonable and proportionate. 50% of first-year compensation is generally considered reasonable. 200% is punitive and may be unenforceable.

## Key Negotiation Points
1. **Duration** — 12 months post-termination is standard; resist anything over 18 months.
2. **Scope** — limited to employees directly involved in the engagement; not all employees of the other party.
3. **Carve-outs** — general advertising, job postings, career fairs, and employee-initiated contact must all be excluded.
4. **Customer non-solicitation** — during the term only; no post-termination restriction on customer relationships.
5. **Enforcement** — reasonable liquidated damages (50% of first-year compensation); not framed as "non-hire."

## Common Traps
- **"Neither party shall solicit or hire any employee of the other party"** — "hire" goes beyond solicitation and prevents you from hiring someone who applies independently.
- **"Non-solicitation applies to all employees and contractors of the other party"** — a large vendor may have thousands of employees; this restricts your entire hiring pool unnecessarily.
- **"Customer shall not solicit vendor's customers for a period of 24 months following termination"** — a post-termination customer non-solicit is aggressive and could restrict your normal business development.
- **"Liquidated damages of 150% of the employee's annual compensation"** — may be deemed a penalty rather than a reasonable pre-estimate of damages, making it unenforceable in many jurisdictions.
- **No carve-out for terminated employees** — if the vendor fires an employee, you should be free to hire them without restriction.


---

## Notices

# Notices — Position

## Market Standard
Notices required or permitted under the agreement must be in writing. Routine operational notices (SLA reports, maintenance windows, support communications) may be sent by email. Formal legal notices (termination, breach, indemnification claims, assignment) require a more reliable method: email plus registered/certified mail or nationally recognized overnight courier. Notices are effective upon receipt (not upon sending). Each party designates a notice address and email with an obligation to update within 30 days of any change.

## Classification Guide
- **GREEN**: Written notice required for all formal communications; routine notices (maintenance, SLA reports) by email to designated address; formal notices (termination, breach, indemnification, change of control) by email plus registered mail or overnight courier; effectiveness upon receipt (with deemed receipt: 3 business days for registered mail, 1 business day for overnight courier, upon confirmed delivery for email); each party designates a physical address and email; 30-day obligation to update notice details; copy to legal counsel optional but permitted; electronic signatures and delivery accepted for routine notices.
- **YELLOW**: All notices by email only (no physical mail for formal notices); effectiveness upon sending (not receipt); no designated notice addresses (sent to "general" company email); no obligation to update contact information; no deemed receipt provisions; formal and routine notices treated identically; no copy to legal counsel option.
- **RED**: Notices effective only by physical mail to a single address (no email accepted); posting to vendor's website constitutes notice; effectiveness upon mailing (not receipt or deemed receipt); no obligation to maintain current addresses; notices to "the other party" without specifying individuals or departments; termination by voicemail or verbal notice permitted; vendor can change notice requirements unilaterally.

## Escalate If
- Formal notices (termination, breach) can be sent by email only with no confirmation of delivery.
- Effectiveness is upon sending rather than upon receipt.
- Vendor can send notices by posting to its website.
- No designated notice addresses or contacts.
- No obligation to update notice information.
- Termination or breach notices do not require a reliable delivery method.
- Notice provisions differ between the MSA, DPA, and SOW without reconciliation.

## Practical Guidance
- Notice provisions are often treated as boilerplate, but they matter when things go wrong. A termination notice sent to the wrong address or by the wrong method may be invalid, extending the agreement by an entire renewal term.
- Tiered notice methods make practical sense. Routine operational communications (maintenance windows, SLA reports, support tickets) should work by email. Formal legal communications (termination, breach, indemnification claims) need a more reliable method because the consequences of non-delivery are severe.
- "Effective upon receipt" is customer-protective because it ensures actual notice. "Effective upon sending" or "effective upon mailing" shifts the risk of non-delivery to the receiving party. Use deemed receipt provisions as a practical compromise: 3 business days after mailing for registered mail, 1 business day for overnight courier.
- Email delivery is efficient but creates proof-of-delivery challenges. For formal notices by email, require delivery confirmation (read receipt or delivery confirmation). Alternatively, require email plus a backup method.
- Designate specific individuals (General Counsel, VP Legal, Contracts Manager) and functional email addresses (legal@company.com), not just a physical address. People change roles; functional addresses persist.
- Calendar all notice deadlines (non-renewal, cure periods, option exercise dates) immediately upon contract execution. Most notice-related issues arise from missed deadlines, not from technical defects in the notice itself.

## Key Negotiation Points
1. **Tiered methods** — email for routine notices; email plus registered mail or overnight courier for formal notices (termination, breach, indemnification).
2. **Effectiveness** — upon receipt for all notices; deemed receipt provisions for physical mail (3 business days for registered, 1 for overnight).
3. **Designated contacts** — specific individuals or functional roles (General Counsel, Legal Department) plus functional email address; obligation to update within 30 days.
4. **Copy to counsel** — optional copy to legal counsel for formal notices; not required for effectiveness but provides redundancy.
5. **Electronic delivery** — accepted for routine notices; electronic signatures accepted where applicable.

## Common Traps
- **"Notices shall be sent to the addresses set forth on the signature page"** — if the signature page has an outdated address (common in renewals), all notices go to the wrong place.
- **"Vendor may provide notice by posting to its website or customer portal"** — vendor can effectively change terms, send termination notices, or modify SLAs by updating a webpage.
- **"Notice is effective when sent"** — if the email bounces or the letter is lost in transit, the sending party has fulfilled its obligation even though the receiving party never got the notice.
- **"All notices must be sent by registered mail to vendor's headquarters in [foreign country]"** — registered international mail can take weeks, making time-sensitive notices (cure periods, termination) practically unworkable.
- **Different notice provisions in different documents** — MSA says email is sufficient, DPA says registered mail, SOW says "in writing." Reconcile all notice provisions into a single, consistent framework.


---

## Representations Warranties

# Representations & Warranties — Position

## Market Standard
Mutual representations: each party has authority to enter the agreement, the agreement is a valid and binding obligation, and execution does not conflict with other obligations. Vendor warrants: services performed in a professional and workmanlike manner consistent with industry standards; software/service materially conforms to documentation; non-infringement of third-party IP; compliance with applicable laws; deliverables free from malware and disabling code.

## Classification Guide
- **GREEN**: Mutual authority and enforceability representations; vendor warrants professional/workmanlike performance consistent with industry standards; material conformity to documentation on an ongoing basis; non-infringement warranty; compliance with all applicable laws; malware-free and no disabling code; warranty remedies include re-performance within 15 days, then credit or refund; warranty period of 60-90 days for deliverable acceptance; standard implied warranty disclaimers paired with robust express warranties.
- **YELLOW**: Limited warranty period (under 30 days); re-performance as sole remedy with no refund backstop; no explicit malware warranty; vague "commercially reasonable" performance standard without reference to industry standards; warranties given only as of effective date (not ongoing); limited compliance-with-law warranty (only "material" laws); implied warranty disclaimers without adequate express warranties.
- **RED**: All warranties disclaimed ("as-is" or "as-is, where-is"); no non-infringement warranty; no compliance-with-law warranty; no warranty remedies of any kind; vendor disclaims conformity to its own documentation; extensive customer warranties with no reciprocal vendor warranties; no malware or disabling code warranty; broad disclaimer of fitness and merchantability without any meaningful express warranty to replace them.

## Escalate If
- Vendor disclaims ALL warranties including express warranties.
- No warranty of non-infringement for vendor's own product.
- No compliance-with-law warranty.
- Vendor disclaims responsibility for conformity to documentation or specifications.
- No warranty remedy (re-performance, repair, refund).
- Vendor includes "as-is, where-is" language for a paid product or service.
- Warranties are given only as of the effective date and not on an ongoing basis.
- No malware or disabling code warranty.

## Practical Guidance
- Express warranties should be meaningful and tied to the purpose of the engagement. "Services will be performed in a professional manner" is better than "vendor will use commercially reasonable efforts," which is nearly unfalsifiable.
- The warranty of conformity to documentation makes the documentation contractually significant. Before signing, review the documentation to confirm it accurately describes what you are buying. Vendors sometimes disclaim features in documentation that were discussed in the sales process.
- "Best efforts" vs. "commercially reasonable efforts" vs. "reasonable efforts" — these have different legal meanings. "Best efforts" is the highest standard (all reasonable steps). "Commercially reasonable efforts" considers economic constraints. "Reasonable efforts" is the lowest standard.
- Malware and disabling code warranties protect against vendor-introduced security risks. A "disabling code" warranty prevents vendors from including kill switches or time bombs.
- For international engagements, include anti-corruption (FCPA, UK Bribery Act), sanctions, and export control representations.
- Ongoing representations (compliance with laws, non-infringement) should be distinguished from point-in-time representations (authority to enter agreement). Both are needed.

## Key Negotiation Points
1. **Performance standard** — "professional and workmanlike manner consistent with industry standards" is the target; reject vague "reasonable efforts."
2. **Conformity to documentation** — ongoing, not just at delivery; documentation should be current and accurate.
3. **Warranty remedies** — re-performance first (within 15 days), then credit or full refund if re-performance fails; avoid sole-and-exclusive remedy language.
4. **Non-infringement** — vendor warrants its product does not infringe third-party IP; this ties to the indemnification section.
5. **Malware and disabling code** — explicit warranty that deliverables are free from viruses, trojans, worms, ransomware, and intentional disabling mechanisms.

## Common Traps
- **"Vendor warrants that services will conform to the applicable Statement of Work"** — if the SOW is vague or incomplete, the warranty is meaningless.
- **"AS-IS" disclaimed in the general terms but express warranties in the SOW** — creates ambiguity about which controls. Ensure the SOW warranties are explicitly carved out from any general disclaimer.
- **"Vendor's sole obligation and customer's exclusive remedy is re-performance"** — if re-performance fails (or is never adequate), customer has no further recourse.
- **"Vendor warrants compliance with applicable laws" without specifying which laws** — vendor may argue that only laws of its jurisdiction apply, not customer's.
- **Warranty period that starts at delivery, not acceptance** — deliverable may not be tested for weeks after delivery, and the warranty could expire before defects are discovered.


---

## Service Levels

# Service Levels (SLAs) — Position

## Market Standard
Vendor commits to 99.9% uptime for production environments, measured monthly. Planned maintenance excluded with 48-72 hours advance notice, limited to 4 hours per month during off-peak windows. Service credits: 10% of monthly fees per percentage point below target, capped at 25-30% of monthly fees. Response time SLAs tiered by severity: Critical (P1) 1 hour response / 4 hour resolution target; High (P2) 4 hours / 1 business day; Medium (P3) 8 hours / 3 business days; Low (P4) 1 business day / 5 business days.

## Classification Guide
- **GREEN**: 99.9%+ monthly uptime commitment; service credits of 10%+ per percentage point, capped at 25-30% of monthly fees; tiered response times with resolution targets (P1: 1hr/4hr, P2: 4hr/1BD); transparent measurement methodology with customer audit rights; chronic failure termination right after 3 months below SLA in any 6-month period; planned maintenance limited to 4 hours/month with 48+ hours notice; root cause analysis within 5 business days for P1 incidents; credits are non-exclusive remedies.
- **YELLOW**: 99.5-99.9% uptime; service credits capped at 15-20% of monthly fees; response time SLAs only (no resolution targets); vendor-controlled measurement with no audit rights; no chronic failure provision; planned maintenance with only 24 hours notice; credits as sole and exclusive remedy; no root cause analysis obligation.
- **RED**: No uptime SLA or uptime below 99.5%; no service credits or credits capped below 10% of monthly fees; no response time commitments; opaque or vendor-only measurement methodology; unlimited planned maintenance windows with no notice; vendor can unilaterally modify SLAs; no escalation or termination rights for persistent failures; no incident reporting.

## Escalate If
- No uptime commitment or SLA of any kind.
- Uptime below 99.5% for production/critical systems.
- No service credits or other remedies for SLA failures.
- Service credits capped below 15% of monthly fees.
- No chronic failure termination right.
- Measurement methodology is opaque or vendor-controlled without audit rights.
- Planned maintenance is unlimited or excluded from SLA without constraints.
- Vendor can unilaterally modify SLAs during the term.

## Practical Guidance
- 99.9% uptime means approximately 43 minutes of downtime per month (8.7 hours per year). 99.99% means 4.3 minutes per month. The difference is significant for mission-critical systems.
- Service credits are a remedy, not a penalty. They should be meaningful enough to incentivize performance. Credits capped at 10% of monthly fees provide almost no incentive for a vendor to invest in reliability.
- "Uptime" must be defined precisely. Is a degraded service (slow but functional) considered "available"? Define thresholds: full outage, degraded performance (response time 3x normal), and available.
- Measurement methodology is as important as the target. Vendor-controlled measurement with no audit rights is unverifiable. Require independent monitoring or customer access to monitoring dashboards.
- Planned maintenance exclusions can be abused. Without limits on frequency, duration, and timing, a vendor could schedule "planned maintenance" during business hours to avoid SLA credits.
- Chronic failure provisions protect against persistent underperformance that never quite triggers termination. If the vendor misses SLA for 3 out of 6 months, you should have a termination right even if no single month was catastrophic.

## Key Negotiation Points
1. **Uptime target and measurement** — 99.9% monthly measured by independent monitoring; define "available" vs. "degraded" vs. "unavailable."
2. **Credit structure** — 10% per percentage point below target; cap at 25-30% of monthly fees; credits are non-exclusive (do not waive other remedies).
3. **Response and resolution times** — tiered by severity; resolution targets (not just response); escalation procedures for unresolved P1 incidents.
4. **Chronic failure termination** — right to terminate without penalty after 3 SLA misses in 6 months or 2 consecutive misses.
5. **Planned maintenance** — limited to 4 hours/month; 48+ hours advance notice; off-peak hours only; customer approval for maintenance during business hours.

## Common Traps
- **"99.9% uptime measured quarterly"** — quarterly measurement allows one terrible month to be averaged out by two good months. Monthly measurement is the standard.
- **"Excluding scheduled maintenance"** — without limits, vendor schedules frequent "maintenance" to avoid credits.
- **"Customer must request credits within 15 days"** — if you do not affirmatively claim credits for each incident, you lose them. Push for automatic credits.
- **"Service credits are customer's sole and exclusive remedy"** — combined with a low credit cap, this means the worst that happens to a vendor for catastrophic downtime is a 10% refund.
- **Response time without resolution time** — "we'll respond to your P1 in 1 hour" means nothing if there is no target for actually fixing the problem. A response can be "we received your ticket."


---

## Source Code Escrow

# Source Code Escrow — Position

## Market Standard
Vendor deposits source code, build tools, documentation, and deployment instructions with an independent escrow agent (e.g., Iron Mountain, EscrowTech, NCC Group). Release conditions include vendor bankruptcy or insolvency, material breach that remains uncured for 60 days, and discontinuation of the product. Escrow updated with each major release (at least annually). Customer has a perpetual, royalty-free license to use the released code solely for internal maintenance and operation of the software. Verification testing of escrow deposits at least annually.

## Classification Guide
- **GREEN**: Source code deposited with reputable independent escrow agent; release conditions include bankruptcy/insolvency, material uncured breach (60 days), and product discontinuation; escrow updated within 30 days of each major release and at least annually; annual verification testing confirming completeness and buildability; customer gets perpetual, royalty-free, non-exclusive license for internal maintenance and operation upon release; deposit includes source code, build tools, third-party dependencies, documentation, and deployment instructions; vendor pays escrow fees; escrow survives termination.
- **YELLOW**: Escrow with independent agent but release conditions limited to bankruptcy only; updates only annually (not with each release); no verification testing; license upon release is limited (e.g., 2-year term, not perpetual); deposit includes source code only (no build tools, documentation, or dependencies); customer pays escrow fees; escrow agent chosen by vendor; release requires agreement of all parties (not just triggering of conditions).
- **RED**: No escrow provision; source code held by vendor "in trust" (not with independent agent); release conditions require vendor consent; no update obligation; no verification testing; license upon release is restrictive (read-only, no modification); deposit is stale (initial deposit only, never updated); vendor can terminate escrow at will; release conditions do not include product discontinuation.

## Escalate If
- No source code escrow for mission-critical vendor-retained software.
- Release conditions require vendor consent (defeats the purpose).
- No verification testing to confirm deposit is complete and buildable.
- Deposit not updated with releases (stale code is useless code).
- License upon release is too restrictive for maintenance and operation.
- Escrow does not include build tools, dependencies, and documentation.
- Vendor can terminate the escrow agreement unilaterally.

## Practical Guidance
- Source code escrow is most important when: (a) the vendor retains IP ownership of custom-developed software, (b) the software is mission-critical and cannot be easily replaced, or (c) the vendor is a startup or small company with uncertain financial viability.
- The escrow deposit is only useful if it is complete and buildable. A source code deposit without build tools, compiler instructions, third-party library dependencies, and deployment documentation is effectively useless. Annual verification testing by an independent technical firm is essential.
- Release conditions should be automatic (triggered by events, not requiring vendor agreement). If the vendor must consent to release, they will refuse when the conditions are triggered — which is precisely when you need the code.
- The license upon release should be broad enough for practical use: modify, compile, deploy, and maintain the software for internal business purposes. A "read-only" license is pointless if you need to fix bugs or adapt the software.
- Vendor bankruptcy is the most common release trigger, but product discontinuation is equally important. A vendor may be financially healthy but decide to sunset a product line, leaving you without support.
- Escrow costs are modest ($2K-5K/year for the agent, $5K-15K for annual verification testing). The vendor should bear these costs as part of the engagement. If the vendor resists, it may signal concerns about code quality or organizational stability.

## Key Negotiation Points
1. **Release conditions** — bankruptcy/insolvency, material uncured breach (60 days), and product discontinuation; automatic release without vendor consent.
2. **Deposit completeness** — source code, build tools, third-party dependencies, documentation, and deployment instructions.
3. **Update frequency** — within 30 days of each major release and at least annually; not just the initial deposit.
4. **Verification testing** — annual testing by independent technical firm confirming completeness and buildability; vendor bears cost.
5. **License scope** — perpetual, royalty-free, non-exclusive license to use, modify, compile, and deploy for internal maintenance and operation.

## Common Traps
- **"Vendor will deposit source code with a mutually agreed escrow agent"** — if the parties cannot agree on an agent, no escrow is ever established.
- **"Source code will be released upon written agreement of all parties"** — vendor must consent to release, defeating the purpose of escrow.
- **"Vendor deposits source code annually"** — annual deposits mean the escrow could be up to 12 months out of date. Require updates with each major release.
- **"Customer may use released source code solely in object code form"** — restrictions on compilation or modification make the release useless for maintenance.
- **"Escrow terminates upon termination of the underlying agreement"** — you need the escrow most at termination. It must survive.


---

## Subcontractors Subprocessors

# Subcontractors & Subprocessors — Position

## Market Standard
Vendor may use subcontractors and subprocessors with prior written consent (not unreasonably withheld) or, for data processing, with prior notice of 30+ days and customer right to object. Vendor remains fully liable for subcontractor performance and compliance. All obligations flow down to subcontractors, including confidentiality, data protection, and security requirements. Customer may terminate if a subprocessor objection is not resolved within 30 days.

## Classification Guide
- **GREEN**: Prior written consent required for new subcontractors (not unreasonably withheld); subprocessor list published and updated with 30+ days advance written notice of changes; customer right to object to new subprocessors with termination right if objection is not accommodated within 30 days; vendor remains fully liable for all subcontractor/subprocessor acts and omissions; written flowdown of all material obligations (confidentiality, security, data protection); vendor conducts due diligence on subprocessors; background checks required for personnel with access to customer data.
- **YELLOW**: Subcontractor use permitted with notice only (no consent); subprocessor notice period of 14-29 days; no termination right if objection is overruled; vendor liable for subcontractors "to the extent permitted by law"; flowdown limited to data protection only (no confidentiality or security); no due diligence obligation; no background check requirement; broad "approved list" at signing with blanket consent for additions.
- **RED**: No consent or notice required for subcontractors; no subprocessor list or notification of changes; vendor disclaims liability for subcontractor performance; no flowdown of obligations; subprocessor objection right is advisory only with no consequences; vendor can substitute subcontractors freely without notice; customer data may be processed by unnamed subprocessors in unspecified jurisdictions.

## Escalate If
- Vendor refuses to require consent or provide notice for subcontractor/subprocessor changes.
- Vendor disclaims liability for subcontractor performance.
- No flowdown of confidentiality, security, or data protection obligations.
- No right to object to subprocessor changes with meaningful consequence (termination right).
- Subprocessors located in jurisdictions without adequate data protection.
- No due diligence or vetting process for subprocessors.
- Customer data shared with subprocessors not identified in the agreement.

## Practical Guidance
- The right to object to subprocessors is meaningless without a termination right. If the vendor can override your objection and you have no exit, the objection right is theater.
- Vendor liability for subcontractors should be unconditional. "Vendor is liable for subcontractor performance as if performed by vendor" is the target language. Resist any attempt to limit this to "commercially reasonable oversight."
- Flowdown requirements should be specific. "Vendor will impose obligations on subcontractors no less protective than those in this agreement" is minimum. Better: "Vendor will execute written agreements with subcontractors incorporating the confidentiality, security, and data protection requirements of this agreement."
- For GDPR compliance, subprocessor management is a core processor obligation under Article 28(2) and 28(4). The GDPR requires either specific prior authorization or general written authorization with notice and objection rights.
- Background checks for subcontractor personnel with access to customer data or systems are increasingly standard, especially for financial services and healthcare customers.
- Monitor the subprocessor list actively. Some vendors update the list frequently and rely on customers not noticing.

## Key Negotiation Points
1. **Consent vs. notice** — prior written consent for subcontractors; notice with objection right for subprocessors; 30 days minimum notice period.
2. **Vendor liability** — full liability for subcontractor acts and omissions, as if performed by vendor directly.
3. **Flowdown obligations** — written agreements with subcontractors incorporating confidentiality, security, data protection, and compliance requirements.
4. **Objection and termination** — right to object to new subprocessors; if not resolved within 30 days, right to terminate without penalty.
5. **Due diligence** — vendor conducts security and compliance assessments of subprocessors; shares assessment results upon request.

## Common Traps
- **"Vendor's approved subcontractors as of the Effective Date are listed in Exhibit X"** — blanket pre-approval with no mechanism to object to future additions.
- **"Vendor will use commercially reasonable efforts to ensure subcontractor compliance"** — a best-efforts obligation that falls short of full liability.
- **"Customer may object to a subprocessor, and vendor will consider the objection in good faith"** — "consider in good faith" means vendor can override the objection with no consequence.
- **"Vendor will notify customer of subprocessor changes by updating [URL]"** — passive notification; customer must actively monitor a webpage.
- **"Subcontractor will comply with applicable data protection laws"** — vague and not tied to the specific contractual obligations, meaning the subcontractor's standard may be lower than what the contract requires.


---

## Termination Renewal

# Termination & Renewal — Position

## Market Standard
Either party may terminate for material breach with 30 days written notice and cure period. Either party may terminate for insolvency/bankruptcy. Contracts auto-renew for successive 1-year terms unless either party provides 60-90 days written notice of non-renewal before the end of the current term. Termination for convenience by either party with 30-90 days notice. Post-termination transition assistance for 90 days at then-current rates.

## Classification Guide
- **GREEN**: Mutual termination for cause with 30-day cure period; mutual termination for convenience with 60+ days notice; auto-renewal for 1-year terms with 60-90 day non-renewal notice window; data return within 30 days in portable format; 90-day transition assistance at then-current rates; termination right on change of control; explicit survival provisions for confidentiality (3-5 years), indemnification, and limitation of liability; pro-rata refund of prepaid fees on termination for cause.
- **YELLOW**: Asymmetric termination for convenience (vendor can, customer cannot); auto-renewal notice window under 60 days or over 120 days; no transition assistance provision; cure period of 45-60 days; early termination fee equal to remaining committed spend; no explicit data return timeline; auto-renewal into same-length terms (multi-year initial term renews for multi-year).
- **RED**: No termination for cause right; auto-renewal into multi-year terms with less than 30 days non-renewal notice; vendor-only termination for convenience; early termination fees exceeding remaining committed value (liquidated damages); no data return or deletion obligations; no survival clause for key provisions; termination penalties that function as lock-in.

## Escalate If
- No termination for cause right exists.
- Cure period exceeds 60 days or is entirely at breaching party's discretion.
- Auto-renewal locks in for multi-year terms with non-renewal notice under 30 days.
- No termination right upon change of control of the other party.
- Early termination penalties exceed remaining committed fees.
- No post-termination data return/deletion obligations.
- Vendor can terminate for convenience but customer cannot.

## Practical Guidance
- Auto-renewal terms are the most common source of unintended lock-in. Calendar the non-renewal notice deadline immediately upon execution — missing it by one day typically locks you in for another full term.
- "Termination for convenience" is standard in services agreements but often absent from SaaS subscriptions with committed terms. For committed-term SaaS, negotiate early termination with a reasonable wind-down fee (e.g., 50% of remaining committed fees).
- Cure periods should be specific. "30 days to cure" is clear. "Reasonable time to cure" is an invitation to dispute.
- Post-termination obligations are where vendors have the most leverage — you need the data, they have it. Negotiate data return in a portable, machine-readable format (not proprietary exports) within 30 days, followed by deletion within 90 days with written certification.
- Survival clauses are often overlooked. If confidentiality, indemnification, and limitation of liability do not survive termination, they vanish when you need them most.

## Key Negotiation Points
1. **Auto-renewal mechanics** — 1-year renewal terms (not matching the initial term); 60-90 day non-renewal window; written notice requirement.
2. **Termination for convenience** — mutual right with 60-90 days notice; pro-rata refund of prepaid fees; reasonable wind-down fee for committed terms.
3. **Data return/portability** — within 30 days in structured, portable format; deletion within 90 days with officer certification.
4. **Transition assistance** — 90 days at then-current rates; vendor cooperates with successor; no degradation of service during transition.
5. **Survival provisions** — explicitly list which sections survive and for how long.

## Common Traps
- **"Auto-renews for successive terms equal to the initial term"** — a 3-year initial term auto-renews for another 3 years if you miss the notice window.
- **Non-renewal notice of "30 days before the end of the then-current term"** — easy to miss, especially with multi-year terms.
- **"Vendor may terminate if customer fails to pay within 10 days of written notice"** — much shorter than the standard 30-day cure, effectively a hair-trigger termination.
- **"Upon termination, customer's access will cease immediately"** — no wind-down period means data may be inaccessible the moment the contract ends.
- **"Early termination fee equal to 100% of remaining fees"** — this is not an early termination fee, it is full payment with no service. Negotiate to 50% or less.


---

## Transition Assistance

# Transition Assistance — Position

## Market Standard
Upon termination or expiration, vendor provides transition assistance for 90 days at then-current rates to facilitate migration to a successor provider or in-house solution. Data return in a structured, portable format within 30 days of termination. Data deletion within 90 days with written certification. Vendor cooperates with successor provider, including reasonable knowledge transfer. Service levels maintained during the transition period.

## Classification Guide
- **GREEN**: 90-day transition assistance period at then-current rates (or at cost for termination for vendor's breach); data return within 30 days in structured, machine-readable format (CSV, JSON, API export); data deletion within 90 days with officer-level written certification; vendor cooperates with successor provider including knowledge transfer sessions; service levels maintained during transition without degradation; transition plan documented within 15 days of termination notice; assistance includes configuration documentation and API specifications; no additional fees for standard transition activities.
- **YELLOW**: 60-day transition period; data return within 60 days; proprietary export format only (not machine-readable); deletion within 120 days with employee-level certification; limited cooperation with successor (documentation only, no knowledge transfer); no obligation to maintain SLAs during transition; transition at T&M rates (not at cost) for all scenarios; no documented transition plan.
- **RED**: No transition assistance provision; data return only "upon request" with no defined timeline; data in proprietary format that cannot be migrated without vendor's paid professional services; no deletion obligation or certification; vendor refuses to cooperate with successor provider; service degraded or terminated immediately; transition assistance at premium rates (2x+ normal); vendor retains data indefinitely post-termination.

## Escalate If
- No transition assistance provision in the agreement.
- Data return timeline exceeds 60 days or no timeline is specified.
- Data available only in proprietary format requiring vendor's paid services to migrate.
- No data deletion obligation or certification.
- Vendor refuses to cooperate with successor providers.
- Service levels are not maintained during the transition period.
- Transition assistance is priced at premium rates that create economic lock-in.
- No obligation to provide API documentation or configuration details.

## Practical Guidance
- Transition assistance is leverage. Once the contract ends, the vendor has no incentive to help you leave. Negotiate transition terms at contract signing when you have the most leverage, not at termination when you have the least.
- Data portability is the single most important transition element. If your data is trapped in a proprietary format, you are locked in regardless of what the termination clause says. Require export in standard formats (CSV, JSON, XML) or via documented API.
- The transition period should be long enough for a realistic migration. For simple SaaS tools, 30 days may suffice. For complex enterprise systems with years of data and custom integrations, 90-180 days is more realistic.
- Differentiate between termination scenarios. If the vendor breached, transition assistance should be at cost or included in the refund. If the customer is terminating for convenience, then-current rates are fair.
- Knowledge transfer is often overlooked. Configuration settings, custom integrations, workflow documentation, and institutional knowledge about how the system is set up are critical for a successful migration. Require the vendor to participate in knowledge transfer sessions with the successor.
- Service levels during transition prevent the vendor from degrading service once they know you are leaving. Without this protection, the vendor may deprioritize your account during the transition period.

## Key Negotiation Points
1. **Duration** — 90 days standard; 180 days for complex enterprise systems; extendable by 30 days if migration is incomplete.
2. **Data return** — within 30 days in structured, machine-readable format; at no additional charge.
3. **Data deletion** — within 90 days of return confirmation; written certification from an officer (not just an employee).
4. **Successor cooperation** — vendor participates in knowledge transfer; provides configuration documentation, API specifications, and integration details.
5. **Pricing** — at cost for vendor-breach termination; at then-current rates for convenience termination; no premium pricing.

## Common Traps
- **"Vendor will provide reasonable assistance upon termination"** — "reasonable" is undefined; no timeline, scope, or pricing. This is effectively no commitment.
- **"Data export available via vendor's standard export tool"** — the standard export tool may produce a proprietary format that only works with the vendor's system.
- **"Transition assistance available at vendor's then-current professional services rates"** — professional services rates may be $300-500/hour, creating economic pressure to stay.
- **"Vendor will delete data in accordance with its standard retention policy"** — vendor's policy may retain data for 7+ years for "legal compliance" purposes.
- **"Transition assistance is subject to vendor's resource availability"** — vendor can deprioritize your transition indefinitely by claiming resource constraints.


---

## Warranties Disclaimers

# Warranties & Disclaimers — Position

## Market Standard
Vendor provides express warranties: services performed in a professional and workmanlike manner; software/service materially conforms to documentation; non-infringement of third-party IP; compliance with applicable laws; deliverables free from malware. Implied warranties (merchantability, fitness for particular purpose) are disclaimed, but the disclaimer is balanced by robust express warranties. Warranty remedy: re-performance or repair within 15 days, then credit or refund if re-performance fails.

## Classification Guide
- **GREEN**: Express warranties covering professional performance, conformity to documentation, non-infringement, compliance with laws, and malware-free; implied warranty disclaimer (merchantability, fitness for purpose) paired with meaningful express warranties; warranty period of 60-90 days for deliverable acceptance; warranty remedy: re-performance within 15 days, then credit or full refund; ongoing compliance and non-infringement warranties (not point-in-time); virus/malware-free warranty; no disabling code warranty.
- **YELLOW**: Limited express warranties (performance standard only, no conformity to documentation); implied warranty disclaimer with thin express warranties; warranty period under 30 days; re-performance as sole and exclusive remedy with no refund backstop; no malware warranty; "commercially reasonable" performance standard without industry benchmark; compliance warranty limited to "material" laws; no disabling code prohibition.
- **RED**: Full "as-is" or "as-is, where-is" disclaimer with no express warranties; no non-infringement warranty; no compliance-with-law warranty; no warranty remedy of any kind; vendor disclaims conformity to its own documentation and specifications; implied warranty disclaimer without any meaningful express warranty to replace; vendor's own marketing materials create expectations that the warranty section explicitly disclaims; no malware or disabling code warranty for a paid product.

## Escalate If
- Vendor disclaims all warranties including express warranties for a paid product or service.
- No non-infringement warranty for vendor's own product.
- No compliance-with-law warranty.
- No warranty remedy (re-performance, repair, credit, or refund).
- Vendor includes "as-is, where-is" language.
- Warranty section contradicts vendor's marketing materials or sales representations.
- Implied warranty disclaimer is not accompanied by adequate express warranties.

## Practical Guidance
- The relationship between express warranties and implied warranty disclaimers is the key dynamic. Disclaiming implied warranties is acceptable only if express warranties adequately cover the same ground. An "as-is" disclaimer with no express warranties means you are paying for a product with no enforceable quality commitment.
- Under UCC Article 2 (goods) and common law (services), implied warranties exist by default. A disclaimer must be conspicuous (often in caps or bold) and specific to be effective. Check whether the disclaimer meets the applicable legal requirements.
- "Professional and workmanlike manner consistent with industry standards" is the strongest performance warranty. "Commercially reasonable efforts" is weaker. "Best efforts" is somewhere in between depending on jurisdiction. Pin down the standard.
- The warranty remedy cascade matters. Re-performance first (vendor gets a chance to fix), then credit or refund if re-performance fails within a defined period. Avoid "sole and exclusive remedy" language that cuts off all other rights.
- Malware and disabling code warranties are separate concerns. Malware is unintentional (viruses, trojans). Disabling code is intentional (kill switches, time bombs, license enforcement mechanisms that disable the software). Both should be warranted against.
- For SaaS, the warranty of conformity to documentation makes the documentation a contractual document. Review the documentation before signing to ensure it accurately describes the service. Vendors sometimes update documentation post-signing to reduce their warranty obligations.

## Key Negotiation Points
1. **Express warranty scope** — professional performance, conformity to documentation, non-infringement, compliance with laws, malware-free, no disabling code.
2. **Warranty remedy cascade** — re-performance within 15 days, then credit or full refund; not sole and exclusive remedy.
3. **Implied warranty disclaimer** — acceptable only if paired with robust express warranties; must be conspicuous and legally effective.
4. **Ongoing vs. point-in-time** — compliance and non-infringement warranties must be ongoing, not just as of the effective date.
5. **Documentation conformity** — ongoing conformity, not just at delivery; documentation must be current and accurate.

## Common Traps
- **"THE SERVICE IS PROVIDED 'AS IS' WITHOUT WARRANTY OF ANY KIND"** — even if express warranties exist elsewhere, this blanket disclaimer may override them depending on interpretation.
- **"Vendor does not warrant that the service will be uninterrupted or error-free"** — reasonable as to perfection, but should not eliminate liability for systematic failures or material defects.
- **"Customer's sole remedy for breach of warranty is re-performance"** — if re-performance fails or is never adequate, customer is stuck with a defective product and no recourse.
- **Express warranties in the SOW but blanket disclaimer in the MSA** — creates ambiguity; ensure SOW warranties explicitly survive the MSA disclaimer.
- **"Vendor warrants that the service will substantially perform as described in vendor's then-current documentation"** — "then-current" means vendor can change the documentation at any time, reducing what the warranty actually covers.


