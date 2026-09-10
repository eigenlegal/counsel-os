import { useEffect, useRef, useState } from 'react';
import { request, type ConnectionConfig } from './api';
import type { LocalSignIn } from '../../../src/workspace/connection-setup';
import { ErrorNotice } from './components';

export function ConnectionSetup({ kind, billing = 'subscription', desktop = false, changed }: {
  kind: 'codex' | 'claude-code'; billing?: 'subscription' | 'api'; desktop?: boolean; changed: () => void;
}) {
  const [result, setResult] = useState<LocalSignIn | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [copied, setCopied] = useState('');
  const abort = useRef<AbortController>();
  useEffect(() => { setResult(null); setError(''); setCopied(''); setBusy(false); return () => abort.current?.abort(); }, [kind, billing]);
  const name = kind === 'codex' ? 'Codex' : 'Claude Code';
  const install = kind === 'codex' ? 'curl -fsSL https://chatgpt.com/codex/install.sh | sh' : 'curl -fsSL https://claude.ai/install.sh | bash';
  const login = kind === 'codex' ? 'codex -c cli_auth_credentials_store=\'"file"\' login' : `claude auth login${billing === 'api' ? ' --console' : ''}`;
  const docs = kind === 'codex' ? 'https://learn.chatgpt.com/docs/codex/cli' : 'https://code.claude.com/docs/en/setup';
  async function copy(command: string, label: string) {
    try { await navigator.clipboard.writeText(command); setCopied(label); setError(''); }
    catch { setError('Select and copy the command below, then paste it in Terminal.'); }
  }
  async function check() {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(''); setResult(null);
    try { const value = await request<LocalSignIn>('/connection/check-sign-in', { kind }, controller.signal); if (!controller.signal.aborted) { setResult(value); changed(); } }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="connection-setup">
    <div className="connection-setup-heading"><strong>Connect {name}</strong><button type="button" className="button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking…' : 'Check local sign-in'}</button></div>
    {result && <p role="status">{result.message}{result.loggedIn && result.billing !== billing ? ' The sign-in does not match your selected billing method.' : ''}</p>}
    <p>Use your existing account. Checking sign-in makes no model call. After installing or signing in, return here and check again.</p>
    <details><summary>Install or sign in</summary>
      <p>Installation downloads and runs {name}’s official installer. Sign-in opens the provider’s own flow and can change the account used by other projects. Nothing runs just by opening this panel.</p>
      <div className="connection-command"><strong>Install if needed</strong><code>{install}</code><button type="button" className="button" onClick={() => void copy(install, 'Installation command copied')}>Copy installation command</button>
        {desktop && <a className="button" href={`counsel-desktop://install-${kind}`}>Open installation in Terminal</a>}</div>
      <div className="connection-command"><strong>Sign in</strong><code>{login}</code><button type="button" className="button" onClick={() => void copy(login, 'Sign-in command copied')}>Copy sign-in command</button>
        {desktop && <a className="button" href={`counsel-desktop://login-${kind}${kind === 'claude-code' && billing === 'api' ? '-api' : ''}`}>Open sign-in in Terminal</a>}</div>
      <p>Cancel with Control-C in Terminal. Existing tools are not automatically reinstalled and Counsel never logs sign-in output. <a href={docs} target="_blank" rel="noreferrer">Official {name} instructions</a></p>
      {copied && <p role="status">{copied}. Paste it in Terminal.</p>}
    </details>
    {error && <ErrorNotice message={error} />}
  </div>;
}

export function ConnectionTest({ config }: { config: ConnectionConfig | null }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const abort = useRef<AbortController>();
  useEffect(() => { setMessage(''); setError(''); setBusy(false); return () => abort.current?.abort(); }, [config?.kind, config?.model, config?.claudeBilling]);
  async function test() {
    if (!config || !window.confirm(`Send a small test prompt using ${config.kind} / ${config.model}${config.claudeBilling ? ` / ${config.claudeBilling}` : ''}? This uses your account limits or credits. No workspace content is sent.`)) return;
    const controller = new AbortController(); abort.current = controller; setBusy(true); setMessage(''); setError('');
    try { const result = await request<{ message: string }>('/connection/test', { choice: config, consent: true }, controller.signal); if (!controller.signal.aborted) setMessage(result.message); }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="connection-test"><p>Test the saved connection{config ? `: ${config.kind} / ${config.model}` : ''}. This optional model call uses your account limits or credits; it sends no practice content.</p>
    <button type="button" className="button" disabled={!config || busy} onClick={() => void test()}>{busy ? 'Testing saved connection…' : 'Test saved connection'}</button>
    {busy && <button type="button" className="button" onClick={() => { abort.current?.abort(); setBusy(false); setMessage('Test cancelled. Any usage already incurred still applies.'); }}>Cancel test</button>}
    {message && <p role="status">{message}</p>}{error && <ErrorNotice message={error} />}
  </div>;
}
