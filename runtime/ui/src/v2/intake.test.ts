import '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ApiError } from '../api/client';
import { TOKEN_KEY } from '../api/token';
import { addedLine, formatSize, intake, matterFolderOf, refusalFor, type IntakeStatus } from './intake';

const realFetch = globalThis.fetch;

beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'tok'));
afterEach(() => {
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('intake helpers', () => {
  test('a flat matter file gets a folder named after it; a folder matter keeps its folder', () => {
    expect(matterFolderOf('matters/acme-nda.md')).toBe('matters/acme-nda');
    expect(matterFolderOf('matters/acme/matter.md')).toBe('matters/acme');
    expect(matterFolderOf('deals/2026/x.md', 'deals')).toBe('deals/2026');
  });

  test('sizes and the added line', () => {
    expect(formatSize(900)).toBe('900 B');
    expect(formatSize(41 * 1024)).toBe('41 KB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(addedLine({ path: 'matters/inbox/Acme-NDA-v3.docx', size: 41 * 1024 })).toEqual({
      name: 'Acme-NDA-v3.docx',
      folder: 'matters/inbox',
      text: 'Added Acme-NDA-v3.docx to matters/inbox · 41 KB',
    });
  });

  test('refusals are one sentence each', () => {
    expect(refusalFor('Acme-NDA.pages', null)).toBe('Could not add Acme-NDA.pages: only Word documents (.docx) can be added for now. Export it from Pages as Word and drop it again.');
    expect(refusalFor('scan.pdf', null)).toContain('only Word documents (.docx)');
    expect(refusalFor('big.docx', new ApiError(413, null))).toBe('Could not add big.docx: it is larger than the 25 MB limit.');
    expect(refusalFor('bad.docx', new ApiError(422, null))).toContain('refused');
  });
});

describe('intake', () => {
  test('uploads the first Word document with the dest, reporting busy then done', async () => {
    const seen: string[] = [];
    const sent: { dest: string | null; auth: string | undefined } = { dest: null, auth: undefined };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(String(input));
      const form = init?.body as FormData;
      sent.dest = (form.get('dest') as string | null) ?? null;
      // Recorded, not asserted here: a throw inside the mock is swallowed by
      // `intake` and would read as a refusal.
      sent.auth = (init?.headers as Record<string, string>)['authorization'];
      return new Response(JSON.stringify({ path: 'matters/acme/nda.docx', size: 10 }), { status: 201, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const statuses: IntakeStatus[] = [];
    const up = await intake([new File(['x'], 'notes.txt'), new File(['pk'], 'nda.docx')], 'matters/acme', s => statuses.push(s));
    expect(up).toEqual({ path: 'matters/acme/nda.docx', size: 10 });
    expect(seen).toEqual(['/vault/upload']);
    expect(sent.dest).toBe('matters/acme');
    expect(sent.auth?.startsWith('Bearer ')).toBe(true);
    expect(statuses.map(s => s.kind)).toEqual(['busy', 'done']);
    expect(statuses[1]!.text).toBe('Added nda.docx to matters/acme · 10 B');
  });

  test('a non-Word file is refused without a request; a server refusal becomes the sentence', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: 'too big' }), { status: 413, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const statuses: IntakeStatus[] = [];
    expect(await intake([new File(['x'], 'Acme.pages')], undefined, s => statuses.push(s))).toBeNull();
    expect(calls).toBe(0);
    expect(statuses[0]!.kind).toBe('error');
    statuses.length = 0;
    expect(await intake([new File(['x'], 'big.docx')], undefined, s => statuses.push(s))).toBeNull();
    expect(statuses.map(s => s.kind)).toEqual(['busy', 'error']);
    expect(statuses[1]!.text).toContain('25 MB');
  });
});
