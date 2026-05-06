---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [us-federal, us-state]
---
## Can Spam

# CAN-SPAM Act

## Applicability

This sub-file applies whenever a matter involves commercial email marketing, transactional or relationship email communications, email service provider agreements, bulk email compliance, opt-out/unsubscribe mechanisms, email header and routing information accuracy, or any agreement that allocates responsibility for email marketing compliance between parties (e.g., affiliate marketing agreements, co-registration arrangements, email list rental/purchase agreements).

## Key Requirements

### Statutory Framework (15 U.S.C. §§ 7701-7713, 16 C.F.R. Part 316)

- **What**: The CAN-SPAM Act (Controlling the Assault of Non-Solicited Pornography and Marketing Act of 2003) establishes requirements for commercial electronic mail messages, gives recipients the right to stop receiving emails, and imposes penalties for violations. It applies to any electronic mail message the primary purpose of which is the commercial advertisement or promotion of a commercial product or service.
- **Threshold**: A single commercial email is sufficient to trigger CAN-SPAM obligations. The Act applies to all commercial email sent to or from the United States, regardless of whether the recipient is a customer. No prior relationship is required for CAN-SPAM to apply — it is not an anti-spam "opt-in" law but rather a "right to opt-out" framework.
- **Consequence**: Civil penalties up to $50,120 per violation (per non-compliant email, as adjusted for inflation). Criminal penalties — including imprisonment up to 5 years — for aggravated violations involving fraud, harvesting, or dictionary attacks. Enforcement by the FTC, state AGs, and ISPs. No private right of action for individual consumers.

### Prohibition on False or Misleading Header Information

- **What**: It is unlawful to initiate transmission of a commercial email with header information (including the "From," "To," "Reply-To," and routing information) that is materially false or materially misleading.
- **Threshold**: The originating email address, domain name, and IP address must accurately identify the person who initiated the message. Header information is "materially misleading" if it would likely mislead a reasonable recipient about the origin of the message.
- **Consequence**: Violation is both a civil and criminal offense. Criminal penalties apply when false header information is used in connection with other fraudulent conduct.

### Prohibition on Deceptive Subject Lines

- **What**: It is unlawful to use a subject line that would be likely to mislead a recipient, acting reasonably under the circumstances, about a material fact regarding the contents or subject matter of the message.
- **Threshold**: The subject line must accurately reflect the content of the message. "Act now!" or "Urgent" subject lines are not per se violations, but subject lines that affirmatively misrepresent the message content (e.g., "Re: Your Order" when there is no order) violate the Act.
- **Consequence**: Civil penalties up to $50,120 per violation.

### Identification as Advertisement

- **What**: Commercial email must include a "clear and conspicuous identification that the message is an advertisement or solicitation."
- **Threshold**: The disclosure must be clear and conspicuous but the Act does not mandate specific wording. The FTC has stated that the identification can appear anywhere in the message. If the recipient has given affirmative consent to receive the message, the identification requirement does not apply.
- **Consequence**: Civil penalties up to $50,120 per violation.

### Opt-Out Mechanism Requirements

- **What**: Every commercial email must include a clear and conspicuous mechanism for the recipient to opt out of future commercial email from the sender. The opt-out must be functional for at least 30 days after the message is sent.
- **Threshold**: The opt-out mechanism must be available via return email or another internet-based mechanism that is clearly and conspicuously displayed. The sender must process opt-out requests within 10 business days. After opt-out, the sender may not send or cause to be sent any commercial email to that address. The sender may not require the recipient to pay a fee, provide information beyond an email address, or take any steps other than replying to the email or visiting a single internet page to opt out. Opt-out requests cannot be conditioned on the recipient visiting more than a single page (no multi-page opt-out flows).
- **Consequence**: Failure to provide a functioning opt-out mechanism or failure to honor opt-out requests within 10 business days subjects the sender to civil penalties up to $50,120 per subsequent non-compliant email.

### Physical Postal Address

- **What**: Every commercial email must include a valid physical postal address of the sender.
- **Threshold**: The address must be a valid current street address, a PO Box registered with the United States Postal Service, or a private mailbox registered with a commercial mail receiving agency under USPS regulations. The address must be the sender's actual address or one where the sender receives mail.
- **Consequence**: Civil penalties up to $50,120 per violation.

### Transactional or Relationship Message Exemption

- **What**: Messages with a "transactional or relationship" primary purpose are exempt from most CAN-SPAM requirements (identification as ad, opt-out mechanism, physical address) but must still comply with the prohibition on false/misleading headers.
- **Threshold**: Transactional messages include: (1) facilitating or confirming a transaction the recipient agreed to, (2) providing warranty, recall, safety, or security information, (3) subscription or membership notifications (not marketing), (4) account balance or other account status information, and (5) delivery of goods or services under a transaction, including product updates. The "primary purpose" test determines classification — if the primary purpose is commercial promotion, it is a commercial message regardless of whether it also contains transactional content.
- **Consequence**: Misclassifying a commercial email as transactional to avoid CAN-SPAM requirements is itself a violation.

### Aggravated Violations — Criminal Penalties

- **What**: The CAN-SPAM Act imposes criminal penalties for specific aggravated conduct in connection with commercial email.
- **Threshold**: Criminal penalties apply for: (1) accessing a computer without authorization to send commercial email (up to 5 years imprisonment), (2) using a computer for open relay or open proxy without authorization (up to 3 years), (3) falsifying header information in multiple messages (up to 3 years), (4) registering for multiple email accounts or domain names using false information to send commercial email (up to 5 years), and (5) falsely representing yourself as the registrant of 5 or more IP addresses to send commercial email (up to 5 years).
- **Consequence**: Imprisonment of up to 5 years and/or fines for the above offenses. These criminal provisions are enforced by the DOJ.

### Sender Liability and "Procure" Standard

- **What**: Both the sender and the person who "initiates" the message are liable for CAN-SPAM violations. A person "initiates" a message if they procure the origination of the message or cause the origination of the message. The "procure" standard means that a company can be liable for commercial emails sent by affiliates, contractors, or marketing partners on its behalf.
- **Threshold**: If a company hires an email marketing vendor or has affiliates send emails promoting its products, the company may be jointly liable as the "sender" if the recipients reasonably conclude the email is from the company. Both the "sender" (the entity whose product is promoted) and the "initiator" (the entity that technically sent the message) are responsible for compliance.
- **Consequence**: Companies cannot avoid CAN-SPAM liability by outsourcing email campaigns to third parties. Vendor agreements must include compliance requirements and indemnification provisions.

### Preemption of State Laws

- **What**: CAN-SPAM expressly preempts state laws that regulate the use of electronic mail for commercial purposes, except to the extent that such state laws prohibit falsity or deception in commercial email.
- **Threshold**: State laws that impose opt-in requirements for commercial email or impose requirements beyond CAN-SPAM on commercial email content are preempted. However, state fraud-based claims (e.g., state UDAP claims based on deceptive email content) survive preemption. State laws regulating non-email electronic communications (e.g., text messages) are not preempted.
- **Consequence**: Companies do not need to comply with state-specific commercial email requirements that go beyond CAN-SPAM, but must still comply with state fraud and deception laws applicable to email content.

## Interaction with Other Areas

- **Consumer Protection — TCPA**: Text messages (SMS/MMS) are regulated by the TCPA, not CAN-SPAM. However, commercial messages sent to an email address that routes to a wireless device may trigger both CAN-SPAM and TCPA obligations under FCC wireless domain rules.
- **Consumer Protection — FTC/UDAP**: The FTC enforces CAN-SPAM and may also pursue deceptive email practices under Section 5 of the FTC Act. State UDAP claims based on deceptive email content survive CAN-SPAM preemption.
- **Data Privacy**: Email addresses are personal data under CCPA, GDPR, and other privacy frameworks. CAN-SPAM's opt-out requirements do not satisfy GDPR consent requirements — GDPR requires opt-in consent for marketing emails in most EU jurisdictions. The two frameworks must be harmonized when emailing internationally.
- **Consumer Protection — Dark Patterns**: Opt-out mechanisms that use dark patterns (multi-step unsubscribe flows, guilt-tripping language, confusing UI) may violate CAN-SPAM's requirement for a simple opt-out mechanism.

## Sources

- [15 U.S.C. §§ 7701-7713 — CAN-SPAM Act](https://www.law.cornell.edu/uscode/text/15/chapter-103) — Controlling the Assault of Non-Solicited Pornography and Marketing Act of 2003.
- [16 C.F.R. Part 316 — FTC CAN-SPAM Rule](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316) — FTC implementing regulations defining key CAN-SPAM terms.
- [FTC CAN-SPAM Compliance Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) — FTC practical compliance guidance for businesses.
- [FCC CAN-SPAM Wireless Rules](https://www.fcc.gov/consumers/guides/spam-unwanted-text-messages-and-email) — FCC rules extending CAN-SPAM protections to wireless messaging.
