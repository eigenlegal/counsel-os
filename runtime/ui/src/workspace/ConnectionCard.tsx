import { useState, type FormEvent } from 'react';
import { request, type ConnectionConfig, type ConnectionStatus } from './api';
import { Badge, ErrorNotice } from './components';
import type { ClaudeBilling } from '../../../src/workspace/claude-code';
import { ModelField } from './ModelPicker';
import { ConnectionSetup, ConnectionTest } from './ConnectionSetup';

const defaults = {
  'claude-code': 'sonnet',
  codex: 'gpt-5.6-sol',
  'anthropic-api': 'claude-sonnet-5',
  'openai-api': 'gpt-5.6-sol',
};
export function ConnectionCard({
  status,
  onChanged,
  desktop = false,
}: {
  status: ConnectionStatus;
  onChanged: () => void;
  desktop?: boolean;
}): JSX.Element {
  const [kind, setKind] = useState<ConnectionConfig['kind']>(status.config?.kind ?? 'codex');
  const [model, setModel] = useState(status.config?.model ?? defaults.codex);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [billing, setBilling] = useState<ClaudeBilling>(
    status.config?.claudeBilling ?? 'subscription',
  );
  const unsaved = !status.config || status.config.kind !== kind || status.config.model !== model || !!key ||
    (kind === 'claude-code' && (status.config.claudeBilling ?? 'subscription') !== billing);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await request('/connection', {
        kind,
        model,
        ...(key ? { apiKey: key } : {}),
        ...(kind === 'claude-code' ? { claudeBilling: billing } : {}),
      });
      setKey('');
      setSaved(true);
      setCatalogRevision(value => value + 1);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section connection-card">
      <div className="section-heading">
        <div>
          <h2>Your AI connection</h2>
          <p>Use an account you already have. Follow the steps below; no API key is needed for a subscription.</p>
        </div>
        <Badge tone={status.ready ? 'green' : 'neutral'}>
          {status.ready ? 'Configured' : 'Not configured'}
        </Badge>
      </div>
      <form onSubmit={submit}>
        <h3 className="connection-stage">1. Choose your account</h3>
        <label>
          Account type
          <select
            aria-label="AI connection"
            value={kind}
            onChange={(e) => {
              const value = e.target.value as ConnectionConfig['kind'];
              setKind(value);
              setModel(defaults[value]);
              setKey('');
              setSaved(false);
              setError('');
            }}
          >
            <option value="codex">ChatGPT subscription (via Codex)</option>
            <option value="claude-code">{billing === 'api' ? 'Claude Console (via Claude Code)' : 'Claude subscription (via Claude Code)'}</option>
            <option value="anthropic-api">Anthropic API</option>
            <option value="openai-api">OpenAI API</option>
          </select>
        </label>
        {kind === 'claude-code' && (
          <details className="model-detail">
            <summary>Use Claude Console instead?</summary>
            <label>
              Claude Code billing
              <select
                aria-label="Claude Code billing"
                value={billing}
                onChange={(e) => {
                  setBilling(e.target.value as ClaudeBilling);
                  setSaved(false);
                }}
              >
                <option value="subscription">Claude subscription</option>
                <option value="api">Claude Console · API-billed</option>
              </select>
            </label>
            <p>
              {billing === 'subscription'
                ? 'Uses your Claude subscription sign-in. Included limits and usage-credit charges depend on your plan and model. A different sign-in method blocks the response; it does not trigger API fallback.'
                : 'Uses an API-billed sign-in managed by Claude Code. To select that account, run claude auth login --console in your terminal.'}
            </p>
          </details>
        )}
        {(kind === 'codex' || kind === 'claude-code') ? <ConnectionSetup key={`${kind}:${billing}`} kind={kind} billing={kind === 'codex' ? 'subscription' : billing}
          installed={kind === 'codex' ? status.codexInstalled : status.claudeInstalled} desktop={desktop} changed={onChanged} checked={() => setCatalogRevision(value => value + 1)} /> : <>
          <h3 className="connection-stage">2. Add your API key</h3>
          <p className="fine-print">API use is billed separately from a ChatGPT or Claude subscription. Choose a subscription above if that is how you want to connect.</p>
          <label>
            API key
            <input
              aria-label="API key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              placeholder={
                status.config?.kind === kind
                  ? 'Leave blank to keep the saved key'
                  : 'Paste your API key'
              }
            />
          </label>
        </>}
        <h3 className="connection-stage">3. Choose a model and save</h3>
        <p className="fine-print">{kind === 'codex' || kind === 'claude-code' ? 'Model choices load automatically; checking sign-in refreshes them.' : 'Save your API key below to load its model choices automatically.'} Your selected model stays unchanged. Listing models and saving do not send a prompt or verify model access.</p>
        <ModelField key={kind} kind={kind} value={model} onChange={value => { setModel(value); setSaved(false); }} disabled={busy}
          autoLoad={kind === 'codex' || kind === 'claude-code' || (status.config?.kind === kind && !key)} refreshKey={catalogRevision} />
        <details className="model-detail">
          <summary>Model and connection details</summary>
          <p>
            {kind === 'claude-code'
              ? 'A fresh restricted CLI run receives only the explicit chat context and Counsel OS tools. Ambient API keys, custom hooks, skills, and other MCP servers are not inherited. This connection uses the CLI’s saved local sign-in, not custom gateway or apiKeyHelper configurations.'
              : kind === 'codex'
                ? 'Official local Codex CLI. A new isolated agent session receives each explicit conversation context.'
                : `Official endpoint only: ${kind === 'anthropic-api' ? 'api.anthropic.com' : 'api.openai.com'}. Keys are kept in ${status.storage === 'keychain' ? 'macOS Keychain' : status.storage === 'libsecret' ? 'the system secret store' : 'a private local credentials file'}, separate from chat records.`}
          </p>
          {kind === 'claude-code' && <p>Claude Code may add account information, including your login email, to model context independently of Counsel OS. Turning off profile sharing does not remove that CLI context. Account information is not your document-author identity. Counsel OS does not collect or copy Claude login tokens.</p>}
          {kind === 'codex' && <p>This adapter requires file-backed CLI authentication and does not silently fall back to API billing. Fresh sessions share only a private sign-in cache so renewals can carry forward. Logging out or changing your CLI login takes precedence. Responses using this sign-in run one at a time.</p>}
        </details>
        <p className="connection-disclosure">
          Sending a message shares that conversation’s included history, matter summary, and
          retrieved or attached passages with the selected provider. Local storage does not mean
          local inference. Changing this setting applies to future responses, not responses already
          running.
        </p>
        {error && <ErrorNotice message={error} />}
        <div className="connection-submit">
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save connection'}
          </button>
          {saved && <span role="status">Saved. You can test it below or start a chat.</span>}
        </div>
      </form>
      <ConnectionTest config={status.config} pendingChanges={unsaved} />
      <p className="fine-print">
        Adapters are implemented but not yet live-qualified for legal work. Saving a connection does
        not test model access or spend credits. Checking local sign-in makes no model
        call.
      </p>
    </section>
  );
}
