import { useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { TestResult } from '../api/types';

export interface ProviderTestProps {
  providerId: string;
}

/** The warning, word for word. A test is a real step against a real
 * provider: on a metered key it costs money, and on a subscription it
 * spends the operator's window. Nobody should discover that after the
 * click. */
export function testWarning(providerId: string): string {
  return `This uses one call on ${providerId}.`;
}

/**
 * "Does this provider work?", answered by actually using it.
 *
 * The confirmation is drawn in the page rather than raised with
 * `window.confirm`. Two reasons, and the second is the one that matters: a
 * modal dialog blocks the whole tab, and a test can take up to a minute; and
 * a native dialog cannot be driven from a component test, so the guard on
 * the one action here that spends money would be the one thing left
 * untested.
 */
export function ProviderTest({ providerId }: ProviderTestProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setConfirming(false);
    setBusy(true);
    setResult(null);
    setFailure(null);
    try {
      setResult(
        await fetchJson<TestResult>('/settings/test', { method: 'POST', body: JSON.stringify({ provider: providerId }) }),
      );
    } catch (err) {
      // A 404 (no such provider) or a transport failure. The route answers a
      // provider that simply does not work with a 200 and `ok: false`, so
      // anything landing here is about the REQUEST, not the provider.
      if (!(err instanceof ApiError && err.status === 401)) {
        setFailure(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="provider-test">
      <button type="button" disabled={busy || confirming} onClick={() => setConfirming(true)}>
        Test
      </button>

      {confirming ? (
        <div className="provider-test-confirm" role="alertdialog" aria-label={`Test ${providerId}`}>
          <p>{testWarning(providerId)}</p>
          <button type="button" onClick={() => void run()}>
            Run the test
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      {busy ? <span className="muted">Testing…</span> : null}

      {failure === null ? null : (
        <p className="notice notice-error" role="alert">
          {failure}
        </p>
      )}

      {result === null ? null : (
        <p className={`provider-test-result ${result.ok ? 'ok' : 'failed'}`} role="status">
          <span className={`badge badge-${result.ok ? 'ok' : 'error'}`}>{result.ok ? 'ok' : 'failed'}</span>{' '}
          <span className="muted">{result.ms} ms</span>
          {result.usage === undefined ? null : (
            <>
              {' '}
              <span className="muted">
                {result.usage.inputTokens} in / {result.usage.outputTokens} out
                {result.usage.costUsd === undefined ? '' : ` · $${result.usage.costUsd.toFixed(4)}`}
              </span>
            </>
          )}
          {result.error === undefined ? null : <> — {result.error}</>}
        </p>
      )}
    </div>
  );
}
