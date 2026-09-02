import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import type { ContentSource } from '../content/source';
import { ShippedContentError } from '../content/guard';
import { isCompiled } from '../core/embedded';
import { Role, SetupPlan, type SetupPlanInput } from './plan';
import { runSetup, SetupError, type SetupResult } from './run';

/**
 * `counsel-os init` (spec 2026-09-01 §4): the same plan the first-run
 * screen builds, from flags — or from questions on stdin when a flag is
 * missing and `--yes` was not given.
 */

/** Founder decision 2026-09-01: the default new vault location. */
export function defaultVault(home: string = homedir()): string {
  return join(home, 'Documents', 'Counsel OS');
}

/** `~` and `~/x` → the home directory; anything else resolved as given. */
export function expandHome(path: string, home: string = homedir()): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return join(home, path.slice(2));
  return isAbsolute(path) ? path : resolve(path);
}

export interface InitFlags {
  vault?: string;
  name?: string;
  org?: string;
  role?: string;
  jurisdiction?: string;
  practice?: string;
  'sample-matter'?: boolean;
  'no-git'?: boolean;
  'default-provider'?: string;
  yes?: boolean;
}

/** The questions, in the order the Express path asks them, keyed by the
 * plan field they fill. `role` accepts the three words the plan knows. */
const QUESTIONS: ReadonlyArray<{ key: 'name' | 'org' | 'role' | 'jurisdiction' | 'practice'; prompt: string; required: boolean }> = [
  { key: 'name', prompt: 'Your name', required: true },
  { key: 'org', prompt: 'Your organization or firm', required: false },
  { key: 'role', prompt: 'Your role (in-house / outside / solo)', required: true },
  { key: 'jurisdiction', prompt: 'Primary jurisdiction', required: false },
  { key: 'practice', prompt: 'What kind of law do you practice, and for what kind of organization or industry?', required: false },
];

/** Flags → a plan input plus what is still missing for a non-interactive run. */
export function parseInitArgs(flags: InitFlags, opts: { home?: string } = {}): { plan: SetupPlanInput; missing: string[] } {
  const home = opts.home ?? homedir();
  const missing: string[] = [];
  if (flags.name === undefined || flags.name.trim() === '') missing.push('name');
  if (flags.role === undefined) missing.push('role');
  else if (!Role.safeParse(flags.role).success) missing.push('role (in-house, outside, or solo)');
  const plan: SetupPlanInput = {
    vault: expandHome(flags.vault ?? defaultVault(home), home),
    identity: {
      name: flags.name ?? '',
      organization: flags.org ?? '',
      role: (Role.safeParse(flags.role).success ? flags.role : 'solo') as SetupPlanInput['identity']['role'],
      jurisdiction: flags.jurisdiction ?? '',
    },
    practice: flags.practice ?? '',
    sampleMatter: flags['sample-matter'] ?? true,
    git: !(flags['no-git'] ?? false),
    ...(flags['default-provider'] === undefined ? {} : { defaultProvider: flags['default-provider'] }),
  };
  return { plan, missing };
}

export interface InitDeps {
  content: ContentSource;
  home: string;
  pluginRoot: string;
  stdout?: { write(text: string): unknown };
  stderr?: { write(text: string): unknown };
  /** Answers a question; default: readline on the process's stdin. */
  ask?: (prompt: string) => Promise<string>;
  interactive?: boolean;
  osHome?: string;
}

async function askThrough(): Promise<(prompt: string) => Promise<string>> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return async (prompt: string) => (await rl.question(prompt)).trim();
}

/** What the closing card says, in one paragraph. */
export function summarize(result: SetupResult): string {
  const g = result.groups;
  const parts = [
    `${g.law.written} law areas' files`,
    `${g.standards.written} standards`,
    `${g.methods.written} methods`,
    `${g.library.written} clause-library files`,
    g.profile.written === 1 ? 'your profile' : 'your existing profile kept',
  ];
  const git =
    result.git === 'initialized' ? 'git initialized with an initial commit'
    : result.git === 'present' ? 'existing git repository kept'
    : result.git === 'unavailable' ? 'git not found, so no version control'
    : result.git === 'failed' ? 'git failed (see warnings)'
    : 'git skipped';
  const head = result.adopted ? `Adopted the Counsel OS vault at ${result.vault}` : `Created a Counsel OS vault at ${result.vault}`;
  return `${head}: ${parts.join(', ')}; ${git}.`;
}

/**
 * Runs init end to end and returns the exit code: 0 on success, 2 for a
 * bad or incomplete invocation, 1 when setup refused the vault.
 */
export async function runInit(flags: InitFlags, deps: InitDeps): Promise<number> {
  const out = deps.stdout ?? process.stdout;
  const err = deps.stderr ?? process.stderr;
  const interactive = deps.interactive ?? (!(flags.yes ?? false) && process.stdin.isTTY === true);
  const filled: InitFlags = { ...flags };

  if (interactive) {
    const ask = deps.ask ?? (await askThrough());
    out.write(`Set up counsel-os.\nVault: ${expandHome(filled.vault ?? defaultVault(deps.osHome), deps.osHome)}\n`);
    for (const q of QUESTIONS) {
      if (filled[q.key] !== undefined && filled[q.key] !== '') continue;
      let answer = '';
      for (;;) {
        answer = await ask(`${q.prompt}${q.required ? '' : ' (optional)'}: `);
        if (answer !== '' || !q.required) break;
        out.write('This one is needed.\n');
      }
      if (q.key === 'role' && !Role.safeParse(answer).success) {
        answer = /in.?house/i.test(answer) ? 'in-house' : /outside/i.test(answer) ? 'outside' : 'solo';
      }
      filled[q.key] = answer;
    }
  }

  const { plan, missing } = parseInitArgs(filled, { home: deps.osHome });
  if (missing.length > 0) {
    err.write(`counsel-os init: missing ${missing.join(', ')}. Pass --name and --role (with --yes), or run without --yes to be asked.\n`);
    return 2;
  }
  const parsed = SetupPlan.safeParse(plan);
  if (!parsed.success) {
    err.write(`counsel-os init: ${parsed.error.issues.map(i => i.message).join('; ')}\n`);
    return 2;
  }

  let result: SetupResult;
  try {
    result = runSetup(parsed.data, { content: deps.content, home: deps.home, pluginRoot: deps.pluginRoot });
  } catch (e) {
    if (e instanceof ShippedContentError) {
      err.write(`counsel-os init: ${e.message}\n`);
      return 1;
    }
    if (e instanceof SetupError) {
      err.write(`counsel-os init: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
  out.write(`${summarize(result)}\n`);
  for (const warning of result.warnings) out.write(`note: ${warning}\n`);
  out.write(`Next: start the runtime with \`${isCompiled() ? 'counsel-os' : 'bun runtime/src/cli.ts'} serve --open\`.\n`);
  return 0;
}
