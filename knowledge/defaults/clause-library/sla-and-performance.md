# SLA & Performance — Clause Library

## Uptime Commitment

### Standard Language
> Vendor shall make the Services available with an uptime of at least 99.9% during each calendar month, measured as the total number of minutes in the month minus the number of minutes of Downtime, divided by the total number of minutes in the month. "Downtime" means any period during which the Services are unavailable or materially degraded, excluding Scheduled Maintenance, force majeure events, and outages caused by Customer's systems or actions.

### Aggressive Language
> Vendor shall make the Services available with an uptime of at least 99.95% during each calendar month, measured continuously using Customer-accessible monitoring tools or an independent third-party monitoring service agreed upon by the parties. "Downtime" means any period during which the Services are unavailable, materially degraded (response times exceeding 2x the documented baseline), or any critical functionality is impaired, regardless of cause, except for: (a) Scheduled Maintenance conducted within the permitted maintenance windows; and (b) outages directly caused by Customer's modification of the Services in a manner not authorized by Vendor. For the avoidance of doubt, outages caused by Vendor's infrastructure providers, third-party dependencies integrated by Vendor, or security incidents shall count as Downtime.

### Minimum Acceptable
> Vendor shall use commercially reasonable efforts to make the Services available at least 99.5% of the time during each calendar month, excluding scheduled maintenance periods.

### Notes
The 99.9% uptime standard allows approximately 43 minutes of downtime per month. 99.95% allows approximately 22 minutes. 99.5% allows approximately 3.6 hours. The Aggressive version ensures that vendor infrastructure failures and third-party dependency outages count as downtime. The Minimum Acceptable uses "commercially reasonable efforts" language rather than a firm commitment, which weakens enforceability.

## Service Credits

### Standard Language
> If Vendor fails to meet the uptime commitment in any calendar month, Customer shall be entitled to a service credit calculated as follows:
>
> | Monthly Uptime | Service Credit (% of Monthly Fees) |
> |---|---|
> | 99.0% - 99.89% | 10% |
> | 95.0% - 98.99% | 20% |
> | Below 95.0% | 30% |
>
> Service credits shall be applied against Customer's next invoice. Service credits shall not exceed 30% of the monthly fees for the affected Services in any given month. To receive a service credit, Customer must submit a request within thirty (30) days after the end of the affected month. Service credits are Customer's sole and exclusive remedy for Vendor's failure to meet the uptime commitment.

### Aggressive Language
> If Vendor fails to meet the uptime commitment in any calendar month, Customer shall receive a service credit automatically (without the need to submit a request) calculated as follows:
>
> | Monthly Uptime | Service Credit (% of Monthly Fees) |
> |---|---|
> | 99.5% - 99.89% | 10% |
> | 99.0% - 99.49% | 25% |
> | 95.0% - 98.99% | 50% |
> | Below 95.0% | 100% |
>
> Service credits shall be applied against Customer's next invoice or, at Customer's election, refunded in cash. Service credits are in addition to, and not in lieu of, any other rights or remedies available to Customer under this Agreement or at law, including the right to terminate for chronic SLA failure under Section [X]. Vendor shall provide Customer with a monthly uptime report within five (5) business days after the end of each calendar month.

### Minimum Acceptable
> If Vendor fails to meet the uptime commitment, Customer may request a service credit of 5% of the monthly fees for each percentage point below the uptime target, not to exceed 15% of the monthly fees for the affected month. Service credits are Customer's sole and exclusive remedy for downtime.

### Notes
Service credits as "sole and exclusive remedy" is vendor-favorable and should be resisted when possible. The Aggressive version makes credits non-exclusive and automatic (no request required). The credit percentages should be meaningful enough to incentivize vendor performance. The Minimum Acceptable has very low credits (capped at 15%) which may not provide sufficient incentive.

## Scheduled Maintenance

### Standard Language
> Vendor may perform scheduled maintenance on the Services during the following maintenance windows: [Day/Time, e.g., Sundays 2:00 AM - 6:00 AM ET]. Vendor shall provide Customer with at least seventy-two (72) hours' prior written notice of any scheduled maintenance. Scheduled maintenance performed during the designated windows and with proper notice shall not count as Downtime. Emergency maintenance necessary to protect the security or integrity of the Services may be performed at any time with as much advance notice as is practicable.

### Aggressive Language
> Vendor may perform scheduled maintenance on the Services only during the following maintenance windows: [Day/Time], not to exceed four (4) hours per month in aggregate. Vendor shall provide Customer with at least five (5) business days' prior written notice of any scheduled maintenance, including a description of the maintenance activities and expected impact. Scheduled maintenance that exceeds the permitted windows or is performed without adequate notice shall count as Downtime. Emergency maintenance may be performed outside the designated windows only if necessary to address an imminent security threat or prevent data loss, and Vendor shall provide notice as soon as practicable and a post-maintenance report within twenty-four (24) hours.

### Minimum Acceptable
> Vendor may perform scheduled maintenance with at least forty-eight (48) hours' prior notice. Scheduled maintenance shall not count as Downtime.

### Notes
Maintenance windows should align with the customer's low-usage periods. The Aggressive version caps total maintenance hours per month and requires post-maintenance reporting. Ensure that the definition of "Scheduled Maintenance" does not become a loophole for avoiding downtime accountability.

## Incident Response and Severity Classification

### Standard Language
> Vendor shall respond to and resolve incidents affecting the Services in accordance with the following severity classifications:
>
> | Severity | Definition | Response Time | Update Frequency |
> |---|---|---|---|
> | Critical (S1) | Services unavailable; no workaround | 1 hour | Every 2 hours |
> | High (S2) | Major functionality impaired; workaround available | 4 hours | Every 4 hours |
> | Medium (S3) | Minor functionality impaired; workaround available | 8 business hours | Daily |
> | Low (S4) | Cosmetic issue or enhancement request | 2 business days | Weekly |
>
> Vendor shall provide a root cause analysis report for all Critical and High severity incidents within five (5) business days of resolution, including the root cause, corrective actions taken, and preventive measures implemented.

### Aggressive Language
> Vendor shall classify, respond to, and resolve incidents affecting the Services as follows:
>
> | Severity | Definition | Response Time | Resolution Target | Update Frequency |
> |---|---|---|---|---|
> | Critical (S1) | Services unavailable or data at risk | 30 minutes | 4 hours | Every 1 hour |
> | High (S2) | Major functionality impaired | 2 hours | 8 hours | Every 2 hours |
> | Medium (S3) | Minor functionality impaired | 4 business hours | 2 business days | Every 8 hours |
> | Low (S4) | Cosmetic or minor issue | 1 business day | 5 business days | Upon resolution |
>
> Customer may escalate the severity classification of any incident by written notice if Customer reasonably determines the impact warrants a higher classification. Vendor shall provide a root cause analysis for all S1 and S2 incidents within three (3) business days, and a corrective action plan within ten (10) business days. Vendor shall conduct quarterly incident trend reviews with Customer.

### Minimum Acceptable
> Vendor shall respond to critical incidents within four (4) hours and provide updates until resolution. Vendor shall respond to non-critical incidents within one (1) business day.

### Notes
Response time is when Vendor acknowledges the incident and begins work. Resolution target is when the issue is fixed. The Aggressive version includes resolution targets (not just response times), customer escalation rights, and quarterly trend reviews. The Standard version omits resolution targets, which is common but less protective. Ensure severity definitions are clear enough to avoid disputes about classification.

## Chronic Failure

### Standard Language
> If Vendor fails to meet the uptime commitment for three (3) consecutive months or four (4) out of any six (6) consecutive months, Customer may terminate the affected Services upon thirty (30) days' written notice, and Vendor shall refund all prepaid fees for the unused portion of the then-current Term.

### Aggressive Language
> If Vendor fails to meet the uptime commitment for two (2) consecutive months or three (3) out of any six (6) consecutive months, Customer may: (a) terminate the affected Services immediately upon written notice; (b) receive a full refund of all prepaid fees for the unused portion of the then-current Term; and (c) receive transition assistance from Vendor for up to ninety (90) days at no additional charge to facilitate migration to an alternative service provider. Chronic failure shall constitute a material breach of this Agreement for which service credits are not an adequate remedy.

### Minimum Acceptable
> If Vendor repeatedly fails to meet the uptime commitment over a sustained period, Customer may terminate the affected Services and receive a pro-rata refund of prepaid fees.

### Notes
Chronic failure provisions are essential to avoid being locked into an underperforming service with only service credits as a remedy. The Aggressive version includes transition assistance and characterizes chronic failure as a material breach, opening additional remedies. The Minimum Acceptable is vague ("sustained period") and may be difficult to enforce — prefer specific thresholds.
