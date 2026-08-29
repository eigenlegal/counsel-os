import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { counselHome } from '../core/home';
import type { Capabilities, ModelProvider } from '../core/types';
import { Router, parseRouterConfig, type RouterConfig } from '../router/router';
import { buildProviders } from './index';
import { directProviderFromId } from './direct';
import { withRetry } from './retry';

export const BUILTIN_DEFAULT = 'claude-sub/claude-opus-5';
export const BUILTIN_IDS = ['claude-sub/claude-opus-5', 'codex-sub/gpt-5.6-terra', 'ollama/gemma4:e4b'];
/** `<counselHome>/providers.yaml`. Resolved per call, not frozen at module
 * load, because `counselHome` reads `COUNSEL_OS_HOME` — a constant computed
 * at import time would pin the developer's real home into every later
 * `loadRegistry`, which is exactly the bug this replaces. */
export function defaultRegistryFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'providers.yaml');
}

const Entry = z.object({ id: z.string(), baseURL: z.string().optional(), apiKeyEnv: z.string().optional(),
  capabilities: z.object({ tools: z.boolean(), caching: z.boolean(), thinking: z.boolean(), contextTokens: z.number(), auth: z.enum(['subscription','apikey','local']) }).partial().optional() });
export const RegistryFile = z.object({ default: z.string().optional(), providers: z.array(Entry).optional(), tasks: z.record(z.string(), z.any()).optional(),
  /** The per-step deadline every step on this runtime gets, in milliseconds
   * (spec §3). Positive: a zero or negative deadline would fail every step
   * before it started, which is a config mistake, not a policy. */
  stepTimeoutMs: z.number().int().positive().optional() });

export function loadRegistry(opts: { file?: string; vaultRoot: string; env?: NodeJS.ProcessEnv }) {
  const env = opts.env ?? process.env; const file = opts.file ?? defaultRegistryFile(env);
  const raw = existsSync(file) ? RegistryFile.parse(Bun.YAML.parse(readFileSync(file, 'utf8'))) : {};
  const providers: ModelProvider[] = buildProviders({ ids: BUILTIN_IDS, vaultRoot: opts.vaultRoot });
  for (const e of raw.providers ?? []) {
    const [vendor] = e.id.split('/');
    if (vendor === 'claude-sub' || vendor === 'codex-sub') { providers.push(...buildProviders({ ids: [e.id], vaultRoot: opts.vaultRoot })); continue; }
    if (!['anthropic','openai','ollama','openai-compatible'].includes(vendor ?? '')) throw new Error(`unknown provider id prefix: ${e.id}`);
    providers.push(directProviderFromId(e.id, { baseURL: e.baseURL, apiKey: e.apiKeyEnv ? env[e.apiKeyEnv] : undefined, capabilities: e.capabilities as Partial<Capabilities> }));
  }
  const wrapped = providers.map(p => (p.kind === 'direct' ? withRetry(p) : p));
  const defaultId = raw.default ?? BUILTIN_DEFAULT;
  const cfg: RouterConfig = { default: defaultId, tasks: raw.tasks };
  return { providers: wrapped, router: new Router(cfg, wrapped), defaultId,
    ...(raw.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: raw.stepTimeoutMs }) };
}
