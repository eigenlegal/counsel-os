import { accessSync, constants, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { locateCli } from '../providers/cli-locate';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { findMarkedRoots, isMarkedRoot } from '../vault/resolve-root';
import { defaultVault } from './init';

/**
 * The two read-only probes behind the first-run screen (spec 2026-09-01
 * §4): where a vault could live, and which models this machine can reach
 * right now. Neither writes, neither calls a model.
 */

export type LocationKind = 'existing-root' | 'obsidian-vault' | 'new';

export interface Location {
  /** The legal root this row proposes (for an Obsidian vault: a `Counsel OS`
   * folder inside it, the way the setup skill suggests). */
  path: string;
  kind: LocationKind;
  /** For `obsidian-vault`: the vault the folder would sit in. */
  within?: string;
  exists: boolean;
  writable: boolean;
  /** The row the screen preselects: an existing root when there is exactly
   * one, else the default new folder. */
  suggested: boolean;
}

export interface DetectOptions {
  /** The user's real home (`os.homedir()`), not the runtime's state dir. */
  home?: string;
  env?: NodeJS.ProcessEnv;
}

/** Where the setup skill looks for Obsidian vaults, verbatim. */
function obsidianScanRoots(home: string): string[] {
  return [join(home, 'Documents'), join(home, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'), join(home, 'Dropbox'), home];
}

/** `find <base> -maxdepth 3 -type d -name .obsidian -prune`, as paths of the vaults. */
function findObsidianVaults(base: string, maxDepth = 3): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '.obsidian') {
        out.push(dir);
        continue;
      }
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'Library') continue;
      if (depth < maxDepth) walk(join(dir, entry.name), depth + 1);
    }
  };
  walk(base, 1);
  return out;
}

/** True when the nearest existing ancestor of `path` (or the path itself)
 * is writable by this process. */
export function isWritablePath(path: string): boolean {
  let probe = path;
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) return false;
    probe = parent;
  }
  try {
    accessSync(probe, constants.W_OK);
    return statSync(probe).isDirectory();
  } catch {
    return false;
  }
}

export function detectLocations(opts: DetectOptions = {}): Location[] {
  const home = opts.home ?? homedir();
  const env = opts.env ?? process.env;
  const roots = findMarkedRoots({ env, home });
  const rows: Location[] = roots.map(path => ({ path, kind: 'existing-root', exists: true, writable: isWritablePath(path), suggested: false }));
  const seen = new Set(roots);

  const vaults = new Set<string>();
  for (const base of obsidianScanRoots(home)) for (const v of findObsidianVaults(base)) vaults.add(v);
  for (const vault of [...vaults].sort()) {
    const path = join(vault, 'Counsel OS');
    if (seen.has(path) || seen.has(vault)) continue;
    seen.add(path);
    // A vault that already holds a set-up Counsel OS folder outside the
    // conventional scan is an existing root, not a place to make one.
    if (isMarkedRoot(path)) {
      roots.push(path);
      rows.push({ path, kind: 'existing-root', within: vault, exists: true, writable: isWritablePath(path), suggested: false });
      continue;
    }
    rows.push({ path, kind: 'obsidian-vault', within: vault, exists: existsSync(path), writable: isWritablePath(path), suggested: false });
  }

  const fresh = defaultVault(home);
  if (!seen.has(fresh)) {
    rows.push({ path: fresh, kind: 'new', exists: existsSync(fresh), writable: isWritablePath(fresh), suggested: false });
  }

  const pick = roots.length === 1 ? rows.find(r => r.kind === 'existing-root') : rows.find(r => r.kind === 'new');
  if (pick !== undefined) pick.suggested = true;
  return rows;
}

// ── providers ──────────────────────────────────────────────────────────

export interface ProviderProbe {
  id: string;
  vendor: 'Claude' | 'ChatGPT' | 'Ollama';
  model: string;
  connection: 'subscription' | 'local';
  /** The CLI (or server) is present on this machine. */
  installed: boolean;
  /** Where the CLI was found (packaging spec §3.4); absent when not installed. */
  path?: string;
  /** Evidence of a login: `true`, `false`, or `null` when there is no cheap
   * way to tell (the harness will say on first use). */
  signedIn: boolean | null;
  /** For Ollama: the models it serves. */
  models?: string[];
  /** Preselectable: installed and not known to be signed out. */
  usable: boolean;
  /** Set text for the row. */
  state: string;
}

export interface ProbeDeps {
  /** Finds a CLI: `locateCli` (PATH, then the vendors' known dirs). */
  which?: (name: string) => string | null;
  exists?: (path: string) => boolean;
  readText?: (path: string) => string | null;
  fetch?: typeof fetch;
  /** The user's real home. */
  home?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

const OLLAMA_DEFAULT = 'http://127.0.0.1:11434';

export async function probeProviders(deps: ProbeDeps = {}): Promise<ProviderProbe[]> {
  const which = deps.which ?? (name => (name === 'claude' || name === 'codex' ? locateCli(name, { env, home }) : Bun.which(name)));
  const exists = deps.exists ?? (p => existsSync(p));
  const readText =
    deps.readText ??
    ((p: string) => {
      try {
        return readFileSync(p, 'utf8');
      } catch {
        return null;
      }
    });
  const home = deps.home ?? homedir();
  const env = deps.env ?? process.env;
  const doFetch = deps.fetch ?? fetch;

  // Claude: the CLI, and the two places a login leaves a trace. On macOS the
  // credential itself is in the Keychain, so a `.claude.json` naming an
  // oauthAccount is the evidence; elsewhere `.credentials.json` is.
  const claudePath = which('claude');
  const claudeInstalled = claudePath !== null;
  const claudeJson = readText(join(home, '.claude.json'));
  const claudeSignedIn = !claudeInstalled ? null : exists(join(home, '.claude', '.credentials.json')) || (claudeJson !== null && claudeJson.includes('"oauthAccount"')) ? true : claudeJson === null ? null : false;

  // Codex: the CLI and its auth.json (which the harness copies per thread).
  const codexPath = which('codex');
  const codexInstalled = codexPath !== null;
  const codexSignedIn = !codexInstalled ? null : exists(join(env.CODEX_HOME ?? join(home, '.codex'), 'auth.json'));

  // Ollama: is the server answering, and with what.
  let ollamaModels: string[] | null = null;
  try {
    const base = (env.OLLAMA_HOST ?? OLLAMA_DEFAULT).replace(/\/$/, '');
    const url = base.startsWith('http') ? base : `http://${base}`;
    const res = await doFetch(`${url}/api/tags`, { signal: AbortSignal.timeout(deps.timeoutMs ?? 1500) });
    if (res.ok) {
      const body = (await res.json()) as { models?: Array<{ name?: string }> };
      ollamaModels = (body.models ?? []).map(m => m.name ?? '').filter(n => n !== '');
    }
  } catch {
    ollamaModels = null;
  }

  const stateFor = (installed: boolean, signedIn: boolean | null): string =>
    !installed ? 'not installed' : signedIn === true ? 'signed in' : signedIn === false ? 'installed · not signed in' : 'installed';

  return [
    {
      id: 'claude-sub/claude-opus-5',
      vendor: 'Claude',
      model: 'Opus 5',
      connection: 'subscription',
      installed: claudeInstalled,
      ...(claudePath === null ? {} : { path: claudePath }),
      signedIn: claudeSignedIn,
      usable: claudeInstalled && claudeSignedIn !== false,
      state: stateFor(claudeInstalled, claudeSignedIn),
    },
    {
      id: 'codex-sub/gpt-5.6-terra',
      vendor: 'ChatGPT',
      model: 'GPT-5.6 Terra',
      connection: 'subscription',
      installed: codexInstalled,
      ...(codexPath === null ? {} : { path: codexPath }),
      signedIn: codexSignedIn,
      usable: codexInstalled && codexSignedIn !== false,
      state: stateFor(codexInstalled, codexSignedIn),
    },
    {
      id: 'ollama/gemma4:e4b',
      vendor: 'Ollama',
      model: 'gemma4:e4b',
      connection: 'local',
      installed: ollamaModels !== null || which('ollama') !== null,
      signedIn: null,
      models: ollamaModels ?? [],
      usable: ollamaModels !== null,
      state: ollamaModels === null ? (which('ollama') === null ? 'not installed' : 'not running') : `running · ${ollamaModels.length} model${ollamaModels.length === 1 ? '' : 's'}`,
    },
  ];
}
