# Word Documents in TypeScript — Stage 1 (Read Path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read, convert, extract and check `.docx` files inside the Bun runtime with no Python and no pandoc — a `runtime/src/docx/` module behind `docx_read`, `extract_redlines`, `check_document`, a `.docx`-aware `GET /vault/read`, a `GET /vault/download`, and a reader that shows a Word document as a document.

**Architecture:** `fflate` opens the package, `@xmldom/xmldom` gives `document.xml` a DOM, and one paragraph/run model (`model.ts`) feeds three consumers — markdown, extraction, and checks — that today are three separate Python traversals. Every parse goes through `safety.ts` (DOCTYPE rejection). The tools keep their names and shapes so prompts and evals keep working; the Python scripts for the write path stay untouched until stage 2.

**Tech Stack:** Bun 1.3.x, TypeScript strict, `fflate` (zip), `@xmldom/xmldom` (DOM), `bun test`; UI: React 18, `marked`, happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-01-docx-in-typescript-design.md` (§3, §4.1–4.6, §5 read/download, §6 reader, §7, §8, §9 steps 1–2, §10 decisions). Mock: `docs/superpowers/specs/img-standalone/mock-reader-docx.html`.

## Global Constraints

- Only two new dependencies: `fflate` and `@xmldom/xmldom`, exact versions, MIT.
- `safety.ts` is the only place a DOM is constructed from package XML; every part parse calls `assertSafeXml` first. Any `<!DOCTYPE` (any casing) → `UnsafeXmlError`, before parsing.
- The run walk for the accept-all view is exactly `apply_redlines.get_runs`: `w:r` direct, under `w:hyperlink`, under `w:ins`; never under `w:del`. Reject-all: runs under `w:del`/`w:moveFrom` count, runs under `w:ins`/`w:moveTo` do not.
- Locations use the Python grammar: `body[N]` and `table[i].row[j].cell[k].p[m]`.
- `extract` and `check` output JSON identical in shape to the Python scripts (`file`, `summary`, `warnings`, `changes`, `comments` / `file`, `format`, `summary`, `notes`, `findings`).
- Tabs, breaks, carriage returns → one space in every text view.
- `GET /vault/read` never returns `.docx` bytes as text. Download carries the same path guards as read.
- `runtime/ui/src/vault/sanitize.ts` stays the only HTML sink; `ins`/`del` join its allowlist with no attributes.
- Tokens are never logged; the download link carries the bearer only as a header (fetch → blob URL), never in a URL.
- Tests: `bun run test`, `bun run ui:test`, `bun run typecheck:runtime`, `bun run typecheck:ui` green after every task.
- Commits: `runtime:` / `ui:` / `docs:` prefixes; NO `Co-Authored-By`, NO `Claude-Session` trailers.
- The live serves on 7431/7432 and `~/.counsel-os` are never touched; any server this plan starts binds ≥7495 with a throwaway `COUNSEL_OS_HOME`.

---

## File structure

```
runtime/src/docx/
  safety.ts (+ .test.ts)      assertSafeXml, parseXml, UnsafeXmlError
  package.ts (+ .test.ts)     openDocx, DocxPackage {part, hasPart, setPart, partNames, save}
  model.ts (+ .test.ts)       DocxModel: paragraphs (body + tables), runs, views, locations, numbering
  markdown.ts (+ .test.ts)    docxToMarkdown
  extract.ts (+ .test.ts)     extractRedlines (JSON identical to scripts/extract_redlines.py)
  check.ts (+ .test.ts)       checkDocument (JSON identical to scripts/check_document.py)
  index.ts                    the public surface
  test/builder.ts             buildDocx({paragraphs, tables, comments, numbering}) → Uint8Array
  test/golden/sample-mutual-nda.md   snapshot of the demo NDA converted
runtime/src/tools/builtin.ts        docx_read (new), extract_redlines + check_document → TS
runtime/src/tools/docx-tools.ts     the three tool definitions (pure, testable)
runtime/src/loop/prompt.ts          script table: TS-backed tools described as tools, not scripts
primitives/read.md                  no pandoc; docx_read is the extraction method
runtime/src/server/routes.ts        /vault/read kind docx; /vault/download
runtime/ui/src/api/types.ts         VaultFile.kind, VaultFile.warnings
runtime/ui/src/api/client.ts        fetchBlob (bearer header, never URL)
runtime/ui/src/vault/sanitize.ts    + ins, del
runtime/ui/src/vault/markdown.ts    criticmarkup → ins/del/comment before marked
runtime/ui/src/v2/vault/Reader.tsx  the WORD DOCUMENT line, download, converted body
runtime/ui/src/styles.css           .v2-doc-word, ins/del tints in the reader
CHANGELOG.md, skills/doctor/SKILL.md
```

---

### Task 1: Dependencies and `safety.ts`

**Files:** `package.json`, `bun.lock`, `runtime/src/docx/safety.ts`, `runtime/src/docx/safety.test.ts`

- [ ] `bun add fflate@<exact> @xmldom/xmldom@<exact>` at the root.
- [ ] Failing test: `assertSafeXml` throws `UnsafeXmlError` on the billion-laughs payload, on the XXE payload, on `<!doctype` lowercase, and on a DOCTYPE after a leading comment; a benign `w:p` parses via `parseXml` and its root `localName` is `p`.
- [ ] Implement: `UnsafeXmlError extends Error { partName }`; `assertSafeXml(text, partName)` scans for `<!DOCTYPE` case-insensitively; `parseXml(text, partName)` = assert + `new DOMParser({ onError })` that throws on fatal errors.
- [ ] `bun test runtime/src/docx/safety.test.ts`; commit `runtime: docx safety — DOCTYPE rejection before any parse`.

### Task 2: `package.ts` and the test builder

**Files:** `runtime/src/docx/package.ts`, `runtime/src/docx/package.test.ts`, `runtime/src/docx/test/builder.ts`

- [ ] Builder: `buildDocx(spec)` writes `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, optional `word/numbering.xml`, `word/comments.xml`, `word/header1.xml`. Paragraph spec: `{ style?, numId?, ilvl?, runs: Array<string | { text, bold?, ins?: {author,date}, del?: {author,date}, hyperlink?, tab?, br? }>, commentRange?: id }`. Tables: rows of cells of paragraphs.
- [ ] Failing tests: `openDocx` on builder output exposes `partNames()`, `part('word/document.xml')` as a DOM with `w:body`; a zip without `word/document.xml` throws `not a Word document`; a hostile `word/header1.xml` with a DOCTYPE throws `UnsafeXmlError` naming the part when that part is parsed, and does NOT throw on `openDocx` itself (lazy); round trip: `save()` of an unmodified package is byte-identical per part for every part except `document.xml`, whose serialization is canonically equal (parse both, compare `documentElement` serialization).
- [ ] Implement with `fflate.unzipSync` / `zipSync` (store mode for byte-identity of untouched parts: keep the raw bytes and only re-serialize parts that were parsed AND marked dirty; `setPart` marks dirty).
- [ ] Commit `runtime: docx package — open, parts, save, round-trip`.

### Task 3: `model.ts`

**Files:** `runtime/src/docx/model.ts`, `runtime/src/docx/model.test.ts`

- [ ] Failing tests (builder fixtures): body paragraphs and table cell paragraphs enumerate in document order with `location` strings `body[0]`, `table[0].row[0].cell[0].p[0]`; merged cells (`w:vMerge`) deduplicated by element identity; `text('accept')` includes ins + hyperlink text, excludes del; `text('reject')` includes del text (`w:delText`), excludes ins; tab/br/cr → space; `style` from `w:pStyle`; `numbering` from `w:numPr`; run flags `inDel/inIns/inHyperlink`; `changeOf(run)` returns `{kind:'ins'|'del', author, date}` from the nearest wrapper; comment anchors per paragraph (`commentRangeStart` + `commentReference` ids).
- [ ] Implement `DocxModel` from a `DocxPackage`: walks `w:body` children; `w:p` → paragraph; `w:tbl` → rows/cells; nested tables inline. Numbering: parse `word/numbering.xml` into `numId → abstract → levels {start, numFmt, lvlText}` with a counter per (numId, level) resolved in document order → `paragraph.numberLabel` (e.g. `3.2.`).
- [ ] Commit `runtime: docx model — paragraphs, runs, views, locations, numbering`.

### Task 4: `markdown.ts` + golden

**Files:** `runtime/src/docx/markdown.ts`, `.test.ts`, `runtime/src/docx/test/golden/sample-mutual-nda.md`

- [ ] Failing tests: Heading styles → `#`×N; numbering-regex headings kept as text; `numberLabel` prefixed to list/heading text; pipe table with `<br>` for multi-paragraph cells; `{++ins++}` / `{--del--}` inline with `changes:'all'`, only revised text with `'accept'`, only original with `'reject'`; comment → `{>>text (author, date)<<}` after the anchored paragraph text; drawings/fields/footnote refs dropped with a warning naming the paragraph location; escapes pipe characters inside table cells.
- [ ] Golden: convert the demo NDA, write the snapshot once, assert equality thereafter.
- [ ] Commit `runtime: docx to markdown`.

### Task 5: `extract.ts`

**Files:** `runtime/src/docx/extract.ts`, `.test.ts`

- [ ] Failing tests mirroring the Python: a paragraph with ins+del → `kind:'replacement'`, `original`/`revised`, `inserted`/`deleted` fragments, authors, dates (10 chars), `comment_ids`; >3 fragments of one kind coalesce; `section_context` tracks headings by style or `HEADING_NUM_RE`; comments from `word/comments.xml` with `paragraph_index` and `anchor_excerpt` (160 chars); non-body parts (`header1`, `footnotes`) scanned → records with `paragraph_index:null` and a warning; summary counts; `file` echoes the given name.
- [ ] Cross-check script `scripts/dev/docx-crosscheck.ts` (temporary; deleted at the end of stage 2): runs the Python and the TS on a file and diffs the JSON. Run on the demo NDA and on three builder fixtures written to a temp dir; record the result in the PR body.
- [ ] Commit `runtime: extract_redlines in TypeScript`.

### Task 6: `check.ts`

**Files:** `runtime/src/docx/check.ts`, `.test.ts`

- [ ] Port `extract_docx_blocks` (accept-all, `w:del`/`w:moveFrom` ancestors skipped), `extract_text_blocks` (markdown scaffolding stripped), `detect_format`, `locate`, the five checks and the auto-numbering note, the sort order and the summary. Port every regex verbatim (note the Python `(?-i:[A-Z])` inline flag → a separate case-sensitive test in TS).
- [ ] Failing tests: one fixture per finding type (undefined_reference, missing_exhibit, unused_definition, capitalization_drift, party_name_drift, undefined_term), the auto-numbering note, `.md` scaffolding stripping, severity sort.
- [ ] Cross-check on the demo NDA `.docx` and `.md`.
- [ ] Commit `runtime: check_document in TypeScript`.

### Task 7: Tools and the prompt

**Files:** `runtime/src/docx/index.ts`, `runtime/src/tools/docx-tools.ts` (+ test), `runtime/src/tools/builtin.ts`, `builtin.test.ts`, `runtime/src/loop/prompt.ts` (+ test), `primitives/read.md`

- [ ] `docxTools({ vaultRoot })`: `docx_read` `{ path }` (vault-relative; absolute paths refused) → `{ path, markdown, warnings }`; `extract_redlines` `{ docx }` → the JSON; `check_document` `{ file }` → the JSON. Paths resolve inside the vault only (reuse the store's path check by going through a `resolveVaultFile(vaultRoot, path)` helper that rejects `..`, backslashes, absolute paths, `.counsel`).
- [ ] `builtinTools` returns these three from `docxTools` plus the unchanged Python `clean_format`, `apply_redlines`, `word_compare`, and `docket_sweep`. Update `builtin.test.ts` (seven tools; `docx_read` on all platforms including `hosted`).
- [ ] `prompt.ts`: the three TS tools listed as tools with their fields; the script column reads "(built into the runtime)". Test asserts the table names `docx_read`.
- [ ] `primitives/read.md`: Word extraction = `docx_read` in the runtime (pandoc paragraph removed; the plugin path keeps the unzip fallback text only as "if you are not in the runtime"). `--redline` and `--qa` sections name the tools.
- [ ] Commit `runtime: docx_read, extract_redlines, check_document as runtime tools`.

### Task 8: Routes

**Files:** `runtime/src/server/routes.ts`, `routes.test.ts`, `runtime/src/vault/fs-store.ts` (+ `readBytes` on the store interface, optional), `runtime/src/core/types.ts`

- [ ] `VaultStore.readBytes?(tenant, path): Promise<Uint8Array>`; `FsVaultStore.readBytes` with the same `abs()` guards.
- [ ] `GET /vault/read` on a `.docx` (case-insensitive extension) → `{ path, kind: 'docx', content: markdown, version, mtimeMs, warnings }`; any other file → `{ ..., kind: 'text' }` (additive; existing clients ignore it). Unsafe XML → 422 with the part name; not a zip → 415.
- [ ] `GET /vault/download?path=` → bytes, `content-type` by extension (`.docx` → the OOXML type, `.md` → `text/markdown; charset=utf-8`, else `application/octet-stream`), `content-disposition: attachment; filename="<basename>"` (ASCII-sanitized + `filename*` UTF-8), same 400/404 mapping as read.
- [ ] Tests: docx read returns markdown and never the bytes; unsafe part → 422; download bytes equal the file, headers right; `..` → 400; missing → 404.
- [ ] Commit `runtime: /vault/read for Word documents, /vault/download`.

### Task 9: UI — the reader

**Files:** `runtime/ui/src/api/types.ts`, `runtime/ui/src/api/client.ts` (+ test), `runtime/ui/src/vault/sanitize.ts` (+ test), `runtime/ui/src/vault/markdown.ts` (+ test), `runtime/ui/src/v2/vault/Reader.tsx` (+ test), `runtime/ui/src/styles.css`

- [ ] `VaultFile.kind?: 'text' | 'docx'`, `warnings?: string[]`.
- [ ] `fetchBlob(path)` in client.ts: same auth header, returns the `Blob`; `saveBlob(blob, filename)` creates an object URL, clicks a hidden anchor, revokes.
- [ ] `markdown.ts`: `criticToHtml(source)` turns `{++…++}` → `<ins>…</ins>`, `{--…--}` → `<del>…</del>`, `{>>…<<}` → `<span class="v2-comment">…</span>` is NOT allowed (span attributes are stripped) — instead render comments as `<em class>`? No: keep the sanitizer strict. Comments become a blockquote-free inline `⟦comment: … — author⟧` in `<em>` via markdown emphasis; the converter emits them as `*⟦…⟧*` before marked runs. `ins`/`del` join `ALLOWED_TAGS`.
- [ ] Reader: when `file.kind === 'docx'` the body renders via `renderMarkdown`, the meta line becomes the set-text `WORD DOCUMENT · converted for reading · download · open the original` (both actions call `fetchBlob` → `saveBlob`; "open the original" = the same download, named as the mock), and warnings render as one muted line ("N items could not be shown"). Existing tests unchanged; new tests: docx renders `<ins>`/`<del>`, the Word line, download fetches `/vault/download?path=` with the bearer header and never puts the token in a URL.
- [ ] CSS: `.v2-doc-word` line (small-caps run-in + faint set text), `.v2-doc-md ins/del` using the proposal card's tints.
- [ ] Commit `ui: Word documents in the reader — converted body, download`.

### Task 10: Docs

**Files:** `CHANGELOG.md`, `skills/doctor/SKILL.md`

- [ ] `## [Unreleased]` entry (release.sh prepends its own section; verify it does not collide — if it would, put the notes under a `### Unreleased notes` block release.sh ignores).
- [ ] Doctor: remove pandoc from the dependency loop and the table; python-docx line reads "needed only for apply_redlines / clean_format until stage 2".
- [ ] Commit `docs: changelog + doctor for the TypeScript read path`.

### Task 11: Verification and PR

- [ ] `bun run test`, `bun run ui:test`, `bun run typecheck:runtime`, `bun run typecheck:ui`, `bun run ui:build`.
- [ ] Spare serve on 7497 with a throwaway home and a temp vault holding the demo NDA under `matters/sample/`; screenshot the reader.
- [ ] Push, `gh pr create`, report.
