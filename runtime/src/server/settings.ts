import { z } from 'zod';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { writeFileAtomic } from '../core/atomic-write';
import { localityOf, type Capabilities, type Locality, type ModelProvider, type Usage } from '../core/types';
import { handlesFor, prefixOf, vendorFor, type VendorHandles } from '../providers/vendors';
import { isEnterprise, resolveEnterprise, validateFields } from '../providers/enterprise';
import { DEFAULT_STEP_TIMEOUT_MS, runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { readRegistry, writeRegistry, REGISTRY_WRITE, type RegistryFileData } from '../providers/registry';
import { keyStateFor, redact, writeSecretFields, type KeyState, type SecretStore, type SecretStoreKind } from '../providers/secrets';
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
  /** Where app-entered keys live (providers spec §5). Omitted → keys come
   * from the environment only and the key routes answer 503. */
  secrets?: SecretStore;
  /** The environment the registry reads `apiKeyEnv` from, for `keySet`. */
  env?: NodeJS.ProcessEnv;
  /** The home directory an enterprise vendor's own credential files sit
   * under (providers spec §3 step 5). Tests inject a temp one. */
  home?: string;
}

/** The registry entry's key variable for a provider: the entry's own, else
 * the vendor's usual one. `undefined` for the subscription and local tiers. */
function keyEnvFor(id: string, registry: RegistryFileData | null): string | undefined {
  const vendor = vendorFor(prefixOf(id));
  if (vendor === undefined || vendor.auth !== 'apikey') return undefined;
  const entry = registry?.providers?.find(e => e.id === id);
  return entry?.apiKeyEnv ?? vendor.keyEnv;
}

/** Whether `id` names a provider that takes an API key at all — the only
 * ones the key routes accept. */
export function takesKey(id: string): boolean {
  const vendor = vendorFor(prefixOf(id));
  return vendor !== undefined && vendor.kind === 'direct' && (vendor.auth === 'apikey' || isEnterprise(vendor));
}

/** A hard cap on a pasted key: every real one is well under it, and a
 * multi-kilobyte body is a paste of the wrong thing. */
export const KEY_MAX_BYTES = 4096;
/** `{ value }` for a one-key vendor; `{ fields }` for an enterprise one
 * (providers spec §3 step 5), validated per vendor in `enterprise.ts`. */
export const KeyBody = z.union([z.object({ value: z.string() }), z.object({ fields: z.record(z.string(), z.unknown()) })]);
export type KeyBodyData = z.infer<typeof KeyBody>;

/**
 * `PUT /providers/:id/key` — the one place a key travels. The store gets it,
 * the registry reloads so the provider builds with it, and the answer is
 * 204: nothing about the value comes back. Unknown or keyless providers are
 * 404; an empty or oversized value 400; no store 503.
 *
 * An enterprise vendor takes `{ fields }` instead — its secret fields, kept
 * as ONE store item — and answers 400 with `issues` when the set is not
 * one the vendor can sign with. A one-key vendor given fields, or an
 * enterprise vendor given a bare value, is 400 too.
 *
 * A reload that fails after the store took the key is reported as 422 with
 * the message scrubbed of the value — the key IS saved (the next reload
 * will pick it up), and the operator learns what else is wrong.
 */
export function putProviderKey(ctx: SettingsContext, id: string, input: KeyBodyData): Response {
  const store = ctx.settings.secrets;
  if (store === undefined) return Response.json({ error: 'this runtime has no secret store; set the key in the environment' }, { status: 503 });
  if (!takesKey(id)) return Response.json({ error: `${id} does not take an API key` }, { status: 404 });
  const vendor = vendorFor(prefixOf(id));
  let secrets: string[];
  if (isEnterprise(vendor)) {
    if (!('fields' in input)) return Response.json({ error: `${vendor.name} takes fields, not one key`, issues: [{ path: ['fields'], message: 'required' }] }, { status: 400 });
    const checked = validateFields(vendor, input.fields);
    if (!checked.ok) return Response.json({ error: `the ${vendor.name} credentials are incomplete`, issues: checked.issues }, { status: 400 });
    secrets = Object.values(checked.fields);
    try {
      writeSecretFields(store, id, checked.fields);
    } catch (err) {
      return Response.json({ error: redactAll(message(err), secrets) }, { status: 500 });
    }
  } else {
    if (!('value' in input)) return Response.json({ error: `${id} takes one key, not fields`, issues: [{ path: ['value'], message: 'required' }] }, { status: 400 });
    const trimmed = input.value.trim();
    if (trimmed === '') return Response.json({ error: 'the key is empty' }, { status: 400 });
    if (Buffer.byteLength(trimmed, 'utf8') > KEY_MAX_BYTES) return Response.json({ error: 'that is not an API key (too long)' }, { status: 400 });
    secrets = [trimmed];
    try {
      store.set(id, trimmed);
    } catch (err) {
      return Response.json({ error: redact(message(err), trimmed) }, { status: 500 });
    }
  }
  try {
    ctx.settings.reload();
  } catch (err) {
    return Response.json({ error: redactAll(message(err), secrets) }, { status: 422 });
  }
  return new Response(null, { status: 204 });
}

function redactAll(text: string, values: string[]): string {
  return values.reduce((t, v) => redact(t, v), text);
}

/** `DELETE /providers/:id/key` — idempotent; the registry reloads so the
 * provider falls back to the environment or to no key. */
export function deleteProviderKey(ctx: SettingsContext, id: string): Response {
  const store = ctx.settings.secrets;
  if (store === undefined) return Response.json({ error: 'this runtime has no secret store' }, { status: 503 });
  if (!takesKey(id)) return Response.json({ error: `${id} does not take an API key` }, { status: 404 });
  try {
    store.delete(id);
  } catch (err) {
    return Response.json({ error: message(err) }, { status: 500 });
  }
  try {
    ctx.settings.reload();
  } catch (err) {
    return Response.json({ error: message(err) }, { status: 422 });
  }
  return new Response(null, { status: 204 });
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
  /** Whether a key is set for an API-key provider (providers spec §5):
   * saved in the app, taken from the environment, or absent. Never the
   * value. Absent on providers that take no key. */
  keySet?: KeyState;
}

/** What `providerView` needs to answer `keySet`. */
export interface KeyContext {
  store: SecretStore | undefined;
  env: NodeJS.ProcessEnv;
  registry: RegistryFileData | null;
  home?: string;
}

/** What `keySet` says for an enterprise provider: the store, the
 * environment, the SDK's own chain, or nothing (`enterprise.ts`). */
function enterpriseKeyState(id: string, keys: KeyContext): KeyState {
  const vendor = vendorFor(prefixOf(id));
  if (!isEnterprise(vendor)) return false;
  const entry = keys.registry?.providers?.find(e => e.id === id);
  return resolveEnterprise(vendor, { id, entry, store: keys.store, env: keys.env, home: keys.home }).keyState;
}

/** The view of one loaded provider — the one shape `/health` and
 * `GET /settings` both hand out. */
export function providerView(p: ModelProvider, keys?: KeyContext): ProviderView {
  const vendor = vendorFor(prefixOf(p.id));
  // A direct provider remembers its base URL; the harness tiers have none.
  const baseURL = (p as { baseURL?: string }).baseURL;
  const locality = localityOf(p.capabilities);
  const handles = vendor === undefined ? null : handlesFor(vendor, baseURL);
  const view: ProviderView = { id: p.id, kind: p.kind, auth: p.capabilities.auth, capabilities: p.capabilities, locality, handles: locality === 'local' ? null : handles };
  if (keys !== undefined && takesKey(p.id)) {
    view.keySet = isEnterprise(vendor) ? enterpriseKeyState(p.id, keys) : keyStateFor(p.id, keyEnvFor(p.id, keys.registry), keys.store, keys.env);
  }
  return view;
}

/** The key context for a running server: the store, the environment the
 * registry reads, and the file (for per-entry `apiKeyEnv`). */
export function keyContext(ctx: SettingsContext): KeyContext {
  let registry: RegistryFileData | null = null;
  try {
    registry = readRegistry(ctx.settings.file);
  } catch {
    // A file that does not parse is `PUT /settings`'s problem; `keySet`
    // then falls back to the vendors' usual variables.
  }
  return { store: ctx.settings.secrets, env: ctx.settings.env ?? process.env, registry, ...(ctx.settings.home === undefined ? {} : { home: ctx.settings.home }) };
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
  /** Where app-entered keys are kept (providers spec §5), so the page can
   * say "Keychain" or "a file". `null` when this runtime has no store. */
  secrets: { where: SecretStoreKind } | null;
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
  const keys = keyContext(ctx);
  return {
    file: ctx.settings.file,
    registry: readRegistry(ctx.settings.file),
    effective: {
      default: effectiveDefault(state),
      stepTimeoutMs: state.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
      providers: state.providers.map(p => providerView(p, keys)),
    },
    secrets: ctx.settings.secrets === undefined ? null : { where: ctx.settings.secrets.where() },
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
