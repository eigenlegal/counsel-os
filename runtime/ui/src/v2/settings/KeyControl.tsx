import { useCallback, useEffect, useState } from 'react';
import { ApiError, deleteProviderKey, getProviderKeyState, setProviderKey } from '../../api/client';
import type { KeyState } from '../../api/types';

export interface KeyControlProps {
  /** The provider id the key belongs to (`google/gemini-2.5-pro`). */
  id: string;
  /** What the runtime reports for it: set in the app, from the
   * environment, or absent. `undefined` while the row is not saved yet. */
  keySet: KeyState | undefined;
  /** The vendor's page for getting a key, when it has one. */
  getKey?: string;
  /** Where the runtime keeps keys; `null` when it has no store. */
  where: 'keychain' | 'libsecret' | 'file' | null;
  /** The key changed on the server — the page re-reads its settings. */
  onChanged(): void;
}

function whereWord(where: KeyControlProps['where']): string {
  if (where === 'keychain') return 'your Keychain';
  if (where === 'libsecret') return 'your system keyring';
  return 'a file only you can read';
}

/**
 * One provider's key, as set text (providers spec §5): `key · set ·
 * replace · remove`, or `key · not set · paste a key`. The paste field
 * shows the value only while it is being typed; after save it is empty,
 * and nothing the runtime returns ever carries it.
 */
export function KeyControl({ id, keySet, getKey, where, onChanged }: KeyControlProps): JSX.Element | null {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `/settings` speaks only for LOADED providers, and one being set up has
  // no model yet, so `keySet` is absent for it. Ask the runtime directly:
  // guessing from what this component itself just did was a lie the moment
  // the block re-mounted — a key it had accepted read as "not set", with no
  // way offered to remove it.
  const [asked, setAsked] = useState<KeyState | undefined>(undefined);
  const unsaved = keySet === undefined;
  const reask = useCallback((): void => {
    if (!unsaved) return;
    void getProviderKeyState(id)
      .then(setAsked)
      .catch(() => setAsked(undefined));
  }, [id, unsaved]);
  useEffect(reask, [reask]);

  // It used to say "save the row, then paste the key here", which could not
  // be done: the row would not save without a model, and the vendor would
  // not list its models without the key. The key is filed under the
  // provider, so it can be pasted first — and it has to be, because it is
  // what makes the model list answer.
  const state = unsaved ? asked : keySet;
  if (where === null) {
    return (
      <p className="v2-key muted" role="note">
        <span className="v2-tag">key</span> {keySet === 'env' ? 'from the environment' : 'not set'} · this runtime has no key store; set it in the environment.
      </p>
    );
  }

  const submit = async (): Promise<void> => {
    const trimmed = value.trim();
    if (trimmed === '') return;
    setBusy(true);
    setError(null);
    try {
      await setProviderKey(id, trimmed);
      setValue('');
      setEditing(false);
      reask();
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await deleteProviderKey(id);
      reask();
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const isSet = state === true;
  const status = isSet ? 'set' : state === 'env' ? 'from the environment' : state === 'default-chain' ? 'from this machine' : 'not set';

  return (
    <div className="v2-key" role="group" aria-label={`Key for ${id.replace(/\/$/, "")}`}>
      <p className="v2-key-line">
        <span className="v2-tag">key</span>
        <span className={isSet ? 'v2-key-state v2-key-set' : 'v2-key-state'}>{status}</span>
        {editing ? null : (
          <>
            {' · '}
            <button type="button" className="v2-link" onClick={() => setEditing(true)} disabled={busy}>
              {isSet ? 'replace' : 'paste a key'}
            </button>
            {isSet ? (
              <>
                {' · '}
                <button type="button" className="v2-link" onClick={() => void remove()} disabled={busy}>
                  remove
                </button>
              </>
            ) : null}
            {getKey === undefined ? null : (
              <>
                {' · '}
                <a href={getKey} target="_blank" rel="noreferrer">
                  get a key
                </a>
              </>
            )}
          </>
        )}
      </p>
      {editing ? (
        <form
          className="v2-key-form"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            aria-label={`Paste the key for ${id.replace(/\/$/, "")}`}
            placeholder="paste the key"
            value={value}
            onChange={event => setValue(event.target.value)}
            disabled={busy}
          />
          <button type="submit" className="v2-ask-go" disabled={busy || value.trim() === ''}>
            Save
          </button>
          <button
            type="button"
            className="v2-link"
            onClick={() => {
              setValue('');
              setEditing(false);
              setError(null);
            }}
            disabled={busy}
          >
            cancel
          </button>
          <span className="muted v2-key-where">It goes to {whereWord(where)}; never to a file in your vault.</span>
        </form>
      ) : null}
      {error === null ? null : (
        <p className="v2-key-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
