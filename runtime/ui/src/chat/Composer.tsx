import { useState } from 'react';
import type { ProviderInfo } from '../api/types';

export interface ComposerProps {
  providers: ProviderInfo[];
  /** `/health`'s `default` — what a step uses when the picker is left alone.
   * `null`, or an id no loaded provider answers to, when the saved default
   * names a provider this runtime did not load: the registry accepts an id
   * you are about to add, and the router only complains at resolve time. */
  defaultProvider: string | null;
  streaming: boolean;
  disabled?: boolean;
  onSend: (message: string, provider: string) => void;
  /** Aborts the in-flight fetch. The server sees the hangup and marks the
   * run `abandoned` rather than leaving it `running` forever. */
  onStop: () => void;
}

/**
 * The message box and the provider picker. While a step is streaming the box
 * is disabled and "Send" becomes "Stop" — one step per thread at a time is
 * what the server enforces anyway (it serializes steps per thread), so
 * offering a second send would only queue a surprise.
 *
 * The picker is seeded from the LOADED providers, never blindly from the
 * saved default: a default naming a provider that is not loaded would leave
 * the state holding an id the server rejects (422 `unknown provider`) while
 * the `<select>` showed the first option — every Send failing for a reason
 * the page never explained. When that happens the first loaded provider is
 * used and the swap is said out loud.
 */
export function Composer({
  providers,
  defaultProvider,
  streaming,
  disabled = false,
  onSend,
  onStop,
}: ComposerProps): JSX.Element {
  const [message, setMessage] = useState('');
  const fallback = providers[0]?.id ?? '';
  const defaultLoaded = providers.some(p => p.id === defaultProvider);
  const [provider, setProvider] = useState(defaultLoaded ? (defaultProvider as string) : fallback);
  // Only worth saying when there IS a default and something to fall back to;
  // "no providers at all" is the Settings page's story, not the composer's.
  const swapped = !defaultLoaded && defaultProvider !== null && defaultProvider !== '' && fallback !== '';

  const send = (): void => {
    const trimmed = message.trim();
    if (trimmed === '' || streaming || disabled) return;
    onSend(trimmed, provider);
    setMessage('');
  };

  return (
    <form
      className="composer"
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
          // Enter makes a paragraph; a lawyer writes them. Cmd/Ctrl+Enter sends.
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      {swapped ? (
        <p className="notice notice-warning composer-note" role="status">
          default <code>{defaultProvider}</code> is not loaded — using <code>{fallback}</code>
        </p>
      ) : null}
      <div className="composer-actions">
        <label>
          <span className="label-text">Model</span>
          <select
            aria-label="Model"
            value={provider}
            disabled={streaming || disabled}
            onChange={event => setProvider(event.target.value)}
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.id}
                {p.id === defaultProvider ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>
        {streaming ? (
          <button type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={disabled || message.trim() === ''}>
            Send
          </button>
        )}
      </div>
    </form>
  );
}
