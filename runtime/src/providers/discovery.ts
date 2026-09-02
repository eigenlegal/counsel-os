/**
 * Model discovery (providers spec §4): what a vendor can answer with, from
 * the vendor's own list where one exists, from the catalog's curated list
 * where none does.
 *
 * One lister per RESPONSE SHAPE, not per vendor: most hosted APIs answer
 * `GET …/models` in OpenAI's `{ data: [{ id }] }`; Google, OpenRouter, Ollama,
 * Cohere and Together have their own. The catalog record says which shape
 * and, when the vendor's API lives somewhere other than the entry's base
 * URL, where.
 *
 * Nothing here throws to a caller: a vendor that is down, slow, or refusing
 * the key becomes one sentence in `error`, and the picker still takes a
 * typed id.
 */
import type { Vendor } from './vendors';

export type DiscoveryShape = 'openai' | 'google' | 'openrouter' | 'ollama' | 'cohere' | 'together';

export interface Discovery {
  shape: DiscoveryShape;
  /** The listing URL. Absent → derived from the base URL by shape
   * (`<baseURL>/models`, `<ollama>/api/tags`). */
  url?: string;
  /** The listing was not confirmed against the vendor's docs when written. */
  unverified?: boolean;
}

export interface DiscoveredModel {
  id: string;
  contextTokens?: number;
  /** USD per million tokens, when the vendor says (OpenRouter). Kept for the
   * scoreboard (phase 2); the picker does not show it yet. */
  pricing?: { prompt: number; completion: number };
}

export interface DiscoveryResult {
  models: DiscoveredModel[];
  source: 'list' | 'curated';
  error?: string;
}

export interface DiscoveryOptions {
  apiKey?: string;
  /** The entry's base URL (a local runner, a preset, or an override). */
  baseURL?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export const DISCOVERY_TIMEOUT_MS = 3_000;

/** The vendor's own API root, for a vendor whose entry names no base URL. */
export const API_ROOTS: Readonly<Record<string, string>> = {
  openai: 'https://api.openai.com/v1',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com',
  togetherai: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  cohere: 'https://api.cohere.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://127.0.0.1:11434',
};

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Where to ask. The entry's base URL wins (a local runner, a preset, a
 * proxy); otherwise the vendor's root; the shape adds its path. */
export function listingURL(vendor: Vendor, baseURL: string | undefined): string | null {
  const d = vendor.discovery;
  if (d === undefined) return null;
  if (d.url !== undefined && baseURL === undefined) return d.url;
  const root = baseURL ?? vendor.defaultBaseURL ?? API_ROOTS[vendor.prefix];
  if (root === undefined) return d.url ?? null;
  const base = trimSlash(root);
  switch (d.shape) {
    case 'ollama':
      return `${base}/api/tags`;
    case 'google':
      return `${base}/models`;
    case 'cohere':
      return `${base}/models?endpoint=chat`;
    default:
      return `${base}/models`;
  }
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v) > 0 ? Number(v) : undefined;
  return undefined;
}

/** OpenRouter prices per token as strings; the picker wants per million. */
function perMillion(v: unknown): number | undefined {
  const n = asNumber(v);
  return n === undefined ? undefined : Math.round(n * 1_000_000 * 1000) / 1000;
}

function model(id: string, contextTokens?: number, pricing?: DiscoveredModel['pricing']): DiscoveredModel {
  return { id, ...(contextTokens === undefined ? {} : { contextTokens }), ...(pricing === undefined ? {} : { pricing }) };
}

/** Each shape's body → models. Exported for the fixture tests. */
export function parseListing(shape: DiscoveryShape, body: unknown): DiscoveredModel[] {
  const out: DiscoveredModel[] = [];
  const obj = (body ?? {}) as Record<string, unknown>;
  switch (shape) {
    case 'openai': {
      const data = Array.isArray(obj['data']) ? (obj['data'] as Array<Record<string, unknown>>) : [];
      for (const m of data) {
        if (typeof m['id'] !== 'string') continue;
        // Mistral: max_context_length; Groq: context_window; both optional.
        out.push(model(m['id'], asNumber(m['max_context_length']) ?? asNumber(m['context_window']) ?? asNumber(m['context_length'])));
      }
      break;
    }
    case 'google': {
      const models = Array.isArray(obj['models']) ? (obj['models'] as Array<Record<string, unknown>>) : [];
      for (const m of models) {
        const name = typeof m['name'] === 'string' ? m['name'] : '';
        const methods = Array.isArray(m['supportedGenerationMethods']) ? (m['supportedGenerationMethods'] as unknown[]) : [];
        if (name === '' || !methods.includes('generateContent')) continue;
        out.push(model(name.replace(/^models\//, ''), asNumber(m['inputTokenLimit'])));
      }
      break;
    }
    case 'openrouter': {
      const data = Array.isArray(obj['data']) ? (obj['data'] as Array<Record<string, unknown>>) : [];
      for (const m of data) {
        if (typeof m['id'] !== 'string') continue;
        const p = (m['pricing'] ?? {}) as Record<string, unknown>;
        const prompt = perMillion(p['prompt']);
        const completion = perMillion(p['completion']);
        out.push(model(m['id'], asNumber(m['context_length']), prompt !== undefined && completion !== undefined ? { prompt, completion } : undefined));
      }
      break;
    }
    case 'ollama': {
      const models = Array.isArray(obj['models']) ? (obj['models'] as Array<Record<string, unknown>>) : [];
      for (const m of models) if (typeof m['name'] === 'string' && m['name'] !== '') out.push(model(m['name']));
      break;
    }
    case 'cohere': {
      const models = Array.isArray(obj['models']) ? (obj['models'] as Array<Record<string, unknown>>) : [];
      for (const m of models) {
        if (typeof m['name'] !== 'string') continue;
        const endpoints = Array.isArray(m['endpoints']) ? (m['endpoints'] as unknown[]) : ['chat'];
        if (!endpoints.includes('chat')) continue;
        out.push(model(m['name'], asNumber(m['context_length'])));
      }
      break;
    }
    case 'together': {
      const arr = Array.isArray(body) ? (body as Array<Record<string, unknown>>) : [];
      for (const m of arr) {
        if (typeof m['id'] !== 'string') continue;
        if (typeof m['type'] === 'string' && m['type'] !== 'chat' && m['type'] !== 'language') continue;
        out.push(model(m['id'], asNumber(m['context_length'])));
      }
      break;
    }
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function authHeaders(vendor: Vendor, apiKey: string | undefined, url: string): Record<string, string> {
  if (apiKey === undefined || apiKey === '') return {};
  // Google takes the key as a query parameter (handled by the caller);
  // everything else is a bearer.
  if (vendor.discovery?.shape === 'google') return {};
  void url;
  return { authorization: `Bearer ${apiKey}` };
}

/**
 * The models for one vendor. Curated vendors answer from the catalog
 * without a request; keyed vendors are not called without a key; every
 * failure is a sentence, never a throw.
 */
export async function discoverModels(vendor: Vendor, opts: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  if (vendor.models === 'curated') {
    return { models: (vendor.curated ?? []).map(m => model(m.id, m.contextTokens)), source: 'curated' };
  }
  if (vendor.models === 'none' || vendor.discovery === undefined) {
    return { models: [], source: 'list', error: `${vendor.name} does not publish a model list; type the model id.` };
  }
  const needsKey = vendor.auth === 'apikey' && vendor.locality !== 'local' && vendor.prefix !== 'openai-compatible';
  if (needsKey && (opts.apiKey === undefined || opts.apiKey === '')) {
    return { models: [], source: 'list', error: `No key for ${vendor.name} yet.` };
  }
  const url0 = listingURL(vendor, opts.baseURL);
  if (url0 === null) return { models: [], source: 'list', error: `${vendor.name} needs a base URL before its models can be listed.` };
  const url = vendor.discovery.shape === 'google' && opts.apiKey !== undefined ? `${url0}${url0.includes('?') ? '&' : '?'}key=${encodeURIComponent(opts.apiKey)}` : url0;
  const doFetch = opts.fetch ?? fetch;
  try {
    const res = await doFetch(url, { headers: { accept: 'application/json', ...authHeaders(vendor, opts.apiKey, url) }, signal: AbortSignal.timeout(opts.timeoutMs ?? DISCOVERY_TIMEOUT_MS) });
    if (!res.ok) {
      const why = res.status === 401 || res.status === 403 ? `the key was refused by ${vendor.name}` : `${vendor.name} answered ${res.status}`;
      return { models: [], source: 'list', error: `Could not list models: ${why}.` };
    }
    const bodyJson: unknown = await res.json();
    const models = parseListing(vendor.discovery.shape, bodyJson);
    if (models.length === 0) return { models, source: 'list', error: `Could not list models: ${vendor.name} returned none.` };
    return { models, source: 'list' };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const reason = timedOut ? `${vendor.name} did not answer in time` : err instanceof Error ? err.message : String(err);
    return { models: [], source: 'list', error: `Could not list models: ${reason}.` };
  }
}

/** A ten-minute memory of listings, keyed by vendor and base URL, so a
 * Settings page that re-renders does not re-ask the vendor. */
export class DiscoveryCache {
  private readonly entries = new Map<string, { at: number; result: DiscoveryResult }>();
  constructor(private readonly ttlMs = 10 * 60_000, private readonly now: () => number = () => Date.now()) {}

  key(vendorPrefix: string, baseURL: string | undefined): string {
    return `${vendorPrefix}|${baseURL ?? ''}`;
  }

  get(key: string): DiscoveryResult | null {
    const hit = this.entries.get(key);
    if (hit === undefined) return null;
    if (this.now() - hit.at > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    return hit.result;
  }

  set(key: string, result: DiscoveryResult): void {
    // A failure is not worth remembering: the next look should try again.
    if (result.error !== undefined) return;
    this.entries.set(key, { at: this.now(), result });
  }
}
