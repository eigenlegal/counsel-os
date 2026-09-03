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
import { AwsClient } from 'aws4fetch';
import type { Vendor } from './vendors';

/** `azure` lists a resource's deployments; `bedrock` is the SigV4-signed
 * ListFoundationModels (providers spec §3 step 5). */
export type DiscoveryShape = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama' | 'cohere' | 'together' | 'azure' | 'bedrock';

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
  /** An enterprise vendor's resolved fields (`enterprise.ts`): the
   * non-secret ones name where to ask, the secret ones sign the request. */
  extra?: Record<string, string>;
  secrets?: Record<string, string>;
}

export const DISCOVERY_TIMEOUT_MS = 3_000;

/** The deployments listing is the one data-plane call that names a
 * resource's deployments; this is the last API version it ships under. */
export const AZURE_DEPLOYMENTS_API_VERSION = '2023-03-15-preview';

/** The vendor's own API root, for a vendor whose entry names no base URL. */
export const API_ROOTS: Readonly<Record<string, string>> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
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
export function listingURL(vendor: Vendor, baseURL: string | undefined, extra: Record<string, string> = {}): string | null {
  const d = vendor.discovery;
  if (d === undefined) return null;
  if (d.url !== undefined && baseURL === undefined) return d.url;
  if (d.shape === 'azure') {
    const resource = extra['resourceName'];
    const root = baseURL ?? (resource === undefined || resource === '' ? undefined : `https://${resource}.openai.azure.com`);
    return root === undefined ? null : `${trimSlash(root)}/openai/deployments?api-version=${AZURE_DEPLOYMENTS_API_VERSION}`;
  }
  if (d.shape === 'bedrock') {
    const region = extra['region'];
    if (region === undefined || region === '') return null;
    return `https://bedrock.${region}.amazonaws.com/foundation-models?byOutputModality=TEXT`;
  }
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
    // Anthropic's `/v1/models` is OpenAI's envelope with different fields:
    // `{ data: [{ type, id, display_name, created_at }] }`. No window in it,
    // which `withKnownContexts` fills from the catalog where we know one.
    case 'anthropic':
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
    case 'azure': {
      // `{ data: [{ id: <deployment>, model: <underlying model>, status }] }`.
      // The id is what the provider id names after `azure/`.
      const data = Array.isArray(obj['data']) ? (obj['data'] as Array<Record<string, unknown>>) : [];
      for (const m of data) {
        if (typeof m['id'] !== 'string' || m['id'] === '') continue;
        if (typeof m['status'] === 'string' && m['status'] !== 'succeeded') continue;
        out.push(model(m['id']));
      }
      break;
    }
    case 'bedrock': {
      // ListFoundationModels: `{ modelSummaries: [{ modelId, outputModalities,
      // inferenceTypesSupported }] }`. Only text-out, on-demand or profile
      // models are useful here; a provisioned-only model is left out.
      const summaries = Array.isArray(obj['modelSummaries']) ? (obj['modelSummaries'] as Array<Record<string, unknown>>) : [];
      for (const m of summaries) {
        if (typeof m['modelId'] !== 'string' || m['modelId'] === '') continue;
        const outputs = Array.isArray(m['outputModalities']) ? (m['outputModalities'] as unknown[]) : ['TEXT'];
        if (!outputs.includes('TEXT')) continue;
        const kinds = Array.isArray(m['inferenceTypesSupported']) ? (m['inferenceTypesSupported'] as unknown[]) : ['ON_DEMAND'];
        if (!kinds.includes('ON_DEMAND') && !kinds.includes('INFERENCE_PROFILE')) continue;
        out.push(model(m['modelId']));
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
  // Azure takes an `api-key` header; everything else is a bearer.
  if (vendor.discovery?.shape === 'google') return {};
  if (vendor.discovery?.shape === 'azure') return { 'api-key': apiKey };
  // Anthropic takes the key in its own header and requires a version.
  if (vendor.discovery?.shape === 'anthropic') return { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION };
  void url;
  return { authorization: `Bearer ${apiKey}` };
}

/**
 * The context size the catalog knows, for a listing that does not say.
 * Anthropic's `/v1/models` returns ids and display names and no window, and
 * the window is the one number the router compares a task's bar against.
 */
function withKnownContexts(vendor: Vendor, listed: DiscoveredModel[]): DiscoveredModel[] {
  const known = new Map((vendor.curated ?? []).map(m => [m.id, m.contextTokens]));
  return listed.map(m => {
    // Only an exact id we already wrote down. NEVER the vendor's default:
    // the router compares a task's bar against this number, and a model
    // claiming a window it does not have would take work it cannot hold.
    if (m.contextTokens !== undefined) return m;
    const exact = known.get(m.id);
    return exact === undefined ? m : { ...m, contextTokens: exact };
  });
}

/** The version every Anthropic API request carries. */
const ANTHROPIC_VERSION = '2023-06-01';

/** The curated list as a result, for a vendor that could not be asked. */
function curated(vendor: Vendor, error?: string): DiscoveryResult {
  return { models: (vendor.curated ?? []).map(m => model(m.id, m.contextTokens)), source: 'curated', ...(error === undefined ? {} : { error }) };
}

/**
 * The request for an enterprise listing: Azure's key header, Bedrock's
 * SigV4 signature (or its bearer key). `null` when the credentials do not
 * allow one — Bedrock then answers from the catalog.
 */
async function enterpriseRequest(vendor: Vendor, url: string, secrets: Record<string, string>, extra: Record<string, string>): Promise<Request | null> {
  const headers = { accept: 'application/json' };
  if (vendor.discovery?.shape === 'azure') {
    const key = secrets['apiKey'];
    if (key === undefined || key === '') return null;
    return new Request(url, { headers: { ...headers, 'api-key': key } });
  }
  if (vendor.discovery?.shape === 'bedrock') {
    const bearer = secrets['apiKey'];
    if (bearer !== undefined && bearer !== '') return new Request(url, { headers: { ...headers, authorization: `Bearer ${bearer}` } });
    const accessKeyId = secrets['accessKeyId'];
    const secretAccessKey = secrets['secretAccessKey'];
    if (accessKeyId === undefined || secretAccessKey === undefined) return null;
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      ...(secrets['sessionToken'] === undefined ? {} : { sessionToken: secrets['sessionToken'] }),
      service: 'bedrock',
      region: extra['region'] ?? 'us-east-1',
    });
    return client.sign(url, { method: 'GET', headers });
  }
  return null;
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
  const enterprise = vendor.discovery.shape === 'azure' || vendor.discovery.shape === 'bedrock';
  const extra = opts.extra ?? {};
  const url0 = listingURL(vendor, opts.baseURL, extra);
  if (url0 === null) {
    const need = vendor.discovery.shape === 'azure' ? 'a resource name' : vendor.discovery.shape === 'bedrock' ? 'a region' : 'a base URL';
    return { models: [], source: 'list', error: `${vendor.name} needs ${need} before its models can be listed.` };
  }
  const url = vendor.discovery.shape === 'google' && opts.apiKey !== undefined ? `${url0}${url0.includes('?') ? '&' : '?'}key=${encodeURIComponent(opts.apiKey)}` : url0;
  const doFetch = opts.fetch ?? fetch;
  const signal = AbortSignal.timeout(opts.timeoutMs ?? DISCOVERY_TIMEOUT_MS);
  try {
    let res: Response;
    if (enterprise) {
      const req = await enterpriseRequest(vendor, url, opts.secrets ?? {}, extra);
      if (req === null) {
        // Bedrock on the SDK's own chain cannot sign a listing from here;
        // the catalog's list stands in. Azure has nothing to stand in.
        if (vendor.discovery.shape === 'bedrock') return curated(vendor);
        return { models: [], source: 'list', error: `No key for ${vendor.name} yet.` };
      }
      res = await doFetch(req, { signal });
    } else {
      res = await doFetch(url, { headers: { accept: 'application/json', ...authHeaders(vendor, opts.apiKey, url) }, signal });
    }
    if (!res.ok) {
      const why = res.status === 401 || res.status === 403 ? `the ${enterprise ? 'credentials were' : 'key was'} refused by ${vendor.name}` : `${vendor.name} answered ${res.status}`;
      if ((vendor.curated ?? []).length > 0) return curated(vendor, `Could not list models: ${why}. Showing the known ones.`);
      return { models: [], source: 'list', error: `Could not list models: ${why}.` };
    }
    const bodyJson: unknown = await res.json();
    const models = withKnownContexts(vendor, parseListing(vendor.discovery.shape, bodyJson));
    if (models.length === 0) {
      const why = `Could not list models: ${vendor.name} returned none.`;
      return (vendor.curated ?? []).length > 0 ? curated(vendor, `${why} Showing the known ones.`) : { models, source: 'list', error: why };
    }
    return { models, source: 'list' };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    let reason = timedOut ? `${vendor.name} did not answer in time` : err instanceof Error ? err.message : String(err);
    // A transport error can echo the request; nothing secret leaves here.
    for (const v of Object.values(opts.secrets ?? {})) if (v !== '') reason = reason.split(v).join('[redacted]');
    if (opts.apiKey !== undefined && opts.apiKey !== '') reason = reason.split(opts.apiKey).join('[redacted]');
    if ((vendor.curated ?? []).length > 0) return curated(vendor, `Could not list models: ${reason}. Showing the known ones.`);
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
