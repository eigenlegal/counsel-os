---
counsel-os-type: practice
content-version: "2026-06-11"
---
# AI & Data Use — Position

> **Starting point, not legal advice.** Seeded market-default position — review and edit it to match your practice before you rely on it.

## Our Position
**Our standard:** Vendor explicitly prohibits use of customer data for AI/ML training without opt-in consent. Customer owns all outputs generated using customer data. Vendor discloses all third-party AI providers. AI features can be disabled without losing core functionality.
**We'll accept:** Opt-out (rather than opt-in) mechanism for AI training, or vague "service improvement" terms that could include model training, provided output ownership is clearly assigned to customer and third-party AI providers are disclosed.
**We won't accept:** Vendor claiming blanket license to use customer data for AI/ML training with no opt-out, claiming ownership of outputs generated from customer inputs, or commingling customer data with training data without consent.
**Auto-escalate:** Any right to use customer data for AI training without opt-in; vendor claiming output ownership; no third-party AI provider disclosure; no opt-out mechanism; customer data commingled with training data; broader AI rights in privacy policy than in enterprise agreement.

## Market Standard
Vendor does not use customer data (including inputs, outputs, and usage data) to train, improve, or develop AI/ML models without explicit prior written consent. Customer retains all rights to its data and any outputs generated using customer inputs. Vendor's AI features, if any, are disclosed with transparency about what models are used, how data flows, and whether third-party AI providers are involved. Opt-in (not opt-out) for any AI training on customer data.

## Classification Guide
- **GREEN**: Vendor explicitly prohibits use of customer data for AI/ML training, model improvement, or development; customer owns all outputs generated using customer data; vendor discloses all AI/ML models and third-party AI providers used in the service; opt-in required for any data use beyond service delivery; customer can disable AI features without losing core functionality; vendor warrants that pre-existing training data did not include customer's data without consent; no commingling of customer data with other customers' data for AI purposes; data processing agreements cover AI-specific use.
- **YELLOW**: Vendor has opt-out (not opt-in) mechanism for AI training on customer data; vague terms about "service improvement" that could include model training; output ownership unclear or shared between vendor and customer; third-party AI providers used but not fully disclosed; AI features cannot be disabled without losing significant functionality; vendor uses aggregated/anonymized data for model improvement without clear anonymization standards.
- **RED**: Vendor claims blanket license to use customer data for AI/ML training; no opt-out available; vendor claims ownership of outputs generated from customer inputs; customer data commingled with training data without consent; no disclosure of AI models or third-party AI providers; vendor's terms grant perpetual, irrevocable license to customer data for model development; no data processing safeguards specific to AI use; customer cannot determine whether their data was used in training.

## Escalate If
- Vendor claims any right to use customer data for AI/ML training without explicit opt-in consent.
- Vendor claims ownership of outputs generated from customer inputs or data.
- No disclosure of third-party AI providers involved in data processing.
- No opt-out mechanism for AI training or data use beyond service delivery.
- Customer data may be commingled with training data for model development.
- Vendor's privacy policy or terms of service grant broader AI data use rights than the enterprise agreement.
- AI-generated outputs may contain or expose other customers' data (model leakage risk).

## Practical Guidance
- AI data use clauses are rapidly evolving and vary dramatically across vendors. Many enterprise SaaS vendors added AI features in 2023-2025 under existing terms that did not anticipate AI use. Review the terms carefully for gaps.
- The distinction between "service delivery" and "service improvement" is critical. Vendor using your data to deliver the service you purchased is expected. Vendor using your data to train models that improve the service for all customers (or are sold separately) is a different value exchange entirely.
- Opt-in vs. opt-out matters enormously. Opt-out means your data is being used for training by default, and you must affirmatively act to stop it. Opt-in means your data is not used unless you explicitly agree. Always require opt-in.
- Third-party AI providers (OpenAI, Anthropic, Google) may have their own data use terms. If the vendor passes your data to a third-party AI provider, the chain of custody and data use rights must be clear end-to-end.
- Output ownership is a new frontier. Under current US copyright law, purely AI-generated content may not be copyrightable. Clarify contractually who owns outputs, regardless of copyright status.
- Check for conflicts between the enterprise agreement and the vendor's general terms of service or privacy policy. The enterprise agreement should explicitly supersede broader terms.

## Key Negotiation Points
1. **Training prohibition** — explicit prohibition on using customer data for AI/ML training, model improvement, or development without opt-in consent.
2. **Output ownership** — customer owns all outputs generated using customer data or inputs; vendor gets no license to outputs.
3. **Third-party AI disclosure** — vendor discloses all third-party AI providers; data flow and usage terms are transparent.
4. **Opt-in requirement** — any AI data use beyond service delivery requires explicit written opt-in, not default opt-out.
5. **Terms hierarchy** — enterprise agreement supersedes vendor's general terms of service and privacy policy on AI data use.

## Common Traps
- **"Vendor may use customer data to improve the service"** — "improve the service" is broad enough to include AI/ML training, feature development, and model optimization.
- **"Customer grants vendor a license to use data for providing and improving the service"** — standard SaaS language that now has a dramatically expanded meaning in the AI era.
- **"Vendor uses de-identified data for analytics and product improvement"** — "de-identified" is weaker than "anonymized" and may be reversible; "product improvement" includes model training.
- **"AI features are subject to vendor's AI terms at [URL]"** — separate AI terms that the vendor can modify unilaterally, potentially granting broader data use rights than the enterprise agreement.
- **"Customer acknowledges that AI outputs may not be accurate or complete"** — reasonable disclaimer, but watch for accompanying language that eliminates all vendor liability for AI outputs, including outputs that cause harm.
