# read

Read and understand a document.

---

## When to use

- A document has been provided (file path, URL, or pasted text)
- User says "review this", "look at this contract", "what's in this document"
- Starting any document-based legal work

## Consults

- The document itself (the primary input)
- `/counsel-os:browse` skill if the input is a URL

## Produces

Structured understanding of the document:
- Parties and their roles
- Defined terms
- Clause inventory (what provisions exist and where)
- Key dates (effective date, term, deadlines)
- Commercial terms (fees, payment, SLAs)
- Whether tracked changes or comments are present

---

## Instructions

### Accept the input

Determine what you're working with:

- **File path** — a contract, agreement, policy, or legal document. Proceed to format detection.
- **URL** — a link to a document in a data room, portal, or web page. Use `/counsel-os:browse` to extract it, then proceed.
- **Pasted text** — contract text or clauses pasted directly into the conversation. Capture and proceed.
- **Description only** — a verbal description without a document (e.g., "we need to draft an NDA for Acme"). No document to read — skip this primitive. The LLM proceeds directly to research or draft based on the request.

### Format detection and extraction

| Format | Method |
|--------|--------|
| `.docx` | **Word extraction** — see below |
| `.pdf` | Use the Read tool directly (native PDF support) |
| `.txt`, `.md`, `.rtf` | Use the Read tool directly |
| `.doc` (legacy) | Ask the user to convert to `.docx` or `.pdf` first |

### Word document extraction (.docx)

Word documents are the primary medium for contract negotiation. Tracked changes contain negotiation history. Comments hold context from counterparty counsel. **Always extract tracked changes and comments — do not extract only the accepted text.**

**Primary method — pandoc:**

```bash
pandoc --track-changes=all -f docx -t markdown "<file_path>"
```

This renders tracked changes and comments inline:
- Insertions: `{++inserted text++}`
- Deletions: `{--deleted text--}`
- Comments: `{>>comment text<<}`

If pandoc is not installed:
> I need `pandoc` to extract tracked changes and comments from Word documents. Install it with `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux), then try again.

**Fallback — unzip + XML parsing** (if pandoc unavailable and user cannot install it):

```bash
unzip -o "<file_path>" word/document.xml word/comments.xml -d /tmp/docx-extract 2>/dev/null
```

Then read the XML files:
- `word/document.xml` — `<w:ins>` blocks (insertions), `<w:del>` blocks (deletions)
- `word/comments.xml` — `<w:comment>` elements with author, date, and text
- `<w:commentRangeStart>` / `<w:commentRangeEnd>` — comment anchors in the document

### Understand the document

After extracting the text, identify:

1. **Parties.** Who are the parties? What are their roles (vendor, customer, partner, licensor, licensee)? Which entity is ours? Which is the counterparty?

2. **Defined terms.** What key terms are defined? Note any that are unusual, overly broad, or missing.

3. **Clause inventory.** What provisions are in the document? Map each section to a clause type (limitation of liability, indemnification, confidentiality, IP ownership, termination, governing law, etc.). This inventory is what evaluate uses to work through the document.

4. **Key dates.** Effective date, term/expiration, renewal dates, notice deadlines, milestone dates.

5. **Commercial terms.** Fees, payment terms, pricing structure, SLAs, deliverables, acceptance criteria.

6. **Tracked changes and comments.** Report to the user:
   - Whether tracked changes were found, with count of insertions/deletions
   - Whether comments were found, with count and authors
   - If neither was found, note that explicitly so the user knows it was checked

### Gather context

If the document doesn't make certain things obvious, ask targeted questions. Do NOT ask all of these — infer what you can:

1. **Which side are we on?** Often clear from the document and the user's identity in profile.md.
2. **Urgency?** Timeline or signing deadline.
3. **Focus areas?** Specific clauses to prioritize, or full review.
4. **Deal context?** New relationship or existing counterparty? Deal value?

Be efficient. If the document clearly shows we're reviewing a vendor's agreement as the customer, don't ask — confirm your understanding and move on.
