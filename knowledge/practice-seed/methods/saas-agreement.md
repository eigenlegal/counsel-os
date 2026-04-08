---
counsel-os-type: practice
content-version: "2026-04-08"
---
## Saas Agreement

# SaaS Agreement Checklist

## License and Access

### Must-Check (Tier 1)
- License grant scope matches business use case (internal only, affiliate use, client-facing) — mismatch exposes you to breach claims or limits legitimate use
- User metrics clearly defined (named users, concurrent users, seats, transactions) — ambiguous metrics lead to unexpected overage charges
- Affiliate and subsidiary access rights included if needed — absent affiliate rights require separate agreements for each entity
- API access and integration rights specified — critical for workflow integration and data portability
- Acceptable use restrictions reasonable and not overly broad — overbroad AUPs give vendor discretion to suspend for minor issues

### Should-Check (Tier 2)
- Usage limits and overage handling process defined
- Downgrade rights if usage decreases
- Documentation access guaranteed during the Term
- Beta and early access feature terms specified
- Multi-tenancy vs. single-tenancy architecture disclosed

### Nice-to-Check (Tier 3)
- Customization and configuration rights
- Sandbox or test environment access included
- Training and onboarding services included

## Service Levels and Performance

### Must-Check (Tier 1)
- Uptime commitment specified (99.9% or higher for critical services) — "commercially reasonable efforts" is not a measurable commitment
- Downtime definition includes degraded performance, not just total outage — partial outages can be as impactful as total outages
- Service credits meaningful and non-exclusive — credits as "sole and exclusive remedy" with low caps incentivize underperformance
- Chronic failure termination right with refund — ensures exit path if SLAs are consistently missed

### Should-Check (Tier 2)
- Measurement methodology transparent and verifiable
- Scheduled maintenance windows defined with advance notice
- Incident response times by severity level
- Root cause analysis for major incidents
- Disaster recovery objectives (RPO/RTO) specified

### Nice-to-Check (Tier 3)
- Performance benchmarks and baselines established
- Uptime reporting frequency and format
- Escalation contacts and procedures for outages

## Data Protection and Security

### Must-Check (Tier 1)
- Customer data ownership confirmed — without explicit ownership language, vendor may claim derived data rights
- Data processing limited to customer instructions — vendor processing beyond instructions violates privacy law
- AI/ML training restrictions on customer data explicitly stated — absent restriction, vendor may use your data to train models
- Data breach notification within 72 hours — longer timelines may prevent you from meeting your own regulatory obligations
- Data return and deletion upon termination in non-proprietary format — vendor lock-in through proprietary export formats is a critical risk

### Should-Check (Tier 2)
- Data Processing Agreement (DPA) attached or incorporated
- Sub-processor list provided with change notification
- Cross-border data transfer mechanisms in place
- Security certifications specified (SOC 2 Type II, ISO 27001)
- Encryption standards defined (at rest and in transit)
- Audit rights (direct or third-party report)

### Nice-to-Check (Tier 3)
- Data localization commitments (if required)
- Penetration testing results available
- Data classification and handling procedures
- Customer security configuration options

## Pricing and Payment

### Must-Check (Tier 1)
- Pricing model clear and complete (subscription, usage-based, hybrid) — hidden fees for features, users, or storage are common
- Price increase caps and notice requirements for renewals — uncapped increases at renewal create budget unpredictability
- Auto-renewal mechanics and non-renewal notice period — surprise renewals at increased rates are a top vendor complaint
- Refund rights upon termination for cause — ensures financial recovery when vendor breaches

### Should-Check (Tier 2)
- Payment terms and invoicing cadence
- Late payment terms reasonable
- Invoice dispute process and rights
- True-up process for usage-based pricing
- Tax treatment and responsibility

### Nice-to-Check (Tier 3)
- Volume discount or enterprise pricing commitment
- Most-favored-customer pricing clause
- Multi-year discount with flexibility provisions

## Intellectual Property

### Must-Check (Tier 1)
- IP infringement indemnification from vendor with defense obligation — protects against third-party claims arising from vendor's technology
- Cure path with termination and refund backstop — ensures exit if vendor cannot resolve infringement
- No assignment of customer IP to vendor (check feedback clauses) — feedback clauses can inadvertently transfer customer IP

### Should-Check (Tier 2)
- Pre-existing IP retained by each party
- Custom development IP ownership clearly assigned
- Open-source components disclosed
- License to vendor IP embedded in deliverables (if applicable)

### Nice-to-Check (Tier 3)
- Source code escrow for critical applications
- Technology roadmap commitments

## Liability and Risk Allocation

### Must-Check (Tier 1)
- Liability cap proportionate to contract value (12-month fees minimum) — caps below 12-month fees are insufficient for enterprise SaaS
- Consequential damages carve-outs for data breach and IP infringement — blanket exclusion with no carve-outs leaves customer unprotected for highest-risk scenarios
- Super-cap or uncapped liability for excluded claims — general cap should not apply to data breach, IP, and willful misconduct

### Should-Check (Tier 2)
- Mutual liability cap (not asymmetric)
- Insurance requirements specified
- Force majeure clause mutual and reasonable
- Warranty of material conformity to documentation

### Nice-to-Check (Tier 3)
- Dollar-floor on liability cap
- Fee-shifting for prevailing party

## Termination and Transition

### Must-Check (Tier 1)
- Termination for cause with reasonable cure period — ensures you can exit for vendor non-performance
- Data export period of at least 30 days in standard format — insufficient time or proprietary format creates vendor lock-in
- Transition assistance available upon termination — critical for business continuity during migration

### Should-Check (Tier 2)
- Termination for convenience with reasonable notice
- Termination for chronic SLA failure
- Change of control termination right
- Post-termination data deletion with certification
- Survival of key provisions (confidentiality, liability, IP)

### Nice-to-Check (Tier 3)
- Transition period with continued access
- Transition assistance fee structure
- Wind-down plan template or requirements
