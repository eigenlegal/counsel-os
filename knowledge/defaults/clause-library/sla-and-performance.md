---
counsel-os-type: clause-library
counsel-os-version: "0.3.1"
---

## Sla And Performance

# SLA & Performance — Clause Library

## Uptime Commitment

### Standard
> Vendor shall make the Services available with an uptime of at least 99.9% during each calendar month, measured as total minutes in the month minus Downtime, divided by total minutes. "Downtime" means any period during which the Services are unavailable or materially degraded, excluding Scheduled Maintenance, force majeure events, and outages caused by Customer's systems or actions.

### Aggressive (Customer-Favorable)
> Vendor shall make the Services available with an uptime of at least 99.95% during each calendar month, measured using Customer-accessible monitoring tools or an agreed independent third-party service. "Downtime" means any period during which the Services are unavailable, materially degraded (response times exceeding 2x the documented baseline), or any critical functionality is impaired, regardless of cause, except for: (a) Scheduled Maintenance conducted within permitted windows; and (b) outages directly caused by Customer's unauthorized modification. Outages caused by Vendor's infrastructure providers, third-party dependencies, or security incidents shall count as Downtime.

### Vendor-Favorable
> Vendor shall use commercially reasonable efforts to make the Services available at least 99.5% of the time during each calendar month. "Downtime" means any period during which the Services are completely unavailable to all users, excluding: (a) Scheduled Maintenance; (b) force majeure events; (c) failures of Customer's equipment, networks, or third-party services not provided by Vendor; (d) actions or inactions of Customer or its users; and (e) any beta, trial, or free-tier features. Uptime shall be measured solely by Vendor's monitoring systems.

### Minimum Acceptable
> Vendor shall use commercially reasonable efforts to make the Services available at least 99.5% of the time during each calendar month, excluding scheduled maintenance.

### Notes
The 99.9% standard allows approximately 43 minutes of downtime per month; 99.95% allows approximately 22 minutes; 99.5% allows approximately 3.6 hours. Vendor-Favorable language narrowing Downtime to "completely unavailable to all users" excludes partial outages and degraded performance. Push for a definition that captures material degradation. Measurement by vendor's own tools creates a conflict of interest -- push for independent or customer-accessible monitoring.

## Service Credits

### Standard
> If Vendor fails to meet the uptime commitment, Customer shall receive a service credit:
>
> | Monthly Uptime | Service Credit (% of Monthly Fees) |
> |---|---|
> | 99.0% - 99.89% | 10% |
> | 95.0% - 98.99% | 20% |
> | Below 95.0% | 30% |
>
> Credits shall be applied against the next invoice. Credits shall not exceed 30% of monthly fees. Customer must request credits within thirty (30) days. Service credits are Customer's sole and exclusive remedy for failure to meet the uptime commitment.

### Aggressive (Customer-Favorable)
> If Vendor fails to meet the uptime commitment, Customer shall receive a service credit automatically (without request):
>
> | Monthly Uptime | Service Credit (% of Monthly Fees) |
> |---|---|
> | 99.5% - 99.89% | 10% |
> | 99.0% - 99.49% | 25% |
> | 95.0% - 98.99% | 50% |
> | Below 95.0% | 100% |
>
> Credits may be applied to the next invoice or refunded in cash at Customer's election. Credits are in addition to, and not in lieu of, any other rights or remedies. Vendor shall provide a monthly uptime report within five (5) business days.

### Vendor-Favorable
> If Vendor fails to meet the uptime commitment and Customer submits a documented request within fifteen (15) days, Customer may receive a service credit of 5% of monthly fees for each full percentage point below the uptime target, not to exceed 10% of monthly fees for the affected month. Service credits are Customer's sole and exclusive remedy for any failure to meet the uptime commitment, and Customer shall have no other claim for damages or refund.

### Minimum Acceptable
> If Vendor fails to meet the uptime commitment, Customer may request a service credit of 5% of monthly fees for each percentage point below target, not to exceed 15% of monthly fees. Service credits are Customer's sole and exclusive remedy for downtime.

### Notes
Vendor-Favorable language with low credit caps (10%), short claim windows (15 days), and "sole and exclusive remedy" language minimizes vendor accountability. Push for meaningful credits (at least 20-30% cap), automatic application, and non-exclusivity. The Aggressive version makes credits non-exclusive and automatic.

## Scheduled Maintenance

### Standard
> Vendor may perform scheduled maintenance during designated windows: [Day/Time]. Vendor shall provide at least seventy-two (72) hours' prior written notice. Scheduled maintenance during designated windows with proper notice shall not count as Downtime. Emergency maintenance may be performed at any time with as much advance notice as practicable.

### Aggressive (Customer-Favorable)
> Vendor may perform scheduled maintenance only during designated windows: [Day/Time], not to exceed four (4) hours per month. Vendor shall provide at least five (5) business days' prior notice with a description of activities and expected impact. Maintenance exceeding permitted windows or performed without adequate notice counts as Downtime. Emergency maintenance may occur outside windows only for imminent security threats, with a post-maintenance report within twenty-four (24) hours.

### Vendor-Favorable
> Vendor may perform maintenance on the Services at any time with at least twenty-four (24) hours' prior notice. Vendor shall use reasonable efforts to schedule maintenance during off-peak hours but makes no guarantee. All maintenance performed with at least twenty-four (24) hours' notice, regardless of timing, shall not count as Downtime. Emergency maintenance may be performed at any time without prior notice.

### Minimum Acceptable
> Vendor may perform scheduled maintenance with at least forty-eight (48) hours' prior notice. Scheduled maintenance shall not count as Downtime.

### Notes
Vendor-Favorable language with 24-hour notice and no designated windows allows maintenance at any time, effectively reducing the uptime commitment. Push for specific windows aligned with low-usage periods. The Aggressive version caps total maintenance hours and requires post-maintenance reporting.

## Incident Response and Severity Classification

### Standard
> Vendor shall respond to incidents as follows:
>
> | Severity | Definition | Response Time | Update Frequency |
> |---|---|---|---|
> | Critical (S1) | Services unavailable; no workaround | 1 hour | Every 2 hours |
> | High (S2) | Major functionality impaired; workaround available | 4 hours | Every 4 hours |
> | Medium (S3) | Minor functionality impaired | 8 business hours | Daily |
> | Low (S4) | Cosmetic issue or enhancement request | 2 business days | Weekly |
>
> Vendor shall provide a root cause analysis for S1 and S2 incidents within five (5) business days, including root cause, corrective actions, and preventive measures.

### Aggressive (Customer-Favorable)
> Vendor shall classify and respond to incidents as follows:
>
> | Severity | Definition | Response Time | Resolution Target | Update Frequency |
> |---|---|---|---|---|
> | Critical (S1) | Services unavailable or data at risk | 30 minutes | 4 hours | Every 1 hour |
> | High (S2) | Major functionality impaired | 2 hours | 8 hours | Every 2 hours |
> | Medium (S3) | Minor functionality impaired | 4 business hours | 2 business days | Every 8 hours |
> | Low (S4) | Cosmetic or minor issue | 1 business day | 5 business days | Upon resolution |
>
> Customer may escalate severity by written notice. Vendor shall provide root cause analysis for S1 and S2 incidents within three (3) business days and a corrective action plan within ten (10) business days. Vendor shall conduct quarterly incident trend reviews.

### Vendor-Favorable
> Vendor shall use commercially reasonable efforts to respond to reported incidents. Vendor shall assign severity classifications in its sole reasonable discretion. Vendor's target response times are: Critical -- 4 hours; High -- 1 business day; Medium -- 3 business days; Low -- best efforts. Response times are targets only and not commitments or guarantees. Vendor shall provide status updates at reasonable intervals until resolution.

### Minimum Acceptable
> Vendor shall respond to critical incidents within four (4) hours and provide updates until resolution. Vendor shall respond to non-critical incidents within one (1) business day.

### Notes
Vendor-Favorable language making response times "targets only" with severity classification at vendor's "sole discretion" eliminates accountability. Push for committed response times and customer escalation rights. Resolution targets (not just response times) are important for meaningful SLAs. Ensure severity definitions are clear enough to avoid disputes.

## Chronic Failure

### Standard
> If Vendor fails to meet the uptime commitment for three (3) consecutive months or four (4) out of any six (6) consecutive months, Customer may terminate the affected Services upon thirty (30) days' notice, and Vendor shall refund all prepaid fees for the unused portion of the Term.

### Aggressive (Customer-Favorable)
> If Vendor fails to meet the uptime commitment for two (2) consecutive months or three (3) out of any six (6) consecutive months, Customer may: (a) terminate immediately; (b) receive a full refund of prepaid fees for the unused Term; and (c) receive transition assistance for up to ninety (90) days at no additional charge. Chronic failure shall constitute a material breach for which service credits are not an adequate remedy.

### Vendor-Favorable
> If Vendor fails to meet the uptime commitment for six (6) consecutive months, Customer may terminate the affected Services upon ninety (90) days' notice, and Vendor shall refund prepaid fees for the unused portion of the Term on a pro-rata basis. Service credits issued during the chronic failure period shall be deducted from any refund amount. This section states Customer's sole and exclusive remedy for chronic failure.

### Minimum Acceptable
> If Vendor repeatedly fails to meet the uptime commitment over a sustained period, Customer may terminate the affected Services and receive a pro-rata refund.

### Notes
Vendor-Favorable language requiring six consecutive months of failure before triggering termination with a 90-day notice period means the customer could endure nine months of poor performance before exit. Push for shorter trigger thresholds. Deducting already-issued service credits from the refund is double-dipping. The Minimum Acceptable is vague and difficult to enforce.

## SLA Measurement & Monitoring

### Standard
> Uptime shall be measured using Vendor's standard monitoring tools, which shall track availability of the Services from multiple geographic regions at intervals of no greater than five (5) minutes. Vendor shall provide Customer with read-only access to a real-time status dashboard displaying current and historical uptime data. The following shall be excluded from Downtime calculations: (a) Scheduled Maintenance performed in accordance with this Agreement; (b) force majeure events; and (c) outages caused by Customer's systems, networks, or actions. Partial outages affecting a material portion of the Services or degraded performance exceeding documented baseline response times by more than 200% shall count as Downtime on a pro-rata basis.

### Aggressive (Customer-Favorable)
> Uptime shall be measured using an independent third-party monitoring service mutually agreed upon by the parties (e.g., Datadog, Pingdom, or equivalent), or, at Customer's election, Customer's own monitoring tools. The monitoring service shall measure availability from at least three (3) geographic regions at intervals of no greater than one (1) minute. Customer shall have real-time API access to all monitoring data, including historical records for the duration of the Agreement. The only permissible exclusions from Downtime calculations are: (a) Scheduled Maintenance conducted within permitted windows with proper notice; and (b) outages directly and solely caused by Customer's unauthorized modification of the Services. Outages caused by Vendor's infrastructure providers, upstream dependencies, DNS failures, certificate expirations, or security incidents shall count as Downtime. Any period during which the Services are degraded — including response times exceeding 150% of the documented baseline, error rates exceeding 1% of requests, or partial unavailability affecting any critical functionality — shall count as Downtime. In the event of a dispute over uptime measurement, the independent monitoring service's data shall control.

### Vendor-Favorable
> Uptime shall be measured using Vendor's proprietary monitoring systems from Vendor's primary data center region. Downtime means only those periods during which the Services are completely unavailable to all users, as confirmed by Vendor's monitoring systems. The following shall be excluded from Downtime calculations: (a) Scheduled Maintenance; (b) force majeure events; (c) failures of Customer's equipment, networks, internet connectivity, or third-party services; (d) actions or inactions of Customer or its authorized users; (e) API calls exceeding documented rate limits; (f) features designated as beta, preview, or experimental; and (g) any period during which the Services are degraded but not completely unavailable. Vendor's monitoring data shall be the sole and authoritative source for uptime calculations, and Customer shall have no right to dispute Vendor's measurements.

### Minimum Acceptable
> Uptime shall be measured by Vendor's monitoring tools. Vendor shall provide Customer with a monthly uptime report. Scheduled Maintenance performed with proper notice shall not count as Downtime.

### Notes
Measurement methodology is often more important than the uptime percentage itself. A 99.9% SLA measured only by total unavailability (Vendor-Favorable) is worth less than a 99.5% SLA that includes degraded performance. Key negotiation points: (1) Who controls the measurement tool — vendor tools create a conflict of interest; independent or customer-accessible tools are strongly preferred. (2) Measurement granularity — 5-minute intervals can miss brief but impactful outages. (3) Exclusions — broad exclusions for "third-party services" or "customer actions" can swallow the SLA. (4) Partial outages — requiring "completely unavailable to all users" before counting Downtime allows significant degradation to go uncredited. (5) Geographic scope — measuring from a single region may miss regional outages affecting the customer.

## SLA Reporting

### Standard
> Vendor shall provide Customer with a monthly uptime report within ten (10) business days after the end of each calendar month. The report shall include: (a) actual uptime percentage; (b) total Downtime minutes and incident descriptions; (c) any service credits earned; and (d) a summary of Scheduled Maintenance performed. For Severity 1 and Severity 2 incidents, Vendor shall provide a written post-incident report within five (5) business days of resolution, including root cause analysis, timeline of events, corrective actions taken, and preventive measures implemented.

### Aggressive (Customer-Favorable)
> Vendor shall provide Customer with a monthly SLA performance report within five (5) business days after the end of each calendar month, delivered to Customer's designated contact by email and available via API. The report shall include: (a) actual uptime percentage calculated in accordance with the agreed methodology; (b) itemized listing of all Downtime events, including start time, end time, duration, root cause, and affected components; (c) performance metrics including average and 95th-percentile response times; (d) error rates by category; (e) service credits earned and applied; (f) Scheduled Maintenance summary; and (g) trend analysis comparing the current month to the trailing six-month period. For Severity 1 incidents, Vendor shall provide a preliminary root cause analysis within twenty-four (24) hours of resolution and a final post-incident report within three (3) business days. For Severity 2 incidents, Vendor shall provide a post-incident report within five (5) business days. All post-incident reports shall include: root cause, contributing factors, timeline with timestamps, customer impact assessment, corrective actions with owners and deadlines, and preventive measures. Vendor shall conduct quarterly SLA review meetings with Customer to discuss trends and improvement initiatives.

### Vendor-Favorable
> Vendor shall make uptime statistics available through its standard customer portal on a monthly basis. Reports shall include aggregate uptime percentage for the reporting period. Detailed incident information shall be available upon Customer's written request, subject to Vendor's reasonable ability to provide such information without disclosing proprietary operational details. Vendor shall provide root cause information for Severity 1 incidents upon request, on a best-efforts basis.

### Minimum Acceptable
> Vendor shall provide a monthly uptime report showing the uptime percentage and any Downtime events. Vendor shall provide a post-incident report for Severity 1 incidents within ten (10) business days of resolution.

### Notes
SLA reporting is the mechanism by which customers verify vendor performance and trigger credit or termination rights. Without reliable, timely reporting, SLA commitments are unenforceable in practice. Key issues: (1) Delivery timeline — 10 business days is standard; longer delays reduce the value of the data. (2) Report content — aggregate percentages alone are insufficient; push for itemized incident data. (3) Post-incident reports — root cause analysis for S1/S2 incidents is essential for understanding systemic risk. (4) Access method — portal-only access (Vendor-Favorable) may lack the detail available via direct reports. (5) Trend data — month-over-month comparisons help identify deteriorating performance before it triggers chronic failure clauses.

## Non-SLA Services

### Standard
> The uptime commitments, service credits, incident response obligations, and chronic failure remedies in this Agreement shall not apply to: (a) beta, preview, or early-access features designated as such in writing; (b) free-tier or trial Services; (c) non-production environments (development, staging, sandbox); and (d) professional services, consulting, or advisory services. Vendor shall use commercially reasonable efforts to maintain the availability of non-SLA Services but shall have no liability for downtime or performance issues affecting such services. Vendor shall clearly designate which Services and features are excluded from SLA coverage in the applicable Order Form or documentation.

### Aggressive (Customer-Favorable)
> The SLA shall apply to all Services and features included in the Order Form and made generally available by Vendor. The following categories are excluded from SLA coverage only if explicitly designated in the Order Form at the time of purchase: (a) features clearly labeled as "beta" or "preview" in both the documentation and the user interface; (b) free-tier or trial Services provided at no charge; and (c) non-production environments expressly designated as such in the Order Form. Vendor shall not unilaterally reclassify any production feature or Service as beta, preview, or non-SLA after it has been included in Customer's production environment. Professional services shall be governed by separate service levels specified in the applicable Statement of Work. If Vendor introduces a new feature as a replacement for an SLA-covered feature, the replacement shall be subject to the same SLA. Vendor shall provide at least ninety (90) days' notice before discontinuing SLA coverage for any feature or Service.

### Vendor-Favorable
> The SLA applies only to the core production Services as designated by Vendor in its standard documentation. The following are excluded from SLA coverage: (a) beta, preview, experimental, or early-access features; (b) free, trial, developer, or evaluation-tier Services; (c) non-production, sandbox, staging, or development environments; (d) APIs and integrations; (e) mobile applications; (f) any feature or Service not expressly listed as SLA-eligible in Vendor's current documentation; and (g) any third-party services or integrations. Vendor may designate or reclassify features as beta or non-SLA at any time in its sole discretion. Customer's use of non-SLA features is at Customer's sole risk.

### Minimum Acceptable
> The SLA shall not apply to beta features, free-tier services, or non-production environments. Vendor shall identify which Services are covered by the SLA in the Order Form or documentation.

### Notes
Non-SLA carve-outs are a common vector for eroding SLA value. The critical issues: (1) Scope of exclusions — Vendor-Favorable language excluding APIs, mobile apps, and integrations can gut the SLA for customers who rely heavily on those components. (2) Reclassification risk — the ability to unilaterally reclassify features as "beta" allows vendors to remove SLA coverage from underperforming features. Push for a prohibition on reclassification or at minimum require customer consent. (3) Feature replacement — if a vendor replaces an SLA-covered feature with a new version, the new version should inherit SLA coverage. (4) Professional services — if advisory or implementation services have time-sensitive deliverables, they should have their own service levels in the SOW, not simply be excluded. (5) Documentation clarity — require explicit identification of SLA-covered vs. excluded services in the Order Form, not buried in vendor documentation that can change unilaterally.
