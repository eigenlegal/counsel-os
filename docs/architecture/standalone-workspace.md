# Counsel OS — Standalone legal workspace

> **Date:** 2026-09-04
>
> **Status:** Accepted product direction; implementation is incremental
>
> **Replaces:** The shared-core requirement and contract-review-first scope in [dual-distribution.md](dual-distribution.md).
>
> **Implementation plan:** [Matter-and-knowledge milestone](../superpowers/plans/2026-09-04-standalone-workspace.md).

## September 14: resilient automatic import preparation

Interface 30 / schema 20 isolates organization failures by file. Valid sibling suggestions are retained, fresh files continue, and a rejected file gets one isolated repair attempt before becoming a reviewable exception. Authentication/provider failures still stop the job; restarting the application never silently replays a paid request. Excerpt IDs resolve to exact supplied text in application code; cross-file references and fabricated legacy quotations are rejected. This checks provenance, not semantic classification accuracy.

High-confidence suggestions automatically prepare staged filing choices, including existing-matter matches and proposed new matter groups. No record, matter access, profile setting or Practice approval is committed until the existing confirmation boundaries. Explicit filing edits are protected from later background classification. Retained legacy suggestions are prepared on explicit resume without reanalysis. A grouped destination summary and exceptions-first review replace the required row-by-row workflow; the full file table remains available. One explicit action can leave unresolved files unfiled without holding up the import.

The additive retry/protection table is included in backup validation. The launcher verifies a recovery archive before schema migration. Synthetic acceptance covers the reported 48-result interruption, bounded repair, valid sibling retention, backup/reopen, manual corrections and grouped import. This is not autonomous post-import filing, cross-import learned routing, external-folder sync or a claim of live-provider classification quality.

## Current import-settings checkpoint

Interface 28 / schema 18 adds reviewed, partial working-preference patches to staged import choices. Exact labeled source sections can populate writing, review, signing guidance and Word-output drafts without an inference call. The user reviews each field; final import separately confirms the combined patch. Conflicting values or differing/stale settings revisions block application, not files-only retention. Settings and retained originals commit together, and the receipt records the resulting working-preference revision. Optional JSON fields preserve old import/backup compatibility without a schema migration. Import cleanup does not undo profile or settings changes.

This conversion is separate from profile identity/sharing, semantic file classification, substantive Practice approvals and the structured entity/signatory directory. It does not execute imported instructions, infer an authority matrix, choose a person from a roster, shorten oversized rules, or configure providers. Generic application-instruction files remain excluded. Arbitrarily structured skill exports still need explicit mapping/manual review; full plugin migration is not claimed.

## Local qualification and distribution boundary

The repeatable `workspace:check` gate qualifies the source/build and bounded synthetic workflows, retaining per-check receipts rather than inheriting old test claims. The September 9 interface-28 run passes backend/UI tests, installed local CLI probes, launcher persistence, three browser flows and native Word round-trips; independent XML/render inspection is recorded separately. A local pass does not establish subscription-account isolation, actual credential renewal, arbitrary-corpus quality or signed/clean-machine distribution. See the milestone plan for retained reports and known limits.

`bun run workspace:build` now packages this SQLite workspace separately from the legacy CLI/UI compiled by `build:runtime`. One executable embeds the UI, PDF fonts/character maps and Bun runtime. Its fixed private `extract`, `redline`, `rounds`, `clean` and `backup` modes dispatch before the normal launcher; parent processes launch the same executable and retain the existing bounded-input, timeout, cancellation, temporary-directory and scrubbed-environment behavior. Worker-only commands never initialize a workspace. Compiled launches do not autoload `.env`, Bun, package or TypeScript configuration from their working directory. The normal development path and legacy plugin build remain supported.

The local macOS arm64 executable passed relocation with an empty tool PATH, fresh synthetic home and an OS test rule denying reads from the checkout and build staging. Tests cover embedded UI, exact original retention, all worker modes, Japanese PDF CMaps, authenticated APIs, browser uploads, backup/restore/reopen and native Word exports. This QA read-denial rule is not a shipping OS sandbox. The build manifest records source stability, both dependency lockfile hashes, embedded resources and executable identity; it does not certify installed dependency contents. No user workspace or credentials are included. Data continues to live outside the package. Installed provider CLIs and their authentication remain separate external connections.

`desktop:build` now adds a small Swift/AppKit/WebKit macOS wrapper. Its private engine startup protocol pins the child PID, database, build identity, loopback origin and per-run capability received only over a pipe. Desktop mode binds an available port; it never attaches to an existing server. The parent holds a stdin lease, so ordinary quit or abrupt shell death closes the owned engine through its existing cleanup path. The legacy browser launch defaults remain unchanged. External web pages never load inside the workspace window, and page JavaScript has no native-message/process/filesystem bridge. Native file/folder selection and download delegates implement the narrow file boundary; downloads stage beside the user-selected destination and refuse replacement if that destination has changed. The WebKit API behavior was checked against [Apple’s upload delegate](https://developer.apple.com/documentation/webkit/wkuidelegate) and [download delegate](https://developer.apple.com/documentation/webkit/wkdownloaddelegate), then exercised in the actual local WebKit runtime.

Interface 29 / schema 19 persists unsent chat drafts and incomplete working-preference edits in a workspace-local table, separately from conversation history, retrieval and applied settings. Writes use revision checks and retry identities. Drafts preserve exact text, selected scope, retained attachment IDs and non-secret model choices; they cannot configure a provider or widen a chat's access. Accepting a prompt consumes its draft in the same transaction, so a delayed save cannot resurrect a sent prompt. Preference drafts retain their original settings revision and become active only after explicit saving. Drafts travel with workspace backups. Session storage is only a migration/cache aid, not the durable store.

The native shell waits for acknowledged draft writes before quit; browser route changes keep an editor visible when saving fails. Conflicting windows never silently overwrite one another. Errors keep text copyable and offer retry or confirmed replacement with the saved draft. The latest unacknowledged keystrokes can still be lost after an abrupt crash; profile, matter and other forms outside these two editors still require explicit saving. This is not universal form autosave. The JavaScript flush function accesses only the existing authenticated workspace API and adds no native bridge.

First-run setup is optional and appears automatically only in a fresh personal workspace. It reuses connection/profile/import controls and permits exploration without AI. “Finish setup” remains available only until the user completes or dismisses onboarding; afterward its sidebar and Settings links disappear, and old setup URLs show ordinary Settings. AI connections stay in Settings, profile/preferences in Practice, and imports in the sidebar. Provider installation/sign-in remains external; a configured connection is not represented as live-qualified. Native menus, window-state restoration, a build-generated Counsel icon and a local-test DMG complete the initial desktop presentation. `desktop:package` verifies source/binary identity and local bundle signatures, copies only build products into a new image and verifies that image; it does not install, publish or bundle user data.

This remains an ad-hoc-signed local test, not a Developer ID/notarized release. Manual native-dialog/Finder drag/drop checks, complete third-party notices, signing/notarization, authenticated updates/rollback and clean-machine qualification remain. No Developer ID signing identity was available in the local read-only check on September 10. Provider billing/consent, reviewable practice changes, original retention and backup/recovery boundaries are unchanged. Live provider/account qualification and other-platform support remain distinct gates. See the [current desktop checkpoint and commands](../superpowers/plans/2026-09-04-standalone-workspace.md#september-10-draft-recovery-setup-and-local-installation-image).

## Product decision

The standalone application is the primary development priority. It supports the general work of a lawyer through the plugin's five primitives: **read, research, evaluate, draft, and remember**. The assistant composes these capabilities around the user's request. They are neither mandatory workflow stages nor five modes the user must select.

The product is a persistent legal workspace. It supports research and advice, compliance, investigations, disputes, policies, transactions, and other legal work. Documents are a major working surface. Matter context, references, prior advice, knowledge retrieval, and automatic recordkeeping are equally fundamental.

The plugin can continue with a smaller feature set. Reuse methodology, content, document tools, and evaluation cases when useful. App architecture, schemas, prompts, and release timing do not depend on plugin parity, a common orchestration engine, or interchangeable Markdown and SQL repositories.

The existing single-lawyer scope remains in force. Collaboration, assignments, shared databases, and hosted multi-tenant operation are separate product decisions.

## Experience

The user can start with a question, an existing matter, a document, or a reference. Substantive work can be associated with a matter as context becomes clear; choosing a matter or uploading a document must not be a prerequisite for asking a question.

Typical requests include:

- "What have we previously advised about employee monitoring?"
- "Which open matters could be affected by this change in guidance?"
- "Use these references and our earlier analysis to draft advice for the team."
- "What remains unresolved in this investigation?"
- "Assess this agreement against our positions and prepare proposed changes."

The interface must support these activities:

- **Ask and work:** begin or continue work with explicit scope, useful progress, evidence, and outputs.
- **Matters:** find current work, unresolved questions, advice, decisions, relevant people, documents, and deadlines.
- **Knowledge and references:** query prior work and sources, inspect provenance, maintain positions, and review proposed learning.
- **Documents:** inspect a source alongside the work, discuss it, compare versions, and generate or export an artifact.
- **Updates and decisions:** see what was recorded automatically, what needs review, and which changed sources may warrant revisiting earlier work.

These are required experiences, not a final navigation design. Conversation remains available while inspecting matters, sources, and documents. Model catalogs, benchmark scores, filesystem paths, and primitive names do not organize the main user journey.

### Layout contract

`WorkspaceFrame` and `runtime/ui/src/workspace/layout.css` own the shared outer frame and responsive gutters. Breadcrumbs, the example-workspace banner and page content use the same frame, including on wide displays. Lists use the available width; Settings (980px maximum) and Your practice (840px maximum) stay anchored to that frame's left edge. Narrow content is not independently centered under a wide page heading.

Document readers use a readable sheet (840px maximum) with a nearby details column and a shared 24px gap; the details stack below on narrow screens. Forms, practice documents and reading sheets share responsive panel insets. Search-only trailing checkbox alignment must not leak into other forms.

Active chats deliberately use a full-height canvas with a centered composer, and first-run onboarding uses a centered checklist with independent scrolling. The Chats list is an ordinary scrolling page, not a conversation canvas. New screens should choose one of these existing layouts rather than inventing a new gutter or centering rule. `e2e/workspace-alignment-smoke.py` checks these relationships in real browsers.

## Principles inherited from the plugin

1. **Work follows intent.** Compose the five primitives as needed. A research question can produce advice without a document; document work can trigger research or institutional learning.
2. **Ground conclusions.** Distinguish the user's facts, retrieved sources, prior advice, inference, and missing information. A citation resolves to the version and location actually used.
3. **Preserve authority and scope.** Applicable law constrains the answer; relevant entity or matter-specific positions and practice standards provide context; institutional memory informs the work. A matter-specific exception does not silently become a practice-wide rule. Conflicts and uncertainty remain visible.
4. **References inform the work.** Imported examples, treatises, checklists, and prior documents are source material. Import or retrieval alone does not promote them into governing positions or verified legal authority.
5. **Remember as work happens.** Maintain useful matter records automatically, with an inspectable history. Promotion into standing positions or institutional knowledge remains reviewable.

The app needs its own instructions and tools expressing these principles directly. Loading the Claude plugin skill and translating shell commands in a preamble is a migration bridge, not the target prompt architecture.

## Application records

Design around the work and its relationships. The following are conceptual records; this is not a requirement for one table or repository per row.

| Record | Purpose |
|---|---|
| Workspace and practice profile | The lawyer's identity, practice context, defaults, and content ownership settings. |
| Matter | A continuing legal question or engagement, with optional type, status, people/entities, unresolved questions, next actions, and deadlines. An agreement is not required. |
| Source and source revision | Imported references, documents, published material, or prior work, with stable identity, original location, content hash, provenance, dates, and available extracted text. |
| Knowledge item and revision | A position, method, reusable language, or learned pattern, with explicit scope, authority category, ownership, and approval status. |
| Work record | The request, matter or workspace scope, model configuration, progress, answer, and artifacts from an execution. A conversation can contain several work records. |
| Evidence link | The source or knowledge revision and passage supporting an answer, observation, finding, or proposal. |
| Matter activity and decision | What happened, what the lawyer decided, supporting work, corrections, and unresolved follow-up. |
| Change proposal | A proposed knowledge or document change with a target revision, rationale, evidence, and durable decision history. |
| Provider connection | A stable connection identity, provider, endpoint, selected model, and credential reference. |

Substantive text can be stored as text, including Markdown where useful for authoring or rendering. Structured relationships and state must not depend on parsing filenames, frontmatter, or assistant prose. Conversation transcripts supplement the matter record; reopening or querying a matter must not require replaying the entire conversation.

## Retrieval and references

Retrieval is part of the first milestone. It must work within one matter and across the practice, including references, approved knowledge, and prior work. Results carry their source, scope, status, and revision; the user can inspect the underlying material.

Start with reliable full-text search and metadata filters. Semantic retrieval can be added when representative questions expose recall gaps. Search implementation may change without changing source identity or citation links. Embeddings and vector infrastructure are not prerequisites for the first working experience.

**Interface 26 / schema 18:** ordinary non-greeting chat requests now receive a tool-free query-planning pass through the same selected provider/model as the answer. Inputs are bounded to the current question, two recent included user prompts, six permitted attachment titles and six selected matter titles; no additional document bodies, profile or unrelated matter inventory are sent. Up to three alternate expressions are searched independently alongside original terms, with access and active-version filters applied before each candidate limit. Reciprocal-rank fusion chooses candidates; alternate match terms help locate topical passages in long files. The existing permission-checked reads, category balance, 64,000-character starting budget, supporting-evidence hop and exact citations remain authoritative. A query alone never constitutes a read or source.

The planning request has a 500-output-token budget and 20-second timeout. Failure or malformed output continues original retrieval; user cancellation stops the response, with no automatic planning retry or billing fallback. A per-response receipt exposes the search expressions, bounded-input status and fallback in **Response context → How Counsel searched**, separately from actual read passages. It persists in existing turn JSON, so no new database migration is required. Greeting-only requests skip planning. This improves terminology mismatch but does not implement embeddings, exhaustive discovery, automatic matter selection, wider legal-source coverage or current-law verification. Live qualification is a small synthetic check, not evidence of general retrieval accuracy.

Current queries use current applicable knowledge by default. Historical questions can retrieve what was known or decided at the time. Superseded positions, draft analysis, rejected proposals, and final advice are distinguishable. Partial indexing or unavailable source text is reported rather than represented as a complete search with no matches.

Track when a revision was received, when it became active, and its stated effective dates if available. An as-of query reconstructs the workspace's active knowledge and recorded decisions at that time; it does not infer legal effectiveness from an import timestamp. Pending and rejected revisions remain inspectable in history but are excluded from active-knowledge results. A later correction remains visible alongside the original record when answering historical questions.

Matter and source restrictions also apply to cross-matter queries. Importing a restricted source into a broad query does not authorize sending its content to a cloud provider. If the available model cannot operate under the applicable restriction, explain the limitation before inference.

Local text, DOCX and text-bearing PDF intake retains originals, extraction limitations and provenance, and supports inspectable citations. Reviewable folder import extends this to bounded collections. OCR, connected repositories, and recurring ingestion remain later work. Research over the local collection is useful immediately; fresh external research needs a supported retrieval tool and dated provenance. The app must distinguish a local-knowledge answer from a current-law verification it has not performed.

### General import requirement

Import is layout-agnostic: supported loose files, arbitrary folders and multiple roots must use the same onboarding flow without a plugin-specific directory convention. Recognizing Counsel OS or another known export is optional enrichment. Organization draws on document content, filenames, paths, links and existing records; no folder name alone establishes a matter, client, practice baseline or access grant. Present an editable batch organization preview with uncertain matches and extraction gaps highlighted. Preserve originals/provenance, distinguish duplicates from revisions, and support corrected associations. Unsupported formats and unreadable content must be reported explicitly. This is a shipping requirement; the implementation checkpoint below covers only the qualified portion.

Use an LLM for semantic organization, not just optional filename cleanup. Deterministic workers retain originals, extract text, hash exact duplicates and enforce formats/limits; bounded model jobs infer document purpose, candidate matter/company relationships and proposed classifications from supplied evidence. Reconcile proposals across batches and against existing records before presenting a coherent preview. Validate identities and associations outside the model, retain reasons/evidence, and make filing correctable. Persist progress and successful proposals so resume does not start the analysis over. Use the configured connection with clear disclosure that content is being analyzed; do not invoke paid fallback providers silently. If AI is unavailable, intake and manual filing remain available with organization clearly marked incomplete. Neither imported instructions nor model output can adopt practice baselines or broaden retrieval access without the existing review rules.

**Implemented checkpoint, interface 21 / schema 15:** durable, app-owned content classification runs serial eight-file requests, carries forward relevant earlier proposed groups and existing matter names, and stores evidence-backed suggestions separately from import choices. Review offers whole-batch clear suggestions and explicit uncertain selections; manual corrections are guarded against stale overwrite. Final import remains separate. Browser navigation does not cancel work; application restart pauses uncertain AI work for explicit resume while retaining completed results. Sampled text is capped at 6,000 characters per file, existing candidates and proposed groups are bounded, and the job uses the pinned connection with no automatic paid fallback. A live synthetic two-batch check and deterministic recovery/backup/retrieval/browser tests pass. This does not implement a general company/client graph, complete cross-root link or plugin-settings migration, OCR, recurring sync or unrestricted format support. Exact duplicate checking remains an explicit local step, not model-inferred version merging.

**Interface 22 adds explicit selected-file relationships:** local Markdown/text link analysis resolves ordinary relative links and Obsidian-style wiki references within the supplied inventory, including across selected roots. Ambiguous, missing, excluded and outside references are shown without fetching anything. A separate guarded review can make a linked source available in the referring note's matter. Additional staged matter references persist through backups and final import uses the existing many-to-many `matter_sources` relationship: company background can support several matters without creating a client, signing entity or company-level matter. Existing primary filing remains unchanged. The check is bounded and only reconstructs explicit links; it is not a general company graph or semantic relationship inference.

**Interface 27 / schema 18 import qualification:** the mixed-root acceptance corpus covers a practice export alongside company folders and loose files: AI classification into existing distinct matters, company background shared through two reviewed explicit links, uncertain material left unfiled, third-party references versus pending baselines, exact duplicates versus changed drafts, missing links, unsupported files, byte retention and actual scoped follow-up reads. One live Codex/Sol classification run passes the original 23 checks; scripted checks additionally cover profile-role recognition and verified backup/reopen. The live follow-up read check uses a scripted answer provider with the actual retrieval engine, not a live answer-quality assessment. This small text/Markdown corpus is not universal migration qualification.

Profile review maps the nine supported, explicitly labeled fields, including multiline organization context, principles, voice and escalation thresholds. It preserves Markdown, refuses to choose among conflicting entries or silently shorten overlong fields, and reports unrecognized sections. Missing names require user entry; team rosters never establish the lawyer's identity. Only a bare profile file or the known `practice/profile` location receives a personal-setup path hint; arbitrary files can be explicitly designated in review, and company-folder profiles remain ordinary documents. Mapping is local and creates no settings until explicit review and commit; an existing profile is never replaced. Retained import receipts exclude personal-profile originals from subsequent AI filing even after a revision. Word settings, NDA/general review instructions, signing rules and AI connection settings remain unapplied and are identified as such; complete instruction/settings conversion remains open. No schema migration is needed.

### Ongoing upkeep: event-driven first, periodic checks second

The target is automatic routine maintenance. The user accepts background AI usage costs; minimizing model calls is not a reason to withhold useful organization or learning. Incremental work is still preferred to avoid stale results, repetitive reclassification and overriding corrections. A new upload, successful chat, source revision or explicit correction should mark only its affected records for follow-up. Deterministic indexing/link/integrity work comes first; semantic work uses a durable version-keyed queue, coalesces repeated changes and preserves completed results. Background model use retains visible connection/usage controls and pause/recovery behavior. It must not silently replay uncertain paid requests, override reviewed corrections or touch unrelated matters.

A periodic idle-time check should catch unresolved links, unfinished jobs, unfiled documents and stale organization metadata that event handlers missed. A manual **Review organization** action should invoke the same bounded check, not a second organization policy. The user should see actionable exceptions and an inspectable activity history, not recurring requests to reconfirm every routine update. Broadening document access, merging matters, deleting data and changing Practice-wide positions still use their existing explicit review boundaries; deal exceptions remain matter-local unless the lawyer directs a baseline change.

**Interface 23 / schema 16:** a shared local upkeep queue now records source/import changes in their originating SQLite transactions. Repeated events coalesce by record; checks read the latest state and persist findings/checkpoints atomically. The launcher drains 25 queued records per tick while no chat response is running, with a wider reconciliation every four hours while the app is open. **Sources → Needs organizing → Review organization** shows paged findings, recent activity and the same manual **Check now** action. Checks cover unfiled sources, partial/unavailable readable text, unfinished imports and unresolved/reviewable explicit links within staged imports. Resolved findings clear automatically. **Leave as is** is version-specific, survives restart/backup and can be reversed; stale decisions cannot suppress a changed record. Failed checks remain retryable without a hot retry loop. A forced process crash preserves completed checkpoints and remaining work.

**Interface 24 / schema 17:** explicit references in retained notes now reconcile across separate imports. A single durable refresh flag coalesces source/filing/Trash/matter events before queueing older notes for recheck. Same-import identity takes priority; other matches use only retained metadata, never paths on disk or fetched URLs. Current filing wins over old receipts. Exact-version review can add selected supporting documents to existing matters; no merge, baseline change, client or signing-entity inference occurs. Ambiguous matches cannot be applied. Dismissed findings survive unrelated activity and resurface on relevant changes. Existing matter-link controls remove access. The source-note reader and upkeep review share the same action.

Routine matter-note commits, scoped context preparation, background import AI and reviewed filing remain separate existing capabilities. The upkeep checker itself makes no model calls, moves no files and grants no access; unfiled-source findings open the existing AI filing review, while reference findings open explicit sharing review. There is still no ongoing semantic reorganization service, inferred company graph, arbitrary-root/absolute-path reconstruction, external-folder watcher or comprehensive legal/document audit. Those are the next intelligence layers, not capabilities implied by a zero-findings result.

### Background AI filing (interface 25 / schema 18)

Unfiled retained documents now have an optional, durable AI filing queue beside Workspace upkeep. One explicit enable pins the connection, billing identity, model and optional filing instruction; subsequent new/changed unfiled files are analyzed while the app is running and idle. Matter creation/renaming rechecks candidate matches. The worker shares titles, opening text (3,000 characters/file) and up to 50 matching matter names/file, eight files/request. Candidate discovery uses document text as well as filenames. This is bounded classification, not semantic retrieval or a complete relationship graph.

Exact source/candidate/instruction fingerprints retain completed suggestions without repeated calls on unchanged inputs. Explicit filing/link decisions are protected even if later removed. Local-only and profile originals are excluded. Results persist across navigation, restart and backup. Errors and interrupted paid requests require explicit resume; a durable request marker survives even if all in-flight files change. Backup copies pause background AI without changing the live workspace's setting. No external-folder watcher or closed-app service is implied.

Review applies selected version-checked destinations atomically; uncertain files may be left unfiled. Matter filing changes access only after this action, and the ordinary context preparation can then read the retained original in that matter. Placement in Practice or Sources does not itself grant chat access or adopt standards. Existing filing controls can change or remove links. The user need not select a module or invoke this worker for each file, but first-time enable remains explicit rather than silently sending historical files after an upgrade.

## Automatic updating

There are distinct update behaviors:

| Change | Default behavior |
|---|---|
| Work history, source links, work progress, and matter summaries | Record automatically. Link the entry to the work that produced it; label generated summaries and allow correction. |
| Inferred matter status, next action, or deadline | Record as a suggestion or unconfirmed observation when it is not established by the user's instruction or cited evidence. Do not manufacture a decision from silence. |
| Standing positions, entity guidance, reusable methods, and institutional learning | Retain the existing practice baseline. Propose a versioned change only when the lawyer requests it; matter concessions do not trigger inferred standard changes or position-drift prompts. Approval records the new revision and decision together; rejection does not alter active knowledge. |
| Maintained legal/reference content | Detect new content versions, retain the prior version, and apply the user's ownership and update policy. User-owned changes are not overwritten. |
| Impact of changed content on earlier work | Identify linked matters and prior work for review. Do not rewrite historical advice or claim that a source change itself proves a changed legal conclusion. |

Initial content checks run when a new content bundle is available and on explicit refresh. An always-running monitor, scheduled web research, and binary auto-update are not implied. Within the first milestone, a test content update must demonstrate detection, ownership handling, preserved citations, and a linked matter-review notice.

The existing plugin convention remains the starting policy: maintained law updates are reviewed unless the user enables automatic application; practice content remains user-owned. Routine matter recordkeeping does not need a separate approval for every entry.

Ownership is recorded per knowledge item or maintained source. Retain a changed practice seed as a received upstream revision, separately from the user's active version, and offer its differences for review. It becomes active only through an approved change. A maintained source transferred to user ownership is also protected from automatic replacement.

Impact checks follow recorded evidence dependencies through derived knowledge: changed source → knowledge item → advice or matter work. They flag both direct and indirect dependents for review, without claiming coverage of work whose dependencies were never recorded. Updating a source does not automatically approve new knowledge or alter past advice.

## Storage and recovery

SQLite is the authoritative store for the standalone app's structured records and versioned textual content. Source documents and generated artifacts remain ordinary files referenced by stable IDs, relative paths, hashes, and provenance. Credentials live in the OS credential store; application records contain references only. The first packaged target must have a working credential-store integration.

Shipped content can continue to be authored as reviewable Markdown in this repository and imported from a versioned bundle. Using Markdown as an authoring format does not require a filesystem vault as the app database.

One workspace service owns database migrations, connections, and transaction boundaries. Related state changes commit together: for example, a knowledge revision, its approval, and the resulting activity record. Per-feature stores must not independently claim the database schema version. Host session directories and process cleanup belong outside persistence contracts.

File operations and database commits need explicit recovery. Register an artifact only after its bytes are durable; detect unfinished operations on reopening and reconcile or report them. A completed label must never conceal a missing output or an unrecorded decision. Retries must not duplicate approvals, artifacts, or matter activities.

Backups use a consistent database snapshot plus its referenced files. Restore is tested as part of the milestone. Do not rely on copying a live database through the existing vault backup script or synchronizing live database files between machines.

Existing workspaces remain readable on their current path until an explicit importer, validation report, and backup are available. There is no continuous dual write to Markdown and SQLite. Import/export is a product capability with recorded format and schema versions; it does not require plugin/app feature parity.

The first milestone can qualify fresh standalone workspaces. A legacy importer is a prerequisite for migrating existing users, not a prerequisite for that fresh-workspace milestone. Until it is available, existing workspaces remain on the legacy path and are not represented as upgraded.

## Provider scope

The user's updated requirement includes subscription use alongside API access. Implement Codex/ChatGPT subscription and Anthropic/OpenAI API connections, and qualify each against the milestone's scenarios before claiming support. Establish one reference configuration first; the presence of several adapters does not imply that every available model is qualified.

Claude Code is an installed-CLI connection, not Counsel-owned subscription authentication. Anthropic's specific [product integration rules](https://code.claude.com/docs/en/legal-and-compliance#can-customers-offer-claude-code-in-their-products) permit running its unmodified binary with users authenticating through Anthropic's own flow, subject to the listed commercial, authentication, billing, and branding conditions. Counsel does not collect Claude credentials, modify the binary, or resell usage. This corrects the earlier blanket approval gate inferred from the SDK overview. The existing Claude Code plugin remains a distinct host workflow. Codex uses the official SDK/CLI path. Never send subscription tokens through a direct API adapter or silently change billing methods.

Ollama, arbitrary compatible endpoints, other hosted vendors, and enterprise clouds remain deferred. Keep existing configurations readable during migration. Their presence in the old catalog is not a support promise. Task routing and a model scoreboard are also deferred.

Every configured connection has a stable ID distinct from its model name. Credentials are bound to that connection and endpoint. Changing an endpoint requires explicit credential reconfiguration; two endpoints serving the same model cannot share a secret through an ID collision. Split account/deployment tables only when an actual supported use case requires them.

Onboarding offers the subscription/API distinction plainly. Claude Code uses the CLI's local subscription or Console sign-in, with an explicit billing choice and a metadata-only sign-in check. Each run checks the expected auth method before sending the prompt; mismatches block without fallback. The current Codex prototype requires file-backed ChatGPT login. A saved setting is not proof of model access. CLI installation, auth renewal and concurrency, tool isolation, native login UX, and packaged setup remain qualification work. A chat subscription does not automatically supply API access.

## First milestone

Complete the **matter-and-knowledge loop**:

1. Start with a substantive request, with or without a document or existing matter.
2. Retrieve relevant references, practice knowledge, and prior matter work, with inspectable evidence.
3. Compose the primitives to perform the requested work and produce an answer or artifact.
4. Maintain the matter record automatically; keep matter variations local and expose practice changes only when requested by the lawyer.
5. Record approvals, rejections, and corrections durably.
6. Reopen the application and answer a follow-up or cross-matter question using that recorded work.
7. Receive a versioned content update and identify affected work without changing its historical record.

This describes observable capabilities to test, not a fixed execution pipeline. A request only invokes the operations it needs.

Exercise the milestone on research/advice, compliance or investigation, and document work. The implementation plan defines synthetic fixtures, failure cases, and completion gates. The milestone also includes first-run setup, useful recovery, and backup/restore. A polished contract-review demonstration alone does not satisfy it.

## Existing work and next steps

The optional organization model is **Client → Matters**, with no required client layer for in-house or solo use. **Practice** owns the user's customizations and materials; **Sources** browses external references and supplied working guides; matter-specific files stay with their matter regardless of author. Evidence storage remains distinct from this navigation taxonomy, so correcting placement cannot rewrite citations or confer model access.

Schema 8 implements client entities, optional matter assignments, explicit client-chat matter selections, and source-library placement. Client chats pin their selected union; later client additions cannot broaden it. Reassignment blocks active client-wide use and prevents subsequent sends in an invalidated selection while preserving history. This is a single-user retrieval boundary, not team tenancy or enterprise permissions. Automatic guide loading is a separate methodology tool with exact version receipts; the four starter guides are not a maintained legal database or primary-source research connector.

Keep the deterministic document engine, useful runtime and UI components, content tooling, and evaluation infrastructure. The initial SQLite thread implementation is a tested prototype that has not been activated in the app. Its interface and schema may change to serve the workspace records; filesystem parity is not an acceptance requirement for new app features.

The app-owned [workspace service and new interface](../../runtime/src/workspace/README.md) implement matter/source/knowledge/work records, exact evidence links, scoped search, and concurrent durable conversations in a separate database. Chat is the front door; users do not select primitives. Context, documents, tools, source passages, saved outputs, and inline knowledge review are visible within the conversation. Libraries remain secondary browsing surfaces. Scope is captured per response. A conversation-only chat can be organized into a matter with explicit confirmation while idle; historical response context stays unchanged. Explicitly attaching a source permits its pinned revision. Runs are server-owned and do not stop on chat switching or browser closure while the server remains open.

The single-user profile now stores identity and optional practice/writing preferences in SQLite. Human decisions and knowledge reviews use that saved identity without repeated name entry; explicit approval remains required. Each new response pins the applicable profile version, visible in its context panel. Sharing can be disabled for future responses without rewriting earlier records. Reviewed import can explicitly populate an empty profile with sharing off; ordinary document upload never infers the user's identity from document parties. There is no account system, and storage tests do not establish that live models reliably follow the preferences.

Work is now an internal recordkeeping concept, not primary navigation. Ordinary chat responses remain searchable, while substantive named outputs and manual notes/decisions are browsable separately. Outputs refer to the original saved text and evidence and link back to the originating exchange. Matter pages bring together conversations, documents, outputs, decisions, and a versioned user-maintained brief. A conversation can start without a matter and join one later through explicit sharing confirmation; running chats and cross-matter chats cannot be reassigned this way. Previous response scopes and context remain intact.

`bun run workspace --demo` opens this interface with synthetic data; omit `--demo` for an empty personal workspace. Claude Code, Codex subscription and API adapters are implemented but not live-qualified. DOCX and PDF intake retains originals and extraction limitations, with PDF page locators and authenticated original downloads. Completed answers export to editable Word files with status and an exact-source appendix; generated bytes and source snapshots commit together in SQLite and are reusable across retries/restarts.

Source/document updates and practice-owned knowledge edits now have revision checks and browsable histories. Earlier evidence and originals remain intact; direct citations to superseded source or approved-knowledge versions are flagged without rewriting earlier advice. Chat can revise an existing approved or imported Practice item without creating a duplicate; edits remain pending until approval, with the exact proposed version pinned in the chat. Maintained ownership is protected. Routine matter-brief updates save with completed responses and offer before/after and versioned undo. Status changes, uncertain updates and concurrent brief conflicts still require review. Receipts remain separate from immutable response text and context.

The first original-Word editing path reuses the existing native OOXML engine. Chat can prepare a new redline copy with tracked replacements and comments after reading the targeted passages. Original packages remain unchanged; generated bytes, source identity and edit report save atomically with completed work. The initial bound is one 5 MB original and 40 edits per response; ambiguous, unsupported or partially applied edit sets refuse the whole output. A source changed during the response prevents saving a stale redline. This is not an in-app Word editor or support for new schedules and structural table changes.

Settings can download and verify a manual unencrypted backup of the consistent database snapshot and referenced originals. The development launcher restores into a new copy, excludes connection credentials/settings, and marks running responses interrupted. It never overwrites an existing workspace. Separate consent-gated synthetic runs check app behavior and persistence, including recordkeeping and native redlines; they are not live-quality certification. OCR, legacy `.doc` conversion, broader document editing, general corrections, maintained-content updates, historical/indirect impact queries, broader crash recovery, automated/encrypted backups, in-app restore switching and packaging remain open. The legacy app is retained for existing data, not as a design constraint on the new standalone experience.

The legacy provider allowlist is separate from the standalone's small connection-settings surface. Its old `supported` and Ollama `preview` labels do not establish release readiness.

Practice preferences now include an optional directory of the user's own signing entities, signatories and explicitly scoped rules. It uses versioned SQLite settings and per-response snapshots, not a new approval-management service. Chat discovery supplies names/aliases; read and deterministic rule-check tools expose exact details and inspectable outcomes. The checker uses inclusive decimal limits and requires clarification for missing facts, mismatched currency/value basis and conflicting rules. It never converts currency or treats uncertainty as permission to use a fallback. This practice-wide directory is separate from client/matter-specific records, profile sharing, legal standards and actual agreement approval/execution. General document autofill and chat-based registry edits remain open. Backups now explicitly retain working preferences and the registry; restore tests compare their actual contents, correcting the previous omission of current working preferences.

The September 5 checkpoint adds Practice/Sources navigation, sanitized Markdown reading with exact saved-text access, and versioned curated templates. Templates are pinned starting points, not legal authority or automatically approved practice positions. Each chat can choose its own model within the selected connection and billing method; choices are frozen for running responses. Catalog metadata is not an access check or qualification result. Automatic routing remains unimplemented.

Folder/file import stages originals and extraction locally outside chat retrieval, proposes destinations from content and path hints, and requires review before an atomic commit. Practice entries remain pending, practice-wide template sharing is explicit, and profile import cannot overwrite an existing profile. Current schema-15 backups retain background organization jobs, completed suggestions, staging and receipts; known older backups remain explicitly supported. Bulk reassignment, bounded content classification, explicit exact-duplicate detection and guarded completed-import cleanup are implemented. Recurring sync and the broader migration gaps above remain open. The separate explicit plugin importer does not alter the original Markdown vault.

The next work is the [matter-and-knowledge milestone](../superpowers/plans/2026-09-04-standalone-workspace.md). Plugin packaging, Codex plugin support, and the plugin's automatic runtime hand-off are separate follow-ups and do not block that milestone. Do not remove existing plugin features or migrate user data as an incidental step of app development.
