import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { Health as HealthData, SettingsErrorBody, SettingsView } from '../../api/types';
import { Health } from '../../settings/Health';
import { ProviderCombo } from '../../settings/ProviderCombo';
import { ProviderTest } from '../../settings/ProviderTest';
import {
  emptyRow,
  formFromRegistry,
  mapIssues,
  registryFromForm,
  type FieldErrors,
  type FormState,
  type ProviderRow,
  type Tri,
} from '../../settings/registry-form';

export interface SettingsPageProps {
  health: HealthData | null;
}

/**
 * Settings, grouped (spec §2, "Settings page"): Default provider · Step
 * timeout · Providers · Task routes · Test — then Runtime, read-only.
 *
 * The Design group went with the classic design on 2026-08-30: there is one
 * design now, so there is nothing to switch between.
 */
export function SettingsPage({ health }: SettingsPageProps): JSX.Element {
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setView(await fetchJson<SettingsView>('/settings'));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  return (
    <div className="v2-settings">
      {error !== null ? (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      ) : view === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {/* Keyed on the file: a save replaces `registry`, and the form
              seeds its state from it once. */}
          <RegistryForm key={view.file} view={view} onSaved={setView} />
          <section className="v2-group">
            <h2>Test</h2>
            <p className="muted">Runs one real step on a scratch thread. Each test costs one model call.</p>
            {view.effective.providers.length === 0 ? (
              <p className="muted">Nothing to test — no provider is loaded.</p>
            ) : (
              <ul className="v2-test-list">
                {view.effective.providers.map(provider => (
                  <li key={provider.id}>
                    <code>{provider.id}</code>
                    <ProviderTest providerId={provider.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="v2-group">
            <Health health={health} effective={view.effective} file={view.file} />
          </section>
        </>
      )}
    </div>
  );
}

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: '', label: 'default' },
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];

/**
 * `providers.yaml`, edited.
 *
 * Bound to `registry` (the FILE) and never to `effective`, which also holds
 * the built-ins and anything `serve --fake` added: a form that round-tripped
 * `effective` back through `PUT` would write the built-ins into the
 * operator's config as if they had asked for them.
 */
function RegistryForm({ view, onSaved }: { view: SettingsView; onSaved(next: SettingsView): void }): JSX.Element {
  const [form, setForm] = useState<FormState>(() => formFromRegistry(view.registry));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // The one the runtime is running, which is not always the one in the file.
  const effectiveIds = view.effective.providers.map(p => p.id);
  const defaultIsKnown = form.default.trim() === '' || effectiveIds.includes(form.default.trim());

  const patch = (change: Partial<FormState>): void => {
    setForm(prev => ({ ...prev, ...change }));
    setSaved(false);
  };
  const patchRow = (index: number, change: Partial<ProviderRow>): void => {
    setForm(prev => ({ ...prev, providers: prev.providers.map((row, i) => (i === index ? { ...row, ...change } : row)) }));
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    setSaved(false);
    const built = registryFromForm(form);
    if (!built.ok) {
      // Never sent: these are the failures the page can see for itself.
      setErrors(built.errors);
      setGeneral([]);
      return;
    }
    setErrors({});
    setGeneral([]);
    setBusy(true);
    try {
      const next = await fetchJson<SettingsView>('/settings', { method: 'PUT', body: JSON.stringify(built.registry) });
      setForm(formFromRegistry(next.registry));
      setSaved(true);
      onSaved(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        const body = err.body as SettingsErrorBody | null;
        const mapped = mapIssues(body?.issues ?? []);
        setErrors(mapped.fields);
        setGeneral([...(body?.error === undefined ? [] : [body.error]), ...mapped.general]);
      } else {
        setGeneral([err instanceof Error ? err.message : String(err)]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    // `display: contents` — the groups below are the cards, so the form must
    // not become a box of its own between them and the page's column.
    <form
      className="v2-registry"
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="v2-group">
        <h2>Default provider</h2>
        <div className="field">
          <ProviderCombo
            id="v2-default"
            label="Default provider"
            value={form.default}
            options={effectiveIds}
            onChange={value => patch({ default: value })}
          />
          <FieldError message={errors['default']} />
          {defaultIsKnown ? null : (
            <p className="v2-notice v2-notice-warn" role="status">
              No loaded provider is called <code>{form.default.trim()}</code>. Saving will leave every step falling back to the router.
            </p>
          )}
        </div>
      </section>

      <section className="v2-group">
        <h2>Step timeout</h2>
        <div className="field">
          <label htmlFor="v2-timeout">Step timeout (ms)</label>
          <input
            id="v2-timeout"
            type="number"
            min="1"
            step="1"
            value={form.stepTimeoutMs}
            placeholder={String(view.effective.stepTimeoutMs)}
            onChange={e => patch({ stepTimeoutMs: e.target.value })}
          />
          <FieldError message={errors['stepTimeoutMs']} />
        </div>
      </section>

      <section className="v2-group">
        <h2>Providers</h2>
        <p className="muted">
          Edits <code>{view.file}</code>. The built-ins are always loaded and never written here.
        </p>
        {form.providers.length === 0 ? <p className="muted">None configured.</p> : null}
        {form.providers.map((row, index) => (
          <div className="v2-provider" key={row.key}>
            <div className="v2-provider-grid">
              <div className="field">
                <label htmlFor={`v2-${row.key}-id`}>Id</label>
                <input id={`v2-${row.key}-id`} value={row.id} placeholder="openai/gpt-5.6" onChange={e => patchRow(index, { id: e.target.value })} />
                <FieldError message={errors[`providers.${index}.id`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-baseurl`}>baseURL</label>
                <input id={`v2-${row.key}-baseurl`} value={row.baseURL} placeholder="https://…" onChange={e => patchRow(index, { baseURL: e.target.value })} />
                <FieldError message={errors[`providers.${index}.baseURL`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-key`}>apiKeyEnv</label>
                <input id={`v2-${row.key}-key`} value={row.apiKeyEnv} placeholder="OPENAI_API_KEY" onChange={e => patchRow(index, { apiKeyEnv: e.target.value })} />
                <FieldError message={errors[`providers.${index}.apiKeyEnv`]} />
              </div>
              <TriField id={`v2-${row.key}-tools`} label="tools" value={row.tools} onChange={value => patchRow(index, { tools: value })} />
              <TriField id={`v2-${row.key}-caching`} label="caching" value={row.caching} onChange={value => patchRow(index, { caching: value })} />
              <TriField id={`v2-${row.key}-thinking`} label="thinking" value={row.thinking} onChange={value => patchRow(index, { thinking: value })} />
              <div className="field">
                <label htmlFor={`v2-${row.key}-context`}>contextTokens</label>
                <input id={`v2-${row.key}-context`} type="number" min="1" step="1" value={row.contextTokens} onChange={e => patchRow(index, { contextTokens: e.target.value })} />
                <FieldError message={errors[`providers.${index}.capabilities.contextTokens`]} />
              </div>
              <div className="field">
                <label htmlFor={`v2-${row.key}-auth`}>auth</label>
                <select id={`v2-${row.key}-auth`} value={row.auth} onChange={e => patchRow(index, { auth: e.target.value as ProviderRow['auth'] })}>
                  <option value="">default</option>
                  <option value="subscription">subscription</option>
                  <option value="apikey">apikey</option>
                  <option value="local">local</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="v2-link v2-remove"
              onClick={() => {
                patch({ providers: form.providers.filter((_, i) => i !== index) });
                setErrors({});
              }}
            >
              Remove provider {index + 1}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => patch({ providers: [...form.providers, emptyRow()] })}>
          Add provider
        </button>
      </section>

      <section className="v2-group">
        <h2>Task routes</h2>
        <div className="field">
          <label htmlFor="v2-tasks">Task routes (JSON)</label>
          <textarea
            id="v2-tasks"
            rows={8}
            spellCheck={false}
            value={form.tasks}
            placeholder={'{\n  "review": { "prefer": "claude-sub/claude-opus-5" }\n}'}
            onChange={e => patch({ tasks: e.target.value })}
          />
          <FieldError message={errors['tasks']} />
        </div>
      </section>

      {/* One Save for the whole form, below every card it writes. Inside the
          last group it read as "save the routes", which is three quarters of
          a lie: the PUT carries the default, the timeout, the providers and
          the routes together. The notices live here too, beside the button
          that produced them. */}
      <footer className="v2-save">
        {general.length === 0 ? null : (
          <div className="v2-notice v2-notice-error" role="alert">
            {general.map(message => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
        {saved ? (
          <p className="v2-notice v2-notice-ok" role="status">
            Saved. The providers and the router were rebuilt in place.
          </p>
        ) : null}
        <div className="v2-save-row">
          <button type="submit" className="v2-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <span className="muted">Saves Default provider, Step timeout, Providers and Task routes together.</span>
        </div>
      </footer>
    </form>
  );
}

function FieldError({ message }: { message?: string }): JSX.Element | null {
  if (message === undefined) return null;
  return (
    <p className="field-error v2-notice v2-notice-error" role="alert">
      {message}
    </p>
  );
}

function TriField({ id, label, value, onChange }: { id: string; label: string; value: Tri; onChange(value: Tri): void }): JSX.Element {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value as Tri)}>
        {TRI_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
