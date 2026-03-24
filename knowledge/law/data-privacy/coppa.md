---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Coppa

# COPPA (Children's Online Privacy Protection Act)

## Applicability

The Children's Online Privacy Protection Act (15 U.S.C. 6501-6506) and the FTC's COPPA Rule (16 C.F.R. Part 312) apply when ANY of the following are true:

- The website, online service, or mobile application is **directed to children under 13** (determined by subject matter, visual content, use of animated characters, child-oriented activities, age of models, presence of child celebrities, music or content appealing to children, or other characteristics).
- The operator has **actual knowledge** that it is collecting personal information from a child under 13, even if the site is not directed to children.
- The website or service has a **mixed audience** (directed to children and general audience) — COPPA applies to the child-directed portions and to any identified child user.
- A **plug-in, ad network, or third-party service** collects personal information through a child-directed site or service (the third party may be an independent "operator" under COPPA).

**Who is an "operator":** Any person who operates a website or online service and collects or maintains personal information from or about the users of such service. Includes website owners, app developers, and third parties (such as ad networks and analytics providers) that collect personal information through child-directed sites.

**Threshold age: Under 13.** Some states have extended protections to children under 16 or 18 through state laws (see `us-state-privacy.md`), and CCPA imposes opt-in requirements for consumers under 16 (see `ccpa-cpra.md`).

## Key Requirements

### Verifiable Parental Consent (VPC)

- **What:** Before collecting, using, or disclosing personal information from a child under 13, the operator must obtain **verifiable parental consent**. "Personal information" includes name, physical address, email address, phone number, SSN, photo/video/audio of the child, geolocation, persistent identifier (cookies, device ID) when used for purposes other than internal operations, and any combination of information that permits physical or online contacting.
- **Methods approved by the FTC:** (a) Signed consent form returned by mail, fax, or electronic scan; (b) credit card or other online payment transaction as verification; (c) toll-free telephone call or video conference with trained personnel; (d) government-issued ID checked against a database (with prompt deletion of the ID); (e) knowledge-based authentication; (f) facial recognition comparison of parent's photo ID to real-time selfie (with prompt deletion after verification); (g) any other method approved through the FTC's voluntary review process.
- **Sliding scale for internal use:** If personal information will only be used for internal purposes (not disclosed to third parties), a less rigorous method may suffice, such as email-plus (email to parent plus confirmation mechanism, with a delayed activation period).
- **Consequence:** Collection without VPC is a **per-child, per-incident violation**. FTC civil penalties up to **$51,744 per violation** (as adjusted for inflation, 2024 figure). Penalties are regularly adjusted; check current FTC penalty amounts.

### Direct Notice to Parents

- **What:** Before collecting personal information, the operator must provide **direct notice to the parent** (not just a posted privacy policy) that includes: (a) the operator's contact information; (b) the types of personal information collected; (c) how the information will be used; (d) whether information is disclosed to third parties; (e) the parent's right to refuse further collection and to request deletion; and (f) the specific consent mechanism.
- **Timeline:** Notice must be provided **before** any collection occurs.
- **Consequence:** Failure to provide adequate direct notice is an independent violation of the COPPA Rule.

### Privacy Policy Requirements

- **What:** Operators of child-directed sites or services must post a **clear, complete, and prominently placed** privacy policy that includes: all categories of personal information collected, how information is used, disclosure practices, name and contact information of all operators collecting information through the site, and a description of parental rights.
- **Accessibility:** The privacy policy link must be placed on the homepage and at each point where personal information is collected from children.
- **Consequence:** An inadequate or inaccessible privacy policy is an independent COPPA violation.

### Limitations on Collection and Use

- **Data minimization:** Operators must not condition a child's participation in a game, prize offering, or other activity on the disclosure of **more personal information than is reasonably necessary** for the activity.
- **Retention limitation:** Personal information collected from children must be retained only as long as reasonably necessary for the purpose collected. Must be **securely deleted** when no longer needed.
- **Third-party disclosure:** Operators cannot disclose children's personal information to third parties unless the disclosure is integral to the site's purpose, is reasonably necessary for the site's operation, or the parent has consented. The operator must ensure the third party maintains confidentiality and security.

### Ongoing Parental Rights

- **What:** Parents have the right to: (a) review personal information collected from their child; (b) direct the operator to delete the information; (c) refuse to permit further collection or use. The operator must not condition the child's participation on providing more information than reasonably necessary.
- **Timeline:** Operator must respond to parental requests **within a reasonable timeframe** (the FTC has indicated this should be prompt — no more than a few business days).
- **Consequence:** Failure to honor parental rights is a per-incident violation.

### Confidentiality and Security

- **What:** Operators must establish and maintain **reasonable procedures** to protect the confidentiality, security, and integrity of personal information collected from children. This includes limiting access to authorized personnel and ensuring service providers and third parties maintain equivalent protections.
- **Consequence:** A data breach involving children's personal information may trigger both COPPA enforcement and state breach notification obligations, with enhanced penalties.

### COPPA Safe Harbor Programs

- **What:** Industry groups or organizations may apply to the FTC for approval of self-regulatory guidelines (Safe Harbor programs) that implement COPPA protections. Participants in an approved Safe Harbor program are subject to the program's oversight and enforcement in lieu of direct FTC enforcement (though the FTC retains backup authority).
- **Approved programs:** Include CARU (Children's Advertising Review Unit), ESRB (Entertainment Software Rating Board), kidSAFE Seal Program, PRIVO, and others. The list is maintained on the FTC's COPPA Safe Harbor page.
- **Consequence:** Participation does not eliminate COPPA obligations — it provides an alternative enforcement pathway. The FTC can still bring enforcement actions against Safe Harbor participants for COPPA violations.

### Age Verification and Age-Gating

- **What:** COPPA does not mandate a specific age-verification mechanism, but operators must not collect personal information from children under 13 without VPC. Age gates (asking users to enter a date of birth) are commonly used to identify children. The FTC has stated that age gates must not be easily circumvented (e.g., must not allow users to simply reload the page and re-enter a different age).
- **Neutral age gate:** The FTC recommends a "neutral" age screen that does not indicate the age threshold for access, to discourage children from lying about their age.
- **Consequence:** An age gate that is easily circumvented may not be sufficient to avoid "actual knowledge" of child users.

### FTC Enforcement History and Key Precedents

The FTC has actively enforced COPPA, with escalating penalties over time:

- **Musical.ly/TikTok (2019):** **$5.7 million** settlement — largest COPPA fine at that time — for collecting personal information from children under 13 without parental consent on the Musical.ly platform.
- **Epic Games/Fortnite (2022):** **$275 million** COPPA penalty — the largest COPPA settlement in history — for violating children's privacy protections through default settings and voice/text communications in Fortnite.
- **Amazon/Alexa (2023):** **$25 million** settlement for retaining children's voice recordings and geolocation data without parental consent through Alexa and Ring services.
- **Key enforcement themes:** (a) Actual knowledge of child users combined with failure to obtain consent; (b) retention of children's data beyond what is reasonably necessary; (c) default settings that enable collection without adequate consent; (d) third-party tracking through child-directed properties.
- **Trend:** Penalties are increasing substantially. The FTC has signaled that it views children's privacy as a top enforcement priority.

### Third-Party Operators and Ad Networks

- **What:** An ad network, analytics provider, or plug-in that collects personal information from users of a child-directed site or service may itself be an "operator" under COPPA if it has actual knowledge that the site or service is child-directed.
- **Obligation:** Third-party operators must either obtain verifiable parental consent directly or rely on the website operator to do so on their behalf. If relying on the website operator, the third party must provide notice of its collection practices to the website operator.
- **Safe harbor:** Ad networks participating in CARU or similar COPPA Safe Harbor programs may satisfy their obligations through the program's framework, but must still ensure that their data collection through child-directed sites complies with COPPA requirements.
- **Consequence:** Third-party operators that collect personal information through child-directed sites without appropriate consent are independently liable for COPPA violations.

### Ed-Tech and Schools

- **School exception:** When a school or school district directs students to use an online educational service, the school may consent on behalf of parents for the collection of student personal information — but **only for the school-authorized educational purpose**. The operator may not use the information for any commercial purpose unrelated to the provision of the educational service.
- **FERPA interaction:** Student education records are also protected under FERPA. Where both COPPA and FERPA apply (e.g., ed-tech platforms used by schools), operators must comply with both frameworks. FERPA's "school official" exception permits disclosure to operators under certain conditions, but does not eliminate COPPA obligations for data collected directly from students.
- **FTC guidance:** The FTC has issued specific guidance on COPPA compliance for ed-tech providers, emphasizing that schools cannot consent to commercial uses of student data.

## Interaction with Other Areas

- **Data Privacy (CCPA/CPRA):** CCPA requires opt-in consent for sale/sharing of personal information of consumers under 16, with parental consent for those under 13. Where COPPA and CCPA both apply, COPPA's VPC requirement is the stricter standard and controls. Both must be independently satisfied.
- **Data Privacy (GDPR):** GDPR Article 8 requires parental consent for information society services offered directly to children under 16 (member states may lower to 13). If a US-based, child-directed service has EU users, both COPPA and GDPR child consent provisions apply. GDPR's age threshold may be higher (up to 16) in some member states.
- **Consumer Protection:** FTC enforcement of COPPA is an exercise of its Section 5 authority over unfair or deceptive acts. COPPA violations may also constitute unfair or deceptive practices under state consumer protection laws, enabling parallel state enforcement.
- **Employment/Education:** FERPA (Family Educational Rights and Privacy Act) governs student education records and may overlap with COPPA for ed-tech platforms. When a school directs a student to use a technology service, the school may consent on behalf of the parent under COPPA's "school exception," but only for the educational purpose — not for commercial purposes.
- **US State Privacy Laws:** Several states have enacted laws specifically addressing children's or teen data beyond COPPA's scope. California's Age-Appropriate Design Code Act (effective July 1, 2024) imposes DPIA requirements for online products likely to be accessed by children under 18, with penalties up to **$7,500 per affected child**. Other states are considering similar age-appropriate design legislation.

### Connected Toys, IoT, and Voice Assistants

- **What:** COPPA applies to internet-connected toys, smart speakers, and other IoT devices that collect personal information from children. Voice recordings, usage patterns, and associated account information are personal information under COPPA.
- **FTC enforcement:** The FTC has pursued enforcement actions against manufacturers of connected toys and voice assistant services for collecting voice recordings from children without VPC and retaining recordings longer than reasonably necessary.
- **Design obligations:** Connected devices directed to children must incorporate COPPA-compliant consent mechanisms before activating features that collect personal information. Default settings must minimize data collection.
- **Third-party SDKs:** If a child-directed app or device incorporates third-party software development kits (SDKs) that collect personal information (e.g., analytics, advertising), the app or device operator is responsible for ensuring COPPA compliance for that collection.

### State-Level Children's Privacy Laws

Beyond COPPA, several states have enacted additional children's privacy protections:

- **California (AADC):** Age-Appropriate Design Code Act requires data protection impact assessments for online services likely to be accessed by children under 18, default high-privacy settings, and age estimation mechanisms.
- **Utah, Arkansas, Texas, Ohio:** Have enacted laws requiring parental consent for minors' social media accounts, with varying age thresholds (typically under 16 or 18).
- **Interaction:** These state laws supplement COPPA. Where both COPPA (under 13, federal) and a state children's data law (under 18, state) apply, both must be satisfied. COPPA does not preempt stricter state laws that are consistent with its protections.

## Sources

- [COPPA Statute — Cornell LII](https://www.law.cornell.edu/uscode/text/15/chapter-91) — 15 U.S.C. 6501-6506
- [FTC COPPA Rule — eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312) — 16 C.F.R. Part 312
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) — Comprehensive FTC guidance on COPPA compliance
- [FTC COPPA Safe Harbor Programs](https://www.ftc.gov/safe-harbor-program) — List of approved self-regulatory programs
- [FTC COPPA Enforcement Actions](https://www.ftc.gov/legal-library/browse/cases-proceedings?search_api_fulltext=coppa) — Published enforcement actions
