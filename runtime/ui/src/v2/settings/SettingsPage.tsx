import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { Health as HealthData, SettingsErrorBody, SettingsView } from '../../api/types';
import { Health } from '../../settings/Health';
import { ProviderCombo } from '../../settings/ProviderCombo';
import { ProviderTest } from '../../settings/ProviderTest';
import { dataLineFor, isEnterpriseVendor, makesLine, pickerLabel, prefixOf, searchVendors, vendorByPickerLabel, vendorFor } from '../vendors';
import { EnterpriseFields } from './EnterpriseFields';
import { KeyControl } from './KeyControl';
import { YourModels } from './YourModels';
import { ContentGroup } from './ContentGroup';
import { TASK_IDS } from '../../tasks';
import { DoctorLedger } from './DoctorLedger';
import { RetroAction } from './RetroAction';
import {
  emptyRoute,
  emptyRow,
  formFromRegistry,
  humanDuration,
  mapIssues,
  catalogRow,
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
  /** Runtime › "Run a retro": the shell opens the retro thread. */
  onStartRetro?: () => void;
}

/**
 * Settings, ordered by what the operator came to do (cou-84): the models you
 * have and the model each runs (Providers and models) → the exceptions (Task
 * routes) → how long an answer may take (Step timeout) — then Test, then
 * Runtime, read-only. Each group opens with a plain line saying what it is
 * for.
 *
 * The models and the default were two groups until the founder read the
 * page and could not tell what he had: one said "None added" while three
 * models were answering, and the other held an id he was expected to type.
 * Choosing is now an action on the row it belongs to.
 *
 * How the models SCORE, how each task routes, and what actually ran are not
 * settings: they are the operator's own view of the practice, and they live
 * on the Models page.
 */
export function SettingsPage({ health, onStartRetro }: SettingsPageProps): JSX.Element {
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
          <ContentGroup />
          <section className="v2-group">
            <Health health={health} effective={view.effective} file={view.file} secrets={view.secrets} />
            <DoctorLedger />
            <RetroAction onStart={onStartRetro} />
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

/**
 * The picker's options for a query.
 *
 * An empty box offers the whole catalog. A query that finds nothing offers
 * NOTHING — falling back to everything looked like thirty-odd matches: type
 * `gemini pro` (no vendor's text holds `pro`) and the list answered with
 * every vendor there is, as if all of them served it.
 */
function searchOptions(query: string): string[] {
  return searchVendors(query).map(pickerLabel);
}

function RegistryForm({ view, onSaved }: { view: SettingsView; onSaved(next: SettingsView): void }): JSX.Element {
  const [form, setForm] = useState<FormState>(() => seedDefault(formFromRegistry(view.registry), view));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The catalog picker's text (providers spec §3). */
  const [pick, setPick] = useState('');
  /** The provider whose key last changed, so its model list is re-asked. */
  const [relist, setRelist] = useState<{ prefix: string; n: number } | null>(null);

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
  /** One of an enterprise row's non-secret fields (providers spec §3 step 5). */
  const patchRowExtra = (index: number, name: string, value: string): void => {
    setForm(prev => ({ ...prev, providers: prev.providers.map((row, i) => (i === index ? { ...row, extra: { ...row.extra, [name]: value } } : row)) }));
    setSaved(false);
  };
  const patchRoute = (index: number, change: Partial<RouteRow>): void => {
    setForm(prev => ({ ...prev, routes: prev.routes.map((row, i) => (i === index ? { ...row, ...change } : row)) }));
    setSaved(false);
  };

  /** A key changed on the server (providers spec §5): re-read the settings
   * so `keySet` on the rows is current. Nothing in the form moves. */
  const refresh = async (): Promise<void> => {
    try {
      onSaved(await fetchJson<SettingsView>('/settings'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setGeneral([err instanceof Error ? err.message : String(err)]);
    }
  };

  /** True when the change reached the file. False when the page refused it
   * or the server did — the caller may have a field to put back. */
  const save = async (change: Partial<FormState> = {}): Promise<boolean> => {
    setSaved(false);
    // The change rides IN rather than through `setForm`: "use this one" is a
    // click that saves, and reading the default back out of state in the
    // same tick would save the old one.
    const edited = { ...form, ...change };
    const built = registryFromForm(edited);
    if (!built.ok) {
      // Never sent: these are the failures the page can see for itself. The
      // change does NOT go into the form either — "use this one" must not
      // leave the table showing a default that was never written.
      setErrors(built.errors);
      // A row's own message can sit inside a collapsed disclosure, so say it
      // here too, by the Save button, where it cannot be missed.
      setGeneral(['Nothing was saved. Correct the fields marked above.']);
      return false;
    }
    if (Object.keys(change).length > 0) setForm(edited);
    setErrors({});
    setGeneral([]);
    setBusy(true);
    try {
      // `undefined` drops out of the JSON — the file keeps having no default.
      const stillBuiltin = !fileHasDefault && edited.default.trim() !== '' && edited.default.trim() === (view.effective.default ?? '');
      const body = stillBuiltin ? { ...built.registry, default: undefined } : built.registry;
      const next = await fetchJson<SettingsView>('/settings', { method: 'PUT', body: JSON.stringify(body) });
      setForm(seedDefault(formFromRegistry(next.registry), next));
      setSaved(true);
      onSaved(next);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
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
    return false;
  };

  /** A saved row's base URL for a vendor, so a local runner's model list is
   * asked for at the address that row names rather than the preset. */
  const baseURLOf = (prefix: string): string | undefined => {
    const row = form.providers.find(r => prefixOf(r.id.trim()) === prefix && r.baseURL.trim() !== '');
    return row?.baseURL.trim();
  };

  /**
   * Run a provider on a different model.
   *
   * The id a provider is known by carries its model (`anthropic/claude-opus-5`),
   * so changing the model changes the id — and the id is named in up to three
   * places. All of them move together, or the default and the routes would go
   * on pointing at the model you just replaced.
   *
   * A built-in has no row in the file; overriding its model writes the first
   * one. The built-in stays loaded under its own id, which is what keeps a
   * task route that names it working.
   *
   * `oldId` comes from the block that was clicked. Deriving it here instead
   * — the first loaded model of the vendor — disagreed with the block
   * whenever the default was some OTHER model of the same vendor, and then
   * the default was left naming a model that had just been renamed away.
   */
  const pickModel = async (oldId: string, model: string): Promise<boolean> => {
    const newId = `${prefixOf(oldId)}/${model}`;
    if (newId === oldId) return true;
    // The ROW that is showing, not every row of the vendor: a practice with
    // both `openai/gpt-5.6` and `openai/gpt-4o-mini` would otherwise have
    // both rewritten to the same id, and the second row's own settings lost.
    const owned = form.providers.some(r => r.id.trim() === oldId);
    return await save({
      providers: owned
        ? form.providers.map(r => (r.id.trim() === oldId ? { ...r, id: newId } : r))
        : [...form.providers, { ...emptyRow(), id: newId }],
      routes: form.routes.map(r => (r.prefer.trim() === oldId ? { ...r, prefer: newId } : r)),
      ...(form.default.trim() === oldId ? { default: newId } : {}),
    });
  };

  /**
   * A provider's key, on its block.
   *
   * It used to sit in the raw row, under the fold, and said "save the row,
   * then paste the key" — which could not be done: the row would not save
   * without a model, and the vendor would not list models without the key.
   * The key is the FIRST thing a hosted provider needs, so it belongs where
   * the provider is.
   */
  const keyControlFor = (id: string): JSX.Element | null => {
    const vendor = vendorFor(prefixOf(id));
    if (vendor === undefined || vendor.connection !== 'API key') return null;
    const live = view.effective.providers.find(p => p.id === id);
    return (
      <KeyControl
        id={id}
        keySet={live === undefined ? undefined : (live.keySet ?? false)}
        {...(vendor.getKey === undefined ? {} : { getKey: vendor.getKey })}
        where={view.secrets === undefined || view.secrets === null ? null : view.secrets.where}
        onChanged={() => {
          setRelist(prev => ({ prefix: prefixOf(id), n: (prev?.n ?? 0) + 1 }));
          void refresh();
        }}
      />
    );
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
        <h2>Providers and models</h2>
        <p className="muted">
          The providers this runtime can call, and the model each one runs. Your Claude and ChatGPT subscriptions and a local Ollama model are set up
          already; add any others below. One key per provider — every model it sells opens with the same one.
        </p>
        <YourModels
          providers={view.effective.providers}
          defaultId={form.default}
          builtinDefault={showingBuiltin}
          busy={busy}
          baseURLOf={baseURLOf}
          onMakeDefault={id => void save({ default: id })}
          fileIds={new Set(form.providers.map(r => r.id.trim()))}
          // A provider you just added is not loaded yet, so nothing in
          // `effective` speaks for it. Its block comes from the form row.
          pendingIds={form.providers.map(r => r.id.trim()).filter(id => id !== '' && !effectiveIds.includes(id))}
          renderKey={group => keyControlFor(group.id)}
          relist={relist}
          onPickModel={pickModel}
        />
        <FieldError message={errors['default']} />
        {defaultIsKnown ? null : (
          <p className="v2-notice v2-notice-warn" role="status">
            No loaded model is called <code>{form.default.trim()}</code>. Saving will leave every step falling back to the router.
          </p>
        )}

        {/* One field over every vendor and preset — searched by NAME and by
            the families it serves, so "llama" and "gemini" find something.
            Picking prefills a row; nothing is saved until the one Save. */}
        <div className="v2-add-model">
          <h3 className="runin">Add a provider</h3>
          <div className="v2-add-provider-row">
            <ProviderCombo
              id="v2-add-provider"
              label="Search by maker or vendor"
              value={pick}
              options={searchOptions(pick)}
              placeholder="llama · gemini · a vendor's name"
              // The options ARE the search result; matching them against the
              // typed text again would hide every vendor found by a family
              // rather than by its own name, which is the point.
              filter={() => true}
              onChange={setPick}
            />
            <button
              type="button"
              disabled={vendorByPickerLabel(pick) === undefined}
              onClick={() => {
                const v = vendorByPickerLabel(pick);
                if (v === undefined) return;
                patch({ providers: [...form.providers, catalogRow(v)] });
                setPick('');
              }}
            >
              Add
            </button>
            <button type="button" className="v2-link" onClick={() => patch({ providers: [...form.providers, emptyRow()] })}>
              or add a blank row
            </button>
          </div>
          {(() => {
            const v = vendorByPickerLabel(pick);
            if (v === undefined) {
              const hits = searchVendors(pick).slice(0, 4);
              if (pick.trim() === '') return null;
              if (hits.length === 0) {
                return (
                  <p className="muted v2-add-provider-note" role="note">
                    Nothing matches <strong>{pick.trim()}</strong>. Search for a maker or a family — <em>llama</em>, <em>gemini</em>, <em>qwen</em> — or the
                    vendor you buy from. Any server that speaks the OpenAI API works from a blank row.
                  </p>
                );
              }
              return (
                <p className="muted v2-add-provider-note" role="note">
                  {hits.map(h => `${h.label ?? h.name}${makesLine(h, pick) === null ? '' : ` (${makesLine(h, pick)})`}`).join(' · ')}
                </p>
              );
            }
            return (
              <p className="muted v2-add-provider-note" role="note">
                {v.note === undefined ? null : <>{v.note} </>}
                {v.connection === 'API key' ? <>Add the row, save, then paste the key on it — it goes to your Keychain. </> : null}
                {v.connection === 'fields' ? <>Add the row, fill in its fields, save, then paste the credentials on it — they go to your Keychain as one item. </> : null}
                {v.getKey === undefined ? null : (
                  <a href={v.getKey} target="_blank" rel="noreferrer">
                    Get a key
                  </a>
                )}
                {v.setup === undefined ? null : (
                  <a href={v.setup} target="_blank" rel="noreferrer">
                    How to set up {v.name}
                  </a>
                )}
                {v.baseURLFields === undefined ? null : <> Fill in {v.baseURLFields.map(f => `{${f}}`).join(', ')} in the base URL.</>}
                {v.unverified === true ? <> The base URL was not verified against the vendor’s docs; check it.</> : null}
              </p>
            );
          })()}
        </div>

        {form.providers.length === 0 ? null : (
          <>
            <h3 className="runin v2-added-head">Rows you added</h3>
            <p className="muted">
              Saved to your providers file (its path is under Runtime, below). A key pasted on a row goes to your Keychain, never into the vault.
            </p>
          </>
        )}
        {form.providers.map((row, index) => {
          const rowVendor = vendorFor(prefixOf(row.id.trim()));
          const enterprise = isEnterpriseVendor(rowVendor);
          // A row nobody can fix is a row folded shut over its own error.
          const rowHasError = Object.keys(errors).some(key => key.startsWith(`providers.${index}.`));
          // The Id field leads the row when there is no vendor to name a
          // model for: a blank row folded its only usable control away, and
          // said "give it an id below" pointing at nothing.
          const idField = (
            <div className="field">
              <label htmlFor={`v2-${row.key}-id`}>Id</label>
              <input id={`v2-${row.key}-id`} value={row.id} placeholder="openai/gpt-5.6" onChange={e => patchRow(index, { id: e.target.value })} />
              <FieldError message={errors[`providers.${index}.id`]} />
            </div>
          );
          return (
          <div className="v2-provider" key={row.key}>
            {/* What this row IS, before what it is made of. The MODEL is
                not set here any more — it belongs to the provider block
                above, which is the one place a model gets chosen. What is
                left is the connection: where to reach it and how to sign
                in. */}
            <p className="v2-provider-head">
              <strong>{rowVendor?.label ?? rowVendor?.name ?? 'A model'}</strong>
              <span className="muted">
                {' — '}
                {row.id.trim() === '' ? 'name it below' : <code>{row.id.trim()}</code>}
              </span>
            </p>
            {rowVendor === undefined ? <div className="v2-provider-main">{idField}</div> : null}
            <details className="v2-provider-advanced" open={rowHasError}>
              <summary>the rest of this row</summary>
            <div className="v2-provider-grid">
              {rowVendor === undefined ? null : idField}
              <div className="field">
                <label htmlFor={`v2-${row.key}-baseurl`}>baseURL</label>
                <input id={`v2-${row.key}-baseurl`} value={row.baseURL} placeholder={enterprise ? 'optional — a private endpoint' : 'https://…'} onChange={e => patchRow(index, { baseURL: e.target.value })} />
                <FieldError message={errors[`providers.${index}.baseURL`]} />
              </div>
              {/* An enterprise vendor's credentials are fields, not one
                  variable; its field set below names the environment. */}
              {enterprise ? null : (
                <div className="field">
                  <label htmlFor={`v2-${row.key}-key`}>key variable (optional)</label>
                  <input id={`v2-${row.key}-key`} value={row.apiKeyEnv} placeholder="only for headless use" onChange={e => patchRow(index, { apiKeyEnv: e.target.value })} />
                  <FieldError message={errors[`providers.${index}.apiKeyEnv`]} />
                </div>
              )}
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
            </details>
            {/* Where this row's text goes (providers spec §6): from the id's
                prefix and, for an OpenAI-compatible server, its base URL. */}
            {(() => {
              const line = dataLineFor(row.id.trim(), row.baseURL.trim() === '' ? undefined : row.baseURL.trim());
              return line === null ? null : (
                <p className={line.locality === 'local' ? 'v2-provider-data v2-provider-data-local' : 'v2-provider-data'} role="note">
                  {line.text}
                  {line.termsUrl === null ? null : (
                    <>
                      {' · '}
                      <a href={line.termsUrl} target="_blank" rel="noreferrer">
                        their terms
                      </a>
                    </>
                  )}
                </p>
              );
            })()}
            {/* An enterprise vendor's field set (providers spec §3 step 5):
                the non-secret fields save with the row; the secret ones go
                to the store as one item, never through the form. */}
            {(() => {
              if (!isEnterpriseVendor(rowVendor)) return null;
              const id = row.id.trim();
              const live = view.effective.providers.find(p => p.id === id);
              const fieldErrors: Record<string, string | undefined> = {};
              for (const f of rowVendor.fields) fieldErrors[f.name] = errors[`providers.${index}.extra.${f.name}`];
              return (
                <EnterpriseFields
                  id={id}
                  rowKey={row.key}
                  vendorName={rowVendor.name}
                  fields={rowVendor.fields}
                  extra={row.extra}
                  onExtraChange={(name, value) => patchRowExtra(index, name, value)}
                  errors={fieldErrors}
                  keySet={live === undefined ? undefined : (live.keySet ?? false)}
                  {...(rowVendor.setup === undefined ? {} : { setup: rowVendor.setup })}
                  where={view.secrets === undefined || view.secrets === null ? null : view.secrets.where}
                  onChanged={() => void refresh()}
                />
              );
            })()}
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
          );
        })}
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
                  {/* The closed taxonomy as suggestions (routing-and-evals
                      spec §3); a typed name still goes through — the route
                      shape allows a custom task. */}
                  <ProviderCombo id={`v2-${row.key}-task`} label="Task" value={row.task} options={[...TASK_IDS]} placeholder="review" toggleLabel="Show tasks" onChange={value => patchRoute(index, { task: value })} />
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
          <span className="muted">Saves your models, the task routes and the step timeout together.</span>
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
