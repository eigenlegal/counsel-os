---
counsel-os-type: practice
content-version: "2026-06-10"
---
# Force Majeure — Clause Library

## Force Majeure Events

### Standard
> Neither party shall be liable for any failure or delay in performing its obligations under this Agreement (other than payment obligations) to the extent such failure or delay results from a Force Majeure Event. "Force Majeure Event" means any event beyond a party's reasonable control, including acts of God, natural disasters, fire, flood, earthquake, epidemic or pandemic, war, terrorism, civil unrest, government actions or orders, labor disputes (other than those involving the affected party's own employees), power failures, internet or telecommunications failures, or cyberattacks of a severity and nature that could not be reasonably prevented by industry-standard security measures.

### Aggressive (Customer-Favorable)
> Neither party shall be liable for failure or delay caused by a Force Majeure Event, except that Force Majeure shall not excuse: (a) any payment obligation; (b) any obligation that could be performed through reasonable alternative means; (c) any data protection, confidentiality, or security obligation; or (d) any obligation to the extent the affected party failed to implement and maintain a reasonable business continuity plan. "Force Majeure Event" means acts of God, natural disasters, war, terrorism, government orders, and pandemic, but shall not include: (i) general economic conditions, market fluctuations, or financial difficulties; (ii) changes in law or regulation foreseeable at execution; (iii) failures of the affected party's suppliers or sub-contractors unless caused by a qualifying event; or (iv) cyberattacks or system failures attributable to the affected party's failure to maintain industry-standard security.

### Vendor-Favorable
> Vendor shall not be liable for any failure or delay in providing the Services to the extent caused by events beyond Vendor's reasonable control, including but not limited to acts of God, natural disasters, pandemics, epidemics, government actions, war, terrorism, cyberattacks, denial-of-service attacks, internet disruptions, power outages, telecommunications failures, third-party service provider failures, labor disputes, and supply chain disruptions. During any Force Majeure Event, Vendor's SLA obligations and service credit obligations shall be suspended.

### Minimum Acceptable
> Neither party shall be liable for delays or failures caused by events beyond its reasonable control, including natural disasters, war, terrorism, pandemics, and government actions, provided the affected party gives prompt notice and uses reasonable efforts to mitigate.

### Notes
Vendor-Favorable language suspending SLA and service credit obligations during force majeure and including broad triggers like "third-party service provider failures" and "supply chain disruptions" creates significant accountability gaps. Push for narrow, enumerated triggers and ensure data protection obligations are not excused. Cyberattacks should only qualify if they exceeded industry-standard defenses.

## Notice and Mitigation

### Standard
> The party claiming Force Majeure shall provide the other party with prompt written notice, including the nature of the event, its expected duration, and the steps being taken to mitigate its effects. The affected party shall use commercially reasonable efforts to resume performance as soon as practicable and shall provide regular updates on the status of the Force Majeure Event.

### Aggressive (Customer-Favorable)
> The affected party shall provide written notice within forty-eight (48) hours of becoming aware of the Force Majeure Event, including: (a) the nature and scope of the event; (b) the obligations affected; (c) the expected duration; (d) specific mitigation measures being implemented; and (e) the party's business continuity plan activation status. The affected party shall use best efforts to resume performance and shall provide written updates at least weekly. Failure to provide timely notice shall waive the right to invoke Force Majeure for the period prior to notice.

### Vendor-Favorable
> The affected party shall provide notice of a Force Majeure Event as soon as reasonably practicable. The affected party shall use reasonable efforts to mitigate the effects and resume performance, but shall not be required to incur material additional expense to do so.

### Minimum Acceptable
> The affected party shall notify the other party promptly of a Force Majeure Event and shall use reasonable efforts to mitigate its impact and resume performance.

### Notes
Vendor-Favorable language with no specific notice timeline and no obligation to incur expense to mitigate allows open-ended performance excusal. Push for specific notice deadlines and meaningful mitigation obligations. The Aggressive version with a 48-hour notice requirement and weekly updates ensures visibility.

## Termination Rights

### Standard
> If a Force Majeure Event continues for more than sixty (60) days, either party may terminate the affected Services or the Agreement upon thirty (30) days' written notice. Upon such termination, Vendor shall refund all prepaid fees for Services not rendered during the Force Majeure period and any prepaid fees for the unused portion of the Term.

### Aggressive (Customer-Favorable)
> If a Force Majeure Event continues for more than thirty (30) days, Customer may terminate the affected Services immediately upon written notice. Vendor shall refund all prepaid fees for the Force Majeure period and the unused portion of the Term. Customer shall also be entitled to transition assistance for thirty (30) days at no additional charge. If the Force Majeure Event affects only Vendor, Customer may terminate even if the event lasts fewer than thirty (30) days if Customer determines in good faith that continued delay will cause material harm to Customer's business.

### Vendor-Favorable
> If a Force Majeure Event continues for more than one hundred eighty (180) days, either party may terminate the affected Services upon sixty (60) days' notice. Vendor shall refund prepaid fees for Services not rendered during the Force Majeure period on a pro-rata basis. Neither party shall have any further liability to the other arising from such termination.

### Minimum Acceptable
> If a Force Majeure Event continues for more than ninety (90) days, either party may terminate the affected Services and Vendor shall refund prepaid fees for Services not rendered.

### Notes
Vendor-Favorable language with a 180-day threshold before termination and a 60-day notice period means the customer could wait 8 months for resolution before exiting. Push for a 60-day threshold at most. Ensure the refund covers the full Force Majeure period, not just the post-notice period. Transition assistance should be available regardless of the cause of termination.

## Pandemic-Specific Provisions

### Standard
> A pandemic or epidemic declared by the World Health Organization or a national health authority shall constitute a Force Majeure Event only during the initial period of uncertainty and government-mandated restrictions. Once reasonable accommodations become available (such as remote work, alternative supply chains, or adjusted processes), the affected party shall implement such accommodations and resume performance. A party shall not invoke pandemic as Force Majeure for obligations that can be performed remotely.

### Aggressive (Customer-Favorable)
> A pandemic declared by the WHO or national authority shall constitute a Force Majeure Event only to the extent it directly prevents performance despite the affected party's implementation of reasonable business continuity measures, including remote work capabilities. Vendor represents that it maintains a business continuity plan that addresses pandemic scenarios and that the Services are designed to be delivered without material in-person interaction. Vendor may not invoke pandemic as Force Majeure for any cloud-hosted or remotely deliverable Service.

### Vendor-Favorable
> Pandemics, epidemics, and public health emergencies (including government-imposed quarantines, travel restrictions, and workplace closures) shall constitute Force Majeure Events for the duration of such events and any resulting disruptions. Vendor's obligations shall be adjusted as reasonably necessary during any pandemic-related disruption.

### Minimum Acceptable
> A pandemic shall constitute a Force Majeure Event to the extent it directly prevents performance despite commercially reasonable mitigation efforts.

### Notes
Post-COVID, vendors can no longer credibly claim pandemics are unforeseeable. Vendor-Favorable language treating the entire duration of a pandemic as force majeure with obligation "adjustments" is overbroad, especially for cloud-based services that should be remotely deliverable. Push for narrow pandemic provisions that account for modern remote work capabilities.

## Cyber Event Provisions

### Standard
> A cyberattack shall constitute a Force Majeure Event only if: (a) the attack is of a scale, sophistication, or nature that could not reasonably have been prevented by industry-standard security measures and controls; and (b) the affected party maintained security measures consistent with the standards required under this Agreement at the time of the attack. The affected party shall provide notice within twenty-four (24) hours, including the nature of the attack and its impact on Services. The affected party's data protection and breach notification obligations shall not be excused by a cyber-related Force Majeure claim.

### Aggressive (Customer-Favorable)
> A cyberattack or cybersecurity incident shall not constitute a Force Majeure Event. Vendor's obligation to protect Customer Data, maintain security controls, and comply with breach notification requirements shall apply regardless of the cause or source of the security incident. If a cyberattack renders the Services unavailable, such unavailability shall be treated as Downtime subject to the SLA provisions, and Vendor shall activate its disaster recovery plan within the timeframes specified in this Agreement.

### Vendor-Favorable
> Cyberattacks, ransomware, denial-of-service attacks, and other malicious acts by third parties shall constitute Force Majeure Events, and Vendor's performance obligations (including SLA commitments, service credit obligations, and data availability guarantees) shall be suspended during the duration of such events and a reasonable recovery period. Vendor shall use reasonable efforts to restore the Services but shall not be liable for data loss or service disruption caused by such attacks.

### Minimum Acceptable
> A cyberattack shall constitute a Force Majeure Event only if it could not reasonably have been prevented by the security measures required under this Agreement. Data protection and breach notification obligations shall not be excused.

### Notes
Vendor-Favorable language treating all cyberattacks as force majeure and suspending SLA, service credits, and data availability commitments is a significant risk transfer. In most cases, vendors should be accountable for their own cybersecurity posture. Push for the cyber force majeure qualification to require that the vendor maintained the security standards required by the agreement. Data protection obligations should never be excused by a force majeure claim.

## Data Protection Carve-Out

### Standard
> Notwithstanding any other provision of this Force Majeure section, a Force Majeure Event shall not relieve either party of its obligations with respect to: (a) the protection, security, and confidentiality of Personal Data and Customer Data; (b) compliance with breach notification requirements under this Agreement and applicable Data Protection Laws; (c) compliance with data subject rights obligations; and (d) maintenance of encryption and access controls for stored Personal Data. If a Force Majeure Event prevents a party from performing its full data protection obligations, such party shall implement all reasonably available alternative measures to protect Personal Data and shall notify the other party immediately of any reduced data protection capability.

### Aggressive (Customer-Favorable)
> No Force Majeure Event shall excuse, delay, or modify either party's obligations under the Data Processing Agreement, Business Associate Agreement, or any data protection, privacy, security, confidentiality, or breach notification provisions of this Agreement. Without limiting the foregoing, regardless of any Force Majeure Event, Vendor shall continue to: (a) maintain all technical and organizational security measures required by this Agreement; (b) comply with all breach notification timelines; (c) facilitate data subject rights requests within required timeframes; (d) maintain encryption of Personal Data at rest and in transit; (e) restrict access to Personal Data to authorized personnel only; (f) comply with all applicable Data Protection Laws; and (g) maintain and execute its disaster recovery plan as it pertains to the availability and integrity of Personal Data. If Vendor cannot maintain its full security posture during a Force Majeure Event, Vendor shall immediately notify Customer and, at Customer's election, return or securely isolate all Customer Personal Data within forty-eight (48) hours.

### Vendor-Favorable
> Vendor shall use commercially reasonable efforts to maintain the security of Customer Personal Data during a Force Majeure Event. However, Vendor's data protection obligations, including SLA-related data availability commitments and breach notification timelines, shall be adjusted as reasonably necessary during the Force Majeure Event and a reasonable recovery period. Vendor shall not be liable for any unauthorized access to or loss of Customer Personal Data to the extent caused by a qualifying Force Majeure Event.

### Minimum Acceptable
> Force Majeure shall not excuse either party's data protection, security, confidentiality, or breach notification obligations under this Agreement or applicable law.

### Notes
This is one of the most critical provisions in the force majeure section. Data protection obligations are regulatory in nature (GDPR, CCPA, HIPAA) and cannot be excused by contract -- a force majeure clause that purports to suspend data protection obligations does not suspend the underlying regulatory requirement. Vendor-Favorable language adjusting breach notification timelines and disclaiming liability for data loss during force majeure events creates regulatory exposure for Customer. Push for an absolute carve-out: data protection obligations are never excused by force majeure, full stop. The Aggressive version's 48-hour data return/isolation right gives Customer a meaningful exit when Vendor's security posture is compromised.

## Partial Performance

### Standard
> During a Force Majeure Event, the affected party shall continue to perform its obligations under this Agreement to the extent reasonably possible and shall use commercially reasonable efforts to mitigate the impact of the Force Majeure Event. If Vendor can only partially perform the Services, Vendor shall: (a) allocate its available capacity among its customers in a fair, non-discriminatory manner (and not in a manner that disproportionately favors Vendor's own operations or larger customers); (b) prioritize the protection and availability of Customer Data; (c) provide Customer with notice of which Services are affected and which remain available; and (d) proportionally reduce fees for the period during which Services are partially unavailable. Vendor shall not redirect resources from affected Services to develop new products or features during the Force Majeure Event.

### Aggressive (Customer-Favorable)
> During any Force Majeure Event, Vendor shall continue to perform all obligations to the maximum extent possible using reasonable alternative means, including activating disaster recovery infrastructure, engaging backup service providers, and reallocating personnel. If Vendor cannot fully perform, Vendor shall: (a) allocate capacity among affected customers proportionally based on their contracted service levels and fees, without preference to Vendor's own operations, affiliated entities, or any other customer; (b) prioritize, in order: (i) the security and integrity of Customer Data, (ii) business-critical Services identified in the applicable SOW, and (iii) remaining Services; (c) provide daily written updates detailing which Services are affected, remaining capacity, expected restoration timeline, and mitigation measures; and (d) credit Customer's account for the full fees attributable to any Services that are unavailable or materially degraded, calculated on a daily pro-rata basis, regardless of whether the unavailability exceeds the SLA threshold. Customer shall not be required to pay fees for Services not received during the Force Majeure Event. Vendor's failure to allocate capacity fairly or to prioritize Customer Data protection shall constitute a material breach not excused by Force Majeure.

### Vendor-Favorable
> During a Force Majeure Event, Vendor shall use reasonable efforts to continue performing the Services. Vendor may, in its sole discretion, prioritize and allocate its available resources among its customers and its own operations as it deems appropriate. Customer shall continue to pay all fees during any partial performance period. Vendor shall not be required to incur material additional costs to maintain or restore Services during a Force Majeure Event.

### Minimum Acceptable
> During a Force Majeure Event, the affected party shall perform to the extent reasonably possible. Vendor shall allocate available capacity fairly among customers and shall proportionally reduce fees for any Services not provided.

### Notes
Partial performance provisions are often overlooked but critically important -- most force majeure events reduce rather than completely eliminate a vendor's capacity. Vendor-Favorable language giving Vendor sole discretion to allocate resources while requiring continued full payment is one-sided. Push for fair allocation, fee adjustments, and Customer Data prioritization. The "no material additional costs" limitation in the Vendor-Favorable version excuses Vendor from activating disaster recovery or engaging backup providers -- precisely the measures that should be required during a force majeure event. The Aggressive version's prohibition on redirecting resources to new development during the force majeure event prevents Vendor from using the event as an excuse to deprioritize existing customer commitments.

## Supply Chain Disruptions

### Standard
> A failure of Vendor's suppliers, sub-processors, hosting providers, or other third-party service providers shall constitute a Force Majeure Event only if: (a) the supplier's failure is itself caused by an event that would independently qualify as a Force Majeure Event under this Agreement; and (b) Vendor has taken commercially reasonable steps to maintain alternative sources, backup providers, or redundant systems, and such alternatives are also affected by the qualifying event. Vendor shall not invoke Force Majeure for supplier failures that result from Vendor's failure to diversify its supply chain, Vendor's failure to maintain contractual protections with its suppliers, or supplier insolvency, business failure, or commercial disputes. Vendor shall maintain business continuity plans that address key supplier dependencies and shall identify critical single-source dependencies to Customer upon request.

### Aggressive (Customer-Favorable)
> Vendor's supplier, sub-contractor, sub-processor, or third-party service provider failures shall not constitute Force Majeure Events under any circumstances. Vendor is responsible for managing its supply chain and shall not pass through to Customer the consequences of Vendor's supplier selection, contracting, or management decisions. Vendor represents that it maintains: (a) alternative or backup providers for all critical service components, including hosting, infrastructure, and data processing; (b) contractual protections with its suppliers sufficient to ensure continuity of the Services; and (c) a tested business continuity plan that addresses supplier failure scenarios. If a Vendor supplier failure prevents performance, such failure shall be treated as a Vendor service outage subject to the SLA provisions, and Vendor shall activate its disaster recovery plan within the timeframes specified in this Agreement.

### Vendor-Favorable
> Failures of Vendor's third-party suppliers, hosting providers, cloud infrastructure providers (including AWS, Azure, Google Cloud), sub-processors, telecommunications providers, and other service providers shall constitute Force Majeure Events. Vendor shall use reasonable efforts to restore the Services but shall not be liable for delays or failures caused by the acts, omissions, or failures of its suppliers. Customer acknowledges that the Services depend on third-party infrastructure and that Vendor cannot guarantee uninterrupted availability of such infrastructure.

### Minimum Acceptable
> Vendor's supplier failures shall constitute a Force Majeure Event only if the supplier's failure was itself caused by an independently qualifying Force Majeure Event and Vendor had taken reasonable steps to mitigate supplier dependencies.

### Notes
Supply chain provisions are where the force majeure clause can become a blanket performance excuse. Vendor-Favorable language treating all third-party provider failures (including major cloud providers) as force majeure essentially transfers Vendor's infrastructure risk to Customer. This is particularly problematic because Vendor chose its suppliers and is in the best position to manage those relationships. The Aggressive position (supplier failures never qualify) reflects the principle that vendors should bear the risk of their own supply chain. The Standard middle ground (supplier failures qualify only if caused by an independent qualifying event and Vendor maintained alternatives) is the most balanced approach. Always push Vendor to identify critical single-source dependencies and maintain tested business continuity plans.
