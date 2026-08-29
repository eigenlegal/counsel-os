import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { counselHome } from '../core/home';
import { FakeModelProvider, type FakeScript } from '../core/fake-provider';
import { DEFAULT_TENANT, type ModelProvider } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS } from '../loop/counsel-loop';
import { defaultRegistryFile, loadRegistry } from '../providers/registry';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { resolveLegalRoot } from '../vault/resolve-root';
import { createApp } from './routes';
import type { RuntimeState } from './settings';

type BunServer = ReturnType<typeof Bun.serve>;

/** The port the plugin adapter tries first. `runtime.json` is what actually
 * tells a client where the server is, so falling off it is not fatal. */
export const DEFAULT_PORT = 7431;

/** Loopback only (spec §4.5). Nothing here is safe on a public interface. */
export const HOSTNAME = '127.0.0.1';

export interface StartServerOptions {
  /** Vault root. Omitted → `resolveLegalRoot()`, the shared discovery algorithm. */
  vault?: string;
  /** Bind port. Omitted → `DEFAULT_PORT`, falling back to an OS-assigned one
   * when it is busy. An explicit port is never silently substituted. */
  port?: number;
  /** Where `skills/`, `primitives/`, and `scripts/` live. Defaults to the
   * repo root, or `COUNSEL_PLUGIN_ROOT` for an installed-plugin layout. */
  pluginRoot?: string;
  /** Overrides `<counselHome>/providers.yaml`. */
  registryFile?: string;
  /** The per-step deadline in milliseconds. Beats `stepTimeoutMs` in
   * `providers.yaml`; both beat `DEFAULT_STEP_TIMEOUT_MS`. */
  stepTimeoutMs?: number;
  /** Registers `fake/fake` with this script and makes it the default (spec
   * §2, "Fake provider for tests"). The whole runtime then answers without a
   * model — what the Playwright flow and the screenshots run against. */
  fake?: FakeScript[];
  /** Launch the token URL in the operator's browser once the server is up. */
  open?: boolean;
  /** The built UI's `dist/`. Omitted → `defaultDistDir()`. */
  distDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RunningServer {
  port: number;
  token: string;
  vault: string;
  url: string;
  /** The URL a human opens: the token rides in the fragment, which the
   * browser keeps to itself. This is the only place the token is printed. */
  tokenUrl: string;
  /** The thread store this server is serving from — exposed so a caller (and
   * the tests) can see where thread state, including each thread's Codex
   * home, actually lands. */
  store: ThreadStore;
  /** Stops listening and removes `runtime.json`. */
  stop(): Promise<void>;
}

/** `~/.counsel-os`, or `COUNSEL_OS_HOME` — the override the tests use so they
 * never touch the developer's real runtime file. Defined in `core/home.ts`
 * (the registry needs it too, without a server dependency) and re-exported
 * here, where it has always been imported from. */
export { counselHome };

/** Where each thread's persistent Codex home lives. Under `counselHome`, not
 * unconditionally under the real `$HOME`: these directories hold a copy of
 * the operator's `auth.json`, so they belong wherever the operator pointed
 * the runtime's state. */
export function codexHomeRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'codex');
}

/** The handshake file the plugin adapter reads (spec §4.7). */
export function runtimeFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'runtime.json');
}

export interface RuntimeFile {
  port: number;
  token: string;
  vault: string;
  pid: number;
  startedAt: string;
}

/**
 * The plugin root: `COUNSEL_PLUGIN_ROOT` when set (an installed plugin puts
 * `skills/` somewhere else entirely), otherwise the repo root — three levels
 * up from `runtime/src/server/`.
 */
export function defaultPluginRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.COUNSEL_PLUGIN_ROOT ?? resolve(import.meta.dir, '../../..');
}

/**
 * Where `bun run ui:build` puts the built page: `runtime/ui/dist`, relative
 * to this file rather than to the process's cwd, so `serve` finds it from
 * anywhere. Unlike the plugin root this is not overridable by environment —
 * the page ships with the runtime that serves it.
 */
export function defaultDistDir(): string {
  return resolve(import.meta.dir, '../../..', 'runtime', 'ui', 'dist');
}

/**
 * Refuses a `distDir` that overlaps the vault. Everything under `distDir` is
 * served with NO token — that is the whole point of static serving — so a
 * dist directory that is the vault, sits inside it, or contains it would
 * publish the practice's files to anything that can reach the port. Both
 * directions matter, and both sides are resolved through `realpath` first,
 * so a symlink cannot spell its way past the check.
 *
 * A path that does not exist yet is compared lexically instead: it cannot be
 * serving anything today, and if it appears later it will be checked on the
 * next start.
 */
export function assertDistOutsideVault(distDir: string, vaultRoot: string): void {
  const real = (p: string): string => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  const dist = real(distDir);
  const vault = real(vaultRoot);
  const overlaps = dist === vault || dist.startsWith(vault + sep) || vault.startsWith(dist + sep);
  if (overlaps) {
    throw new Error(
      `--dist must not overlap the vault: the UI directory is served with no token, so this would publish the vault. dist: ${dist}, vault: ${vault}`,
    );
  }
}

/** The command that opens a URL in the desktop browser, or `null` where
 * there is no safe one. Windows is deliberately `null`: `start` is a shell
 * builtin, so opening a URL there means handing a string with `#` and `&` in
 * it to `cmd.exe`, and the string contains the server's token. */
export function browserCommand(platform: NodeJS.Platform): string | null {
  if (platform === 'darwin') return 'open';
  if (platform === 'linux') return 'xdg-open';
  return null;
}

type Spawner = (cmd: string[], opts: { stdio: ['ignore', 'ignore', 'ignore'] }) => { unref(): void };

/**
 * Opens `url` in the operator's browser. Returns whether it spawned
 * anything.
 *
 * Detached and silent on purpose: the child outlives nothing (`unref`, so it
 * never holds the runtime open), and all three of its streams are `ignore`
 * — the URL carries the token, and a browser writing diagnostics to this
 * process's stdout would print it a second time, into whatever log the
 * operator is capturing.
 *
 * The token is nonetheless in the child's argv, where `ps` shows it to every
 * local account for as long as the `open` process lives; that is inherent to
 * handing a URL to a system opener, and it is the same secret `runtime.json`
 * already holds (0600) for the life of the server.
 *
 * Opening a browser is a convenience. A missing `xdg-open` must not take
 * down a server that is already listening, so a failure is swallowed.
 */
export function openUrl(url: string, opts: { platform?: NodeJS.Platform; spawn?: Spawner } = {}): boolean {
  const cmd = browserCommand(opts.platform ?? process.platform);
  if (cmd === null) return false;
  const spawn = opts.spawn ?? ((c, o) => Bun.spawn(c, o));
  try {
    spawn([cmd, url], { stdio: ['ignore', 'ignore', 'ignore'] }).unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the vault, or exits the way `scripts/resolve_legal_root.sh` does:
 * the same messages on stderr and the same 1/2 exit codes, so a user who has
 * seen one has seen both. `--vault` skips discovery entirely.
 */
export function resolveVaultOrExit(opts: StartServerOptions): string {
  if (opts.vault) return resolve(opts.vault);
  const env = opts.env ?? process.env;
  const found = resolveLegalRoot({ env });
  if (found.ok) return found.root;
  if (found.code === 2) {
    console.error('Multiple Counsel OS legal roots found. Set COUNSEL_OS_LEGAL_ROOT to choose one:');
    for (const root of found.candidates) console.error(`  ${root}`);
    process.exit(2);
  }
  if (env.COUNSEL_OS_LEGAL_ROOT) {
    console.error(`COUNSEL_OS_LEGAL_ROOT is not a marked Counsel OS legal root: ${env.COUNSEL_OS_LEGAL_ROOT}`);
  } else {
    console.error('No Counsel OS legal root found. Set COUNSEL_OS_LEGAL_ROOT, or run /counsel-os:setup.');
  }
  process.exit(1);
}

/**
 * Binds the app. The default port is a convenience, not a requirement — a
 * second runtime, or anything else already on 7431, falls through to an
 * OS-assigned port and publishes it in `runtime.json`. A port the caller
 * asked for explicitly is never substituted: they asked for that one.
 */
function listen(port: number | undefined, fetch: (req: Request) => Promise<Response>): BunServer {
  const serve = (p: number): BunServer => Bun.serve({ hostname: HOSTNAME, port: p, fetch, idleTimeout: 0 });
  if (port !== undefined) return serve(port);
  try {
    return serve(DEFAULT_PORT);
  } catch {
    return serve(0);
  }
}

/**
 * Publishes `runtime.json`, which holds the bearer token, so two properties
 * have to hold at once.
 *
 * 0600: `writeFileSync`'s mode applies only when it creates the file, so a
 * leftover world-readable file from an earlier run would keep its mode and
 * quietly publish the token. Writing a fresh temp file and renaming over the
 * old one replaces the inode, mode and all.
 *
 * Atomic: a reader (the plugin adapter, on every skill invocation) must
 * never catch a half-written file. `rename` within a directory is atomic, so
 * a reader sees either the old file or the new one.
 */
function writeRuntimeFile(path: string, contents: RuntimeFile): void {
  mkdirSync(join(path, '..'), { recursive: true, mode: 0o700 });
  // Named for this process: two servers starting at once must not write the
  // same temp file.
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(contents, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, path);
}

/** Reads the pid out of a `runtime.json`, or `null` when there is nothing
 * readable and parseable there. */
function runtimeFileOwner(path: string): number | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RuntimeFile>;
    return typeof parsed.pid === 'number' ? parsed.pid : null;
  } catch {
    return null;
  }
}

export interface RuntimeStateOptions {
  vaultRoot: string;
  /** Overrides `<counselHome>/providers.yaml`. */
  registryFile?: string;
  env?: NodeJS.ProcessEnv;
  /** Providers the registry file does not know about (`--fake`). */
  extraProviders?: ModelProvider[];
  /** A default that beats the file's (`--fake` again). */
  defaultId?: string;
  /** A step deadline that beats the file's. */
  stepTimeoutMs?: number;
}

export interface RuntimeHandle {
  /** The state as of now. A fresh object after every `reload`, so a caller
   * that held the old one keeps a consistent set rather than half of each. */
  state(): RuntimeState;
  /** Re-reads the registry file and installs the result. Throws when the
   * file does not build, and installs nothing when it does — `PUT /settings`
   * relies on that to answer 422 with the old runtime still live. */
  reload(): void;
}

/**
 * The live provider set, behind a getter (`PUT /settings` replaces it).
 *
 * Every caller-supplied override is re-applied on EVERY load, not merged in
 * once at startup: `serve --fake` puts a provider in front of the registry
 * without writing a config file, so a reload that only re-read the file
 * would silently drop it — and the fake is the default, which means the very
 * next step would go to a real model. The same holds for an explicit
 * `--step-timeout`: the flag outranks the file after a reload exactly as it
 * did before one.
 */
export function runtimeState(opts: RuntimeStateOptions): RuntimeHandle {
  const load = (): RuntimeState => {
    const loaded = loadRegistry({
      vaultRoot: opts.vaultRoot,
      ...(opts.env === undefined ? {} : { env: opts.env }),
      ...(opts.registryFile === undefined ? {} : { file: opts.registryFile }),
      ...(opts.extraProviders === undefined ? {} : { extraProviders: opts.extraProviders }),
      ...(opts.defaultId === undefined ? {} : { defaultId: opts.defaultId }),
    });
    return {
      providers: loaded.providers,
      router: loaded.router,
      defaultId: loaded.defaultId,
      // Explicit option first, then the registry file, then the default.
      stepTimeoutMs: opts.stepTimeoutMs ?? loaded.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
    };
  };

  let current = load();
  return {
    state: () => current,
    reload: () => {
      current = load();
    },
  };
}

/**
 * Starts the local runtime: resolve the vault, load the provider registry,
 * bind loopback, and publish `runtime.json` for the plugin adapter.
 *
 * The token is fresh per process — it lives only in that file (0600) and in
 * memory, so stopping the server ends every credential it issued.
 */
export async function startServer(opts: StartServerOptions = {}): Promise<RunningServer> {
  const env = opts.env ?? process.env;
  const vaultRoot = resolveVaultOrExit(opts);
  const pluginRoot = opts.pluginRoot ?? defaultPluginRoot(env);
  const distDir = opts.distDir ?? defaultDistDir();
  // Before anything binds: a dist that overlaps the vault is a config
  // mistake that would serve the vault without a token.
  assertDistOutsideVault(distDir, vaultRoot);
  // `--fake` puts the canned provider in front of the registry's own, as an
  // override rather than a config change: nothing is written to
  // `providers.yaml`, so the operator's real setup is untouched.
  const fake = opts.fake === undefined ? undefined : new FakeModelProvider(opts.fake);
  const registryFile = opts.registryFile ?? defaultRegistryFile(env);
  const runtime = runtimeState({
    vaultRoot,
    env,
    registryFile,
    ...(fake === undefined ? {} : { extraProviders: [fake], defaultId: fake.id }),
    ...(opts.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: opts.stepTimeoutMs }),
  });

  const token = randomBytes(32).toString('hex');
  // The store is given the environment's codex root explicitly: its own
  // default is the real `$HOME`, which would ignore `COUNSEL_OS_HOME` and
  // drop a copy of `auth.json` somewhere the operator never pointed at.
  const store = new ThreadStore(vaultRoot, { codexHomeRoot: codexHomeRoot(env) });
  const app = createApp({
    token,
    tenant: DEFAULT_TENANT,
    vaultRoot,
    pluginRoot,
    vault: new FsVaultStore(vaultRoot),
    store,
    state: runtime.state,
    settings: { file: registryFile, reload: runtime.reload },
    distDir,
  });

  const server = listen(opts.port, app);
  const port = server.port ?? opts.port ?? DEFAULT_PORT;
  const file = runtimeFilePath(env);
  writeRuntimeFile(file, { port, token, vault: vaultRoot, pid: process.pid, startedAt: new Date().toISOString() });

  // The handshake file must not outlive the process that owns it: a stale
  // one sends the adapter at a dead port with a dead token.
  let removed = false;
  const removeFile = (): void => {
    if (removed) return;
    removed = true;
    try {
      // Only if the file is still OURS. A second `serve` overwrites the
      // handshake and becomes the runtime the adapter talks to; this one
      // shutting down afterwards must not delete the live server's file and
      // leave the adapter with nothing. A file we cannot read or parse is
      // not provably ours either, so it stays.
      if (runtimeFileOwner(file) !== process.pid) return;
      rmSync(file, { force: true });
    } catch {
      /* best effort — the process is going away either way */
    }
  };
  const onSignal = (): void => {
    removeFile();
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  process.on('exit', removeFile);

  const url = `http://${HOSTNAME}:${port}`;
  const tokenUrl = `${url}/#token=${token}`;

  // The one line that carries the token, and the only one: it is what the
  // operator clicks. `runtime.json` (0600) is the other copy; nothing else
  // logs it.
  console.log(`counsel-os runtime on ${tokenUrl} (vault: ${vaultRoot})`);
  if (opts.open) openUrl(tokenUrl);

  return {
    port,
    token,
    vault: vaultRoot,
    url,
    tokenUrl,
    store,
    async stop(): Promise<void> {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      process.off('exit', removeFile);
      removeFile();
      await server.stop(true);
    },
  };
}
