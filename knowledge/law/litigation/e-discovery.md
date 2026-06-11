---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, international]
authorities:
  - cite: "Fed. R. Civ. P. 26"
    title: "Discovery scope, proportionality, 26(f) conference (amended Dec. 1, 2025 — privilege-log timing and method)"
    url: "https://www.law.cornell.edu/rules/frcp/rule_26"
  - cite: "Fed. R. Civ. P. 34"
    title: "Production of documents and ESI"
    url: "https://www.law.cornell.edu/rules/frcp/rule_34"
  - cite: "Fed. R. Evid. 502"
    title: "Attorney-client privilege and work product — waiver limitations"
    url: "https://www.law.cornell.edu/rules/fre/rule_502"
  - cite: "U.S. Courts, Recent and Proposed Amendments to Federal Rules (2025)"
    title: "December 1, 2025 amendments to Rules 16, 16.1, and 26"
    url: "https://www.uscourts.gov/data-news/reports/annual-reports/directors-annual-report/annual-report-2025/recent-and-proposed-amendments-federal-rules-annual-report-2025"
  - cite: "Societe Nationale Industrielle Aerospatiale v. U.S. District Court, 482 U.S. 522 (1987)"
    title: "Comity analysis for cross-border discovery conflicts"
    url: "https://www.law.cornell.edu/supremecourt/text/482/522"
---
# E-Discovery

## Applicability

Load when any matter involves electronic discovery, ESI production, discovery planning, meet-and-confer obligations, technology-assisted review, predictive coding, privilege review in document production, production format disputes, cross-border discovery, or proportionality analysis. Also load when evaluating data retention, legal hold technology, or cloud service agreements that must support e-discovery.

## Key Requirements

### FRCP 26(f) Meet-and-Confer

- **Timing** / **Threshold**: Parties must confer at least 21 days before the scheduling conference or scheduling order deadline (FRCP 26(f)(1)) / **Consequence**: Failure to participate in good faith may result in sanctions and waiver of objections to discovery plan
- **Required topics**: Preservation obligations, ESI sources and formats, search methodology, privilege review protocol, production format (native vs. TIFF/PDF), cost allocation, phased discovery plan, clawback agreement
- **Privilege-log planning (December 1, 2025 amendments)**: As amended effective December 1, 2025, FRCP 26(f)(3) requires the discovery plan to state the parties' views on the timing and method for complying with the FRCP 26(b)(5)(A) withholding-description requirement, and FRCP 16(b)(3) permits the scheduling order to address it -- raise privilege-log format (document-by-document, categorical, metadata-based) at the 26(f) conference
- **Discovery plan**: Must be submitted to the court within 14 days after the Rule 26(f) conference (FRCP 26(f)(2))
- **Early attention to ESI**: Courts increasingly expect parties to address ESI issues at the earliest stage; failure to raise format or scope issues early may constitute waiver

### Proportionality (FRCP 26(b)(1))

The 2015 amendments elevated proportionality to a central discovery principle. Discovery must be:

- **Relevant to any party's claim or defense** AND **proportional to the needs of the case**
- **Six proportionality factors**: (1) importance of the issues at stake, (2) amount in controversy, (3) parties' relative access to relevant information, (4) parties' resources, (5) importance of discovery in resolving the issues, (6) whether burden or expense outweighs likely benefit
- **Burden of proof** / **Threshold**: Requesting party must show relevance; producing party must show disproportionate burden with specificity / **Consequence**: Conclusory assertions of burden are insufficient (*Eramo v. Rolling Stone*, E.D. Va. 2016)
- **Not a shield for large parties**: The "parties' resources" factor does not automatically excuse wealthy parties from broad discovery; it cuts both ways

### Technology-Assisted Review (TAR) and Predictive Coding

- **Court acceptance** / **Threshold**: TAR accepted as a reasonable and defensible review methodology since *Da Silva Moore v. Publicis Groupe* (S.D.N.Y. 2012) / **Consequence**: Parties cannot be forced to use TAR but courts increasingly endorse it as proportional to manual review
- **Rio Tinto standard** / **Threshold**: *Rio Tinto PLC v. Vale S.A.* (S.D.N.Y. 2015) -- court held requesting party could not dictate producing party's review methodology as long as results are defensible / **Consequence**: Producing party has discretion to choose TAR workflow; transparency about methodology and validation may be required
- **Validation**: Courts expect statistical validation of TAR results (recall and precision metrics); seed set disclosure may be required in TAR 1.0 (but not TAR 2.0 continuous active learning)
- **Quality control**: Random sampling of non-responsive set to validate recall; document quality control (QC) protocols should be documented
- **AI-generated and machine-generated evidence (pending rule)**: Proposed FRE 707 (published for public comment August 2025; comment period closed February 16, 2026; not yet adopted) would subject machine-generated evidence offered without an expert witness to the FRE 702(a)-(d) reliability requirements; until adopted, authenticity and reliability challenges to AI-generated or "deepfake" evidence proceed under existing FRE 702 and 901

### Privilege Review and Logs (FRCP 26(b)(5))

- **Privilege log requirement** / **Threshold**: Party withholding documents on privilege grounds must describe them sufficiently to enable assessment without revealing privileged content (FRCP 26(b)(5)(A)) / **Consequence**: Failure to produce timely, adequate privilege log may result in waiver (*Burlington Northern*); since December 1, 2025, log timing and method are mandatory discovery-plan topics under FRCP 26(f)(3)
- **Log elements**: Date, author, all recipients, general subject matter, privilege asserted (attorney-client, work product, or both)
- **Categorical logs**: Courts increasingly permit categorical logging for voluminous privilege withholdings (grouping similar communications)
- **FRE 502(d) orders**: Stipulated or court-ordered protection against inadvertent privilege waiver; should be sought at the outset of every case -- provides case-specific and cross-case protection
- **Clawback agreements** / **Threshold**: FRE 502(b) provides default inadvertent waiver analysis (reasonable steps + prompt remedial action); FRE 502(d) court order provides stronger protection / **Consequence**: Without 502(d) order, inadvertent production may waive privilege if reasonable steps were not taken

### Production Format

- **Native format**: Preserves metadata, functionality, and formatting; preferred for spreadsheets, databases, and complex ESI
- **TIFF/PDF with load files**: Industry standard for document review platforms; Bates-stamped; extracted text and metadata in load files (.dat)
- **Default rule** / **Threshold**: FRCP 34(b)(2)(E) -- if no format specified, produce in form ordinarily maintained or reasonably usable form / **Consequence**: Producing in deliberately degraded format (e.g., non-searchable TIFF without OCR) may warrant re-production order
- **Reasonably usable**: Must include searchable text (OCR or extracted), relevant metadata, and sufficient information to identify the document
- **De-duplication**: Global or custodian-level de-duplication is standard practice; methodology should be disclosed

### Cost Allocation

- **Presumptive rule**: Producing party bears its own costs of production (unless cost-shifting is warranted)
- **Cost-shifting factors** (*Zubulake I*, 217 F.R.D. 309): (1) extent to which request is tailored, (2) availability from other sources, (3) cost of production, (4) ability to pay, (5) importance to the issues, (6) relative benefit, (7) total cost relative to amount in controversy
- **Third-party production**: Issuing party presumptively bears non-party's significant production costs (FRCP 45(d))
- **Proportionality-based allocation**: Post-2015 amendments, courts use Rule 26(b)(1) proportionality factors to assess cost-shifting

### FRCP 37(e) Safe Harbor

- **Safe harbor for routine operations**: FRCP 37(e) addresses only ESI lost when a party "failed to take reasonable steps to preserve"; if reasonable steps were taken, no sanctions even if some ESI is lost
- **Reasonable steps standard**: Issuing a litigation hold, identifying key custodians, suspending auto-deletion, collecting or preserving in place; perfection is not required
- See `litigation-holds.md` for detailed sanctions framework

### International Cross-Border Discovery

- **GDPR conflict** / **Threshold**: EU data protection law restricts transfer of personal data outside the EU/EEA; U.S. discovery requests may conflict with GDPR / **Consequence**: Producing party must implement safeguards (SCCs, anonymization, pseudonymization); U.S. courts generally weigh GDPR objections under the *Aerospatiale* comity factors and have ordered production notwithstanding GDPR
- **Hague Evidence Convention** / **Threshold**: Some countries (notably France, Germany, China) have blocking statutes that prohibit direct discovery compliance; Hague Convention letters rogatory may be required / **Consequence**: Courts balance comity against domestic litigation needs (*Societe Nationale Industrielle Aerospatiale v. U.S. District Court*, 482 U.S. 522 (1987))
- **French Blocking Statute (Loi de Blocage)** / **Threshold**: Prohibits production of documents located in France for use in foreign proceedings without government authorization / **Consequence**: Fines and criminal penalties; U.S. courts have generally held it does not bar discovery but weigh it as a comity factor
- **Data localization**: Some jurisdictions require data to remain in-country; discovery compliance may require in-country review with only responsive, non-personal data exported

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Preservation is the first phase of EDRM; preservation failures undermine the entire e-discovery process
- **Litigation (Privilege)**: FRE 502(d) orders, clawback agreements, and privilege logging are integral to e-discovery
- **Litigation (Subpoenas)**: Third-party subpoenas for ESI trigger e-discovery obligations and cost-shifting analysis
- **Data Privacy**: GDPR cross-border discovery conflicts require transfer mechanism analysis; anonymization and pseudonymization as mitigation
- **IP and Technology**: Source code discovery requires special protocols (clean room, outside-counsel-eyes-only, limited-access provisions)

## Sources

- Federal Rules of Civil Procedure, Rule 26: https://www.law.cornell.edu/rules/frcp/rule_26
- U.S. Courts, December 1, 2025 amendments to Rules 16, 16.1, and 26: https://www.uscourts.gov/data-news/reports/annual-reports/directors-annual-report/annual-report-2025/recent-and-proposed-amendments-federal-rules-annual-report-2025
- Federal Rules of Civil Procedure, Rule 34: https://www.law.cornell.edu/rules/frcp/rule_34
- Federal Rules of Evidence, Rule 502: https://www.law.cornell.edu/rules/fre/rule_502
- *Da Silva Moore v. Publicis Groupe*, 287 F.R.D. 182 (S.D.N.Y. 2012): TAR approval
- *Societe Nationale Industrielle Aerospatiale v. U.S. District Court*, 482 U.S. 522 (1987): https://www.law.cornell.edu/supremecourt/text/482/522
- The Sedona Conference, Principles for Electronic Document Production (Third Edition): https://thesedonaconference.org
