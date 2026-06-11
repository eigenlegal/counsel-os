---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Security Incident Response

Reference guide for managing a suspected or confirmed security incident — from the first report through notification analysis and post-incident close. Use when any potential compromise of systems or data is reported: ransomware, unauthorized access, lost device, vendor breach, insider exfiltration, or an anomaly that might be any of these.

## Intake

Answers to these set the severity, the clock, and the privilege posture — get them in the first call:

- What happened, factually, as far as anyone knows? (Resist conclusions; capture observations.)
- Is it ongoing or contained? Is the threat actor still in the environment?
- What systems are affected, and what data do those systems plausibly hold? Personal data? Regulated data (PHI, financial, government, children's)? Customer data we process for others?
- Has there been any threat-actor contact, demand, or public disclosure?
- Who knows already — internally, vendors, customers, press?
- Are any clocks already running? (Vendor notice received on a date; DPA clocks; a regulator or customer already asking.)
- Has anything been deleted, rebuilt, or wiped since discovery?

## Severity Classification

| Severity | Indicators | Posture |
|---|---|---|
| **Critical** | Confirmed acquisition of sensitive personal data; ransomware/extortion; ongoing intrusion; regulated data; potential SEC materiality; public exposure | Full response team same-day. Outside counsel and panel forensics engaged within 24 hours. Insurer noticed. |
| **High** | Personal data plausibly accessed but scope unknown; customer-processed data affected; vendor breach with our data confirmed | Counsel-led investigation within 24-48 hours. Notification analysis opened. |
| **Medium** | Limited internal data; single lost/stolen encrypted device; phishing compromise of one account without evident data access | Counsel supervises; IT-led investigation. Document the no-notice rationale. |
| **Low** | Blocked attack, scanning activity, no evidence of access | Log and monitor. No legal workstream beyond the record. |

Severity is provisional — incidents are routinely upgraded as forensics progresses. Treat scope-unknown as the next tier up, not the current one.

## First 24 Hours

The first day determines whether the response is privileged, whether evidence survives, and whether early statements create liability. Sequence matters.

**Privilege first**
- Engage counsel before engaging forensics. A forensic firm retained by IT produces a discoverable report; the same firm retained by counsel (in-house or outside) for the purpose of providing legal advice has a defensible privilege claim. Paper the engagement through counsel from the start — retroactive privilege wrappers fail.
- Direct all incident communications through counsel. Stand up a response channel that counsel runs; label substantive communications as privileged and prepared at the direction of counsel — and keep the circle small, since wide distribution undermines the privilege claim.
- Mark working documents (timelines, impact assessments, draft notifications) as attorney work product. See `law/litigation/privilege.md` for the limits — privilege protects legal advice, not underlying facts.

**Contain**
- Isolate affected systems without destroying volatile evidence where feasible (image before wiping; snapshot before rebuilding).
- Revoke or rotate compromised credentials, keys, and tokens. Check for persistence mechanisms before declaring containment.
- Do not pay, negotiate, or communicate with a threat actor without counsel sign-off — sanctions exposure (OFAC) and insurer consent requirements both apply.

**Preserve evidence**
- Issue a litigation hold if litigation or regulatory action is reasonably anticipated — for any significant incident, it is. Use `practice/methods/litigation-hold.md`; legal standards in `law/litigation/litigation-holds.md`.
- Preserve logs before retention windows roll them off (firewall, VPN, cloud audit, email, endpoint). Short log-retention defaults are the most common evidence loss in the first week.
- Keep an incident timeline from hour one: what was known, when, by whom, and what was done. Regulators ask for exactly this.

**Language discipline**
- Use "incident," not "breach." "Breach" is a legal conclusion that triggers notification clocks under many statutes and contracts. The label is counsel's call, made only after the notification analysis below — premature use of the word in emails, tickets, or status updates becomes Exhibit A.
- The same applies to "exfiltration," "compromise of personal data," and severity labels. Describe facts; let counsel draw conclusions.

## Notification Analysis

Work the analysis in this order — each answer narrows the next question.

**1. What data was actually affected?**
- Distinguish accessed vs. acquired vs. merely exposed — many state statutes turn on acquisition, and several have risk-of-harm exceptions.
- Identify data elements precisely: name + SSN triggers nearly everywhere; name + email alone often does not. Encryption status matters — most statutes have encryption safe harbors if keys were not compromised.

**2. Whose data, and where do they live?**
- Notification obligations follow the residency of affected individuals, not the company's location. A single incident commonly triggers 10+ state regimes plus international ones.
- Employees count. HR data incidents trigger the same statutes as customer data incidents.

**3. Which regimes apply?**
- US state statutes: timelines, content requirements, AG-notice thresholds, and risk-of-harm standards vary by state — run affected states against the table in `law/data-privacy/us-breach-notification-50-state.md` rather than working from memory. Framework and definitions in `law/data-privacy/breach-notification.md` and `law/cybersecurity/state-breach-laws.md`.
- 72-hour regimes: GDPR requires supervisory-authority notice within 72 hours of awareness (`law/data-privacy/gdpr.md`); several non-US regimes run similar clocks (`law/data-privacy/international.md`). These clocks start at awareness, not at completion of forensics — a holding notification with known facts is the standard move when investigation is ongoing.
- Sector overlays: HIPAA breach notification for PHI (`law/healthcare/hipaa-compliance.md`); GLBA and banking regulators for financial data (`law/data-privacy/glba-privacy.md`); SEC disclosure analysis for public companies — the materiality determination and Form 8-K Item 1.05 clock are separate workstreams (`law/cybersecurity/sec-cyber-disclosure.md`).

**4. Who must be told?**
- Regulators (state AGs above thresholds, supervisory authorities, sector regulators), affected individuals, consumer reporting agencies (most states, above headcount thresholds), and contractual counterparties (next section). Each audience has different content requirements and timing — track them in one notification matrix.

## Contractual Notice Obligations

Statutes are the floor, not the ceiling. Contracts routinely impose shorter clocks and broader triggers.

- DPAs commonly require notice to controller-customers within 24-72 hours of awareness — often shorter than any statute, and often triggered by suspected incidents, not confirmed breaches. Pull executed DPAs for affected processing; check obligations against `practice/methods/privacy-dpa.md` and `practice/standards/data-protection.md`.
- MSAs, BAAs, and security exhibits may contain their own notice clauses independent of the DPA. BAAs carry HIPAA-specific timelines.
- If a vendor caused the incident, run the analysis in reverse: what notice were they obligated to give us, did they comply, and what indemnity, audit, and cooperation rights can we invoke. See `practice/standards/subcontractors-subprocessors.md`.
- Check government contracts and financial-sector agreements for incident-reporting clauses with very short fuses (sometimes hours).

## Law Enforcement and Insurer Notice

- **Insurer:** notify the cyber carrier early — policies condition coverage on prompt notice and on using panel forensics/counsel. Unapproved vendor spend may be unrecoverable. Coverage mechanics in `law/insurance/cyber-liability.md`.
- **Law enforcement:** FBI/IC3 (or Secret Service) notice is usually advisable for criminal intrusions — it supports law-enforcement-delay provisions in state statutes and looks responsible in hindsight. A law-enforcement hold can lawfully delay individual notification in most states; document the request.
- Law enforcement is not a substitute for regulatory notice, and reporting to law enforcement does not pause GDPR or contractual clocks.

## Communications Discipline

- One approved-facts document, maintained by counsel, from which all communications draw. Nothing goes out — internally or externally — that isn't in it.
- No speculation in writing: no guessed headcounts, no "we believe no data was taken" before forensics supports it. Early false reassurance is a recurring source of FTC and AG enforcement.
- Brief customer-facing teams (support, sales, account managers) with an approved holding statement and an escalation path; freelancing by account teams creates inconsistent statements that surface in litigation.
- Public statements, status-page posts, and press responses get legal review every time. Consistency across notifications, public statements, and any SEC disclosure is itself a legal requirement.

## Post-Incident

- Root cause analysis: run it under privilege if litigation risk remains; a separate non-privileged remediation summary can carry the operational fixes.
- Remediation memo: what failed, what was fixed, what is deferred and why, with owners and dates. Regulators in follow-up inquiries ask what changed.
- Regulator follow-ups: expect AG and supervisory-authority questionnaires months later; the hour-one timeline and notification matrix are the inputs.
- Revisit the litigation hold — release it only when litigation risk has actually passed, per `practice/methods/litigation-hold.md`.
- Feed lessons back: update the IR plan, vendor DPA terms, log-retention settings, and tabletop scenarios. Frameworks for program maturity in `law/cybersecurity/incident-response.md` and `law/cybersecurity/nist-frameworks.md`.

## Common Failure Modes

The recurring mistakes that turn manageable incidents into enforcement actions:

- Forensics engaged by IT before counsel — the report is discoverable and usually becomes the plaintiff's roadmap
- "Breach" used in writing on day one, before any notification analysis
- Logs rolled off because nobody extended retention in the first 48 hours
- Contractual notice clocks (DPA, BAA) missed while everyone watched the statutory ones
- Early public statement of scope ("no customer data affected") contradicted by later forensics
- Insurer noticed late or non-panel vendors used — coverage contested
- Notification matrix tracked statutes but missed CRA notice and AG thresholds in two states
- Hold released, or never issued, because the incident "resolved" before the lawsuits arrived

## Escalation Triggers

Escalate to senior counsel / leadership immediately when any of these appears:
- Confirmed acquisition of sensitive personal data (SSNs, financial accounts, health data, credentials) at any scale
- Ransomware, extortion demand, or any threat-actor contact
- Public company with potential materiality — SEC clock analysis required
- Regulated data: PHI, GLBA-covered financial data, government data, or children's data
- Incident is public, press is asking, or a researcher/threat actor is threatening disclosure
- Vendor-caused incident affecting our customers (two-sided notification obligations)
- Any 72-hour regime plausibly in play and forensics will not be conclusive in time
- Law enforcement contacts us first
