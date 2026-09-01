# Word documents in TypeScript — design

**Date:** 2026-09-01 · **Status:** draft for founder review · **Decision it implements:** founder ruling 2026-09-01: port the Word (`.docx`) pipeline from Python into the Bun runtime, staged. Reading and conversion first. Native tracked-changes writing second. No bundled Python. No "Python optional" mode.

## 1. Why

counsel-os is moving from a Claude Code plugin to a standalone app a lawyer installs. The hero use case is a Word document in and a tracked-changes redline out. Today every `.docx` operation shells out to `python3` with `python-docx` and `lxml`, and two-document compare shells out to Microsoft Word over AppleScript. A standalone app cannot assume any of that. The web UI also has no way to take a `.docx` in or hand one back, and a `.docx` in the vault renders as mojibake in the reader.

The port removes the Python and Word dependencies, gives the runtime one document model instead of three hand-rolled traversals, and puts the hero flow inside the app.

## 2. Scope

**In (stage 1 — read):**
- A `runtime/src/docx/` module: safe package reading, a paragraph/run model with accept-all and reject-all views, `.docx` → markdown, redline extraction, document checks.
- Runtime tools `docx_read`, `extract_redlines`, `check_document` backed by the module. The `read` primitive stops prescribing `pandoc`.
- Vault: `.docx` files render in the reader as converted markdown. Upload from the UI into a matter folder. Download of any vault file.

**In (stage 2 — write):**
- `apply_redlines` in TypeScript, plain and tracked modes, with comments.
- Two-document compare in TypeScript, producing tracked changes. This replaces Word Compare.
- The proposal/answer UI offers the produced `.docx` for download.

**Out:**
- `clean_format` (rebuilds a document from a template). It is a formatting utility, not the hero path. It stays a Python script until a later decision; the runtime does not register it as a tool once stage 2 lands.
- Editing headers, footers, footnotes, endnotes. Read and report only, as today.
- `.doc` (legacy binary). Report "not supported" plainly.
- Images, fields, and equations survive untouched in place; the model does not see them.

## 3. Libraries

- **Zip:** `fflate` (pure JS, small, sync and async APIs). Bun has no built-in zip.
- **XML:** `@xmldom/xmldom` for a DOM with element ordering, cloning, and serialization. The write path splits runs and inserts siblings; a DOM is the natural tool. No XPath library; the model walks the tree itself.
- **Diff:** a small in-repo token diff (`docx/diff.ts`) with the same semantics as Python's `SequenceMatcher(autojunk=False)` over the token regex `\w+|\s+|[^\w\s]+`. Written in-repo so the tracked-region behaviour (merge adjacent regions, widen edges through alphanumerics) is under our tests, not a dependency's.

No other dependencies. Both packages are MIT.

## 4. Module layout (`runtime/src/docx/`)

```
safety.ts     DOCTYPE rejection before any parse (port of scripts/xml_safety.py)
package.ts    open/save a .docx: parts, content types, relationships, part lookup
model.ts      paragraphs (body + tables + cells), runs, text views, locations
markdown.ts   .docx → markdown (headings, numbering, tables, changes, comments)
extract.ts    tracked changes + comments → the extract_redlines JSON
check.ts      document QA: docx block extraction + the text linters
diff.ts       token diff + tracked-region computation          (stage 2)
redline.ts    apply_redlines: resolve, then apply back to front (stage 2)
comments.ts   comments part, ranges, references, rels, types   (stage 2)
compare.ts    two-document compare → tracked changes           (stage 2)
index.ts      the public surface the tools and routes import
```

### 4.1 `safety.ts`
`assertSafeXml(text, partName)`: throws `UnsafeXmlError` if the part contains `<!DOCTYPE` in any casing before parsing. Every parse site calls it. `parseXml(text, partName)` is the one function that constructs a DOM. The XXE and billion-laughs tests in `browse/src/docx-xxe.test.ts` are ported first and must fail before the guard exists.

### 4.2 `package.ts`
`openDocx(bytes) → DocxPackage` with `part(name)`, `hasPart`, `setPart`, `relationships(partName)`, `contentTypes`, and `save() → Uint8Array`. Unknown parts round-trip byte for byte. `document.xml` is parsed on open; other parts parse lazily. Reject a package with no `word/document.xml`.

### 4.3 `model.ts`
The load-bearing accessor is the run walk. It matches `apply_redlines.get_runs` exactly: direct `w:r`, runs inside `w:hyperlink`, runs inside `w:ins`. `w:del` is not descended into for the accept-all view. A second walk gives the reject-all view (runs under `w:del` and `w:moveFrom` count, runs under `w:ins` and `w:moveTo` do not).

```ts
interface DocxParagraph {
  element: Element;          // the w:p
  location: string;          // 'body[12]' or 'table[0].row[1].cell[2].p[0]'
  index: number;             // global paragraph index (body order, tables inline)
  style: string | null;      // w:pStyle val
  numbering: { numId: string; level: number } | null;
  runs(view: 'accept' | 'reject'): DocxRun[];
  text(view): string;        // concatenated run text; tab/br/cr → space
}
interface DocxRun { element: Element; text: string; inDel: boolean; inIns: boolean; inHyperlink: boolean; parent: Element }
```
Merged table cells are deduplicated by element identity, as the Python does. Locations use the same grammar so a `match.location` written for the Python script still resolves.

### 4.4 `markdown.ts` (stage 1)
`docxToMarkdown(pkg, { changes: 'all' | 'accept' | 'reject', comments: boolean }) → { markdown, warnings }`.
- Headings: `Heading N` styles and the numbering-heading regex the extractor already uses → `#`×N.
- Numbering: rendered as literal text from `numbering.xml` (`w:lvlText` with `%1` substitution, per-level counters, `w:start`), so the model sees `3.2` where Word shows `3.2`. pandoc lost this; the port keeps it.
- Tables: pipe tables. Cells with multiple paragraphs join with `<br>`.
- Tracked changes: `{++inserted++}` and `{--deleted--}` inline, pandoc's CriticMarkup dialect, so existing prompts and the read primitive's instructions keep working.
- Comments: `{>>comment (author, date)<<}` after the anchored text.
- Tabs, breaks: a single space, as the extractors do.
- Everything else (images, fields, footnote references): dropped with a warning that names the paragraph.

### 4.5 `extract.ts` (stage 1)
Port of `scripts/extract_redlines.py`. Same output JSON, same `summary`, `changes`, `comments`, `warnings`. Non-body parts are scanned and reported, never edited.

### 4.6 `check.ts` (stage 1)
Port of `scripts/check_document.py`: the docx block extraction plus the five text linters (cross references, exhibits, definitions, party names, undefined terms), for `.docx`, `.md`, and `.txt`. Same finding shape.

### 4.7 `diff.ts` + `redline.ts` (stage 2)
Port of `apply_redlines.py`, including its contracts:
- Selectors `occurrence`, `location`, `paragraph_index`, `before`, `after`, `context`. Ambiguity returns the `matches[]` list with `replaceable` flags.
- Two phases: resolve everything against the pristine document, then apply back to front by descending offset. Overlaps skip.
- Plain mode: `prefix + proposed` in the first matched run, inheriting its `w:rPr`.
- Tracked mode: token diff → regions; split runs at region edges; move the carved runs into `w:del` with `w:t` retagged `w:delText`; insert `w:ins` with a run cloned from the template `w:rPr`; allocate `w:id` above the document max; author and UTC date on every revision element. Refuse an item whose region touches a run inside `w:hyperlink` or an existing `w:ins` (`nested`), before mutating.
- Result JSON identical to today: `applied`, `skipped`, `warnings`, `tracked`.

### 4.8 `comments.ts` (stage 2)
python-docx's comments API has no TypeScript equivalent, so the port writes it: create `word/comments.xml` if absent, register its content type and the document relationship, allocate comment ids, insert `w:commentRangeStart`, `w:commentRangeEnd`, and a `w:r/w:commentReference` around the matched runs. Author initials derived from the author name.

### 4.9 `compare.ts` (stage 2)
Replaces Word Compare for the one job it still had: two independent documents, no edit list. Align paragraphs with the `diff_rounds.py` approach (whitespace-normalized similarity, pairing thresholds), then compute per-paragraph tracked regions with `diff.ts` and write them with `redline.ts` primitives into a copy of the original. Inserted and deleted whole paragraphs become `w:ins`/`w:del` paragraphs. Output is a `.docx` with native tracked changes and the same result JSON.

`diff_rounds` (round-over-round classification) ports on top of the same alignment as `rounds.ts`; it is small once `compare.ts` exists.

## 5. Runtime integration

- **Tools** (`runtime/src/tools/builtin.ts`): `docx_read`, `extract_redlines`, `check_document` (stage 1); `apply_redlines`, `docx_compare` (stage 2). Same names and argument shapes as the Python tools where they exist, so prompts and evals keep working. The `pythonScriptTool` wrapper and `DOCX_SCRIPT_PLATFORMS` go away when the last Python tool is replaced. `word_compare` is removed at stage 2.
- **Prompt** (`runtime/src/loop/prompt.ts`, `primitives/read.md`, `primitives/draft.md`, `primitives/redline-output.md`): drop the pandoc and python-docx instructions and the capability tiers; the runtime always has the full tier.
- **Vault read** (`GET /vault/read`): for `.docx`, respond with `{ path, kind: 'docx', content: <markdown>, version, warnings }`. The reader shows it as a document with a set-text line "Word document · converted for reading · download". The raw bytes are never sent as text.
- **Upload** (`POST /vault/upload`, multipart, stage 1): destination directory must be inside the matters directory (or a matter folder); filename sanitized; size cap 25 MB; `.docx` only at first (`.md`, `.txt`, `.pdf` later). The package is opened once on upload to validate it and to reject unsafe XML. Returns the vault path.
- **Download** (`GET /vault/download?path=`, stage 1): any vault file as bytes with the right content type and a `Content-Disposition` filename. Same path guards as `/vault/read`.
- **Produced documents** (stage 2): `apply_redlines` and `docx_compare` write their output next to the source in the matter folder (`<name>-redline-<date>.docx`, never overwriting) and emit a step event `{ type: 'artifact', path, kind: 'docx-redline', summary }` that the thread persists. The UI renders an artifact slip (double rule, filename, "N changes · M comments", Download) in the turn, in the same family as the proposal slip.

## 6. UI

- **Intake:** drag a file onto Home's ask box or the chat composer, or use "＋ attach from vault" → "Upload a document". The file goes to `POST /vault/upload` into the matter the thread is linked to (or a "matters/inbox" folder when there is none, which the user can move later), and the path chip lands in the message as today's attach flow does. Progress and errors in set text under the box. No modal.
- **Reader:** `.docx` renders through the same markdown pipeline as vault files, with the "Word document" line and a Download link. Existing tracked changes show as the same inline redline the proposal card uses.
- **Artifact slip** (stage 2): in the turn, under the answer, above the strip.

Mockups (`docs/superpowers/specs/img-standalone/`): `mock-intake.html` (Home's ask box and the chat composer in the drag-over state, after a drop, and after a failed drop), `mock-reader-docx.html` (a `.docx` in the reader: the Word line under the dochead, tracked changes inline in the proposal card's tints, a comment as a quiet sans note under its paragraph with the author and date as a run-in and the anchored words dotted in amber), `mock-artifact-slip.html` (the produced-document slip in a turn). Rendered as `intake.png`, `reader-docx.png`, `artifact-slip.png` and their `-dark` twins beside them.

## 7. Error handling

- Unsafe XML: refuse with one sentence naming the part; never partially process.
- Not a `.docx` (wrong magic, no `document.xml`): refuse plainly.
- Password-protected or encrypted packages: refuse, say so.
- Non-body matches: reported as `replaceable: false`, as today.
- `nested` regions: the item is skipped with the same reason string.
- Upload over the size cap or outside the matters directory: 413 / 400 with a sentence.
- Every tool error keeps the same `{ error }` shape the loop already surfaces.

## 8. Testing

- Port the Python-gated bun tests in `browse/src/*.test.ts` to run against the TypeScript module with no interpreter check: `docx-xxe`, `apply-redlines`, `apply-redlines-track`, `check-document`. They currently generate fixtures with python-docx at test time; the port generates them with `docx/package.ts` + a tiny builder (`test/docx-builder.ts`), so tests need no Python either.
- Golden files: `skills/demo/assets/sample-mutual-nda.docx` → markdown snapshot; an extract snapshot for a fixture with tracked changes and comments (built by the builder).
- Cross-check during the port: a one-off script compares TypeScript output with the Python output on the sample NDA and on a dozen generated cases, until the Python is removed. It lives under `scripts/dev/` and is deleted at the end of stage 2.
- Round trip: open → save with no edits must be byte-identical for every part except `document.xml`, which must be canonically equal.
- Routes: upload (good, oversize, wrong type, path escape, unsafe XML), download (bytes, content type, path escape), read of a `.docx`.
- UI: reader for `.docx`, drag-drop intake states, artifact slip.

## 9. Staging and order

1. `safety`, `package`, `model`, `markdown`, golden tests, `docx_read` tool, reader rendering, download route. Retire pandoc from the primitives.
2. `extract`, `check`, their tools; delete the Python versions and their gates.
3. Upload route + intake UI (after mockup review).
4. `diff`, `redline` (plain, then tracked), `comments`; `apply_redlines` tool; delete the Python script; artifact events and slip.
5. `compare`, `rounds`; remove `word_compare.sh` and the Word learnings that only served it.
6. Update `skills/doctor` (no python/pandoc checks), `CHANGELOG`, docs.

Each step is its own PR with QA. The Python scripts stay in the repo until the step that replaces them lands, so nothing regresses in between.

## 10. Open questions for the founder

- Produced-document naming: `<original>-redline-<YYYY-MM-DD>.docx` next to the source, or a `redlines/` subfolder in the matter? Default in this spec: next to the source.
- Inbox for uploads with no matter: `matters/inbox/` (default here) or refuse until a matter is chosen?
