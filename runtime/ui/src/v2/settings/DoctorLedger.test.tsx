import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { DoctorReport } from '../../api/types';
import { DoctorLedger } from './DoctorLedger';

const realFetch = globalThis.fetch;

const report: DoctorReport = {
  at: '2026-09-01T12:00:00.000Z',
  vault: '/tmp/vault',
  verdict: 'warnings',
  summary: '2 warnings — git first',
  findings: [
    { check: 'root-config', severity: 'ok', message: '/tmp/vault — marked config' },
    { check: 'git', severity: 'warn', message: 'not a git repository — no history of your vault', fix: 'git -C /tmp/vault init' },
    { check: 'consistency', severity: 'warn', message: '1 possible divergence across 21 standard/library pairs', detail: 'non-solicitation: standard accepts 12–18 months, library Minimum Acceptable says 6 months — align or document\nlaw floors are not compared mechanically', paths: ['practice/standards/non-solicitation.md'] },
  ],
};

let calls = 0;
let fail = false;

beforeEach(() => {
  calls = 0;
  fail = false;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/doctor') {
      calls += 1;
      if (fail) return new Response(JSON.stringify({ error: 'internal error' }), { status: 500, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify(report), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('DoctorLedger', () => {
  test('nothing runs until asked; the ledger shows check, severity as set text, message, detail and fix; the verdict closes it', async () => {
    render(<DoctorLedger />);
    expect(calls).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Check the vault' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Vault health' })).toBeTruthy());
    expect(calls).toBe(1);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.querySelector('.v2-doctor-severity')?.textContent).toBe('ok');
    expect(rows[0]!.querySelector('.v2-doctor-severity')?.className).toContain('v2-doctor-ok');
    expect(rows[1]!.querySelector('.v2-doctor-fix')?.textContent).toBe('fix: git -C /tmp/vault init');
    expect(rows[2]!.querySelector('.v2-doctor-detail')?.textContent).toContain('non-solicitation');
    // No pill anywhere.
    expect(document.querySelector('.v2-pill')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('2 warnings — git first');
    expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
  });

  test('a failed check says so and keeps the button', async () => {
    fail = true;
    render(<DoctorLedger />);
    await userEvent.click(screen.getByRole('button', { name: 'Check the vault' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Check the vault' })).toBeTruthy();
  });
});
