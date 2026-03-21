# IP Licenses in Bankruptcy

## Applicability

Applies when a licensor of intellectual property files for bankruptcy, when a licensee's rights are at risk due to a licensor's financial distress, or when a debtor seeks to assume, reject, or assign IP license agreements. Section 365(n) of the Bankruptcy Code provides critical protections for licensees, but its scope is limited and subject to significant interpretive disputes.

## Key Requirements

### Section 365(n) — Licensee Election

- **Rejection by Licensor** / When a debtor-licensor rejects an IP license under Section 365(a), the licensee has a binary election: (a) treat the rejection as a breach and assert a pre-petition damages claim, OR (b) retain its rights under the license for the duration of the license term (including renewals enforceable under applicable non-bankruptcy law). / **Consequence**: The election must be made in writing; failure to timely elect may default to option (a), leaving the licensee with only an unsecured damages claim — typically worth cents on the dollar.
- **Retained Rights Under Election** / If the licensee elects to retain rights, it retains: (a) the right to use the IP as provided in the license, (b) exclusivity provisions, and (c) any right to enforce a claim of exclusivity. / **Consequence**: Retained rights are limited to rights under the license agreement — the licensee cannot expand the scope of the license or claim rights not granted in the original agreement.
- **Royalty Obligations** / A licensee electing to retain rights must continue making all royalty payments due under the license for the duration of the retained term. / **Consequence**: Royalty payments continue to the debtor's estate or the licensor's successor; failure to make timely payments may forfeit the licensee's retained rights.
- **Waiver of Setoff** / A licensee retaining rights waives any right of setoff with respect to the license. / **Consequence**: The licensee cannot offset rejection damages against royalty payments; it must continue full royalty payments and pursue its damages claim separately through the bankruptcy claims process.

### Definition of "Intellectual Property" (Section 101(35A))

- **Included** / Trade secrets, U.S. patents and patent applications, plant variety protections, copyrights (subject to Section 365(n) protections). / **Consequence**: Licensees of patents, copyrights, and trade secrets have clear Section 365(n) protections; the statutory definition provides a safe harbor for these IP types.
- **Excluded — Trademarks** / Trademarks are NOT included in the Section 101(35A) definition of "intellectual property." / **Consequence**: This is the most significant gap in Section 365(n). The legislative history indicates Congress intended to revisit trademark treatment but never did. The exclusion creates substantial risk for trademark licensees (franchisees, brand licensees, co-branding partners).
- **Lubrizol Legacy** / Lubrizol Enterprises v. Richmond Metal Finishers (4th Cir. 1985) held that rejection of an IP license terminated the licensee's right to use the IP — Section 365(n) was enacted in 1988 to overrule Lubrizol for patents, copyrights, and trade secrets but NOT trademarks. / **Consequence**: For trademark licenses, Lubrizol's holding may still apply — rejection terminates the licensee's right to use the mark. However, several courts have declined to follow Lubrizol for trademarks (see Sunbeam, Tempnology below).

### Trademark Licenses — Evolving Law

- **Sunbeam Products (7th Cir. 2012)** / Judge Easterbrook held that rejection of a trademark license does not terminate the licensee's rights — rejection is a breach, and the non-breaching party retains its contractual rights. / **Consequence**: Under Sunbeam (controlling in the 7th Circuit), trademark licensees retain the right to use the mark after rejection, subject to quality control provisions. This directly contradicts Lubrizol.
- **Mission Product Holdings v. Tempnology (S. Ct. 2019)** / The Supreme Court held that rejection under Section 365 is a breach, not a rescission or termination — but explicitly declined to resolve the trademark question, stating the issue was not before the court. / **Consequence**: Tempnology supports the Sunbeam position in principle (rejection = breach, not termination) but did not establish a definitive rule for trademark licenses. Circuit split persists.
- **Practical Risk** / Trademark licensees in circuits that have not adopted Sunbeam face significant risk that rejection terminates their trademark rights. / **Consequence**: Licensees should consider protective measures: (a) include IP types covered by Section 101(35A) in the same license, (b) negotiate express survival provisions, (c) obtain a separate covenant not to sue, (d) seek assignment of the marks to a bankruptcy-remote entity.

### Licensor Rejection — Practical Effects

- **Loss of Affirmative Obligations** / Even when a licensee retains rights under 365(n), the debtor-licensor's affirmative obligations (maintenance, updates, technical support, quality assurance, prosecution of the IP) are terminated. / **Consequence**: For software licenses, loss of updates and maintenance can render the retained license worthless over time. Licensees should ensure they have source code escrow or self-help provisions independent of 365(n).
- **Source Code Escrow** / Pre-petition escrow arrangements for software source code may survive the bankruptcy if properly structured. / **Consequence**: The escrow agreement must be with a third-party escrow agent (not the licensor), and the release trigger conditions must be clearly defined. Escrow agreements that are merely executory contracts of the debtor are themselves subject to rejection.

### Licensee Bankruptcy

- **Assumption of IP Licenses** / A debtor-licensee may assume an IP license under Section 365, subject to cure of defaults and adequate assurance of future performance. / **Consequence**: The licensor can object to assumption if the debtor cannot demonstrate ability to maintain quality control and perform license obligations.
- **Assignment of IP Licenses** / Section 365(f) overrides anti-assignment provisions, but Section 365(c)(1) creates an exception: a contract that is not assignable under applicable non-bankruptcy law may not be assumed or assigned if the non-debtor party does not consent. / **Consequence**: Patent licenses are generally non-assignable without consent under federal patent law; this creates a "hypothetical test" vs. "actual test" circuit split on whether the debtor can even ASSUME (not just assign) the license. The First, Fourth, Ninth, and Eleventh Circuits follow the "hypothetical test" (no assumption without consent); the Third and Seventh Circuits follow the "actual test" (assumption permitted if no actual assignment).

### Protective Measures for Licensees

- **Structural Protections** / License the IP from a bankruptcy-remote SPE; ensure the SPE is not consolidated with the licensor's estate. / **Consequence**: If properly structured, the SPE does not file for bankruptcy with the licensor, and the license is not subject to Section 365. Requires true legal separation (separate governance, assets, and capitalization).
- **Contractual Protections** / Step-in rights, source code escrow, express survival-of-rejection clauses, covenant not to sue. / **Consequence**: Contractual protections are subject to bankruptcy court review and may be overridden by the Code, but they provide additional layers of defense and bargaining leverage.
- **Insurance** / IP insurance and supply chain disruption insurance may cover losses from licensor bankruptcy. / **Consequence**: Coverage must be specifically negotiated for bankruptcy scenarios; standard IP insurance policies do not typically cover losses from licensor rejection of the license.

## Interaction with Other Areas

- **IP and Technology** — License structuring, source code escrow, patent assignment vs. license distinction
- **Executory Contracts** — Section 365 general framework applies; 365(n) is a specific carve-out for IP
- **Corporate** — SPE structuring for bankruptcy remoteness, true sale/true license analysis
- **Real Estate** — Trademark and trade dress in franchise and retail lease contexts

## Sources

- [11 U.S.C. Section 365(n) — Intellectual Property Licenses](https://www.law.cornell.edu/uscode/text/11/365)
- [11 U.S.C. Section 101(35A) — Definition of Intellectual Property](https://www.law.cornell.edu/uscode/text/11/101)
- [Mission Product Holdings v. Tempnology, 139 S. Ct. 1652 (2019)](https://supreme.justia.com/cases/federal/us/587/17-1657/)
- [Sunbeam Products v. Chicago American Manufacturing, 686 F.3d 372 (7th Cir. 2012)](https://casetext.com/case/sunbeam-prods-inc-v-chi-am-mfg-llc)
- [Lubrizol Enterprises v. Richmond Metal Finishers, 756 F.2d 1043 (4th Cir. 1985)](https://casetext.com/case/lubrizol-enterprises-inc-v-richmond-metal-finishers-inc)
