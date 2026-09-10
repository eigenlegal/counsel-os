import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { ConnectionSetup, ConnectionTest } from './ConnectionSetup';
import { BackupCard } from './BackupCard';
import { DesktopUpdates } from './DesktopUpdates';
const originalFetch = globalThis.fetch, originalConfirm = window.confirm;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; window.confirm = originalConfirm; sessionStorage.clear(); });
test('opening setup never installs, signs in, or contacts the provider; native commands are fixed', async () => {
  let calls = 0; sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url: string, options: RequestInit) => { calls++; expect(String(url)).toEndWith('/connection/check-sign-in'); expect(JSON.parse(String(options.body))).toEqual({ kind: 'codex' }); return Response.json({ installed: true, loggedIn: false, billing: 'unknown', message: 'Please sign in.' }); }) as typeof fetch;
  render(<ConnectionSetup kind="codex" desktop changed={() => {}} />);
  expect(calls).toBe(0);
  fireEvent.click(screen.getByText('Install or sign in'));
  expect(screen.getByRole('link', { name: 'Open installation in Terminal' }).getAttribute('href')).toBe('counsel-desktop://install-codex');
  expect(calls).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Check local sign-in' }));
  await screen.findByText('Please sign in.'); expect(calls).toBe(1);
});
test('paid connection test requires explicit confirmation and sends only the selected configuration', async () => {
  let calls = 0; sessionStorage.setItem('counsel-os.token', 'fixture');
  const config = { kind: 'codex' as const, model: 'fixture' };
  globalThis.fetch = (async (_url: unknown, options: RequestInit) => { calls++; expect(JSON.parse(String(options.body))).toEqual({ choice: config, consent: true }); return Response.json({ message: 'Synthetic test passed.' }); }) as typeof fetch;
  render(<ConnectionTest config={config} />);
  window.confirm = () => false; fireEvent.click(screen.getByRole('button', { name: 'Test saved connection' })); expect(calls).toBe(0);
  window.confirm = () => true; fireEvent.click(screen.getByRole('button', { name: 'Test saved connection' }));
  await screen.findByText('Synthetic test passed.'); expect(calls).toBe(1);
});
test('desktop recovery does not send users to a development terminal', () => {
  render(<BackupCard desktop />); fireEvent.click(screen.getByText('Restore a separate workspace'));
  expect(screen.getByRole('link', { name: 'Restore workspace from backup' }).getAttribute('href')).toBe('counsel-desktop://restore');
  expect(screen.queryByText(/bun run workspace/)).toBeNull();
});
test('updates have an honest disabled state and make no automatic external check', async () => {
  const calls: string[] = []; sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url: string) => { calls.push(String(url)); return Response.json({ version: '0.1.0', build: 2, enabled: false }); }) as typeof fetch;
  render(<DesktopUpdates />); await screen.findByText('Counsel 0.1.0 · build 2');
  expect(calls).toEqual(['/api/workspace/updates']); expect(screen.queryByRole('button', { name: 'Check for updates' })).toBeNull();
});
test('an enabled update channel checks only on request and clearly reports no newer version', async () => {
  const calls: string[] = []; sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async (url: string) => {
    calls.push(String(url));
    return Response.json(String(url).endsWith('/check') ? null : { version: '0.1.0', build: 2, enabled: true });
  }) as typeof fetch;
  render(<DesktopUpdates />); await screen.findByRole('button', { name: 'Check for updates' });
  expect(calls).toEqual(['/api/workspace/updates']);
  fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
  await screen.findByText('You’re using the latest available build on this channel.');
  expect(calls).toEqual(['/api/workspace/updates', '/api/workspace/updates/check']);
  expect(screen.queryByRole('button', { name: 'Download verified installer' })).toBeNull();
});
