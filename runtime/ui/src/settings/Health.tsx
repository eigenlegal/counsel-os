import { signOut } from '../api/client';
import { dataLineOf } from '../v2/vendors';
import type { Health as HealthData, SettingsView } from '../api/types';

export interface HealthProps {
  /** `GET /health` — where the vault and the tenant come from. `null` while
   * the app is still loading it. */
  health: HealthData | null;
  /** `GET /settings.effective` — the runtime the registry actually produced. */
  effective: SettingsView['effective'];
  /** The registry file this runtime edits, so an operator who wants to hand-
   * edit it knows which one. */
  file: string;
  /** Where app-entered keys live (providers spec §5). */
  secrets?: SettingsView['secrets'];
}

/** The Keys fact in words a lawyer reads: where the keys are. */
export function keysInWords(secrets: SettingsView['secrets'] | undefined, file: string): string {
  if (secrets === undefined || secrets === null) return 'environment only — this runtime has no key store';
  if (secrets.where === 'keychain') return 'Keychain';
  if (secrets.where === 'libsecret') return 'system keyring (libsecret)';
  const dir = file.slice(0, file.lastIndexOf('/'));
  return `file (${dir}/secrets.json, readable only by you)`;
}

/**
 * What this runtime IS, read-only.
 *
 * Deliberately separate from the form below it. The form shows what was
 * configured; this shows what is running — and they differ, because the
 * built-in providers and `serve --fake` appear in no file. When a default
 * does not do what an operator expects, the difference between these two
 * blocks is the answer.
 */
/** `600000` reads as a phone number; a lawyer reads "10 minutes". */
export function timeoutInWords(ms: number): string {
  if (ms % 60_000 === 0) { const m = ms / 60_000; return `${m} minute${m === 1 ? '' : 's'}`; }
  if (ms % 1000 === 0) { const s = ms / 1000; return `${s} second${s === 1 ? '' : 's'}`; }
  return `${ms} ms`;
}

export function Health({ health, effective, file, secrets }: HealthProps): JSX.Element {
  return (
    <section className="settings-health">
      <h2>Runtime</h2>
      <p className="muted">What is actually running right now — the file above plus the built-ins. Read-only; when a setting does not seem to take, compare it against this.</p>
      <dl className="facts">
        <div className="fact">
          <dt>
            Vault
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>
            <code>{health === null ? '…' : health.vault}</code>
          </dd>
        </div>
        <div className="fact">
          <dt>
            Tenant
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>{health === null ? '…' : health.tenant}</dd>
        </div>
        <div className="fact">
          <dt>
            Config file
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>
            <code>{file}</code>
          </dd>
        </div>
        <div className="fact">
          <dt>
            Default
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>{effective.default === null ? <span className="muted">none — no provider resolves</span> : <code>{effective.default}</code>}</dd>
        </div>
        <div className="fact">
          <dt>
            Step timeout
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>{timeoutInWords(effective.stepTimeoutMs)}</dd>
        </div>
        <div className="fact">
          <dt>
            Keys
            <span className="leader" aria-hidden="true" />
          </dt>
          <dd>{keysInWords(secrets, file)}</dd>
        </div>
      </dl>

      <p className="muted settings-signout">
        This browser is signed in to the runtime and stays so across tabs and restarts.{' '}
        <button type="button" className="v2-link" onClick={() => void signOut()}>
          Sign out of this browser
        </button>
        {' '}— other browsers keep their sign-in; start the runtime with <code>--new-token</code> to sign everyone out.
      </p>

      <h3 className="runin">Providers</h3>
      {effective.providers.length === 0 ? (
        <p className="muted">No providers are loaded.</p>
      ) : (
        <table className="providers-table">
          <thead>
            <tr>
              <th scope="col">Id</th>
              <th scope="col">Kind</th>
              <th scope="col">Auth</th>
              <th scope="col">Data</th>
              <th scope="col">Context</th>
            </tr>
          </thead>
          <tbody>
            {effective.providers.map(p => (
              <tr key={p.id}>
                <td>
                  <code>{p.id}</code>
                </td>
                <td>{p.kind}</td>
                <td>{p.auth}</td>
                <td className="providers-data">{dataLineOf(p, p.id)?.text ?? '—'}</td>
                <td>{p.capabilities.contextTokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
