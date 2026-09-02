import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { ArtifactView } from '../../chat/turns';
import { ArtifactSlip, formatBytes, slipDate, slipSentence } from './ArtifactSlip';

const realFetch = globalThis.fetch;
let fetched: string[] = [];

const artifact: ArtifactView = {
  id: 'a-1',
  kind: 'docx-redline',
  path: 'matters/acme/sample-mutual-nda-redline-2026-09-01.docx',
  source: 'matters/acme/sample-mutual-nda.docx',
  author: 'Jack Wang',
  tracked: true,
  at: '2026-09-01T14:41:00.000Z',
  summary: { changes: 14, comments: 3, applied: 5, skipped: 0, clauses: 5, bytes: 42_000 },
};

beforeEach(() => {
  fetched = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetched.push(String(input));
    return new Response(new Blob([new Uint8Array([1, 2, 3])]), { status: 200, headers: { 'content-type': 'application/octet-stream' } });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('ArtifactSlip', () => {
  test('the head, the sentence, the facts and the by-line, per the mock', () => {
    render(<ArtifactSlip artifact={artifact} onOpenFile={() => {}} />);
    const slip = document.querySelector('.v2-artifact')!;
    expect(slip.querySelector('.v2-tag')?.textContent).toBe('Redlined document');
    expect(slip.querySelector('.v2-artifact-name')?.textContent).toBe('sample-mutual-nda-redline-2026-09-01.docx');
    expect(slip.querySelector('.v2-artifact-name')?.getAttribute('title')).toBe(artifact.path);
    expect(slip.querySelector('.v2-artifact-state')?.textContent).toBe('ready');
    expect(slip.querySelector('.v2-artifact-body')?.textContent).toBe('Native Word tracked changes against the source; each change carries a comment with the reason.');
    expect(slip.querySelector('.v2-artifact-facts')?.textContent).toBe('14 changes·3 comments·5 clauses touched·41 KB');
    expect(slip.querySelector('.v2-artifact-by')?.textContent).toBe('revision marks by Jack Wang · Sep 1, 2026');
    // No pill, no card: the slip is a double rule and a hairline.
    expect(slip.querySelector('.v2-pill')).toBeNull();
  });

  test('Download fetches the bytes with the bearer and hands them to the browser', async () => {
    // `saveBlob` clicks a hidden `<a download href="blob:…">`. happy-dom
    // treats that click as a NAVIGATION of the one shared window, which
    // left `location`/`history` pointing at a blob URL for every test file
    // that ran after this one — on the CI runner (whose file order differs
    // from macOS) the docket-anchor tests in Chat.test.tsx then read an
    // empty hash and never scrolled. Record the click instead of letting
    // the window go anywhere.
    const clicks: Array<{ download: string; href: string }> = [];
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
      clicks.push({ download: this.download, href: this.href });
    };
    try {
      render(<ArtifactSlip artifact={artifact} />);
      await userEvent.click(screen.getByRole('button', { name: 'Download' }));
      await waitFor(() => expect(fetched).toEqual([`/vault/download?path=${encodeURIComponent(artifact.path)}`]));
      // Whether the test DOM can mint an object URL or not, the slip never
      // throws: it either hands the file over (one anchor click, named after
      // the file) or says it could not.
      await waitFor(() => expect(document.querySelector('.v2-artifact')).toBeTruthy());
      if (typeof URL.createObjectURL === 'function') {
        await waitFor(() => expect(clicks.map(c => c.download)).toEqual(['sample-mutual-nda-redline-2026-09-01.docx']));
      }
    } finally {
      HTMLAnchorElement.prototype.click = realClick;
    }
  });

  test('Open in reader and Show the changes open the produced file', async () => {
    const opened: string[] = [];
    render(<ArtifactSlip artifact={artifact} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open in reader' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show the changes' }));
    expect(opened).toEqual([artifact.path, artifact.path]);
  });

  test('an edited (untracked) copy, a live slip with no author, and skipped edits', () => {
    const plain: ArtifactView = { ...artifact, tracked: false, author: undefined, at: undefined, summary: { ...artifact.summary, comments: 0, skipped: 2 } };
    render(<ArtifactSlip artifact={plain} onOpenFile={() => {}} />);
    const slip = document.querySelector('.v2-artifact')!;
    expect(slip.querySelector('.v2-tag')?.textContent).toBe('Edited document');
    expect(slipSentence(plain)).toContain('no revision marks');
    expect(slip.querySelector('.v2-artifact-by')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show the changes' })).toBeNull();
    expect(slip.querySelector('.v2-artifact-skipped')?.textContent).toBe('2 edits skipped');
  });

  test('sizes and dates', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(42_000)).toBe('41 KB');
    expect(formatBytes(2_500_000)).toBe('2.4 MB');
    expect(slipDate('2026-09-01T14:41:00.000Z')).toBe('Sep 1, 2026');
    expect(slipDate('nope')).toBe('');
    expect(slipDate(undefined)).toBe('');
  });
});
