import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ROOT, RUNTIME_FILE } from './paths';

/**
 * Document intake, end to end (docx spec §6): the demo NDA dropped on
 * Home's ask box goes to `matters/inbox/` through `POST /vault/upload`, the
 * chip appears in the message row, and the result line says where it went.
 * Runs against the same `serve --fake` as `ui.spec.ts`; it creates no
 * thread, so the other story's counts are untouched.
 */

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

test('a Word document dropped on the ask box lands in the inbox and in the message', async ({ page }) => {
  await page.goto(`/#token=${await token()}`);
  await expect(page.locator('.v2-hi')).toHaveText(/Good (morning|afternoon|evening)\./);

  const bytes = Array.from(readFileSync(join(ROOT, 'skills', 'demo', 'assets', 'sample-mutual-nda.docx')));
  const transfer = await page.evaluateHandle(({ bytes: raw, name }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(raw)], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    return dt;
  }, { bytes, name: 'sample-mutual-nda.docx' });

  const box = page.locator('.v2-ask');
  await box.dispatchEvent('dragenter', { dataTransfer: transfer });
  await expect(page.locator('.v2-drop em')).toHaveText('Drop a Word document to add it to the matter');
  await box.dispatchEvent('drop', { dataTransfer: transfer });

  await expect(page.locator('.v2-intake')).toContainText('Added sample-mutual-nda.docx to matters/inbox');
  await expect(page.locator('.v2-intake')).toContainText('KB');
  await expect(page.getByRole('button', { name: 'move to a matter' })).toBeVisible();
  await expect(page.locator('.v2-ask-attached')).toHaveText('matters/inbox/sample-mutual-nda.docx');
  await expect(page.locator('.v2-drop')).toHaveCount(0);

  // The file is real: the reader converts it.
  await page.goto(`/#/vault?path=${encodeURIComponent('matters/inbox/sample-mutual-nda.docx')}`);
  await expect(page.locator('.v2-doc-head h1')).toHaveText('MUTUAL NON-DISCLOSURE AGREEMENT');
  await expect(page.locator('.v2-doc-word')).toContainText('converted for reading');
});
