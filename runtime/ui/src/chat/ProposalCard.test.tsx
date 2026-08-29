import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { ProposalCard } from './ProposalCard';
import type { ProposalView } from './turns';

const proposal: ProposalView = {
  id: 'p-1',
  path: 'practice/standards/indemnification.md',
  rationale: 'The mutual cap we agreed in the Acme deal is not written down.',
  status: 'pending',
};

const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];

function respond(status: number, body: unknown): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
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

describe('ProposalCard', () => {
  test('shows the path and rationale, and offers approve and reject', () => {
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);
    expect(screen.getByText(proposal.path)).toBeTruthy();
    expect(screen.getByText(proposal.rationale)).toBeTruthy();
    expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reject/i })).toBeTruthy();
  });

  test('approve calls the API and shows the new status', async () => {
    respond(200, { proposal: { ...proposal, status: 'approved' }, version: 'abc123' });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(screen.getByText('approved')).toBeTruthy());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/threads/t-1/approve');
    expect(calls[0]!.body).toEqual({ proposalId: 'p-1', decision: 'approve' });
    // The buttons are gone: a decided proposal cannot be decided again.
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });

  test('reject calls the API with the reject decision', async () => {
    respond(200, { proposal: { ...proposal, status: 'rejected' } });
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => expect(screen.getByText('rejected')).toBeTruthy());
    expect(calls[0]!.body).toEqual({ proposalId: 'p-1', decision: 'reject' });
  });

  test('a 409 conflict shows both versions and a reload button', async () => {
    respond(409, {
      error: 'vault conflict on practice/standards/indemnification.md',
      conflict: { expected: 'expected-hash', actual: 'actual-hash' },
    });
    let reloaded = 0;
    render(<ProposalCard threadId="t-1" proposal={proposal} onReload={() => { reloaded += 1; }} />);

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(screen.getByText(/expected-hash/)).toBeTruthy());
    expect(screen.getByText(/actual-hash/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(reloaded).toBe(1);
  });

  test('a proposal that was already decided renders its status and no buttons', () => {
    render(<ProposalCard threadId="t-1" proposal={{ ...proposal, status: 'approved' }} onReload={() => {}} />);
    expect(screen.getByText('approved')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });
});
