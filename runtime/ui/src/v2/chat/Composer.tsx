import { useEffect, useRef, useState } from 'react';
import type { ThreadPolicy, Health } from '../../api/types';
import { withAttachments } from '../home/home';
import { carriesFiles, droppedFiles, intake, type IntakeStatus } from '../intake';
import { PolicyNotice, ProviderNotice } from '../ProviderNotice';

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
  /** For the swap notice above the box (cou-95): shown only when the saved
   * default is not loaded, so the reader learns which model will answer
   * BEFORE sending. Absent = no notice. */
  health?: Health | null;
  /** The thread's privacy policy (providers spec §7): when the matter stays
   * local, the line above the box names the local model that answers. */
  policy?: ThreadPolicy | null;
  /** The thread's EXPLICIT matter, for the line above the box and for where
   * a dropped document lands. Absent or `null`: drops go to the inbox. */
  matter?: { path: string; title: string } | null;
  /** The folder a dropped Word document is uploaded into (the matter's
   * folder). Undefined = the inbox. */
  dropDest?: string;
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
export function Composer({ streaming, disabled = false, onSend, onStop, seed, onSeedUsed, health, policy = null, matter = null, dropDest }: ComposerProps): JSX.Element {
  const [message, setMessage] = useState('');
  /** Vault paths riding along with the message — a dropped document lands
   * here as a chip, the way Home's "attach from vault" chips do. */
  const [attached, setAttached] = useState<string[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [status, setStatus] = useState<IntakeStatus | null>(null);
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

  const full = withAttachments(message, attached);
  const send = (): void => {
    if (full === '' || streaming || disabled) return;
    onSend(full);
    setMessage('');
    setAttached([]);
    setStatus(null);
  };

  /** A drop: one Word document into the matter's folder (or the inbox),
   * then its path as a chip. The drag counter survives the enter/leave
   * pairs a child element fires. */
  const onDrop = (event: React.DragEvent): void => {
    event.preventDefault();
    setDragDepth(0);
    void intake(droppedFiles(event.dataTransfer), dropDest, setStatus).then(up => {
      if (up !== null) setAttached(current => (current.includes(up.path) ? current : [...current, up.path]));
    });
  };
  const dragging = dragDepth > 0;

  return (
    <form
      className="v2-composer"
      onSubmit={event => {
        event.preventDefault();
        send();
      }}
    >
      <PolicyNotice health={health} policy={policy} />
      <ProviderNotice health={health} />
      {matter === null ? null : (
        <p className="v2-composer-matter">
          <span className="v2-tag">Matter</span>
          <span className="v2-composer-matter-title">{matter.title}</span>
          <span className="muted">· dropped files go into this matter's folder</span>
        </p>
      )}
      <div
        className={dragging ? 'v2-composer-box v2-dragging' : 'v2-composer-box'}
        onDragEnter={event => {
          if (!carriesFiles(event.dataTransfer)) return;
          event.preventDefault();
          setDragDepth(d => d + 1);
        }}
        onDragOver={event => {
          if (carriesFiles(event.dataTransfer)) event.preventDefault();
        }}
        onDragLeave={() => setDragDepth(d => Math.max(0, d - 1))}
        onDrop={onDrop}
      >
        {dragging ? (
          <div className="v2-drop" aria-hidden="true">
            <em>Drop a Word document to add it to the matter</em>
          </div>
        ) : null}
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
          {attached.map(path => (
            <button
              type="button"
              key={path}
              className="v2-ask-chip v2-ask-attached"
              aria-label={`Remove ${path}`}
              onClick={() => setAttached(current => current.filter(p => p !== path))}
            >
              {path}
            </button>
          ))}
          <span className="v2-composer-hint muted">⌘⏎ to send</span>
          {streaming ? (
            <button type="button" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button type="submit" className="v2-primary" disabled={disabled || full === ''}>
              Send
            </button>
          )}
        </div>
      </div>
      {status === null ? null : (
        <p className={status.kind === 'error' ? 'v2-intake v2-intake-error' : 'v2-intake'} role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.text}
        </p>
      )}
    </form>
  );
}
