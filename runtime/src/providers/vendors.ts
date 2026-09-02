/**
 * The vendor catalog (providers spec §3): one record per provider id prefix.
 *
 * Everything that used to name a vendor by hand — the registry's allowlist,
 * `direct.ts`'s factory branches, the capability defaults, the UI's plate
 * table — reads this instead. A vendor is added here and nowhere else.
 *
 * Keys still arrive from the environment this step (`apiKeyEnv`, else the
 * vendor's `keyEnv`); the factories already take the key explicitly so the
 * secret store (step 2) only changes where it comes from.
 */
import type { LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ai-sdk-ollama';
import type { Capabilities, Locality } from '../core/types';

/** Who receives the text when a cloud vendor answers, and where they say
 * what they do with it. `null` for anything that stays on this machine. */
export interface VendorHandles {
  company: string;
  termsUrl: string;
}

export interface VendorModel {
  id: string;
  contextTokens: number;
}

export interface MakeOptions {
  /** The model id after the prefix — `gemini-2.5-pro`, `gemma4:e4b`. */
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface Vendor {
  prefix: string;
  /** The name a lawyer knows: `Claude`, `OpenAI`, `Google`. */
  name: string;
  kind: 'direct' | 'harness';
  auth: Capabilities['auth'];
  /** `by-baseURL` for the OpenAI-compatible shape: loopback is local. */
  locality: Locality | 'by-baseURL';
  handles: VendorHandles | null;
  /** The environment variable the key is read from when the entry names
   * none (step 2 adds the secret store in front of it). */
  keyEnv?: string;
  keyLabel?: string;
  help: { getKey?: string; install?: string };
  /** How models are discovered (step 3); `curated` ships a list here. */
  models: 'list' | 'curated' | 'none';
  curated?: VendorModel[];
  /** Capability defaults for the prefix; an entry may refine them. */
  capabilities: Omit<Capabilities, 'auth' | 'locality'>;
  /** Builds the AI SDK model. Absent for the harness tiers. */
  make?: (opts: MakeOptions) => LanguageModel;
  /** The shape needs a base URL (the OpenAI-compatible vendor). */
  requiresBaseURL?: boolean;
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
  { id: 'claude-haiku-4-5-20251001', contextTokens: 200_000 },
];

const VENDORS: Vendor[] = [
  {
    prefix: 'claude-sub',
    name: 'Claude',
    kind: 'harness',
    auth: 'subscription',
    locality: 'cloud',
    handles: { company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/consumer-terms' },
    help: { install: 'https://claude.ai/code' },
    models: 'none',
    capabilities: CLOUD_CAPS,
  },
  {
    prefix: 'codex-sub',
    name: 'ChatGPT',
    kind: 'harness',
    auth: 'subscription',
    locality: 'cloud',
    handles: { company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use' },
    help: { install: 'https://developers.openai.com/codex' },
    models: 'none',
    capabilities: CLOUD_CAPS,
  },
  {
    prefix: 'anthropic',
    name: 'Claude',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/commercial-terms' },
    keyEnv: 'ANTHROPIC_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://console.anthropic.com/settings/keys' },
    models: 'curated',
    curated: ANTHROPIC_MODELS,
    capabilities: CLOUD_CAPS,
    make: ({ model, apiKey, baseURL }) => createAnthropic({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'openai',
    name: 'OpenAI',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'OpenAI', termsUrl: 'https://openai.com/policies/business-terms' },
    keyEnv: 'OPENAI_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://platform.openai.com/api-keys' },
    models: 'list',
    capabilities: CLOUD_CAPS,
    make: ({ model, apiKey, baseURL }) => createOpenAI({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'google',
    name: 'Google',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'Google', termsUrl: 'https://ai.google.dev/gemini-api/terms' },
    keyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://aistudio.google.com/apikey' },
    models: 'list',
    capabilities: { tools: true, caching: true, thinking: true, contextTokens: 1_000_000 },
    make: ({ model, apiKey, baseURL }) => createGoogle({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'mistral',
    name: 'Mistral',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'Mistral AI', termsUrl: 'https://mistral.ai/terms' },
    keyEnv: 'MISTRAL_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://console.mistral.ai/api-keys' },
    models: 'list',
    capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createMistral({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'groq',
    name: 'Groq',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'Groq', termsUrl: 'https://groq.com/terms-of-use' },
    keyEnv: 'GROQ_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://console.groq.com/keys' },
    models: 'list',
    capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createGroq({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'xai',
    name: 'xAI',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    handles: { company: 'xAI', termsUrl: 'https://x.ai/legal/terms-of-service-enterprise' },
    keyEnv: 'XAI_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://console.x.ai' },
    models: 'list',
    capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createXai({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'openrouter',
    name: 'OpenRouter',
    kind: 'direct',
    auth: 'apikey',
    locality: 'cloud',
    // OpenRouter relays to the model's own vendor; its terms say which, per
    // model. The label names the relay, since that is who holds the key.
    handles: { company: 'OpenRouter (and the model’s vendor)', termsUrl: 'https://openrouter.ai/terms' },
    keyEnv: 'OPENROUTER_API_KEY',
    keyLabel: 'API key',
    help: { getKey: 'https://openrouter.ai/keys' },
    models: 'list',
    capabilities: CLOUD_CAPS_NO_CACHE,
    make: ({ model, apiKey, baseURL }) => createOpenRouter({ ...(apiKey === undefined ? {} : { apiKey }), ...(baseURL === undefined ? {} : { baseURL }) })(model),
  },
  {
    prefix: 'ollama',
    name: 'Ollama',
    kind: 'direct',
    auth: 'local',
    locality: 'local',
    handles: null,
    help: { install: 'https://ollama.com/download' },
    models: 'list',
    capabilities: LOCAL_CAPS,
    make: ({ model, baseURL }) => createOllama(baseURL === undefined ? {} : { baseURL })(model),
  },
  {
    prefix: 'openai-compatible',
    name: 'OpenAI-compatible',
    kind: 'direct',
    auth: 'apikey',
    locality: 'by-baseURL',
    handles: null,
    keyLabel: 'API key (if the server wants one)',
    help: {},
    models: 'list',
    capabilities: LOCAL_CAPS,
    requiresBaseURL: true,
    make: ({ model, apiKey, baseURL }) => createOpenAICompatible({ name: model, baseURL: baseURL ?? '', ...(apiKey === undefined ? {} : { apiKey }) })(model),
  },
];

const BY_PREFIX = new Map(VENDORS.map(v => [v.prefix, v]));

/** LM Studio and friends: the OpenAI-compatible shape at a known local port
 * (spec §3). A preset fills a row; the prefix stays `openai-compatible`. */
export const PRESETS: ReadonlyArray<{ key: string; name: string; prefix: 'openai-compatible'; baseURL: string }> = [
  { key: 'lmstudio', name: 'LM Studio', prefix: 'openai-compatible', baseURL: 'http://127.0.0.1:1234/v1' },
];

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

/** Where the text goes for this vendor and base URL. */
export function localityFor(vendor: Vendor, baseURL?: string): Locality {
  if (vendor.locality !== 'by-baseURL') return vendor.locality;
  return isLoopbackURL(baseURL) ? 'local' : 'cloud';
}

/** The company receiving the text, or `null` when it stays here. An
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
