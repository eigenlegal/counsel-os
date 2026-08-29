#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { FsVaultStore } from './vault/fs-store';
import { guardedVaultTools } from './vault/vault-tools';
import { readVaultConfig } from './vault/resolve-root';
import { ToolRegistry } from './tools/registry';
import { builtinTools } from './tools/builtin';
import { Router, parseRouterConfig } from './router/router';
import { buildProviders } from './providers/index';
import { DEFAULT_TENANT, isTerminal, type ModelProvider } from './core/types';
import type { FakeScript } from './core/fake-provider';
import { DEFAULT_STEP_TIMEOUT_MS, withStepTimeout } from './loop/counsel-loop';
import { startServer } from './server/serve';

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
  },
});

const [cmd, ...rest] = positionals;

function usage(): never {
  console.error('usage: bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json>] [--session <id>] [--codex-home <dir>] [--cwd <dir>] [--step-timeout <ms>] "<prompt>"');
  console.error('       bun runtime/src/cli.ts serve [--port <n>] [--vault <dir>] [--step-timeout <ms>] [--dist <dir>] [--open] [--fake [--fake-script <file.json>]]');
  process.exit(2);
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
  await startServer({
    ...(values.vault ? { vault: values.vault } : {}),
    ...(port === undefined ? {} : { port }),
    ...(stepTimeoutMs === undefined ? {} : { stepTimeoutMs }),
    ...(values.dist ? { distDir: resolve(values.dist) } : {}),
    ...(values.open ? { open: true } : {}),
    ...(values.fake ? { fake: fakeScript(values['fake-script']) } : {}),
  });
} else {
  await step();
}

async function step(): Promise<void> {
  if (cmd !== 'step' || !values.vault || !values.provider || rest.length === 0) usage();

  const vaultRoot = resolve(values.vault);
  const repoRoot = resolve(import.meta.dir, '../..');
  const store = new FsVaultStore(vaultRoot);
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
