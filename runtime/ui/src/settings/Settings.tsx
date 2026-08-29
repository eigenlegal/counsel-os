import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { Health as HealthData, SettingsView } from '../api/types';
import { Health } from './Health';
import { ProvidersForm } from './ProvidersForm';

export interface SettingsProps {
  /** `GET /health`, already loaded by the app. Passed in rather than fetched
   * again: it is the same answer, and the header is already showing it. */
  health: HealthData | null;
}

/**
 * The settings surface: what this runtime is, and the file that makes it so.
 *
 * `effective` is refreshed from every successful save, because a `PUT`
 * rebuilds the providers and the router in place — the table under "Runtime"
 * must show the runtime as it now is, not as it was when the page loaded.
 */
export function Settings({ health }: SettingsProps): JSX.Element {
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setView(await fetchJson<SettingsView>('/settings'));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  if (error !== null) {
    return (
      <section className="settings">
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (view === null) return <p className="muted">Loading…</p>;

  return (
    <section className="settings">
      <Health health={health} effective={view.effective} file={view.file} />
      {/* Keyed on the file: a save replaces `registry`, and the form seeds
          its state from it once. The key is stable, so the form keeps the
          edits in progress; it adopts the saved registry itself. */}
      <ProvidersForm key={view.file} view={view} onSaved={setView} />
    </section>
  );
}
