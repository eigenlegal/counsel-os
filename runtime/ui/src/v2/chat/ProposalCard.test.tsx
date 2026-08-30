import { act, cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { ProposalView } from '../../chat/turns';
import { ProposalCard } from './ProposalCard';

const at = '2026-08-29T10:00:00.000Z';

const proposal: ProposalView = {
  id: 'p-1',
  path: 'practice/standards/nda.md',
  rationale: 'The term we agreed is not written down.',
  content: '# NDA\nTerm: 3 years\n',
  status: 'pending',
};

const CURRENT = { path: proposal.path, content: '# NDA\nTerm: 2 years\n', version: 'abc1234def0' };

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

function lines(kind: 'add' | 'del' | 'ctx'): string[] {
  return Array.from(document.querySelectorAll(`.v2-diff-${kind}`), el => el.textContent ?? '');
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

describe('v2 ProposalCard', () => {
  test('renders the redline against the current file, with its version', async () => {
    install();
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del')).toEqual(['-Term: 2 years\n']));
    expect(lines('add')).toEqual(['+Term: 3 years\n']);
    expect(lines('ctx')).toEqual([' # NDA\n']);
    expect(screen.getByText('against version abc1234')).toBeTruthy();
    expect(calls[0]!.url).toBe('/vault/read?path=practice%2Fstandards%2Fnda.md');
    expect(screen.getByText(proposal.rationale)).toBeTruthy();
  });

  test('a file that does not exist yet is all additions', async () => {
    install({ read: () => json({ error: 'not found' }, 404) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('add')).toEqual(['+# NDA\n', '+Term: 3 years\n']));
    expect(lines('del')).toEqual([]);
  });

  test('preview renders the proposed markdown through the sanitizer', async () => {
    install();
    const scripted = { ...proposal, content: '# NDA\n<script>alert(1)</script>\nTerm: 3 years\n' };
    render(<ProposalCard threadId="t-1" proposal={scripted} onReload={() => {}} />);
    await waitFor(() => expect(lines('add').length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'preview' }));

    expect(document.querySelector('.v2-preview h1')?.textContent).toBe('NDA');
    expect(document.querySelector('.v2-preview script')).toBeNull();
    expect(document.querySelector('.v2-preview')?.textContent).not.toContain('alert(1)');
    expect(document.querySelector('.v2-diff')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'diff' }));
    expect(document.querySelector('.v2-diff')).toBeTruthy();
  });

  test('approve calls the API, shows the status, and keeps the diff readable', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' }, version: 'new0000' }) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText('approved')).toBeTruthy());
    expect(calls.at(-1)).toEqual({ url: '/threads/t-1/approve', body: { proposalId: 'p-1', decision: 'approve' } });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(lines('del')).toEqual(['-Term: 2 years\n']);
  });

  test('a 409 conflict becomes the reload footer with both versions', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'expected-hash', actual: 'actual-hash' } }, 409) });
    let reloaded = 0;
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => { reloaded += 1; }} />);
    await waitFor(() => expect(lines('del').length).toBe(1));

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
        json({ error: 'proposal is not pending', proposal: { t: 'proposal', at, id: 'p-1', path: proposal.path, content: '', rationale: '', status: 'rejected', expectedVersion: null } }, 409),
    });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('rejected')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  test('when the current file cannot be loaded, the proposed content stands alone and says why', async () => {
    install({ read: () => json({ error: 'vault unreadable' }, 500) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(screen.getByText(/could not load current file: vault unreadable/)).toBeTruthy());
    expect(document.querySelector('.v2-proposal-raw')?.textContent).toBe(proposal.content);
    expect(document.querySelector('.v2-diff')).toBeNull();
    // Still decidable.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('a live proposal with no content yet says the diff is loading', async () => {
    install();
    const { content: _dropped, ...live } = proposal;
    render(<ProposalCard threadId="t-1" proposal={live} onReload={() => {}} />);
    expect(screen.getByText('loading diff…')).toBeTruthy();
    expect(screen.getByText(proposal.path)).toBeTruthy();
    // The card still reads the current file while the content is on its
    // way, so the diff lands with the reload instead of a round trip after
    // it. Settle that read here rather than leaving it to land untracked.
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
    expect(screen.getByRole('link', { name: 'open in vault' }).getAttribute('href')).toBe('#/vault?path=practice%2Fstandards%2Fnda.md');
    await act(async () => {});
  });

  test('a reload with a decided proposal replaces the local state and clears the conflict', async () => {
    install({ approve: () => json({ error: 'vault conflict', conflict: { expected: 'e-hash', actual: 'a-hash' } }, 409) });
    const { rerender } = render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText(/e-hash/)).toBeTruthy());

    // What Reload brings back: the server's copy of the proposal, on the
    // same React key. It wins over everything the card decided locally.
    rerender(<ProposalCard threadId="t-1" proposal={{ ...proposal, status: 'approved' }} onReload={() => {}} />);

    expect(screen.getByText('approved')).toBeTruthy();
    expect(screen.queryByText(/e-hash/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  test('a non-markdown proposal previews as text, never through the HTML sink', async () => {
    const txt = { ...proposal, path: 'matters/notes.txt', content: '<b>not bold</b>\n' };
    install({ read: () => json({ path: txt.path, content: 'plain\n', version: 'abc1234def0' }) });
    render(<ProposalCard threadId="t-1" proposal={txt} onReload={() => {}} />);
    await waitFor(() => expect(lines('add')).toEqual(['+<b>not bold</b>\n']));
    await userEvent.click(screen.getByRole('button', { name: 'preview' }));
    expect(document.querySelector('pre.v2-preview')?.textContent).toBe(txt.content);
    expect(document.querySelector('.v2-preview b')).toBeNull();
  });

  test('a decision in flight blocks a second one', async () => {
    let land: (res: Response) => void = () => {};
    install({ approve: () => new Promise<Response>(resolve => { land = resolve; }) });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    await waitFor(() => expect(lines('del').length).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(calls.filter(call => call.url.endsWith('/approve'))).toHaveLength(1);
    await act(async () => { land(json({ proposal: { ...proposal, status: 'approved' } })); });
  });

  test('a decision tells the shell which path settled, so an open reader can refetch', async () => {
    install({ approve: () => json({ proposal: { ...proposal, status: 'approved' } }) });
    const decided: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => decided.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decided).toEqual(['practice/standards/nda.md']));
    // And the card still shows what changed.
    expect(lines('add')).toEqual(['+Term: 3 years\n']);
  });

  test('a decision the server refuses tells nobody to refetch', async () => {
    install({ approve: () => json({ error: 'this proposal is no longer pending' }, 409) });
    const decided: string[] = [];
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} onDecided={path => decided.push(path)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('this proposal is no longer pending')).toBeTruthy());
    expect(decided).toEqual([]);
  });
});
