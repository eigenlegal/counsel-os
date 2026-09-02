# Design review — v0.12.0, screen by screen

**Date:** 2026-09-01 · **Who:** the pair, as designer-reviewer · **What:** every surface of the
real app at 1440×900 and 1000×800, light and dark, on a copy of the hero-flow vault (sample
matter, a real review thread, the redline) with the fake provider, plus the setup-mode serve
for the first-run screen. Screenshots: `img-review/before-*` (as shipped) and `img-review/after-*`
(this branch). Judged against the ledger design language (double rules, dotted leaders, small-caps
run-ins, set-text statuses; no pills, no left-accent panels, no modals, nothing heavy), alignment
and wrapping, dark contrast, copy a lawyer reads without translation, dead ends, and consistency.

## Findings, ranked

| # | Sev | Screen | What | Why it matters | Fix |
|---|-----|--------|------|----------------|-----|
| 1 | high | Settings › Runtime | The Config file row's long path was drawn over its own label (`before-settings-bottom`). | Unreadable; the first ledger a curious user opens. | **Fixed.** The fact row is a two-column grid; the value wraps inside its column, right-aligned. |
| 2 | high | Settings › Providers | "Edits `/Users/…/providers.yaml`" and "nothing is set in `<path>`" in the group copy; keys via `OPENAI_API_KEY` environment variables. | File paths and env vars are engineer-speak; a lawyer will not set an env var. | **Copy fixed** (the path stays under Runtime). The env-var key entry is structural: keys belong in the keychain, entered in Settings — the providers track, after packaging. |
| 3 | med | Everywhere | Keyboard focus was the browser's blue halo (delete confirm, matter picker rows, switcher rows, rename input). | Reads as a foreign control on every surface that shows it. | **Fixed.** House `:focus-visible`: a 1px accent hairline, 2px offset. |
| 4 | med | Vault tree › folder matter | The matter's documents were prettified (`Sample mutual nda` twice for the `.docx` and `.md`; `Counsel os redlines 2026 09 01`). | Two identical rows for two different files; every other file row in the tree shows the filename. | **Fixed.** Documents show their filenames, like the rest of the tree. |
| 5 | med | Chat header, 1000px | "4h ago" broke into two lines beside the MATTER line. | A date should never wrap. | **Fixed.** `white-space: nowrap`. |
| 6 | med | Settings › Runtime | "Step timeout · 600000 ms". | Reads as a phone number. | **Fixed.** "10 minutes" (`timeoutInWords`, tested). |
| 7 | low | Home | "One matter has open next-actions." | Hyphenated jargon. | **Fixed.** "One matter has an open next action." / "N matters have open next actions." |
| 8 | low | Home › Docket | The proposal's second line (path · proposed … in "thread") set in mono. | Mono for a sentence reads as a log line. | **Fixed.** Sans, faint. |
| 9 | low | Chat › rename | The title input opened scrolled to the end of the title. | You saw the tail of the name, not the start. | **Fixed.** Select all on focus (standard rename behaviour). |
| 10 | low | First run | "Writes 26 law areas, 24 standards, 35 methods, and your profile" — the seed writes 25 and 36 files (index files). | Numbers a user can check and find wrong. | **Fixed.** Counts only the law areas; the rest named, not counted. |
| 11 | low | Settings › Runtime | The HEALTH run-in sat flush under the providers table. | Rhythm. | **Fixed.** 18px above. |
| 12 | low | Chat › work line | A wrapped work line can open with "· ran 3 tools" — a lone middle dot at the start of a line. | Typographic tic. | **Partly.** The separator now travels with its words (never a dot alone); a segment can still start a wrapped line. A cleaner structure (separators only between items on the same line) is a rewrite of the line; leave until the line's content changes again. |
| 13 | low | Reader › facts | `sample: true` shows as a fact (`SAMPLE · true`) on the sample matter. | Plumbing in the facts block. | Not fixed: the frontmatter filter hides `counsel-os-*` keys only; hiding `sample` would need a rule for boolean marker keys. One line when the marker set is decided. |
| 14 | info | Chat header | The hero thread's title still reads "…confidentiality standard and" (cut mid-word). | Persisted before the word-boundary trim landed; new threads are fine. | Nothing to do (or rename it). |
| 15 | info | Chat | The provider-not-available notice and a failed step with Retry could not be exercised: `--fake` pins the effective default, and the fake provider cannot fail. | Unit tests cover both; a real-provider check remains for the founder's own serve. | Verify once on a real serve with an unloaded default. |
| 16 | info | Composer | The drag-over inset could not be driven headlessly (synthetic DragEvents carry no files). | Covered by unit tests and the Playwright intake case. | — |

## What reads well (keep)

The first-run screen (both themes), the session-lost screen, the reader's facts block after
the ledger change, the docket rows, the proposal slip, the switcher popover, the matter picker,
the delete confirm row, the redline in the reader with comments as notes. Dark mode is even
across surfaces; nothing reads bold after the type change.

## Method notes

`scripts/dev/theme-shots.sh`'s dark trick (copy the `prefers-color-scheme: dark` rules onto
`:root`) was reused. After a rebuild the headless browser kept the old bundle from cache; a
cache-busting query on the first `goto` was needed before the after-shots were honest.
