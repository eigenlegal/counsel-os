# Dissolution and Wind-Down

## Applicability

Load when any of the following arise: voluntary dissolution by board and stockholder/member action, involuntary or judicial dissolution, administrative dissolution or revocation, winding up of entity affairs, creditor notification and claims bar processes, asset distribution in dissolution, revival or reinstatement of dissolved entities, or assignment for benefit of creditors (ABC).

## Key Requirements

### Voluntary Dissolution (Corporations)

- **What**: A corporation may be dissolved voluntarily by action of the board of directors and stockholders, following the statutory procedures of the state of incorporation.
- **Threshold/Timeline**: Under DGCL Section 275: (a) the board must adopt a resolution recommending dissolution and submit it to stockholders, (b) stockholders must approve by a majority of outstanding shares entitled to vote (unless the certificate requires a higher threshold). Alternatively, dissolution can be effected by written consent of all stockholders (DGCL Section 275(c)) without board action. A certificate of dissolution must be filed with the Secretary of State.
- **Consequence**: Dissolution does not terminate the entity immediately. Under DGCL Section 278, a dissolved corporation continues to exist for 3 years after dissolution (or longer if the Court of Chancery so directs) solely for the purpose of winding up, including prosecuting and defending lawsuits, settling debts, and distributing assets. Acts outside the scope of winding up are ultra vires.

### Voluntary Dissolution (LLCs)

- **What**: An LLC may be dissolved by the events specified in its operating agreement, by consent of members, or by judicial decree.
- **Threshold/Timeline**: Under DLLCA Section 18-801, dissolution occurs upon: (a) the occurrence of events specified in the operating agreement, (b) written consent of members as specified in the operating agreement (or, if silent, consent of all members), (c) entry of a judicial decree of dissolution, or (d) administrative dissolution by the Secretary of State. Certificate of cancellation must be filed with the Secretary of State upon completion of winding up.
- **Consequence**: The operating agreement controls the dissolution process for LLCs to a much greater extent than the statute controls for corporations. Absent operating agreement provisions, default statutory rules apply, which may not align with the members' intent.

### Winding Up Process

- **What**: After dissolution, the entity must wind up its affairs -- completing existing business, collecting debts, selling assets, paying creditors, and distributing remaining assets to equity holders.
- **Threshold/Timeline**: Delaware corporations may provide for notice to creditors under DGCL Section 280 (optional safe harbor) or Section 281 (alternative procedure). Section 280 procedure: publish notice of dissolution in a newspaper and mail notice to known creditors, specifying a claims deadline of at least 60 days from the mailing date. Creditors who do not submit claims within the deadline are barred. Section 281(b) allows the corporation to pay or provide for claims without the formal notice process, but with less certainty.
- **Consequence**: Directors who authorize distributions to stockholders without adequately providing for creditor claims face personal liability up to the amount distributed. The 3-year survival period under DGCL Section 278 limits but does not eliminate post-dissolution litigation risk.

### Creditor Notification and Claims Bar

- **What**: Statutory procedures that allow a dissolving entity to establish a deadline for creditor claims, after which unfiled claims are barred.
- **Threshold/Timeline**: DGCL Section 280 (elective safe harbor): (a) mail written notice to known creditors with at least 60 days to present claims, (b) publish notice in a newspaper for unknown creditors with at least 60 days to present claims, (c) offer security to creditors whose claims are contingent, conditional, or unmatured. For LLCs, DLLCA Section 18-804 provides a similar framework. Many states outside Delaware follow comparable procedures under the MBCA (Sections 14.06-14.07), which provides for a 5-year survival period.
- **Consequence**: Proper compliance with the claims bar procedure protects directors and members from personal liability for post-dissolution claims. Failure to follow the procedure leaves the entity (and potentially its directors or members) exposed to claims for the full statutory survival period.

### Asset Distribution Order

- **What**: Upon winding up, assets must be distributed in a mandatory priority order established by statute and the entity's governing documents.
- **Threshold/Timeline**: Standard distribution priority for corporations: (1) secured creditors (to the extent of their security), (2) priority claims (employee wages, taxes), (3) unsecured creditors, (4) preferred stockholders (per liquidation preference terms in the charter), (5) common stockholders (pro rata). For LLCs, the operating agreement controls distribution order, subject to DLLCA Section 18-804: (1) creditors (including members who are creditors), (2) members for prior distributions owed, (3) members for capital contributions, (4) members per operating agreement (or pro rata if silent).
- **Consequence**: Distributions to equity holders before all creditors are satisfied expose directors, officers, and managers to personal liability. Fraudulent conveyance laws (state UVTA and federal bankruptcy law) provide additional protections for creditors, with look-back periods of 2-6 years depending on the jurisdiction and theory.

### Administrative Dissolution and Revival

- **What**: A state may administratively dissolve or revoke an entity's authority for failure to comply with statutory requirements, most commonly failure to pay franchise taxes or file annual reports.
- **Threshold/Timeline**: Delaware: failure to pay franchise tax results in voiding of the entity's charter. Reinstatement requires payment of all back taxes, penalties, and interest, plus a reinstatement fee. The reinstatement fee is $375 for corporations. Back taxes accrue from the date of voiding. California: suspension for failure to file returns or pay minimum franchise tax ($800/year). Revival requires filing all delinquent returns and paying all taxes, penalties, and interest.
- **Consequence**: A voided or suspended entity generally cannot maintain lawsuits, enter into contracts, or conduct business. In Delaware, reinstatement under DGCL Section 312 is retroactive -- the entity is treated as if it had never been voided, validating acts taken during the voided period. However, rights of third parties that vested during the voided period may be protected.

### Involuntary (Judicial) Dissolution

- **What**: A court may order dissolution of an entity upon petition by stockholders, members, creditors, or the state, based on statutory grounds.
- **Threshold/Timeline**: Common grounds: (a) deadlock among directors or members that cannot be resolved and is causing irreparable harm (DGCL Section 226 -- appointment of custodian; Section 273 -- dissolution of joint venture corporation), (b) fraud, mismanagement, or abuse of authority by those in control, (c) impracticability of continuing the business. Under the MBCA (Section 14.30), a stockholder may petition when directors are deadlocked, acts of the directors are illegal/oppressive/fraudulent, or corporate assets are being misapplied.
- **Consequence**: Judicial dissolution is a drastic remedy that courts grant reluctantly. Courts often prefer appointing a custodian or provisional director (DGCL Section 226) before ordering dissolution. In closely held corporations, courts may order a buyout of the petitioning stockholder as an alternative to dissolution.

### Assignment for Benefit of Creditors (ABC)

- **What**: A state-law alternative to federal bankruptcy in which the entity transfers all assets to an assignee (trustee) who liquidates them and distributes proceeds to creditors. Common for startups and technology companies as a faster, cheaper alternative to Chapter 7 bankruptcy.
- **Threshold/Timeline**: Available under state law (e.g., California CCP Sections 493.010-493.060, Delaware common law). No court filing required (in most states). The assignee takes possession of all assets, provides notice to creditors, and distributes proceeds. Typical timeline: 6-18 months. Board approval required; stockholder approval may not be required if characterized as winding up rather than a sale of substantially all assets.
- **Consequence**: Unlike federal bankruptcy, ABCs do not provide an automatic stay against creditor actions. ABCs do not discharge debts of the entity or its guarantors. Secured creditors retain their lien rights. ABCs are not available to entities with significant federal tax liabilities (IRS can force the matter into federal bankruptcy).

## Interaction with Other Areas

- **Employment**: WARN Act obligations (60-day notice for plant closings or mass layoffs of 100+ employees) apply to entity wind-downs. Final wage payment timing requirements vary by state (California: immediately upon termination). COBRA continuation coverage must be offered.
- **Data Privacy**: Disposition of personal data during wind-down must comply with applicable privacy laws (GDPR Article 17 right to erasure, CCPA consumer rights). Data must be properly destroyed or transferred to a successor in compliance with privacy policies.
- **Securities**: Dissolution may trigger registration or exemption requirements for distributions of non-cash assets. Investor rights agreements may contain consent requirements for dissolution (protective provisions).
- **Litigation**: Dissolved entities retain the right to prosecute and defend lawsuits during the statutory survival period. Claims not filed within the claims bar period may be extinguished.
- **Tax**: Dissolution triggers final tax return obligations (federal and state). Asset distributions may result in gain recognition at both the entity and owner level. Tax clearance certificates may be required before final dissolution in some states.

## Sources

- [DGCL Sections 275-283 -- Dissolution](https://delcode.delaware.gov/title8/c001/sc10/index.html) -- statutory framework for corporate dissolution in Delaware
- [DGCL Section 312 -- Reinstatement](https://delcode.delaware.gov/title8/c003/index.html) -- revival of voided corporations
- [DLLCA Section 18-801 to 18-806 -- LLC Dissolution](https://delcode.delaware.gov/title6/c018/sc08/index.html) -- LLC dissolution and winding up
- [MBCA Sections 14.01-14.40 (Cornell LII)](https://www.law.cornell.edu/uniform/vol7#702) -- model provisions for corporate dissolution adopted in most states
- [California Corporations Code Section 1900-2011](https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?tocCode=CORP&division=1.&title=1.&part=&chapter=19.&article=) -- California voluntary and involuntary dissolution procedures
