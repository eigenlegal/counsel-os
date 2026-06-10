---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
---
# Model Ownership and AI-Generated Content IP

## Applicability

This sub-topic is relevant when ANY of the following are true:

- Ownership of an AI model, its weights, or its architecture is at issue in a contract or dispute.
- A party claims copyright or other IP protection in AI-generated outputs (text, images, code, music, video).
- Fine-tuning, transfer learning, or adaptation of a pre-existing model raises questions about derivative work status or ownership of the resulting model.
- AI-generated inventions or AI-assisted inventions are subject to patent applications.
- Trade secret protection is claimed over model weights, training methodologies, hyperparameters, or proprietary datasets.
- A contract governs the development, licensing, or transfer of AI models or their outputs.

## Key Requirements

### Copyright in AI-Generated Works

- **What**: The US Copyright Office requires that copyrightable works be created by a human author. Works generated autonomously by AI without meaningful human creative control are not eligible for copyright registration.
- **Thaler v. Perlmutter (D.D.C. 2023)**: Held that an image created autonomously by the AI system DABUS (with no human creative input beyond activating the system) is not copyrightable. The court affirmed the Copyright Office's refusal to register the work, stating that "human authorship is a bedrock requirement of copyright."
- **Zarya of the Dawn (Copyright Office, Feb. 2023)**: Partially registered a graphic novel containing both human-authored text and AI-generated images (via Midjourney). The Office registered the human-authored elements and the human-selected arrangement but denied registration for individual AI-generated images, holding that the user's text prompts did not constitute sufficient creative control over the visual output.
- **Copyright Office guidance (Federal Register, 88 FR 16190, March 2023)**: Works with AI-generated components must be examined on a case-by-case basis. Applicants must disclose AI involvement. Copyright protection extends only to human-authored elements. The degree of human creative control is the key inquiry.
- **Threshold**: Copyright attaches only to elements reflecting human authorship. AI-generated content without meaningful human creative direction is in the public domain under current US law.
- **Consequence**: Relying on copyright protection for purely AI-generated works is legally unsupported. Competitors may freely copy unprotectable AI-generated outputs. Failure to disclose AI involvement in registration applications may constitute fraud on the Copyright Office.

### AI-Assisted Works and Human Authorship

- **What**: When a human uses AI as a tool — providing substantial creative direction, selecting and arranging outputs, and making meaningful editorial choices — the resulting work may be copyrightable as to the human-authored elements.
- **Contractual treatment**: Agreements should specify (1) whether AI tools will be used in creating deliverables, (2) the expected degree of human creative involvement, (3) allocation of risk if output is found uncopyrightable, and (4) representations regarding originality.
- **Work-for-hire considerations**: AI-generated works cannot be works made for hire because AI is not an "employee" or "independent contractor" under copyright law. However, works created by human employees using AI tools as part of their employment may qualify as works for hire to the extent the human contributions are copyrightable.
- **Threshold**: The line between copyrightable AI-assisted works and uncopyrightable AI-generated works depends on the degree of human creative control — a fact-intensive inquiry with no bright-line rule.
- **Consequence**: Contracts relying on copyright assignment or work-for-hire provisions for AI-generated deliverables may convey less than expected. Representations of ownership should be carefully scoped.

### Fine-Tuned Model Ownership

- **What**: Fine-tuning a pre-existing base model on proprietary data creates a derivative model. Ownership of the fine-tuned model depends on the base model license terms, the nature of the fine-tuning, and the contractual relationship between the parties.
- **Base model license restrictions**: Open-source and commercial base model licenses may restrict how fine-tuned derivatives are used, distributed, or commercialized. For example, Meta's Llama license permits commercial use but imposes restrictions on users exceeding **700 million monthly active users** and requires compliance with an acceptable use policy.
- **Contractual provisions**: Fine-tuning agreements should address (1) ownership of the fine-tuned weights (delta weights vs. full model), (2) license-back rights to the base model provider, (3) restrictions on distribution of the fine-tuned model, (4) representations about the training data used for fine-tuning, and (5) survival of base model license obligations.
- **Threshold**: Any fine-tuning of a third-party model requires review of the base model license and a written agreement governing ownership of the resulting model.
- **Consequence**: Violation of base model license terms may result in license termination, loss of rights to use the fine-tuned model, and breach of contract claims.

### AI Output Ownership in Commercial Contracts

- **What**: Contracts for AI-powered services must clearly allocate ownership of the outputs generated by the AI system. Without clear contractual terms, ownership disputes are likely.
- **Key issues**: (1) Whether the AI provider or the customer owns outputs generated from customer inputs. (2) Whether the provider may use customer inputs and outputs to train or improve its models. (3) Whether outputs are subject to copyright protection at all. (4) Whether outputs could infringe third-party IP (regurgitation of training data).
- **Market practice**: Leading AI providers (OpenAI, Anthropic, Google) generally assign output ownership to the customer in their terms of service, while retaining rights to use inputs and outputs for model improvement unless opted out. However, these assignments may convey less than expected given the uncertain copyright status of AI-generated content.
- **Threshold**: Every AI service agreement should contain explicit output ownership provisions, IP indemnification for training data infringement, and model improvement rights clauses.
- **Consequence**: Absent clear terms, disputes over output ownership can result in both parties claiming rights or neither party having enforceable rights if the output is uncopyrightable.

### Trade Secret Protection for AI Models

- **What**: Model architecture, training methodologies, hyperparameter configurations, proprietary datasets, and learned weights may qualify for trade secret protection under the Defend Trade Secrets Act (18 U.S.C. Section 1836) and state trade secret laws (Uniform Trade Secrets Act, adopted in 48 states).
- **Requirements**: (1) The information must derive independent economic value from not being generally known or readily ascertainable. (2) The owner must take reasonable measures to keep the information secret (access controls, NDAs, encryption, employee training).
- **Model weights**: Proprietary model weights are strong trade secret candidates — they are expensive to create, difficult to reverse-engineer, and provide competitive advantage. However, open-sourcing any model version may undermine trade secret status for the architecture.
- **Threshold**: Trade secret protection requires affirmative and ongoing secrecy measures. Release of model weights (even under restrictive licenses) may constitute public disclosure depending on the terms.
- **Consequence**: Trade secret misappropriation remedies include injunctive relief, actual damages, unjust enrichment, and exemplary damages up to **2x actual damages** for willful and malicious misappropriation. Criminal penalties under DTSA include fines and imprisonment up to **10 years**.

### Patent Eligibility for AI Inventions

- **What**: US patent law requires a human inventor. AI systems cannot be listed as inventors on patent applications.
- **Thaler v. Vidal (Fed. Cir. 2022)**: Affirmed the USPTO's refusal to accept patent applications listing DABUS (an AI system) as the sole inventor. The Federal Circuit held that under the Patent Act, an "inventor" must be a natural person.
- **AI-assisted inventions**: Inventions conceived by humans with AI assistance may be patentable, provided a natural person contributed to the conception of the invention. The key question is whether a human made an "inventive contribution" — the USPTO issued guidance in February 2024 clarifying that AI-assisted inventions are not categorically unpatentable, but at least one human must have made a significant contribution to each claim.
- **Threshold**: Patent applications must identify human inventors who made significant contributions to the claimed invention. Purely AI-generated inventions are not patentable in the US, UK, EU, or Australia under current law.
- **Consequence**: Patent applications listing AI as an inventor will be rejected. Failure to name the correct human inventor(s) may render a patent unenforceable.

## Interaction with Other Areas

- **IP and Technology:** Model ownership questions are deeply intertwined with copyright, patent, and trade secret law. Load `ip-and-technology/copyrights.md` for copyright fundamentals, `ip-and-technology/patents.md` for patent eligibility, `ip-and-technology/trade-secrets.md` for trade secret protection, and `ip-and-technology/open-source.md` for open-source model licensing implications.
- **Data Privacy:** Model training on personal data may give rise to data subject rights that persist in or affect the model itself (e.g., GDPR right to erasure and its applicability to learned model weights — "machine unlearning"). Load `data-privacy/` for privacy obligations.
- **Employment:** Work-for-hire and invention assignment provisions in employment agreements must be updated to address AI-assisted work product. Pre-existing IP exclusions should clarify AI tool use. Load `employment/` for employment IP issues.
- **Consumer Protection:** Misrepresenting AI output ownership or copyrightability in consumer-facing terms may constitute deceptive practices under FTC Section 5.

## Sources

- [Thaler v. Perlmutter, No. 1:22-cv-01564 (D.D.C. Aug. 18, 2023)](https://www.copyright.gov/ai/) — AI authorship and copyright
- [US Copyright Office, Copyright Registration Guidance: Works Containing Material Generated by AI, 88 FR 16190 (March 16, 2023)](https://www.federalregister.gov/documents/2023/03/16/2023-05321/copyright-registration-guidance-works-containing-material-generated-by-artificial-intelligence) — Registration policy
- [Thaler v. Vidal, 43 F.4th 1207 (Fed. Cir. 2022)](https://cafc.uscourts.gov/opinions-orders/21-2347.OPINION.8-5-2022_1988142.pdf) — AI inventorship and patents
- [USPTO Guidance on AI-Assisted Inventions (Feb. 2024)](https://www.uspto.gov/subscription-center/2024/guidance-ai-assisted-inventions) — AI-assisted patent eligibility
- [Defend Trade Secrets Act, 18 U.S.C. Section 1836](https://www.law.cornell.edu/uscode/text/18/1836) — Federal trade secret protection

---
