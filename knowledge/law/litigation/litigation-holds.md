---
counsel-os-type: law-area
content-version: "2026-04-08"
---
## Litigation Holds

# Litigation Holds and Document Preservation

## Applicability

Load when litigation is anticipated, threatened, or pending; when document preservation obligations arise; when e-discovery issues are involved; when evaluating spoliation risk; or when reviewing data retention policies in light of litigation. Also load when negotiating cloud service, SaaS, or vendor agreements that must support legal hold functionality.

## Key Requirements

### Trigger: Reasonable Anticipation of Litigation

The duty to preserve arises when litigation is "reasonably anticipated" -- not merely when a complaint is filed. This is the critical threshold.

- **Demand letter received or sent** / **Threshold**: Litigation is reasonably foreseeable when a specific claim is asserted / **Consequence**: Duty to preserve attaches immediately upon receipt or sending
- **Complaint filed** / **Threshold**: Duty unambiguously attaches / **Consequence**: Failure to issue hold promptly is per se unreasonable
- **Government investigation** / **Threshold**: Receipt of CID, subpoena, or regulatory inquiry / **Consequence**: Preservation duty covers scope of inquiry plus reasonably related materials
- **Internal discovery of wrongdoing** / **Threshold**: When a reasonable party would anticipate litigation from the discovered facts / **Consequence**: Pre-suit destruction after this point constitutes spoliation
- **Media reports or whistleblower complaints** / **Threshold**: When reports suggest claims likely to be asserted / **Consequence**: Courts look at the totality of circumstances; subjective awareness plus objective reasonableness

### Zubulake Duties

The *Zubulake v. UBS Warburg* line of decisions (S.D.N.Y. 2003-2004) established the foundational framework:

- **Zubulake IV (220 F.R.D. 212)**: Counsel must issue written litigation hold, communicate directly with key custodians, ensure preservation of relevant documents
- **Zubulake V (229 F.R.D. 422)**: Counsel has affirmative duty to monitor compliance with litigation hold; periodic reminders required; counsel must become familiar with client's document retention practices and data systems
- **Ongoing obligation**: Litigation hold is not "set and forget" -- requires active monitoring, periodic reissuance, and updating as issues and custodians evolve

### Scope of Preservation

- **Custodians**: All individuals likely to possess relevant information -- current and former employees, executives, board members, contractors, relevant third parties
- **Data sources**: Email, text messages, chat/Slack/Teams messages, documents (paper and electronic), databases, cloud storage (Google Drive, Dropbox, OneDrive, SharePoint), CRM systems, financial systems, HR systems, engineering repositories (Git, JIRA), social media, voicemail, metadata
- **Timeframe**: Relevant time period for the claims plus reasonable buffer; preservation scope should be defined and documented
- **Ephemeral messaging** / **Threshold**: Signal, disappearing messages, auto-delete features / **Consequence**: Failure to disable auto-delete for relevant custodians is a preservation failure; *WeChat* and similar platforms increasingly scrutinized
- **Backup tapes** / **Threshold**: Generally not required to preserve unless they are the only source of relevant information (*Zubulake I*) / **Consequence**: Routine recycling of backup tapes may continue if information is preserved from accessible sources

### Implementation Steps

1. **Identify and document**: Identify the matter, potential claims, relevant time period, key custodians, and relevant data sources
2. **Issue written hold notice**: Direct custodians to preserve all potentially relevant information; describe what must be preserved; instruct suspension of auto-delete policies; provide contact for questions
3. **Suspend routine destruction**: Disable auto-delete on email, messaging, and document management systems for affected custodians
4. **Interview key custodians**: Understand their data practices, devices, storage locations, and any unique data sources
5. **Collect or preserve in place**: Either collect copies of relevant data or implement technical holds (in-place preservation via eDiscovery platforms)
6. **Confirm receipt and compliance**: Obtain acknowledgments from all custodians; follow up on non-responses
7. **Monitor and reissue**: Send periodic reminders (quarterly minimum); update hold as new custodians or issues are identified; document all compliance monitoring

### Technology Systems

- **Legal hold platforms**: Relativity Legal Hold, Exterro, Zapproved, Hanzo -- automate notice, acknowledgment tracking, and reminders
- **In-place preservation**: Microsoft Purview (Office 365), Google Vault, Slack Enterprise Grid legal hold -- preserve data without collection
- **BYOD challenges**: Personal devices used for work may contain relevant data; must balance preservation with employee privacy; MDM solutions may enable targeted preservation
- **Cloud providers**: SaaS agreements must include legal hold support, data export capabilities, and cooperation provisions

### FRCP 37(e) Sanctions Framework

- **Threshold requirement**: ESI that should have been preserved in anticipation of litigation was lost because a party failed to take reasonable steps to preserve it
- **Curative measures (37(e)(1))** / **Threshold**: ESI lost, cannot be restored or replaced, and another party is prejudiced / **Consequence**: Court may order measures "no greater than necessary to cure the prejudice" -- additional discovery, cost-shifting, jury instructions on the loss (but NOT adverse inference under (e)(1))
- **Severe sanctions (37(e)(2))** / **Threshold**: Party acted with **intent to deprive** another party of the ESI / **Consequence**: Court may (A) presume lost information was unfavorable, (B) instruct jury it may or must presume unfavorable, or (C) dismiss action or enter default judgment
- **Key distinction**: Negligent failure triggers only curative measures; intentional destruction triggers severe sanctions including adverse inference -- *GN Netcom v. Plantronics* (D. Del. 2016) is leading post-amendment case
- **State law variation**: Many states have not adopted the 2015 federal amendments; some states still apply inherent authority sanctions for negligent spoliation; jurisdiction-specific analysis required

### Hold Release

- Litigation holds should be formally released when the matter concludes (settlement, judgment, expiration of appeals period)
- Document the release decision and communicate to all custodians
- Resume normal retention/destruction policies for the affected data
- Retained collections should be disposed of in accordance with retention policy unless needed for other matters

## Interaction with Other Areas

- **Litigation (Subpoenas)**: Receipt of a subpoena triggers immediate preservation for all materials within scope
- **Litigation (Regulatory Inquiries)**: Regulatory investigations trigger preservation obligations; scope defined by the inquiry
- **Litigation (Demand Letters)**: Sending or receiving a demand letter may trigger duty to preserve when litigation becomes reasonably foreseeable
- **Litigation (E-Discovery)**: Litigation hold is the first step in the EDRM; preservation failures cascade into e-discovery sanctions
- **Data Privacy**: Litigation hold obligations override routine deletion but create tension with GDPR right to erasure and CCPA deletion rights; legal hold takes priority but requires documented justification
- **IP and Technology**: SaaS and cloud providers must support legal hold functionality; technology agreements should address preservation cooperation
- **Employment**: Departing employees require exit preservation procedures; devices and accounts must be preserved before deprovisioning

## Sources

- Federal Rules of Civil Procedure, Rule 37(e): https://www.law.cornell.edu/rules/frcp/rule_37
- *Zubulake v. UBS Warburg LLC*, 220 F.R.D. 212 (S.D.N.Y. 2003): foundational litigation hold duties
- *Zubulake v. UBS Warburg LLC*, 229 F.R.D. 422 (S.D.N.Y. 2004): counsel's affirmative monitoring obligations
- The Sedona Conference, Commentary on Legal Holds (2019): https://thesedonaconference.org/publication/Commentary_on_Legal_Holds
- *GN Netcom, Inc. v. Plantronics, Inc.*, 2016 WL 3792833 (D. Del. 2016): leading 37(e) intent analysis
