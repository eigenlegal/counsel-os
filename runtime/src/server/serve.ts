import { randomBytes } from 'node:crypto';
import { readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { shippedContent } from '../content/shipped';
import { embeddedUi, isCompiled } from '../core/embedded';
import type { StaticSource } from './static';
import { autoApplyLawUpdates } from '../content/update';
import { writeFileAtomic } from '../core/atomic-write';
import { counselHome } from '../core/home';
import { FakeModelProvider, type FakeScript } from '../core/fake-provider';
import { DEFAULT_TENANT, type ModelProvider } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS } from '../loop/counsel-loop';
import { defaultRegistryFile, loadRegistry } from '../providers/registry';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { fsSearch } from '../vault/search';
import { resolveLegalRoot } from '../vault/resolve-root';
import { createApp, type App } from './routes';
import type { RuntimeState } from './settings';
import { createSetupApp } from './setup-routes';

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
  /** The built UI: a `dist/` directory (or the embedded set). Omitted → `defaultUi()`. */
  distDir?: string | StaticSource;
  /** Mint a fresh bearer even when `runtime.json` holds one. Every browser
   * signed in with the old one is signed out. */
  newToken?: boolean;
  env?: NodeJS.ProcessEnv;
  /** The user's real home, for setup mode's probes. Omitted → `env.HOME`,
   * then `os.homedir()` — the same rule the root resolver applies. */
  osHome?: string;
}

export interface RunningServer {
  port: number;
  token: string;
  /** `null` while the runtime is in setup mode (spec 2026-09-01 §4): no
   * legal root existed at start and `POST /setup` has not created one. */
  vault: string | null;
  url: string;
  /** The URL a human opens: the token rides in the fragment, which the
   * browser keeps to itself. This is the only place the token is printed. */
  tokenUrl: string;
  /** The thread store this server is serving from — exposed so a caller (and
   * the tests) can see where thread state, including each thread's Codex
   * home, actually lands. Throws in setup mode: there is no vault to store
   * threads in yet. */
  readonly store: ThreadStore;
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
  /** `null` in setup mode; rewritten with the vault once one is set up. */
  vault: string | null;
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
 * The UI this runtime serves (packaging spec §3.2): the embedded set in the
 * compiled binary, the built `dist/` directory in a checkout. `--dist` still
 * overrides either — a developer pointing the binary at a fresh build.
 */
export function defaultUi(): string | StaticSource {
  const ui = embeddedUi();
  if (ui !== null) return { kind: 'embedded', files: ui.files };
  if (isCompiled()) throw new Error('this counsel-os binary has no embedded UI — a build error; rebuild with `bun run build:runtime`');
  return defaultDistDir();
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
 * Resolves the vault: `--vault` skips discovery entirely; otherwise the
 * shared algorithm runs. Two outcomes still exit the way
 * `scripts/resolve_legal_root.sh` does, because they are configuration
 * mistakes the user must resolve — several marked roots (2), or a
 * `COUNSEL_OS_LEGAL_ROOT` that is not a marked root (1). NO root at all is
 * not an error any more (spec 2026-09-01 §4): it returns `null`, and the
 * server starts in setup mode so the page can create one.
 */
export function resolveVaultOrSetup(opts: StartServerOptions): string | null {
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
    process.exit(1);
  }
  return null;
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
 * Publishes `runtime.json`, which holds the bearer token: 0600, in a 0700
 * directory, and atomically — the plugin adapter reads this file on every
 * skill invocation and must never catch a half-written one. `writeFileAtomic`
 * is where both properties are argued; this is the caller that needs them
 * most.
 */
function writeRuntimeFile(path: string, contents: RuntimeFile): void {
  writeFileAtomic(path, JSON.stringify(contents, null, 2) + '\n', { mode: 0o600, dirMode: 0o700 });
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

/** The shape this runtime mints: `randomBytes(32).toString('hex')`. A file
 * holding anything else is not trusted as a token — it is minted over. */
const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

/** Where the install's secret lives: `<counselHome>/token`, 0600. Separate
 * from `runtime.json`, which is a HANDSHAKE (port, pid, vault) and is
 * removed when the server stops — the secret has to outlive that. */
export function tokenFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'token');
}

/**
 * The token to serve with: the install's, when the token file holds one of
 * the right shape and `fresh` is not asked for; else a new one, written
 * there for next time.
 *
 * Per INSTALL, not per process (the earlier rule): the browser remembers
 * the sign-in in a cookie whose value is the token (auth.ts), and a token
 * that changed on every restart would sign every browser out on every
 * restart — the "paste the address again" the founder objected to. The
 * file is 0600 in a 0700 directory, like `runtime.json` always was, so
 * keeping the secret exposes nothing that publishing it did not.
 */
function chooseToken(file: string, fresh: boolean): string {
  if (!fresh) {
    try {
      const held = readFileSync(file, 'utf8').trim();
      if (TOKEN_SHAPE.test(held)) return held;
    } catch {
      /* no file yet: mint */
    }
  }
  const token = randomBytes(32).toString('hex');
  writeFileAtomic(file, token + '\n', { mode: 0o600, dirMode: 0o700 });
  return token;
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
 * The token is per install: `runtime.json` (0600) keeps it across restarts
 * so the browser's cookie stays good, and `newToken` rotates it.
 */
export async function startServer(opts: StartServerOptions = {}): Promise<RunningServer> {
  const env = opts.env ?? process.env;
  const pluginRoot = opts.pluginRoot ?? defaultPluginRoot(env);
  const distDir: string | StaticSource = opts.distDir ?? defaultUi();
  const content = shippedContent(pluginRoot);
  // `--fake` puts the canned provider in front of the registry's own, as an
  // override rather than a config change: nothing is written to
  // `providers.yaml`, so the operator's real setup is untouched.
  const fake = opts.fake === undefined ? undefined : new FakeModelProvider(opts.fake);
  const registryFile = opts.registryFile ?? defaultRegistryFile(env);
  const file = runtimeFilePath(env);
  const token = chooseToken(tokenFilePath(env), opts.newToken === true);
  const startedAt = new Date().toISOString();

  let vaultRoot: string | null = resolveVaultOrSetup(opts);
  let store: ThreadStore | null = null;

  /** The app over a vault — what this server has always been. Built once
   * at start when a root exists, or once from `POST /setup` when not. */
  const buildApp = (vault: string): App => {
    // Before anything is served from it: a dist that overlaps the vault is
    // a config mistake that would serve the vault without a token.
    if (typeof distDir === 'string') assertDistOutsideVault(distDir, vault);
    const runtime = runtimeState({
      vaultRoot: vault,
      env,
      registryFile,
      ...(fake === undefined ? {} : { extraProviders: [fake], defaultId: fake.id }),
      ...(opts.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: opts.stepTimeoutMs }),
    });
    // The store is given the environment's codex root explicitly: its own
    // default is the real `$HOME`, which would ignore `COUNSEL_OS_HOME` and
    // drop a copy of `auth.json` somewhere the operator never pointed at.
    store = new ThreadStore(vault, { codexHomeRoot: codexHomeRoot(env) });
    // `auto_apply_law_updates: true` (spec 2026-09-01 §6): law updates the
    // vault has not modified are applied at start, and said so once. A
    // failure here is logged, never fatal — the vault serves as it is.
    try {
      const auto = autoApplyLawUpdates({ vaultRoot: vault, content });
      if (auto.applied.length > 0) console.log(`counsel-os runtime: applied ${auto.applied.length} law update${auto.applied.length === 1 ? '' : 's'} (auto_apply_law_updates)`);
    } catch (err) {
      console.error(`counsel-os runtime: auto-apply of law updates failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return createApp({
      token,
      tenant: DEFAULT_TENANT,
      vaultRoot: vault,
      pluginRoot,
      content,
      vault: new FsVaultStore(vault, { search: fsSearch() }),
      store,
      state: runtime.state,
      settings: { file: registryFile, reload: runtime.reload },
      distDir,
    });
  };

  // Setup mode (spec 2026-09-01 §4): the page and the setup API only, until
  // `POST /setup` seeds a vault — then the real app takes over in place,
  // same process, same token, and `runtime.json` learns the vault.
  let handler: App =
    vaultRoot === null
      ? createSetupApp({
          token,
          tenant: DEFAULT_TENANT,
          distDir,
          content,
          home: counselHome(env),
          pluginRoot,
          env,
          osHome: opts.osHome ?? env.HOME ?? homedir(),
          ...(opts.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: opts.stepTimeoutMs }),
          onSetup: vault => {
            handler = buildApp(vault);
            vaultRoot = vault;
            writeRuntimeFile(file, { port: server.port ?? opts.port ?? DEFAULT_PORT, token, vault, pid: process.pid, startedAt });
            console.log(`counsel-os runtime: vault set up at ${vault}`);
          },
        })
      : buildApp(vaultRoot);

  const server = listen(opts.port, req => handler(req));
  const port = server.port ?? opts.port ?? DEFAULT_PORT;
  writeRuntimeFile(file, { port, token, vault: vaultRoot, pid: process.pid, startedAt });

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
  console.log(
    vaultRoot === null
      ? `counsel-os runtime on ${tokenUrl} (no vault yet — the page sets one up, or run \`bun runtime/src/cli.ts init\`)`
      : `counsel-os runtime on ${tokenUrl} (vault: ${vaultRoot})`,
  );
  if (opts.open) openUrl(tokenUrl);

  return {
    port,
    token,
    get vault() {
      return vaultRoot;
    },
    url,
    tokenUrl,
    get store() {
      if (store === null) throw new Error('no vault yet: the runtime is in setup mode');
      return store;
    },
    async stop(): Promise<void> {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      process.off('exit', removeFile);
      removeFile();
      await server.stop(true);
    },
  };
}
