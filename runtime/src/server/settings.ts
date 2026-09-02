import { z } from 'zod';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { writeFileAtomic } from '../core/atomic-write';
import { localityOf, type Capabilities, type Locality, type ModelProvider, type Usage } from '../core/types';
import { handlesFor, prefixOf, vendorFor, type VendorHandles } from '../providers/vendors';
import { DEFAULT_STEP_TIMEOUT_MS, runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { readRegistry, writeRegistry, REGISTRY_WRITE, type RegistryFileData } from '../providers/registry';
import type { Router } from '../router/router';

/**
 * Everything about a running server that `PUT /settings` can replace.
 *
 * It is held in one object, and read through a getter on every request,
 * because a reload has to be atomic from the outside: a request that saw the
 * new provider list must also see the new router, and a request in flight
 * during a reload must keep the whole set it started with. Handing the app
 * `providers` and `router` separately made a reload two assignments with a
 * visible gap between them.
 */
export interface RuntimeState {
  providers: ModelProvider[];
  router: Router;
  /** What `/health` and `/settings` report as the default. Omitted → whatever
   * the router resolves with no task. */
  defaultId?: string;
  /** The effective per-step deadline. Omitted → `DEFAULT_STEP_TIMEOUT_MS`. */
  stepTimeoutMs?: number;
}

/** The registry file this runtime edits, and the reload that installs a new
 * one. `reload` throws when the file on disk does not build, and leaves the
 * live state untouched when it does. */
export interface SettingsDeps {
  file: string;
  reload(): void;
}

/** What the settings routes need from the server: the file plus the live
 * state, read fresh (a `PUT` answers with the state it just installed). */
export interface SettingsContext {
  settings: SettingsDeps;
  state(): RuntimeState;
}

/** The body of `POST /settings/test`. */
export const TestBody = z.object({ provider: z.string().min(1) });

/** The message the provider test sends. Short and unambiguous on purpose:
 * it is billed to the operator, and the point is only "did a token come
 * back", never the answer. */
export const TEST_MESSAGE = 'Reply with the single word OK.';

/** The scratch thread's title. It exists for one step and is deleted in a
 * `finally`; the title is what an operator would see if a crash ever left
 * one behind. */
export const TEST_THREAD_TITLE = 'settings-test';

/** A minute, not the runtime's step timeout: a cold local model can take far
 * longer than a configured deadline meant for real work, and a test that
 * reports "timed out" for a provider that works is worse than a slow test. */
export const TEST_TIMEOUT_MS = 60_000;

export interface ProviderView {
  id: string;
  kind: ModelProvider['kind'];
  auth: Capabilities['auth'];
  capabilities: Capabilities;
  /** Where the text goes (providers spec §6). */
  locality: Locality;
  /** Who receives it, or `null` when it stays on this machine. */
  handles: VendorHandles | null;
}

/** The view of one loaded provider — the one shape `/health` and
 * `GET /settings` both hand out. */
export function providerView(p: ModelProvider): ProviderView {
  const vendor = vendorFor(prefixOf(p.id));
  // A direct provider remembers its base URL; the harness tiers have none.
  const baseURL = (p as { baseURL?: string }).baseURL;
  const locality = localityOf(p.capabilities);
  const handles = vendor === undefined ? null : handlesFor(vendor, baseURL);
  return { id: p.id, kind: p.kind, auth: p.capabilities.auth, capabilities: p.capabilities, locality, handles: locality === 'local' ? null : handles };
}

export interface SettingsView {
  /** Absolute path, so the page can tell the operator which file it edits. */
  file: string;
  registry: RegistryFileData;
  effective: {
    default: string | null;
    stepTimeoutMs: number;
    providers: ProviderView[];
  };
}

/**
 * The provider a step with no task and no explicit provider would get. An
 * explicit default wins; otherwise the router decides, and a router that can
 * satisfy nothing reports `null` rather than throwing — `/health` and
 * `/settings` are how an operator DIAGNOSES that state, so they have to
 * answer while it holds.
 */
export function effectiveDefault(state: RuntimeState): string | null {
  if (state.defaultId !== undefined) return state.defaultId;
  try {
    return state.router.resolve().id;
  } catch {
    return null;
  }
}

/** The registry as configured plus the runtime it actually produced. Both,
 * because they differ: `--fake` and the built-ins are live providers that
 * appear in no file. */
export function settingsView(ctx: SettingsContext): SettingsView {
  const state = ctx.state();
  return {
    file: ctx.settings.file,
    registry: readRegistry(ctx.settings.file),
    effective: {
      default: effectiveDefault(state),
      stepTimeoutMs: state.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
      providers: state.providers.map(p => providerView(p)),
    },
  };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Writes the registry and reloads onto it.
 *
 * A registry can be well-formed and still unusable — `openai-compatible`
 * with no `baseURL` parses and then fails to construct — so the only honest
 * validation is to build it. That means writing first and undoing the write
 * when the build fails: the previous contents go back exactly as they were
 * (or the file is removed, when there was none), so a rejected `PUT` leaves
 * the operator's configuration where they left it. The live state never
 * moved: `reload` installs nothing when `loadRegistry` throws.
 *
 * The snapshot is a `Buffer`, not a decoded string, and it goes back through
 * the same atomic write the forward path uses. A restore that decoded as
 * UTF-8 would silently replace any byte sequence that is not valid UTF-8
 * with U+FFFD — turning "your change was rejected" into "your file was
 * quietly rewritten", which is the one thing this path exists to prevent.
 *
 * Callers must hold the settings lock: this is read-modify-write on a file,
 * and two of them interleaved could restore over each other.
 */
export function applySettings(ctx: SettingsContext, next: RegistryFileData): Response {
  const { file } = ctx.settings;
  const previous = existsSync(file) ? readFileSync(file) : null;
  writeRegistry(file, next);
  try {
    ctx.settings.reload();
  } catch (err) {
    if (previous === null) rmSync(file, { force: true });
    else writeFileAtomic(file, previous, REGISTRY_WRITE);
    return Response.json({ error: message(err) }, { status: 422 });
  }
  return Response.json(settingsView(ctx));
}

export interface TestResult {
  ok: boolean;
  usage?: Usage;
  error?: string;
  ms: number;
}

/**
 * One real step against one provider, on a thread that exists only for it.
 *
 * This costs the operator a model call, which is why the page says so before
 * it fires. A failure is a 200 with `ok: false`, not an error status: the
 * request succeeded — the answer is that the provider does not work, and the
 * message is the useful part of it. Only an id that names no provider is a
 * 404, and it is checked before anything is created.
 *
 * `deps` carries the LIVE provider set, so a provider added by the `PUT`
 * immediately before is testable without a restart.
 */
export async function testProvider(deps: CounselLoopDeps, providerId: string): Promise<Response> {
  if (!deps.providers.some(p => p.id === providerId)) {
    return Response.json({ error: `unknown provider: ${providerId}` }, { status: 404 });
  }

  const startedAt = Date.now();
  const thread = await deps.store.create(deps.tenant, { title: TEST_THREAD_TITLE });
  let usage: Usage | undefined;
  let error: string | undefined;
  try {
    for await (const ev of runStep(deps, {
      threadId: thread.id,
      message: TEST_MESSAGE,
      providerId,
      timeoutMs: TEST_TIMEOUT_MS,
    })) {
      if (ev.type === 'done') usage = ev.usage;
      if (ev.type === 'error') error = ev.message;
    }
  } catch (err) {
    // `runStep` reports a failed step as an `error` event; anything that
    // throws out of it failed before or around the step. Either way the
    // operator asked one question, and this is the answer to it.
    error = message(err);
  } finally {
    // In a `finally`: a scratch thread that outlived its test would show up
    // in the operator's thread list as a mystery.
    await deps.store.remove(deps.tenant, thread.id);
  }

  const result: TestResult = {
    ok: error === undefined && usage !== undefined,
    ...(usage === undefined ? {} : { usage }),
    ...(error === undefined ? {} : { error }),
    ms: Date.now() - startedAt,
  };
  return Response.json(result);
}
