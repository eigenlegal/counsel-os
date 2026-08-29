import { useState } from 'react';
import type { ProviderInfo } from '../api/types';

export interface ComposerProps {
  providers: ProviderInfo[];
  /** `/health`'s `default` — what a step uses when the picker is left alone. */
  defaultProvider: string;
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
  const [provider, setProvider] = useState(defaultProvider);

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
