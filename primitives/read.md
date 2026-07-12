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

7. **Mechanical QA (run last, on a full review).** Before concluding a full document review, run the deterministic checker (see `## --qa`) and fold any `error`-severity findings into your report. These are the tedious mechanical defects — dangling cross-references, exhibits named but not attached, defined-but-unused terms, party-name drift — that survive careful reading and are cheap to catch deterministically.

---

## --redline

Structured ingestion of a **returned markup** — the counterparty (or a colleague) sent back a `.docx` with tracked changes and comments, and the goal is a change-by-change assessment and response, not just visibility. (For a quick read, the pandoc inline method above is still fine; this mode is for working the document.)

### Instructions

1. **Extract structured changes:**
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/extract_redlines.py" "<file>" --format json
   ```
   Each change record carries the paragraph's original (reject-all) vs revised (accept-all) text, the inserted/deleted fragments, author and date, section context, and the IDs of comments anchored in that paragraph; the `comments` array carries the comment text. `--format markdown` renders a human-readable review table.

2. **Classify every change against the effective position.** For each change: identify the clause type → assemble the effective position (the procedure in counsel/SKILL.md) → classify:
   - **ACCEPT** — within the effective position
   - **COUNTER** — outside the position; draft specific counter-language (draft --counter-language)
   - **ESCALATE** — hits an always-escalate trigger from profile.md or a law/ floor
   - **CLARIFY** — intent unclear; the anchored comment often explains the ask — address comments explicitly, they are negotiation asks, not decoration

3. **Hunt the silent movers.** Flag any substantive change that is NOT explained by a comment or the cover email — definition edits, scope words in remote sections, deleted carve-outs. Changes the counterparty didn't draw attention to deserve more scrutiny, not less.

4. **Produce the delta report:** a table — section, what changed, their stated rationale (from comments), classification, our response — ordered Tier 1 first, with the silent movers flagged.

5. **Log the round to the matter** (`remember --matter`): what they conceded, what they pushed back on, what we're countering, and any comment that reveals their constraints. Negotiation history is what makes the next round start ahead.

6. **Respond:** feed COUNTER items into draft --counter-language / --redline against the counterparty's latest version.

### Round comparison

When the matter file shows a prior round was sent, do not read the incoming markup in isolation — diff it against what we sent:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/diff_rounds.py" --ours "<the version we sent, from the matter's Generated Outputs>" --theirs "<the incoming docx>" --base "<the pre-edit baseline, when the matter has it>" --format json
```

The report classifies the fate of every counter from our last round: **ACCEPTED** (our language survived), **REVERTED** (back to their text), **MODIFIED** (replaced with something new), **NEW** (fresh asks in paragraphs we never touched). Pass `--base` whenever the round N-1 baseline exists — without it, silent acceptances are invisible and unattributable edits surface as UNMATCHED_CHANGE. Fold the classifications into the delta report (step 4) — a REVERTED counter is a live dispute, not a new change — and log the round outcome per classification to the matter (step 5).

---

## --qa

Mechanical document QA — a deterministic linter over a draft that catches the tedious defects a careful read still misses: a cross-reference to a section that was renumbered away, an exhibit named in the body but never attached, a term defined once and never used, a party named three different ways. Live evidence: a counterparty audit contract named three entities that don't exist, caught only because a human happened to look. This is pure mechanical tedium — do it with a script, spend judgment on judgment.

### When to run

- **Automatically as the last step of a full document review** (`### Understand the document`, step 7).
- **On request** — "QA this", "check the references/definitions/exhibits", "did I break any cross-references?"
- **After applying redlines**, before generating the send-out version (the numbering/cross-reference part of redline-output.md's pre-send verification is this check).

### Instructions

1. **Run the checker** over the draft (`.docx`, `.md`, or `.txt`):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/check_document.py" "<file>" --json
   ```
   It emits `{summary, notes, findings}`. Each finding has a `type`, a `severity`, a `message`, and the paragraph/line `locations` where it occurs. Drop `--json` for a human-readable grouped report. On a `.docx` it checks the **accept-all** view (tracked insertions kept, deletions dropped) — the document as it will read once changes are accepted.

2. **Severity tiers — surface accordingly:**
   - `error` — high-confidence mechanical defect (**undefined_reference** — a cross-ref with no matching section/article; **missing_exhibit** — an exhibit/schedule referenced but not attached). Report these plainly; they are almost always real.
   - `warning` — likely worth a look (**unused_definition**, **capitalization_drift** on a multi-word defined term, **party_name_drift**). Surface with light judgment.
   - `info` — heuristic (**undefined_term** — a phrase capitalized like a defined term with no definition). Mention only if it looks substantive; these need your judgment.

3. **Read the `notes`.** If the checker reports that section numbers are auto-generated (Word numbering rather than typed into the text), the cross-reference check was skipped to avoid false positives — say so, and offer to re-check after numbering is converted to text or changes are accepted.

4. **This is a linter, not a lawyer.** It reports mechanical inconsistencies; you decide what matters and fold the real ones into the review. It does not read for legal substance — that is the rest of read + evaluate.

---

### Gather context

If the document doesn't make certain things obvious, ask targeted questions. Do NOT ask all of these — infer what you can:

1. **Which side are we on?** Often clear from the document and the user's identity in profile.md.
2. **Urgency?** Timeline or signing deadline.
3. **Focus areas?** Specific clauses to prioritize, or full review.
4. **Deal context?** New relationship or existing counterparty? Deal value?

Be efficient. If the document clearly shows we're reviewing a vendor's agreement as the customer, don't ask — confirm your understanding and move on.
