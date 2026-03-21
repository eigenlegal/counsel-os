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
