import { useCallback, useEffect, useState } from 'react';
import { storeToken, tokenFromPaste } from '../api/token';

/**
 * How the reader starts the runtime today (CHANGELOG 0.10.0, roadmap §9).
 * There is no installed `counsel-os` binary yet — that is roadmap §9 — so
 * the page shows the source-checkout command rather than inventing one. One
 * place to change when the binary ships.
 */
export const SERVE_COMMAND = 'bun runtime/src/cli.ts serve --vault <your vault> --open';

/** What the probe found: the runtime answered (any status — a 401 is the
 * runtime saying "who are you", which is the whole question here), or
 * nothing is listening. `null` while the probe is in flight. */
export type Probe = 'up' | 'down' | null;

/**
 * Asks the runtime whether it is there, WITHOUT a token: the point is to
 * tell "your key is stale" from "nothing is running", and sending the
 * stale key would not change either answer while giving a log one more
 * copy of it. A plain `fetch`, not `client.ts` — that one reports 401s to
 * the app, and this screen is already the app's answer to one.
 */
export async function probeRuntime(): Promise<Probe> {
  try {
    await fetch('/health', { cache: 'no-store' });
    return 'up';
  } catch {
    return 'down';
  }
}

export interface SessionLostProps {
  /** A valid token was pasted and stored; the shell takes it from here. */
  onRestored(): void;
}

/**
 * The page a reader lands on when this tab has no usable key (spec §5).
 *
 * Two honest sentences instead of one line of jargon: which of the two
 * things happened, what to do about it, and a place to paste the address
 * the runtime printed. The token goes to `sessionStorage` and memory, the
 * same as the fragment path — never back into the URL, never to the
 * console.
 */
export function SessionLost({ onRestored }: SessionLostProps): JSX.Element {
  const [probe, setProbe] = useState<Probe>(null);
  const [pasted, setPasted] = useState('');
  const [rejected, setRejected] = useState(false);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async (): Promise<void> => {
    setProbe(null);
    setProbe(await probeRuntime());
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const submit = (): void => {
    const token = tokenFromPaste(pasted);
    if (token === null) {
      setRejected(true);
      return;
    }
    storeToken(token);
    setPasted('');
    setRejected(false);
    onRestored();
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(SERVE_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard (an insecure context, a denied permission): the
      // command is on screen to select by hand.
    }
  };

  return (
    <main className="v2-page v2-lost" aria-label="Session lost">
      <div className="v2-lost-wrap">
        <h1 className="v2-lost-title">Your session ended.</h1>

        <p className="v2-lost-lede" role="status">
          {probe === null
            ? 'Checking whether counsel-os is running…'
            : probe === 'up'
              ? 'The runtime is running, but this tab no longer has its key. Paste the address it printed to get back in.'
              : 'counsel-os is not running. Start it, then paste the address it prints.'}
        </p>

        <section className="v2-lost-group rule-double">
          <h2 className="runin">Start it</h2>
          <p className="muted">In a terminal, from the counsel-os checkout:</p>
          <div className="v2-lost-cmd">
            <code>{SERVE_COMMAND}</code>
            <button type="button" className="v2-link" onClick={() => void copy()}>
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <p className="muted">
            It prints an address that starts with <code>http://127.0.0.1</code> and ends in <code>#token=…</code>. The browser it opens is already signed in; any other tab needs that address.
          </p>
        </section>

        <section className="v2-lost-group rule-double">
          <h2 className="runin">Get back in</h2>
          <form
            className="v2-lost-form"
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor="v2-lost-paste">Paste the address the runtime printed</label>
            <input
              id="v2-lost-paste"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="http://127.0.0.1:7431/#token=…"
              value={pasted}
              aria-invalid={rejected || undefined}
              onChange={event => {
                setPasted(event.target.value);
                setRejected(false);
              }}
            />
            <div className="v2-lost-acts">
              <button type="submit" className="v2-ask-go" disabled={pasted.trim() === ''}>
                Open
              </button>
              <button type="button" className="v2-link" onClick={() => void check()}>
                check again
              </button>
            </div>
            {rejected ? (
              <p className="v2-lost-error" role="alert">
                That is not an address the runtime printed. It ends in <code>#token=</code> followed by 64 letters and digits.
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
