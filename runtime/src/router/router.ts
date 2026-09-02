import type { Capabilities, ModelProvider } from '../core/types';
import { localityOf, MatterStaysLocalError, RouterError } from '../core/types';
import { DEFAULT_MIN_SCORE, DEFAULT_PREFERENCE, type TaskPolicy } from './policy';
import type { ProviderScore } from './scores';

/** Providers within this much of the best score count as equally good, so a
 * `cost` or `latency` preference chooses among real peers rather than
 * trading a materially better answer for a cheaper one. */
const SCORE_BAND = 0.05;

export type Require = Partial<Pick<Capabilities, 'tools' | 'caching' | 'thinking' | 'contextTokens'>>;

export interface TaskRoute {
  prefer: string;
  require?: Require;
  allow_remote?: boolean;
}

export interface RouterConfig {
  default: string;
  tasks?: Record<string, TaskRoute>;
}

export function parseRouterConfig(yamlText: string): RouterConfig {
  const raw = Bun.YAML.parse(yamlText) as unknown;
  if (!raw || typeof raw !== 'object' || typeof (raw as RouterConfig).default !== 'string') {
    throw new RouterError('router config needs a string `default`');
  }
  return raw as RouterConfig;
}

/**
 * Whether a provider keeps the text on this machine: its locality (an
 * OpenAI-compatible server on loopback is local too), derived from the
 * credential type when the provider does not say.
 */
export function isLocal(caps: Capabilities): boolean {
  return localityOf(caps) === 'local';
}

export interface ResolveOptions {
  /** The matter stays on this machine (providers spec §7): only local
   * providers are candidates, whatever the route or the default say. */
  localOnly?: boolean;
  /** What the scoreboard measured for this task, best first. Absent (or
   * empty) means nothing has been scored and the configured route decides,
   * exactly as before. */
  scores?: ProviderScore[];
  /** How this practice wants the task routed. */
  policy?: TaskPolicy;
}

/** Why a step went where it went — shown on the step and stamped on the run
 * record, so a route is never a mystery. */
export interface RouteReason {
  kind: 'default' | 'task-route' | 'pinned' | 'scored' | 'no-score' | 'below-bar' | 'stays-local';
  /** One phrase, already in the words a lawyer reads. */
  text: string;
}

export interface Routed {
  provider: ModelProvider;
  reason: RouteReason;
}

/** Cheaper per run; a provider with no known price never displaces one with
 * a price, so an unknown cost is not mistaken for a free one. */
function cheaper(a: ProviderScore, b: ProviderScore): boolean {
  if (a.meanCostUsd === null) return false;
  if (b.meanCostUsd === null) return true;
  return a.meanCostUsd < b.meanCostUsd;
}

function faster(a: ProviderScore, b: ProviderScore): boolean {
  if (a.medianMs === null) return false;
  if (b.medianMs === null) return true;
  return a.medianMs < b.medianMs;
}

function satisfies(caps: Capabilities, req: Require | undefined, allowRemote: boolean): boolean {
  if (!allowRemote && !isLocal(caps)) return false;
  if (!req) return true;
  if (req.tools !== undefined && caps.tools !== req.tools) return false;
  if (req.caching !== undefined && caps.caching !== req.caching) return false;
  if (req.thinking !== undefined && caps.thinking !== req.thinking) return false;
  if (req.contextTokens !== undefined && caps.contextTokens < req.contextTokens) return false;
  return true;
}

export class Router {
  private readonly byId = new Map<string, ModelProvider>();

  constructor(private readonly cfg: RouterConfig, providers: ModelProvider[]) {
    for (const p of providers) this.byId.set(p.id, p);
  }

  resolve(task?: string, options: ResolveOptions = {}): ModelProvider {
    return this.route(task, options).provider;
  }

  /**
   * The provider for a task, and why (routing-and-evals spec §6).
   *
   * The scoreboard leads when it has something to say: candidates are the
   * providers that clear this task's bar, minus anything the matter's
   * locality forbids; a pin wins among them; otherwise the practice's
   * preference orders them. With no score, or none clearing the bar, the
   * configured route and the default decide exactly as they did before —
   * routing never refuses to answer for want of a measurement.
   */
  route(task?: string, options: ResolveOptions = {}): Routed {
    const scored = this.byScore(task, options);
    if (scored) return scored;

    const route = task ? this.cfg.tasks?.[task] : undefined;
    const fallback = this.byConfig(task, route, options);
    // A "nothing scored" note belongs on the step only when scoring is a
    // thing this practice does for this task at all; otherwise the honest
    // reason is simply the route or the default.
    if (options.scores !== undefined && fallback.reason.kind !== 'stays-local') {
      const best = [...options.scores].sort((a, b) => b.score - a.score)[0];
      const bar = options.policy?.min_score ?? DEFAULT_MIN_SCORE;
      const reason: RouteReason = best
        ? { kind: 'below-bar', text: `no model clears ${bar.toFixed(2)}${task ? ` for ${task}` : ''} (best ${best.score.toFixed(2)})` }
        : { kind: 'no-score', text: 'no score yet' };
      return { provider: fallback.provider, reason };
    }
    return fallback;
  }

  /** The scoreboard's pick, or `null` when it has nothing usable to say. */
  private byScore(task: string | undefined, options: ResolveOptions): Routed | null {
    const scores = options.scores ?? [];
    if (task === undefined || scores.length === 0) return null;
    const bar = options.policy?.min_score ?? DEFAULT_MIN_SCORE;
    const prefer = options.policy?.prefer ?? DEFAULT_PREFERENCE;
    const route = this.cfg.tasks?.[task];

    const candidates = scores
      .filter(s => s.score >= bar)
      .map(s => ({ s, p: this.byId.get(s.providerId) }))
      .filter((c): c is { s: ProviderScore; p: ModelProvider } => c.p !== undefined)
      // The matter's policy and the route's requirements bind the scoreboard
      // too: a high score never buys a way past "stays on this machine".
      .filter(c => (options.localOnly === true ? isLocal(c.p.capabilities) : true))
      .filter(c => satisfies(c.p.capabilities, route?.require, options.localOnly === true ? false : route?.allow_remote ?? true));
    if (candidates.length === 0) return null;

    const pinned = options.policy?.pinned;
    if (pinned !== undefined) {
      const hit = candidates.find(c => c.s.providerId === pinned);
      if (hit) return { provider: hit.p, reason: { kind: 'pinned', text: `pinned for ${task} · ${hit.s.score.toFixed(2)}` } };
    }

    const best = candidates.reduce((a, b) => (b.s.score > a.s.score ? b : a));
    const peers = candidates.filter(c => best.s.score - c.s.score <= SCORE_BAND);
    const chosen =
      prefer === 'cost'
        ? peers.reduce((a, b) => (cheaper(b.s, a.s) ? b : a))
        : prefer === 'latency'
          ? peers.reduce((a, b) => (faster(b.s, a.s) ? b : a))
          : best;
    const how = prefer === 'quality' ? '' : ` · by ${prefer}`;
    return { provider: chosen.p, reason: { kind: 'scored', text: `${task} ${chosen.s.score.toFixed(2)}${how}` } };
  }

  /** The pre-scoreboard behaviour, unchanged, with its reason named. */
  private byConfig(task: string | undefined, route: TaskRoute | undefined, options: ResolveOptions): Routed {
    if (options.localOnly === true) {
      return { provider: this.resolveLocal(route), reason: { kind: 'stays-local', text: 'stays on this machine' } };
    }
    const allowRemote = route?.allow_remote ?? true;

    if (route) {
      const preferred = this.byId.get(route.prefer);
      if (preferred && satisfies(preferred.capabilities, route.require, allowRemote)) {
        return { provider: preferred, reason: { kind: 'task-route', text: `route for ${task}` } };
      }
    }
    const def = this.byId.get(this.cfg.default);
    if (!def) throw new RouterError(`default provider not configured: ${this.cfg.default}`);
    if (route && !satisfies(def.capabilities, route.require, allowRemote)) {
      throw new RouterError(
        `task "${task}" requires ${JSON.stringify(route.require ?? {})}${allowRemote ? '' : ' and a local model'}; ` +
        `neither ${route.prefer} nor default ${def.id} satisfies it`,
      );
    }
    return { provider: def, reason: { kind: 'default', text: 'the default model' } };
  }

  /**
   * The stays-local path: the route's preference and the default count only
   * when they are local; otherwise the best local provider — one with tools
   * first, then the largest context — and a typed error when there is none.
   * Never a cloud provider, whatever the config says.
   */
  private resolveLocal(route: TaskRoute | undefined): ModelProvider {
    const local = [...this.byId.values()].filter(p => isLocal(p.capabilities));
    if (local.length === 0) throw new MatterStaysLocalError('This matter stays on this machine, and no local model is loaded.');
    if (route) {
      const preferred = this.byId.get(route.prefer);
      if (preferred && isLocal(preferred.capabilities) && satisfies(preferred.capabilities, route.require, false)) return preferred;
    }
    const def = this.byId.get(this.cfg.default);
    if (def && isLocal(def.capabilities) && (!route || satisfies(def.capabilities, route.require, false))) return def;
    const ranked = [...local].sort((a, b) => {
      if (a.capabilities.tools !== b.capabilities.tools) return a.capabilities.tools ? -1 : 1;
      return b.capabilities.contextTokens - a.capabilities.contextTokens;
    });
    return ranked[0]!;
  }
}
