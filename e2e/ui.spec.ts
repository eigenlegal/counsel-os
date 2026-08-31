import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RUNTIME_FILE, VAULT_DIR } from './paths';

/**
 * The redesigned workbench, end to end, against a real `counsel-os serve
 * --fake` (redesign spec §6): token bootstrap onto HOME, an ask from the ask
 * box that creates and names the thread, the proposal as a tracked-changes
 * slip, the docket's Review → anchored approve, the vault's ⌘K search and
 * reading pane, and settings. One test, one story — the docket needs the
 * pending proposal the ask created, and the vault check reads the file the
 * approval wrote.
 *
 * Nothing here calls a model: the provider is `fake/fake`, driven by
 * `e2e/fake-script.json`.
 */

/** The bearer token, from the handshake file the server publishes. */
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

/** The rail's surface links (the nav kept its aria-label through the
 * redesign; a proposal slip also links into the vault, so stay scoped). */
function nav(page: Page, name: string) {
  return page.locator('nav[aria-label="Surfaces"]').getByRole('link', { name, exact: true });
}

test('home asks, the slip redlines, the docket reviews, the vault reads', async ({ page }) => {
  writeFileSync(join(VAULT_DIR, 'practice', 'standards', 'nda.md'), '# NDA\nTerm: 2 years\n');

  await test.step('the token in the fragment becomes the credential, and the landing page is Home', async () => {
    await page.goto(`/#token=${await token()}`);
    await expect(page.locator('.v2-hi')).toHaveText(/Good (morning|afternoon|evening)\./);
    // The rail footer is the model picker's new home (spec §3.3).
    await expect(page.locator('.v2-foot')).toContainText('fake/fake');
    await expect.poll(() => page.url()).not.toContain('token=');
    // The matters column reads the seeded frontmatter.
    await expect(page.locator('.v2-matter-name')).toContainText('Acme Corp — NDA');
    // `due` until the seeded deadline passes, `overdue` after it: the fixture
    // date is fixed, so pinning the verb alone would make this suite fail on
    // a calendar day rather than on a regression.
    await expect(page.locator('.v2-due')).toHaveText(/^(due|overdue) Sep 12$/);
    await expect(page.locator('.v2-na')).toContainText('send document list');
    // No pending proposals yet: the docket is hidden entirely (spec §3.2).
    await expect(page.locator('.v2-docket')).toHaveCount(0);
  });

  await test.step('a starter fills the box; the ask creates and names the thread', async () => {
    await page.getByRole('button', { name: 'Review a contract' }).click();
    await expect(page.getByRole('textbox', { name: 'Ask counsel' })).toHaveValue('Review this contract: ');
    await page.getByRole('textbox', { name: 'Ask counsel' }).fill('Check the Acme NDA term.');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect.poll(() => page.url()).toContain('#/chat?thread=');
    await expect(page.locator('.v2-prose')).toHaveText('Done.');
    const threads = page.locator('[aria-label="Threads"] li.v2-thread');
    await expect(threads).toHaveCount(1);
    await expect(threads.first()).toContainText('Check the Acme NDA term.');
    // The thread header: serif title + the matter chip the read resolved.
    await expect(page.locator('.v2-thread-head h1')).toHaveText('Check the Acme NDA term.');
    await expect(page.locator('.v2-matter-chip')).toContainText('Acme');
    // The work line folds the tools into one quiet line.
    await expect(page.locator('.v2-work-line')).toContainText('read');
  });

  await test.step('the proposal is a tracked-changes slip against the file on disk', async () => {
    const slip = page.locator('.v2-proposal');
    await expect(slip).toHaveCount(1);
    await expect(slip.locator('.v2-proposal-path')).toHaveText('practice/standards/nda.md');
    await expect(slip.locator('.v2-redline del')).toContainText('2');
    await expect(slip.locator('.v2-redline ins')).toContainText('3');
    await expect(slip.locator('.v2-status-pending')).toHaveText('pending');

    // Whole document and line diff are one click away (spec §3.3).
    await slip.getByRole('button', { name: 'whole document' }).click();
    await expect(slip.locator('.v2-redline')).toContainText('# NDA');
    await slip.getByRole('button', { name: 'line diff' }).click();
    await expect(slip.locator('.v2-diff-del')).toContainText('Term: 2 years');
    await slip.getByRole('button', { name: 'changes only' }).click();
    await expect(slip.locator('.v2-redline')).toBeVisible();
  });

  await test.step('the docket lists the pending proposal; Review lands anchored; approve settles it', async () => {
    await nav(page, 'Home').click();
    await expect(page.locator('.v2-docket-head')).toContainText('1 awaiting your decision');
    await expect(page.locator('.v2-docket-path')).toContainText('practice/standards/nda.md');
    await expect(page.locator('.v2-sub')).toContainText('one proposal is waiting on you');

    // The accessible name carries the motif's arrow (`.v2-docket-go::after`),
    // and `exact` matters: home's starter chip is called "Review a contract",
    // so a substring name would match two buttons.
    await page.getByRole('button', { name: 'Review →', exact: true }).click();
    await expect.poll(() => page.url()).toContain('proposal=');
    const slip = page.locator('.v2-proposal');
    await expect(slip).toBeVisible();

    await slip.getByRole('button', { name: 'Approve' }).click();
    await expect(slip.locator('.v2-status-approved')).toContainText('✓ approved');
    await expect(slip.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    // The strip is one hairline line now.
    await expect(page.locator('.v2-strip summary')).toContainText('DONE');
    await expect(page.locator('.v2-strip-summary')).toContainText('1 source');

    await nav(page, 'Home').click();
    await expect(page.locator('.v2-docket')).toHaveCount(0);
  });

  await test.step('the vault: icon rail, ⌘K search, the reading pane', async () => {
    await nav(page, 'Vault').click();
    await expect(page.locator('.v2-rail.v2-rail-icons')).toHaveCount(1);

    await page.keyboard.press('ControlOrMeta+k');
    const search = page.getByLabel('Search the vault');
    await expect(search).toBeFocused();
    await search.fill('acme');
    await search.press('Enter');
    await page.locator('.v2-vresults .v2-vrow', { hasText: 'matters/acme.md' }).click();

    // The reading pane: doc title (not the filename), fact leaders, body.
    await expect(page.locator('.v2-doc-head h1')).toHaveText('Acme Corp — NDA');
    await expect(page.locator('.v2-fm')).toContainText('counterparty');
    await expect(page.locator('.v2-fm')).toContainText('Acme Corp');
    await expect(page.locator('.v2-doc-md')).toContainText('Term: 2 years');

    // Clear the search; the grouped tree comes back and reads the approved
    // file through Practice → standards.
    await page.getByRole('button', { name: 'clear', exact: true }).click();
    await expect(page.locator('.v2-vgroup', { hasText: 'Matters' })).toBeVisible();
    await page.locator('.v2-vrow', { hasText: 'standards' }).click();
    await page.locator('.v2-vrow', { hasText: 'nda.md' }).click();
    await expect(page.locator('.v2-doc-md')).toContainText('Term: 3 years');
  });

  await test.step('settings still reports the runtime, in the motif', async () => {
    await nav(page, 'Settings').click();
    await expect(page.locator('.settings-health .facts')).toContainText('fake/fake');
  });
});
