import { useEffect, useRef, useState } from 'react';
import type { ProviderInfo } from '../../api/types';

/** A prefill pushed in from outside — the vault's "Ask counsel about this
 * file" (spec §3.4). The nonce distinguishes two asks about the same file. */
export interface ComposerSeed {
  text: string;
  nonce: number;
}

export interface ComposerProps {
  providers: ProviderInfo[];
  /** `/health`'s `default`; `null` or an id no loaded provider answers to
   * when the saved default names a provider this runtime did not load. */
  defaultProvider: string | null;
  streaming: boolean;
  disabled?: boolean;
  onSend: (message: string, provider: string) => void;
  onStop: () => void;
  /** A prefill from another surface. Applied ONCE per nonce, so what the
   * reader types after it survives every re-render. */
  seed?: ComposerSeed;
  /** Fired the moment a seed is applied, so the surface that pushed it can
   * drop it — a seed still in the parent's state would refill the box on the
   * next remount. */
  onSeedUsed?: () => void;
}

/**
 * The message box and the model picker. ⌘⏎ / Ctrl⏎ sends; Enter makes a
 * paragraph. The picker is seeded from the LOADED providers, never blindly
 * from the saved default (the step-4 fix): a default naming an unloaded
 * provider falls back to the first loaded one, and the swap is said.
 */
export function Composer({ providers, defaultProvider, streaming, disabled = false, onSend, onStop, seed, onSeedUsed }: ComposerProps): JSX.Element {
  const [message, setMessage] = useState('');
  // Derived-from-props during render (React's own pattern), not an effect:
  // an effect would paint the empty box first and steal a keystroke typed
  // in between.
  const [seenSeed, setSeenSeed] = useState(0);
  if (seed !== undefined && seed.nonce !== seenSeed) {
    setSeenSeed(seed.nonce);
    // A seed never destroys typing: an empty box takes the prefill whole, a
    // box with something in it gets it on a new line underneath.
    setMessage(current => (current.trim() === '' ? seed.text : `${current}\n${seed.text}`));
  }
  const usedRef = useRef(onSeedUsed);
  usedRef.current = onSeedUsed;
  useEffect(() => {
    if (seenSeed !== 0) usedRef.current?.();
  }, [seenSeed]);
  const fallback = providers[0]?.id ?? '';
  const defaultLoaded = providers.some(p => p.id === defaultProvider);
  const [provider, setProvider] = useState(defaultLoaded ? (defaultProvider as string) : fallback);
  const swapped = !defaultLoaded && defaultProvider !== null && defaultProvider !== '' && fallback !== '';

  const send = (): void => {
    const trimmed = message.trim();
    if (trimmed === '' || streaming || disabled) return;
    onSend(trimmed, provider);
    setMessage('');
  };

  return (
    <form
      className="v2-composer"
      onSubmit={event => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        aria-label="Message"
        placeholder="Ask counsel…"
        rows={3}
        value={message}
        disabled={streaming || disabled}
        onChange={event => setMessage(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      {swapped ? (
        <p className="v2-notice v2-notice-warn v2-composer-note" role="status">
          default <code>{defaultProvider}</code> is not loaded — using <code>{fallback}</code>
        </p>
      ) : null}
      <div className="v2-composer-actions">
        <label className="v2-composer-model">
          <span className="v2-label">Model</span>
          <select aria-label="Model" value={provider} disabled={streaming || disabled} onChange={event => setProvider(event.target.value)}>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.id}
                {p.id === defaultProvider ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>
        <span className="v2-composer-hint muted">⌘⏎ to send</span>
        {streaming ? (
          <button type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="submit" className="v2-primary" disabled={disabled || message.trim() === ''}>
            Send
          </button>
        )}
      </div>
    </form>
  );
}
