# The matter page — design directions

**Date:** 2026-09-02 · **Status:** mockups for founder review, nothing built. Mocks and renders in `img-matter/` (`mock-matter.html` busy, `mock-matter-fresh.html` fresh; `matter*.png` light, dark, narrow).

## What it is

A matter is the lawyer's unit of work; today it is one markdown file in the reader and a row on Home. The page (`#/matter?path=…`) reorganizes everything the app already knows about a matter around the job, in this order, top to bottom:

1. **Next action** first, as one serif sentence under a run-in, with the action counsel can take on it ("Ask counsel to draft the cover email") and quiet `mark done · edit`. It comes from the matter note's `next_action` (or its "Next action" section).
2. **The facts ledger** in the reader's label → value style: client, counterparty, stage, type, opened, updated, stays local, law areas. Two independent column flows; one column when narrow.
3. **Deadlines** for this matter from the docket sweep: date, what, where it came from, and "in N days"; overdue and imminent dates in amber.
4. **Documents** in the matter folder: filename in mono, kind as a small-caps word (Word · from Lerner, redline, note), updated, and the actions as text: `review` (accent), `redline`, `compare with…`; a produced redline sits under its source with `↳`, offering `open · download`. Drop a Word file anywhere on the page to add it.
5. **Conversations** explicitly linked to the matter, newest first, each with the first line of its last answer.
6. **What changed lately**: the matter log's latest entries as a dated ledger, with "the whole log" a link.
7. **The matter note** itself, readable inline in the reader's type with its outline on the right, and "edit in the reader".
8. **A matter-scoped ask box**, sticky at the bottom: a `MATTER · <title>` line, attachments default to this folder, and "This matter stays on this machine · answering on Ollama" when the policy is on.

Where it hangs: Home's matter rows and the vault tree's matter rows open this page (the raw note stays one link away); the thread header's MATTER line opens it; the reader is unchanged for every other file.

## Three decisions for the founder

1. **Next action above the facts.** The page leads with what to do, not with the ledger. The alternative is facts first (like the reader). The mock argues the lawyer opens a matter to act, and the facts are one glance below.
2. **The note stays on the page, below the ledgers, not in a tab.** It makes the page long on a busy matter (the outline mitigates), but keeps one scroll and no second place to look. The alternative is a "Note" tab or the reader alone with a summary strip up top.
3. **Documents are the folder, curated by kind, with actions inline.** Redlines nest under their source; notes are listed but quiet; "compare with…" offers the other Word files in the folder. The alternative is a plain file list with the actions only in the reader. Inline actions make the hero flow (drop → review → redline → download) two clicks from the matter, which is the point of the page.

## Notes from the render

- At 1440 the outline sits to the right of the 920px column; below ~1240 it hides, as the reader's does.
- At 1000 the head wraps its meta under the title, the facts go to one column, and the document rows wrap their actions onto a second line.
- Dark mode uses the same tokens; the amber deadline reads at 4.5:1 on the dark ground.
- Sample content: the Sinai × Lerner matter's real note text for the busy state (read-only from the founder's vault); deadlines and conversation summaries there are illustrative. The fresh state is the first-run sample matter.
