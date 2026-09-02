import type { Capabilities, ModelProvider } from '../core/types';
import { MatterStaysLocalError, RouterError } from '../core/types';

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
 * Whether a provider keeps the text on this machine. Today the credential
 * type stands in for locality; providers step 1 adds `Capabilities.locality`
 * (an OpenAI-compatible server on loopback is local too) and this becomes
 * `caps.locality === 'local'`. One helper so that change is one line.
 */
export function isLocal(caps: Capabilities): boolean {
  return caps.auth === 'local';
}

export interface ResolveOptions {
  /** The matter stays on this machine (providers spec §7): only local
   * providers are candidates, whatever the route or the default say. */
  localOnly?: boolean;
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
    const route = task ? this.cfg.tasks?.[task] : undefined;
    if (options.localOnly === true) return this.resolveLocal(route);
    const allowRemote = route?.allow_remote ?? true;

    if (route) {
      const preferred = this.byId.get(route.prefer);
      if (preferred && satisfies(preferred.capabilities, route.require, allowRemote)) return preferred;
    }
    const def = this.byId.get(this.cfg.default);
    if (!def) throw new RouterError(`default provider not configured: ${this.cfg.default}`);
    if (route && !satisfies(def.capabilities, route.require, allowRemote)) {
      throw new RouterError(
        `task "${task}" requires ${JSON.stringify(route.require ?? {})}${allowRemote ? '' : ' and a local model'}; ` +
        `neither ${route.prefer} nor default ${def.id} satisfies it`,
      );
    }
    return def;
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
