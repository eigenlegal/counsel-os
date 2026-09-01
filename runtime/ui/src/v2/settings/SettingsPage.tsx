import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { Health as HealthData, SettingsErrorBody, SettingsView } from '../../api/types';
import { Health } from '../../settings/Health';
import { ProviderCombo } from '../../settings/ProviderCombo';
import { ProviderTest } from '../../settings/ProviderTest';
import {
  emptyRoute,
  emptyRow,
  formFromRegistry,
  humanDuration,
  mapIssues,
  ollamaRow,
  openaiKeyRow,
  registryFromForm,
  unplacedTaskMessages,
  type FieldErrors,
  type FormState,
  type ProviderRow,
  type RouteRow,
  type Tri,
} from '../../settings/registry-form';

export interface SettingsPageProps {
  health: HealthData | null;
}

/** The subscription provider every install already has. Named here so the
 * guided start can point at it instead of adding a duplicate row. */
const CLAUDE_BUILTIN = 'claude-sub/claude-opus-5';

/**
 * Settings, ordered by what the operator came to do (cou-84): the models you
 * have (Providers) → the one that answers (Default provider) → the
 * exceptions (Task routes) → how long an answer may take (Step timeout) —
 * then Test, then Runtime, read-only. Each group opens with a plain line
 * saying what it is for.
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
            <p className="muted">Checks that a provider actually answers, by running one real step on a scratch thread. Each test costs one model call.</p>
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
/** The file may set no default; the field then STARTS on the runtime's
 * effective (built-in) default rather than blank (cou-93 item 3): a blank
 * field beside a Runtime panel that names one read as a bug. Save writes
 * it to the file only once the operator changes it — see `save`. */
function seedDefault(form: FormState, view: SettingsView): FormState {
  const effective = view.effective.default ?? '';
  if (form.default.trim() !== '' || effective === '') return form;
  return { ...form, default: effective };
}

function RegistryForm({ view, onSaved }: { view: SettingsView; onSaved(next: SettingsView): void }): JSX.Element {
  const [form, setForm] = useState<FormState>(() => seedDefault(formFromRegistry(view.registry), view));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // The one the runtime is running, which is not always the one in the file.
  const effectiveIds = view.effective.providers.map(p => p.id);
  const defaultIsKnown = form.default.trim() === '' || effectiveIds.includes(form.default.trim());
  /** The file sets no default and the field still shows the built-in one
   * it was seeded with. While that holds, Save leaves `default` OUT of the
   * PUT: the file must not acquire the built-in as if the operator had
   * asked for it. */
  const fileHasDefault = (view.registry.default ?? '').trim() !== '';
  const showingBuiltin = !fileHasDefault && form.default.trim() !== '' && form.default.trim() === (view.effective.default ?? '');

  const patch = (change: Partial<FormState>): void => {
    setForm(prev => ({ ...prev, ...change }));
    setSaved(false);
  };
  const patchRow = (index: number, change: Partial<ProviderRow>): void => {
    setForm(prev => ({ ...prev, providers: prev.providers.map((row, i) => (i === index ? { ...row, ...change } : row)) }));
    setSaved(false);
  };
  const patchRoute = (index: number, change: Partial<RouteRow>): void => {
    setForm(prev => ({ ...prev, routes: prev.routes.map((row, i) => (i === index ? { ...row, ...change } : row)) }));
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
      // `undefined` drops out of the JSON — the file keeps having no default.
      const body = showingBuiltin ? { ...built.registry, default: undefined } : built.registry;
      const next = await fetchJson<SettingsView>('/settings', { method: 'PUT', body: JSON.stringify(body) });
      setForm(seedDefault(formFromRegistry(next.registry), next));
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

  // A `tasks.*` message with no row to sit on still has to be shown; it
  // joins the general notices by the Save button.
  const orphanedTaskMessages = unplacedTaskMessages(errors, form.routes);

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
        <h2>Providers</h2>
        <p className="muted">
          The models this runtime can call. Your Claude subscription, your Codex subscription, and a local Ollama model are built in and always loaded. Add one here to use an API key, another local model, or a different endpoint. Edits <code>{view.file}</code>; the built-ins are never written there.
        </p>
        {form.providers.length === 0 ? <p className="muted">None added — the built-ins are doing all the work.</p> : null}
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
        {/* The guided starts (cou-84): each names a thing the operator is
            trying to do and prefills a row for it — nothing is saved until
            the one Save at the bottom. */}
        <div className="v2-guided-starts">
          {effectiveIds.includes(CLAUDE_BUILTIN) ? (
            <div className="v2-guided-start">
              <p>
                <strong>Claude subscription</strong>
                <span className="muted">
                  {' '}
                  — already loaded as <code>{CLAUDE_BUILTIN}</code>. There is nothing to add.
                </span>
              </p>
              {/* Hidden when it already IS the effective default — offering
                  to make the default the default reads as "it is not". */}
              {form.default.trim() === CLAUDE_BUILTIN ? null : (
                <button type="button" onClick={() => patch({ default: CLAUDE_BUILTIN })}>
                  Make it the default
                </button>
              )}
            </div>
          ) : null}
          <div className="v2-guided-start">
            <p>
              <strong>OpenAI API key</strong>
              <span className="muted"> — starts a row for <code>openai/gpt-5.6</code>. Put the key in the <code>OPENAI_API_KEY</code> environment variable before you start the runtime; the file stores the variable name, never the key.</span>
            </p>
            <button type="button" onClick={() => patch({ providers: [...form.providers, openaiKeyRow()] })}>
              Add OpenAI provider
            </button>
          </div>
          <div className="v2-guided-start">
            <p>
              <strong>Local Ollama model</strong>
              <span className="muted"> — starts a row for a model Ollama serves on this machine. Finish the id with the model name <code>ollama list</code> shows, for example <code>ollama/llama3.3</code>.</span>
            </p>
            <button type="button" onClick={() => patch({ providers: [...form.providers, ollamaRow()] })}>
              Add Ollama model
            </button>
          </div>
          <div className="v2-guided-start">
            <p>
              <strong>Something else</strong>
              <span className="muted"> — a blank row, for an Anthropic API key (<code>anthropic/…</code>) or an OpenAI-compatible endpoint (<code>openai-compatible/…</code> with a <code>baseURL</code>).</span>
            </p>
            <button type="button" onClick={() => patch({ providers: [...form.providers, emptyRow()] })}>
              Add provider
            </button>
          </div>
        </div>
      </section>

      <section className="v2-group">
        <h2>Default provider</h2>
        <p className="muted">The model that answers when nothing more specific applies. Every step runs on it, unless a task route below picks a different one.</p>
        <div className="field">
          <ProviderCombo
            id="v2-default"
            label="Default provider"
            value={form.default}
            options={effectiveIds}
            onChange={value => patch({ default: value })}
          />
          {showingBuiltin ? (
            <p className="muted" role="note">
              Built-in default — nothing is set in <code>{view.file}</code>. Pick a provider to write one.
            </p>
          ) : null}
          <FieldError message={errors['default']} />
          {defaultIsKnown ? null : (
            <p className="v2-notice v2-notice-warn" role="status">
              No loaded provider is called <code>{form.default.trim()}</code>. Saving will leave every step falling back to the router.
            </p>
          )}
        </div>
      </section>

      <section className="v2-group">
        <h2>Task routes</h2>
        <p className="muted">
          Optional. Send one kind of work to a particular model — keep privacy-sensitive steps on a local model, say, or long documents on a big-context one. A step that names a matching task uses that row&rsquo;s provider; everything else uses the default.
        </p>
        {form.routes.length === 0 ? <p className="muted">No routes — every step uses the default provider.</p> : null}
        {form.routes.map((row, index) => {
          const name = row.task.trim();
          const preferKnown = row.prefer.trim() === '' || effectiveIds.includes(row.prefer.trim());
          return (
            <div className="v2-provider" key={row.key}>
              <div className="v2-provider-grid">
                <div className="field">
                  <label htmlFor={`v2-${row.key}-task`}>Task</label>
                  <input id={`v2-${row.key}-task`} value={row.task} placeholder="review" onChange={e => patchRoute(index, { task: e.target.value })} />
                  <FieldError message={errors[`route.${row.key}.task`] ?? errors[`tasks.${name}`]} />
                </div>
                <div className="field">
                  <ProviderCombo
                    id={`v2-${row.key}-prefer`}
                    label="Provider"
                    value={row.prefer}
                    options={effectiveIds}
                    placeholder={view.effective.default ?? ''}
                    onChange={value => patchRoute(index, { prefer: value })}
                  />
                  <FieldError message={errors[`route.${row.key}.prefer`] ?? errors[`tasks.${name}.prefer`]} />
                </div>
                <TriField id={`v2-${row.key}-r-tools`} label="requires tools" value={row.tools} error={errors[`tasks.${name}.require.tools`]} onChange={value => patchRoute(index, { tools: value })} />
                <TriField id={`v2-${row.key}-r-caching`} label="requires caching" value={row.caching} error={errors[`tasks.${name}.require.caching`]} onChange={value => patchRoute(index, { caching: value })} />
                <TriField id={`v2-${row.key}-r-thinking`} label="requires thinking" value={row.thinking} error={errors[`tasks.${name}.require.thinking`]} onChange={value => patchRoute(index, { thinking: value })} />
                <div className="field">
                  <label htmlFor={`v2-${row.key}-r-context`}>min context (tokens)</label>
                  <input id={`v2-${row.key}-r-context`} type="number" min="1" step="1" value={row.contextTokens} onChange={e => patchRoute(index, { contextTokens: e.target.value })} />
                  <FieldError message={errors[`route.${row.key}.contextTokens`] ?? errors[`tasks.${name}.require.contextTokens`]} />
                </div>
                <div className="field">
                  <label htmlFor={`v2-${row.key}-remote`}>remote models</label>
                  <select id={`v2-${row.key}-remote`} value={row.remote} onChange={e => patchRoute(index, { remote: e.target.value as Tri })}>
                    <option value="">allowed (default)</option>
                    <option value="yes">allowed</option>
                    <option value="no">never — stay on this machine</option>
                  </select>
                  <FieldError message={errors[`tasks.${name}.allow_remote`]} />
                </div>
              </div>
              {preferKnown ? null : (
                <p className="v2-notice v2-notice-warn" role="status">
                  No loaded provider is called <code>{row.prefer.trim()}</code>. This route will fall back to the default.
                </p>
              )}
              <button
                type="button"
                className="v2-link v2-remove"
                onClick={() => {
                  patch({ routes: form.routes.filter((_, i) => i !== index) });
                  setErrors({});
                }}
              >
                Remove route {index + 1}
              </button>
            </div>
          );
        })}
        <button type="button" onClick={() => patch({ routes: [...form.routes, emptyRoute()] })}>
          Add route
        </button>
      </section>

      <section className="v2-group">
        <h2>Step timeout</h2>
        <p className="muted">How long one step — one model answer, including its tool calls — may run before the runtime cancels it and reports a timeout. Long documents can take a few minutes.</p>
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
          <TimeoutInWords value={form.stepTimeoutMs} effectiveMs={view.effective.stepTimeoutMs} />
        </div>
      </section>

      {/* One Save for the whole form, below every card it writes. Inside the
          last group it read as "save the routes", which is three quarters of
          a lie: the PUT carries the providers, the default, the routes and
          the timeout together. The notices live here too, beside the button
          that produced them. */}
      <footer className="v2-save">
        {general.length === 0 && orphanedTaskMessages.length === 0 ? null : (
          <div className="v2-notice v2-notice-error" role="alert">
            {[...general, ...orphanedTaskMessages].map(message => (
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
          <span className="muted">Saves Providers, Default provider, Task routes and Step timeout together.</span>
        </div>
      </footer>
    </form>
  );
}

/**
 * The timeout in words, because nobody thinks in milliseconds: the field
 * echoes "that is 2 minutes" for what was typed, or explains what the
 * runtime falls back to when the field is empty.
 */
function TimeoutInWords({ value, effectiveMs }: { value: string; effectiveMs: number }): JSX.Element | null {
  const raw = value.trim();
  if (raw === '') {
    const fallback = humanDuration(effectiveMs);
    return (
      <p className="muted" role="note">
        Not set — the runtime uses {effectiveMs.toLocaleString()} ms{fallback === '' ? '' : ` (${fallback})`}.
      </p>
    );
  }
  const words = humanDuration(Number(raw));
  if (words === '') return null;
  return (
    <p className="muted" role="note">
      That is {words}.
    </p>
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

function TriField({ id, label, value, error, onChange }: { id: string; label: string; value: Tri; error?: string; onChange(value: Tri): void }): JSX.Element {
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
      <FieldError message={error} />
    </div>
  );
}
