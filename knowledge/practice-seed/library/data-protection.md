---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Data Protection — Clause Library

## Data Processing Obligations

### Standard
> Vendor shall process Customer Personal Data only in accordance with Customer's documented instructions and solely for the purpose of providing the Services under this Agreement. Vendor shall not process Customer Personal Data for any other purpose, including for Vendor's own purposes or for the benefit of any third party.

### Aggressive (Customer-Favorable)
> Vendor shall process Customer Personal Data strictly in accordance with Customer's prior written instructions. Vendor shall not process, access, use, transfer, disclose, or otherwise make available Customer Personal Data for any purpose other than as expressly authorized by this Agreement and Customer's written instructions. Any processing outside the scope of Customer's instructions shall require Customer's prior written consent. Vendor shall immediately inform Customer if, in Vendor's opinion, an instruction from Customer infringes applicable Data Protection Laws.

### Vendor-Favorable
> Vendor shall process Customer Personal Data in accordance with Customer's reasonable instructions and applicable Data Protection Laws. Vendor may process Customer Personal Data as reasonably necessary to provide and improve the Services, maintain system security, comply with applicable law, and generate aggregated, de-identified analytics that do not identify Customer or any individual data subject.

### Minimum Acceptable
> Vendor shall process Customer Personal Data in accordance with Customer's instructions and applicable Data Protection Laws. Vendor shall not use Customer Personal Data for purposes other than providing the Services.

### Notes
Use Standard for most SaaS and services agreements. Use Aggressive for engagements involving sensitive data categories (health, financial, children's data) or high-volume processing. Vendor-Favorable language allowing "improvement" and aggregated analytics is common in vendor paper; push back on anything that enables model training or product development using identifiable data. Minimum Acceptable may suffice for low-risk Tier 3 vendors with limited data access.

## Data Breach Notification

### Standard
> Vendor shall notify Customer without undue delay, and in any event within seventy-two (72) hours, after becoming aware of a Personal Data Breach affecting Customer Personal Data. Such notification shall include: (a) the nature of the breach, including the categories and approximate number of data subjects and records concerned; (b) the likely consequences of the breach; (c) the measures taken or proposed to address the breach; and (d) the identity and contact details of Vendor's data protection officer or other contact point.

### Aggressive (Customer-Favorable)
> Vendor shall notify Customer within forty-eight (48) hours after becoming aware of any Security Incident that affects or may affect Customer Personal Data, including any unauthorized access, acquisition, use, disclosure, or destruction of Customer Personal Data. Such notification shall include all information reasonably necessary for Customer to comply with its own breach notification obligations under applicable law. Vendor shall cooperate fully with Customer's investigation and provide updates at least every twenty-four (24) hours until the incident is resolved. Vendor shall not notify any regulatory authority or affected individuals on behalf of Customer without Customer's prior written consent.

### Vendor-Favorable
> Vendor shall notify Customer without undue delay after confirming a Personal Data Breach that materially affects the security of Customer Personal Data. Such notification shall include a general description of the incident and the measures Vendor is taking to address it. Vendor shall have sole authority to manage incident response, including communications with regulators and affected individuals, unless otherwise required by law.

### Minimum Acceptable
> Vendor shall notify Customer without undue delay after becoming aware of a Personal Data Breach involving Customer Personal Data. Such notification shall include a description of the nature of the breach and the measures taken to address it.

### Notes
Standard language aligns with GDPR Article 33 requirements. Vendor-Favorable language narrows the trigger to "confirmed" breaches that "materially affect" security, creating gaps. Reject vendor-favorable formulations that condition notification on materiality determinations or give vendor sole control over regulatory communications. Minimum Acceptable lacks a specific time frame -- add "within 72 hours" at minimum.

## Sub-Processor Management

### Standard
> Vendor shall maintain a list of sub-processors used to process Customer Personal Data. Vendor shall provide Customer with at least thirty (30) days' prior written notice before engaging a new sub-processor. Customer may object to a new sub-processor on reasonable grounds within fifteen (15) days. If the parties cannot resolve the objection, Customer may terminate the affected Services without penalty. Vendor shall impose data protection obligations on sub-processors no less protective than those in this Agreement.

### Aggressive (Customer-Favorable)
> Vendor shall not engage any sub-processor to process Customer Personal Data without Customer's prior written consent. Vendor shall provide at least forty-five (45) days' prior written notice before engaging a new sub-processor. Customer may object for any reason within thirty (30) days. If Customer objects, Vendor shall not engage the sub-processor and shall either continue Services without it or permit termination with a pro-rata refund. Vendor shall be fully liable for the acts and omissions of its sub-processors.

### Vendor-Favorable
> Vendor may engage sub-processors to process Customer Personal Data in connection with the Services. Vendor shall maintain a current list of sub-processors on its website and update the list when changes occur. Customer may subscribe to notifications of sub-processor changes. Vendor shall impose data protection obligations on sub-processors that are substantially similar to those in this Agreement.

### Minimum Acceptable
> Vendor may engage sub-processors to process Customer Personal Data, provided that Vendor (a) maintains a current list of sub-processors, (b) imposes data protection obligations consistent with this Agreement, and (c) remains responsible for the acts and omissions of its sub-processors.

### Notes
Standard language balances transparency with operational flexibility. Vendor-Favorable language (website-only list, no advance notice, no objection right) may be insufficient under GDPR Article 28(2). Push for at minimum an advance notice period and an objection right. Minimum Acceptable omits the objection right entirely.

## Cross-Border Data Transfers

### Standard
> Vendor shall not transfer Customer Personal Data outside the European Economic Area (or the jurisdiction from which it was collected) unless (a) the transfer is to a country deemed adequate by the relevant authority, or (b) appropriate safeguards are in place, including the European Commission's Standard Contractual Clauses. Vendor shall promptly inform Customer of any legal requirement preventing compliance.

### Aggressive (Customer-Favorable)
> Vendor shall process and store all Customer Personal Data exclusively within the geographic region specified by Customer. If a transfer is authorized, Vendor shall implement all safeguards required by applicable law, including Standard Contractual Clauses with supplementary measures. Vendor shall conduct and provide a transfer impact assessment for each cross-border transfer.

### Vendor-Favorable
> Vendor may transfer Customer Personal Data to any country where Vendor or its sub-processors maintain facilities, provided Vendor implements appropriate transfer mechanisms as required by applicable Data Protection Laws. Customer acknowledges that the Services are provided using a global infrastructure and that cross-border transfers are necessary for service delivery.

### Minimum Acceptable
> Vendor shall ensure that any transfer of Customer Personal Data outside the EEA complies with applicable Data Protection Laws, including by implementing appropriate transfer mechanisms.

### Notes
Vendor-Favorable language giving blanket transfer authority with only a general compliance obligation offers weak protection. At minimum, require identification of transfer destinations and specific transfer mechanisms. Aggressive language with data localization is appropriate for highly regulated industries. Standard language covers most scenarios and aligns with GDPR Chapter V.

## Audit Rights

### Standard
> Upon reasonable notice (not less than thirty (30) days), Customer or its designated third-party auditor may audit Vendor's data processing activities no more than once per twelve (12) months (unless required by a regulator or following a breach). Vendor shall cooperate at no additional cost. Alternatively, Vendor may provide a current SOC 2 Type II report or equivalent.

### Aggressive (Customer-Favorable)
> Customer shall have the right to audit Vendor's compliance at any time upon fifteen (15) days' notice. Audits may include on-site inspections, record reviews, and technical testing. Frequency shall not be limited if an audit reveals material non-compliance or following a security incident. Vendor shall remediate non-compliance at its own expense.

### Vendor-Favorable
> Vendor shall make available to Customer a current SOC 2 Type II report (or equivalent third-party certification) upon written request, no more than once per twelve (12) months, which shall satisfy Customer's audit rights under this Agreement. Any additional audit shall be at Customer's expense, subject to Vendor's reasonable scheduling, and conducted by an independent third-party auditor bound by confidentiality obligations acceptable to Vendor.

### Minimum Acceptable
> Vendor shall, upon Customer's reasonable request, provide evidence of its compliance with data protection obligations, which may include a current SOC 2 Type II report or equivalent certification.

### Notes
Vendor-Favorable language limiting audits to third-party certification reviews may be insufficient for high-risk engagements. Push for at least a direct audit right triggered by breach or non-compliance. Standard language balances oversight with vendor operational burden. Aggressive language is appropriate for Tier 1 critical vendors processing sensitive data at scale.

## Data Subject Rights Facilitation

### Standard
> Vendor shall promptly assist Customer in responding to requests from data subjects exercising their rights under applicable Data Protection Laws, including rights of access, rectification, erasure, restriction, portability, and objection ("Data Subject Requests" or "DSRs"). Vendor shall notify Customer within five (5) business days of receiving a DSR directly from a data subject and shall not respond to the data subject without Customer's prior written instruction, unless required by applicable law. Vendor shall implement and maintain technical and organizational measures to enable Customer to retrieve, correct, delete, or export Customer Personal Data in a structured, commonly used, machine-readable format. Vendor's reasonable assistance with DSRs shall be provided at no additional cost, except for requests that are manifestly excessive or repetitive, for which Vendor may charge a reasonable fee upon prior notice to Customer.

### Aggressive (Customer-Favorable)
> Vendor shall provide all assistance necessary for Customer to comply with Data Subject Requests within the timeframes required by applicable Data Protection Laws. Vendor shall notify Customer within twenty-four (24) hours of receiving any DSR or any communication from a data subject that could constitute a DSR. Vendor shall not respond directly to any data subject without Customer's prior written consent. Vendor shall maintain self-service tools that enable Customer to independently fulfill DSRs (including access, rectification, erasure, restriction, portability, and objection) without requiring Vendor's manual intervention. Where self-service tools are insufficient, Vendor shall complete its assistance within five (5) business days of Customer's request. All assistance shall be provided at no additional cost regardless of volume. Vendor shall maintain an audit trail of all DSR processing activities and provide such records to Customer upon request.

### Vendor-Favorable
> Vendor shall use commercially reasonable efforts to assist Customer in responding to Data Subject Requests to the extent the request relates to Customer Personal Data processed by Vendor. Customer shall be responsible for determining the validity of any DSR and for directing Vendor's response. Vendor may charge Customer at Vendor's then-current professional services rates for time spent assisting with DSRs that exceed five (5) requests per calendar quarter. Vendor shall respond to Customer's DSR assistance requests within fifteen (15) business days.

### Minimum Acceptable
> Vendor shall provide reasonable assistance to Customer in responding to Data Subject Requests, including by making available the technical capabilities necessary to retrieve, correct, or delete Customer Personal Data. Vendor shall notify Customer promptly upon receiving a DSR directly from a data subject.

### Notes
Standard language balances cost allocation with compliance obligations. The 5-business-day notification window is workable for most regimes but may be tight under GDPR's one-month response requirement given internal processing time. Vendor-Favorable language with per-DSR fees and 15-business-day response times creates cost exposure and may prevent timely compliance with GDPR Article 12(3) (one month) or CCPA Section 1798.105 (45 days). Push for self-service tools as the primary mechanism -- manual DSR processing does not scale. Aggressive language requiring 24-hour notification and unlimited free assistance is appropriate for high-volume consumer data processing.

## Data Retention & Deletion

### Standard
> Vendor shall not retain Customer Personal Data longer than necessary to perform the Services. Upon expiration or termination of this Agreement, Vendor shall, at Customer's election, return or delete all Customer Personal Data from production systems within thirty (30) days, shall purge all copies from backup and archival systems within ninety (90) days, and shall certify such deletion in writing upon completion. Vendor may retain copies of Customer Personal Data only to the extent required by applicable law or regulation, provided that: (a) Vendor notifies Customer of the legal basis for retention; (b) such retained data remains subject to all confidentiality and data protection obligations of this Agreement; and (c) Vendor deletes the retained data promptly once the legal requirement expires. Any legal hold or litigation preservation obligation shall suspend the deletion requirement only for the specific data subject to the hold.

### Aggressive (Customer-Favorable)
> Vendor shall implement data retention schedules that limit retention of Customer Personal Data to the minimum period necessary to provide the Services. Upon expiration or termination of this Agreement for any reason, or upon Customer's written request at any time during the Term with respect to specific data: (a) Vendor shall return all Customer Personal Data to Customer in a structured, commonly used, machine-readable format within fifteen (15) days; and (b) Vendor shall securely delete all copies of Customer Personal Data from all systems, backups, archives, and disaster recovery environments within thirty (30) days and provide a written certificate of destruction signed by an authorized officer. Deletion shall comply with NIST SP 800-88 or equivalent standards. Vendor shall not retain any copies except as required by applicable law, in which case Vendor shall identify the specific legal requirement, isolate the retained data, and delete it within thirty (30) days of the requirement's expiration. Vendor shall provide Customer with a data map identifying all locations where Customer Personal Data is stored or processed.

### Vendor-Favorable
> Upon termination, Vendor shall delete Customer Personal Data from its production systems within ninety (90) days. Backup copies shall be deleted in the ordinary course of Vendor's backup rotation cycle, which shall not exceed one hundred eighty (180) days. Vendor may retain Customer Personal Data to the extent required by applicable law, for legitimate business purposes including dispute resolution, or in aggregated and anonymized form. Customer acknowledges that certain data may be technically impractical to delete from distributed systems and that Vendor shall have no liability for data retained in such systems.

### Minimum Acceptable
> Upon termination, Vendor shall delete all Customer Personal Data from production systems within thirty (30) days and from backup systems within ninety (90) days, and confirm deletion in writing. Vendor may retain data only as required by applicable law, subject to continued confidentiality and data protection obligations.

### Notes
The house position is 30 days for production systems and 90 days maximum for backups, with written certification -- aligned with GDPR Article 17 expectations and operationally honest about vendor backup rotation. The Aggressive variant's 30-day all-systems deletion is the opening ask for high-sensitivity data. Vendor-Favorable language with 90-day production deletion plus 180-day backup rotation means data could persist for 9 months post-termination -- push back to 30/90. The "technically impractical" carve-out for distributed systems is a red flag; modern systems can delete data from distributed environments. The "legitimate business purposes" retention exception is too broad and may conflict with storage limitation principles under GDPR Article 5(1)(e). Always require a written destruction certificate.

## Security Measures

### Standard
> Vendor shall implement and maintain appropriate technical and organizational security measures to protect Customer Personal Data against unauthorized access, disclosure, alteration, destruction, or loss. Such measures shall include, at minimum: (a) encryption of Customer Personal Data in transit (TLS 1.2 or higher) and at rest (AES-256 or equivalent); (b) access controls based on the principle of least privilege, including multi-factor authentication for administrative access; (c) regular vulnerability assessments and annual penetration testing by a qualified independent third party; (d) intrusion detection and prevention systems; (e) logging and monitoring of access to Customer Personal Data with logs retained for at least twelve (12) months; and (f) a documented incident response plan tested at least annually. Vendor shall maintain at least SOC 2 Type II certification (or equivalent) and provide copies to Customer upon request.

### Aggressive (Customer-Favorable)
> Vendor shall implement and maintain technical and organizational security measures that meet or exceed the requirements set forth in Exhibit [X] (Security Requirements) and that are no less protective than: (a) industry best practices, including ISO 27001/27002, NIST Cybersecurity Framework, and SOC 2 Type II; (b) the security measures Vendor uses to protect its own most sensitive information; and (c) any security requirements mandated by applicable Data Protection Laws. Without limiting the foregoing, Vendor shall maintain: (i) encryption at rest (AES-256) and in transit (TLS 1.3); (ii) role-based access controls with least-privilege enforcement and multi-factor authentication for all access to Customer Personal Data; (iii) quarterly vulnerability scanning and semi-annual penetration testing by an independent firm approved by Customer, with results shared with Customer within ten (10) business days; (iv) a security information and event management (SIEM) system with real-time alerting; (v) network segmentation isolating Customer Personal Data from other customer data; (vi) background checks for all personnel with access to Customer Personal Data; and (vii) annual security awareness training for all personnel. Vendor shall not materially reduce its security measures during the Term without Customer's prior written consent.

### Vendor-Favorable
> Vendor shall maintain commercially reasonable administrative, technical, and physical safeguards designed to protect Customer Personal Data in accordance with Vendor's information security policy (available at [URL]). Vendor may update its security measures from time to time in its sole discretion, provided that the updated measures are no less protective in the aggregate. Vendor shall maintain SOC 2 Type II certification or a substantially equivalent third-party audit. Customer acknowledges that no security measures are impenetrable and that Vendor does not guarantee against unauthorized access to Customer Personal Data.

### Minimum Acceptable
> Vendor shall implement and maintain technical and organizational security measures appropriate to the risk, including encryption in transit and at rest, access controls, regular vulnerability assessments, and an incident response plan. Vendor shall maintain an independent third-party security certification (SOC 2 Type II or equivalent).

### Notes
Vendor-Favorable language referencing a URL-based security policy that Vendor can update "in its sole discretion" provides no contractual baseline. Push for specific, enumerated security controls or an attached security exhibit. The "commercially reasonable" standard without further specificity is litigated frequently and provides uncertain protection. Aggressive language is appropriate for Tier 1 vendors processing sensitive data categories (health, financial, children's data). Minimum Acceptable should always include encryption, access controls, and independent certification. Note that penetration testing frequency and scope are among the most negotiated security terms -- annual is market standard, semi-annual is best practice for high-risk environments.
