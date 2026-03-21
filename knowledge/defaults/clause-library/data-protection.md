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
