# Clean-machine Mac acceptance

Status: **not yet performed** for desktop build 2. Scripted synthetic checks do not complete this checklist. Use a clean supported Apple silicon Mac or a new test account with no Counsel data, development tools, or existing provider login. Use only synthetic practice/documents. Do not delete a real user's workspace to simulate first run.

Record: source commit, workflow/run URL, desktop version/build, DMG SHA-256, signing team/bundle ID, macOS version, CPU, tester and date. For every step record **pass / fail / not tested**, the actual result, and any issue. Do not fill this in from expectations.

## Install and first use

1. Download the exact candidate image and match its SHA-256 with its trusted build receipt. For public qualification, verify Developer ID, notarization and Gatekeeper acceptance of the downloaded/quarantined bytes. An ad-hoc preview cannot pass this public trust check; do not disable Gatekeeper to record a pass.
2. Open the DMG in Finder, drag Counsel into Applications, eject the image, and open the installed copy. Confirm the app works without the checkout, Bun, Python, a running dev server, or the mounted DMG.
3. Choose **Explore without AI**. Optional practice details must not prevent using the workspace. Confirm local import/reading works and no provider installer or model request runs automatically.
4. In Setup/Settings, distinguish absent CLI, installed but signed out, and local sign-in found. Exercise both provider installation links, Cancel on Counsel's confirmation, then an explicitly approved installation. Test Terminal permission denial and the copy-command fallback. Verify cancel/retry and re-detection. Only install the provider(s) authorized for this test.
5. Sign in through the provider's own flow, choose the intended billing method and save the connection. Confirm a wrong-billing login fails without fallback. Run **Test saved connection** only with approval for account usage; cancel its confirmation once and verify that no test runs. A successful test is account access evidence, not legal-work qualification.

## Real native interactions and documents

6. Use the native file chooser and folder chooser with synthetic files, then Finder drag/drop into Import files and the chat composer. Try cancellation and a malformed/unsupported file. Verify retained original bytes and reviewed matter associations after import; do not count file staging alone as a completed import.
7. Create a synthetic matter, connect the permitted context, and run a synthetic document review/redline with the selected model. Verify cited passages, reviewer approval, comment/change author and filename preferences, and the original/redline/clean downloads. Use Microsoft Word to inspect every rendered page, tracked insertions/deletions and comments; confirm the original file is unchanged. Record the tested fixture and limits.
8. Save downloads through the real native Save panel; test Cancel, a new destination, and confirmed replacement of a synthetic file. Confirm external links open outside the workspace without carrying the workspace access token.
9. Type an unsent chat and working-preference draft. Quit/reopen and verify recovery. Interrupt a synthetic operation; verify the UI reports the interruption without silently re-running model calls. Other unsaved forms must not be presented as guaranteed recoverable.

## Backup, recovery and replacement

10. Save and verify a backup in Settings. Use **File → Restore workspace from backup…**, inspect its summary, restore into a separate copy, and choose **Open workspace**. Verify matters, links, original files, approved instructions, saved outputs and drafts. Confirm AI must be reconnected, and the old workspace and archive are unchanged. Reopen Counsel and verify it remembers the recovered copy; use **Open personal workspace** to return.
11. Try a corrupt/truncated archive and cancel a restore. Confirm existing data is unchanged and incomplete copies cannot be opened as valid workspaces. Do not remove unexplained folders until their contents and recovery value are understood.
12. Back up, quit, and replace the installed app with a newer qualified image. Confirm external workspace data survives. For a schema change, verify the `before-upgrade-*` archive and restore it into a separate copy. Test insufficient disk space or a deliberate synthetic backup failure; migration must stop. A newer database must be refused by an older version, not silently downgraded.
13. Until a channel is approved, Settings must say no signed update channel is connected and make no external update request. Once enabled in a separately qualified release, test no-update/new-update, expired or wrong-key metadata, interrupted/tampered downloads, compatibility rejection and manual installation after quitting. Do not mark those live-channel checks passed using verifier unit tests.

## Acceptance record

Attach a concise result with the recorded identity/hash, outcomes by step, privacy-safe screenshots, failures and remaining gates. Public promotion requires all applicable gates, including dependency redistribution review and owner approval; a successful model test or notarization alone is insufficient. Do not publish synthetic databases or logs that contain access tokens or provider account details.
