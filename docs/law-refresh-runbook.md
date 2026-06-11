# Law Refresh Runbook (Maintainers)

How the plugin's shipped law content (`knowledge/law/`) gets refreshed. This is a repo-side procedure for people with commit access — end users never run this; they receive the results via `/counsel-os:update`. (User-owned law content in a vault is refreshed by the `/counsel-os:law-refresh` skill instead.)

Calibrated June 2026: financial-services pilot + a five-area parallel tranche (~230 source-verified changes; one fabricated enactment and one wrong signing date caught).

## The pipeline

**Verify-and-patch, never rewrite.** Most prose stays correct; rot concentrates in perishable claims (dates, thresholds, rule statuses, case postures, "no law yet" assertions). Re-researching whole areas is ~10× the cost and risks regressing good content.

### 1. Tranche by legal velocity

- **Fast** (refresh quarterly): ai-and-automation, financial-services, data-privacy, corporate, consumer-protection, employment
- **Medium** (semi-annual): securities, international-trade, antitrust, healthcare, cybersecurity, tax, litigation, ip-and-technology, advertising-media
- **Slow** (annual): the remaining areas — fold in structural upgrades (Key Constraints sections) where the thin format persists

The validator is the worklist: `python3 scripts/validate_law_frontmatter.py` reports attestations due, computed from `last-reviewed` + the per-area cadences in `knowledge/law/frontmatter-policy.json`.

### 2. One research agent per area, in parallel

Web-enabled general-purpose agents with this contract (full prompts in the repo history around v0.9.10–v0.9.11):

- Read `knowledge/law/data-privacy/us-eu-core.md` (the source-first pattern model) and `knowledge/law/FRONTMATTER.md` first.
- Extract perishable claims → verify via PRIMARY sources → patch minimal deltas → add `authorities` blocks → do NOT stamp `last-reviewed` (the gate does that) → flag-don't-guess → run `scripts/lint_knowledge.py` → report per-file: claims checked, changes with source URLs, still-correct, uncertain.
- Seed each agent with known-error leads from prior reviews; pre-load the access tricks below.
- Model note: use the most current model for fast-moving areas (training cutoff generates the leads — you can't search for a development you don't know happened); a cheaper tier is fine for slow areas.

### 3. Source-access tricks (subagents typically get WebFetch denied — they verify via domain-scoped WebSearch, so the gate must independently confirm)

- **Federal Register**: JSON API bypasses the bot wall — `federalregister.gov/api/v1/documents/{docnum}.json?fields[]=title&fields[]=type&fields[]=abstract&fields[]=publication_date&fields[]=citation`; also `documents.json?conditions[term]=...&conditions[publication_date][gte]=...` for searches
- **Statute/public-law text**: govinfo.gov (`/content/pkg/PLAW-.../html/...`)
- **Bot-walled agency pages** (ftc.gov even blocks headless Chromium): Wayback Machine (`archive.org/wayback/available?url=...` → fetch the snapshot via the browse daemon; web.archive.org is blocked for WebFetch)
- **Court opinions**: fetch the PDF (WebFetch saves binaries) and Read it; CourtListener API for dockets
- **State legislatures**: bill-record pages are authoritative and fetchable; they beat law-firm alerts (a CT signing date was wrong in every firm alert and right on cga.ct.gov)

### 4. The supervised gate (this is what makes attestation honest)

For each area: independently verify the boldest post-cutoff claims against primary records before stamping anything. Every fabrication-class error caught so far was caught here. Then:

```bash
# stamp last-reviewed ONLY on files that gained/refreshed an authorities block this pass
# (see the stamping script pattern in repo history, v0.9.10)
python3 scripts/validate_law_frontmatter.py    # attestations-due should drop
python3 scripts/lint_knowledge.py --check-versions
python3 scripts/bump_content_versions.py       # so update detects the change
scripts/release.sh <X.Y.Z> -m "Law refresh: <areas> verified current as of <date>" -b "<changelog with sources>"
```

### 5. Aftercare

- Record dated watch items (upcoming effective dates, pending final rules) — they're next tranche's leads.
- Same-day note: `/counsel-os:update` compares law by content, not by `content-version` date, precisely because refresh releases can land the same day as a prior sync.
- Known standing gaps needing dedicated passes: the 50-state MTL table (financial-services), the 50-state breach table (data-privacy), state-consumer-laws.md (consumer-protection).
