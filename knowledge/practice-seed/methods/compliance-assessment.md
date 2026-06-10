---
counsel-os-type: practice
content-version: "2026-06-10"
---
# Compliance Assessment

Relevant when evaluating whether a product, service, process, or business initiative complies with applicable laws, regulations, and internal policies. Common triggers include new product launches, entry into new markets, regulatory changes, and periodic compliance reviews.

## Regulatory Mapping — Decision Tree by Subject Characteristic

| Subject Characteristic | Law Areas to Load |
|---|---|
| Collects or processes personal data | `law/data-privacy/` (always), `law/cybersecurity/` |
| Consumer-facing product or service | `law/consumer-protection/`, `law/advertising-media/` |
| Handles financial transactions or payments | `law/financial-services/` |
| Healthcare data or services | `law/healthcare/` |
| Employee-related processes | `law/employment/`, `law/labor-relations/` |
| Uses AI/ML or automated decision-making | `law/ai-and-automation/` |
| International operations or customers | `law/international-trade/`, `law/data-privacy/` (cross-border) |
| Government contracts or public sector | `law/government-contracts/` |
| Securities issuance or equity matters | `law/securities/` |
| Environmental impact or ESG reporting | `law/environmental-esg/` |
| Franchise or distribution model | `law/franchise/` |
| IP-intensive product or technology | `law/ip-and-technology/` |

## Decision Tree by Industry

- **SaaS / Technology:** `law/data-privacy/`, `law/cybersecurity/`, `law/ip-and-technology/`, `law/ai-and-automation/` (if applicable)
- **Financial Services / Fintech:** `law/financial-services/`, `law/data-privacy/`, `law/consumer-protection/`, `law/securities/`
- **Healthcare / Life Sciences:** `law/healthcare/`, `law/data-privacy/`, `law/product-counseling/`
- **E-commerce / Retail:** `law/consumer-protection/`, `law/data-privacy/`, `law/advertising-media/`, `law/international-trade/`
- **Manufacturing:** `law/environmental-esg/`, `law/employment/`, `law/product-counseling/`, `law/international-trade/`

For each identified law area, load the `_overview.md` file and then load specific sub-files based on the sub-topic triggers described in each overview.

## Gap Severity Classification

| Severity | Definition | Examples | Remediation Timeline |
|---|---|---|---|
| **Critical** | Immediate legal exposure; active enforcement risk; must remediate before launch/continuation | Processing personal data without legal basis, operating without a required license | Immediate |
| **High** | Significant non-compliance; material regulatory risk | Privacy policy does not disclose data sharing, missing required contractual provisions | Within 30 days |
| **Medium** | Partial compliance; sub-optimal but not actively violative | Training not current, documentation gaps, sub-optimal controls | Within 90 days |
| **Low** | Best practice gaps; no current legal exposure | No formal policy for an internally followed practice, minor process improvements | Within 6 months |

## Stop-Ship Assessment Framework

- If any **Critical** gap is identified for a new product/launch: recommend hold on launch until remediated. Provide estimated remediation timeline and interim risk mitigation options.
- If only **High** gaps: launch may proceed with a documented remediation plan and executive risk acceptance sign-off.
- If only **Medium/Low** gaps: proceed with standard monitoring and time-bound remediation.

## Risk Tolerance Decision Matrix

| Aggregate Risk Level | Action Required |
|---|---|
| **High/Critical** | Escalate to executive leadership and general counsel with a written risk assessment. Recommend remediation before proceeding. |
| **Medium** | Proceed with documented risk acceptance from the business owner and a time-bound remediation plan. |
| **Low** | Proceed with standard monitoring. |

**Risk assessment factors:**
- Regulatory enforcement environment — is the relevant regulator actively enforcing?
- Likelihood of regulatory inquiry or audit in the next 12 months
- Potential penalties: fines (calculate statutory ranges), sanctions, license revocation, injunctive relief
- Reputational risk and customer impact
- Benchmark against industry peers where possible (use public enforcement actions as reference)

## Monitoring Cadence by Risk Level

| Risk Level | Monitoring Cadence |
|---|---|
| Critical/High risk areas | Monthly monitoring until remediated, then quarterly |
| Medium risk areas | Quarterly monitoring |
| Low risk areas | Semi-annual or annual check |

Additional monitoring guidance:
- Integrate compliance requirements into existing business processes and product development workflows
- Set up alerts for regulatory changes affecting the assessment scope (monitor Federal Register, state legislatures, EU regulatory bodies)
- Schedule follow-up assessments to verify remediation completion
