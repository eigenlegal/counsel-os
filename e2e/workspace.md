# Standalone workspace browser checks

`workspace-import-preferences-smoke.py` uses the fresh `--empty` fixture on port 7459. It verifies reviewed working settings across several loose files, current/proposed Markdown, unchecked field/final consent, preserving unselected settings, Word author/filename examples, explicit field clearing, reload, stale concurrent changes and re-review, and original bytes. It checks 1440/390/320px layouts and makes no model calls. Run it through `with_server.py` with `WORKSPACE_TEST_DIST` pointing at the tested build; do not run it against a personal workspace. `import-preferences.test.ts` additionally covers field conflicts, strict partial schemas, forged confirmations, rollback, staged/committed backup and actual instruction/filename consumers.

`workspace-import-profile-smoke.py` runs on a fresh `--empty` fixture at port 7459. It checks company-profile separation, explicit lawyer identity, all supported profile preferences, unmapped sections, review/reload/commit, retained original bytes and importing a previously reviewed profile file without replacing an existing profile. Screenshots cover 1440/390/320px. The existing `workspace-import-smoke.py` also verifies manually designating an arbitrary file as a Profile source. Neither uses a live model or user records.

`bun e2e/workspace-mixed-import-check.ts --live --allow-plan-usage --provider codex --model MODEL` runs real classification over a fictional practice/company/loose-file corpus, followed by actual reviewed links, import and scoped context preparation with a scripted answer. It checks existing-matter reuse, same-company matter separation, uncertain files, reference/baseline separation, exact duplicates versus changed drafts, missing/unsupported files, original bytes and profile privacy. One Codex/Sol request passed 23 checks before a further profile-role assertion was added to the scripted regression. `mixed-import.test.ts` also verifies backup/reopen and repeated-file identification. No personal database is accepted, and the corpus does not qualify all layouts, formats or instruction/settings migration.

`workspace-recall-smoke.py` uses a fresh `--chat --recall` fixture on 7461. It asks about recruiting employees, checks that the saved nonsolicitation instruction is actually read/cited, and verifies **Response context → How Counsel searched**, reload, no unexpected network requests and 1440/390/320px layouts. No live model or user data is used. `recall-plan.test.ts` covers malformed/failed/timed-out planning, cancellation, bounded inputs, eight vocabulary gaps, scope-before-limit, historical/trashed/replaced records, Unicode passage windows, retry and backup/reopen.

Two opt-in synthetic checks consume the selected plan and never open a personal database:

```sh
bun e2e/workspace-recall-check.ts --live --allow-plan-usage --provider codex --model MODEL
bun e2e/workspace-recall-answer-check.ts --live --allow-plan-usage --provider codex --model MODEL
```

The first makes eight planning requests and compares original versus expanded top-three recall. The second runs one complete planned/read/cited answer and checks that the Practice baseline stays unchanged, no proposals are created and an unrelated matter remains unread. A Codex/Sol run passes both after correcting strict matching and hyphen variants; this small fictional corpus does not qualify arbitrary legal questions or every provider.

`workspace-upkeep-smoke.py` uses a fresh `--chat --upkeep` fixture on 7461. It verifies event-driven source/import findings, missing staged links, exact-version leave-as-is/reload/restore, explicit AI filing handoff without a model call, manual check history and automatic resolution after real filing. Screenshots cover 1440/390/320px. Backend `upkeep.test.ts` adds transaction rollback/coalescing, missed-event periodic reconciliation, paged results, stale review, failure/retry, response-priority scheduling, real SIGKILL, schema-15 migration and backup/restore/tampering checks. All data is synthetic. No user workspace or live model is used.

`workspace-import-alignment-smoke.py` checks the centered intake option and shared label/disclosure edge at 1440/390/320px, including wrapped text, label clicks and keyboard toggling. It changes no workspace records and makes no model calls.

`workspace-import-links-smoke.py` checks two selected roots, ordinary relative links and wiki references, missing and ambiguous targets, explicit two-matter sharing of one company-background source, editable staged choices, reload and separate final import. Screenshots cover 1440/390/320px. Both use a fresh `--chat` fixture on 7461 through the helper below. Backend `import-links.test.ts` also checks code-block exclusion, outside/traversal refusal, capped/paged coverage, stale/renamed review, consent/authentication, active-AI exclusion, backup/restore, cleanup guards and actual scripted-chat prepared context after import. No live model or real user folder is used.

`workspace-background-import-smoke.py` runs against a fresh `--chat` fixture on 7461. Eleven synthetic files with generic names exercise default-on disclosed AI organization, two content-based batches, matching an existing NDA matter while separating an employment dispute and uncertain company background, navigation/reload, whole-batch clear suggestions, separate final import, and 1440/390/320px layouts. No real workspace or model is used. Screenshots are saved under `e2e/.tmp/workspace/background-import-*.png`.

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-background-import-smoke.py
```

`bun e2e/workspace-background-import-check.ts --live --allow-plan-usage --provider codex --model MODEL` uses a new retained synthetic workspace and the actual background worker. It checks eleven files across two model requests: consistent new NDA grouping, a distinct existing employment matter, unfiled company background, no promotion of a deal concession and no import before confirmation. One Codex/Sol run passes all eight checks. It consumes the selected plan and must be explicitly enabled; it never accepts a personal database or qualifies arbitrary corpora generally. `import-organization-jobs.test.ts` additionally covers 121-file paged review, guarded corrections, pause/resume, stale control races, failed model output, locality/profile exclusion, schema-14 migration and verified backup/restore. The existing selected-only organization smoke remains a regression check.

`workspace-citation-smoke.py` runs against a fresh `--chat` fixture on 7461. It exercises real read/cite tools with a scripted provider: quote-only location, correction of a wrong legacy offset, repeated wording that needs disambiguation, and an altered quote that remains unverified. The activity view groups only the two genuinely recovered retries, retains the unresolved failure and all original diagnostics, works with the keyboard at 1440/390/320px, and does not rewrite saved history on reload. Screenshots are saved under `e2e/.tmp/workspace/citation-recovery-*.png`. No real workspace or model is used.

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-citation-smoke.py
```

`workspace-sidebar-smoke.py` uses a fresh `--chat` fixture on 7461. It verifies actual matter visits, durable pins/collapse, current titles and archive/restore across tabs, distinct new chat/history, selected outputs navigation, short/mobile scrolling and keyboard access. `navigation.test.ts` also covers records beyond the bounded catalog, atomic multi-connection changes and verified backup/restore without legal state changes.

`workspace-preference-proposals-smoke.py` uses a fresh `--chat` fixture on 7461. It exercises a chat-generated NDA instruction proposal, exact before/after review at 1440/390/320px, explicit confirmation, next-chat context, undo and stale/dismissal behavior. No live model is called. Backend tests also cover atomic receipt failure, failed completion, strict input/authentication, field preservation and verified restore.

`bun e2e/workspace-preference-loop-check.ts --live --allow-plan-usage --provider codex --model MODEL` makes two authorized live calls on synthetic records: propose a future NDA approach, confirm through the application, then ask a separate chat how it will work. It checks unchanged settings before review, preservation of unrelated fields and exact next-turn snapshots. `workspace-retrieval-check.ts` with the same flags tests natural matter-status and follow-up questions against scoped saved notes. Both runners preserve only their new synthetic temporary databases and print bounded workflow evidence; neither accepts a user database or establishes general legal-quality qualification.

`workspace-brief-drafting-smoke.py` uses a fresh `--chat` fixture on 7461. It checks centered assistance controls at 390/1440px, explicit invocation, exact saved-record receipts, unsaved suggestions, undo and manual brief saving; it also checks full Markdown writing preferences and preservation across document/writing views. The server is scripted: no live model or personal workspace is used. The backend `brief-drafting.test.ts` covers scoped historical reads, partial/omitted coverage, absent history, strict authentication/validation, stale revisions and the shared concurrency/cancellation boundary. `working-preferences.test.ts` checks full-context snapshots and old-client field preservation through the actual HTTP route.

The in-place drafting/preferences/history checkpoint adds `workspace-drafting-preferences-smoke.py` against `bun e2e/workspace-server.ts --chat` on 7461. It checks manual entry, explicit model invocation, undo, cancellation, failure preservation, no premature records, preference persistence/conflicts, context receipts, desktop/mobile, and distinct history/new-chat navigation. The profile suite checks Settings → Practice navigation, separate profile/document-preference views, browser Back, Markdown rendering and exact saved text, with unchanged sharing/snapshot behavior. Saved document preferences have a read-first view and an explicit editor. `workspace-templates-smoke.py` additionally checks the 24px search-to-results gap in empty, populated and no-match states.

`bun e2e/workspace-preferences-check.ts --live --allow-plan-usage --provider codex --model MODEL` runs two subscription-consuming synthetic checks in a new retained temporary workspace: a tool-free inline draft and an NDA redline following saved comment style, author and filename settings. No real user workspace is read. Validate/render its `original.docx` and `redline.docx` before accepting results; the runner checks semantics/metadata, not visual fidelity or general legal quality.

The workspace has its own browser suite because it uses the new SQLite service rather than the legacy runtime. `workspace-server.ts` creates an isolated temporary database and seeds only synthetic examples. It deletes that temporary fixture on shutdown. Never point this test server at a personal workspace.

Build the UI with `bun run ui:build`. Install Python Playwright in a test virtual environment and its Chromium browser (`python -m playwright install chromium`). No Python dependency is added to the application.

Run both fixture servers in separate terminals:

```sh
bun e2e/workspace-server.ts
bun e2e/workspace-server.ts --empty
```

Then run:

```sh
python e2e/workspace-smoke.py
```

The actual launch command has a separate stop/reopen check, using only the Python standard library:

```sh
python3 e2e/workspace-launch-smoke.py
```

It starts the real launcher with an explicit temporary database, checks authenticated access, adds a record, stops and restarts, and verifies persistence and seed idempotency. It does not open a browser or print its launch token.

Alternatively, the webapp-testing skill's `scripts/with_server.py` helper manages both servers and shuts them down automatically:

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts' --port 7458 \
  --server 'bun e2e/workspace-server.ts --empty' --port 7459 \
  -- python e2e/workspace-smoke.py
```

The hard-coded token is for these synthetic test servers only. The actual launcher uses a cryptographically random per-process token.

`workspace-inspect.py` is a read-only initial screenshot/DOM inspection. The acceptance suite changes only the temporary fixture data and covers record creation, decisions, citations, approval/rejection, current and historical search, missing-text coverage, failed saves, unsaved forms, desktop/mobile navigation, and missing-session recovery. It rejects uncaught browser errors and external network requests. Screenshots are saved under ignored `e2e/.tmp/workspace/`.

## Conversation acceptance suite

`workspace-conversation-management-smoke.py` uses the same `--chat` fixture below. It checks rename, Active/Archived/Trash navigation, retained-output previews, restore, prompt suppression on retained outputs, reload, stale-tab conflicts, desktop/mobile layout and delete-button hover contrast. It makes no external requests or real model calls. Permanent erasure and independent record deletion are not represented as available.

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-chat-smoke.py
```

The `--chat` fixture supplies a clearly labeled deterministic provider that calls the real app tools and emits delayed synthetic responses. It is not reachable from the production workspace launcher. No model credentials, live model calls, or API billing are involved.

The suite checks:

- Two simultaneous responses, chat switching, reload, and reopening in another browser tab.
- Independent unsent drafts and durable completed work.
- Real retrieval/read/cite activity, context receipts, and exact-passage inspection.
- Inline knowledge review with explicit human action and attribution from the saved profile.
- Text upload, retained source versions, and unsupported-format feedback.
- Independent cancellation and provider failure without completed-work side effects.
- Sanitized model Markdown, no remote image requests, and no browser exceptions.
- Mobile composer/navigation/source dialogs, Escape dismissal, and no horizontal overflow.

These prove application behavior with scripted output, not live provider quality. Subscription authentication/renewal, provider tool use, legal-work quality, and model access require a separate live synthetic evaluation.

## Single-user profile suite

Run against a fresh chat fixture, separately from the conversation suite:

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-profile-smoke.py
```

This covers optional name-first onboarding, opening setup above an unfinished decision form, persistence after reload, library and inline approvals without repeated name entry, inspectable per-response profile snapshots, and sharing off for subsequent responses. Renaming preserves earlier snapshots and approval names. Stale and failed saves retain entered text and offer explicit reload/retry. Mobile checks cover focus, scrolling, plain-text rendering, and unsaved-change confirmation. Saving a profile must not send a model request. The entire suite uses synthetic data and the deterministic test provider.

Profile setup follows the same design language: required identity first, optional practice context and preferences behind disclosures, and no account or team administration. The checkbox row uses the shared control layout. Modal headings have unique IDs so inline onboarding remains accessible above another open form.

## Claude Code connection suite

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --claude-cli' --port 7462 \
  -- python e2e/workspace-claude-smoke.py
```

This fixture uses the actual connection service and CLI adapter, but launches `runtime/src/workspace/fixtures/claude-cli.ts` as a synthetic child process. It never invokes the user's signed-in CLI or reads real credentials. It tests choosing Claude Code, safe local sign-in metadata, explicit billing/mismatch feedback, settings persistence, an end-to-end scoped answer with an exact citation, API-key input clearing, and mobile layout. The webapp-testing skill's browser workflow verifies these real UI states after the built app loads; scripted answers remain test evidence, not model-quality evidence.

## Shared control regressions

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts' --port 7458 \
  -- python e2e/workspace-controls-smoke.py
```

This checks computed dropdown geometry in settings, chat, search, and editors;
new bare dropdowns, RTL, listboxes, and forced-color fallback; button contrast
on hover/press and while disabled; keyboard focus; single-row library filters;
and the styled native file picker's actual chooser/upload on desktop and mobile.
The chat suite also checks avatar/byline alignment during a response.

`runtime/ui/src/controls.css` is imported by both app entry points. Native
single-select controls automatically reserve a 14 px edge inset plus indicator
and text clearance; do not override that geometry in individual forms. File
inputs retain native keyboard/chooser behavior with a shared `::file-selector-button`
treatment. Workspace actions use `button`, `button button-primary`, or
`button button-quiet`; variants define state colors in one place rather than
adding another `.primary` hover rule in a feature stylesheet. Generic form
defaults have zero specificity so they cannot restyle a composed search field.

Practice category, status, and text filters have a dedicated browser regression:

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts' --port 7458 \
  -- python e2e/workspace-practice-filter-smoke.py
```

It checks all categories, combined filters and reset, keyboard focus, the shared
caret treatment, and toolbar geometry at nine widths from 320 to 1440 px. The
category and search controls share a compact toolbar alongside status tabs;
smaller screens wrap them without clipping labels or overflowing. Existing
matter and saved-output searches are also exercised. Only synthetic fixture
records are added; no model calls or user workspace changes are made.

## Backup and revision checks

Run each against its own fresh fixture:

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts' --port 7458 \
  -- python e2e/workspace-backup-smoke.py

python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-source-updates-smoke.py

python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-knowledge-updates-smoke.py

python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --briefs' --port 7472 \
  -- python e2e/workspace-brief-proposals-smoke.py
```

Backup tests download a real file, check the downloaded copy, reject truncation, and run the real restore launcher into a new temporary folder. Original uploads and Word exports must download byte-identically after recovery. Unit tests cover live WAL snapshots, excluded connection settings/free-page remnants, corrupt originals/exports, strict schemas, duplicate/concurrent operations, permissions, incomplete-restore guards, authentication and body limits.

Revision tests exercise current/history retrieval, retained original downloads, chat/output currentness annotations, explicit save after file selection, inline knowledge edits before approval, unchanged active knowledge until approval, protected maintained ownership and failed stale saves without losing entered text. Unit tests also verify that already-authorized source/approved-knowledge passages stay citable across concurrent revisions without admitting unread historical or out-of-scope content. No live model, client file or real user workspace is used. Inspect the desktop/mobile screenshots for each flow.

The brief-proposal suite checks a real inline review card, desktop/mobile comparison, explicit acceptance, durable receipts, a stale edit after opening the comparison, retry/refresh, and dismissal without overwriting a later manual brief. Backend tests cover atomic rollback, failed/cancelled turns, repeated review requests, two competing chats, truncated contexts, scope boundaries, strict HTTP payloads, and proposal/review preservation after backup recovery.

`bun run workspace:qualify --fixture` independently exercises the provider-runner path with scripted models and real tools, outputs and Word artifacts. Without arguments it prints a plan and makes no calls. Live runs require `--live --provider codex|claude-code --model MODEL --allow-plan-usage`; they consume subscription usage and are not part of unattended tests. The runner retains only a newly created synthetic workspace, never opens a user workspace or offers API billing, and requires human review even when structural checks pass. See the workspace README for bounds and remaining qualification gaps.

## Reader, templates, model selection and folder import

The searchable matter picker, composer/upload file drops and exact prompt-copy controls have a separate regression suite:

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --chat' --port 7461 -- python e2e/workspace-picker-drop-smoke.py
```

It creates 514 synthetic matters to check lookup beyond catalog limits, accent-insensitive multiword search, full names, keyboard cancellation/selection and mobile layout. It verifies that file drops use the real upload endpoint, attach all successful files to the chosen matter, retain draft text, report partial failures, and do not send a model request. Prompt copying is checked byte-for-byte through the browser clipboard.

Run these against separate fresh fixture processes after `bun run ui:build`:

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts' --port 7458 -- python e2e/workspace-reader-smoke.py
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --chat' --port 7461 -- python e2e/workspace-templates-smoke.py
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --chat --model-catalog' --port 7461 -- python e2e/workspace-models-smoke.py
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --empty' --port 7459 -- python e2e/workspace-import-smoke.py
```

These check preserved Markdown text, imported metadata, library naming, template original bytes/retirement/handoff, independent per-chat model choices and receipts, and folder staging/review/profile/commit/discard. Desktop and narrow screenshots must be inspected. Model fixtures do not contact a vendor. Import fixtures are synthetic checked-in files; browser directory tests verify every page of entries is traversed, while hidden infrastructure is not traversed.

Run `workspace-import-queue-smoke.py` against the same `--empty` fixture on 7459 (separately from the import suite). It delays upload acknowledgements to verify transfer continues after leaving the page, checks the navigation progress link, pauses an import, closes the tab, resumes from a new tab and reselects only missing originals. Failed-parser retry uses the retained bytes with no new upload. Screenshots cover transfer, pause and recovery on desktop/mobile. Backend import tests additionally interrupt an active parser, reopen pending jobs, preserve pause in backup/restore, and migrate schema-11 staging without changing records. Uploaded files remain outside search/chat until reviewed commit. File-count, staging and backup limits have not been raised by the queue change.

`bun e2e/workspace-codex-preflight.ts` separately exercises the real installed CLI against loopback fake model/MCP endpoints with no login credentials. It checks direct Counsel tool availability and that the code-mode host is denied. Passing this bounded test is not a general sandbox guarantee.

## Design direction

`workspace-multi-matter-smoke.py` uses the `--chat` fixture on 7461. It verifies no-client multi-selection, search with retained choices, keyboard cancellation, draft reload, mobile checkbox alignment, context inspection, synthetic read/cite responses, frozen receipts, independent new chats, and the single-matter shortcut. `multi-matter.test.ts` covers schema 10 migration/backup compatibility, selected-union retrieval isolation, invalid/mixed selections, no cross-matter output filing, frozen metadata, restore and authenticated routes. Schema 11 scope state is additive. Set `WORKSPACE_TEST_DIST` on the fixture server to test a separate UI build without publishing unfinished changes to a running personal workspace.

Matter selection and **View context** share a compact header inside the composer. Added documents appear directly underneath only when present, in a bounded list; there is no empty-document row. The writing area and attachment/model/send toolbar complete this single surface. A **Practice preferences** link and desktop keyboard hint form the quiet footer; save/approval details live in the context panel. The conversation title stays at the top. The entire composer, including its context header, accepts document drops. **View context** opens the next-message setup; **Latest response** and each answer's record receipt open the exact saved response context. Automatically prepared/read documents appear in those receipts, not as permanent attachments; search hits alone are not read receipts. Pending attachments and newly edited preferences must never appear in an older receipt. Profile sharing and matter/client retrieval boundaries are unchanged.

`e2e/workspace-chat-context-layout-smoke.py` runs against the `--chat` fixture on port 7461. It verifies the integrated composer at 320/390/1440px, current versus historical preferences and attachments, disabled-profile privacy, pending attachment removal, the 12-document bounded layout, and desktop/mobile keyboard behavior. `workspace-composer-smoke.py` also verifies that opening Practice preferences and returning preserves the draft. `workspace-picker-drop-smoke.py` checks long selected matter names without overlapping the context control at 320/390px. The adapter is synthetic; this is not live model qualification.

The toolbar uses equal, compact 32px attachment/model/send controls and a 12px inset on all sides. The model label is a single line; connection details remain in its tooltip, accessible description and model picker. The composer smoke test checks computed heights, text-center alignment and bottom/right spacing at 320/390/1440px. It also exercises a rapid desktop/mobile resize after browser Back, so the textarea cannot retain an intermediate-width height while its text overflows.

`e2e/workspace-preference-reading-smoke.py` uses the same fixture to verify the single profile-wide Reading view / Saved text switch and live Word filename examples. `{variant}` defaults to `redline` for tracked-change outputs and `draft` for answers downloaded as Word; separate customizable labels allow conventions such as `{document} ({variant} {date})` with “ExampleCo redline” and “Draft”. Both previews and actual exports use the same formatter. Labels are pinned per response, preserved on backup/restore, and never rename earlier artifacts. Older snapshots and clients retain their original naming behavior. Backend interface version 6 is required to save customized labels.

### Entity and signing-rule checks

After `bun run ui:build`, run against a fresh synthetic fixture:

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --chat' --port 7461 -- python e2e/workspace-entities-smoke.py
bun test runtime/src/workspace/entities.test.ts
```

The browser test creates entities, people and rules through the UI, preserves unknown fields, checks the exact inclusive boundary/one-cent-over/missing value, confirms setup makes no conversation and sharing stays off until explicitly enabled, then inspects exact chat read/check receipts across reload. It captures desktop/mobile layouts. The provider is scripted: no private workspace or live model is involved. Backend tests cover unknown rule basis, FX/basis mismatches, overlaps, inactive people, stale writes, pinned response snapshots after sharing changes, strict authenticated routes and actual restore-and-compare of full working preferences, registry and historical checks. These are integration tests, not model-quality qualification or verification of corporate signing authority.

### Automatic imported context checks

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --context' --port 7473 \
  -- python e2e/workspace-context-smoke.py

# No model calls by default. The explicit live invocation consumes subscription usage.
bun e2e/workspace-context-check.ts
bun e2e/workspace-context-check.ts --live --allow-plan-usage --provider codex --model gpt-5.6-sol
# One policy assessment only, for a focused law-context check:
bun e2e/workspace-context-check.ts --law-only --live --allow-plan-usage --provider codex --model gpt-5.6-sol
```

The browser fixture exercises natural chat, exact citation of an automatically supplied passage, reusable-library availability versus preparation/read receipts, imported Practice copy, reopen, desktop/mobile layout, and no external requests. It is scripted provider output, not a model-quality test. `context-preparation.test.ts` covers receipt-backed sharing, other-matter/profile exclusion, spoofed provenance, preserved categories, source/approved-version pinning, rejection, duplicate read coverage, exact citations and verified backup/restore.

Interface 19 adds evidence-following and balanced preparation. Run `workspace-evidence-context-smoke.py` against `workspace-server.ts --context --evidence-context` on 7473, using the same helper above and a current private `WORKSPACE_TEST_DIST` build. It verifies exact prepared records, the evidence-following/coverage explanation, reload and desktop/mobile layout. `evidence-discovery.test.ts` covers scope-filtered supporting metadata, unavailable identities, separately labeled new versions, exact offsets, one-hop/read bounds, backup/restore, response-local read handles and ranked-topic search fallback. Search results and supporting links never count as reads or automatically grant access.

`bun e2e/workspace-evidence-context-check.ts` makes no model call by default. With `--live --allow-plan-usage --provider codex --model gpt-5.6-sol`, it runs two synthetic chats: find the actual lender-certificate evidence behind earlier transfer advice, then recognize a revised source after reopen without reading the inaccessible old revision or changing Practice/the brief. Review the actual answers for the unresolved-versus-signed certificate distinction and absence of closing approval. The first run caught an incorrectly copied UUID and misleading missing-document claim; read handles/recovery wording fix that path. Subsequent runs pass; this is bounded integration evidence, not general retrieval/model qualification.

The live runner uses only a retained temporary synthetic workspace, not user files. Five cases test policy assessment, unscoped baseline recall, historical follow-up, a matter concession, and an explicit baseline replacement; the first two run concurrently. Inspect answers as well as structural checks. Initial runs passed the latter four cases but failed the policy case's law-citation assertion: the model treated the fictional law as non-governing where no jurisdiction had been established. After adding the fictional jurisdiction to the synthetic matter facts, a focused one-response run applied/cited both fictional law references, matter facts and the baseline and labeled its limitations. Record that fixture change; do not call the initial runs all-pass or infer comprehensive qualification from the focused result.

Cool paper (`#f5f7fa`), white reading surfaces (`#ffffff`), midnight navigation (`#172e49`), dark ink (`#23354b`), blue actions (`#315ed2`), and green confirmed decisions (`#236c56`). Avenir Next, with local Avenir/Segoe UI fallbacks, provides both the interface and reading type. No remote fonts or image requests.

Chat is the front door. A persistent conversation rail shows independent running/completed states; matters, knowledge, references, and search remain secondary surfaces. Saved outputs is a small secondary link, not a peer Work workflow. The reading column gives the answer most of the space, with a composer anchored below and an on-demand source/context panel alongside it. Matter pages use a left-aligned brief and conversation/output lists, with a narrower column for unresolved questions and next steps; mobile stacks the columns. Tabs separate related chats, documents, outputs and decisions without introducing primitive modes. Context scope is explicit. Provider setup stays in Settings. Mobile navigation collapses, the source reader becomes a dialog, keyboard focus is visible, and reduced-motion preferences are honored.

The frontend-design skill informed the restrained local-font palette, reading-first layout, quiet update receipts, and progressive disclosure. The Word/PDF skills informed preservation of original bytes, tracked-change visibility, honest extraction limitations, and rendered verification of Word exports/redlines. Live provider qualification, advanced document editing, OCR, maintained-content updates, and packaging are not complete.

## Automatic notes, existing Practice edits and native Word redlines

Run each browser script against a fresh fixture:

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --briefs' --port 7472 -- python e2e/workspace-automatic-brief-smoke.py
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --context' --port 7473 -- python e2e/workspace-chat-practice-updates-smoke.py
python /path/to/webapp-testing/scripts/with_server.py --server 'bun e2e/workspace-server.ts --chat' --port 7461 -- python e2e/workspace-redline-smoke.py
```

These check real storage/API behavior with scripted model output: automatic brief before/after and undo/reopen; a new version of the existing Practice item with its baseline unchanged; a stale chat card that cannot approve a newer unseen version; retained Word originals, native insertion/deletion/comment XML, pinned original links, exact download/retry/reopen and Saved outputs. Desktop/mobile screenshots need visual inspection after waiting for content, not just the dialog shell. No real client data or remote model calls are used.

Additional synthetic live checks require explicit plan-usage authorization. Default invocations make no model calls:

```sh
bun e2e/workspace-recordkeeping-check.ts
bun e2e/workspace-recordkeeping-check.ts --live --allow-plan-usage --provider codex --model gpt-5.6-sol
bun e2e/workspace-redline-check.ts --fixture
bun e2e/workspace-redline-check.ts --live --allow-plan-usage --provider codex --model gpt-5.6-sol
```

The recordkeeping runner exercises a natural matter update and an explicit practice-standard change concurrently, then verifies recall after synthetic human approval. The redline runner retains a generated synthetic original and the model's edited copy beside its temporary SQLite database. Both runners passed their bounded live Codex checks at this checkpoint; inspect actual answers, not just booleans. Neither runner accepts an existing user workspace.

Validate each retained redline with the Word skill's `office/validate.py REDLINE --original ORIGINAL --author Counsel`. Render original and redline with the documents renderer and inspect every page, checking preserved headings, table, pagination and native revision markup. The checkpoint's model-free and live files both passed validation and visual inspection. A portable read-only LibreOffice mount supplied QA rendering locally; it is not an app dependency or a system installation. App generation uses the existing Bun OOXML engine. Larger original layouts, existing-review rounds and structural edits need a much broader corpus before fidelity claims.

## Word export checks

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-export-smoke.py

bun e2e/workspace-export-fixture.ts /explicit/temporary/qa-output
```

The browser suite exports a real completed fixture answer, checks linked source anchors and status in the downloaded DOCX, re-downloads identical bytes after a page reload, verifies automatic output discovery and failure/retry recovery, and checks the narrow layout. It asserts no extra model request or external fetch. Backend tests cover authenticated routes, strict input, idempotent concurrent requests, retained earlier files after renaming/source changes, schema upgrade, Unicode filenames, bounds and integrity failures.

The render fixture uses the production generator for a short assessment and a multi-page chronology. Render each DOCX using the documents skill's `render_docx.py` (Python 3.10+ with `pdf2image`, `python-docx`, LibreOffice and Poppler), then inspect **every page**. Review headings, starting list numbers, nesting, column widths, row continuation, repeated table headers, page numbers and the source appendix. The chat suite's downloaded `chat-export.docx` also needs rendered inspection for its citation link. Rendering dependencies are QA-only, not part of the app's runtime requirements.

## Matter hierarchy and document intake

Run each against a fresh `--chat` fixture, separately:

```sh
python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-matters-smoke.py

python /path/to/webapp-testing/scripts/with_server.py \
  --server 'bun e2e/workspace-server.ts --chat' --port 7461 \
  -- python e2e/workspace-documents-smoke.py
```

The matter suite checks the simplified navigation, versioned brief, scoped chat list, manually named output and originating-conversation link, documents/decisions views, persistence, mobile layout, and organizing a conversation into a new matter after it starts. Backend tests additionally cover automatic output preparation with a deterministic provider, failed-output rollback, scope-before-limit catalogs, organizing retries and conflicts, and retained historical scope.

The document suite generates synthetic Word/PDF fixtures in memory and drives the real upload, parser and original-download routes. It checks tracked changes, partial/no-text coverage, exact downloaded bytes, matter links, unsupported/broken input, and mobile recovery. The actual-launcher suite additionally imports a Word file larger than the old request ceiling, verifies exact downloads across restart, and checks that ordinary JSON routes retain their smaller size limit. Uploading does not send a model request. Parser tests cover unsafe XML, ZIP expansion limits, oversized/invalid files, extraction metadata persistence, exact-page citations and original integrity failures. No real client documents or signed-in model sessions are used.
# Repeatable local release gate

`bun run workspace:check` prints a plan without running checks. To execute:

```sh
bun run workspace:check --run --python /path/to/playwright/python
# Opt in separately to scoped synthetic Microsoft Word automation on macOS:
bun run workspace:check --run --python /path/to/playwright/python --native-word
```

Requires the installed Codex/Claude CLIs, Python with Playwright/Chromium, local dependencies and a built launcher UI. The runner builds into its own private directory and requires fresh runtime assets to match `runtime/ui/dist` byte-for-byte; it never overwrites the running application's assets. Source maps contain output-relative paths, so their full fingerprints are retained and checked for changes within each build, not equality across the two output directories. If runtime assets differ, update the normal build when the app is stopped and rerun. It refuses occupied test ports rather than stopping their owners. Every browser suite owns a fresh fictional workspace; no existing database or live-model option is accepted.

The retained private `report.json` records the tested source fingerprint (including untracked code), UI fingerprints, runtime, commands, timings and per-check result. Bounded sanitized logs retain installed CLI/Python/browser versions. Source, assets or CLI-version changes invalidate the run. Typechecks, backend/UI/runner tests, model-free workflow scenarios, both Codex tool modes, Claude's fake endpoint, actual launcher restart, browser document/import/recall checks and Word package checks must all pass. Timeouts/cancellation stop only owned process groups; missing dependencies or failed cleanup are not green checks. Current browser screenshots are copied beside the report. Native Word artifacts stay in the exact synthetic folder recorded in its log and still require independent XML validation and inspection of all four rendered PDFs.

This is a local engineering gate, not a general release certification: it does not establish live subscription isolation/token renewal, document visual quality, arbitrary corpus accuracy, clean dependency installation, installer/onboarding, signed updates/rollback or other-platform behavior. Reports retain these limits even when local checks pass. No user files/settings or vendor model capacity are used. Native Word remains explicit opt-in and never uses the active document or quits Word.

# Unified Practice and record management

`workspace-practice-library-smoke.py` runs against `workspace-server.ts --context` on 7473. It verifies the combined library, imported baseline reading without reapproval, originals, template detail, matter filing/unlinking, and recoverable document/output Trash at 1440 and 390 pixels. Synthetic records only; no model calls. Screenshots are retained in `e2e/.tmp/workspace/`.

## Larger imports and streaming recovery

`workspace-large-import-smoke.py` runs against a fresh `workspace-server.ts --empty` on 7459. It transfers 601 synthetic files through the actual browser, checks constant-size acknowledgements and 50-row pages, searches an off-page record, changes it to a template, verifies whole-import sharing confirmation from another search, commits all 601 records, and checks 1440/390px layouts. Run it separately from `workspace-import-smoke.py` and `workspace-import-queue-smoke.py`, which share that port. Set `WORKSPACE_TEST_DIST` to an isolated Vite build while the user's app is running.

`workspace-backup-smoke.py` uses the default fixture on 7458 and a temporary restored launcher on 7468. It exercises native streamed download, file verification, corrupt-file rejection and restore into a new folder. Backend tests additionally verify a 275-MB staged-original backup through file/stream APIs, exact hashes, capability authentication/single-use/cross-origin boundaries, schema-12 cache migration and tamper rejection. No model calls or user records are used.
# September 7 import, Word and dependency checks

## Interface 20 source/credential/Word qualification

`bun e2e/workspace-word-roundtrip-check.ts` generates a synthetic fidelity corpus; `--native` additionally runs scoped Microsoft Word preserve/accept/reject/clean checks, closes/reopens each saved file and exports four native PDFs for visual inspection. It never uses the active document, changes Word globals or quits Word. Native runs create unique synthetic directories under Word's existing `~/Library/Containers/com.microsoft.Word/Data/tmp/`: fresh external temporary directories otherwise trigger a new per-folder Grant File Access prompt on each run, even after an earlier grant. Do not request wider filesystem access to run these tests. Validate **each** of the three generated inputs and four Word-saved packages independently with `office/validate.py`, then validate the preserved native redline against the original with `--author 'Synthetic Avery'` and inspect every native PDF page. All checks and four rendered pages passed in Word 16.112.3 after the directory fix. A future timeout or failed scoped close is still not a pass and may leave only its generated test file open; never close user documents or quit Word as a workaround.

Add `--statute` to the live `workspace-authority-check.ts` command to exercise House U.S. Code retrieval, reading statutory notes, exact citations and distinct currency dates. Both the normal eCFR and statute live runs passed with `--live --allow-plan-usage --provider codex --model gpt-5.6-sol` using synthetic workspaces. For model-free browser checks use `workspace-server.ts --chat --authority-fixture --statute-fixture`, then `workspace-authority-smoke.py --statute`. It checks receipts, retained versions, refresh, reopen and narrow layouts.

`bun test runtime/src/workspace/codex-auth.test.ts runtime/src/workspace/codex-auth-cache.test.ts` covers renewed-cache reuse, read-only source login, invalidated/logged-out cache removal, private files, account boundaries, cancellation and actual process-death lease recovery. No real credentials are used in those fixtures. Re-run installed-CLI `workspace-codex-preflight.ts` (also `--no-tools`) and `workspace-claude-preflight.ts` after provider changes. Those local fake-endpoint probes passed again; they do not qualify actual expired-token renewal, whole-host orphan CLI cleanup or Claude's subscription account-context isolation.

Current automated suite counts: 460 workspace/document tests, 724 UI tests. Packaging remains out of scope.

Run `workspace-import-organization-smoke.py`, `workspace-redline-smoke.py`, `workspace-rounds-smoke.py`, `workspace-source-updates-smoke.py` and `workspace-reference-impact-smoke.py` separately against the synthetic `--chat` fixture on 7461. They exercise reviewed bulk/AI filing, exact original-package changes/insertions, negotiation-round comparison, direct/indirect reference-update notices, supporting passages, desktop/mobile and unchanged historical state. `workspace-sidebar-smoke.py` holds navigation saves to reproduce the pin-opacity regression.

Opt-in live checks: `bun e2e/workspace-import-organization-check.ts --live --allow-plan-usage --provider codex --model MODEL`, with the same flags for `workspace-insert-check.ts` and `workspace-rounds-check.ts`. Each creates only synthetic data; the Word checks retain their temporary artifacts. The insertion passed OOXML/tracking validation and independent LibreOffice rendering. Its earlier native-open timeout was later traced to folder-access prompts; the expanded native corpus above now passes. A round check caught and regression-tested clean counterproposals being mislabeled as baseline reversions.

## Publisher lookup, completed-import cleanup and saved-file organization

- `workspace-authority-smoke.py`: use `workspace-server.ts --chat --authority-fixture` on 7461. Only the fixture's eCFR calls are replaced by synthetic responses. It checks dated receipts, exact source versions, publisher metadata, refresh/history and mobile. `workspace-authority-check.ts --live --allow-plan-usage --provider codex --model MODEL` runs one synthetic citation-only lookup against the real publisher and verifies retained XML, read/cite and date distinctions. It sends no practice files.
- `workspace-import-maintenance-smoke.py`: use `--empty` on 7459. Checks cross-import exact originals, explicit selected duplicate skips, guarded cleanup, protected used records, recoverable originals, reload and mobile.
- `workspace-source-organization-smoke.py`: use `--empty --chat` on 7461. Checks 61-file off-page filing, selected-only AI suggestions, unfiled uncertainty, explicit matter links, stale whole-action refusal and mobile. `workspace-source-organization-check.ts --live --allow-plan-usage --provider codex --model MODEL` is one synthetic live helper run; it verifies that a deal concession remains matter-specific and generation does not change records.
- `workspace-redline-smoke.py` also checks separate confirmed clean proposals for text replacements and paragraph insertions, retained rationale/comments, unchanged originals/redlines, exact reopen and no additional model calls. Generated `chat-clean-proposal.docx` and `chat-clean-insertion.docx` pass the document skill's OOXML validator and independent LibreOffice rendering. Existing tracked revisions are a deliberate refusal, not an accept-all operation.

Use the testing skill's `with_server.py`, a private `WORKSPACE_TEST_DIST` build and the indicated port; run suites sharing a port sequentially. Fixtures never open a real workspace.

`bun test runtime/src/workspace/crash-recovery.test.ts runtime/src/workspace/lock.test.ts` deliberately SIGKILLs only guarded private fixture processes. It verifies acknowledged state, SQLite rollback, interrupted-turn recovery without a model rerun, resumed uploaded files and single ownership among eight simultaneous contenders. The dedicated launcher-lock SQLite inode remains on graceful exit; never unlink it while any launcher may hold it. These are local-host tests, not shared/network-filesystem or all-platform qualification.

## Connection enforcement and saved-rule/history qualification

`workspace-source-links-smoke.py` runs with `workspace-server.ts --chat --upkeep`. It creates a synthetic plugin note and a separate later company-folder import, waits for automatic dependency rechecking, reviews/adds a matter link, verifies the original and unrelated matter access are unchanged, checks missing references/durable dismissal, and opens the same review in the source reader. It covers 1440/390/320px and makes no model calls. Use the native Python Playwright environment and `with_server.py` helper as for the other workspace browser checks.

`bun e2e/workspace-codex-preflight.ts` and the same command with `--no-tools` run the installed CLI against a local fake Responses endpoint, without auth files or vendor inference. Both check the exact advertised tool surface and inject nine forbidden calls (code execution, shell, file patch/image, subagent, unrelated MCP and web access). All side-effect targets are private temporary canaries. Every attempted call must be rejected, the canary must stay unchanged/unread, no test-network request may occur, and chat mode must still execute one allowed Counsel tool. This catches capabilities that are routable even when not advertised. It is a per-installed-version check, not a general sandbox proof. The [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) documents shell/unified-exec flags; the [security guide](https://learn.chatgpt.com/docs/agent-approvals-security) distinguishes read-only permissions from tool removal.

`bun e2e/workspace-signing-brief-check.ts --live --allow-plan-usage --provider codex --model MODEL` runs two synthetic requests concurrently: saved entity/signatory rules through actual chat tools, and in-place matter-brief drafting from imported history plus prior draft advice. It checks NDA-only routing, an inclusive annual USD limit, above-limit fallback, unknown annual value, exact address/read/check receipts, unresolved status, scoped history and no automatic brief/Practice changes. Its temporary database and brief JSON are retained for answer review/reopen inspection; no existing workspace can be supplied. A default invocation makes no model calls. The Codex/Sol run passed all checks and manual answer review at this checkpoint.

The general `workspace:qualify` runner now records explicit search-call counts as observations, not mandatory evidence. A prepared/direct read with a verified citation can meet a scenario; a search call without the required read/citation cannot. Three retained live scenarios were rescored read-only after correcting that false-negative gate and passed the actual evidence requirements; inspect substantive answers separately from mechanical checks.

`bun test runtime/src/workspace/codex-auth.test.ts` uses a fake installed CLI and fake source login in a guarded child process. It checks separate concurrent homes, 0600 copies, private working directory, dropped ambient secrets/config, source-login preservation, a later login, logout/API-login refusal and cleanup/reaping after completion/failure/cancellation. It never reads real credentials. This is not a test of the vendor's token rotation or force-killed-host cleanup.

`bun e2e/workspace-claude-preflight.ts` uses the installed CLI, a synthetic HOME and a dummy API key against a local fake Messages endpoint. It checks seeded private-memory/account markers are absent and the one permitted MCP tool runs. It is **not a subscription authentication/isolation test**. Diagnostic `--safe-mode` intentionally fails the usable-tool gate because that mode removes MCP too; do not adopt it as a workaround. `--exclude-memory` tests explicit memory exclusion separately.

The first live Claude/Sonnet investigation run auto-applied a suggestion requested “for review.” `automatic-briefs.test.ts` now enforces common explicit review/no-save phrasing independently of the model at staging and commit. The deliberate rerun after the fix passes all three scenario checks, with original and rerun databases retained separately. Manual inspection also found a signed-in account email in a memo despite no workspace profile. That matches an [upstream user report](https://github.com/anthropics/claude-code/issues/81138), not proof that all private context is isolated. Connection disclosure and a prompt prohibiting login-derived attribution are mitigations only; subscription account injection remains an open qualification limit.
