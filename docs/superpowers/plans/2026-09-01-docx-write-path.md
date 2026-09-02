# Word Documents in TypeScript — Stage 2 (Write Path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write native Word tracked changes and comments from inside the Bun runtime — `apply_redlines` as TypeScript, the redlined `.docx` produced next to its source, an `artifact` event the thread keeps, and the artifact slip in the turn — so the hero flow (Word in, redline out) needs no Python and no Word.

**Architecture:** `diff.ts` reproduces Python's `difflib.SequenceMatcher(autojunk=False)` over the same token regex so the change regions are the ones the founder's tests expect. `redline.ts` is a line-for-line port of `scripts/apply_redlines.py` onto the stage-1 package/model: resolve every item against the pristine document, apply back to front, split runs at region edges, move deleted runs into `w:del` (`w:t` → `w:delText`), insert a `w:ins` run cloned from the template `rPr`. `comments.ts` writes what python-docx's comments API wrote: the comments part, its content type and relationship, `w:commentRangeStart/End` and the `w:commentReference` run. The tool writes the result through the vault store (never overwriting), appends a durable `artifact` thread event, and the loop synthesizes the matching step event for live clients. The UI folds artifacts into the turn and renders the slip from the approved mock.

**Tech Stack:** Bun 1.3.x, TypeScript strict, `fflate`, `@xmldom/xmldom` (already pinned), `bun test`; UI: React 18, happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-01-docx-in-typescript-design.md` §4.7, §4.8, §5 (produced documents), §6 (artifact slip), §7, §8, §9 step 4, §10 decisions. Mock: `docs/superpowers/specs/img-standalone/mock-artifact-slip.html` / `artifact-slip.png`. Source of truth for behaviour: `scripts/apply_redlines.py` (858 lines) and its tests `browse/src/apply-redlines.test.ts`, `browse/src/apply-redlines-track.test.ts`.

## Global Constraints

- No new dependencies.
- Every XML parse goes through `safety.ts`; the comments part and rels are edited as DOMs and serialized by `DocxPackage.save()`.
- Match semantics are the Python's exactly: editable runs are `./w:r | ./w:hyperlink/w:r | ./w:ins/w:r` (direct children only), run text as python-docx `Run.text` (tab → `\t`, br/cr → `\n`), exact byte matching, non-overlapping occurrence starts, occurrence numbering over body paragraphs FIRST then table cells (python-docx `document.paragraphs` then `document.tables`), then non-body parts (`header*`, `footer*`, `footnotes`, `endnotes`, `comment`) reported `replaceable: false`.
- Selectors: `occurrence`, `location`, `paragraph_index` (body-level index; `null` for cells), `before` (suffix of 160-char context), `after` (prefix), `context` (substring of paragraph text). No `match` and >1 hit → skip with the `matches[]` list.
- Two phases: resolve all, then apply by descending `start` (stable). Overlaps → the later item is skipped with the "overlaps" reason; the pre-replace text check is what detects it.
- Tracked mode: regions from `computeReplacementRegions` (merge whitespace-free gaps; widen through alphanumerics); refuse `nested` before mutating; `w:id` above the document max; `w:author`; `w:date` UTC `YYYY-MM-DDTHH:MM:SSZ`.
- Result JSON keys and reason strings identical to the Python: `applied[{index, location, occurrence}]`, `skipped[{index, current, reason, matches?}]`, `warnings[{index, current, warning}]`, `tracked`; `current` truncated to 80 + `...`; every list sorted by `index`.
- Produced file: `<original>-redline-<YYYY-MM-DD>.docx` next to the source; `-2`, `-3` … when taken; never overwrites (store `writeBytes` uses `wx`).
- `runtime/ui/src/vault/sanitize.ts` stays the only HTML sink (the slip is React, no HTML).
- Tests: `bun run test`, `bun run ui:test`, `bun run typecheck:runtime`, `bun run typecheck:ui` green after every task. Commits `runtime:` / `ui:` / `docs:`; NO `Co-Authored-By`, NO `Claude-Session` trailers.
- Live serves 7431/7432 and `~/.counsel-os` untouched; any server binds ≥7495 with a throwaway `COUNSEL_OS_HOME`.

---

## File structure

```
runtime/src/docx/
  diff.ts (+ .test.ts)        tokenize, sequenceOpcodes (difflib port), computeReplacementRegions
  redline.ts (+ .test.ts)     collectMatches, selectMatch, applyRedlines (plain + tracked), result JSON
  comments.ts (+ .test.ts)    ensureCommentsPart, addComment, markCommentRange
  model.ts                    cell index advances by w:gridSpan (Python grammar)
  index.ts                    exports the above
runtime/src/core/types.ts     StepEvent 'artifact'
runtime/src/threads/store.ts  ThreadEvent { t: 'artifact' }
runtime/src/loop/counsel-loop.ts   synthesizes the artifact step event from apply_redlines' result
runtime/src/tools/docx-tools.ts    apply_redlines tool (+ test)
runtime/src/tools/builtin.ts       Python apply_redlines wrapper removed
runtime/src/loop/prompt.ts         invocation table entry
runtime/src/cli.ts                 `docx apply`
scripts/apply_redlines.py          deleted; browse/src/apply-redlines*.test.ts deleted (ported)
primitives/draft.md, primitives/redline-output.md   one tier; tool invocation
runtime/ui/src/api/types.ts        StepEvent/ThreadEvent artifact
runtime/ui/src/chat/turns.ts       ArtifactView folding (+ test)
runtime/ui/src/v2/chat/ArtifactSlip.tsx (+ test)
runtime/ui/src/v2/chat/Turn.tsx, Strip.tsx   slip placement; "1 document produced"
runtime/ui/src/styles.css          .v2-artifact-*
```

---

### Task 1: `diff.ts` — the SequenceMatcher port and change regions

**Files:** Create `runtime/src/docx/diff.ts`, `runtime/src/docx/diff.test.ts`.

**Interfaces:**
- Produces: `tokenize(s: string): string[]` (regex `\w+|\s+|[^\w\s]+`, Unicode-aware like Python 3's `\w`), `sequenceOpcodes(a: string[], b: string[]): Opcode[]` with `Opcode = { tag: 'equal'|'replace'|'delete'|'insert'; a1; a2; b1; b2 }`, `computeReplacementRegions(current: string, proposed: string): Region[]` with `Region = { start: number; end: number; insert: string }`.

- [ ] **Step 1: Failing tests** — `diff.test.ts`:
  - `"Payment is due within 30 days of invoice."` → `"…45 days…"` gives one region `{start: 22, end: 24, insert: '45'}`.
  - `"…30 days and the cure period is 10 days from notice."` → two regions; the text between is not in any region.
  - `"$1,500,000"` → `"$2,000,000"` gives ONE region covering `1,500,000` (merge rule).
  - `"30"` → `"35"` strikes `30` not `0` (widen rule); `"Provider shall maintain insurance."` → `"Provider shall maintain insurance of at least $1,000,000."` is a pure insertion before the period (`end === start`, insert begins with a space).
  - Equal strings → `[]`; `current` → `''` → one region striking everything.
  - `sequenceOpcodes` matches difflib on a hand-checked case with a repeated token (tie-break: earliest in `a`, then in `b`).
- [ ] **Step 2: Run** `bun test runtime/src/docx/diff.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** — `find_longest_match` with the b2j index and no junk, recursive `matching_blocks` (queue), adjacent-block merge, opcodes; then the region merge and widen loops transcribed from `compute_replacement_regions`. `isalnum` → `/[\p{L}\p{N}]/u`; `isspace` → `/\s/`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: docx diff — SequenceMatcher-compatible token diff and the tracked-change regions`.

### Task 2: `model.ts` cell index by grid span; `redline.ts` phase 1 (matches and selectors)

**Files:** Modify `runtime/src/docx/model.ts` (+ test), create `runtime/src/docx/redline.ts`, `runtime/src/docx/redline.test.ts`.

**Interfaces:**
- Produces: `RedlineItem = { current: string; proposed: string; comment?: string | null; author?: string; match?: MatchSpec }`, `collectMatches(pkg, current): TextMatch[]`, `selectMatch(matches, spec): { match: TextMatch | null; reason: string | null }`, `formatMatch(m)`, `editableRuns(p: Element): Element[]`, `runEditText(r): string`, `paragraphEditText(p)`.

- [ ] **Step 1: Failing tests** — a builder doc with `Alpha repeated language.` / `Beta repeated language.` / a table cell `Gamma repeated language.`: `collectMatches` returns three, locations `body[0]`, `body[1]`, `table[0].row[0].cell[0].p[0]`, occurrences 0..2, `paragraph_index` 0, 1, null; `selectMatch` with no spec → reason `Found 3 matches; add a match disambiguator`; `{location:'body[1]'}` → Beta; `{occurrence: 2}` → Gamma; `{before:'Beta '}`; `{after:'.'}` on all three → "still selected 3 matches"; `{context:'Gamma'}`; a header paragraph hit → `replaceable: false`, location `header1[0]`; a `w:delText`-only hit → no matches. `model.test`: a `gridSpan: 2` first cell makes the next cell `cell[2]`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — `editableRuns` per the XPath; `runEditText` (`w:t` text, `w:tab`→`\t`, `w:br`/`w:cr`→`\n`, `w:noBreakHyphen`→`-`); matches over `model.paragraphs` with `cell === null` first, then cell paragraphs, then non-body parts (`header\d*`, `footer\d*`, `footnotes`, `endnotes`, `comments` → label `comment`) via `w:t` text only; contexts 160 chars; `truncate(s, 80)`. In `model.ts`, `cellIndex += gridSpan` (read `w:tcPr/w:gridSpan/@w:val`).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: docx redline phase 1 — matches, selectors, Python-grammar locations (grid spans advance the cell index)`.

### Task 3: `redline.ts` plain apply and the two-phase driver

**Files:** Modify `runtime/src/docx/redline.ts` (+ test).

**Interfaces:**
- Produces: `applyRedlines(pkg: DocxPackage, items: RedlineItem[], opts: { track: boolean; now?: Date; defaultAuthor?: string }): RedlineResult` where `RedlineResult = { applied; skipped; warnings; tracked; stats: { regions: number; comments: number; paragraphs: number } }` and the package is mutated (`document.xml` touched).

- [ ] **Step 1: Failing tests** (ports of `apply-redlines.test.ts`): duplicate refusal + `location` selector; occurrences 0/1/2 across paragraphs → `45/60/90 days`; three occurrences in ONE paragraph with different-length replacements back to front; two items on the same occurrence → first wins, second skipped with reason containing `overlaps`; empty `current` → skipped `current text must not be empty`; not found → `Text not found in document` (+ the `w:del` warning when only deleted text matches); a match spanning three runs keeps the first run's `rPr` and clears the middle run; all lists sorted by index.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `replaceInParagraph` (run ranges, prefix/suffix, `setRunText` that rebuilds `w:t`/`w:tab`/`w:br` from a string and keeps `rPr`), the resolve loop, the sorted apply loop, the pre-replace text check.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: docx redline plain mode — two-phase apply, back to front, overlaps skipped`.

### Task 4: tracked mode

**Files:** Modify `runtime/src/docx/redline.ts` (+ test).

- [ ] **Step 1: Failing tests** (ports of `apply-redlines-track.test.ts`, accept/reject text read through `modelOf(pkg)` + `textOf(p, 'accept'|'reject')` and a `revisions(pkg)` helper listing `w:ins`/`w:del` with author/id/date/text): minimal `30`→`45`; scattered `30`/`10` → two regions and `cure period` in no revision; bold `five` keeps `w:b` inside `w:del`; pure insertion `of at least $1,000,000` and pure deletion of a whole paragraph; three authors A/B/C with unique ids; `nested` refusal on a second pass over a `w:ins` (reason contains `nested`/`tracked`); insertion into an empty paragraph; tab inside the struck text round-trips as `w:tab`; ids start above the document's existing max.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `splitRun`, `newInsRun`, `revisionElement`, `applyTrackedRegion` (the four cases: empty paragraph, pure insertion, carve and wrap, re-derive core elements), `trackedReplaceInParagraph` (regions back to front, nested pre-check).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: docx redline tracked mode — native w:ins/w:del with author, date and ids; nested revisions refused`.

### Task 5: `comments.ts`

**Files:** Create `runtime/src/docx/comments.ts`, `runtime/src/docx/comments.test.ts`; modify `redline.ts`, `index.ts`.

**Interfaces:**
- Produces: `addComment(pkg, paragraph: Element, text: string, author: string, now: Date): boolean` (false when the paragraph has no runs to anchor to); `ensureCommentsPart(pkg)` (creates `word/comments.xml`, the `[Content_Types].xml` override and the `word/_rels/document.xml.rels` relationship when absent); `initialsOf(author)`.

- [ ] **Step 1: Failing tests**: a doc with no comments part gains one with the override and rel; a doc that already has one gets id `max+1`; the anchored paragraph carries `w:commentRangeStart`/`End` around its runs and a trailing `w:r/w:commentReference`; `commentsOf(pkg)` (stage 1) reads the new comment back with author, initials `JW` for `Jack Wang`, date; `extractRedlines` on the saved bytes lists it anchored to the right paragraph; python-docx oracle (skipped without python3+docx): `Document(out).comments` yields the text.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; wire into `applyRedlines` (after a successful replacement with a non-empty `comment`, the Python's `add_comment_to_paragraph`; anchor runs = direct `w:r` children, else `editableRuns`; warning `Comment skipped: paragraph has no runs to anchor the comment to`).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: docx comments — the comments part, content type, relationship and range marks, written the way python-docx did`.

### Task 6: cross-check against Python

- [ ] `scripts/dev/docx-crosscheck.ts` (NOT committed): run the TypeScript and `python3 scripts/apply_redlines.py --track` on `skills/demo/assets/sample-mutual-nda.docx` with a fixed 6-item redline set, compare accept-all text, reject-all text, the count of `w:ins`/`w:del`, the `applied`/`skipped` JSON; and on four builder-generated fixtures (plain, tracked, comments, nested). Fix divergences in the TypeScript; record the result in the PR body.

### Task 7: the event, the tool, the loop, the CLI; the Python goes

**Files:** Modify `runtime/src/core/types.ts`, `runtime/src/threads/store.ts`, `runtime/src/loop/counsel-loop.ts`, `runtime/src/tools/docx-tools.ts` (+ test), `runtime/src/tools/builtin.ts` (+ test), `runtime/src/loop/prompt.ts` (+ snapshot), `runtime/src/cli.ts`, `runtime/src/mcp/stdio.ts`; delete `scripts/apply_redlines.py`, `browse/src/apply-redlines.test.ts`, `browse/src/apply-redlines-track.test.ts`; update `browse/src/docx-xxe.test.ts` if it drives the deleted script.

**Interfaces:**
- `StepEvent |= { type: 'artifact'; id: string; path: string; kind: 'docx-redline'; summary: ArtifactSummary }`; `ThreadEvent |= { t: 'artifact'; at; id; kind; path; source; author; tracked; summary }` with `ArtifactSummary = { changes: number; comments: number; applied: number; skipped: number; clauses: number; bytes: number }`.
- `apply_redlines` tool input: `{ original: string; edits?: string; items?: RedlineItem[]; output?: string; track?: boolean; author?: string }` (`edits` = vault path of a JSON file, `items` = inline; one of the two). Output: the result JSON plus `{ output: string; artifactId?: string }`.
- `builtinTools(opts: { vaultRoot; repoRoot; vault?: VaultStore; thread?: { store: ThreadStore; threadId: string; tenant: Tenant } })`.

- [ ] **Step 1: Failing tests**: `docx-tools.test.ts` — with an in-memory/temp vault: tool writes `<name>-redline-<date>.docx`, second run writes `-2`; result JSON shape; `edits` path outside the vault refused; the artifact thread event appended when `thread` is given; without `thread` no event and no crash. `counsel-loop` test: a fake provider calling `apply_redlines` yields an `artifact` step event after the `tool_result` (mirror of the proposal test). `store.test.ts`: the artifact event round-trips. `builtin.test.ts`: names now `check_document, clean_format, docket_sweep, docx_read, extract_redlines, apply_redlines, word_compare` with `apply_redlines` on all platforms and no Python. `prompt.test.ts` snapshot updated.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; `docx apply <file.docx> <edits.json> [--out <path>] [--track] [--author <name>]` in `cli.ts`; delete the Python script and its two test files.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `runtime: apply_redlines in TypeScript — writes the redline next to the source, records an artifact event; the Python script retired`.

### Task 8: primitives

**Files:** Modify `primitives/draft.md`, `primitives/redline-output.md`, `skills/doctor/SKILL.md` (python-docx check → gone), `skills/counsel/SKILL.md` if it names the script.

- [ ] Replace the capability tiers with one tier (the runtime always has the full tier; attribution comes from `profile.md`'s name, else "Counsel OS"); the pipeline steps name the `apply_redlines` tool (runtime) / `bun runtime/src/cli.ts docx apply` (outside it); the JSON contract stays verbatim; the accept-all baseline section stops naming python-docx; `--edit` uses the tool without `track`. Commit `docs: the draft and redline primitives on the TypeScript write path — one tier`.

### Task 9: UI — artifact folding and the slip

**Files:** Modify `runtime/ui/src/api/types.ts`, `runtime/ui/src/chat/turns.ts` (+ `turns.test.ts`), `runtime/ui/src/v2/chat/Turn.tsx` (+ test), `runtime/ui/src/v2/chat/Strip.tsx` (+ test), `runtime/ui/src/styles.css`; create `runtime/ui/src/v2/chat/ArtifactSlip.tsx` (+ test).

- [ ] **Step 1: Failing tests**: `turns.test.ts` — a `t:'artifact'` thread event and a `type:'artifact'` step event both land in `turn.artifacts`, deduped by id; `ArtifactSlip.test.tsx` — tag "Redlined document", filename, "ready", the sentence, facts `14 changes · 3 comments · 5 clauses touched · 42 KB`, Download calls `fetchBlob`+`saveBlob` with the basename, "Open in reader" calls `onOpenFile(path)`, "Show the changes" too, the by-line `revision marks by Jack Wang · Sep 1, 2026`; `Turn.test.tsx` — slip renders after proposals and before the strip; `Strip.test.tsx` — `stripLine` says `1 document produced`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** per the mock: `.v2-artifact` (double rule top, hairline bottom), head (tag, mono filename, italic "ready" in `--ok`), body sentence built from the summary ("Native Word tracked changes; each change carries a comment with the reason." / plain variant), facts, acts (Download accent, quiet links, by-line faint right).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `ui: the redlined-document slip — an artifact event folds into the turn under the answer, above the strip`.

### Task 10: docs and the PR

- [ ] CHANGELOG (Unreleased): the write path; `docs/roadmap.md` if it lists the Python scripts; `README.md` mentions. Full suites and typechecks. Push; `gh pr create` against main (body: what, the threat model unchanged, the cross-check result, test counts; note that #45/#47's commits show until they merge).
