import { useState } from 'react';
import { isSessionOnly, readUiFlag, setUiFlag, type UiFlag } from '../ui-flag';

/**
 * The "Try the new design" switch (spec §2, "Rollout"). Rendered by the v1
 * settings page and by the v2 one, so the founder can flip either way from
 * wherever they are. Flipping it remounts the shell (`Root` in `app.tsx`
 * listens); no reload.
 */
export function DesignToggle(): JSX.Element {
  const [flag, setFlag] = useState<UiFlag>(() => readUiFlag());
  // Seeded from the module, not from `false`: flipping the switch remounts
  // this component (`Root` swaps the shell), so the toggle that renders the
  // warning is never the one that set it.
  const [sessionOnly, setSessionOnly] = useState(() => isSessionOnly());

  const change = (on: boolean): void => {
    const next: UiFlag = on ? 'v2' : 'v1';
    const { persisted } = setUiFlag(next);
    setFlag(next);
    setSessionOnly(!persisted);
  };

  return (
    <section className="settings-design">
      <h2>Design</h2>
      <label className="design-switch">
        <input type="checkbox" role="switch" checked={flag === 'v2'} onChange={e => change(e.target.checked)} />{' '}
        Try the new design
      </label>
      <p className="muted">Answer-first turns, a redline for every proposal, and the vault beside the thread.</p>
      {sessionOnly ? (
        <p className="notice notice-warning" role="status">
          The choice could not be saved (storage is blocked), so it applies to this tab only.
        </p>
      ) : null}
    </section>
  );
}
