import { useState } from 'react';

/** How a vault is created today, from the checkout — the same shape as
 * `SERVE_COMMAND` in `SessionLost.tsx`, and the same one place to change
 * when the `counsel-os` binary ships (roadmap §9). */
export const INIT_COMMAND = 'bun runtime/src/cli.ts init';

export interface SetupRequiredProps {
  /** Re-read `/health`; the shell leaves this page once it says `setup: false`. */
  onCheck(): void;
  checking?: boolean;
}

/**
 * The page while the runtime is in setup mode (spec 2026-09-01 §4): the
 * runtime is up and this tab holds its key, but there is no vault yet.
 * This is the placeholder for the first-run screen (`docs/superpowers/
 * specs/img-standalone/mock-setup.html`), which lands in the next stage;
 * until then the way in is `init` from a terminal.
 */
export function SetupRequired({ onCheck, checking = false }: SetupRequiredProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(INIT_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard here: the command is on screen to select by hand.
    }
  };

  return (
    <main className="v2-page v2-lost v2-setup-required" aria-label="Set up counsel-os">
      <div className="v2-lost-wrap">
        <h1 className="v2-lost-title">Set up counsel-os.</h1>
        <p className="v2-lost-lede" role="status">
          {checking ? 'Checking…' : 'The runtime is running, but it has no vault yet — the folder your matters, standards, and the law it reads live in.'}
        </p>

        <section className="v2-lost-group rule-double">
          <h2 className="runin">Create one</h2>
          <p className="muted">In a terminal, from the counsel-os checkout. It asks four short questions and writes the vault to <code>~/Documents/Counsel OS</code> unless you say otherwise.</p>
          <div className="v2-lost-cmd">
            <code>{INIT_COMMAND}</code>
            <button type="button" className="v2-link" onClick={() => void copy()}>
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <p className="muted">Then come back here.</p>
          <div className="v2-lost-acts">
            <button type="button" className="v2-ask-go" onClick={onCheck} disabled={checking}>
              Check again
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
