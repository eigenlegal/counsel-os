import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import { MISSING_FILE_NOTE, Reader, withoutHostPaths } from './Reader';

const realFetch = globalThis.fetch;

const SOURCE = [
  '---',
  'stage: working',
  'counterparty: Worldpay',
  'deadline: 2026-09-12',
  '---',
  '# Vendora × Worldpay — documentation requests',
  '',
  '## Background',
  'Some prose.',
  '',
  '## Next steps',
  'More prose.',
  '',
].join('\n');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(read: () => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/read')) return read();
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('Reader', () => {
  test('crumbs, the serif title, version + updated, leader facts, markdown body', async () => {
    install(() =>
      json({ path: 'matters/2026-06-vendora.md', content: SOURCE, version: '4576a07bcd', mtimeMs: Date.now() - 2 * 3_600_000 }),
    );
    render(<Reader path="matters/2026-06-vendora.md" />);

    await waitFor(() => expect(screen.getByText('Vendora × Worldpay — documentation requests')).toBeTruthy());
    // Crumbs: the containing path in mono, the filename strong.
    expect(document.querySelector('.v2-doc-crumbs')?.textContent).toContain('matters');
    expect(document.querySelector('.v2-doc-crumbs b')?.textContent).toBe('2026-06-vendora.md');
    // Meta: updated <ago> · version <7>.
    expect(document.querySelector('.v2-doc-meta')?.textContent).toBe('updated 2h ago · version 4576a07');
    // Frontmatter rows with leaders.
    expect(screen.getByText('counterparty')).toBeTruthy();
    expect(screen.getByText('Worldpay')).toBeTruthy();
    expect(document.querySelectorAll('.v2-fm-row .leader').length).toBe(3);
    // The body renders as markdown, WITHOUT a duplicate H1.
    expect(document.querySelectorAll('.v2-doc-md h1').length).toBe(0);
    expect(document.querySelector('.v2-doc-md h2')?.textContent).toBe('Background');
  });

  test('the outline column lists the H2s when asked for', async () => {
    install(() => json({ path: 'matters/x.md', content: SOURCE, version: null, mtimeMs: null }));
    render(<Reader path="matters/x.md" outline />);
    await waitFor(() => expect(document.querySelector('.v2-outline')).toBeTruthy());
    expect(Array.from(document.querySelectorAll('.v2-outline button'), el => el.textContent)).toEqual([
      'Background',
      'Next steps',
    ]);
  });

  test('a 404 is the missing-file note, not an error', async () => {
    install(() => json({ error: 'not found' }, 404));
    render(<Reader path="practice/standards/nda.md" />);
    await waitFor(() => expect(screen.getByText(MISSING_FILE_NOTE)).toBeTruthy());
    expect(document.querySelector('.notice-error')).toBeNull();
  });

  test('the ask bar hands the path over', async () => {
    install(() => json({ path: 'matters/x.md', content: '# X\nBody.\n', version: null, mtimeMs: null }));
    const asked: string[] = [];
    render(<Reader path="matters/x.md" onAsk={path => asked.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Ask counsel about this file/ })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /Ask counsel about this file/ }));
    expect(asked).toEqual(['matters/x.md']);
  });

  test('no ask bar before the file loads, or on a file that is not there', async () => {
    install(() => json({ error: 'not found' }, 404));
    render(<Reader path="practice/standards/nda.md" onAsk={() => {}} />);
    await waitFor(() => expect(screen.getByText(MISSING_FILE_NOTE)).toBeTruthy());
    // Nothing to ask about: the bar would anchor to the pane bottom under
    // a note that says the file does not exist.
    expect(document.querySelector('.v2-askbar')).toBeNull();
  });

  test('a deadline row reads like Home — due <date>, amber, raw date in the title', async () => {
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    install(() => json({ path: 'matters/x.md', content: `---\ndeadline: ${soon}\n---\n# X\nBody.\n`, version: null, mtimeMs: null }));
    render(<Reader path="matters/x.md" />);
    await waitFor(() => expect(document.querySelector('.v2-fm-row dd')).toBeTruthy());
    const dd = document.querySelector('.v2-fm-row dd') as HTMLElement;
    expect(dd.textContent).toMatch(/^due /);
    expect(dd.classList.contains('v2-due-hot')).toBe(true);
    expect(dd.getAttribute('title')).toBe(soon);
  });

  test('a deadline that does not parse stays verbatim', async () => {
    install(() => json({ path: 'matters/x.md', content: '---\ndeadline: end of Q3\n---\n# X\nBody.\n', version: null, mtimeMs: null }));
    render(<Reader path="matters/x.md" />);
    await waitFor(() => expect(document.querySelector('.v2-fm-row dd')).toBeTruthy());
    const dd = document.querySelector('.v2-fm-row dd') as HTMLElement;
    expect(dd.textContent).toBe('end of Q3');
    expect(dd.classList.contains('v2-due-hot')).toBe(false);
    expect(dd.getAttribute('title')).toBeNull();
  });

  test('a non-markdown file renders raw', async () => {
    install(() => json({ path: 'matters/notes.txt', content: '<b>not bold</b>\n', version: null, mtimeMs: null }));
    render(<Reader path="matters/notes.txt" />);
    await waitFor(() => expect(document.querySelector('pre.vault-raw')).toBeTruthy());
    // Verbatim, not parsed. (The brief's `.v2-doc b` selector cannot say
    // this: the crumbs bold the filename on every path.)
    expect(document.querySelector('.v2-doc-md')).toBeNull();
    expect(document.querySelector('pre.vault-raw')?.textContent).toBe('<b>not bold</b>\n');
  });

  // Moved from the retired `vault/FileView.test.tsx`: the reader is the only
  // vault surface now, so its markdown path is the one that must stay inert.
  test('a file that tries to script the page renders as inert text', async () => {
    install(() =>
      json({
        path: 'matters/hostile.md',
        content:
          '# Notes\n\n<script>globalThis.__pwned = true;</script>\n\n<img src=x onerror="globalThis.__pwned = true">\n\n[click](javascript:alert(1))\n',
        version: 'v1',
        mtimeMs: null,
      }),
    );
    render(<Reader path="matters/hostile.md" />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy());
    const rendered = document.querySelector('.v2-doc-md');
    expect(rendered).not.toBeNull();
    expect(rendered!.querySelector('script')).toBeNull();
    expect(rendered!.querySelector('img')).toBeNull();
    expect(rendered!.innerHTML).not.toContain('onerror');
    expect(rendered!.innerHTML).not.toContain('javascript:');
    expect((globalThis as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  // Moved from `vault/FileView.test.tsx`: a read failure still names the file
  // without naming the server's disk.
  test('an error that carries an absolute host path does not print one', async () => {
    install(() => json({ error: "EACCES: permission denied, open '/Users/jack/legal/practice/standards/nda.md'" }, 500));
    render(<Reader path="practice/standards/nda.md" />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('EACCES'));
    const shown = screen.getByRole('alert').textContent ?? '';
    expect(shown).not.toContain('/Users/jack');
    expect(shown).toContain('standards/nda.md');
  });
});

describe('withoutHostPaths', () => {
  test('keeps the last two segments of an absolute path and vault-relative ones intact', () => {
    expect(withoutHostPaths("ENOENT: no such file, open '/Users/x/vault/matters/nda.md'")).toBe(
      "ENOENT: no such file, open 'matters/nda.md'",
    );
    expect(withoutHostPaths('practice/standards/nda.md is missing')).toBe('practice/standards/nda.md is missing');
  });

  // The rest of the retired FileView suite's cases, verbatim.
  test('keeps the last two segments of an absolute path and drops the rest', () => {
    expect(withoutHostPaths("ENOENT: no such file or directory, open '/tmp/x/vault/practice/standards/nda.md' (404)")).toBe(
      "ENOENT: no such file or directory, open 'standards/nda.md' (404)",
    );
  });

  test('leaves a message with no path in it alone', () => {
    expect(withoutHostPaths('no such file: matters/gone.md')).toBe('no such file: matters/gone.md');
    expect(withoutHostPaths('the server said no')).toBe('the server said no');
  });

  test('leaves vault-relative paths with several segments alone', () => {
    expect(withoutHostPaths('cannot write practice/standards/nda.md (500)')).toBe('cannot write practice/standards/nda.md (500)');
    expect(withoutHostPaths('path escapes the vault: matters/acme/nda.md')).toBe('path escapes the vault: matters/acme/nda.md');
    expect(withoutHostPaths("open '/srv/vault/matters/acme/nda.md' failed")).toBe("open 'acme/nda.md' failed");
  });
});

describe('Reader, a Word document', () => {
  test('renders the converted markdown with the document\'s tracked changes, the Word line, and a warning count', async () => {
    install(() =>
      json({
        path: 'matters/acme/nda.docx',
        kind: 'docx',
        content: '# Mutual NDA\n\n## 2. Term\n\nLasts {--two--}{++one++} year. {>>Reasonable is market. (R. Patel, 2026-08-28)<<}\n',
        version: 'abc1234',
        mtimeMs: null,
        warnings: ['body[4]: a drawing was left out'],
      }),
    );
    render(<Reader path="matters/acme/nda.docx" outline />);
    await waitFor(() => expect(document.querySelector('.v2-doc-md')).toBeTruthy());
    expect(document.querySelector('.v2-doc-head h1')?.textContent).toBe('Mutual NDA');
    expect(document.querySelector('pre.vault-raw')).toBeNull();
    expect(document.querySelector('.v2-doc-md del')?.textContent).toBe('two');
    expect(document.querySelector('.v2-doc-md ins')?.textContent).toBe('one');
    expect(document.querySelector('.v2-doc-md .v2-comment')?.textContent).toContain('Reasonable is market.');
    const line = document.querySelector('.v2-doc-word')!;
    expect(line.textContent).toContain('Word document');
    expect(line.textContent).toContain('converted for reading');
    expect(screen.getByRole('button', { name: 'download' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'open the original' })).toBeTruthy();
    expect(line.textContent).toContain('1 item could not be shown');
    // The outline lists the sections.
    expect(Array.from(document.querySelectorAll('.v2-outline button'), b => b.textContent)).toEqual(['2. Term']);
  });

  test('download fetches the bytes with the bearer header and never puts the token in a URL', async () => {
    const seen: Array<{ url: string; auth: string | undefined }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push({ url, auth: (init?.headers as Record<string, string> | undefined)?.['authorization'] });
      if (url.startsWith('/vault/read')) return json({ path: 'matters/acme/nda.docx', kind: 'docx', content: '# NDA\n', version: null, mtimeMs: null, warnings: [] });
      if (url.startsWith('/vault/download')) return new Response(new Uint8Array([80, 75, 3, 4]), { status: 200, headers: { 'content-type': 'application/octet-stream' } });
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
    render(<Reader path="matters/acme/nda.docx" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'download' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'download' }));
    await waitFor(() => expect(seen.some(s => s.url.startsWith('/vault/download'))).toBe(true));
    const dl = seen.find(s => s.url.startsWith('/vault/download'))!;
    expect(dl.url).toBe('/vault/download?path=matters%2Facme%2Fnda.docx');
    expect(dl.auth).toBe('Bearer test-token');
    expect(dl.url).not.toContain('test-token');
  });

  test('a text file is unchanged by the kind field', async () => {
    install(() => json({ path: 'matters/notes.txt', kind: 'text', content: 'plain', version: null, mtimeMs: null }));
    render(<Reader path="matters/notes.txt" />);
    await waitFor(() => expect(document.querySelector('pre.vault-raw')).toBeTruthy());
    expect(document.querySelector('.v2-doc-word')).toBeNull();
  });
});
