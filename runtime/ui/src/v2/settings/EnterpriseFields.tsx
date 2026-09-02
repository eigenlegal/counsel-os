import { useState } from 'react';
import { ApiError, deleteProviderKey, setProviderFields } from '../../api/client';
import type { KeyState } from '../../api/types';
import type { VendorFieldRow } from '../vendors';

export interface EnterpriseFieldsProps {
  /** The provider id the credentials belong to (`bedrock/us.anthropic…`). */
  id: string;
  /** The vendor's name, for the labels. */
  vendorName: string;
  /** The vendor's field set (providers spec §3 step 5). */
  fields: VendorFieldRow[];
  /** The row's non-secret fields, as the form holds them. */
  extra: Record<string, string>;
  onExtraChange(name: string, value: string): void;
  /** The server-side messages for this row's fields, keyed by field name. */
  errors?: Record<string, string | undefined>;
  /** What the runtime reports: set in the app, from the environment, found
   * by the SDK's own chain, or absent. `undefined` while the row is unsaved. */
  keySet: KeyState | undefined;
  /** The vendor's setup page. */
  setup?: string;
  /** Where the runtime keeps secrets; `null` when it has no store. */
  where: 'keychain' | 'libsecret' | 'file' | null;
  /** The credentials changed on the server — the page re-reads its settings. */
  onChanged(): void;
  /** The row's control id prefix. */
  rowKey: string;
}

function whereWord(where: EnterpriseFieldsProps['where']): string {
  if (where === 'keychain') return 'your Keychain';
  if (where === 'libsecret') return 'your system keyring';
  return 'a file only you can read';
}

function statusWord(keySet: KeyState): string {
  if (keySet === true) return 'set';
  if (keySet === 'env') return 'from the environment';
  if (keySet === 'default-chain') return 'default credentials on this machine';
  return 'not set';
}

/**
 * An enterprise vendor's field set under its row (providers spec §3 step
 * 5): the non-secret fields as ordinary inputs the one Save writes to the
 * row, and the secret ones as masked inputs that go to the store in ONE
 * PUT — shown only while being typed, empty after save, never echoed by
 * anything the runtime returns. The state line reads `credentials · set ·
 * replace · remove`, or names the environment or the machine's own
 * credential chain when that is what the runtime found.
 */
export function EnterpriseFields({ id, vendorName, fields, extra, onExtraChange, errors = {}, keySet, setup, where, onChanged, rowKey }: EnterpriseFieldsProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plain = fields.filter(f => !f.secret);
  const secret = fields.filter(f => f.secret);
  const typed = secret.some(f => (values[f.name] ?? '').trim() !== '');

  const submit = async (): Promise<void> => {
    if (!typed) return;
    setBusy(true);
    setError(null);
    try {
      await setProviderFields(id, values);
      setValues({});
      setEditing(false);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      const body = err instanceof ApiError ? (err.body as { error?: string; issues?: Array<{ message: string }> } | null) : null;
      const issues = body?.issues?.map(i => i.message) ?? [];
      setError(issues.length > 0 ? issues.join(' ') : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await deleteProviderKey(id);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = (): void => {
    setValues({});
    setEditing(false);
    setError(null);
  };

  return (
    <div className="v2-enterprise" role="group" aria-label={`${vendorName} settings for ${id}`}>
      <div className="v2-provider-grid">
        {plain.map(f => (
          <div className="field" key={f.name}>
            <label htmlFor={`v2-${rowKey}-x-${f.name}`}>{f.label}</label>
            <input
              id={`v2-${rowKey}-x-${f.name}`}
              value={extra[f.name] ?? ''}
              placeholder={f.placeholder ?? ''}
              autoComplete="off"
              spellCheck={false}
              onChange={e => onExtraChange(f.name, e.target.value)}
            />
            {f.help === undefined ? null : (
              <p className="muted v2-field-help" role="note">
                {f.help}
              </p>
            )}
            {errors[f.name] === undefined ? null : (
              <p className="field-error v2-notice v2-notice-error" role="alert">
                {errors[f.name]}
              </p>
            )}
          </div>
        ))}
      </div>
      {keySet === undefined ? (
        <p className="v2-key muted" role="note">
          <span className="v2-tag">credentials</span> save the row, then paste the credentials here.
        </p>
      ) : where === null ? (
        <p className="v2-key muted" role="note">
          <span className="v2-tag">credentials</span> {statusWord(keySet)} · this runtime has no key store; set them in the environment.
        </p>
      ) : (
        <div className="v2-key">
          <p className="v2-key-line">
            <span className="v2-tag">credentials</span>
            <span className={keySet === true ? 'v2-key-state v2-key-set' : 'v2-key-state'}>{statusWord(keySet)}</span>
            {editing ? null : (
              <>
                {' · '}
                <button type="button" className="v2-link" onClick={() => setEditing(true)} disabled={busy}>
                  {keySet === true ? 'replace' : 'paste credentials'}
                </button>
                {keySet === true ? (
                  <>
                    {' · '}
                    <button type="button" className="v2-link" onClick={() => void remove()} disabled={busy}>
                      remove
                    </button>
                  </>
                ) : null}
                {setup === undefined ? null : (
                  <>
                    {' · '}
                    <a href={setup} target="_blank" rel="noreferrer">
                      how to set up {vendorName}
                    </a>
                  </>
                )}
              </>
            )}
          </p>
          {editing ? (
            <form
              className="v2-key-form v2-enterprise-form"
              onSubmit={event => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="v2-provider-grid">
                {secret.map(f => (
                  <div className="field" key={f.name}>
                    <label htmlFor={`v2-${rowKey}-s-${f.name}`}>{f.label}</label>
                    {f.name === 'serviceAccountJson' ? (
                      <textarea
                        id={`v2-${rowKey}-s-${f.name}`}
                        rows={4}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="paste the key file’s contents"
                        value={values[f.name] ?? ''}
                        onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                        disabled={busy}
                        className="v2-secret"
                      />
                    ) : (
                      <input
                        id={`v2-${rowKey}-s-${f.name}`}
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={f.required ? 'required' : 'optional'}
                        value={values[f.name] ?? ''}
                        onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                        disabled={busy}
                      />
                    )}
                    {f.help === undefined ? null : (
                      <p className="muted v2-field-help" role="note">
                        {f.help}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="v2-key-actions">
                <button type="submit" className="v2-ask-go" disabled={busy || !typed}>
                  Save credentials
                </button>
                <button type="button" className="v2-link" onClick={cancel} disabled={busy}>
                  cancel
                </button>
                <span className="muted v2-key-where">They go to {whereWord(where)} as one item; never to a file in your vault.</span>
              </div>
            </form>
          ) : null}
        </div>
      )}
      {error === null ? null : (
        <p className="v2-key-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
