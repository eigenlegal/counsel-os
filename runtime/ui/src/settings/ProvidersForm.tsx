import { useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { SettingsErrorBody, SettingsView } from '../api/types';
import { ProviderTest } from './ProviderTest';
import {
  emptyRow,
  formFromRegistry,
  mapIssues,
  registryFromForm,
  type FieldErrors,
  type FormState,
  type ProviderRow,
  type Tri,
} from './registry-form';

export interface ProvidersFormProps {
  view: SettingsView;
  /** The saved view the server answered with. It is not the same object that
   * went in — `effective` is recomputed from the registry it just loaded —
   * so the page adopts the response rather than its own optimistic guess. */
  onSaved(next: SettingsView): void;
}

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: '', label: 'default' },
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
];

/**
 * `providers.yaml`, edited.
 *
 * The form is bound to `registry` — the FILE — and never to `effective`.
 * Those two are different things: `effective` includes the built-in
 * providers and anything `serve --fake` added, none of which are in the file,
 * and a form that round-tripped `effective` back through `PUT` would write
 * the built-ins into the operator's config as if they had asked for them.
 */
export function ProvidersForm({ view, onSaved }: ProvidersFormProps): JSX.Element {
  const [form, setForm] = useState<FormState>(() => formFromRegistry(view.registry));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // The one the runtime is running, which is not always the one in the file:
  // an unset `default` falls back to the built-in, and a default naming a
  // provider that failed to load resolves to something else entirely.
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
      // Never sent: these are the failures the page can see for itself, and
      // a round trip would only turn a precise message into a zod one.
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
        // 400 carries `issues` and they name their fields. 422 means the
        // registry parsed and then would not BUILD — "openai-compatible with
        // no baseURL" — which belongs to the whole file, not to one input.
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
    <section className="settings-form">
      <h2>Configuration</h2>
      <p className="muted">
        Edits <code>{view.file}</code>. Saving rebuilds the providers and the router in place — no restart.
      </p>

      {general.length === 0 ? null : (
        <div className="notice notice-error" role="alert">
          {general.map(message => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {saved ? (
        <p className="notice notice-ok" role="status">
          Saved.
        </p>
      ) : null}

      <form
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <label htmlFor="settings-default">Default provider</label>
          <input
            id="settings-default"
            list="settings-default-options"
            value={form.default}
            onChange={e => patch({ default: e.target.value })}
          />
          {/* A datalist, not a select: the default may legitimately name a
              provider that is not loaded right now — the one you are about to
              add — and a select could not express that. */}
          <datalist id="settings-default-options">
            {effectiveIds.map(id => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <FieldError message={errors['default']} />
          {defaultIsKnown ? null : (
            <p className="notice notice-warning" role="status">
              No loaded provider is called <code>{form.default.trim()}</code>. Saving will leave every step falling back
              to the router.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="settings-timeout">Step timeout (ms)</label>
          <input
            id="settings-timeout"
            type="number"
            min="1"
            step="1"
            value={form.stepTimeoutMs}
            placeholder={String(view.effective.stepTimeoutMs)}
            onChange={e => patch({ stepTimeoutMs: e.target.value })}
          />
          <FieldError message={errors['stepTimeoutMs']} />
        </div>

        <fieldset className="providers-fieldset">
          <legend>Providers</legend>
          {form.providers.length === 0 ? <p className="muted">None configured — the built-ins are still loaded.</p> : null}

          {form.providers.map((row, index) => (
            <div className="provider-row" key={row.key}>
              <div className="field">
                <label htmlFor={`p-${row.key}-id`}>Id</label>
                <input
                  id={`p-${row.key}-id`}
                  value={row.id}
                  placeholder="openai/gpt-5.6"
                  onChange={e => patchRow(index, { id: e.target.value })}
                />
                <FieldError message={errors[`providers.${index}.id`]} />
              </div>

              <div className="field">
                <label htmlFor={`p-${row.key}-baseurl`}>baseURL</label>
                <input
                  id={`p-${row.key}-baseurl`}
                  value={row.baseURL}
                  placeholder="https://…"
                  onChange={e => patchRow(index, { baseURL: e.target.value })}
                />
                <FieldError message={errors[`providers.${index}.baseURL`]} />
              </div>

              <div className="field">
                <label htmlFor={`p-${row.key}-key`}>apiKeyEnv</label>
                <input
                  id={`p-${row.key}-key`}
                  value={row.apiKeyEnv}
                  placeholder="OPENAI_API_KEY"
                  onChange={e => patchRow(index, { apiKeyEnv: e.target.value })}
                />
                <FieldError message={errors[`providers.${index}.apiKeyEnv`]} />
              </div>

              <div className="capabilities">
                <TriField
                  id={`p-${row.key}-tools`}
                  label="tools"
                  value={row.tools}
                  onChange={value => patchRow(index, { tools: value })}
                />
                <TriField
                  id={`p-${row.key}-caching`}
                  label="caching"
                  value={row.caching}
                  onChange={value => patchRow(index, { caching: value })}
                />
                <TriField
                  id={`p-${row.key}-thinking`}
                  label="thinking"
                  value={row.thinking}
                  onChange={value => patchRow(index, { thinking: value })}
                />
                <div className="field">
                  <label htmlFor={`p-${row.key}-context`}>contextTokens</label>
                  <input
                    id={`p-${row.key}-context`}
                    type="number"
                    min="1"
                    step="1"
                    value={row.contextTokens}
                    onChange={e => patchRow(index, { contextTokens: e.target.value })}
                  />
                  <FieldError message={errors[`providers.${index}.capabilities.contextTokens`]} />
                </div>
                <div className="field">
                  <label htmlFor={`p-${row.key}-auth`}>auth</label>
                  <select
                    id={`p-${row.key}-auth`}
                    value={row.auth}
                    onChange={e => patchRow(index, { auth: e.target.value as ProviderRow['auth'] })}
                  >
                    <option value="">default</option>
                    <option value="subscription">subscription</option>
                    <option value="apikey">apikey</option>
                    <option value="local">local</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="row-remove"
                onClick={() => {
                  patch({ providers: form.providers.filter((_, i) => i !== index) });
                  // Indices move when a row goes, so every keyed error is now
                  // pointing at the wrong row. Clearing them is the honest
                  // move: the next save recomputes them against the new list.
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
        </fieldset>

        <div className="field">
          <label htmlFor="settings-tasks">Task routes (JSON)</label>
          <textarea
            id="settings-tasks"
            rows={8}
            spellCheck={false}
            value={form.tasks}
            placeholder={'{\n  "review": { "prefer": "claude-sub/claude-opus-5" }\n}'}
            onChange={e => patch({ tasks: e.target.value })}
          />
          <FieldError message={errors['tasks']} />
        </div>

        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>

      <section className="provider-tests">
        <h3>Test a provider</h3>
        <p className="muted">
          Runs one real step on a scratch thread and reports what came back. Each test costs one model call.
        </p>
        {view.effective.providers.length === 0 ? (
          <p className="muted">Nothing to test — no provider is loaded.</p>
        ) : (
          <ul className="provider-test-list">
            {view.effective.providers.map(provider => (
              <li key={provider.id}>
                <code>{provider.id}</code>
                <ProviderTest providerId={provider.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function FieldError({ message }: { message?: string }): JSX.Element | null {
  if (message === undefined) return null;
  return (
    <p className="field-error notice notice-error" role="alert">
      {message}
    </p>
  );
}

function TriField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: Tri;
  onChange(value: Tri): void;
}): JSX.Element {
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
