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
import { shippedContent } from './content/shipped';
import { MANIFEST } from './content/manifest';
import { isCompiled } from './core/embedded';
import { ShippedContentError } from './content/guard';
import { applyUpdates, contentStatus, renderContentStatus } from './content/update';
import { counselHome } from './core/home';
import { renderReport, runDoctor } from './doctor/index';
import { runInit } from './setup/init';
import { defaultPluginRoot, startServer } from './server/serve';
import { resolveLegalRoot } from './vault/resolve-root';
import { ThreadStore } from './threads/store';
import { startRetro } from './retro/index';
import { runStep } from './loop/counsel-loop';
import { loadRegistry } from './providers/registry';
import { repoContentSource } from './content/repo';
import { FIXTURE_SETS, defaultBenchmarksDir, loadFixtures, sourceKindOf, type FixtureSet } from './evals/fixture';
import { BENCHMARKS, NotRedistributableError, benchmarkById } from './evals/benchmarks/index';
import { importBenchmark } from './evals/benchmarks/import';
import { pickJudge, providerJudge } from './evals/judge';
import { appendResult, readResults } from './evals/results';
import { runSet, summarize } from './evals/runner';
import { fixtureCounts, renderScoreboard, scoreboard } from './evals/scoreboard';
import { renderResult, renderSummary, runCount, runnable, selectFixtures, taskOf } from './evals/select';
import { confirmationMessage, estimateCost, needsConfirmation } from './evals/cost';

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
    'new-token': { type: 'boolean' }, // `serve`: mint a fresh bearer (signs every browser out)
    watch: { type: 'boolean' },       // `serve`: restart when the runtime's own source changes
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
    since: { type: 'string' },             // `retro`: the period start (YYYY-MM-DD); default = the last retro
    out: { type: 'string' },          // `docx apply`: where to write (default <original>-redline-<date>.docx)
    track: { type: 'boolean' },       // `docx apply`: native tracked changes
    author: { type: 'string' },       // `docx apply|compare`: the revision author
    fixture: { type: 'string', multiple: true }, // `eval`: one fixture id (repeatable)
    all: { type: 'boolean' },              // `eval`: every runnable fixture
    save: { type: 'boolean' },             // `eval`: append the lines to <vault>/.counsel/evals/results.jsonl
    json: { type: 'boolean' },             // `eval`: one JSON line per result instead of the text table
    repo: { type: 'string' },              // `eval`: the checkout the shipped fixtures live in (default: the plugin root)
    scoreboard: { type: 'boolean' },       // `eval`: print the scoreboard from the saved results instead of running
    set: { type: 'string' },               // `eval`: shipped | practice | benchmark
    subset: { type: 'string' },            // `eval import`: keep the first n items of each task
    tasks: { type: 'string' },             // `eval import`: comma-separated benchmark tasks
    dest: { type: 'string' },              // `eval import`: where the sets go (default <repo>/evals/benchmarks)
    refresh: { type: 'boolean' },          // `eval import`: fetch again instead of the cached download
    ours: { type: 'string' },         // `docx rounds`
    theirs: { type: 'string' },       // `docx rounds`
    base: { type: 'string' },         // `docx rounds`: the round N-1 baseline
    'full-text': { type: 'boolean' }, // `docx rounds --format markdown`: no truncation
  },
});

const [cmd, ...rest] = positionals;

/** The CLI as the user typed it: the binary's own name when compiled, the
 * checkout invocation otherwise — so every usage line is copy-pasteable. */
const SELF = isCompiled() ? 'counsel-os' : 'bun runtime/src/cli.ts';

function usage(): never {
  console.error('usage: bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json>] [--session <id>] [--codex-home <dir>] [--cwd <dir>] [--step-timeout <ms>] "<prompt>"');
  console.error('       bun runtime/src/cli.ts serve [--port <n>] [--vault <dir>] [--step-timeout <ms>] [--dist <dir>] [--open] [--new-token] [--watch] [--fake [--fake-script <file.json>]]');
  console.error('         --dist <dir> is the built UI; everything in it is served WITHOUT a token, so it must not overlap the vault');
  console.error('       bun runtime/src/cli.ts init [--vault <dir>] [--name <n> --org <o> --role in-house|outside|solo --jurisdiction <j> --practice "<one line>"] [--default-provider <id>] [--no-git] [--yes]');
  console.error('         creates a Counsel OS vault (default ~/Documents/Counsel OS) and seeds it; asks for anything missing unless --yes');
  console.error('       bun runtime/src/cli.ts docx read <file.docx> [--changes all|accept|reject]   (markdown to stdout)');
  console.error('       bun runtime/src/cli.ts docx extract <file.docx> [--format json|markdown]  (tracked changes + comments)');
  console.error('       bun runtime/src/cli.ts docx check <file.docx|.md|.txt> [--format json|text] (mechanical QA)');
  console.error('       bun runtime/src/cli.ts update-content [--vault <dir>] [--yes] [--dry-run]');
  console.error('         compares the shipped law and practice content with the vault; applies law updates (never a file you changed)');
  console.error('       bun runtime/src/cli.ts retro [--vault <dir>] [--since <YYYY-MM-DD>] [--provider <id>]');
  console.error('         opens a retro thread over the runtime\'s record of the period and runs its first step; knowledge changes come back as proposals');
  console.error('       bun runtime/src/cli.ts eval (--fixture <id> [--fixture <id>…] | --task <task> | --all) [--provider <id>] [--vault <dir>] [--save] [--yes] [--json] [--step-timeout <ms>]');
  console.error('         runs eval fixtures (the shipped set plus <vault>/practice/evals) through the loop on one provider and scores them; --yes accepts a run estimated over $1');
  console.error('       bun runtime/src/cli.ts eval --scoreboard [--vault <dir>] [--json]');
  console.error('         the scoreboard: per task and provider, the latest score per fixture set (practice · shipped · benchmark), from the saved results');
  console.error('       bun runtime/src/cli.ts eval --set benchmark [--all | --fixture <id> | --task <task>] …   runs an imported public benchmark');
  console.error('       bun runtime/src/cli.ts eval import <legalbench|cuad|maud|contract-nli|biglaw-bench> [--subset <n>] [--tasks a,b] [--dest <dir>] [--refresh]');
  console.error('         fetches a public benchmark into <dest>/<set>/ as fixtures + a vault and records its license in <dest>/LICENSES.md; `eval import` alone lists the sets');
  console.error('       bun runtime/src/cli.ts doctor [--vault <dir>]');
  console.error('         read-only vault health: root config, structure, law currency, git, standards/library consistency, matter law impact');
  console.error('       bun runtime/src/cli.ts docx apply <file.docx> <redlines.json> [--out <file>] [--track] [--author <name>] (the redline; result JSON to stdout, exit 2 on any skip)');
  console.error('       bun runtime/src/cli.ts docx compare <original.docx> <revised.docx> [--out <file>] [--author <name>] (tracked changes of revised against original)');
  console.error('       bun runtime/src/cli.ts docx rounds --ours <sent.docx> --theirs <returned.docx> [--base <round-n-1.docx>] [--format json|markdown] [--full-text]');
  console.error(`       ${SELF} version                      (the runtime and its shipped content version)`);
  console.error(`       ${SELF} mcp-stdio                    (the tools over MCP stdio — what the Codex tier spawns)`);
  process.exit(2);
}

/**
 * `docx read|extract|check <file>`: the Word read path as a command, for the
 * Claude Code plugin and for anyone at a shell — the same TypeScript the
 * runtime's tools run, no Python and no pandoc. Reads the one file it is
 * given, anywhere on disk; the vault guard belongs to the tools, not here.
 */
async function docxCommand(sub: string | undefined, file: string | undefined, second: string | undefined): Promise<void> {
  const { applyRedlines, checkDocx, checkText, compareDocuments, compareOutputName, detectFormat, diffRounds, docxToMarkdown, extractRedlines, extractToMarkdown, openDocx, redlineExitCode, redlineOutputName, renderReport, roundsToMarkdown } = await import('./docx');
  const format = values.format ?? 'json';
  if (sub === 'rounds') {
    if (values.ours === undefined || values.theirs === undefined) usage();
    try {
      const load = async (p: string) => openDocx(new Uint8Array(await Bun.file(p).arrayBuffer()));
      const data = diffRounds({
        ours: await load(values.ours),
        theirs: await load(values.theirs),
        base: values.base === undefined ? null : await load(values.base),
        names: { ours: values.ours, theirs: values.theirs, base: values.base ?? null },
      });
      process.stdout.write(format === 'markdown' ? `${roundsToMarkdown(data, values['full-text'] === true)}\n` : `${JSON.stringify(data, null, 2)}\n`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }
  if (file === undefined || !['read', 'extract', 'check', 'apply', 'compare'].includes(sub ?? '')) usage();
  const bytes = new Uint8Array(await Bun.file(file).arrayBuffer());
  try {
    if (sub === 'compare') {
      if (second === undefined) usage();
      const pkg = openDocx(bytes);
      const result = compareDocuments(pkg, openDocx(new Uint8Array(await Bun.file(second).arrayBuffer())), { author: values.author ?? 'Counsel OS' });
      const out = values.out ?? compareOutputName(file, new Date());
      const { writeFile } = await import('node:fs/promises');
      await writeFile(out, pkg.save(), { flag: 'wx' });
      const { stats, notes, ...json } = result;
      process.stdout.write(`${JSON.stringify({ ...json, output: out }, null, 2)}\n`);
      for (const n of notes) console.error(`warning: ${n}`);
      console.error(`Summary: ${result.paragraphs.changed} changed, ${result.paragraphs.inserted} inserted, ${result.paragraphs.deleted} deleted, ${result.skipped.length} skipped → ${out}`);
      process.exit(redlineExitCode(result));
    } else if (sub === 'apply') {
      if (second === undefined) usage();
      const items: unknown = JSON.parse(await Bun.file(second).text());
      if (!Array.isArray(items)) throw new Error(`${second}: expected a JSON array of redline items`);
      const pkg = openDocx(bytes);
      const result = applyRedlines(pkg, items, { track: values.track === true, ...(values.author === undefined ? {} : { defaultAuthor: values.author }) });
      const out = values.out ?? redlineOutputName(file, new Date());
      const { writeFile } = await import('node:fs/promises');
      await writeFile(out, pkg.save(), { flag: 'wx' });
      const { stats, notes, ...json } = result;
      process.stdout.write(`${JSON.stringify({ ...json, output: out }, null, 2)}\n`);
      for (const n of notes) console.error(`warning: ${n}`);
      console.error(`Summary: ${result.applied.length} applied, ${result.skipped.length} skipped, ${result.warnings.length} warnings → ${out}`);
      process.exit(redlineExitCode(result));
    } else if (sub === 'read') {
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
  /**
   * `--watch`: restart when the runtime's own source changes.
   *
   * A serve reads its code ONCE, at startup, and then keeps answering from
   * it — while serving the UI from disk, which a rebuild updates underneath.
   * A server left up overnight therefore hands you a new page driven by an
   * old runtime, with nothing on screen to say so. (There is something on
   * screen now: Settings › Runtime reports what the process is running and
   * how long it has been running it.)
   *
   * Bun already has a watcher, and it is a flag to `bun` rather than
   * anything a running script can switch on for itself — so re-exec once,
   * under it, and let it own the restarts.
   */
  if (values.watch) {
    if (isCompiled()) {
      console.error('--watch needs a source checkout: a compiled binary runs what it was built with and cannot reload.');
      process.exit(2);
    }
    // `Bun.argv` is [bun, entry, ...args]; keep the entry and drop the flag
    // so the child does not re-exec forever.
    const passthrough = Bun.argv.slice(1).filter(a => a !== '--watch');
    const child = Bun.spawn(['bun', '--watch', ...passthrough], { stdio: ['inherit', 'inherit', 'inherit'] });
    // Ctrl-C reaches the child through the terminal's process group; this
    // waits on it so the parent does not exit out from under it.
    process.exit(await child.exited);
  }

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
      ...(values['new-token'] ? { newToken: true } : {}),
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
    { content: shippedContent(pluginRoot), home: counselHome(), pluginRoot },
  );
  process.exit(code);
} else if (cmd === 'docx') {
  await docxCommand(rest[0], rest[1], rest[2]);
} else if (cmd === 'update-content') {
  const vaultRoot = vaultForMaintenance();
  const deps = { vaultRoot, content: shippedContent(defaultPluginRoot()) };
  let status: ReturnType<typeof contentStatus>;
  try {
    status = contentStatus(deps);
  } catch (err) {
    if (err instanceof ShippedContentError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
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
} else if (cmd === 'retro') {
  const vaultRoot = vaultForMaintenance();
  const pluginRoot = defaultPluginRoot();
  const store = new ThreadStore(vaultRoot);
  const start = await startRetro({ vaultRoot, tenant: DEFAULT_TENANT, store }, values.since === undefined ? {} : { since: values.since });
  console.error(`${start.title} — thread ${start.threadId}`);
  // The first step runs here when a provider resolves; without one the
  // thread still exists and the app can run it.
  let loaded: ReturnType<typeof loadRegistry> | null = null;
  try {
    loaded = loadRegistry({ vaultRoot });
  } catch (err) {
    console.error(`no provider to run the retro on: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (loaded === null) {
    console.log(start.message);
    console.error('Open the retro thread in the app to run it.');
    process.exit(0);
  }
  const vault = new FsVaultStore(vaultRoot, { search: fsSearch() });
  let exit = 1;
  const events = runStep(
    {
      tenant: DEFAULT_TENANT,
      vaultRoot,
      pluginRoot,
      content: shippedContent(pluginRoot),
      vault,
      store,
      providers: loaded.providers,
      router: loaded.router,
      ...(stepTimeoutMs === undefined ? {} : { stepTimeoutMs }),
    },
    { threadId: start.threadId, message: start.message, ...(values.provider ? { providerId: values.provider } : {}) },
  );
  for await (const ev of events) {
    console.log(JSON.stringify(ev));
    if (isTerminal(ev)) exit = ev.type === 'done' ? 0 : 1;
  }
  process.exit(exit);
} else if (cmd === 'version') {
  console.log(`counsel-os ${MANIFEST.version} (content ${MANIFEST.version}, ${Object.keys(MANIFEST.files).length} shipped files${isCompiled() ? ', compiled' : ', from a checkout'})`);
  process.exit(0);
} else if (cmd === 'mcp-stdio') {
  // The Codex tier's MCP bridge, as a subcommand so the compiled binary can
  // re-exec itself (packaging spec §3.3). The module serves until stdin
  // closes; nothing here returns.
  await import('./mcp/stdio');
} else if (cmd === 'eval' && rest[0] === 'import') {
  const pluginRoot = defaultPluginRoot();
  const repoRoot = values.repo === undefined ? pluginRoot : resolve(values.repo);
  const dest = values.dest === undefined ? defaultBenchmarksDir(repoRoot) : resolve(values.dest);
  const id = rest[1];
  if (id === undefined) {
    console.log('Public benchmarks `counsel-os eval import <set>` knows:');
    for (const b of BENCHMARKS) console.log(`  ${b.id.padEnd(14)} ${b.name} · ${b.license ?? 'no license published'} · ${b.tasks.length === 0 ? 'not importable' : `${b.tasks.length} task${b.tasks.length === 1 ? '' : 's'}`}`);
    console.log(`Sets land under ${dest}; --subset <n> keeps the first n items of each task.`);
    process.exit(0);
  }
  const loader = benchmarkById(id);
  if (loader === undefined) {
    console.error(`unknown benchmark: ${id} (one of ${BENCHMARKS.map(b => b.id).join(', ')})`);
    process.exit(2);
  }
  const subset = values.subset === undefined ? undefined : Number.parseInt(values.subset, 10);
  if (subset !== undefined && (!Number.isInteger(subset) || subset < 1)) {
    console.error('--subset must be a whole number of at least 1');
    process.exit(2);
  }
  const tasks = values.tasks === undefined ? undefined : values.tasks.split(',').map(t => t.trim()).filter(t => t !== '');
  try {
    const report = await importBenchmark({
      loader,
      dest,
      ...(subset === undefined ? {} : { subset }),
      ...(tasks === undefined ? {} : { tasks }),
      ...(values.refresh === undefined ? {} : { refresh: values.refresh }),
      content: shippedContent(pluginRoot),
      log: line => console.error(line),
    });
    console.log(`imported ${loader.name}: ${report.fixtures} fixture${report.fixtures === 1 ? '' : 's'}, ${report.items} item${report.items === 1 ? '' : 's'}${report.vaultDocuments === 0 ? '' : `, ${report.vaultDocuments} document${report.vaultDocuments === 1 ? '' : 's'} in the vault`}`);
    console.log(`  fixtures  ${report.fixturesDir}`);
    console.log(`  vault     ${report.vaultDir}`);
    console.log(`  licenses  ${report.licensesPath}`);
    console.log(`run it: counsel-os eval --set benchmark --all`);
  } catch (err) {
    if (err instanceof NotRedistributableError) {
      console.error(err.message);
      process.exit(3);
    }
    console.error(`import failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
} else if (cmd === 'eval') {
  const vaultRoot = vaultForMaintenance();
  const pluginRoot = defaultPluginRoot();
  // The shipped set comes through the content source — the compiled binary
  // has no `evals/` on disk; `--repo` reads another checkout's instead.
  const content = values.repo === undefined ? shippedContent(pluginRoot) : repoContentSource(resolve(values.repo));
  const repoRoot = values.repo === undefined ? pluginRoot : resolve(values.repo);
  if (values.set !== undefined && !(FIXTURE_SETS as readonly string[]).includes(values.set)) {
    console.error(`--set must be one of ${FIXTURE_SETS.join(', ')}`);
    process.exit(2);
  }
  const set = values.set as FixtureSet | undefined;
  const loaded = loadFixtures({ content, vaultRoot, benchmarksDir: values.dest === undefined ? defaultBenchmarksDir(repoRoot) : resolve(values.dest) });
  if (values.scoreboard === true) {
    const board = scoreboard(readResults(vaultRoot, { since: null }), fixtureCounts(loaded.map(l => ({ task: taskOf(l), set: sourceKindOf(l), runnable: runnable(l) }))));
    console.log(values.json === true ? JSON.stringify(board) : renderScoreboard(board));
    process.exit(0);
  }
  const selected = selectFixtures(loaded, {
    ...(values.fixture === undefined ? {} : { fixtures: values.fixture }),
    ...(values.task === undefined ? {} : { task: values.task }),
    ...(values.all === undefined ? {} : { all: values.all }),
    ...(set === undefined ? {} : { set }),
  });
  if (selected.error !== undefined) {
    console.error(selected.error);
    process.exit(2);
  }
  for (const s of selected.skipped) console.error(`skipping ${s.id}: ${s.reason}`);
  if (selected.fixtures.length === 0) {
    console.error('nothing to run');
    process.exit(2);
  }
  let registry: ReturnType<typeof loadRegistry>;
  try {
    registry = loadRegistry({ vaultRoot });
  } catch (err) {
    console.error(`no provider to run the evals on: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
  const providerId = values.provider ?? registry.router.resolve().id;
  if (!registry.providers.some(p => p.id === providerId)) {
    console.error(`unknown provider: ${providerId}`);
    process.exit(2);
  }
  // Pricing is only known for vendors that publish it through discovery
  // (OpenRouter); the CLI has no live listing, so the estimate is null and
  // the run says so rather than pretending it is free.
  // The calls the run makes, not the files it reads: one imported benchmark
  // fixture holds hundreds of documents.
  const calls = runCount(selected.fixtures);
  const estimate = estimateCost(calls, null);
  if (needsConfirmation(estimate, calls) && values.yes !== true) {
    console.error(`${confirmationMessage(estimate, calls, providerId)} Pass --yes to accept.`);
    process.exit(2);
  }
  const judge = pickJudge({ providers: registry.providers, router: registry.router, providerId, practiceSet: selected.fixtures.some(l => l.set === 'practice') });
  if (judge?.note !== undefined) console.error(judge.note);
  console.error(`running ${selected.fixtures.length} fixture${selected.fixtures.length === 1 ? '' : 's'} on ${providerId}${estimate === null ? ' (no price known for this provider)' : ` (~$${estimate.toFixed(2)})`}`);
  const results = await runSet({
    fixtures: selected.fixtures,
    providerId,
    deps: {
      pluginRoot,
      content: shippedContent(pluginRoot),
      providers: registry.providers,
      router: registry.router,
      ...(stepTimeoutMs === undefined ? {} : { stepTimeoutMs }),
      ...(judge === null ? {} : { judge: providerJudge(judge.provider) }),
    },
    onResult: line => {
      if (values.save === true) appendResult(vaultRoot, line);
      console.log(values.json === true ? JSON.stringify(line) : renderResult(line));
    },
  });
  const summary = summarize(results);
  if (values.json === true) console.log(JSON.stringify({ summary }));
  else console.log(renderSummary(summary));
  if (values.save === true) console.error(`saved ${results.length} line${results.length === 1 ? '' : 's'} to ${vaultRoot}/.counsel/evals/results.jsonl`);
  process.exit(summary.failed === 0 ? 0 : 1);
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
  // In the compiled binary there is no repo beside the executable; the
  // scripts-based tools are not registered there (`builtinTools`).
  const repoRoot = isCompiled() ? process.cwd() : resolve(import.meta.dir, '../..');
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
