/**
 * How one task is routed, under its name in the Models ledger
 * (routing-and-evals spec §6).
 *
 * Set text, like every other status here: the bar, the preference, and who
 * that picks today. `change` reveals the two choices in place; nothing is a
 * slider and nothing is a modal, because a bar is one of five numbers a
 * lawyer would ever pick and a preference is one of three words.
 */
import { useState } from 'react';
import type { RoutingTask } from '../../api/types';

export interface RoutingLineProps {
  task: string;
  routing: RoutingTask | undefined;
  defaults: { minScore: number; prefer: string };
  busy: boolean;
  onChange(change: { minScore?: number; prefer?: string; pinned?: string | null }): void;
}

/** The bars worth offering: below 0.5 is not a bar, above 0.9 nothing clears. */
export const BARS = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const PREFERENCES = ['quality', 'cost', 'latency'] as const;

export function RoutingLine({ task, routing, defaults, busy, onChange }: RoutingLineProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const bar = routing?.minScore ?? defaults.minScore;
  const prefer = routing?.prefer ?? defaults.prefer;
  const picked = routing?.picked;

  return (
    <span className="v2-routing">
      <span className="v2-routing-facts">
        bar {bar.toFixed(2)} · by {prefer}
        {routing?.pinned === undefined ? '' : ` · pinned ${routing.pinned}`}
      </span>
      {picked === undefined ? null : (
        <span className="v2-routing-picked" title={`picked for ${task}: ${picked.reason}`}>
          {' · '}
          picks {picked.providerId}
        </span>
      )}
      {' · '}
      <button type="button" className="v2-link v2-routing-act" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'done' : 'change'}
      </button>
      {open ? (
        <span className="v2-routing-choices">
          <span className="v2-routing-choice" role="group" aria-label={`Bar for ${task}`}>
            bar{' '}
            {BARS.map(b => (
              <button
                key={b}
                type="button"
                className={b === bar ? 'v2-link v2-routing-on' : 'v2-link'}
                disabled={busy}
                aria-pressed={b === bar}
                onClick={() => onChange({ minScore: b })}
              >
                {b.toFixed(1)}
              </button>
            ))}
          </span>
          <span className="v2-routing-choice" role="group" aria-label={`Preference for ${task}`}>
            by{' '}
            {PREFERENCES.map(p => (
              <button
                key={p}
                type="button"
                className={p === prefer ? 'v2-link v2-routing-on' : 'v2-link'}
                disabled={busy}
                aria-pressed={p === prefer}
                onClick={() => onChange({ prefer: p })}
              >
                {p}
              </button>
            ))}
          </span>
          {routing?.pinned === undefined ? null : (
            <button type="button" className="v2-link v2-routing-act" disabled={busy} onClick={() => onChange({ pinned: null })}>
              unpin
            </button>
          )}
        </span>
      ) : null}
    </span>
  );
}
