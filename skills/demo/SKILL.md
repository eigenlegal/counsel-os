---
name: demo
description: "See Counsel OS work in a few minutes. Two parts: (1) a capability guide — what Counsel OS can do, each with the exact command to try it (review/redline a contract, assess a DPA, remember a decision, recall a position, retro, doctor); (2) one offered live showpiece — review a bundled synthetic NDA against YOUR OWN seeded positions and produce a verdict plus a native Word tracked-changes redline (markdown fallback off macOS). Read-only to your practice: the demo NEVER writes to your vault — the sample file is synthetic and every artifact goes to a disposable scratch folder. Run it right after /counsel-os:setup. Use when a user says 'show me how it works', 'give me a demo', 'what can this do', or right after onboarding."
when_to_use: "Trigger phrases: 'run the demo', 'show me how it works', 'what can Counsel OS do', 'give me a demo', 'see it work', or immediately after /counsel-os:setup finishes."
---

# Demo — See Counsel OS Work

You are giving the user a short, honest look at what Counsel OS can do. There are two parts: a **capability guide** (what it does, with the exact command for each), and one **offered live showpiece** (review a bundled synthetic NDA against the user's own seeded positions, then produce a redline). Keep it tight — this is a first impression, not a tutorial.

## Hard rules (do not break these)

- **Zero writes to the user's vault.** The demo never creates a matter, never calls the `remember` primitive, and never writes, edits, or deletes anything under `{legal_root}`. After the demo, the vault must be byte-for-byte what it was before. This is a founder-level rule.
- **The sample document is synthetic.** Use only the bundled `assets/sample-mutual-nda.docx` (and its markdown twin). Never substitute a real matter, a real counterparty, or anything from the user's vault.
- **All artifacts go to a disposable scratch folder** outside the vault (see Step 2). Nothing the demo produces lands in the practice tree.
- **Describe, don't fabricate.** The capability guide explains real commands; it does not invent matters, history, or facts.

## Step 0: Resolve capabilities and the legal root

First, find the user's legal root — the showpiece reviews the NDA against *their* positions, so a configured practice must exist.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve_legal_root.sh"
```

- **Exit `0`** → stdout is `{legal_root}`. Continue.
- **Non-zero** → no practice is configured yet. Do **not** run the showpiece against nothing. Say:

  > Counsel OS reviews documents against *your* standards, so let's set those up first — it takes about three minutes. Run **`/counsel-os:setup`**, then come back and run **`/counsel-os:demo`** again.

  Then stop.

Also detect, quietly, what the redline showpiece will be able to produce (used in Step 3):

- **python-docx:** `python3 -c "import docx"` exits 0
- **Microsoft Word (macOS):** `/Applications/Microsoft Word.app` exists
- **User name:** `{legal_root}/practice/profile.md` has a real name (not a bracket placeholder)

Do not narrate these checks. Just use the result to pick the redline tier in Step 3.

## Part 1 — Capability guide

Show the user a compact menu of what Counsel OS can do, each with the **exact command to try it**. Present it as a short list, not a wall of text. Adapt the wording to the user, but keep every invocation accurate:

> **What Counsel OS can do** — each of these is one command away:
>
> - **Review or redline a contract** — *"review this NDA"* or *"redline this MSA against our positions"*. Counsel OS reads the document, classifies each clause green/yellow/red against your standards, and (on macOS with Word) produces a native tracked-changes redline.
> - **Assess a DPA / privacy terms** — *"does this DPA meet GDPR Article 28?"*. It checks the processing terms against the applicable law and your data-protection position.
> - **Answer a legal question with your context** — *"can we accept a 2-year confidentiality term?"*. It answers from your standards and the law library, not generic boilerplate.
> - **Remember a decision** — *"remember that our data-deletion window is 30 days"*. It records the decision into your practice so future reviews use it.
> - **Recall a position** — *"what's our position on limitation of liability?"*. It reads it straight back from your standards.
> - **Practice analytics** — **`/counsel-os:retro`** surfaces matter and counterparty trends and promotable knowledge.
> - **Health check** — **`/counsel-os:doctor`** verifies your install, vault, and law-content currency.
>
> Want to see a review end to end? I'll run one now on a **synthetic** sample NDA against your own positions — nothing touches your vault.

Then offer Part 2.

## Part 2 — Live showpiece (offered, not forced)

Only run this if the user says yes. It reviews the bundled synthetic NDA against the user's seeded confidentiality position and produces a redline — entirely in a scratch folder.

### Step 1: Load the user's confidentiality position

Read `{legal_root}/practice/standards/confidentiality.md`. This is what the NDA is judged against — the demo shows Counsel OS reasoning from *their* standards.

- If that file is missing (a thin/base pack), fall back to `${CLAUDE_PLUGIN_ROOT}/knowledge/practice-seed/standards/confidentiality.md` and say plainly that you're using the seeded default because their vault doesn't have a tuned confidentiality standard yet.

### Step 2: Create a disposable scratch folder and copy the sample in

Everything the demo produces lives here — never in the vault, and never in `/tmp` (macOS blocks Word from `/tmp`).

```bash
DEMO_DIR="$HOME/counsel-os-demo"
rm -rf "$DEMO_DIR" && mkdir -p "$DEMO_DIR"
cp "${CLAUDE_PLUGIN_ROOT}/skills/demo/assets/sample-mutual-nda.docx" "$DEMO_DIR/sample-mutual-nda.docx"
echo "$DEMO_DIR"
```

Tell the user this folder is disposable and they can delete it any time (`rm -rf ~/counsel-os-demo`).

### Step 3: Review the NDA against their position

Read the sample (the `.docx`, or the markdown twin `assets/sample-mutual-nda.md` if you can't parse the docx) and evaluate it against the confidentiality standard from Step 1, using the **evaluate** primitive's classification approach (green/yellow/red with rationale and a citation to the standard). Do the reasoning in-session — **do not create a matter**.

The bundled NDA is drafted with real weaknesses; a correct review flags at least these, judged against a standard confidentiality position:

- **Residuals carve-out (Section 4)** — "ideas, concepts, know-how, and techniques ... retained in the unaided memory" is broad enough to hollow out the NDA. **RED.**
- **1-year term with no trade-secret carve-out (Section 5)** — protection lapses entirely after one year, including for trade secrets. **RED.**
- **Marking-only definition / oral-disclosure trap (Section 2)** — anything shown in a demo or said out loud is unprotected unless re-papered in five days. **YELLOW.**
- **Weak return/destruction (Section 6)** — triggers only "upon written request," "commercially reasonable efforts," no certification. **YELLOW.**
- **Compelled disclosure with no notice (Section 7)** — the receiving Party can disclose to authorities with no notice or chance to seek a protective order. **RED.**

Present a short verdict: the overall risk, the flagged clauses with one-line rationale each, and which of the user's own standards drove the call. Cite the confidentiality standard file.

### Step 4: Produce the redline

Pick the tier from the Step 0 capability check. For the mechanics (redline JSON shape, `apply_redlines.py`, `word_compare.sh`, selectors, formatting rules), follow `primitives/draft.md` `--redline` — the demo uses the exact same pipeline, just pointed at the scratch copy.

- **Full tier (python-docx + Word + real name):** For each flagged clause, write a Current/Proposed/rationale pair (e.g. narrow the residuals clause to "general skills and experience"; extend the term to 3–5 years with a perpetual trade-secret carve-out; add a prompt-notice mechanic to compelled disclosure). Write the redline JSON **alongside** the scratch copy (`$DEMO_DIR/counsel-os-redlines-*.json`, never `/tmp`), run `apply_redlines.py`, then `word_compare.sh` to produce `$DEMO_DIR/sample-mutual-nda-redline-{YYYY-MM-DD}.docx`. Report applied vs. skipped.
- **Partial tier (python-docx only):** produce the modified `.docx` in `$DEMO_DIR` and tell the user to run Word's **Review → Compare** to see tracked changes.
- **Markdown tier (no python-docx, or off macOS):** write a markdown redline package to `$DEMO_DIR/sample-mutual-nda-redline.md` — each change as Current → Proposed with rationale. State plainly that native Word tracked-changes need macOS + Microsoft Word, and that everything else Counsel OS does works the same on any platform.

### Step 5: Close

Report:

- the **verdict** (one line) and where the **redline** was saved (`$DEMO_DIR/...`);
- that **your vault was not touched** — the sample is synthetic and every file lives in the disposable `~/counsel-os-demo` folder;
- the natural next step: *"Point me at one of your own contracts and I'll do this for real,"* and that they can delete the scratch folder with `rm -rf ~/counsel-os-demo`.

Do not write a matter, a memory, or a summary into the vault. The demo ends here.
