import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RUNTIME_FILE, VAULT_DIR } from './paths';

/**
 * The whole page, end to end, against a real `counsel-os serve --fake`
 * (spec §6): token bootstrap, a thread, a step that runs tools and raises a
 * proposal, approving it, reading the written file in the vault, the run
 * record, and settings.
 *
 * This is the CLASSIC design, which is no longer what the printed URL opens
 * on — v2 became the default on 2026-08-30 — so the story asks for v1 by
 * name in the fragment. Both designs are still regression-gated here.
 *
 * One test, not seven. The steps are a single story — there is no thread to
 * approve a proposal in until the step before it has run — and splitting it
 * would either re-run the whole prefix per test or leave tests depending on
 * each other's leftovers. `test.step` is what gives the report its sections.
 *
 * Nothing here calls a model: the provider is `fake/fake`, driven by
 * `e2e/fake-script.json`.
 */

/** The bearer token, from the handshake file the server publishes. The
 * server is already listening (Playwright waited on `webServer.url`), so the
 * file is there; the retry is for the sliver between binding and the atomic
 * rename. */
async function token(): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const parsed = JSON.parse(readFileSync(RUNTIME_FILE, 'utf8')) as { token?: string };
      if (typeof parsed.token === 'string' && parsed.token !== '') return parsed.token;
    } catch (err) {
      last = err;
    }
    await new Promise(done => setTimeout(done, 100));
  }
  throw new Error(`no token in ${RUNTIME_FILE}: ${String(last)}`);
}

/** The header's surface links. Scoped, because a proposal card also links
 * into the vault ("open in vault") and a bare role query matches both. */
function nav(page: Page, name: string) {
  return page.locator('nav[aria-label="Surfaces"]').getByRole('link', { name, exact: true });
}

/** Opens a directory in the vault tree by name. The tree is lazy — a level
 * is only fetched when somebody opens it — so this is also the assertion
 * that lazy listing works. */
async function openDir(page: Page, name: string): Promise<void> {
  const dir = page.locator('button.vault-dir', { hasText: name }).first();
  await expect(dir).toBeVisible();
  await dir.click();
  await expect(dir).toHaveAttribute('aria-expanded', 'true');
}

test('the classic design: a step runs tools, raises a proposal, and approving it writes the vault', async ({ page }) => {
  await test.step('the token in the fragment becomes the tab\'s credential, and ?ui=v1 asks for the classic design', async () => {
    await page.goto(`/#token=${await token()}&/?ui=v1`);
    await expect(page.locator('html')).toHaveAttribute('data-ui', 'v1');
    // The header only renders once `/health` answered — which it could only
    // do with the token the fragment carried.
    await expect(page.getByRole('heading', { name: 'counsel-os' })).toBeVisible();
    // And neither the credential nor the flag is in the URL by the time
    // anything can screenshot it.
    await expect.poll(() => page.url()).not.toContain('token=');
    await expect.poll(() => page.url()).not.toContain('ui=');
    await expect(page.locator('nav[aria-label="Threads"]')).toContainText('No threads yet.');
  });

  await test.step('a new thread opens an empty transcript', async () => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.locator('nav[aria-label="Threads"] li')).toHaveCount(1);
    await expect(page.locator('.transcript')).toContainText('No messages yet.');
  });

  await test.step('the step streams text, a tool card and a proposal', async () => {
    await page.getByRole('textbox', { name: 'Message' }).fill('Check the Acme NDA term.');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.turn-assistant .turn-text')).toHaveText('Done.');
    // Both tools the script runs, in order, each paired with its result.
    await expect(page.locator('.tool-card .tool-name')).toHaveText(['vault_read', 'propose_update']);
    await expect(page.locator('.tool-card .badge-ok')).toHaveCount(2);
  });

  await test.step('approving the proposal settles it', async () => {
    const card = page.locator('.proposal-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.proposal-path')).toHaveText('practice/standards/nda.md');
    await expect(card.locator('.badge')).toHaveText('pending');

    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(card.locator('.badge')).toHaveText('approved');
    // A settled proposal offers no buttons — the decision is made.
    await expect(card.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  });

  await test.step('the vault holds what was approved', async () => {
    await nav(page, 'Vault').click();
    await openDir(page, 'practice');
    await openDir(page, 'standards');
    await page.locator('button.vault-file', { hasText: 'nda.md' }).click();

    await expect(page.locator('.vault-file-path')).toHaveText('practice/standards/nda.md');
    // Rendered markdown, not the raw file: the heading is an <h1>.
    await expect(page.locator('.markdown h1')).toHaveText('NDA');
    await expect(page.locator('.markdown')).toContainText('Term: 3 years');
  });

  await test.step('the run record says what the step did', async () => {
    await nav(page, 'Chat').click();
    const run = page.locator('.run-panel');
    await expect(run).toHaveCount(1);
    await expect(run.locator('summary .badge')).toHaveText('done');
    await expect(run.locator('.run-provider')).toHaveText('fake/fake');

    // The panel is evidence, collapsed until asked for.
    await run.locator('summary').click();
    await expect(run.locator('.run-tools .tool-name')).toHaveText(['vault_read', 'propose_update']);
    await expect(run.locator('.run-proposals li')).toHaveCount(1);
  });

  await test.step('settings show the runtime that is actually running', async () => {
    await nav(page, 'Settings').click();
    const facts = page.locator('.settings-health .facts');
    await expect(facts).toContainText('fake/fake');
    await expect(page.locator('.providers-table')).toContainText('fake/fake');
    // The switch still means "new design"; this tab turned it off by URL.
    await expect(page.getByRole('switch', { name: 'New design' })).not.toBeChecked();
  });
});

/**
 * The same story in the new design (spec 2026-08-29-ui-design-pass §6) —
 * which is what the printed URL opens on since 2026-08-30, so this story
 * asks for nothing. It runs AFTER the v1 test on the same server and vault,
 * which the v1 approval has already written — so it starts by putting a
 * different "before" on disk, which is what makes the redline show a
 * deletion and an addition rather than nothing at all.
 *
 * The flag is per browser CONTEXT (`localStorage`), and Playwright gives
 * each test a fresh one — so the v1 story's `?ui=v1` cannot leak into this
 * one, whatever order they run in.
 */
test('the new design: a draft names its thread, the proposal is a redline, the drawer shows the file, the strip says done', async ({ page }) => {
  writeFileSync(join(VAULT_DIR, 'practice', 'standards', 'nda.md'), '# NDA\nTerm: 2 years\n');

  await test.step('the printed URL alone opens the new design', async () => {
    // No `ui=` at all: a browser that has never been told anything gets v2.
    await page.goto(`/#token=${await token()}`);
    await expect(page.locator('html')).toHaveAttribute('data-ui', 'v2');
    await expect.poll(() => page.url()).not.toContain('token=');
    await expect(page.locator('.v2-top-model')).toHaveText('fake/fake');
  });

  const threads = page.locator('nav[aria-label="Threads"] li.v2-thread');
  const before = await threads.count();

  await test.step('New opens a draft and makes no thread', async () => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.locator('.v2-transcript')).toContainText('New conversation');
    await expect(threads).toHaveCount(before);
    await expect(page.locator('nav[aria-label="Threads"] li.v2-draft')).toHaveCount(1);
  });

  await test.step('the first send names the thread; the answer reads first, the work folds into a strip', async () => {
    await page.getByRole('textbox', { name: 'Message' }).fill('Check the Acme NDA term.');
    await page.getByRole('textbox', { name: 'Message' }).press('Meta+Enter');

    await expect(page.locator('.v2-prose')).toHaveText('Done.');
    await expect(threads).toHaveCount(before + 1);
    await expect(threads.first()).toContainText('Check the Acme NDA term.');
    await expect(page.locator('nav[aria-label="Threads"] li.v2-draft')).toHaveCount(0);
  });

  await test.step('the proposal is a redline of the current file, and approving it settles it', async () => {
    const card = page.locator('.v2-proposal');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.v2-proposal-path')).toHaveText('practice/standards/nda.md');
    await expect(card.locator('.v2-diff-del')).toContainText('Term: 2 years');
    await expect(card.locator('.v2-diff-add')).toContainText('Term: 3 years');
    await expect(card.locator('.v2-pill')).toHaveText('pending');

    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(card.locator('.v2-pill')).toHaveText('approved');
    await expect(card.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    // The redline stays readable after the decision.
    await expect(card.locator('.v2-diff-add')).toContainText('Term: 3 years');
  });

  await test.step('open in vault shows the written file in the drawer; Esc closes it', async () => {
    await page.locator('.v2-proposal').getByRole('button', { name: 'open in vault' }).click();
    const drawer = page.locator('aside[aria-label="Vault drawer"]');
    await expect(drawer).toHaveCount(1);
    await expect(drawer.locator('.vault-file-path')).toHaveText('practice/standards/nda.md');
    await expect(drawer.locator('.markdown h1')).toHaveText('NDA');
    await expect(drawer.locator('.markdown')).toContainText('Term: 3 years');
    // Still the thread underneath — the drawer did not navigate.
    await expect(page.locator('.v2-prose')).toHaveText('Done.');

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });

  await test.step('the strip says done, and opens into the record', async () => {
    const strip = page.locator('.v2-strip');
    await expect(strip).toHaveCount(1);
    await expect(strip.locator('summary .v2-pill')).toHaveText('done');
    await expect(strip.locator('.v2-strip-summary')).toHaveText('read 1 file, ran 1 tool');
    await expect(strip.locator('.v2-strip-provider')).toHaveText('fake/fake');

    await strip.locator('summary').click();
    await expect(strip.locator('.v2-step-verb')).toHaveText(['Read', 'Proposed']);
    await expect(strip.locator('.v2-record')).toContainText('Proposals');
  });

  await test.step('the vault page and settings are the new design too', async () => {
    await nav(page, 'Settings').click();
    await expect(page.getByRole('switch', { name: 'New design' })).toBeChecked();
    await expect(page.locator('.settings-health .facts')).toContainText('fake/fake');

    await nav(page, 'Vault').click();
    await openDir(page, 'practice');
    await openDir(page, 'standards');
    await page.locator('button.vault-file', { hasText: 'nda.md' }).click();
    await expect(page.locator('.v2-crumb-last')).toHaveText('nda.md');
    await expect(page.locator('.v2-vault-main .markdown')).toContainText('Term: 3 years');
  });
});
