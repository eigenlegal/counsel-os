/**
 * The vendor catalog (providers spec §3), in two layers:
 *
 * - **Layer A — SDK-native vendors.** One record per id prefix with a `make`
 *   factory from the vendor's official AI SDK package. Adding one is code
 *   (a package and a factory).
 * - **Layer B — OpenAI-compatible presets.** Data rows over the one
 *   `openai-compatible` provider: a prefix, a name, a base URL, where the
 *   key comes from, where the terms are, and whether the text stays on this
 *   machine. Adding a host is a row, not code. A preset id such as
 *   `moonshot/kimi-k2` resolves to an OpenAI-compatible provider at the
 *   preset's base URL; a bare `openai-compatible/<name>` with its own base
 *   URL still works.
 *
 * Everything that used to name a vendor by hand — the registry's allowlist,
 * `direct.ts`'s factory branches, the capability defaults, the UI's plate
 * table — reads this instead.
 *
 * Keys still arrive from the environment this step (`apiKeyEnv`, else the
 * vendor's `keyEnv`); the factories already take the key explicitly so the
 * secret store (step 2) only changes where it comes from.
 */
import type { LanguageModel } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { createCerebras } from '@ai-sdk/cerebras';
import { createCohere } from '@ai-sdk/cohere';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createFireworks } from '@ai-sdk/fireworks';
import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createPerplexity } from '@ai-sdk/perplexity';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ai-sdk-ollama';
import type { Capabilities, Locality } from '../core/types';
import type { Discovery } from './discovery';

/** Who receives the text when a cloud vendor answers, and where they say
 * what they do with it. `null` for anything that stays on this machine. */
export interface VendorHandles {
  company: string;
  termsUrl: string;
}

export interface VendorModel {
  id: string;
  /** Absent where the vendor does not publish one. Never guessed: the
   * router compares a task's bar against this number. */
  contextTokens?: number;
}

/** An open model worth trying locally, and why — a starting point, not a
 * ranking (the scoreboard, phase 2, ranks them for the practice's work). */
export interface OpenModel {
  family: string;
  why: string;
}

export interface MakeOptions {
  /** The model id after the prefix — `gemini-2.5-pro`, `gemma4:e4b`. */
  model: string;
  apiKey?: string;
  baseURL?: string;
  /** The non-secret fields of an enterprise vendor (`resourceName`,
   * `region`, `project`, `location`), from the registry entry. */
  extra?: Record<string, string>;
  /** The secret fields (`apiKey`, `accessKeyId`, `serviceAccountJson`),
   * from the store or the environment. Absent → the SDK's own chain. */
  secrets?: Record<string, string>;
}

export type VendorGroup = 'subscription' | 'local' | 'hosted' | 'enterprise';

/**
 * One field an enterprise vendor needs instead of a single key (providers
 * spec §3 step 5). Non-secret fields live on the registry entry (`extra`);
 * secret ones go to the store as one JSON item per provider.
 */
export interface VendorField {
  name: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
  /** A default the row starts with (`us-central1`). */
  default?: string;
  /** The environment variable this field falls back to. */
  env?: string[];
  help?: string;
}

export interface Vendor {
  prefix: string;
  /** The name a lawyer knows: `Claude`, `OpenAI`, `Google`. */
  name: string;
  kind: 'direct' | 'harness';
  /** Which layer the record comes from. */
  layer: 'sdk' | 'preset';
  group: VendorGroup;
  auth: Capabilities['auth'];
  /** `by-baseURL` for the bare OpenAI-compatible shape: loopback is local. */
  locality: Locality | 'by-baseURL';
  handles: VendorHandles | null;
  /** The environment variable the key is read from when the entry names
   * none (step 2 adds the secret store in front of it). */
  keyEnv?: string;
  keyLabel?: string;
  help: { getKey?: string; install?: string; note?: string; setup?: string };
  /** The field set of an enterprise vendor; absent for everything that
   * takes one key or none. */
  fields?: VendorField[];
  /** The vendor's SDK can find credentials on its own (an AWS profile,
   * gcloud ADC) when none are given: `keySet` then reads `default-chain`. */
  defaultChain?: boolean;
  /** How models are discovered (step 3): `list` asks the vendor (see
   * `discovery`), `curated` ships a list here, `none` means type the id. */
  models: 'list' | 'curated' | 'none';
  curated?: VendorModel[];
  /** The listing's shape and, when it is not at the base URL, its URL. */
  discovery?: Discovery;
  /** Open models worth starting with (Ollama). */
  openModels?: OpenModel[];
  /** Capability defaults for the prefix; an entry may refine them. */
  capabilities: Omit<Capabilities, 'auth' | 'locality'>;
  /** Builds the AI SDK model. Absent for the harness tiers. */
  make?: (opts: MakeOptions) => LanguageModel;
  /** The preset's base URL, used when the entry names none. */
  defaultBaseURL?: string;
  /** The base URL has fields the user must fill (`{account_id}`); the entry
   * must carry the completed URL. */
  baseURLFields?: string[];
  /** The bare shape needs a base URL on the entry. */
  requiresBaseURL?: boolean;
  /** The base URL could not be verified against the vendor's docs when the
   * row was written; the UI says so. */
  unverified?: boolean;
}

/** Hosts a base URL may name and still count as this machine. Compared
 * whole, so `127.0.0.1.attacker.example` is not one of them. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function isLoopbackURL(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(raw).hostname);
  } catch {
    return false;
  }
}

const CLOUD_CAPS = { tools: true, caching: true, thinking: true, contextTokens: 200_000 } as const;
const CLOUD_CAPS_NO_CACHE = { tools: true, caching: false, thinking: true, contextTokens: 128_000 } as const;
const LOCAL_CAPS = { tools: true, caching: false, thinking: false, contextTokens: 32_000 } as const;

/** Anthropic has no models endpoint; the ids a lawyer would pick, by hand. */
const ANTHROPIC_MODELS: VendorModel[] = [
  { id: 'claude-opus-5', contextTokens: 200_000 },
  { id: 'claude-sonnet-5', contextTokens: 200_000 },
  { id: 'claude-fable-5-1' },
  { id: 'claude-haiku-4-5-20251001', contextTokens: 200_000 },
];

/**
 * What the Codex CLI answers to (`codex --model`), from OpenAI's own docs:
 * https://learn.chatgpt.com/docs/models. It publishes no listing endpoint,
 * so this is the list — and it IS a list. Saying "ChatGPT does not publish
 * a model list" was us never having looked.
 */
const CODEX_MODELS: VendorModel[] = [
  { id: 'gpt-5.6-sol' },
  { id: 'gpt-5.6-terra' },
  { id: 'gpt-5.6-luna' },
  { id: 'gpt-5.5' },
];

/** xAI documents no listing endpoint; the ids from its models page. */
const XAI_MODELS: VendorModel[] = [
  { id: 'grok-4', contextTokens: 256_000 },
  { id: 'grok-4-fast', contextTokens: 2_000_000 },
  { id: 'grok-3', contextTokens: 131_072 },
  { id: 'grok-3-mini', contextTokens: 131_072 },
];

/** Perplexity has no listing endpoint; the Sonar family. */
const PERPLEXITY_MODELS: VendorModel[] = [
  { id: 'sonar', contextTokens: 128_000 },
  { id: 'sonar-pro', contextTokens: 200_000 },
  { id: 'sonar-reasoning-pro', contextTokens: 128_000 },
  { id: 'sonar-deep-research', contextTokens: 128_000 },
];

/** DeepInfra documents no OpenAI-shaped listing; a few open models it hosts. */
const DEEPINFRA_MODELS: VendorModel[] = [
  { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', contextTokens: 1_000_000 },
  { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', contextTokens: 262_144 },
  { id: 'deepseek-ai/DeepSeek-V3.1', contextTokens: 163_840 },
  { id: 'openai/gpt-oss-120b', contextTokens: 131_072 },
];

/** Good starting points for a local model; the scoreboard (phase 2) ranks
 * them for the practice's own work. Tool use and a long context are what
 * counsel's loop needs. */
const OPEN_MODELS: OpenModel[] = [
  { family: 'Qwen3', why: 'tool use, long context, strong on structured drafting' },
  { family: 'Llama 4', why: 'tool use, very long context' },
  { family: 'gpt-oss', why: 'tool use, reasoning, permissive licence' },
  { family: 'Gemma', why: 'small and quick; fine for search and summaries' },
  { family: 'DeepSeek-R1 distills', why: 'reasoning on modest hardware' },
  { family: 'Mistral Small', why: 'tool use, European vendor' },
];

function keyed(apiKey: string | undefined, baseURL: string | undefined): { apiKey?: string; baseURL?: string } {
  return { ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) };
}

/** Only the entries that are set: the SDKs treat `undefined` and absent
 * alike, but an explicit `''` would override their own environment read. */
function present(o: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') out[k] = v;
  return out;
}

/** Gemini on Vertex and Claude on Vertex are two SDK factories with one
 * credential shape; the model id says which. */
export function isVertexAnthropicModel(model: string): boolean {
  return model.startsWith('claude-') || model.startsWith('anthropic/');
}

/** Claude models on Vertex; Gemini models, and the express-mode key, both
 * documented on the Vertex model garden. Curated: Vertex has no listing a
 * key alone can reach. */
const VERTEX_MODELS: VendorModel[] = [
  { id: 'gemini-2.5-pro', contextTokens: 1_000_000 },
  { id: 'gemini-2.5-flash', contextTokens: 1_000_000 },
  { id: 'claude-opus-5@20260615', contextTokens: 200_000 },
  { id: 'claude-sonnet-5@20260615', contextTokens: 200_000 },
  { id: 'claude-haiku-4-5@20251001', contextTokens: 200_000 },
];

/** Bedrock's foundation models are listed by a signed control-plane call
 * (see `discovery.ts`); these are the fallback when no credentials can
 * sign one. Cross-region inference profiles (`us.`) are what Bedrock
 * recommends for the Anthropic models. */
const BEDROCK_MODELS: VendorModel[] = [
  { id: 'us.anthropic.claude-opus-5-v1:0', contextTokens: 200_000 },
  { id: 'us.anthropic.claude-sonnet-5-v1:0', contextTokens: 200_000 },
  { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', contextTokens: 200_000 },
  { id: 'us.amazon.nova-pro-v1:0', contextTokens: 300_000 },
  { id: 'us.meta.llama4-maverick-17b-instruct-v1:0', contextTokens: 1_000_000 },
];

/** The enterprise field sets (providers spec §3 step 5). Secret fields go
 * to the store as one item; the rest sit on the registry entry. `env` is
 * the fallback for headless use, in the order the SDK itself reads. */
const AZURE_FIELDS: VendorField[] = [
  { name: 'resourceName', label: 'Resource name', secret: false, required: true, placeholder: 'my-firm-openai', env: ['AZURE_RESOURCE_NAME'], help: 'The Azure OpenAI resource; requests go to https://<resource>.openai.azure.com.' },
  { name: 'apiVersion', label: 'API version', secret: false, required: false, placeholder: 'v1', env: ['AZURE_OPENAI_API_VERSION'], help: 'Leave empty for the v1 API; set it only if your resource needs a dated version.' },
  { name: 'apiKey', label: 'API key', secret: true, required: true, env: ['AZURE_OPENAI_API_KEY', 'AZURE_API_KEY'] },
];
const BEDROCK_FIELDS: VendorField[] = [
  { name: 'region', label: 'Region', secret: false, required: true, placeholder: 'us-east-1', env: ['AWS_REGION', 'AWS_DEFAULT_REGION'] },
  { name: 'profile', label: 'AWS profile (optional)', secret: false, required: false, placeholder: 'default', env: ['AWS_PROFILE'], help: 'A named profile from ~/.aws/credentials, instead of pasting keys.' },
  { name: 'accessKeyId', label: 'Access key id', secret: true, required: false, env: ['AWS_ACCESS_KEY_ID'] },
  { name: 'secretAccessKey', label: 'Secret access key', secret: true, required: false, env: ['AWS_SECRET_ACCESS_KEY'] },
  { name: 'sessionToken', label: 'Session token (optional)', secret: true, required: false, env: ['AWS_SESSION_TOKEN'] },
  { name: 'apiKey', label: 'Bedrock API key (alternative to AWS keys)', secret: true, required: false, env: ['AWS_BEARER_TOKEN_BEDROCK'] },
];
const VERTEX_FIELDS: VendorField[] = [
  { name: 'project', label: 'Project', secret: false, required: true, placeholder: 'my-firm-project', env: ['GOOGLE_VERTEX_PROJECT', 'GOOGLE_CLOUD_PROJECT'] },
  { name: 'location', label: 'Location', secret: false, required: true, default: 'us-central1', placeholder: 'us-central1', env: ['GOOGLE_VERTEX_LOCATION', 'GOOGLE_CLOUD_LOCATION'] },
  { name: 'serviceAccountJson', label: 'Service account JSON (optional)', secret: true, required: false, env: ['GOOGLE_APPLICATION_CREDENTIALS'], help: 'Paste the key file’s contents; leave empty to use gcloud’s Application Default Credentials.' },
  { name: 'apiKey', label: 'Express-mode API key (optional)', secret: true, required: false, env: ['GOOGLE_VERTEX_API_KEY'] },
];

function vertexAuth(secrets: Record<string, string>): { googleAuthOptions?: { credentials: Record<string, unknown> } } {
  const raw = secrets['serviceAccountJson'];
  if (raw === undefined || raw === '') return {};
  try {
    return { googleAuthOptions: { credentials: JSON.parse(raw) as Record<string, unknown> } };
  } catch {
    throw new Error('vertex: the service account JSON does not parse');
  }
}

// ── Layer A: SDK-native vendors ────────────────────────────────────────────

const SDK_VENDORS: Vendor[] = [
  {
    prefix: 'claude-sub', name: 'Claude', kind: 'harness', layer: 'sdk', group: 'subscription', auth: 'subscription', locality: 'cloud',
    handles: { company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/consumer-terms' },
    help: { install: 'https://claude.ai/code' }, models: 'curated', curated: ANTHROPIC_MODELS, capabilities: CLOUD_CAPS,
  },
  {
    prefix: 'codex-sub', name: 'ChatGPT', kind: 'harness', layer: 'sdk', group: 'subscription', auth: 'subscription', locality: 'cloud',
    handles: { company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use' },
    help: { install: 'https://developers.openai.com/codex' }, models: 'curated', curated: CODEX_MODELS, capabilities: CLOUD_CAPS,
  },
  {
    prefix: 'anthropic', name: 'Claude', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/commercial-terms' },
    keyEnv: 'ANTHROPIC_API_KEY', keyLabel: 'API key', help: { getKey: 'https://console.anthropic.com/settings/keys' },
    // Anthropic publishes `/v1/models`, so the list is whatever the account
    // can actually call — every Claude, not the three we happened to write
    // down. The curated set stands in when the call fails.
    models: 'list', discovery: { shape: 'anthropic' }, curated: ANTHROPIC_MODELS, capabilities: CLOUD_CAPS,
    make: ({ model, apiKey, baseURL }) => createAnthropic(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'openai', name: 'OpenAI', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'OpenAI', termsUrl: 'https://openai.com/policies/business-terms' },
    keyEnv: 'OPENAI_API_KEY', keyLabel: 'API key', help: { getKey: 'https://platform.openai.com/api-keys' },
    models: 'list', discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS,
    make: ({ model, apiKey, baseURL }) => createOpenAI(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'google', name: 'Google', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Google', termsUrl: 'https://ai.google.dev/gemini-api/terms' },
    keyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY', keyLabel: 'API key', help: { getKey: 'https://aistudio.google.com/apikey' },
    models: 'list', discovery: { shape: 'google' }, capabilities: { tools: true, caching: true, thinking: true, contextTokens: 1_000_000 },
    make: ({ model, apiKey, baseURL }) => createGoogle(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'mistral', name: 'Mistral', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Mistral AI', termsUrl: 'https://mistral.ai/terms' },
    keyEnv: 'MISTRAL_API_KEY', keyLabel: 'API key', help: { getKey: 'https://console.mistral.ai/api-keys' },
    models: 'list', discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createMistral(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'groq', name: 'Groq', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Groq', termsUrl: 'https://groq.com/terms-of-use' },
    keyEnv: 'GROQ_API_KEY', keyLabel: 'API key', help: { getKey: 'https://console.groq.com/keys' },
    models: 'list', discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createGroq(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'xai', name: 'xAI', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'xAI', termsUrl: 'https://x.ai/legal/terms-of-service-enterprise' },
    keyEnv: 'XAI_API_KEY', keyLabel: 'API key', help: { getKey: 'https://console.x.ai' },
    models: 'curated', curated: XAI_MODELS, discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createXai(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'deepseek', name: 'DeepSeek', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'DeepSeek', termsUrl: 'https://platform.deepseek.com/' },
    keyEnv: 'DEEPSEEK_API_KEY', keyLabel: 'API key', help: { getKey: 'https://platform.deepseek.com/api_keys' },
    models: 'list', discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createDeepSeek(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'cohere', name: 'Cohere', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Cohere', termsUrl: 'https://cohere.com/terms-of-use' },
    keyEnv: 'COHERE_API_KEY', keyLabel: 'API key', help: { getKey: 'https://dashboard.cohere.com/api-keys' },
    models: 'list', discovery: { shape: 'cohere' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createCohere(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'perplexity', name: 'Perplexity', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Perplexity', termsUrl: 'https://www.perplexity.ai/hub/legal/terms-of-service' },
    keyEnv: 'PERPLEXITY_API_KEY', keyLabel: 'API key', help: { getKey: 'https://www.perplexity.ai/settings/api' },
    models: 'curated', curated: PERPLEXITY_MODELS, discovery: { shape: 'openai' }, capabilities: { tools: false, caching: false, thinking: false, contextTokens: 128_000 },
    make: ({ model, apiKey, baseURL }) => createPerplexity(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'togetherai', name: 'Together AI', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Together AI', termsUrl: 'https://www.together.ai/terms-of-service' },
    keyEnv: 'TOGETHER_AI_API_KEY', keyLabel: 'API key', help: { getKey: 'https://api.together.ai/settings/api-keys' },
    models: 'list', discovery: { shape: 'together' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createTogetherAI(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'fireworks', name: 'Fireworks', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Fireworks AI', termsUrl: 'https://fireworks.ai/terms-of-service' },
    keyEnv: 'FIREWORKS_API_KEY', keyLabel: 'API key', help: { getKey: 'https://fireworks.ai/account/api-keys' },
    models: 'list', discovery: { shape: 'openai', unverified: true }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createFireworks(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'deepinfra', name: 'DeepInfra', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'DeepInfra', termsUrl: 'https://deepinfra.com/terms' },
    keyEnv: 'DEEPINFRA_API_KEY', keyLabel: 'API key', help: { getKey: 'https://deepinfra.com/dash/api_keys' },
    models: 'curated', curated: DEEPINFRA_MODELS, discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createDeepInfra(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'cerebras', name: 'Cerebras', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    handles: { company: 'Cerebras', termsUrl: 'https://www.cerebras.ai/terms-of-service' },
    keyEnv: 'CEREBRAS_API_KEY', keyLabel: 'API key', help: { getKey: 'https://cloud.cerebras.ai/platform' },
    models: 'list', discovery: { shape: 'openai' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createCerebras(keyed(apiKey, baseURL))(model),
  },
  {
    prefix: 'openrouter', name: 'OpenRouter', kind: 'direct', layer: 'sdk', group: 'hosted', auth: 'apikey', locality: 'cloud',
    // OpenRouter relays to the model's own vendor; its terms say which, per
    // model. The label names the relay, since that is who holds the key.
    handles: { company: 'OpenRouter (and the model’s vendor)', termsUrl: 'https://openrouter.ai/terms' },
    keyEnv: 'OPENROUTER_API_KEY', keyLabel: 'API key', help: { getKey: 'https://openrouter.ai/keys', note: 'One key, many models.' },
    models: 'list', discovery: { shape: 'openrouter' }, capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createOpenRouter(keyed(apiKey, baseURL))(model),
  },
  // ── enterprise: credentials that are not one API key (spec §3 step 5) ──
  {
    prefix: 'azure', name: 'Azure OpenAI', kind: 'direct', layer: 'sdk', group: 'enterprise', auth: 'azure', locality: 'cloud',
    handles: { company: 'Microsoft (Azure OpenAI)', termsUrl: 'https://learn.microsoft.com/legal/cognitive-services/openai/data-privacy' },
    help: { setup: 'https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource', note: 'The model id is your deployment name.' },
    fields: AZURE_FIELDS, models: 'list', discovery: { shape: 'azure', unverified: true }, capabilities: CLOUD_CAPS,
    make: ({ model, baseURL, extra = {}, secrets = {} }) =>
      createAzure({ ...present({ resourceName: extra['resourceName'], apiVersion: extra['apiVersion'], apiKey: secrets['apiKey'], baseURL }) })(model),
  },
  {
    prefix: 'bedrock', name: 'Amazon Bedrock', kind: 'direct', layer: 'sdk', group: 'enterprise', auth: 'sigv4', locality: 'cloud',
    handles: { company: 'Amazon Web Services (Bedrock)', termsUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html' },
    help: { setup: 'https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html', note: 'The model id is a Bedrock model id or inference profile, e.g. us.anthropic.claude-sonnet-5-v1:0.' },
    fields: BEDROCK_FIELDS, defaultChain: true, models: 'list', discovery: { shape: 'bedrock' }, curated: BEDROCK_MODELS, capabilities: CLOUD_CAPS,
    make: ({ model, baseURL, extra = {}, secrets = {} }) =>
      createAmazonBedrock({ ...present({ region: extra['region'], apiKey: secrets['apiKey'], accessKeyId: secrets['accessKeyId'], secretAccessKey: secrets['secretAccessKey'], sessionToken: secrets['sessionToken'], baseURL }) })(model),
  },
  {
    prefix: 'vertex', name: 'Google Vertex AI', kind: 'direct', layer: 'sdk', group: 'enterprise', auth: 'gcp', locality: 'cloud',
    handles: { company: 'Google Cloud (Vertex AI)', termsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance' },
    help: { setup: 'https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart', note: 'Gemini and Claude models; a Claude id (claude-…) goes through the Anthropic-on-Vertex endpoint.' },
    fields: VERTEX_FIELDS, defaultChain: true, models: 'curated', curated: VERTEX_MODELS, capabilities: { tools: true, caching: true, thinking: true, contextTokens: 1_000_000 },
    make: ({ model, baseURL, extra = {}, secrets = {} }) => {
      const common = present({ project: extra['project'], location: extra['location'], baseURL });
      const auth = vertexAuth(secrets);
      if (isVertexAnthropicModel(model)) return createVertexAnthropic({ ...common, ...auth })(model.replace(/^anthropic\//, ''));
      return createVertex({ ...common, ...present({ apiKey: secrets['apiKey'] }), ...auth })(model);
    },
  },
  {
    prefix: 'ollama', name: 'Ollama', kind: 'direct', layer: 'sdk', group: 'local', auth: 'local', locality: 'local', handles: null,
    help: { install: 'https://ollama.com/download' }, models: 'list', discovery: { shape: 'ollama' }, openModels: OPEN_MODELS, capabilities: LOCAL_CAPS,
    make: ({ model, baseURL }) => createOllama(baseURL === undefined ? {} : { baseURL })(model),
  },
  {
    prefix: 'openai-compatible', name: 'OpenAI-compatible', kind: 'direct', layer: 'sdk', group: 'local', auth: 'apikey', locality: 'by-baseURL', handles: null,
    keyLabel: 'API key (if the server wants one)', help: {}, models: 'list', discovery: { shape: 'openai' }, capabilities: LOCAL_CAPS, requiresBaseURL: true,
    make: ({ model, apiKey, baseURL }) => createOpenAICompatible({ name: model, baseURL: baseURL ?? '', ...(apiKey === undefined ? {} : { apiKey }) })(model),
  },
];

// ── Layer B: OpenAI-compatible presets (data rows) ─────────────────────────

export interface Preset {
  prefix: string;
  name: string;
  group: 'local' | 'hosted';
  baseURL: string;
  /** Fields in the base URL the user must fill (`{account_id}`). */
  baseURLFields?: string[];
  keyEnv?: string;
  keyLabel?: string;
  getKey?: string;
  handles: VendorHandles | null;
  note?: string;
  capabilities?: Partial<Omit<Capabilities, 'auth' | 'locality'>>;
  /** Not confirmed against the vendor's docs when written. */
  unverified?: boolean;
}

/**
 * Base URLs checked against each vendor's documentation on 2026-09-01
 * unless marked `unverified`. Local runners are loopback by construction
 * and always local.
 */
export const PRESETS: readonly Preset[] = [
  // hosted
  { prefix: 'moonshot', name: 'Kimi (Moonshot)', group: 'hosted', baseURL: 'https://api.moonshot.ai/v1', keyEnv: 'MOONSHOT_API_KEY', keyLabel: 'API key', getKey: 'https://platform.kimi.ai/console/api-keys', handles: { company: 'Moonshot AI', termsUrl: 'https://platform.kimi.ai/' } },
  { prefix: 'zhipu', name: 'GLM (Z.ai / Zhipu)', group: 'hosted', baseURL: 'https://api.z.ai/api/paas/v4/', keyEnv: 'ZAI_API_KEY', keyLabel: 'API key', getKey: 'https://z.ai/manage-apikey/apikey-list', handles: { company: 'Z.ai (Zhipu)', termsUrl: 'https://docs.z.ai/' }, note: 'International endpoint; the China endpoint is https://open.bigmodel.cn/api/paas/v4 — set it as the base URL if your key is from there.' },
  { prefix: 'dashscope', name: 'Qwen (Alibaba Model Studio)', group: 'hosted', baseURL: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1', keyEnv: 'DASHSCOPE_API_KEY', keyLabel: 'API key', getKey: 'https://modelstudio.console.alibabacloud.com/', handles: { company: 'Alibaba Cloud', termsUrl: 'https://www.alibabacloud.com/help/en/model-studio/' }, note: 'US region. Keys are per region; Singapore and China use region-specific base URLs from the console.' },
  { prefix: 'sambanova', name: 'SambaNova', group: 'hosted', baseURL: 'https://api.sambanova.ai/v1', keyEnv: 'SAMBANOVA_API_KEY', keyLabel: 'API key', getKey: 'https://cloud.sambanova.ai/', handles: { company: 'SambaNova', termsUrl: 'https://sambanova.ai/terms' }, unverified: true },
  { prefix: 'baseten', name: 'Baseten', group: 'hosted', baseURL: 'https://inference.baseten.co/v1', keyEnv: 'BASETEN_API_KEY', keyLabel: 'API key', getKey: 'https://app.baseten.co/settings/api_keys', handles: { company: 'Baseten', termsUrl: 'https://www.baseten.co/terms-of-service' } },
  { prefix: 'huggingface', name: 'Hugging Face', group: 'hosted', baseURL: 'https://router.huggingface.co/v1', keyEnv: 'HF_TOKEN', keyLabel: 'Access token', getKey: 'https://huggingface.co/settings/tokens', handles: { company: 'Hugging Face (and the inference provider it routes to)', termsUrl: 'https://huggingface.co/terms-of-service' }, note: 'One token, many open models; the model id may end in :fastest, :cheapest or a provider name.' },
  { prefix: 'cloudflare', name: 'Cloudflare Workers AI', group: 'hosted', baseURL: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1', baseURLFields: ['account_id'], keyEnv: 'CLOUDFLARE_API_TOKEN', keyLabel: 'API token', getKey: 'https://dash.cloudflare.com/profile/api-tokens', handles: { company: 'Cloudflare', termsUrl: 'https://www.cloudflare.com/terms/' } },
  { prefix: 'replicate', name: 'Replicate', group: 'hosted', baseURL: 'https://api.replicate.com/v1', keyEnv: 'REPLICATE_API_TOKEN', keyLabel: 'API token', getKey: 'https://replicate.com/account/api-tokens', handles: { company: 'Replicate', termsUrl: 'https://replicate.com/terms' }, unverified: true, note: 'No OpenAI-compatible chat endpoint was found in Replicate’s docs; Hugging Face’s router reaches Replicate-hosted models.' },
  // local
  { prefix: 'lmstudio', name: 'LM Studio', group: 'local', baseURL: 'http://127.0.0.1:1234/v1', handles: null },
  { prefix: 'llamacpp', name: 'llama.cpp server', group: 'local', baseURL: 'http://127.0.0.1:8080/v1', handles: null },
  { prefix: 'vllm', name: 'vLLM', group: 'local', baseURL: 'http://127.0.0.1:8000/v1', handles: null },
  { prefix: 'mlx', name: 'MLX (mlx_lm.server)', group: 'local', baseURL: 'http://127.0.0.1:8080/v1', handles: null },
  { prefix: 'jan', name: 'Jan', group: 'local', baseURL: 'http://127.0.0.1:1337/v1', handles: null },
  { prefix: 'gpt4all', name: 'GPT4All', group: 'local', baseURL: 'http://127.0.0.1:4891/v1', handles: null },
];

/** A preset as a `Vendor`: the OpenAI-compatible shape at the preset's URL. */
function vendorFromPreset(p: Preset): Vendor {
  const local = p.group === 'local';
  return {
    prefix: p.prefix,
    name: p.name,
    kind: 'direct',
    layer: 'preset',
    group: p.group,
    auth: local ? 'local' : 'apikey',
    locality: local ? 'local' : 'cloud',
    handles: local ? null : p.handles,
    ...(p.keyEnv === undefined ? {} : { keyEnv: p.keyEnv }),
    ...(p.keyLabel === undefined ? {} : { keyLabel: p.keyLabel }),
    help: { ...(p.getKey === undefined ? {} : { getKey: p.getKey }), ...(p.note === undefined ? {} : { note: p.note }) },
    models: 'list',
    discovery: { shape: 'openai', ...(p.unverified === true ? { unverified: true } : {}) },
    capabilities: { ...(local ? LOCAL_CAPS : CLOUD_CAPS_NO_CACHE), ...p.capabilities },
    defaultBaseURL: p.baseURL,
    ...(p.baseURLFields === undefined ? {} : { baseURLFields: p.baseURLFields, requiresBaseURL: true }),
    ...(p.unverified === true ? { unverified: true } : {}),
    make: ({ model, apiKey, baseURL }) => createOpenAICompatible({ name: model, baseURL: baseURL ?? p.baseURL, ...(apiKey === undefined ? {} : { apiKey }) })(model),
  };
}

const VENDORS: Vendor[] = [...SDK_VENDORS, ...PRESETS.map(vendorFromPreset)];
const BY_PREFIX = new Map(VENDORS.map(v => [v.prefix, v]));

export function vendorFor(prefix: string): Vendor | undefined {
  return BY_PREFIX.get(prefix);
}

export function allVendors(): readonly Vendor[] {
  return VENDORS;
}

/** The prefixes the registry accepts, for the "unknown prefix" sentence. */
export function knownPrefixes(): string[] {
  return VENDORS.map(v => v.prefix);
}

/** The id's prefix (before the first `/`), or the whole id. */
export function prefixOf(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(0, slash);
}

/** Where the text goes for this vendor and base URL. A local preset is
 * local whatever the URL says; the bare shape follows its base URL. */
export function localityFor(vendor: Vendor, baseURL?: string): Locality {
  if (vendor.locality !== 'by-baseURL') return vendor.locality;
  return isLoopbackURL(baseURL) ? 'local' : 'cloud';
}

/** The company receiving the text, or `null` when it stays here. A bare
 * OpenAI-compatible endpoint off this machine is "the server you named". */
export function handlesFor(vendor: Vendor, baseURL?: string): VendorHandles | null {
  if (vendor.locality !== 'by-baseURL') return vendor.handles;
  if (isLoopbackURL(baseURL)) return null;
  let host = baseURL ?? '';
  try {
    host = new URL(baseURL ?? '').host;
  } catch {
    // keep the raw string
  }
  return { company: host === '' ? 'the server you named' : host, termsUrl: '' };
}

/** The base URL a provider runs against: the entry's, else the preset's.
 * A template with unfilled fields is refused — the user must complete it. */
export function baseURLFor(vendor: Vendor, entryBaseURL: string | undefined, id: string): string | undefined {
  if (entryBaseURL !== undefined) return entryBaseURL;
  if (vendor.baseURLFields !== undefined && vendor.baseURLFields.length > 0) {
    throw new Error(`${id}: ${vendor.name} needs a baseURL with ${vendor.baseURLFields.map(f => `{${f}}`).join(', ')} filled in (${vendor.defaultBaseURL})`);
  }
  if (vendor.defaultBaseURL !== undefined) return vendor.defaultBaseURL;
  if (vendor.requiresBaseURL === true) throw new Error(`unknown provider: ${vendor.prefix} requires baseURL for ${id}`);
  return undefined;
}
