---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
last-reviewed: "2026-06-10"
authorities:
  - cite: "17 U.S.C. § 107"
    title: "Copyright Act fair use provision"
    url: "https://www.copyright.gov/title17/92chap1.html#107"
  - cite: "Bartz v. Anthropic, No. 3:24-cv-05417 (N.D. Cal. June 23, 2025)"
    title: "Summary judgment on fair use for AI training; class settlement docket"
    url: "https://www.courtlistener.com/docket/69058235/bartz-v-anthropic-pbc/"
  - cite: "Kadrey v. Meta Platforms, No. 3:23-cv-03417 (N.D. Cal. June 25, 2025)"
    title: "Summary judgment for Meta on fair use for LLM training"
    url: "https://law.justia.com/cases/federal/district-courts/california/candce/3:2023cv03417/415175/598/"
  - cite: "Thomson Reuters v. Ross Intelligence, No. 25-2153 (3d Cir.)"
    title: "Interlocutory appeal of D. Del. ruling that training copying was not fair use"
    url: "https://www.courtlistener.com/docket/70622297/thomson-reuters-enterprise-centre-gmbh-v-ross-intelligence-inc/"
  - cite: "NYT v. Microsoft/OpenAI, No. 1:23-cv-11195 (S.D.N.Y.)"
    title: "Consolidated news-publisher training litigation; April 2025 motion-to-dismiss opinion"
    url: "https://www.courtlistener.com/docket/68117049/the-new-york-times-company-v-microsoft-corporation/"
  - cite: "U.S. Copyright Office, Copyright and AI, Part 3 (May 2025)"
    title: "Generative AI Training report (pre-publication version)"
    url: "https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf"
  - cite: "Directive (EU) 2019/790, Arts. 3-4"
    title: "DSM Directive text and data mining exceptions"
    url: "https://eur-lex.europa.eu/eli/dir/2019/790/oj"
---
# Training Data

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI model is being trained or fine-tuned on data, and the legal rights to that data are at issue.
- A contract involves licensing, procuring, or providing data for the purpose of machine learning training.
- Web scraping or data collection for AI training purposes is being conducted or contracted for.
- Fair use of copyrighted works for AI training is at issue.
- A counterparty's terms of service address AI training or text/data mining restrictions.
- Synthetic data generation is being used to supplement or replace real-world training data.
- GDPR or other privacy law obligations apply to personal data used in model training.

## Key Requirements

### Copyright and Fair Use

- **What**: The use of copyrighted works to train AI models raises fundamental copyright questions. No definitive US federal statute addresses AI training specifically. Analysis proceeds under the four-factor fair use test (17 U.S.C. Section 107) and rapidly developing case law. As of June 2026 the emerging district-court pattern: **training on lawfully acquired copies has been held transformative fair use, but acquiring or retaining pirated copies is not protected** — and no appellate court has yet ruled (first appellate decision expected from the Third Circuit, argued June 2026).
- **Fair use four factors**: (1) Purpose and character of the use — commercial vs. nonprofit, transformative use. (2) Nature of the copyrighted work — factual vs. creative. (3) Amount and substantiality of the portion used — whether the entire work is ingested. (4) Effect on the potential market — whether the model's outputs substitute for the original, including the emerging "market dilution" theory (outputs flooding the market for the originals).
- **Authors Guild v. Google (2d Cir. 2015)**: Established that digitizing entire books for a searchable index is fair use where the output (snippet view) is transformative and does not substitute for the original. Frequently cited by AI developers as supporting training on copyrighted text.
- **Bartz v. Anthropic (N.D. Cal., June 23, 2025)**: Held on summary judgment that training LLMs on lawfully purchased books was "quintessentially transformative" fair use — but that downloading and retaining pirated library copies was not fair use. The piracy exposure drove a **$1.5 billion class settlement** (~500,000 works, roughly $3,000 per work, plus destruction of the pirated libraries). Preliminarily approved September 25, 2025; the final fairness hearing was held May 14, 2026 and **final approval remained pending as of early June 2026** — verify current status before citing.
- **Kadrey v. Meta (N.D. Cal., June 25, 2025)**: Granted Meta summary judgment on fair use for LLM training (including on pirated books), but expressly because those plaintiffs failed to build a market-harm record. The court signaled that a developed "market dilution" showing would likely defeat fair use in similar cases — a narrow, record-specific win, not a green light.
- **Thomson Reuters v. Ross Intelligence (D. Del. Feb. 2025)**: Found that copying Westlaw headnotes to train a legal AI search tool was not fair use, emphasizing the commercial nature and market substitution in the legal research market. On interlocutory appeal to the Third Circuit (No. 25-2153); oral argument held June 11, 2026 — the first appellate test of fair use for AI training. Check for a decision before relying on the district court ruling.
- **NYT v. OpenAI (S.D.N.Y., filed Dec. 2023)**: Consolidated news-publisher litigation. Motions to dismiss were largely denied (opinion April 4, 2025), and the case was in discovery with summary judgment briefing through spring 2026. No merits ruling as of June 2026.
- **Copyright Office, Part 3 report (May 2025, pre-publication)**: Concluded AI training is not categorically fair use — transformativeness is a matter of context and degree, pirated source material weighs against fair use, and market dilution is a cognizable factor-four harm. Persuasive (not binding) authority; both Bartz and Kadrey echo parts of it.
- **Threshold**: Every use of copyrighted material for training requires a fair use analysis or a license. Provenance of the copies is now the pivotal fact: lawful acquisition supports fair use; pirated sources create severe exposure independent of the training use. Fair use remains fact-specific. No blanket safe harbor for AI training exists under current US law.
- **Consequence**: Copyright infringement damages include actual damages and profits, or statutory damages of **$750-$30,000 per work infringed** (up to **$150,000 per work** for willful infringement) under 17 U.S.C. Section 504. Injunctive relief may halt model distribution.

### Text and Data Mining (TDM) Under EU Law

- **What**: The EU DSM Directive (2019/790) provides two TDM exceptions: (1) Art. 3 — TDM for scientific research by research organizations and cultural heritage institutions (no opt-out possible), and (2) Art. 4 — TDM for any purpose, including commercial AI training, unless the rightsholder has expressly reserved rights ("opted out") in a machine-readable manner.
- **Opt-out mechanism**: Under Art. 4, rightsholders may opt out of TDM by expressing a reservation in a machine-readable way (e.g., robots.txt, metadata, terms of service). AI developers must respect these opt-outs.
- **EU AI Act interaction**: GPAI model providers must comply with EU copyright law, including TDM opt-outs, and must publish a sufficiently detailed summary of training data content (EU AI Act Art. 53(1)(c)-(d)).
- **Threshold**: Applies to all commercial AI training using content from EU rightsholders or content accessible in the EU.
- **Consequence**: Copyright infringement under member state law. Fines under the EU AI Act for GPAI providers failing to comply with copyright obligations.

### Data Licensing for AI Training

- **What**: Licensing agreements for training data must address scope of permitted use (training only vs. training and inference), exclusivity, output ownership, model weight ownership, sublicensing to downstream users, and data retention post-training.
- **Key contractual provisions**: (1) Permitted use scope — training, fine-tuning, evaluation, benchmarking. (2) Restrictions on use — prohibition on reverse-engineering training data from model outputs, prohibition on training competing models. (3) Representations and warranties — data ownership, absence of third-party IP claims, lawful collection. (4) Indemnification — for IP infringement claims arising from training data. (5) Audit rights — to verify training data use and deletion.
- **Threshold**: Any commercial procurement of data for AI training should be governed by a written license. Reliance on publicly available data without a license creates legal risk.
- **Consequence**: Breach of data license terms exposes the licensee to contract damages, injunctive relief, and potential loss of rights to models trained on the licensed data.

### Web Scraping for AI Training

- **What**: Automated collection of publicly available web content for AI training raises legal issues under the Computer Fraud and Abuse Act (CFAA), website terms of service, copyright law, and state trespass-to-chattels theories.
- **CFAA (18 U.S.C. Section 1030)**: After *Van Buren v. United States* (2021), the Supreme Court narrowed CFAA's scope — accessing publicly available information generally does not violate the CFAA even if it violates terms of service. However, circumventing technical access barriers (CAPTCHAs, rate limits, IP blocks) may still constitute unauthorized access.
- **hiQ Labs v. LinkedIn (9th Cir. 2022)**: Affirmed that scraping publicly available data (LinkedIn public profiles) likely does not violate the CFAA. However, this does not resolve copyright, privacy, or contractual claims.
- **Terms of service**: Many websites prohibit scraping in their ToS. While ToS violations alone may not constitute CFAA violations post-*Van Buren*, they may support breach of contract or tortious interference claims.
- **Threshold**: Web scraping for AI training requires analysis of CFAA exposure, ToS compliance, copyright fair use, and applicable privacy laws for each data source.
- **Consequence**: CFAA criminal penalties (up to **5 years imprisonment** for first offense, **10 years** for repeat) and civil damages. Contract damages for ToS violations. Copyright infringement for scraped copyrighted content.

### Right of Publicity and Personal Data

- **What**: Training AI models on individuals' names, likenesses, voices, or other identity elements may violate state right of publicity laws. Using personal data for training may violate GDPR, CCPA, and other privacy laws.
- **Right of publicity**: Over 30 US states recognize a right of publicity (statutory or common law). Key states include California (Cal. Civ. Code Section 3344), New York (NY Civ. Rights Law Sections 50-51), and Tennessee (which extended protection to voice in the ELVIS Act, 2024).
- **GDPR lawful basis for training**: Processing personal data for AI model training requires a lawful basis under GDPR Art. 6. Legitimate interest (Art. 6(1)(f)) is the most commonly asserted basis, but requires a documented balancing test weighing the organization's interest against data subjects' rights. Consent may be required for sensitive data. Data subjects have the right to object to processing for AI training under Art. 21.
- **Threshold**: Any training dataset containing identifiable individuals' data, likeness, voice, or name triggers right of publicity and privacy analysis.
- **Consequence**: Right of publicity damages vary by state — California allows the greater of **$750 or actual damages** plus profits, and punitive damages for knowing violations. GDPR fines up to **EUR 20 million or 4%** of turnover for violations of processing principles.

### Synthetic Data

- **What**: Artificially generated data that mimics the statistical properties of real-world data without containing actual personal data or copyrighted content. Used to augment training datasets, address bias, and reduce privacy and IP risk.
- **Legal advantages**: Properly generated synthetic data avoids copyright infringement (no copyrighted works reproduced), reduces privacy risk (no personal data if generation is truly de-identified), and can be freely licensed.
- **Legal risks**: If synthetic data is generated from real data that was improperly collected, derivative data arguments may apply. Synthetic data that too closely mirrors protected content or individuals may still infringe. Quality and bias in synthetic data can introduce new fairness issues.
- **Threshold**: Synthetic data is a risk-mitigation strategy, not a safe harbor. The lawfulness of the underlying source data and the fidelity of the generation process must both be evaluated.

## Interaction with Other Areas

- **IP and Technology:** Training data copyright questions are fundamentally IP issues. Fair use analysis, licensing, and copyright ownership all intersect with `ip-and-technology/copyrights.md`. Open-source model licenses may impose obligations on training data — load `ip-and-technology/open-source.md`.
- **Data Privacy:** Personal data in training datasets triggers GDPR, CCPA, and state privacy law obligations including lawful basis, data subject rights (including deletion from models), and cross-border transfer restrictions. Load `data-privacy/` for comprehensive coverage.
- **Consumer Protection:** Deceptive claims about training data provenance (e.g., claiming models are trained on licensed data when they are not) may constitute unfair or deceptive practices under FTC Section 5.
- **Employment:** Training data sourced from employee communications, performance records, or workplace monitoring triggers employment privacy obligations and potential works council consultation requirements.

## Sources

- [17 U.S.C. Section 107 — Fair Use](https://www.copyright.gov/title17/92chap1.html#107) — US Copyright Act fair use provision
- [EU Directive 2019/790 (DSM Directive) — EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/790/oj) — Text and Data Mining exceptions (Arts. 3-4)
- [US Copyright Office: Copyright and AI reports](https://www.copyright.gov/ai/) — Parts 1-3, including Part 3 on Generative AI Training (May 2025)
- [Bartz v. Anthropic docket — CourtListener](https://www.courtlistener.com/docket/69058235/bartz-v-anthropic-pbc/) — Fair use ruling and class settlement
- [Kadrey v. Meta, summary judgment order (N.D. Cal. 2025)](https://law.justia.com/cases/federal/district-courts/california/candce/3:2023cv03417/415175/598/) — Fair use for LLM training
- [Thomson Reuters v. Ross Intelligence, 3d Cir. No. 25-2153 — CourtListener](https://www.courtlistener.com/docket/70622297/thomson-reuters-enterprise-centre-gmbh-v-ross-intelligence-inc/) — First appellate test of AI-training fair use
- [Van Buren v. United States, 593 U.S. 374 (2021)](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf) — CFAA scope narrowing
- [hiQ Labs v. LinkedIn, 31 F.4th 1180 (9th Cir. 2022)](https://law.justia.com/cases/federal/appellate-courts/ca9/17-16783/17-16783-2022-04-18.html) — Web scraping and CFAA

---
