import { useEffect, useRef, useState } from 'react';

/** A prefill pushed in from outside — the vault's "Ask counsel about this
 * file" (spec §3.4). The nonce distinguishes two asks about the same file. */
export interface ComposerSeed {
  text: string;
  nonce: number;
}

export interface ComposerProps {
  streaming: boolean;
  disabled?: boolean;
  onSend: (message: string) => void;
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
 * One box (spec §3.3): the message, `⌘⏎ to send`, Send/Stop. ⌘⏎ / Ctrl⏎
 * sends; Enter makes a paragraph.
 *
 * The model picker is GONE from here — it lives in the rail footer, and the
 * chat sends on the runtime's default provider, which Settings owns. A
 * picker under every message asked the reader to make a choice they had
 * already made once, in the one place that remembers it.
 */
export function Composer({ streaming, disabled = false, onSend, onStop, seed, onSeedUsed }: ComposerProps): JSX.Element {
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

  const send = (): void => {
    const trimmed = message.trim();
    if (trimmed === '' || streaming || disabled) return;
    onSend(trimmed);
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
      <div className="v2-composer-box">
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
        <div className="v2-composer-actions">
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
      </div>
    </form>
  );
}
