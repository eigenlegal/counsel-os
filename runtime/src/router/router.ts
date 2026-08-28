import type { Capabilities, ModelProvider } from '../core/types';
import { RouterError } from '../core/types';

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

function satisfies(caps: Capabilities, req: Require | undefined, allowRemote: boolean): boolean {
  if (!allowRemote && caps.auth !== 'local') return false;
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

  resolve(task?: string): ModelProvider {
    const route = task ? this.cfg.tasks?.[task] : undefined;
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
}
