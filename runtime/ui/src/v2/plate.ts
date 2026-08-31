import type { Capabilities, Health } from '../api/types';
import { defaultProviderId } from './threads';

export type Auth = Capabilities['auth'];

/**
 * The provider plate (cou-90): the two-line lockup the rail footer and the
 * model switcher's rows share — line 1 the vendor a lawyer knows, line 2
 * `<Model> · <connection>`. Set text only, brief/ledger motif — no pills.
 */
export interface Plate {
  /** Line 1 — the vendor's name, or the id's own prefix when the vendor is
   * unknown. Never an invented name. */
  vendor: string;
  /** Line 2 — `<Model> · <connection>`; the RAW id for an unknown vendor,
   * so what the reader sees is exactly what `providers.yaml` says. */
  detail: string;
  /** False when the id matched no vendor row and the plate fell back. */
  known: boolean;
}

/** `auth`, said the way the plate says it. */
const CONNECTION: Record<Auth, string> = {
  subscription: 'subscription',
  apikey: 'API key',
  local: 'local',
};

/** The id prefixes the runtime actually ships, by hand. Anything else falls
 * back to the raw id — the table never guesses. */
const VENDORS: Record<string, { vendor: string; connection: string }> = {
  'claude-sub': { vendor: 'Claude', connection: 'subscription' },
  anthropic: { vendor: 'Claude', connection: 'API key' },
  openai: { vendor: 'OpenAI', connection: 'API key' },
  codex: { vendor: 'ChatGPT', connection: 'subscription' },
  'codex-sub': { vendor: 'ChatGPT', connection: 'subscription' },
  ollama: { vendor: 'Ollama', connection: 'local' },
};

/**
 * The model's marketing casing, derived from the id — a restyle, never a
 * rename: `claude-opus-5` → `Opus 5`, `gpt-5.6-terra` → `GPT-5.6 Terra`.
 * Anything the two patterns do not cover stays verbatim (`llama3`,
 * `gemma4:e4b`) — a raw tag is honest; a guessed name is wrong somewhere.
 */
export function modelName(model: string): string {
  const claude = /^claude-([a-z]+)-(\d[\d.-]*)$/.exec(model);
  if (claude !== null) {
    const family = claude[1]!.charAt(0).toUpperCase() + claude[1]!.slice(1);
    return `${family} ${claude[2]!.replaceAll('-', '.')}`;
  }
  const gpt = /^gpt-(.+)$/.exec(model);
  if (gpt !== null) {
    const [version, ...rest] = gpt[1]!.split('-');
    const words = rest.map(word => (/^[a-z]/.test(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word));
    return [`GPT-${version}`, ...words].join(' ');
  }
  return model;
}

/**
 * The plate for one provider id. `auth` is `/health`'s word on how the
 * provider connects and wins over the table's assumption when both exist;
 * without either, the detail line is the model alone.
 */
export function plateFor(id: string, auth?: Auth): Plate {
  const slash = id.indexOf('/');
  const prefix = slash === -1 ? id : id.slice(0, slash);
  const row = VENDORS[prefix];
  const connection = auth === undefined ? row?.connection : CONNECTION[auth];
  if (row === undefined || slash === -1) {
    return { vendor: prefix, detail: connection === undefined ? id : `${id} · ${connection}`, known: false };
  }
  const model = modelName(id.slice(slash + 1));
  return { vendor: row.vendor, detail: connection === undefined ? model : `${model} · ${connection}`, known: true };
}

/**
 * The footer's one-line summary — raw id + auth, for the title/tooltip where
 * precision beats polish.
 *
 * It names the provider a send will ACTUALLY use — `defaultProviderId`, the
 * same rule the composer's send follows — not the saved default. The two
 * differ when the saved default names a provider this runtime did not load,
 * and the footer is now the only place that could say so.
 */
export function footerLabel(health: Health | null): string {
  if (health === null) return '…';
  const effective = defaultProviderId(health);
  const model = effective === '' ? (health.default ?? 'no default model') : effective;
  const auth = health.providers.find(p => p.id === effective)?.auth;
  return auth === undefined ? model : `${model} · ${auth}`;
}

/** The swap, said quietly: the saved default is not loaded, so the footer's
 * model is not the one Settings has on file. `null` when they agree. */
export function swapNote(health: Health | null): string | null {
  if (health === null) return null;
  const saved = health.default;
  if (saved === null || saved === '' || health.providers.some(p => p.id === saved)) return null;
  return `saved default ${saved} not loaded`;
}
