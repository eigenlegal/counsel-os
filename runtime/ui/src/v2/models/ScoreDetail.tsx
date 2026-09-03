/**
 * What one score is made of.
 *
 * `GET /evals/results` has existed all along with nothing calling it, so a
 * board cell was a number with nothing behind it: 0.82 on review, and no
 * way to ask which documents it got right, which it missed, or what the
 * scorer actually counted. For a practice deciding which model reads its
 * contracts, that is the whole question.
 */
import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { EvalResult } from '../../api/types';

export interface ScoreDetailProps {
  task: string;
  /** The tab the cell was on. A board cell is one (set, provider, model)
   * triple; filtering on task and provider alone mixed the shipped suite
   * into "how does this model do on MY matters". */
  set: string;
  providerId: string;
  onClose(): void;
}

export function ScoreDetail({ task, set, providerId, onClose }: ScoreDetailProps): JSX.Element {
  const [results, setResults] = useState<EvalResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResults(null);
    void (async () => {
      try {
        const all = (await fetchJson<{ results: EvalResult[] }>('/evals/results')).results;
        setResults(all.filter(r => r.task === task && r.source === set && r.providerId === providerId).sort((a, b) => b.at.localeCompare(a.at)));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [task, set, providerId]);

  return (
    <div className="v2-score-detail">
      <p className="v2-score-detail-head">
        <span className="runin">
          {task} · {set} · {providerId}
        </span>
        <button type="button" className="v2-link" onClick={onClose}>
          close
        </button>
      </p>
      {error !== null ? (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      ) : results === null ? (
        <p className="muted">Loading…</p>
      ) : results.length === 0 ? (
        <p className="muted">Nothing scored yet for this pair. Run it from the board above.</p>
      ) : (
        <table className="v2-score-table">
          <thead>
            <tr>
              <th scope="col">fixture</th>
              <th scope="col">score</th>
              <th scope="col">what the scorer counted</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={`${r.at}/${r.modelVersion}/${r.fixtureId}/${r.documentId ?? ''}`}>
                <th scope="row">
                  {r.fixtureId}
                  {r.documentId === undefined ? null : <span className="muted"> · {r.documentId}</span>}
                  {/* Two model versions of one provider are two rows on the
                      board; without this they were two identical-looking
                      rows here. */}
                  <span className="v2-score-version">{r.modelVersion}</span>
                </th>
                <td className={r.score === null ? 'v2-score-failed' : undefined}>{r.score === null ? 'failed' : r.score.toFixed(2)}</td>
                <td className="v2-score-terms">
                  {Object.entries(r.terms).length === 0 ? <span className="muted">—</span> : null}
                  {Object.entries(r.terms).map(([term, value]) => (
                    <span key={term} className="v2-score-term">
                      {term} {value.toFixed(2)}
                    </span>
                  ))}
                  {r.notes.length === 0 ? null : <span className="v2-score-note">{r.notes[0]}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
