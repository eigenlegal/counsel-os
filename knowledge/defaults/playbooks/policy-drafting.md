---
counsel-os-type: playbook
content-version: "2026-04-08"
---
# Policy Drafting Playbook

## When to Use
Use this playbook when creating or substantially revising an internal company policy. This includes compliance policies, operational policies, HR policies, information security policies, and any formalized standard operating procedures that require legal review and approval.

## Prerequisites
- Clear understanding of the policy objective and the problem it addresses
- Identification of the policy sponsor (executive owner)
- Relevant legal and regulatory requirements identified from `knowledge/law/`
- Existing related policies reviewed for consistency and overlap
- Input gathered from key stakeholders (HR, IT, Compliance, Operations, etc.)
- Benchmark examples from peer companies or industry standards (if available)

## Process

### Step 1: Define the Policy Objective
Before drafting, clearly establish:
- **Problem Statement:** What gap, risk, or regulatory requirement does this policy address?
- **Scope:** Who does this policy apply to (employees, contractors, subsidiaries, affiliates, third parties)?
- **Jurisdiction:** Where does this policy apply (global, US-only, specific regions)?
- **Authority:** What legal or regulatory authority mandates this policy (if any)?
- **Related Policies:** What existing policies intersect, and how does this policy fit into the policy hierarchy?

**Decision — Policy vs. Other Document:**
- **Policy:** Establishes mandatory rules and standards. Requires executive approval. Has enforcement consequences.
- **Standard/Guideline:** Provides recommended approaches. Does not require executive approval. No enforcement consequences.
- **Procedure:** Step-by-step operational instructions implementing a policy. May be updated by the process owner without executive approval.
- If the content is purely operational and does not create enforceable obligations, draft a procedure or guideline instead of a policy.

### Step 2: Research Requirements
Gather all requirements that must be reflected in the policy:

**Legal and regulatory requirements** — Load relevant `knowledge/law/` areas:
| Policy Type | Law Areas to Load |
|---|---|
| Data privacy / data handling | `law/data-privacy/`, `law/cybersecurity/` |
| Information security | `law/cybersecurity/`, `law/data-privacy/` |
| Anti-corruption / ethics | `law/white-collar-investigations/` |
| Employment / HR policies | `law/employment/`, `law/labor-relations/` |
| Financial controls | `law/financial-services/`, `law/securities/` |
| AI / acceptable use | `law/ai-and-automation/` |
| Insider trading | `law/securities/` |
| Environmental / sustainability | `law/environmental-esg/` |
| Whistleblower / reporting | `law/employment/`, `law/securities/` |

**Additional requirements:**
- Industry standards and best practices (ISO 27001, NIST CSF, SOC 2, HIPAA, PCI-DSS)
- Contractual obligations to customers or partners (review key contracts for policy commitments)
- Board directives or management mandates
- Insurance requirements (some policies are required to maintain coverage)
- Prior audit findings or remediation commitments
- Peer company benchmarks

### Step 3: Outline the Policy Structure
Use a consistent policy template. Every policy should contain these sections:
1. **Title and Version** (e.g., "Data Privacy Policy v2.0")
2. **Effective Date** and **Last Reviewed Date**
3. **Policy Owner** (executive sponsor by name and title)
4. **Purpose** (why the policy exists — 2-3 sentences)
5. **Scope** (who and what it covers — be specific about inclusions and exclusions)
6. **Definitions** (key terms used in the policy)
7. **Policy Statement** (the core requirements — the heart of the policy)
8. **Roles and Responsibilities** (who does what — use a RACI matrix for complex policies)
9. **Procedures** (how to comply — step-by-step or reference a separate procedure document)
10. **Exceptions** (how to request an exception — who approves, what documentation is required, how long exceptions last)
11. **Enforcement and Consequences** (what happens if violated — range from warning to termination)
12. **Related Policies and References** (cross-references to other policies, standards, and regulations)
13. **Revision History** (date, version, author, description of changes)

### Step 4: Draft the Policy
Drafting best practices:
- Use clear, direct language accessible to the target audience. Read level should be appropriate for the broadest audience in scope.
- Avoid legalese — policies should be understandable by non-lawyers
- Use modal verbs consistently: "must" for mandatory requirements, "should" for strong recommendations, "may" for optional actions. Never use "shall" (ambiguous in a policy context).
- Be specific about obligations — vague policies are unenforceable and create confusion. Bad: "Employees should handle data carefully." Good: "Employees must encrypt all files containing personal data before transmitting via email."
- Include practical examples where they aid understanding, especially for ambiguous concepts
- Define all technical or legal terms in the definitions section
- Ensure consistency with existing policies and the employee handbook. If this policy conflicts with an existing policy, resolve the conflict before publishing.
- Consider translation requirements for global policies
- For each mandatory requirement, ensure there is a corresponding procedure explaining how to comply

### Step 5: Stakeholder Review
Circulate the draft for input using the stakeholder approval matrix:

| Stakeholder | Review Type | Required For |
|---|---|---|
| Legal | Regulatory compliance, legal accuracy | All policies |
| HR | Employment law, handbook consistency | Any policy affecting employees |
| IT / Security | Technical feasibility, system requirements | Policies with technical controls |
| Business unit leads | Operational practicality, workflow impact | Policies affecting their teams |
| Compliance | Alignment with compliance program | Compliance-related policies |
| Privacy / DPO | Personal data processing, DPIA | Policies involving personal data |
| Finance | Budget impact, financial controls | Policies with cost implications |
| Executive sponsor | Strategic alignment, final authority | All policies |

**Review Process:**
1. Distribute the draft with a review deadline (5-10 business days depending on complexity)
2. Collect written feedback from each stakeholder
3. Hold a consolidation meeting if feedback conflicts across stakeholders
4. Resolve conflicting input — the executive sponsor makes final calls on business judgment; legal makes final calls on legal compliance
5. Produce a final draft incorporating approved feedback
6. Circulate the final draft for sign-off (not further substantive review)

### Step 6: Approval and Adoption
Formalize the policy:
- Obtain executive sponsor sign-off (written approval)
- Obtain legal sign-off (written approval)
- If required, obtain board or committee approval (document in minutes/consent)

**Decision — Approval Level:**
- **Board approval required:** policies mandated by regulation that the board must oversee (insider trading, code of conduct, anti-corruption, whistleblower)
- **Executive committee approval:** company-wide policies with material operational impact (information security, acceptable use, remote work)
- **Department head approval:** department-specific policies or procedures

Post-approval:
- Assign a version number and effective date (allow at least 30 days between publication and enforcement for new policies)
- Publish in the policy repository / intranet
- Communicate to all affected individuals via email, town hall, or manager cascade
- Conduct training sessions if the policy introduces new obligations
- Obtain acknowledgment of receipt from affected personnel (electronic acknowledgment through HR system or policy management tool)

### Step 7: Maintenance
Establish a lifecycle management plan:

**Review Cycle Cadence:**
- **Annual review** (minimum): All policies must be reviewed at least once per year, even if no changes are needed. Document the review ("Reviewed [date], no changes required").
- **Triggered review:** Immediately upon: (1) regulatory change affecting the policy, (2) audit finding, (3) material incident, (4) organizational change (M&A, new product line, new jurisdiction)
- **Sunset review:** If a policy has not been triggered or updated in 3 years, assess whether it is still needed.

Ongoing maintenance:
- Monitor for regulatory changes that require policy updates — set alerts for relevant regulatory bodies
- Track exception requests: if the same exception is granted 3+ times, consider updating the policy to reflect the actual practice
- Track policy violation trends: if a provision is routinely violated, assess whether the requirement is impractical (update the policy) or whether training/enforcement is inadequate
- Maintain a complete revision history in the document
- When updating, issue a change notice explaining what changed and why

## Output Format
1. **Policy Document:** Formatted per the template in Step 3
2. **Regulatory Mapping:** Matrix showing which legal/regulatory requirements the policy addresses
3. **Stakeholder Sign-Off Record:** Approvals obtained with dates
4. **Communication Plan:** How the policy will be rolled out, to whom, and by what date
5. **Training Materials:** If required, key points and FAQs for training
6. **Acknowledgment Form:** Template for personnel to acknowledge receipt and understanding

## Calibration
- **Simple:** Minor policy update or low-complexity operational policy. Target: 1-2 weeks from draft to adoption.
- **Standard:** New policy in a moderately regulated area (information security, acceptable use, travel). Target: 3-6 weeks.
- **Complex:** Highly regulated area (anti-corruption, whistleblower, data privacy, insider trading), global scope, board approval required. Target: 2-3 months. Consider engaging outside counsel for regulatory review.
