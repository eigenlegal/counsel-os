---
counsel-os-type: practice
content-version: "2026-06-10"
---
# Service Levels (SLAs) — Position

## Our Position
**Our standard:** 99.9%+ monthly uptime. Service credits of 10% per percentage point below target, capped at 25-30% of monthly fees. Tiered response/resolution times (P1: 1hr/4hr, P2: 4hr/1BD). Chronic failure termination right after 3 misses in 6 months. Planned maintenance limited to 4 hours/month with 48+ hours notice. Credits are non-exclusive remedies.
**We'll accept:** 99.5-99.9% uptime, credits capped at 15-20%, response time SLAs only (no resolution targets), vendor-controlled measurement, or credits as sole remedy, provided some uptime commitment and credit mechanism exist.
**We won't accept:** No uptime SLA or uptime below 99.5%, no service credits, opaque vendor-only measurement with no audit rights, unlimited planned maintenance with no notice, vendor unilaterally modifying SLAs, or no termination rights for persistent failures.
**Auto-escalate:** No uptime commitment; uptime below 99.5% for production systems; no service credits or credits capped below 15%; no chronic failure termination right; opaque measurement without audit rights; unlimited planned maintenance; vendor can unilaterally modify SLAs.

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
