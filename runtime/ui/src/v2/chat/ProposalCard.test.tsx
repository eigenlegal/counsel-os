import { act, cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { ProposalView } from '../../chat/turns';
import { ProposalCard } from './ProposalCard';

const at = '2026-08-29T10:00:00.000Z';

const proposal: ProposalView = {
  id: 'p-1',
  path: 'practice/standards/nda.md',
  rationale: 'Record the fallback so drafts start from the position you actually take.',
  content: '# NDA\n\nTerm: 2 years\n\nResiduals: not offered; fallback = narrow carve-out.\n',
  status: 'pending',
};

const CURRENT = {
  path: proposal.path,
  content: '# NDA\n\nTerm: 2 years\n\nResiduals: not offered, ever.\n',
  version: 'abc1234def0',
  mtimeMs: 1,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];

function install(opts: { read?: () => Response; approve?: () => Response | Promise<Response> } = {}): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    if (url.startsWith('/vault/read')) return opts.read === undefined ? json(CURRENT) : opts.read();
    if (url.endsWith('/approve')) {
      if (opts.approve === undefined) throw new Error('no approve response configured');
      return opts.approve();
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

function marks(kind: 'ins' | 'del'): string[] {
  return Array.from(document.querySelectorAll(`.v2-redline ${kind}`), el => el.textContent ?? '');
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('the proposal slip', () => {
  test('pending: tracked changes, changed blocks only, set-text status, against version, the anchor id', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    // Word-style: only the words that actually moved are marked. The
    // sentence around them stays one unbroken run of plain text — a redline
    // that struck the whole line and re-typed it would be a lie about the
    // size of the edit.
    await waitFor(() => expect(marks('del').join('')).toContain(', ever'));
    expect(marks('ins').join('')).toContain('; fallback = narrow carve-out');
    // Changed blocks only: the untouched "Term" paragraph is not shown.
    expect(document.querySelector('.v2-redline')?.textContent).not.toContain('Term: 2 years');
    expect(document.querySelectorAll('.v2-redline del').length).toBeGreaterThan(0);
    // Set text, not a pill.
    expect(document.querySelector('.v2-status-pending')?.textContent).toBe('pending');
    expect(screen.getByText('against version abc1234')).toBeTruthy();
    expect(document.getElementById('proposal-p-1')).toBeTruthy();
    expect(screen.getByText(proposal.rationale)).toBeTruthy();
  });

  test('whole document and line diff are one click away, and changes-only comes back', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('ins').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'whole document' }));
    expect(document.querySelector('.v2-redline')?.textContent).toContain('Term: 2 years');

    await userEvent.click(screen.getByRole('button', { name: 'line diff' }));
    expect(document.querySelector('.v2-diff')).toBeTruthy();
    expect(document.querySelector('.v2-redline')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'changes only' }));
    expect(document.querySelector('.v2-redline')?.textContent).not.toContain('Term: 2 years');
  });

  test('a proposal against a missing file is all insertions', async () => {
    install({ read: () => json({ error: 'not found' }, 404) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('ins').length).toBeGreaterThan(0));
    expect(marks('del')).toEqual([]);
  });

  test('script-looking content renders as literal text, never as HTML', async () => {
    install();
    const scripted = { ...proposal, content: '# NDA\n<script>alert(1)</script>\n' };
    render(<ProposalCard threadId="t-1" proposal={scripted} onReload={() => {}} />);
    await waitFor(() => expect(document.querySelector('.v2-redline')).toBeTruthy());
    expect(document.querySelector('.v2-redline script')).toBeNull();
    expect(document.querySelector('.v2-redline')?.textContent).toContain('<script>alert(1)</script>');
  });

  test('approve calls the API; the slip collapses to ✓ approved with the change one click away', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' }, version: 'new0000' }) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText(/✓ approved/)).toBeTruthy());
    expect(calls.at(-1)).toEqual({ url: '/threads/t-1/approve', body: { proposalId: 'p-1', decision: 'approve' } });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    // Collapsed: the redline folds away…
    expect(document.querySelector('.v2-redline')).toBeNull();
    // …and "view change ⌄" brings it back.
    await userEvent.click(screen.getByRole('button', { name: /view change/ }));
    expect(marks('ins').length).toBeGreaterThan(0);
  });

  test('a 409 conflict becomes the reload footer with both versions', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'expected-hash', actual: 'actual-hash' } }, 409) });
    let reloaded = 0;
    render(
      <ProposalCard
        threadId="t-1"
        proposal={proposal}
        onReload={() => {
          reloaded += 1;
        }}
      />,
    );
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText(/file changed since/)).toBeTruthy());
    expect(screen.getByText(/expected-hash/)).toBeTruthy();
    expect(screen.getByText(/actual-hash/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloaded).toBe(1);
    expect(screen.queryByText(/expected-hash/)).toBeNull();
  });

  test('a 409 for an already-decided proposal adopts the settled status', async () => {
    install({
      approve: () =>
        json(
          {
            error: 'proposal is not pending',
            proposal: { t: 'proposal', at, id: 'p-1', path: proposal.path, content: '', rationale: '', status: 'rejected', expectedVersion: null },
          },
          409,
        ),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(document.querySelector('.v2-status-rejected')?.textContent).toBe('rejected'));
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  test('when the current file cannot be loaded, the proposed content stands alone and says why', async () => {
    install({ read: () => json({ error: 'vault unreadable' }, 500) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(screen.getByText(/could not load current file: vault unreadable/)).toBeTruthy());
    expect(document.querySelector('.v2-proposal-raw')?.textContent).toBe(proposal.content);
    expect(document.querySelector('.v2-redline')).toBeNull();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('a live proposal with no content yet says the change is loading', async () => {
    install();
    const { content: _dropped, ...live } = proposal;
    render(<ProposalCard threadId="t-1" proposal={live} onReload={() => {}} />);
    expect(screen.getByText('loading the change…')).toBeTruthy();
    expect(screen.getByText(proposal.path)).toBeTruthy();
    // The card still reads the current file while the content is on its
    // way, so the change lands with the reload instead of a round trip
    // after it. Settle that read here rather than leaving it untracked.
    await act(async () => {});
    expect(calls).toHaveLength(1);
  });

  test('open in vault hands the path to the drawer', async () => {
    install();
    const opened: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(opened).toEqual([proposal.path]);
  });

  test('with no drawer, open in vault is a link to the vault page', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    expect(screen.getByRole('link', { name: 'open in vault' }).getAttribute('href')).toBe(
      '#/vault?path=practice%2Fstandards%2Fnda.md',
    );
    await act(async () => {});
  });

  test('a reload with a decided proposal replaces the local state and clears the conflict', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'e-hash', actual: 'a-hash' } }, 409) });
    const { rerender } = render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText(/e-hash/)).toBeTruthy());

    rerender(<ProposalCard threadId="t-1" proposal={{ ...proposal, status: 'approved' }} onReload={() => {}} />);

    expect(screen.getByText(/✓ approved/)).toBeTruthy();
    expect(screen.queryByText(/e-hash/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  test('a decision in flight blocks a second one', async () => {
    let land: (res: Response) => void = () => {};
    install({
      approve: () =>
        new Promise<Response>(resolve => {
          land = resolve;
        }),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(marks('del').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(calls.filter(call => call.url.endsWith('/approve'))).toHaveLength(1);
    await act(async () => {
      land(json({ proposal: { ...proposal, status: 'approved' } }));
    });
  });

  test('a decision tells the shell which path settled; a refused one tells nobody', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' } }) });
    const decided: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => decided.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decided).toEqual(['practice/standards/nda.md']));

    cleanup();
    calls = [];
    install({ approve: () => json({ error: 'this proposal is no longer pending' }, 409) });
    const refused: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => refused.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('this proposal is no longer pending')).toBeTruthy());
    expect(refused).toEqual([]);
  });
});
