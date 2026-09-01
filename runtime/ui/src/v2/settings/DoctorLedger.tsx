import { useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { DoctorReport } from '../../api/types';

/**
 * "Check the vault" in Settings › Runtime (spec 2026-09-01 §7): one click
 * runs the read-only doctor and lays the findings out as a ledger — check,
 * severity as set text, the message, its detail and fix. No pills.
 */
export function DoctorLedger(): JSX.Element {
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setReport(await fetchJson<DoctorReport>('/doctor'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="v2-doctor">
      <h3 className="runin">Health</h3>
      <p className="muted">Read-only checks over the vault: the config marker, the folders and their counts, how current the law areas are, git, whether your standards and clause library agree, and open matters behind a refreshed law area.</p>
      <button type="button" disabled={busy} onClick={() => void run()}>
        {busy ? 'Checking…' : report === null ? 'Check the vault' : 'Check again'}
      </button>
      {error !== null ? (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      ) : null}
      {report === null ? null : (
        <>
          <div role="list" aria-label="Vault health">
            {report.findings.map(f => (
              <div key={f.check} role="listitem" className="v2-doctor-row">
                <span className="v2-doctor-check">{f.check.replace(/-/g, ' ')}</span>
                <span className={`v2-doctor-severity v2-doctor-${f.severity}`}>{f.severity}</span>
                <span className="v2-doctor-body">
                  <span className="v2-doctor-message">{f.message}</span>
                  {f.detail === undefined ? null : <div className="v2-doctor-detail">{f.detail}</div>}
                  {f.fix === undefined || f.severity === 'ok' ? null : <div className="v2-doctor-fix">fix: {f.fix}</div>}
                </span>
              </div>
            ))}
          </div>
          <p className="v2-doctor-verdict" role="status">
            {report.summary}
            <span className="muted"> · checked {new Date(report.at).toLocaleString()}</span>
          </p>
        </>
      )}
    </div>
  );
}
