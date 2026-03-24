---
counsel-os-type: default-positions
counsel-os-version: "0.3.1"
---

## Force Majeure

# Force Majeure — Position

## Market Standard
Neither party is liable for failure to perform obligations (other than payment obligations) due to events beyond its reasonable control. Standard qualifying events: natural disasters, war, terrorism, civil unrest, government orders, pandemics/epidemics, embargoes, widespread infrastructure failures. Affected party must provide notice within 5 business days and use commercially reasonable efforts to mitigate. Either party may terminate if the force majeure event continues for 60-90 days.

## Classification Guide
- **GREEN**: Mutual force majeure clause; standard list of qualifying events including pandemics; payment obligations explicitly excluded; notice required within 5 business days of the triggering event; commercially reasonable mitigation obligation; partial performance required to extent possible; either party may terminate after 60-90 days of continuous force majeure; obligations resume upon cessation of the event.
- **YELLOW**: Overly broad event list (20+ categories); no explicit pandemic inclusion or exclusion; termination trigger over 90 days (91-120 days); no explicit mitigation obligation; cyber-attacks included without carve-out for inadequate security; one-sided but with reasonable scope; no partial performance requirement; notice within 15 days.
- **RED**: One-sided force majeure (vendor only); excuses payment obligations; includes events within the party's control (financial difficulties, staffing shortages, market changes, currency fluctuations); no termination right regardless of duration; no notice or mitigation requirements; excludes pandemics entirely; includes economic hardship or "commercial impracticability."

## Escalate If
- Force majeure excuses payment obligations.
- No termination right after extended force majeure.
- Events within the party's control are included (financial difficulties, staffing issues).
- No mitigation obligation.
- No notice requirement for invoking force majeure.
- Force majeure is entirely one-sided (only benefits vendor).
- Pandemic exclusion in a post-COVID agreement.
- Economic hardship or market conditions included as qualifying events.

## Practical Guidance
- Post-COVID, force majeure clauses receive much greater scrutiny. Parties now negotiate these actively rather than treating them as boilerplate.
- Pandemics should remain a qualifying event, but "known pandemic" carve-outs are reasonable for new agreements — meaning the current COVID situation does not excuse performance, but a new pandemic does.
- Cyber-attacks as force majeure are debatable. A party that failed to implement reasonable security measures (no MFA, unpatched systems) should not benefit from force majeure for a cyber-attack. Include a carve-out: "cyber-attack, provided the affected party maintained commercially reasonable security measures."
- For SaaS/cloud vendors, their business continuity and disaster recovery capabilities should reduce reliance on force majeure. A well-architected cloud service should survive regional outages through redundancy.
- Supply chain disruptions present a gray area. Whether they qualify depends on foreseeability and the specific clause language. Pin down whether the clause requires "impossibility" or merely "impracticability."
- Government regulatory changes should be distinguished from force majeure events. A new regulation that makes performance more expensive is not the same as a government order that makes performance illegal.

## Key Negotiation Points
1. **Qualifying events** — standard list (natural disaster, war, pandemic, government order); reject financial difficulty, staffing, and market conditions.
2. **Payment exclusion** — payment obligations are never excused by force majeure; this is a bright line.
3. **Termination trigger** — 60-90 days of continuous force majeure; resist anything over 120 days.
4. **Mitigation obligation** — commercially reasonable efforts to mitigate and resume performance, including invoking DR/BC plans.
5. **Cyber-attack carve-out** — only qualifies if the affected party maintained commercially reasonable security measures.

## Common Traps
- **"Including but not limited to"** — an open-ended qualifier that allows a party to claim virtually any event as force majeure.
- **"Inability to obtain materials or supplies"** — this is a supply chain issue that the vendor should manage through alternative sourcing, not a true force majeure.
- **No expiration** — force majeure that suspends obligations indefinitely without a termination trigger locks you into a non-performing contract forever.
- **"Force majeure includes changes in law or regulation"** — if a new regulation makes the vendor's compliance more expensive, that is a business cost, not force majeure.
- **"The affected party's obligations are excused for the duration of the event"** — "excused" is stronger than "suspended." Excused obligations may not resume when the event ends.
