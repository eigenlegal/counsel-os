---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Legal Memo Playbook

## When to Use
Use this playbook when a business stakeholder or executive requests legal analysis on a specific question, risk, or proposed course of action. Legal memos document the analysis and recommendation for the record and may be subject to attorney-client privilege.

## Prerequisites
- Clear articulation of the question or issue to be analyzed
- Identification of the requesting party and audience (business leader, board, executive team)
- Understanding of the business context and urgency
- Relevant facts gathered from stakeholders
- Applicable law identified from `knowledge/law/`
- Privilege considerations assessed (mark as privileged and confidential if appropriate)

## Process

### Step 1: Define the Question
Articulate the precise legal question(s) to be answered:
- Restate the business question as a legal question. The business asks "Can we do X?" — the legal question is "Under [jurisdiction] law, does X comply with [statute/regulation], and what are the risks if it does not?"
- Identify the relevant jurisdiction(s)
- Confirm scope: narrow question (single issue, clear law) vs. comprehensive analysis (multiple issues, ambiguous law)
- Confirm timeline: when does the business need the answer?
- Check whether this is a recurring issue — search the entity file (via QMD discovery) for prior analysis on the same or similar topic

**Decision — Memo Type:**
- **Quick-Turn Advice:** Single question, clear answer, low complexity. Skip formal memo format; deliver as a structured email. Target: 2-4 hours.
- **Standard Memo:** Moderate complexity, multiple considerations. Full IRAC format. Target: 1-2 days.
- **Comprehensive Analysis:** Novel issue, multiple jurisdictions, significant business impact. Deep research required. Target: 3-7 days. Consider engaging outside counsel for specialized expertise.

### Step 2: Gather Facts
Collect and document all relevant facts using the IRAC framework's fact-gathering discipline:
- Interview the business stakeholder. Ask: "What exactly are you trying to do? What constraints are you operating under? What is the timeline?"
- Review relevant contracts, correspondence, and internal documents
- Identify factual assumptions that the analysis will rely on — list these explicitly so the reader knows the analysis depends on them
- Note facts that are uncertain or disputed — flag how the analysis would change if these facts differ
- Document the source of each material fact (interview, document, public record)

### Step 3: Research Applicable Law
Conduct legal research following this source hierarchy:

**Research Source Hierarchy (highest authority to lowest):**
1. **Binding authority:** Statutes, regulations, and case law in the governing jurisdiction
2. **Counsel OS law files:** `knowledge/law/` area files (synthesized legal frameworks)
3. **Regulatory guidance:** Agency interpretations, no-action letters, advisory opinions, FAQ documents
4. **Persuasive authority:** Case law from other jurisdictions, Restatements, treatises
5. **Internal precedent:** Prior memos in the entity file (via QMD discovery), established internal positions in `knowledge/practice/positions.md`
6. **Secondary sources:** Law review articles, practice guides, CLE materials
7. **Industry practice:** Market surveys, peer company approaches, industry association guidance

For each key legal principle, note:
- The jurisdiction and source
- Whether the authority is binding or persuasive
- The date (to assess currency)
- Any pending legislation or regulatory changes that could alter the analysis

Load the relevant `knowledge/law/` sub-files based on the subject matter. Use the trigger conditions in each area's `_overview.md` to determine which specific sub-files to load.

### Step 4: Analyze — Apply IRAC Structure
Apply the law to the facts using the IRAC (Issue, Rule, Application, Conclusion) framework for each question:

**I — Issue:** State the specific legal issue. Frame it as a question. ("Whether the Company's proposed data sharing arrangement constitutes a 'sale' under CCPA.")

**R — Rule:** State the applicable legal rule(s). Cite the source. Identify any split of authority or ambiguity. ("Under Cal. Civ. Code Section 1798.140(ad), a 'sale' means...")

**A — Application:** Apply the rule to the specific facts. This is the core of the analysis.
- Consider multiple interpretations and explain why one is stronger
- Address counterarguments explicitly: "A counterparty or regulator might argue that... However, this argument is [weak/moderate/strong] because..."
- Distinguish unfavorable precedent rather than ignoring it
- Quantify risk where possible using a consistent scale:
  - **Remote** (<10% likelihood of adverse outcome)
  - **Low** (10-25%)
  - **Moderate** (25-50%)
  - **Substantial** (50-75%)
  - **High** (>75%)

**C — Conclusion:** State the conclusion clearly. Do not hedge without reason. If the answer is uncertain, say so directly and quantify the uncertainty.

**Decision — Depth of Analysis:**
- If the law is clear and the facts are straightforward: brief application (1-2 paragraphs per issue)
- If there is ambiguity or split authority: extended analysis with arguments for and against each interpretation
- If the issue is novel or high-stakes: full analysis with analogy to related areas, policy considerations, and multiple scenarios

### Step 5: Formulate Recommendation
Develop a clear, actionable recommendation:
- State the conclusion directly at the top — do not bury the lead
- Quantify risk: likelihood (Remote/Low/Moderate/Substantial/High) and severity (financial, operational, reputational)
- Propose concrete next steps with specific actions
- Identify risk mitigation measures that can reduce exposure without abandoning the business objective
- Flag any areas requiring further analysis, expert consultation, or factual development
- Present alternatives if the primary recommendation is not feasible (Option A: lowest risk; Option B: moderate risk with mitigation; Option C: highest risk)

### Step 6: Draft the Memo
Write the memo following the IRAC-based output format below.

**Key drafting principles:**
- Lead with the conclusion — busy executives read the top first
- Use plain language — avoid unnecessary legal jargon. If a legal term is necessary, define it.
- Be precise about certainty levels ("likely," "probably," "unclear," "remote risk")
- Separate legal analysis from business judgment. The memo provides legal risk assessment; the business decides risk tolerance.
- Include relevant caveats and limitations (factual assumptions, jurisdiction limitations, areas not analyzed)
- Mark as "PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION" if appropriate
- Keep the memo to the minimum length needed for thoroughness. Simple memos: 1-2 pages. Standard: 3-6. Complex: 8-15.

### Step 7: Review and Deliver
- Self-review: check for logical gaps, unsupported conclusions, internal consistency, and typos
- Peer review: required for Standard and Complex memos
- Senior counsel review: required for Complex memos or those with board-level visibility
- Deliver to the requesting party with an offer to discuss. Verbal walk-through is recommended for Complex memos.
- File in the legal department's knowledge management system
- Calendar any follow-up actions or deadlines identified in the memo
- Consider logging the key decision in the entity file (via QMD discovery) for future reference

## Output Format
```
PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION

LEGAL MEMORANDUM

TO:      [Requesting party]
FROM:    [Legal team]
DATE:    [Date]
RE:      [Subject — concise description]

1. EXECUTIVE SUMMARY
   [2-3 sentence summary: question, conclusion, key risk level]

2. QUESTION PRESENTED
   [Precise legal question(s) framed in IRAC "Issue" format]

3. SHORT ANSWER
   [Direct answer in 1-2 paragraphs with risk quantification]

4. FACTS
   [Relevant facts, sources, and assumptions the analysis relies on]

5. ANALYSIS
   [IRAC-structured analysis for each question:
    Issue → Rule (with citations) → Application → Conclusion]

6. CONCLUSION & RECOMMENDATION
   [Actionable recommendation with risk level, alternatives, and mitigation]

7. NEXT STEPS
   [Concrete actions with owners, deadlines, and decision points]
```

## Calibration
- **Simple (Quick-Turn):** Narrow question, clear law, established internal position. Deliver as structured email. Target: 1-2 pages, 2-4 hours.
- **Standard:** Moderate complexity, multiple considerations, some ambiguity. Full IRAC memo. Target: 3-6 pages, 1-2 days.
- **Complex:** Novel issue, multiple jurisdictions, significant business impact, board-level visibility. Deep IRAC analysis with multiple scenarios. Target: 8-15 pages, 3-7 days. Consider engaging outside counsel.
