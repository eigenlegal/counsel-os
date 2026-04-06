---
counsel-os-type: playbook
counsel-os-version: "0.3.1"
---

# Compliance Assessment Playbook

## When to Use
Use this playbook when evaluating whether a product, service, process, or business initiative complies with applicable laws, regulations, and internal policies. Common triggers include new product launches, entry into new markets, regulatory changes, and periodic compliance reviews.

## Prerequisites
- Clear description of the product, service, or initiative being assessed
- Identification of applicable jurisdictions
- Relevant regulatory frameworks identified from `knowledge/law/`
- Internal policies and compliance standards gathered
- Stakeholder interviews scheduled or completed
- Prior audit findings or compliance assessments reviewed

## Process

### Step 1: Scope Definition
Define the boundaries of the assessment:
- **Subject:** What product, service, process, or initiative is being assessed?
- **Jurisdictions:** Which countries, states, or regions are in scope?
- **Regulatory Domains:** Which areas of law apply? (Use the decision tree in Step 2 to identify.)
- **Standards:** Which internal policies and external standards apply (SOC 2, ISO 27001, HIPAA, PCI-DSS)?
- **Timeline:** Point-in-time assessment or ongoing monitoring?
- **Materiality:** What is the threshold for flagging an issue (any non-compliance, or only material gaps)?

### Step 2: Regulatory Mapping — Law Area Identification
Scan the subject against trigger conditions to identify which `knowledge/law/` areas to load. Use this decision tree:

**Decision Tree by Subject Type:**

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

**Decision Tree by Industry:**
- **SaaS / Technology:** `law/data-privacy/`, `law/cybersecurity/`, `law/ip-and-technology/`, `law/ai-and-automation/` (if applicable)
- **Financial Services / Fintech:** `law/financial-services/`, `law/data-privacy/`, `law/consumer-protection/`, `law/securities/`
- **Healthcare / Life Sciences:** `law/healthcare/`, `law/data-privacy/`, `law/product-counseling/`
- **E-commerce / Retail:** `law/consumer-protection/`, `law/data-privacy/`, `law/advertising-media/`, `law/international-trade/`
- **Manufacturing:** `law/environmental-esg/`, `law/employment/`, `law/product-counseling/`, `law/international-trade/`

For each identified law area, load the `_overview.md` file and then load specific sub-files based on the sub-topic triggers described in each overview.

Map applicable regulations to the subject:
- Identify all applicable statutes and regulations
- Determine which regulatory bodies have oversight
- Map specific requirements to business functions and processes
- Identify any exemptions or safe harbors that may apply
- Note upcoming regulatory changes that may affect compliance (effective dates within 12 months)
- Cross-reference with `knowledge/law/` for detailed requirements

### Step 3: Gap Analysis
Compare current state against requirements:
- Document current controls, policies, and procedures for each regulatory requirement
- Identify gaps between current state and requirements
- Classify gaps by severity:
  - **Critical:** Immediate legal exposure; active enforcement risk; must remediate before launch/continuation. Examples: processing personal data without legal basis, operating without a required license.
  - **High:** Significant non-compliance; remediation required within 30 days. Examples: privacy policy does not disclose data sharing, missing required contractual provisions.
  - **Medium:** Partial compliance; remediation required within 90 days. Examples: training not current, documentation gaps, sub-optimal but not violative controls.
  - **Low:** Best practice gaps; remediate within 6 months. Examples: no formal policy documented for an internally followed practice, minor process improvements.
- Assess the likelihood and impact of each gap being discovered or exploited

**Decision — Stop-Ship Assessment:**
- If any **Critical** gap is identified for a new product/launch: recommend hold on launch until remediated. Provide estimated remediation timeline and interim risk mitigation options.
- If only **High** gaps: launch may proceed with a documented remediation plan and executive risk acceptance sign-off.

### Step 4: Evidence Collection
Gather evidence of compliance:
- Review documentation (policies, procedures, training records, certifications)
- Examine technical controls (access controls, encryption, logging, data flow diagrams)
- Interview process owners and operators — document interviews with date, attendee, and key findings
- Review third-party certifications and audit reports (SOC 2, ISO 27001, HITRUST, PCI)
- Test controls where possible (sampling, walkthroughs, tabletop exercises)
- Document evidence gathered and any limitations on the assessment

### Step 5: Risk Assessment
Evaluate the overall risk profile:
- Aggregate gap findings into a risk heat map (severity vs. likelihood)
- Consider the regulatory enforcement environment — is the relevant regulator actively enforcing?
- Assess the likelihood of regulatory inquiry or audit in the next 12 months
- Evaluate potential penalties: fines (calculate statutory ranges), sanctions, license revocation, injunctive relief
- Consider reputational risk and customer impact
- Benchmark against industry peers where possible (use public enforcement actions as reference)

**Decision — Risk Tolerance:**
- If aggregate risk is **High/Critical:** escalate to executive leadership and general counsel with a written risk assessment. Recommend remediation before proceeding.
- If aggregate risk is **Medium:** proceed with documented risk acceptance from the business owner and a time-bound remediation plan.
- If aggregate risk is **Low:** proceed with standard monitoring.

### Step 6: Remediation Plan
Develop a prioritized remediation roadmap:
- For each gap, propose specific remediation actions with measurable completion criteria
- Assign ownership (individual name, not department) and deadlines
- Estimate resource requirements (budget, personnel, technology)
- Sequence by priority: Critical gaps first, then High, then Medium, then Low
- Identify quick wins (achievable within 1-2 weeks) vs. long-term structural changes
- Define interim risk mitigation measures for gaps that cannot be immediately resolved
- Establish metrics and milestones for tracking progress

### Step 7: Report and Monitor
Deliver findings and establish ongoing compliance:
- Present findings to stakeholders and leadership with the risk heat map
- Obtain executive sign-off on the remediation plan (including risk acceptance for any gaps not immediately remediated)
- Establish a monitoring cadence based on risk level:
  - **Critical/High risk areas:** Monthly monitoring until remediated, then quarterly
  - **Medium risk areas:** Quarterly monitoring
  - **Low risk areas:** Semi-annual or annual check
- Integrate compliance requirements into existing business processes and product development workflows
- Set up alerts for regulatory changes affecting the assessment scope (monitor Federal Register, state legislatures, EU regulatory bodies)
- Schedule follow-up assessments to verify remediation completion

## Output Format
1. **Executive Summary:** Scope, overall risk rating, critical findings count, and headline recommendation
2. **Regulatory Map:** Matrix of applicable regulations, regulatory bodies, and specific requirements
3. **Gap Analysis:** Detailed findings with severity classifications and evidence references
4. **Risk Assessment:** Heat map and narrative risk analysis with enforcement context
5. **Remediation Plan:** Prioritized actions with owners, deadlines, resources, and success criteria
6. **Appendices:** Evidence inventory, regulatory references, interview summaries, benchmarking data

## Calibration
- **Simple:** Single jurisdiction, established regulatory framework, periodic refresh. Target: 1-2 weeks.
- **Standard:** Multiple jurisdictions or regulatory domains, new product or market. Target: 3-6 weeks.
- **Complex:** Heavily regulated industry, multiple jurisdictions, novel regulatory questions, enforcement action response. Target: 2-3 months. Consider engaging outside counsel or specialized compliance consultants.
