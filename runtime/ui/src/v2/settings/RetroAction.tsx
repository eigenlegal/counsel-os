import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { RetroStatus } from '../../api/types';

export interface RetroActionProps {
  /** The shell opens the retro thread and sends its first step. Absent =
   * the button does nothing visible, so the row still reads. */
  onStart?: () => void;
}

/** `2026-06-05` as the row shows it. */
export function retroDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Settings › Runtime: the practice retro (`skills/retro`, in the runtime).
 * One line of set text — when it last ran and how often it is due — and
 * the action. The retro itself is a conversation: the button opens it.
 */
export function RetroAction({ onStart }: RetroActionProps): JSX.Element {
  const [status, setStatus] = useState<RetroStatus | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setStatus(await fetchJson<RetroStatus>('/retro'));
      } catch (err) {
        // An older runtime has no /retro; the row then says only what the
        // action does. A 401 is the shell's to report.
        if (err instanceof ApiError && err.status === 401) return;
        setStatus(null);
      }
    })();
  }, []);

  return (
    <div className="v2-retro">
      <h3 className="runin">Retro</h3>
      <p className="muted">
        A look back over the practice — what counsel learned, which positions drifted, what to promote from the matters into your standards, methods and memory. It runs as a conversation; every change it suggests comes back as a proposal for you to approve.
      </p>
      <p className="v2-retro-line" role="status">
        {status === null ? null : status.lastRetroAt === null ? (
          <span>No retro yet · due every {status.cadenceDays} days</span>
        ) : (
          <span>
            Last retro {retroDateLabel(status.lastRetroAt)}
            {status.daysSince === null ? null : ` (${status.daysSince} day${status.daysSince === 1 ? '' : 's'} ago)`} · due every {status.cadenceDays} days
            {status.due ? <em className="v2-retro-due-word"> · due now</em> : null}
          </span>
        )}
      </p>
      <button type="button" onClick={onStart} disabled={onStart === undefined}>
        Run a retro
      </button>
    </div>
  );
}
