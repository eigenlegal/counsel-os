/**
 * The vendor catalog, as the UI knows it. COPIED from
 * `runtime/src/providers/vendors.ts` (names, connections, localities, who
 * receives the text, key variables); a change there is a change here. The
 * plate, the switcher, Settings' rows and the first-run screen all read this
 * one table, and `/health`'s `locality`/`handles` win over it when present.
 */
import type { ProviderInfo } from '../api/types';

export type Locality = 'local' | 'cloud';

export interface VendorRow {
  prefix: string;
  name: string;
  connection: 'subscription' | 'API key' | 'local';
  locality: Locality | 'by-baseURL';
  /** Who receives the text (cloud vendors only). */
  company?: string;
  termsUrl?: string;
  /** The usual environment variable for the key (until the Keychain, step 2). */
  keyEnv?: string;
  getKey?: string;
  /** Shown as a guided start in Settings ("Add Google Gemini"). */
  addLabel?: string;
  /** One sentence for the first-run hints. */
  hint?: string;
}

export const VENDORS: readonly VendorRow[] = [
  { prefix: 'claude-sub', name: 'Claude', connection: 'subscription', locality: 'cloud', company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/consumer-terms' },
  { prefix: 'codex-sub', name: 'ChatGPT', connection: 'subscription', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use' },
  { prefix: 'codex', name: 'ChatGPT', connection: 'subscription', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use' },
  { prefix: 'anthropic', name: 'Claude', connection: 'API key', locality: 'cloud', company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/commercial-terms', keyEnv: 'ANTHROPIC_API_KEY', getKey: 'https://console.anthropic.com/settings/keys', addLabel: 'Add Claude (API key)' },
  { prefix: 'openai', name: 'OpenAI', connection: 'API key', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/business-terms', keyEnv: 'OPENAI_API_KEY', getKey: 'https://platform.openai.com/api-keys', addLabel: 'Add OpenAI provider' },
  { prefix: 'google', name: 'Google', connection: 'API key', locality: 'cloud', company: 'Google', termsUrl: 'https://ai.google.dev/gemini-api/terms', keyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY', getKey: 'https://aistudio.google.com/apikey', addLabel: 'Add Google Gemini', hint: 'Google Gemini' },
  { prefix: 'mistral', name: 'Mistral', connection: 'API key', locality: 'cloud', company: 'Mistral AI', termsUrl: 'https://mistral.ai/terms', keyEnv: 'MISTRAL_API_KEY', getKey: 'https://console.mistral.ai/api-keys', addLabel: 'Add Mistral', hint: 'Mistral' },
  { prefix: 'groq', name: 'Groq', connection: 'API key', locality: 'cloud', company: 'Groq', termsUrl: 'https://groq.com/terms-of-use', keyEnv: 'GROQ_API_KEY', getKey: 'https://console.groq.com/keys', addLabel: 'Add Groq', hint: 'Groq' },
  { prefix: 'xai', name: 'xAI', connection: 'API key', locality: 'cloud', company: 'xAI', termsUrl: 'https://x.ai/legal/terms-of-service-enterprise', keyEnv: 'XAI_API_KEY', getKey: 'https://console.x.ai', addLabel: 'Add xAI', hint: 'xAI' },
  { prefix: 'openrouter', name: 'OpenRouter', connection: 'API key', locality: 'cloud', company: 'OpenRouter (and the model’s vendor)', termsUrl: 'https://openrouter.ai/terms', keyEnv: 'OPENROUTER_API_KEY', getKey: 'https://openrouter.ai/keys', addLabel: 'Add OpenRouter', hint: 'OpenRouter — one key, many models' },
  { prefix: 'ollama', name: 'Ollama', connection: 'local', locality: 'local' },
  { prefix: 'openai-compatible', name: 'OpenAI-compatible', connection: 'API key', locality: 'by-baseURL' },
];

/** The OpenAI-compatible shape at a known local port (LM Studio). */
export const PRESETS: ReadonlyArray<{ key: string; name: string; baseURL: string; addLabel: string }> = [
  { key: 'lmstudio', name: 'LM Studio', baseURL: 'http://127.0.0.1:1234/v1', addLabel: 'Add LM Studio' },
];

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function isLoopbackURL(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  try {
    return LOOPBACK.has(new URL(raw).hostname);
  } catch {
    return false;
  }
}

export function prefixOf(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(0, slash);
}

export function vendorFor(prefix: string): VendorRow | undefined {
  return VENDORS.find(v => v.prefix === prefix);
}

/** The vendors a lawyer can add with a key — the guided starts and the
 * first-run hints, in the order they are shown. */
export function keyedVendors(): VendorRow[] {
  return VENDORS.filter(v => v.addLabel !== undefined);
}

export interface DataLine {
  locality: Locality;
  /** `local · nothing leaves this machine` or `cloud · text goes to <Company>`. */
  text: string;
  /** The vendor's terms, when there is a company to read them from. */
  termsUrl: string | null;
}

/**
 * The data-handling line (providers spec §6) for a provider id and base URL,
 * from the table alone. `/health` carries the runtime's own answer; prefer
 * `dataLineOf` with it when it is in hand.
 */
export function dataLineFor(id: string, baseURL?: string): DataLine | null {
  const vendor = vendorFor(prefixOf(id));
  if (vendor === undefined) return null;
  const locality: Locality = vendor.locality === 'by-baseURL' ? (isLoopbackURL(baseURL) ? 'local' : 'cloud') : vendor.locality;
  if (locality === 'local') return { locality, text: 'local · nothing leaves this machine', termsUrl: null };
  let company = vendor.company;
  if (company === undefined) {
    try {
      company = new URL(baseURL ?? '').host;
    } catch {
      company = undefined;
    }
  }
  return { locality, text: `cloud · text goes to ${company ?? 'the server you named'}`, termsUrl: vendor.termsUrl ?? null };
}

/** The same line from `/health`'s word, falling back to the table. */
export function dataLineOf(info: ProviderInfo | undefined, id: string): DataLine | null {
  if (info === undefined || info.locality === undefined) return dataLineFor(id);
  if (info.locality === 'local') return { locality: 'local', text: 'local · nothing leaves this machine', termsUrl: null };
  const company = info.handles?.company ?? vendorFor(prefixOf(id))?.company ?? 'the server you named';
  const termsUrl = info.handles?.termsUrl ?? vendorFor(prefixOf(id))?.termsUrl ?? null;
  return { locality: 'cloud', text: `cloud · text goes to ${company}`, termsUrl: termsUrl === '' ? null : termsUrl };
}
