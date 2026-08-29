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
export function Health({ health, effective, file }: HealthProps): JSX.Element {
  return (
    <section className="settings-health">
      <h2>Runtime</h2>
      <dl className="facts">
        <dt>Vault</dt>
        <dd>
          <code>{health === null ? '…' : health.vault}</code>
        </dd>
        <dt>Tenant</dt>
        <dd>{health === null ? '…' : health.tenant}</dd>
        <dt>Config file</dt>
        <dd>
          <code>{file}</code>
        </dd>
        <dt>Default</dt>
        <dd>{effective.default === null ? <span className="muted">none — no provider resolves</span> : <code>{effective.default}</code>}</dd>
        <dt>Step timeout</dt>
        <dd>{effective.stepTimeoutMs} ms</dd>
      </dl>

      <h3>Providers</h3>
      {effective.providers.length === 0 ? (
        <p className="muted">No providers are loaded.</p>
      ) : (
        <table className="providers-table">
          <thead>
            <tr>
              <th scope="col">Id</th>
              <th scope="col">Kind</th>
              <th scope="col">Auth</th>
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
                <td>{p.capabilities.contextTokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
