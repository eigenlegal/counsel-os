# Service Levels (SLAs)

## Market Standard

**Typical position:** Vendor commits to 99.9% uptime for production environments, measured monthly. Planned maintenance excluded with advance notice (48-72 hours). Service credits issued for downtime: 5-10% of monthly fees for each percentage point below the SLA target, capped at 25-30% of monthly fees. Response time SLAs tiered by severity (Critical: 1 hour, High: 4 hours, Medium: 8 hours, Low: 1 business day).

**Acceptable range:** Uptime: 99.5%-99.99% depending on criticality. Measurement period: monthly or quarterly. Service credits: 5-25% per percentage point, capped at 15-100% of monthly fees. Critical issue response: 15 minutes to 2 hours. Exclusions for customer-caused issues, third-party dependencies, and force majeure. Chronic failure termination right after 2-3 consecutive months or 3 out of 6 months below SLA.

**Escalate if:**
- No uptime commitment or SLA of any kind
- Uptime below 99.5% for production/critical systems
- No service credits or other remedies for SLA failures
- Service credits capped below 15% of monthly fees
- No escalation path or chronic failure termination right
- Measurement methodology is opaque or vendor-controlled without customer audit rights
- Planned maintenance is unlimited or excluded from SLA without reasonable constraints
- Response time SLAs have no resolution time commitments
- Vendor can unilaterally modify SLAs

## Key Considerations

- Distinguish between uptime/availability SLAs and performance/response time SLAs
- Measurement methodology should be transparent and auditable — ideally using independent monitoring
- Service credits are the sole and exclusive remedy vs. in addition to other rights — prefer non-exclusive
- "Uptime" definition should be clearly specified (what constitutes "available" vs. "degraded" vs. "unavailable")
- Consider regional/geographic availability if services span multiple locations
- API-specific SLAs may be needed for integration-dependent relationships
- SLAs should cover disaster recovery objectives (RPO and RTO)
- Root cause analysis and corrective action reports should be required for major incidents
- Chronic failure provisions protect against persistent underperformance

## Related Law

- knowledge/law/data-privacy/overview.md (availability requirements for data processing)

## Classification Guide

**GREEN:** 99.9%+ uptime commitment; meaningful service credits (10%+ per point, capped at 25-30%); tiered response times with resolution targets; transparent measurement; chronic failure termination right; planned maintenance limited and with 48+ hours' notice; root cause analysis for major incidents; non-exclusive remedies.

**YELLOW:** 99.5-99.9% uptime; service credits capped at 15-20%; response time SLAs only (no resolution); vendor-controlled measurement; no chronic failure provision; planned maintenance with 24 hours' notice; credits as sole and exclusive remedy.

**RED:** No uptime SLA; uptime below 99.5%; no service credits; no response time commitments; opaque measurement methodology; unlimited planned maintenance windows; vendor can unilaterally modify SLAs; no escalation or termination rights for persistent failures; credits capped below 10%.
