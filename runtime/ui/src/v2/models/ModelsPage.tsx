/**
 * Models — the operator's own view of the practice (routing-and-evals spec
 * §6, §10).
 *
 * This was three groups at the bottom of Settings, below the provider keys.
 * They were never settings: a scoreboard is a measurement, a bar is a
 * standing decision about quality, and a ledger is a record of what
 * happened. Settings is where you configure the thing; this is where you
 * see how it is doing and change what you expect of it.
 *
 * Three questions, in the order an operator asks them: how do the models
 * score, how does each kind of work route, and what actually ran.
 */
import type { Health } from '../../api/types';
import { ModelsGroup } from './ModelsGroup';
import { RoutingLedger } from './RoutingLedger';

export interface ModelsPageProps {
  health: Health | null;
}

export function ModelsPage({ health }: ModelsPageProps): JSX.Element {
  // The loaded providers are the board's columns: a provider the runtime
  // never loaded has nothing to score and nothing to route to.
  const providerIds = (health?.providers ?? []).map(p => p.id);

  return (
    <div className="v2-settings v2-models-page">
      <section className="v2-group" aria-labelledby="models-board">
        <h2 id="models-board">How they score</h2>
        <p className="muted">
          Every provider against every kind of work, from the eval fixtures: the shipped suite, your own practice set, and public benchmarks, never averaged
          together. Under each task is the bar a model has to clear, what breaks a tie, and who that picks today.
        </p>
        {health === null ? <p className="muted">Reading the runtime…</p> : <ModelsGroup providerIds={providerIds} />}
      </section>

      <section className="v2-group" aria-labelledby="models-ran">
        <h2 id="models-ran">What ran</h2>
        <p className="muted">
          Every step, newest first, with the model it got and the reason it got it. The board above says how models do on fixtures; this says what your
          practice actually got.
        </p>
        <RoutingLedger />
      </section>
    </div>
  );
}
