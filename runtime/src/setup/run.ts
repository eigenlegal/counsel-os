import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { bodyHash } from '../content/hash';
import { MANIFEST } from '../content/manifest';
import type { ContentSource } from '../content/source';
import { writeFileAtomic } from '../core/atomic-write';
import { readRegistry, writeRegistry } from '../providers/registry';
import { configFor, MEMORY_FRONTMATTER, profileFor, VAULT_GITIGNORE, type SetupPlan } from './plan';

/**
 * First-run setup, in the runtime (spec 2026-09-01 §4): writes exactly
 * what `skills/setup/SKILL.md` writes, and nothing it does not.
 *
 * Idempotent by construction — every file is placed with `place`, which
 * never overwrites. A second run over the same vault, or a run over a vault
 * the plugin's setup skill created, adds what is missing and leaves every
 * existing file alone (the user's edited profile, their standards, their
 * config). That is also the partial-failure story: a run that died half way
 * is finished by running it again.
 */

export type SetupRefusal = 'inside-plugin' | 'not-a-directory' | 'not-writable' | 'unmarked-config';

export class SetupError extends Error {
  constructor(
    message: string,
    public readonly reason: SetupRefusal,
  ) {
    super(message);
    this.name = 'SetupError';
  }
}

/** Runs one git command in `cwd`. `ok` false when git is not on PATH or
 * the command failed; `out` is stdout. Injected so tests do not need git. */
export type GitRunner = (args: string[], cwd: string) => { ok: boolean; out: string };

export interface SetupDeps {
  content: ContentSource;
  /** The runtime's state directory (`counselHome(env)`): the legal-root
   * pointer and `providers.yaml` live here. */
  home: string;
  /** The plugin/repo root, refused as a vault location. */
  pluginRoot: string;
  /** Default: real git through `Bun.spawnSync`, or `null` when `git` is
   * not on PATH. Pass `null` to skip git entirely. */
  git?: GitRunner | null;
  /** Overrides `<home>/providers.yaml`. */
  registryFile?: string;
  now?: () => Date;
}

export type GitOutcome = 'initialized' | 'present' | 'skipped' | 'unavailable' | 'failed';

export interface GroupCount {
  written: number;
  skipped: number;
}

export interface SetupResult {
  vault: string;
  /** The vault was already a marked Counsel OS root. */
  adopted: boolean;
  groups: {
    config: GroupCount;
    law: GroupCount;
    standards: GroupCount;
    methods: GroupCount;
    library: GroupCount;
    reference: GroupCount;
    profile: GroupCount;
    memory: GroupCount;
    gitignore: GroupCount;
    /** The sample matter (spec §4): 3 files when asked for, else zeros. */
    sample: GroupCount;
  };
  written: number;
  skipped: number;
  git: GitOutcome;
  warnings: string[];
}

/** `.counsel/content-state.json`: what this vault last RECEIVED from the
 * shipped content, per vault path — the baseline the update step (spec §6)
 * compares against to tell "changed upstream" from "changed by the user". */
export interface ContentState {
  version: string;
  receivedAt: string;
  files: Record<string, { hash: string; from: string }>;
}

export const CONTENT_STATE = join('.counsel', 'content-state.json');

/** The 26 law areas plus the practice seed: shipped path prefix → vault
 * path prefix. Shipped paths never carry `..` (the source refuses them), so
 * the rewrite is a prefix swap. */
const PLACEMENTS: ReadonlyArray<{ group: keyof SetupResult['groups']; from: string; to: string }> = [
  { group: 'law', from: 'knowledge/law', to: 'law' },
  { group: 'standards', from: 'knowledge/practice-seed/standards', to: 'practice/standards' },
  { group: 'methods', from: 'knowledge/practice-seed/methods', to: 'practice/methods' },
  { group: 'library', from: 'knowledge/practice-seed/library', to: 'practice/library' },
  { group: 'reference', from: 'knowledge/practice-seed/reference', to: 'practice/reference' },
];

function realOrLexical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

function isMarkedConfig(text: string): boolean {
  const lines = text.split('\n');
  return lines.some(l => l === 'counsel-os-config: true') && lines.some(l => l.startsWith('legal_root:'));
}

/** The default git runner: real git, or `null` when there is none. */
export function systemGit(): GitRunner | null {
  if (Bun.which('git') === null) return null;
  return (args, cwd) => {
    const proc = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
    return { ok: proc.exitCode === 0, out: new TextDecoder().decode(proc.stdout) };
  };
}

/**
 * Refuses a vault the runtime must not create: inside the plugin tree
 * (user state never lives there), a path that exists but is not a
 * directory, a directory whose `config.md` is not a Counsel OS config, or
 * one it cannot write. Runs BEFORE anything is written.
 */
function checkVault(vault: string, pluginRoot: string): { adopted: boolean } {
  const real = realOrLexical(vault);
  const plugin = realOrLexical(pluginRoot);
  if (real === plugin || real.startsWith(plugin + sep)) {
    throw new SetupError(`the vault must not live inside the plugin tree: ${vault}`, 'inside-plugin');
  }
  let adopted = false;
  if (existsSync(vault)) {
    if (!statSync(vault).isDirectory()) throw new SetupError(`not a directory: ${vault}`, 'not-a-directory');
    const config = join(vault, 'config.md');
    if (existsSync(config)) {
      if (!isMarkedConfig(readFileSync(config, 'utf8'))) {
        throw new SetupError(`${config} exists but is not a Counsel OS config (no \`counsel-os-config: true\` + \`legal_root:\` lines)`, 'unmarked-config');
      }
      adopted = true;
    }
  } else {
    try {
      mkdirSync(vault, { recursive: true });
    } catch (err) {
      throw new SetupError(`cannot create ${vault}: ${err instanceof Error ? err.message : String(err)}`, 'not-writable');
    }
  }
  const probe = join(vault, '.counsel-os-write-probe');
  try {
    writeFileSync(probe, '');
    rmSync(probe, { force: true });
  } catch (err) {
    throw new SetupError(`cannot write to ${vault}: ${err instanceof Error ? err.message : String(err)}`, 'not-writable');
  }
  return { adopted };
}

function readContentState(vault: string): ContentState | null {
  try {
    return JSON.parse(readFileSync(join(vault, CONTENT_STATE), 'utf8')) as ContentState;
  } catch {
    return null;
  }
}

export function runSetup(plan: SetupPlan, deps: SetupDeps): SetupResult {
  const vault = resolve(plan.vault);
  const now = deps.now ?? (() => new Date());
  const { adopted } = checkVault(vault, deps.pluginRoot);

  const zero = (): GroupCount => ({ written: 0, skipped: 0 });
  const groups: SetupResult['groups'] = {
    config: zero(),
    law: zero(),
    standards: zero(),
    methods: zero(),
    library: zero(),
    reference: zero(),
    profile: zero(),
    memory: zero(),
    gitignore: zero(),
    sample: zero(),
  };
  const warnings: string[] = [];
  const received: ContentState['files'] = {};

  /** Writes `rel` unless it already exists. Never overwrites: that is the
   * whole idempotence argument, and the adoption guarantee. */
  const place = (group: keyof SetupResult['groups'], rel: string, text: string, from?: string): void => {
    const target = join(vault, rel);
    if (existsSync(target)) {
      groups[group].skipped += 1;
      return;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
    groups[group].written += 1;
    if (from !== undefined) received[rel] = { hash: bodyHash(text), from };
  };

  // 1. The marker. On adoption the existing config stands, overrides and all.
  place('config', 'config.md', configFor(vault));

  // 2. The per-machine pointer — a cache, always refreshed to this vault.
  mkdirSync(deps.home, { recursive: true, mode: 0o700 });
  writeFileAtomic(join(deps.home, 'legal-root'), vault, { mode: 0o600, dirMode: 0o700 });

  // 3. Law areas and the practice seed, path for path.
  for (const { group, from, to } of PLACEMENTS) {
    for (const shipped of deps.content.list(from)) {
      const rel = `${to}/${shipped.slice(from.length + 1)}`;
      place(group, rel, deps.content.read(shipped), shipped);
    }
  }

  // 4. The profile: tailored, not the seed's placeholder — and never over
  //    one the user already has.
  place('profile', 'practice/profile.md', profileFor(plan));

  // 5. Memory: the template with the type frontmatter the skill adds.
  const templatePath = 'templates/memory/patterns.md';
  if (deps.content.has(templatePath)) {
    const template = deps.content.read(templatePath);
    const withFrontmatter = template.startsWith('---\n') ? template : MEMORY_FRONTMATTER + template;
    place('memory', 'memory/patterns.md', withFrontmatter, templatePath);
  } else {
    warnings.push('the shipped content has no memory/patterns.md template; memory/ was created empty');
    mkdirSync(join(vault, 'memory'), { recursive: true });
  }

  // 6. Empty homes for what the work creates.
  mkdirSync(join(vault, 'matters'), { recursive: true });
  mkdirSync(join(vault, 'entities'), { recursive: true });

  // 7. `.gitignore`, whether or not git is used: a vault synced to git later
  //    should not carry Finder droppings.
  place('gitignore', '.gitignore', VAULT_GITIGNORE);

  // 8. The sample matter (spec §4, founder decision: on by default): a
  //    folder matter — `matter.md` beside the synthetic NDA in both forms —
  //    so a new user has something to review before their first real file.
  if (plan.sampleMatter) {
    const dir = 'matters/sample-mutual-nda';
    place('sample', `${dir}/matter.md`, sampleMatterNote(now()));
    for (const shipped of deps.content.list('skills/demo/assets')) {
      const rel = `${dir}/${shipped.slice(shipped.lastIndexOf('/') + 1)}`;
      const target = join(vault, rel);
      if (existsSync(target)) {
        groups.sample.skipped += 1;
        continue;
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, deps.content.readBytes(shipped));
      groups.sample.written += 1;
    }
  }

  // 9. What this vault received, merged over what it received before.
  const previous = readContentState(vault);
  const state: ContentState = {
    version: MANIFEST.version,
    receivedAt: now().toISOString(),
    files: { ...(previous?.files ?? {}), ...received },
  };
  mkdirSync(join(vault, '.counsel'), { recursive: true });
  writeFileSync(join(vault, CONTENT_STATE), JSON.stringify(state, null, 2) + '\n', 'utf8');

  // 10. The default provider, only when asked for; the file is otherwise
  //    left exactly as it is (a fresh install has none, and that is fine).
  if (plan.defaultProvider !== undefined) {
    const file = deps.registryFile ?? join(deps.home, 'providers.yaml');
    try {
      const reg = readRegistry(file);
      writeRegistry(file, { ...reg, default: plan.defaultProvider });
    } catch (err) {
      warnings.push(`could not record the default provider in ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 11. Version control. Present → left alone (Express phase 5).
  let git: GitOutcome = 'skipped';
  if (plan.git) {
    const runner = deps.git === undefined ? systemGit() : deps.git;
    if (runner === null) git = 'unavailable';
    else if (existsSync(join(vault, '.git'))) git = 'present';
    else git = initRepo(runner, vault, warnings);
  }

  const written = Object.values(groups).reduce((n, g) => n + g.written, 0);
  const skipped = Object.values(groups).reduce((n, g) => n + g.skipped, 0);
  return { vault, adopted, groups, written, skipped, git, warnings };
}

/** The sample matter's own note. Home lists it like any matter (title,
 * stage, next action); the two documents beside it are the synthetic NDA
 * the demo skill uses — fictional parties, deliberately weak terms. */
export function sampleMatterNote(now: Date): string {
  const date = now.toISOString().slice(0, 10);
  return `---
counsel-os-type: matter
title: Acme — Mutual NDA (sample)
sample: true
stage: intake
client: Northwind Robotics, Inc.
counterparty: Vantage Systems, LLC
next_action: Ask counsel to review the NDA against our confidentiality standard
created: ${date}
updated: ${date}
---
# Acme — Mutual NDA (sample)

A synthetic mutual non-disclosure agreement, here so you can try a review before your first real matter. Fictional parties, fictional terms, and a few deliberately weak spots for counsel to catch: a broad residuals clause, a short term with no trade-secret carve-out, a marking-only definition of confidential information, weak return-and-destruction language, and compelled disclosure with no notice.

## The documents

- \`sample-mutual-nda.docx\` — the Word document, as a counterparty would send it.
- \`sample-mutual-nda.md\` — the same text as markdown.

## Try

Ask counsel: *review the NDA in this matter against our confidentiality standard and redline anything we would not sign.* Delete this folder whenever you like; nothing else refers to it.
`;
}

/** `git init` + `Initial Counsel OS knowledge base`, with a local identity
 * only when the machine has none configured (a commit needs one; the
 * user's own, when set, is used as is). */
function initRepo(git: GitRunner, vault: string, warnings: string[]): GitOutcome {
  if (!git(['init', '-q'], vault).ok) {
    warnings.push('git init failed; the vault is not under version control');
    return 'failed';
  }
  const identity = git(['config', 'user.name'], vault).out.trim() === '' ? ['-c', 'user.name=Counsel OS', '-c', 'user.email=counsel-os@localhost'] : [];
  if (!git(['add', '-A'], vault).ok || !git([...identity, 'commit', '-q', '-m', 'Initial Counsel OS knowledge base'], vault).ok) {
    warnings.push('the initial git commit failed; the repository exists but is empty');
    return 'failed';
  }
  return 'initialized';
}
