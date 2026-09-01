import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { DocketView, PendingProposal, ThreadHeader, VaultOverview } from '../../api/types';
import { docketDate, docketHeadParts, HomePage } from './HomePage';

const realFetch = globalThis.fetch;

const threads: ThreadHeader[] = [
  {
    id: 't-1',
    title: 'NDA residuals fallback',
    createdAt: '2026-08-30T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
    sessions: {},
  },
];

const overview: VaultOverview = {
  matters: [
    {
      path: 'matters/2026-06-vendora.md',
      title: 'Vendora × Worldpay — documentation',
      frontmatter: { deadline: '2026-09-12', next_action: 'send document list' },
      mtimeMs: Date.now() - 2 * 3_600_000,
    },
  ],
  groups: { practice: 1, knowledge: 0, other: 0 },
};

const empty: VaultOverview = { matters: [], groups: { practice: 0, knowledge: 0, other: 0 } };

let pending: PendingProposal[] = [];
let docketBody: DocketView = { deadlines: [], skipped: 0 };
let overviewBody: VaultOverview = overview;
let truncatedHeader = false;

function json(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const proposal: PendingProposal = {
  threadId: 't-1',
  threadTitle: 'NDA residuals fallback',
  id: 'p-1',
  path: 'practice/standards/nda.md',
  rationale: 'Record the narrow residuals carve-out as your NDA fallback',
  at: '2026-08-30T06:00:00.000Z',
};

const TRUNCATION_NOTE = 'Older conversations were not scanned — some proposals may not be shown.';

beforeEach(() => {
  pending = [];
  docketBody = { deadlines: [], skipped: 0 };
  overviewBody = overview;
  truncatedHeader = false;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  history.replaceState(null, '', '/#/');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/overview')) return json(overviewBody);
    if (url.startsWith('/proposals')) return json(pending, truncatedHeader ? { 'x-counsel-truncated': '1' } : {});
    if (url.startsWith('/docket')) return json(docketBody);
    if (url.startsWith('/vault/list')) return json([]);
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

function mount(over: Partial<Parameters<typeof HomePage>[0]> = {}) {
  return render(<HomePage threads={threads} onAsk={() => {}} onOpenThread={() => {}} {...over} />);
}

describe('HomePage', () => {
  test('greeting, honest subline, matters with leaders and next-actions, conversations', async () => {
    mount();
    expect(document.querySelector('.v2-hi')?.textContent).toMatch(/^Good (morning|afternoon|evening)\.$/);
    await waitFor(() => expect(screen.getByText('Vendora × Worldpay — documentation')).toBeTruthy());
    expect(document.querySelector('.v2-sub')?.textContent).toBe('One matter has open next-actions.');
    expect(screen.getByText('due Sep 12')).toBeTruthy();
    expect(screen.getByText('send document list')).toBeTruthy();
    expect(screen.getByText(/touched 2h ago/)).toBeTruthy();
    expect(screen.getByText('NDA residuals fallback')).toBeTruthy();
    // The docket is HIDDEN entirely when nothing is pending (spec §3.2).
    expect(document.querySelector('.v2-docket')).toBeNull();
  });

  test('the docket lists pending proposals and Review navigates, anchored', async () => {
    pending = [{ ...proposal, at: new Date(Date.now() - 2 * 3_600_000).toISOString() }];
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-head')?.textContent).toContain('1 awaiting your decision');
    expect(document.querySelector('.v2-sub')?.textContent).toContain('one proposal is waiting on you below');
    expect(screen.getByText('Record the narrow residuals carve-out as your NDA fallback')).toBeTruthy();
    expect(document.querySelector('.v2-docket-path')?.textContent).toContain('practice/standards/nda.md');
    expect(document.querySelector('.v2-docket-path')?.textContent).toContain('“NDA residuals fallback”');

    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(location.hash).toBe('#/chat?thread=t-1&proposal=p-1');
  });

  test('Ask hands the message over and empties the box', async () => {
    const asked: string[] = [];
    mount({ onAsk: message => asked.push(message) });
    await userEvent.type(screen.getByRole('textbox', { name: 'Ask counsel' }), 'Review the Acme NDA.');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(asked).toEqual(['Review the Acme NDA.']);
    expect((screen.getByRole('textbox', { name: 'Ask counsel' }) as HTMLTextAreaElement).value).toBe('');
  });

  test('an empty box asks nothing', async () => {
    const asked: string[] = [];
    mount({ onAsk: message => asked.push(message) });
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(asked).toEqual([]);
  });

  test('a starter fills the box and sends nothing', async () => {
    const asked: string[] = [];
    mount({ onAsk: message => asked.push(message) });
    await userEvent.click(screen.getByRole('button', { name: 'Review a contract' }));
    expect((screen.getByRole('textbox', { name: 'Ask counsel' }) as HTMLTextAreaElement).value).toBe('Review this contract: ');
    expect(asked).toEqual([]);
  });

  test('attach from vault inserts a path chip that rides with the message', async () => {
    const asked: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/vault/overview')) return json(overviewBody);
      if (url.startsWith('/proposals')) return json([]);
      if (url === '/vault/list') return json([{ path: 'matters', kind: 'dir' }]);
      if (url.startsWith('/vault/list?dir=matters')) return json([{ path: 'matters/acme.md', kind: 'file' }]);
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
    mount({ onAsk: message => asked.push(message) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Ask counsel' }), 'Review this.');

    await userEvent.click(screen.getByRole('button', { name: '＋ attach from vault' }));
    await userEvent.click(await screen.findByText('matters'));
    await userEvent.click(await screen.findByText('acme.md'));
    expect(screen.getByText('matters/acme.md')).toBeTruthy(); // the chip

    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(asked).toEqual(['Review this.\n\n`matters/acme.md`']);
  });

  test('a conversation row opens that thread', async () => {
    const opened: string[] = [];
    mount({ onOpenThread: id => opened.push(id) });
    // The grid waits for the vault read (cou-82) — find, not get.
    await userEvent.click(await screen.findByRole('button', { name: /NDA residuals fallback/ }));
    expect(opened).toEqual(['t-1']);
  });

  test('nothing below the starters claims emptiness before the vault read answers', () => {
    // A fetch that never settles: the page is in its first paint.
    globalThis.fetch = (async () => new Promise<Response>(() => {})) as unknown as typeof fetch;
    mount({ threads: [] });
    // Neither the grid's placeholders nor the getting-started block — a
    // fresh vault must land on ONE empty-state copy, not a flash of three.
    expect(document.querySelector('.v2-home-cols')).toBeNull();
    expect(document.querySelector('.v2-getting-started')).toBeNull();
  });

  test('an empty vault with no conversations gets the quiet getting-started block', async () => {
    overviewBody = empty;
    mount({ threads: [] });
    await waitFor(() => expect(document.querySelector('.v2-getting-started')).toBeTruthy());
    expect(document.querySelector('.v2-home-cols')).toBeNull();
    expect(document.querySelector('.v2-sub')).toBeNull();
    expect(screen.getByRole('link', { name: /docs/ })).toBeTruthy();
  });

  test('an empty vault does not hide conversations the reader has', async () => {
    overviewBody = empty;
    mount();
    await waitFor(() => expect(document.querySelector('.v2-home-cols')).toBeTruthy());
    expect(document.querySelector('.v2-getting-started')).toBeNull();
    expect(screen.getByText('No matters yet.')).toBeTruthy();
    expect(screen.getByText('NDA residuals fallback')).toBeTruthy();
  });

  test('a bounded docket scan says so, under the rows', async () => {
    pending = [proposal];
    truncatedHeader = true;
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    // The count in the head is only what was scanned, so the page must not
    // leave it standing alone as the whole queue.
    expect(document.querySelector('.v2-docket-note')?.textContent).toBe(TRUNCATION_NOTE);
  });

  test('an unbounded scan says nothing extra', async () => {
    pending = [proposal];
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-note')).toBeNull();
    expect(screen.queryByText(TRUNCATION_NOTE)).toBeNull();
  });

  test('a failed docket read leaves the matters column standing', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/proposals')) return new Response('nope', { status: 500 });
      if (String(input).startsWith('/vault/overview')) return json(overviewBody);
      return json([]);
    }) as unknown as typeof fetch;
    mount();

    // The matters that DID load render, and nothing claims the vault is empty.
    await waitFor(() => expect(screen.getByText('Vendora × Worldpay — documentation')).toBeTruthy());
    expect(screen.queryByText('No matters yet.')).toBeNull();
    expect(document.querySelector('.v2-getting-started')).toBeNull();
    // The docket is gone, and one quiet line says why.
    expect(document.querySelector('.v2-docket')).toBeNull();
    expect(document.querySelector('.v2-docket-error')?.textContent).toContain('could not read the docket');
  });

  test('a failed vault read leaves the docket standing', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/vault/overview')) return new Response('nope', { status: 500 });
      if (String(input).startsWith('/proposals')) return json([proposal]);
      return json([]);
    }) as unknown as typeof fetch;
    mount();

    // The founder gate stays on the page.
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(screen.getByText('Record the narrow residuals carve-out as your NDA fallback')).toBeTruthy();
    // And the matters column says what happened instead of "No matters yet."
    expect(screen.queryByText('No matters yet.')).toBeNull();
    expect(document.querySelector('.v2-getting-started')).toBeNull();
    expect(document.querySelector('.v2-home-card .v2-notice-error')?.textContent).toContain('could not read the vault');
  });

  test('a long docket column stops at eight and points at the vault', async () => {
    overviewBody = {
      matters: Array.from({ length: 11 }, (_, i) => ({
        path: `matters/m-${i}.md`,
        title: `Matter ${i}`,
        frontmatter: {},
        mtimeMs: 1000 - i,
      })),
      groups: { practice: 11, knowledge: 0, other: 0 },
    };
    mount();
    await waitFor(() => expect(document.querySelectorAll('.v2-matter')).toHaveLength(8));
    expect(screen.getByRole('link', { name: '3 more in the vault →' })).toBeTruthy();
  });
});

describe('HomePage matter rows without a deadline (cou-93 item 6)', () => {
  test('the due slot shows the stage, and stays empty when there is none — never "no deadline"', async () => {
    overviewBody = {
      matters: [
        { path: 'matters/2026-06-forge.md', title: 'Forge — Duty Refund', frontmatter: { stage: 'working' }, mtimeMs: Date.now() },
        { path: 'matters/2026-05-twine.md', title: 'Twine — Pilot', frontmatter: {}, mtimeMs: Date.now() - 1000 },
      ],
      groups: { practice: 0, knowledge: 0, other: 0 },
    };
    render(<HomePage threads={threads} onAsk={() => {}} onOpenThread={() => {}} />);
    await waitFor(() => expect(screen.getByText('Forge — Duty Refund')).toBeTruthy());
    expect(screen.getByText('working').className).toContain('v2-due');
    expect(screen.queryByText('no deadline')).toBeNull();
    const rows = document.querySelectorAll('.v2-matter');
    expect(rows).toHaveLength(2);
    // The row with neither has no slot and no leader pointing at nothing.
    expect(rows[1]!.querySelector('.v2-due')).toBeNull();
    expect(rows[1]!.querySelector('.leader')).toBeNull();
  });
});

describe('HomePage, one docket: deadlines + proposals', () => {
  const iso = (daysFromNow: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  };
  const entry = (date: string, action: string, status: DocketView['deadlines'][number]['status'], title = 'Acme — NDA') => ({
    date,
    action,
    matter: { path: `matters/${title.toLowerCase().replace(/[^a-z]+/g, '-')}.md`, title },
    status,
  });

  test('deadlines by date, overdue hot, later folded behind one line that unfolds in place', async () => {
    docketBody = {
      deadlines: [
        entry('2020-01-01', 'file the response', 'overdue'),
        entry(iso(3), 'renewal notice due', 'soon', 'Vendora × Worldpay'),
        entry(iso(40), 'objection window closes', 'later'),
        entry(iso(90), 'term ends', 'later', 'Vendora × Worldpay'),
      ],
      skipped: 0,
    };
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-head')?.textContent).toBe('Docket · 4 deadlines');
    // No proposals, so no group run-ins — one list, no labels to read past.
    expect(document.querySelector('.v2-docket-sub')).toBeNull();

    const rows = () => Array.from(document.querySelectorAll('.v2-dl'));
    expect(rows()).toHaveLength(2);
    expect(rows()[0]!.querySelector('.v2-dl-date')?.className).toContain('v2-due-hot');
    expect(rows()[0]!.querySelector('.v2-dl-date')?.textContent).toBe('Jan 1, 2020');
    expect(rows()[0]!.querySelector('.v2-dl-action')?.textContent).toBe('file the response');
    expect(rows()[0]!.querySelector('a.v2-dl-matter')?.getAttribute('href')).toBe('#/vault?path=matters%2Facme-nda.md');
    expect(rows()[1]!.querySelector('.v2-dl-date')?.className).not.toContain('v2-due-hot');

    const fold = screen.getByRole('button', { name: '2 later →' });
    await userEvent.click(fold);
    expect(rows()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: '2 later →' })).toBeNull();
    expect(rows()[3]!.querySelector('.v2-dl-action')?.textContent).toBe('term ends');
  });

  test('deadlines and proposals share the docket, each under its run-in', async () => {
    docketBody = { deadlines: [entry(iso(2), 'renewal notice due', 'soon')], skipped: 1 };
    pending = [proposal];
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-head')?.textContent).toBe('Docket · 1 deadline · 1 awaiting your decision');
    expect(Array.from(document.querySelectorAll('.v2-docket-sub'), el => el.textContent)).toEqual(['Deadlines', 'Awaiting your decision']);
    // The proposal row is unchanged, Review still anchors.
    expect(screen.getByText('Record the narrow residuals carve-out as your NDA fallback')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(location.hash).toBe('#/chat?thread=t-1&proposal=p-1');
    // A malformed date is a number on the page, never a silent absence.
    expect(document.querySelector('.v2-dl-group .v2-docket-note')?.textContent).toContain('1 deadline could not be read');
  });

  test('a failed deadline sweep says so and leaves the proposals standing', async () => {
    pending = [proposal];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/docket')) return new Response('nope', { status: 500 });
      if (url.startsWith('/proposals')) return json(pending);
      if (url.startsWith('/vault/overview')) return json(overviewBody);
      return json([]);
    }) as unknown as typeof fetch;
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelector('.v2-docket-head')?.textContent).toBe('Docket · 1 awaiting your decision');
    expect(screen.getByRole('alert').textContent).toContain('could not read the deadlines');
    expect(screen.getByText('Record the narrow residuals carve-out as your NDA fallback')).toBeTruthy();
  });

  test('an older runtime that answers /docket in another shape is no deadlines, not a crash', async () => {
    docketBody = [] as unknown as DocketView;
    pending = [proposal];
    mount();
    await waitFor(() => expect(document.querySelector('.v2-docket')).toBeTruthy());
    expect(document.querySelectorAll('.v2-dl')).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('docketDate and docketHeadParts', () => {
    const now = new Date('2026-09-01T12:00:00');
    expect(docketDate('2026-09-12', now)).toBe('Sep 12');
    expect(docketDate('2027-01-05', now)).toBe('Jan 5, 2027');
    expect(docketDate('garbage', now)).toBe('garbage');
    expect(docketHeadParts(0, 0)).toEqual([]);
    expect(docketHeadParts(1, 0)).toEqual(['1 deadline']);
    expect(docketHeadParts(3, 2)).toEqual(['3 deadlines', '2 awaiting your decision']);
  });
});
