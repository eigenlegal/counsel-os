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

- **What**: The use of copyrighted works to train AI models raises fundamental copyright questions. No definitive US federal statute addresses AI training specifically. Analysis proceeds under the four-factor fair use test (17 U.S.C. Section 107) and evolving case law.
- **Fair use four factors**: (1) Purpose and character of the use — commercial vs. nonprofit, transformative use. (2) Nature of the copyrighted work — factual vs. creative. (3) Amount and substantiality of the portion used — whether the entire work is ingested. (4) Effect on the potential market — whether the model's outputs substitute for the original.
- **Authors Guild v. Google (2d Cir. 2015)**: Established that digitizing entire books for a searchable index is fair use where the output (snippet view) is transformative and does not substitute for the original. Frequently cited by AI developers as supporting training on copyrighted text.
- **Thomson Reuters v. Ross Intelligence (D. Del. 2025)**: Found that copying of headnotes to train a legal AI search tool was not fair use, emphasizing the commercial nature and market substitution in the legal research market.
- **NYT v. OpenAI (S.D.N.Y., filed Dec. 2023)**: Ongoing litigation alleging that training GPT models on New York Times articles constitutes copyright infringement. The Times alleges the models can reproduce near-verbatim copies. Outcome will significantly shape training data law. No final ruling as of early 2026.
- **Threshold**: Every use of copyrighted material for training requires a fair use analysis or a license. Fair use is a fact-specific, case-by-case determination. No blanket safe harbor for AI training exists under current US law.
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
- [US Copyright Office: Copyright and AI — Part 1: Digital Replicas (2025)](https://www.copyright.gov/ai/) — Copyright Office AI initiatives
- [Van Buren v. United States, 593 U.S. 374 (2021)](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf) — CFAA scope narrowing
- [hiQ Labs v. LinkedIn, 31 F.4th 1180 (9th Cir. 2022)](https://law.justia.com/cases/federal/appellate-courts/ca9/17-16783/17-16783-2022-04-18.html) — Web scraping and CFAA
