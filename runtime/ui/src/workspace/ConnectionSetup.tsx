import { useEffect, useRef, useState } from 'react';
import { request, type ConnectionConfig } from './api';
import type { LocalSignIn } from '../../../src/workspace/connection-setup';
import { ErrorNotice } from './components';

export function ConnectionSetup({ kind, billing = 'subscription', desktop = false, installed, changed, checked }: {
  kind: 'codex' | 'claude-code'; billing?: 'subscription' | 'api'; desktop?: boolean; installed?: boolean; changed: () => void; checked?: () => void;
}) {
  const [result, setResult] = useState<LocalSignIn | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [copied, setCopied] = useState('');
  const abort = useRef<AbortController>();
  useEffect(() => { setResult(null); setError(''); setCopied(''); setBusy(false); return () => abort.current?.abort(); }, [kind, billing]);
  const name = kind === 'codex' ? 'Codex' : 'Claude Code';
  const account = kind === 'codex' ? 'ChatGPT' : billing === 'api' ? 'Claude Console' : 'Claude';
  const found = result?.installed ?? installed;
  const matched = result?.loggedIn && result.billing === billing;
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
    try { const value = await request<LocalSignIn>('/connection/check-sign-in', { kind }, controller.signal); if (!controller.signal.aborted) { setResult(value); checked?.(); changed(); } }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="connection-setup">
    <h3 className="connection-stage">2. Connect your {account} account</h3>
    <p>Counsel OS uses {name}, the provider’s command-line app, to access your {billing === 'api' ? 'Console account' : 'subscription'}. A browser or desktop-app login alone may not be enough.{billing === 'subscription' && ' You do not need to create or paste an API key.'}</p>
    <div className="connection-setup-heading"><strong>{found ? `${name} is installed` : found === false ? `Install ${name} to continue` : `Check whether ${name} is ready`}</strong><button type="button" className="button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking…' : 'Check local sign-in'}</button></div>
    <p>Already use {name}? Check your saved sign-in first. This makes no model call.</p>
    {result && <p role="status">{result.message}{result.loggedIn && result.billing !== billing ? ' The sign-in does not match your selected billing method.' : ''}</p>}
    {matched ? <p className="connection-next">Your local sign-in matches. Next, choose a model and save below. Model access has not been tested.</p> : <div className="connection-next">
      <strong>{found ? `Sign in with ${account}` : `Install, then sign in with ${account}`}</strong>
      <p>{desktop ? 'The buttons below open Terminal after you confirm. ' : 'Open the commands below and run them in Terminal. '}
        {found ? '' : `Finish the ${name} installation, then start sign-in. `}Complete the provider’s browser sign-in using your {account} account{billing === 'subscription' ? ', not an API account' : ''}. Return here and click Check local sign-in.</p>
      {desktop && <div className="connection-next-actions">{!found && <a className="button" href={`counsel-desktop://install-${kind}`}>Open installation in Terminal</a>}
        <a className="button" href={`counsel-desktop://login-${kind}${kind === 'claude-code' && billing === 'api' ? '-api' : ''}`}>Open sign-in in Terminal</a></div>}
      <p className="fine-print">Sign-in can change the account used by other projects. Nothing installs or signs in just by opening this page.</p>
    </div>}
    <details><summary>Commands and troubleshooting</summary>
      <p>Installation downloads and runs {name}’s official installer. If sign-in succeeds but Counsel OS cannot find it, use this exact sign-in command and check again.{kind === 'codex' && ' It selects the file-backed login required by Counsel OS.'}</p>
      <div className="connection-command"><strong>Install if needed</strong><code>{install}</code><button type="button" className="button" onClick={() => void copy(install, 'Installation command copied')}>Copy installation command</button>
        </div>
      <div className="connection-command"><strong>Sign in</strong><code>{login}</code><button type="button" className="button" onClick={() => void copy(login, 'Sign-in command copied')}>Copy sign-in command</button>
        </div>
      <p>Cancel with Control-C in Terminal. Existing tools are not automatically reinstalled and Counsel OS never logs sign-in output. <a href={docs} target="_blank" rel="noreferrer">Official {name} instructions</a></p>
      {copied && <p role="status">{copied}. Paste it in Terminal.</p>}
    </details>
    {error && <ErrorNotice message={error} />}
  </div>;
}

export function ConnectionTest({ config, pendingChanges = false }: { config: ConnectionConfig | null; pendingChanges?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const abort = useRef<AbortController>();
  useEffect(() => { setMessage(''); setError(''); setBusy(false); return () => abort.current?.abort(); }, [config?.kind, config?.model, config?.claudeBilling, pendingChanges]);
  async function test() {
    if (!config || pendingChanges || !window.confirm(`Send a small test prompt using ${config.kind} / ${config.model}${config.claudeBilling ? ` / ${config.claudeBilling}` : ''}? This uses your account limits or credits. No workspace content is sent.`)) return;
    const controller = new AbortController(); abort.current = controller; setBusy(true); setMessage(''); setError('');
    try { const result = await request<{ message: string }>('/connection/test', { choice: config, consent: true }, controller.signal); if (!controller.signal.aborted) setMessage(result.message); }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="connection-test"><h3 className="connection-stage">4. Test your connection <small>Optional</small></h3>
    <p>{pendingChanges ? 'Save your choices above before testing them.' : `Test the saved connection${config ? `: ${config.kind} / ${config.model}` : ''}.`} This optional model call uses your account limits or credits; it sends no practice content.</p>
    <button type="button" className="button" disabled={!config || pendingChanges || busy} onClick={() => void test()}>{busy ? 'Testing saved connection…' : 'Test saved connection'}</button>
    {busy && <button type="button" className="button" onClick={() => { abort.current?.abort(); setBusy(false); setMessage('Test cancelled. Any usage already incurred still applies.'); }}>Cancel test</button>}
    {message && <p role="status">{message}</p>}{error && <ErrorNotice message={error} />}
  </div>;
}
