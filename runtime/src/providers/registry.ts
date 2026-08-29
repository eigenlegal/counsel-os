import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

/** `providers.yaml` as data: what `GET /settings` hands out and `PUT
 * /settings` takes back. */
export type RegistryFileData = z.infer<typeof RegistryFile>;

/**
 * The registry file's contents, or an empty registry when there is no file.
 * A missing `providers.yaml` is the normal state of a fresh install — the
 * built-ins alone are a working runtime — so it is not an error here either.
 */
export function readRegistry(file: string): RegistryFileData {
  return existsSync(file) ? RegistryFile.parse(Bun.YAML.parse(readFileSync(file, 'utf8'))) : {};
}

/**
 * Writes the registry file — the only thing this runtime writes outside the
 * vault. `PUT /settings` supplies the CONTENTS; the path is the one the
 * operator started the server with, so nothing a client sends can steer the
 * write somewhere else.
 *
 * Temp file plus rename, for the same reason `runtime.json` does it: a
 * concurrent `loadRegistry` (this process reloading, or a second runtime
 * starting) must see either the old file or the new one, never half of one.
 * The parent directory is created 0700 because `<counselHome>` also holds
 * the bearer token and the per-thread Codex homes.
 */
export function writeRegistry(file: string, reg: RegistryFileData): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  // Named for this process, so two runtimes writing at once do not share it.
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, Bun.YAML.stringify(reg), 'utf8');
  renameSync(tmp, file);
}

/**
 * Builds the provider set and the router the server runs on.
 *
 * `extraProviders` and `defaultId` are the caller's overrides, and they beat
 * `providers.yaml`: `serve --fake` uses them to put `fake/fake` in front of
 * every configured provider without writing a config file the operator never
 * asked for. The extras are appended AFTER the retry wrapper, deliberately —
 * a caller-supplied provider is handed to the router as the object it passed
 * in, not a copy of it.
 */
export function loadRegistry(opts: {
  file?: string;
  vaultRoot: string;
  env?: NodeJS.ProcessEnv;
  extraProviders?: ModelProvider[];
  defaultId?: string;
}) {
  const env = opts.env ?? process.env; const file = opts.file ?? defaultRegistryFile(env);
  const raw = readRegistry(file);
  const providers: ModelProvider[] = buildProviders({ ids: BUILTIN_IDS, vaultRoot: opts.vaultRoot });
  for (const e of raw.providers ?? []) {
    const [vendor] = e.id.split('/');
    if (vendor === 'claude-sub' || vendor === 'codex-sub') { providers.push(...buildProviders({ ids: [e.id], vaultRoot: opts.vaultRoot })); continue; }
    if (!['anthropic','openai','ollama','openai-compatible'].includes(vendor ?? '')) throw new Error(`unknown provider id prefix: ${e.id}`);
    providers.push(directProviderFromId(e.id, { baseURL: e.baseURL, apiKey: e.apiKeyEnv ? env[e.apiKeyEnv] : undefined, capabilities: e.capabilities as Partial<Capabilities> }));
  }
  const wrapped = [...providers.map(p => (p.kind === 'direct' ? withRetry(p) : p)), ...(opts.extraProviders ?? [])];
  const defaultId = opts.defaultId ?? raw.default ?? BUILTIN_DEFAULT;
  const cfg: RouterConfig = { default: defaultId, tasks: raw.tasks };
  return { providers: wrapped, router: new Router(cfg, wrapped), defaultId,
    ...(raw.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: raw.stepTimeoutMs }) };
}
