/**
 * The eval set: what the scoreboard is actually scoring against.
 *
 * `GET /evals/fixtures` has existed the whole time and nothing called it,
 * so a practice could read a board of scores without ever seeing what
 * produced them — or learn that five of its thirteen fixtures cannot run.
 * A score you cannot trace to a document is a number to take on faith,
 * which is the opposite of the point.
 */
import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { EvalFixture } from '../../api/types';

/** The order the sets are shown in: your own work first. */
const SET_ORDER = ['practice', 'shipped', 'benchmark'];

/** What each set IS, in a sentence, because the names alone do not say. */
const SET_BLURB: Record<string, string> = {
  practice: 'Drawn from your own matters — the only set that measures this practice.',
  shipped: 'The suite that ships with counsel-os, the same for everyone.',
  benchmark: 'Public benchmarks, imported. Comparable across tools, not about your work.',
};

export function FixtureSet(): JSX.Element {
  const [fixtures, setFixtures] = useState<EvalFixture[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setFixtures((await fetchJson<{ fixtures: EvalFixture[] }>('/evals/fixtures')).fixtures);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  if (error !== null) {
    return (
      <p className="v2-notice v2-notice-error" role="alert">
        {error}
      </p>
    );
  }
  if (fixtures === null) return <p className="muted">Loading…</p>;
  if (fixtures.length === 0) {
    return <p className="muted">No fixtures yet. Save one from a conversation to start measuring on your own work.</p>;
  }

  const sets = [...new Set(fixtures.map(f => f.set))].sort((a, b) => order(a) - order(b));
  const canRun = fixtures.filter(f => f.runnable).length;

  return (
    <>
      <p className="v2-fixtures-count">
        {fixtures.length} fixture{fixtures.length === 1 ? '' : 's'} · {canRun} can run
        {canRun < fixtures.length ? (
          <span className="muted">
            {' '}
            · {fixtures.length - canRun} carr{fixtures.length - canRun === 1 ? 'ies' : 'y'} no documents, so nothing can be scored against them
          </span>
        ) : null}
      </p>
      {sets.map(set => (
        <section key={set} className="v2-fixture-set">
          <h3 className="runin">{set}</h3>
          {SET_BLURB[set] === undefined ? null : <p className="muted">{SET_BLURB[set]}</p>}
          <ul className="v2-fixture-list">
            {fixtures
              .filter(f => f.set === set)
              .map(f => (
                <li key={`${f.set}/${f.id}`} className={f.runnable ? undefined : 'v2-fixture-idle'}>
                  <span className="v2-fixture-id">{f.title ?? f.id}</span>
                  <span className="v2-fixture-kind">
                    {f.task} · {f.scorer}
                  </span>
                  {f.runnable ? null : <span className="v2-fixture-why">no documents to read</span>}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function order(set: string): number {
  const at = SET_ORDER.indexOf(set);
  return at === -1 ? SET_ORDER.length : at;
}
