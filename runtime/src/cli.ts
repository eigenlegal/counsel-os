#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { FsVaultStore } from './vault/fs-store';
import { fsSearch } from './vault/search';
import { guardedVaultTools } from './vault/vault-tools';
import { readVaultConfig } from './vault/resolve-root';
import { ToolRegistry } from './tools/registry';
import { builtinTools } from './tools/builtin';
import { Router, parseRouterConfig } from './router/router';
import { buildProviders } from './providers/index';
import { DEFAULT_TENANT, isTerminal, type ModelProvider } from './core/types';
import type { FakeScript } from './core/fake-provider';
import { DEFAULT_STEP_TIMEOUT_MS, withStepTimeout } from './loop/counsel-loop';
import { createInterface } from 'node:readline/promises';
import { repoContentSource } from './content/repo';
import { applyUpdates, contentStatus, renderContentStatus } from './content/update';
import { counselHome } from './core/home';
import { renderReport, runDoctor } from './doctor/index';
import { runInit } from './setup/init';
import { defaultPluginRoot, startServer } from './server/serve';
import { resolveLegalRoot } from './vault/resolve-root';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    vault: { type: 'string' },
    provider: { type: 'string' },
    port: { type: 'string' },       // `serve`: bind port (default 7431, then an OS-assigned one)
    'step-timeout': { type: 'string' }, // per-step deadline in ms (default 600000)
    task: { type: 'string' },
    schema: { type: 'string' },
    system: { type: 'string', default: 'You are counsel. Use the vault tools to answer. Be brief.' },
    session: { type: 'string' },      // resume a prior session/thread by id (Claude `resume` / Codex `resumeThread`)
    'codex-home': { type: 'string' }, // persistent CODEX_HOME so a resumed thread's isolated home survives across steps
    cwd: { type: 'string' },          // debug: pin the Claude harness's cwd (see docs/superpowers/spikes/2026-08-28-runtime-spikes.md, Step 2 — resume)
    fake: { type: 'boolean' },        // `serve`: register fake/fake as the default — no model is ever called
    'fake-script': { type: 'string' }, // `serve`: a JSON array of FakeScript steps for --fake
    open: { type: 'boolean' },        // `serve`: open the printed token URL in the browser
    dist: { type: 'string' },         // `serve`: the built UI to serve (default runtime/ui/dist)
    // `init` — the first-run answers as flags (spec 2026-09-01 §4); a
    // missing one is asked on stdin unless `--yes`.
    name: { type: 'string' },
    org: { type: 'string' },
    role: { type: 'string' },              // in-house | outside | solo
    jurisdiction: { type: 'string' },
    practice: { type: 'string' },
    'sample-matter': { type: 'boolean' },
    'no-git': { type: 'boolean' },
    'default-provider': { type: 'string' },
    yes: { type: 'boolean' },              // `init`: never prompt; `update-content`: apply without asking
    changes: { type: 'string' },      // `docx read`: all | accept | reject
    format: { type: 'string' },       // `docx extract|check`: json | markdown | text
    'dry-run': { type: 'boolean' },        // `update-content`: report only
  },
});

const [cmd, ...rest] = positionals;

function usage(): never {
  console.error('usage: bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json>] [--session <id>] [--codex-home <dir>] [--cwd <dir>] [--step-timeout <ms>] "<prompt>"');
  console.error('       bun runtime/src/cli.ts serve [--port <n>] [--vault <dir>] [--step-timeout <ms>] [--dist <dir>] [--open] [--fake [--fake-script <file.json>]]');
  console.error('         --dist <dir> is the built UI; everything in it is served WITHOUT a token, so it must not overlap the vault');
  console.error('       bun runtime/src/cli.ts init [--vault <dir>] [--name <n> --org <o> --role in-house|outside|solo --jurisdiction <j> --practice "<one line>"] [--default-provider <id>] [--no-git] [--yes]');
  console.error('         creates a Counsel OS vault (default ~/Documents/Counsel OS) and seeds it; asks for anything missing unless --yes');
  console.error('       bun runtime/src/cli.ts docx read <file.docx> [--changes all|accept|reject]   (markdown to stdout)');
  console.error('       bun runtime/src/cli.ts docx extract <file.docx> [--format json|markdown]  (tracked changes + comments)');
  console.error('       bun runtime/src/cli.ts docx check <file.docx|.md|.txt> [--format json|text] (mechanical QA)');
  console.error('       bun runtime/src/cli.ts update-content [--vault <dir>] [--yes] [--dry-run]');
  console.error('         compares the shipped law and practice content with the vault; applies law updates (never a file you changed)');
  console.error('       bun runtime/src/cli.ts doctor [--vault <dir>]');
  console.error('         read-only vault health: root config, structure, law currency, git, standards/library consistency, matter law impact');
  process.exit(2);
}

/**
 * `docx read|extract|check <file>`: the Word read path as a command, for the
 * Claude Code plugin and for anyone at a shell — the same TypeScript the
 * runtime's tools run, no Python and no pandoc. Reads the one file it is
 * given, anywhere on disk; the vault guard belongs to the tools, not here.
 */
async function docxCommand(sub: string | undefined, file: string | undefined): Promise<void> {
  const { checkDocx, checkText, detectFormat, docxToMarkdown, extractRedlines, extractToMarkdown, openDocx, renderReport } = await import('./docx');
  if (file === undefined || !['read', 'extract', 'check'].includes(sub ?? '')) usage();
  const bytes = new Uint8Array(await Bun.file(file).arrayBuffer());
  const format = values.format ?? 'json';
  try {
    if (sub === 'read') {
      const changes = values.changes ?? 'all';
      if (changes !== 'all' && changes !== 'accept' && changes !== 'reject') usage();
      const { markdown, warnings } = docxToMarkdown(openDocx(bytes), { changes });
      process.stdout.write(markdown);
      for (const w of warnings) console.error(`warning: ${w}`);
    } else if (sub === 'extract') {
      const data = extractRedlines(openDocx(bytes), file);
      process.stdout.write(format === 'markdown' ? `${extractToMarkdown(data)}\n` : `${JSON.stringify(data, null, 2)}\n`);
    } else {
      const fmt = detectFormat(file);
      const report = fmt === 'docx' ? checkDocx(openDocx(bytes), file) : checkText(new TextDecoder().decode(bytes), fmt, file);
      process.stdout.write(format === 'text' ? `${renderReport(report)}\n` : `${JSON.stringify(report, null, 2)}\n`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}


/** The vault for `update-content` / `doctor`: `--vault`, else the resolved
 * legal root — the same rule `serve` uses, minus setup mode: with no root
 * there is nothing to update or check. */
function vaultForMaintenance(): string {
  if (values.vault) return resolve(values.vault);
  const found = resolveLegalRoot({ env: process.env });
  if (found.ok) return found.root;
  if (found.code === 2) {
    console.error('Multiple Counsel OS legal roots found. Pass --vault or set COUNSEL_OS_LEGAL_ROOT:');
    for (const root of found.candidates) console.error(`  ${root}`);
  } else {
    console.error('No Counsel OS legal root found. Pass --vault <dir>, or run: bun runtime/src/cli.ts init');
  }
  process.exit(1);
}

/** A millisecond option: a bad one is the caller's mistake, and exits the
 * way a bad `--port` does rather than being rounded into something plausible. */
function millis(flag: string, raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const ms = Number(raw);
  if (!Number.isInteger(ms) || ms <= 0) {
    console.error(`--${flag} must be a positive whole number of milliseconds, got: ${raw}`);
    process.exit(2);
  }
  return ms;
}

// Both commands take it, so it is checked once, before either runs.
const stepTimeoutMs = millis('step-timeout', values['step-timeout']);

/** What `--fake` answers with when the caller gave no script: one canned
 * turn, enough to prove the page talks to the runtime. */
const DEFAULT_FAKE_SCRIPT: FakeScript[] = [{ text: 'This is the fake provider.' }];

/**
 * The `--fake-script` file: a JSON array of `FakeScript` steps, one per turn.
 * A bad file exits 2 rather than falling back to the default — a caller who
 * named a script and silently got the canned one would be debugging the
 * wrong thing.
 */
function fakeScript(file: string | undefined): FakeScript[] {
  if (file === undefined) return DEFAULT_FAKE_SCRIPT;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolve(file), 'utf8'));
  } catch (err) {
    console.error(`--fake-script could not be read: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
  if (!Array.isArray(parsed) || parsed.some(s => typeof s !== 'object' || s === null || Array.isArray(s))) {
    console.error('--fake-script must be a JSON array of script steps, e.g. [{"text":"hello"}]');
    process.exit(2);
  }
  return parsed as FakeScript[];
}

// `serve` runs the local HTTP/SSE runtime and then just stays up — Bun.serve
// keeps the process alive, and the signal handlers startServer installs are
// what remove ~/.counsel-os/runtime.json on the way out.
if (cmd === 'serve') {
  // A script with no `--fake` is a mistake worth naming: the file would be
  // read, ignored, and the real providers used.
  if (values['fake-script'] !== undefined && !values.fake) {
    console.error('--fake-script needs --fake');
    process.exit(2);
  }
  let port: number | undefined;
  if (values.port !== undefined) {
    port = Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error(`--port must be a port number, got: ${values.port}`);
      process.exit(2);
    }
  }
  try {
    await startServer({
      ...(values.vault ? { vault: values.vault } : {}),
      ...(port === undefined ? {} : { port }),
      ...(stepTimeoutMs === undefined ? {} : { stepTimeoutMs }),
      ...(values.dist ? { distDir: resolve(values.dist) } : {}),
      ...(values.open ? { open: true } : {}),
      ...(values.fake ? { fake: fakeScript(values['fake-script']) } : {}),
    });
  } catch (err) {
    // A refused `--dist`, a port already taken: the operator needs the
    // sentence, not a stack trace through Bun's internals.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
} else if (cmd === 'init') {
  const pluginRoot = defaultPluginRoot();
  const code = await runInit(
    {
      ...(values.vault === undefined ? {} : { vault: values.vault }),
      ...(values.name === undefined ? {} : { name: values.name }),
      ...(values.org === undefined ? {} : { org: values.org }),
      ...(values.role === undefined ? {} : { role: values.role }),
      ...(values.jurisdiction === undefined ? {} : { jurisdiction: values.jurisdiction }),
      ...(values.practice === undefined ? {} : { practice: values.practice }),
      ...(values['sample-matter'] === undefined ? {} : { 'sample-matter': values['sample-matter'] }),
      ...(values['no-git'] === undefined ? {} : { 'no-git': values['no-git'] }),
      ...(values['default-provider'] === undefined ? {} : { 'default-provider': values['default-provider'] }),
      ...(values.yes === undefined ? {} : { yes: values.yes }),
    },
    { content: repoContentSource(pluginRoot), home: counselHome(), pluginRoot },
  );
  process.exit(code);
} else if (cmd === 'docx') {
  await docxCommand(rest[0], rest[1]);
} else if (cmd === 'update-content') {
  const vaultRoot = vaultForMaintenance();
  const deps = { vaultRoot, content: repoContentSource(defaultPluginRoot()) };
  const status = contentStatus(deps);
  console.log(renderContentStatus(status));
  const pending = status.items.filter(i => i.applicable).map(i => i.path);
  if (pending.length === 0 || values['dry-run']) process.exit(0);
  let go = values.yes === true;
  if (!go && process.stdin.isTTY === true) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`Apply ${pending.length} update${pending.length === 1 ? '' : 's'}? [y/N] `)).trim().toLowerCase();
    rl.close();
    go = answer === 'y' || answer === 'yes';
  }
  if (!go) {
    console.log('Nothing applied. Rerun with --yes to apply.');
    process.exit(0);
  }
  const result = applyUpdates(deps, pending);
  console.log(`Applied ${result.applied.length}: ${result.applied.join(', ')}`);
  process.exit(0);
} else if (cmd === 'doctor') {
  const vaultRoot = vaultForMaintenance();
  const report = runDoctor({ vaultRoot, pluginRoot: defaultPluginRoot() });
  console.log(renderReport(report));
  process.exit(report.verdict === 'broken' ? 1 : 0);
} else {
  await step();
}

async function step(): Promise<void> {
  if (cmd !== 'step' || !values.vault || !values.provider || rest.length === 0) usage();

  const vaultRoot = resolve(values.vault);
  const repoRoot = resolve(import.meta.dir, '../..');
  const store = new FsVaultStore(vaultRoot, { search: fsSearch() });
  const registry = new ToolRegistry();
  for (const t of builtinTools({ vaultRoot, repoRoot })) registry.register(t);

  let provider: ModelProvider;
  let outputSchema: z.ZodType | undefined;
  try {
    const providers = buildProviders({
      ids: [values.provider],
      vaultRoot,
      ...(values.cwd ? { claudeCwd: resolve(values.cwd) } : {}),
      ...(values['codex-home'] ? { codexHomeDir: resolve(values['codex-home']) } : {}),
    });
    const router = new Router(parseRouterConfig(`default: ${values.provider}\n`), providers);
    // --task only has effect once a `tasks:` block exists in the router config;
    // this CLI always builds a bare `default: <provider>` config, so today it's a no-op.
    provider = router.resolve(values.task);
    outputSchema = values.schema
      ? z.fromJSONSchema(JSON.parse(readFileSync(values.schema, 'utf8')) as Record<string, unknown>)
      : undefined;
  } catch (err) {
    console.log(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  }

  const tools = [...guardedVaultTools(store, readVaultConfig(vaultRoot)), ...registry.available()];
  let exit = 1;
  const cancel = new AbortController();
  const events = provider.run({
    tenant: DEFAULT_TENANT,
    system: values.system!,
    messages: [{ role: 'user', content: rest.join(' ') }],
    tools,
    signal: cancel.signal,
    ...(outputSchema ? { outputSchema } : {}),
    ...(values.session ? { session: { id: values.session } } : {}),
  });
  // A hung provider ends the same way here as it does in the loop: the SDK is
  // aborted, the provider is closed, and the step ends with one terminal
  // `error` and a non-zero exit.
  for await (const ev of withStepTimeout(events, stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS, () => cancel.abort())) {
    console.log(JSON.stringify(ev));
    if (isTerminal(ev)) exit = ev.type === 'done' ? 0 : 1;
  }
  process.exit(exit);
}
