# Source Code Escrow — Position

## Market Standard
Vendor deposits source code, build tools, documentation, and deployment instructions with an independent escrow agent (e.g., Iron Mountain, EscrowTech, NCC Group). Release conditions include vendor bankruptcy or insolvency, material breach that remains uncured for 60 days, and discontinuation of the product. Escrow updated with each major release (at least annually). Customer has a perpetual, royalty-free license to use the released code solely for internal maintenance and operation of the software. Verification testing of escrow deposits at least annually.

## Classification Guide
- **GREEN**: Source code deposited with reputable independent escrow agent; release conditions include bankruptcy/insolvency, material uncured breach (60 days), and product discontinuation; escrow updated within 30 days of each major release and at least annually; annual verification testing confirming completeness and buildability; customer gets perpetual, royalty-free, non-exclusive license for internal maintenance and operation upon release; deposit includes source code, build tools, third-party dependencies, documentation, and deployment instructions; vendor pays escrow fees; escrow survives termination.
- **YELLOW**: Escrow with independent agent but release conditions limited to bankruptcy only; updates only annually (not with each release); no verification testing; license upon release is limited (e.g., 2-year term, not perpetual); deposit includes source code only (no build tools, documentation, or dependencies); customer pays escrow fees; escrow agent chosen by vendor; release requires agreement of all parties (not just triggering of conditions).
- **RED**: No escrow provision; source code held by vendor "in trust" (not with independent agent); release conditions require vendor consent; no update obligation; no verification testing; license upon release is restrictive (read-only, no modification); deposit is stale (initial deposit only, never updated); vendor can terminate escrow at will; release conditions do not include product discontinuation.

## Escalate If
- No source code escrow for mission-critical vendor-retained software.
- Release conditions require vendor consent (defeats the purpose).
- No verification testing to confirm deposit is complete and buildable.
- Deposit not updated with releases (stale code is useless code).
- License upon release is too restrictive for maintenance and operation.
- Escrow does not include build tools, dependencies, and documentation.
- Vendor can terminate the escrow agreement unilaterally.

## Practical Guidance
- Source code escrow is most important when: (a) the vendor retains IP ownership of custom-developed software, (b) the software is mission-critical and cannot be easily replaced, or (c) the vendor is a startup or small company with uncertain financial viability.
- The escrow deposit is only useful if it is complete and buildable. A source code deposit without build tools, compiler instructions, third-party library dependencies, and deployment documentation is effectively useless. Annual verification testing by an independent technical firm is essential.
- Release conditions should be automatic (triggered by events, not requiring vendor agreement). If the vendor must consent to release, they will refuse when the conditions are triggered — which is precisely when you need the code.
- The license upon release should be broad enough for practical use: modify, compile, deploy, and maintain the software for internal business purposes. A "read-only" license is pointless if you need to fix bugs or adapt the software.
- Vendor bankruptcy is the most common release trigger, but product discontinuation is equally important. A vendor may be financially healthy but decide to sunset a product line, leaving you without support.
- Escrow costs are modest ($2K-5K/year for the agent, $5K-15K for annual verification testing). The vendor should bear these costs as part of the engagement. If the vendor resists, it may signal concerns about code quality or organizational stability.

## Key Negotiation Points
1. **Release conditions** — bankruptcy/insolvency, material uncured breach (60 days), and product discontinuation; automatic release without vendor consent.
2. **Deposit completeness** — source code, build tools, third-party dependencies, documentation, and deployment instructions.
3. **Update frequency** — within 30 days of each major release and at least annually; not just the initial deposit.
4. **Verification testing** — annual testing by independent technical firm confirming completeness and buildability; vendor bears cost.
5. **License scope** — perpetual, royalty-free, non-exclusive license to use, modify, compile, and deploy for internal maintenance and operation.

## Common Traps
- **"Vendor will deposit source code with a mutually agreed escrow agent"** — if the parties cannot agree on an agent, no escrow is ever established.
- **"Source code will be released upon written agreement of all parties"** — vendor must consent to release, defeating the purpose of escrow.
- **"Vendor deposits source code annually"** — annual deposits mean the escrow could be up to 12 months out of date. Require updates with each major release.
- **"Customer may use released source code solely in object code form"** — restrictions on compilation or modification make the release useless for maintenance.
- **"Escrow terminates upon termination of the underlying agreement"** — you need the escrow most at termination. It must survive.
