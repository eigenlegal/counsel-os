/**
 * The per-matter privacy policy (providers spec §7).
 *
 * A matter that says `stays_local: true` in its frontmatter, or a vault whose
 * `config.md` sets `default_locality: local`, never has a step run on a
 * cloud provider. The policy is decided from what is known at SEND time —
 * the thread's explicit matter link, else a matter path riding along as an
 * attachment chip, else the vault default — never from what the model later
 * reads. An inferred matter (the header's courtesy) sets nothing: the reader
 * links the matter if they want the guarantee.
 */
import { parseFrontmatter } from './overview';
import type { VaultConfig } from './resolve-root';

export interface StepPolicy {
  localOnly: boolean;
  /** Where the answer came from: the matter's own frontmatter, the vault
   * default, or nothing said anywhere. */
  source: 'matter' | 'vault' | 'none';
  /** The matter file the policy was read from, when `source` is `matter`. */
  matter?: string;
}

/** Reads a vault file as text, or `null` when it is not there. */
export type ReadText = (path: string) => Promise<string | null>;

/** The sentence the lawyer sees when the policy cannot be honoured. */
export const NO_LOCAL_MODEL = 'This matter stays on this machine, and no local model is loaded.';

const TRUE = new Set(['true', 'yes', 'on']);
const FALSE = new Set(['false', 'no', 'off']);

/** `stays_local` as the frontmatter spells it; `null` when it says nothing usable. */
function staysLocalOf(fm: Record<string, string>): boolean | null {
  const raw = (fm['stays_local'] ?? fm['stays-local'] ?? '').trim().toLowerCase();
  if (TRUE.has(raw)) return true;
  if (FALSE.has(raw)) return false;
  return null;
}

/**
 * The matter file that governs a vault path, or `null` when the path is not
 * under the matters directory. A flat matter is its own file
 * (`matters/acme.md`); a folder matter is `matters/acme/matter.md` and
 * governs everything in `matters/acme/`. A document inside a folder whose
 * `matter.md` does not exist falls back to the flat file of the same name
 * (`matters/acme.md`), the way intake pairs folders with flat matters.
 */
export async function matterFor(path: string, cfg: VaultConfig, read: ReadText): Promise<string | null> {
  const dir = cfg.mattersPath.replace(/\/+$/, '');
  if (!path.startsWith(`${dir}/`)) return null;
  const rest = path.slice(dir.length + 1);
  const cut = rest.indexOf('/');
  if (cut === -1) {
    // A file directly under matters/: a flat matter, or a stray document.
    return rest.endsWith('.md') ? path : null;
  }
  const folder = rest.slice(0, cut);
  const inFolder = `${dir}/${folder}/matter.md`;
  if ((await read(inFolder)) !== null) return inFolder;
  const flat = `${dir}/${folder}.md`;
  if ((await read(flat)) !== null) return flat;
  return null;
}

/** The policy one matter file declares, with the vault default beneath it. */
export async function matterPolicy(matterPath: string | null, cfg: VaultConfig, read: ReadText): Promise<StepPolicy> {
  if (matterPath !== null) {
    const text = await read(matterPath);
    if (text !== null) {
      const said = staysLocalOf(parseFrontmatter(text).frontmatter);
      if (said !== null) return { localOnly: said, source: 'matter', matter: matterPath };
    }
  }
  if (cfg.defaultLocality === 'local') return { localOnly: true, source: 'vault' };
  return { localOnly: false, source: 'none' };
}

/**
 * The vault paths a message carries as attachment chips: the trailing line
 * of backticked paths `withAttachments` writes (Home's "attach from vault",
 * a dropped document). Anything else in the message is prose.
 */
export function attachmentPaths(message: string): string[] {
  const lines = message.replace(/\s+$/, '').split('\n');
  const last = (lines[lines.length - 1] ?? '').trim();
  if (!/^`[^`\n]+`(\s+`[^`\n]+`)*$/.test(last)) return [];
  return Array.from(last.matchAll(/`([^`]+)`/g), m => m[1]!);
}

/**
 * The policy for one step, decided before the model is chosen: the thread's
 * explicit matter first; else the first attached path that belongs to a
 * matter; else the vault default. Read once per step, never cached across
 * steps — a matter can be marked between two messages.
 */
export async function policyForStep(
  input: { matter?: string | undefined; message: string },
  cfg: VaultConfig,
  read: ReadText,
): Promise<StepPolicy> {
  if (input.matter !== undefined && input.matter !== '') {
    return matterPolicy(input.matter, cfg, read);
  }
  for (const path of attachmentPaths(input.message)) {
    let governing: string | null;
    try {
      governing = await matterFor(path, cfg, read);
    } catch {
      continue; // A malformed chip is prose, not a policy.
    }
    if (governing !== null) return matterPolicy(governing, cfg, read);
  }
  return matterPolicy(null, cfg, read);
}

/** A `ReadText` over a vault store: missing or unreadable → `null`. */
export function readerOver(store: { read(tenant: string, path: string): Promise<string> }, tenant: string): ReadText {
  return async path => {
    try {
      return await store.read(tenant, path);
    } catch {
      return null;
    }
  };
}
