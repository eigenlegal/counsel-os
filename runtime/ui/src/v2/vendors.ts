/**
 * The vendor catalog, as the UI knows it. COPIED from
 * `runtime/src/providers/vendors.ts` (two layers: SDK-native vendors and
 * OpenAI-compatible presets; names, connections, localities, who receives
 * the text, key variables, groups); a change there is a change here. The
 * plate, the switcher, Settings' rows and picker, and the first-run screen
 * all read this one table, and `/health`'s `locality`/`handles` win over it
 * when present.
 */
import type { ProviderInfo } from '../api/types';

export type Locality = 'local' | 'cloud';
export type VendorGroup = 'subscription' | 'local' | 'hosted' | 'enterprise';

/** One field of an enterprise vendor (providers spec §3 step 5). COPIED
 * from the runtime's `VendorField`. Secret fields are masked and go to the
 * store; the rest sit on the row as `extra`. */
export interface VendorFieldRow {
  name: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
  default?: string;
  help?: string;
}

export interface VendorRow {
  prefix: string;
  /** The vendor's name on the plate. */
  name: string;
  /** What the picker shows when the name alone is ambiguous. */
  label?: string;
  group: VendorGroup;
  /** `fields`: an enterprise credential set instead of one key. */
  connection: 'subscription' | 'API key' | 'local' | 'fields';
  /** The enterprise field set; present only when `connection` is `fields`. */
  fields?: VendorFieldRow[];
  /** The vendor's setup page (enterprise vendors). */
  setup?: string;
  locality: Locality | 'by-baseURL';
  /** Who receives the text (cloud vendors only). */
  company?: string;
  termsUrl?: string;
  /** The usual environment variable for the key (until the Keychain, step 2). */
  keyEnv?: string;
  keyLabel?: string;
  getKey?: string;
  /** A preset's base URL, prefilled on the row. */
  baseURL?: string;
  /** Fields the user must fill in the base URL. */
  baseURLFields?: string[];
  /** One sentence for the picker and the first-run hints. */
  note?: string;
  /** The base URL was not confirmed against the vendor's docs. */
  unverified?: boolean;
  /**
   * The model families this vendor serves, for the picker's search.
   *
   * A lawyer looks for "Llama" or "Gemini", not for "Together AI" — and
   * Meta in particular sells no API at all, so without this the maker whose
   * models half these vendors serve appears nowhere in the app.
   */
  makes?: string[];
}

const S = 'subscription' as const;
const L = 'local' as const;
const H = 'hosted' as const;
const E = 'enterprise' as const;

/** COPIED from the runtime's `AZURE_FIELDS` / `BEDROCK_FIELDS` /
 * `VERTEX_FIELDS`; a change there is a change here. */
export const AZURE_FIELDS: VendorFieldRow[] = [
  { name: 'resourceName', label: 'Resource name', secret: false, required: true, placeholder: 'my-firm-openai', help: 'The Azure OpenAI resource; requests go to https://<resource>.openai.azure.com.' },
  { name: 'apiVersion', label: 'API version', secret: false, required: false, placeholder: 'v1', help: 'Leave empty for the v1 API; set it only if your resource needs a dated version.' },
  { name: 'apiKey', label: 'API key', secret: true, required: true },
];
export const BEDROCK_FIELDS: VendorFieldRow[] = [
  { name: 'region', label: 'Region', secret: false, required: true, placeholder: 'us-east-1' },
  { name: 'profile', label: 'AWS profile (optional)', secret: false, required: false, placeholder: 'default', help: 'A named profile from ~/.aws/credentials, instead of pasting keys.' },
  { name: 'accessKeyId', label: 'Access key id', secret: true, required: false },
  { name: 'secretAccessKey', label: 'Secret access key', secret: true, required: false },
  { name: 'sessionToken', label: 'Session token (optional)', secret: true, required: false },
  { name: 'apiKey', label: 'Bedrock API key (alternative to AWS keys)', secret: true, required: false },
];
export const VERTEX_FIELDS: VendorFieldRow[] = [
  { name: 'project', label: 'Project', secret: false, required: true, placeholder: 'my-firm-project' },
  { name: 'location', label: 'Location', secret: false, required: true, default: 'us-central1', placeholder: 'us-central1' },
  { name: 'serviceAccountJson', label: 'Service account JSON (optional)', secret: true, required: false, help: 'Paste the key file’s contents; leave empty to use gcloud’s Application Default Credentials.' },
  { name: 'apiKey', label: 'Express-mode API key (optional)', secret: true, required: false },
];

export const VENDORS: readonly VendorRow[] = [
  // subscriptions
  { prefix: 'claude-sub', name: 'Claude', group: S, connection: 'subscription', locality: 'cloud', company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/consumer-terms', makes: ['Claude', 'Anthropic'] },
  { prefix: 'codex-sub', name: 'ChatGPT', group: S, connection: 'subscription', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use', makes: ['GPT', 'OpenAI', 'ChatGPT'] },
  { prefix: 'codex', name: 'ChatGPT', group: S, connection: 'subscription', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/terms-of-use', makes: ['GPT', 'OpenAI', 'ChatGPT'] },
  // local runners
  { prefix: 'ollama', name: 'Ollama', group: L, connection: 'local', locality: 'local', note: 'Finish the id with a model from `ollama list`.', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'DeepSeek', 'Mistral', 'gpt-oss', 'Phi', 'Microsoft'] },
  { prefix: 'lmstudio', name: 'LM Studio', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:1234/v1', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'DeepSeek', 'Mistral', 'gpt-oss'] },
  { prefix: 'llamacpp', name: 'llama.cpp server', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:8080/v1', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'DeepSeek', 'Mistral', 'gpt-oss'] },
  { prefix: 'vllm', name: 'vLLM', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:8000/v1', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'DeepSeek', 'Mistral', 'gpt-oss'] },
  { prefix: 'mlx', name: 'MLX (mlx_lm.server)', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:8080/v1', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'Mistral'] },
  { prefix: 'jan', name: 'Jan', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:1337/v1', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'Mistral'] },
  { prefix: 'gpt4all', name: 'GPT4All', group: L, connection: 'local', locality: 'local', baseURL: 'http://127.0.0.1:4891/v1', makes: ['Llama', 'Meta', 'Qwen', 'Mistral'] },
  { prefix: 'openai-compatible', name: 'OpenAI-compatible', label: 'Other OpenAI-compatible server', group: L, connection: 'API key', locality: 'by-baseURL', note: 'Any server that speaks the OpenAI API; give its base URL.' },
  // hosted API
  { prefix: 'anthropic', name: 'Claude', label: 'Claude (API key)', group: H, connection: 'API key', locality: 'cloud', company: 'Anthropic', termsUrl: 'https://www.anthropic.com/legal/commercial-terms', keyEnv: 'ANTHROPIC_API_KEY', getKey: 'https://console.anthropic.com/settings/keys', makes: ['Claude', 'Anthropic'] },
  { prefix: 'openai', name: 'OpenAI', group: H, connection: 'API key', locality: 'cloud', company: 'OpenAI', termsUrl: 'https://openai.com/policies/business-terms', keyEnv: 'OPENAI_API_KEY', getKey: 'https://platform.openai.com/api-keys', makes: ['GPT', 'OpenAI', 'o-series', 'ChatGPT'] },
  { prefix: 'google', name: 'Google', label: 'Google Gemini', group: H, connection: 'API key', locality: 'cloud', company: 'Google', termsUrl: 'https://ai.google.dev/gemini-api/terms', keyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY', getKey: 'https://aistudio.google.com/apikey', makes: ['Gemini', 'Gemma'] },
  { prefix: 'mistral', name: 'Mistral', group: H, connection: 'API key', locality: 'cloud', company: 'Mistral AI', termsUrl: 'https://mistral.ai/terms', keyEnv: 'MISTRAL_API_KEY', getKey: 'https://console.mistral.ai/api-keys', makes: ['Mistral', 'Magistral', 'Codestral'] },
  { prefix: 'groq', name: 'Groq', group: H, connection: 'API key', locality: 'cloud', company: 'Groq', termsUrl: 'https://groq.com/terms-of-use', keyEnv: 'GROQ_API_KEY', getKey: 'https://console.groq.com/keys', makes: ['Llama', 'Meta', 'Qwen', 'Gemma', 'gpt-oss', 'Kimi'] },
  { prefix: 'xai', name: 'xAI', group: H, connection: 'API key', locality: 'cloud', company: 'xAI', termsUrl: 'https://x.ai/legal/terms-of-service-enterprise', keyEnv: 'XAI_API_KEY', getKey: 'https://console.x.ai', makes: ['Grok'] },
  { prefix: 'deepseek', name: 'DeepSeek', group: H, connection: 'API key', locality: 'cloud', company: 'DeepSeek', termsUrl: 'https://platform.deepseek.com/', keyEnv: 'DEEPSEEK_API_KEY', getKey: 'https://platform.deepseek.com/api_keys', makes: ['DeepSeek'] },
  { prefix: 'cohere', name: 'Cohere', group: H, connection: 'API key', locality: 'cloud', company: 'Cohere', termsUrl: 'https://cohere.com/terms-of-use', keyEnv: 'COHERE_API_KEY', getKey: 'https://dashboard.cohere.com/api-keys', makes: ['Command', 'Aya'] },
  { prefix: 'perplexity', name: 'Perplexity', group: H, connection: 'API key', locality: 'cloud', company: 'Perplexity', termsUrl: 'https://www.perplexity.ai/hub/legal/terms-of-service', keyEnv: 'PERPLEXITY_API_KEY', getKey: 'https://www.perplexity.ai/settings/api', makes: ['Sonar'] },
  { prefix: 'togetherai', name: 'Together AI', group: H, connection: 'API key', locality: 'cloud', company: 'Together AI', termsUrl: 'https://www.together.ai/terms-of-service', keyEnv: 'TOGETHER_AI_API_KEY', getKey: 'https://api.together.ai/settings/api-keys', makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek', 'Mistral', 'gpt-oss', 'Gemma'] },
  { prefix: 'fireworks', name: 'Fireworks', group: H, connection: 'API key', locality: 'cloud', company: 'Fireworks AI', termsUrl: 'https://fireworks.ai/terms-of-service', keyEnv: 'FIREWORKS_API_KEY', getKey: 'https://fireworks.ai/account/api-keys', makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek', 'Mistral', 'gpt-oss'] },
  { prefix: 'deepinfra', name: 'DeepInfra', group: H, connection: 'API key', locality: 'cloud', company: 'DeepInfra', termsUrl: 'https://deepinfra.com/terms', keyEnv: 'DEEPINFRA_API_KEY', getKey: 'https://deepinfra.com/dash/api_keys', makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek', 'Mistral', 'gpt-oss'] },
  { prefix: 'cerebras', name: 'Cerebras', group: H, connection: 'API key', locality: 'cloud', company: 'Cerebras', termsUrl: 'https://www.cerebras.ai/terms-of-service', keyEnv: 'CEREBRAS_API_KEY', getKey: 'https://cloud.cerebras.ai/platform', makes: ['Llama', 'Meta', 'Qwen', 'gpt-oss'] },
  { prefix: 'openrouter', name: 'OpenRouter', group: H, connection: 'API key', locality: 'cloud', company: 'OpenRouter (and the model’s vendor)', termsUrl: 'https://openrouter.ai/terms', keyEnv: 'OPENROUTER_API_KEY', getKey: 'https://openrouter.ai/keys', note: 'One key, many models.', makes: ['Claude', 'GPT', 'Gemini', 'Google', 'Llama', 'Meta', 'Qwen', 'DeepSeek', 'Mistral', 'Grok'] },
  { prefix: 'moonshot', name: 'Kimi (Moonshot)', group: H, connection: 'API key', locality: 'cloud', company: 'Moonshot AI', termsUrl: 'https://platform.kimi.ai/', keyEnv: 'MOONSHOT_API_KEY', getKey: 'https://platform.kimi.ai/console/api-keys', baseURL: 'https://api.moonshot.ai/v1', makes: ['Kimi'] },
  { prefix: 'zhipu', name: 'GLM (Z.ai / Zhipu)', group: H, connection: 'API key', locality: 'cloud', company: 'Z.ai (Zhipu)', termsUrl: 'https://docs.z.ai/', keyEnv: 'ZAI_API_KEY', getKey: 'https://z.ai/manage-apikey/apikey-list', baseURL: 'https://api.z.ai/api/paas/v4/', note: 'International endpoint; China keys use https://open.bigmodel.cn/api/paas/v4.', makes: ['GLM'] },
  { prefix: 'dashscope', name: 'Qwen (Alibaba Model Studio)', group: H, connection: 'API key', locality: 'cloud', company: 'Alibaba Cloud', termsUrl: 'https://www.alibabacloud.com/help/en/model-studio/', keyEnv: 'DASHSCOPE_API_KEY', getKey: 'https://modelstudio.console.alibabacloud.com/', baseURL: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1', note: 'US region; keys are per region.', makes: ['Qwen', 'Alibaba'] },
  { prefix: 'sambanova', name: 'SambaNova', group: H, connection: 'API key', locality: 'cloud', company: 'SambaNova', termsUrl: 'https://sambanova.ai/terms', keyEnv: 'SAMBANOVA_API_KEY', getKey: 'https://cloud.sambanova.ai/', baseURL: 'https://api.sambanova.ai/v1', unverified: true, makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek'] },
  { prefix: 'baseten', name: 'Baseten', group: H, connection: 'API key', locality: 'cloud', company: 'Baseten', termsUrl: 'https://www.baseten.co/terms-of-service', keyEnv: 'BASETEN_API_KEY', getKey: 'https://app.baseten.co/settings/api_keys', baseURL: 'https://inference.baseten.co/v1', makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek', 'gpt-oss'] },
  { prefix: 'huggingface', name: 'Hugging Face', group: H, connection: 'API key', locality: 'cloud', company: 'Hugging Face (and the inference provider it routes to)', termsUrl: 'https://huggingface.co/terms-of-service', keyEnv: 'HF_TOKEN', keyLabel: 'Access token', getKey: 'https://huggingface.co/settings/tokens', baseURL: 'https://router.huggingface.co/v1', note: 'One token, many open models.', makes: ['Llama', 'Meta', 'Qwen', 'DeepSeek', 'Mistral', 'Gemma', 'gpt-oss'] },
  { prefix: 'cloudflare', name: 'Cloudflare Workers AI', group: H, connection: 'API key', locality: 'cloud', company: 'Cloudflare', termsUrl: 'https://www.cloudflare.com/terms/', keyEnv: 'CLOUDFLARE_API_TOKEN', keyLabel: 'API token', getKey: 'https://dash.cloudflare.com/profile/api-tokens', baseURL: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1', baseURLFields: ['account_id'], makes: ['Llama', 'Meta', 'Qwen', 'Mistral', 'Gemma'] },
  { prefix: 'replicate', name: 'Replicate', group: H, connection: 'API key', locality: 'cloud', company: 'Replicate', termsUrl: 'https://replicate.com/terms', keyEnv: 'REPLICATE_API_TOKEN', keyLabel: 'API token', getKey: 'https://replicate.com/account/api-tokens', baseURL: 'https://api.replicate.com/v1', unverified: true, note: 'No OpenAI-compatible chat endpoint was found in Replicate’s docs; Hugging Face’s router reaches Replicate-hosted models.' },
  // enterprise: credentials that are not one API key (providers spec §3 step 5)
  { prefix: 'azure', name: 'Azure OpenAI', group: E, connection: 'fields', locality: 'cloud', company: 'Microsoft (Azure OpenAI)', termsUrl: 'https://learn.microsoft.com/legal/cognitive-services/openai/data-privacy', fields: AZURE_FIELDS, setup: 'https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource', note: 'Your firm’s Azure OpenAI resource: the model id is your deployment name, and the key comes from the Azure portal.', makes: ['GPT', 'OpenAI', 'o-series'] },
  { prefix: 'bedrock', name: 'Amazon Bedrock', group: E, connection: 'fields', locality: 'cloud', company: 'Amazon Web Services (Bedrock)', termsUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html', fields: BEDROCK_FIELDS, setup: 'https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html', note: 'Models in your firm’s AWS account: name the region, then paste access keys, name an AWS profile, or leave both empty to use the credentials already on this machine.', makes: ['Claude', 'Anthropic', 'Llama', 'Meta', 'Nova', 'Amazon', 'Mistral'] },
  { prefix: 'vertex', name: 'Google Vertex AI', group: E, connection: 'fields', locality: 'cloud', company: 'Google Cloud (Vertex AI)', termsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance', fields: VERTEX_FIELDS, setup: 'https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart', note: 'Gemini and Claude in your firm’s Google Cloud project: name the project and location, then paste a service account key or leave it empty to use gcloud’s own credentials.', makes: ['Gemini', 'Google', 'Claude', 'Anthropic'] },
];

/** Good starting points for a local model; the scoreboard (phase 2) will
 * rank them for your work. COPIED from the runtime's `OPEN_MODELS`. */
export const OPEN_MODELS: ReadonlyArray<{ family: string; why: string }> = [
  { family: 'Qwen3', why: 'tool use, long context, strong on structured drafting' },
  { family: 'Llama 4', why: 'tool use, very long context' },
  { family: 'gpt-oss', why: 'tool use, reasoning, permissive licence' },
  { family: 'Gemma', why: 'small and quick; fine for search and summaries' },
  { family: 'DeepSeek-R1 distills', why: 'reasoning on modest hardware' },
  { family: 'Mistral Small', why: 'tool use, European vendor' },
];

export const GROUP_LABELS: Record<VendorGroup, string> = { subscription: 'Subscriptions', local: 'Local runners', hosted: 'Hosted API', enterprise: 'Hosted API · enterprise' };

/** Whether a vendor takes a field set instead of one key. */
export function isEnterpriseVendor(v: VendorRow | undefined): v is VendorRow & { fields: VendorFieldRow[] } {
  return v !== undefined && v.connection === 'fields' && v.fields !== undefined;
}

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

/** The rows a lawyer can ADD from Settings (the subscriptions are built in
 * and never added; `codex` is a legacy spelling). */
export function addableVendors(): VendorRow[] {
  return VENDORS.filter(v => v.group !== 'subscription');
}

/**
 * What a vendor answers to. The name and the group, and the model families
 * it serves — a lawyer looks for "Llama" or "Gemini", and Meta sells no API
 * at all, so a picker that only knows vendor names hides half the catalog
 * behind names nobody searches for.
 */
export function vendorMatches(v: VendorRow, query: string): boolean {
  const words = queryWords(query);
  if (words.length === 0) return true;
  const hay = [v.name, v.label ?? '', v.prefix, v.company ?? '', GROUP_LABELS[v.group], ...(v.makes ?? [])].join(' ').toLowerCase();
  // Every word has to land somewhere: "google gemini" and "meta llama" are
  // both one intent, not two.
  return words.every(word => hay.includes(word));
}

/**
 * A query's words, minus the ones that are punctuation alone.
 *
 * Picking an option writes the picker's own label back into the box —
 * `Hosted API · Together AI` — and `·` appears in no vendor's text, so a
 * strict every-word match would decide the vendor you just chose no longer
 * matches, and the list would spring back to the whole catalog.
 */
function queryWords(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(word => /[a-z0-9]/.test(word));
}

/** The vendors a query finds, in catalog order (subscriptions first, then
 * local, hosted, enterprise). */
export function searchVendors(query: string): VendorRow[] {
  return addableVendors().filter(v => vendorMatches(v, query));
}

/**
 * The families a query actually matched, which is the line's whole job: it
 * answers "why is Together AI in my results for `llama`".
 *
 * Only matched families, and only on a word boundary. A substring test
 * credited families for a match they had nothing to do with — typing `o`
 * matched Ollama by its NAME and then announced `Ollama (gpt-oss, Google,
 * Llama, Meta)`, as if the letter had found four model families.
 */
export function makesLine(v: VendorRow, query: string): string | null {
  const words = queryWords(query);
  if (words.length === 0 || v.makes === undefined) return null;
  const hit = v.makes.filter(m => words.some(word => startsAWord(m, word)));
  if (hit.length === 0) return null;
  // Never the unmatched ones as filler: everything named here matched.
  return hit.length > 4 ? `${hit.slice(0, 4).join(', ')}…` : hit.join(', ');
}

/** Whether `word` begins the family name or one of its words: `gpt` finds
 * `gpt-oss`, `qwen` finds `Qwen`. A single letter finds nothing — it is
 * still typing, and it would otherwise match most of the catalog. */
function startsAWord(family: string, word: string): boolean {
  if (word.length < 2) return false;
  return family
    .toLowerCase()
    .split(/[\s-]+/)
    .some(part => part.startsWith(word));
}

/** The picker's option text: `<Group> · <Name>`, so typing either finds it. */
export function pickerLabel(v: VendorRow): string {
  return `${GROUP_LABELS[v.group]} · ${v.label ?? v.name}`;
}

export function vendorByPickerLabel(label: string): VendorRow | undefined {
  const wanted = label.trim().toLowerCase();
  return addableVendors().find(v => pickerLabel(v).toLowerCase() === wanted || (v.label ?? v.name).toLowerCase() === wanted || v.name.toLowerCase() === wanted || v.prefix === wanted);
}

/** The hosted vendors a key unlocks, for the first-run sentence — OpenRouter
 * last (spec §12), the ones with base URLs still unverified left out. */
export function keyedHints(): string[] {
  const hosted = addableVendors().filter(v => v.group === 'hosted' && v.unverified !== true && v.prefix !== 'openai' && v.prefix !== 'anthropic');
  const names = hosted.filter(v => v.prefix !== 'openrouter').map(v => v.label ?? v.name);
  names.push('OpenRouter — one key, many models');
  return names;
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
