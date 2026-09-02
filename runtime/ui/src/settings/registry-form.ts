/**
 * The registry file ⇄ the form on screen.
 *
 * Pure, and its own module, because this is where the two shapes disagree.
 * `providers.yaml` is optional fields all the way down — an absent
 * `capabilities.tools` means "whatever the provider says", which is NOT the
 * same as `false` — while an HTML control always holds a value. Every
 * optional field therefore gets an explicit empty state here, and a field
 * left empty is OMITTED from the registry rather than written as a default
 * the operator never chose.
 */
import type { Capabilities, RegistryEntry, RegistryFileData, SettingsIssue, TaskRouteData } from '../api/types';

/** An optional boolean as a control can hold it: unset, on, or off. */
export type Tri = '' | 'yes' | 'no';

export interface ProviderRow {
  /** Stable across edits, so React does not reuse a removed row's inputs
   * for the row that took its index. Never sent to the server. */
  key: string;
  id: string;
  baseURL: string;
  apiKeyEnv: string;
  tools: Tri;
  caching: Tri;
  thinking: Tri;
  contextTokens: string;
  auth: '' | Capabilities['auth'];
  /** An enterprise vendor's NON-secret fields (providers spec §3 step 5):
   * resource, region, project, location, profile. Saved as the entry's
   * `extra`; the secret fields never enter the form. */
  extra: Record<string, string>;
}

/**
 * One task route as a row of controls. `TaskRoute` on the server is a small
 * closed shape — `prefer`, four `require` fields, `allow_remote` — so a row
 * of controls renders ALL of it and a round trip loses nothing. (This
 * replaced the raw-JSON textarea the first Settings page shipped with.)
 */
export interface RouteRow {
  /** Stable across edits, like `ProviderRow.key`. Never sent. */
  key: string;
  /** The task name — the record's key in the file. */
  task: string;
  prefer: string;
  tools: Tri;
  caching: Tri;
  thinking: Tri;
  contextTokens: string;
  /** `allow_remote`, whose absence means "allowed". */
  remote: Tri;
}

export interface FormState {
  default: string;
  stepTimeoutMs: string;
  providers: ProviderRow[];
  routes: RouteRow[];
}

/**
 * Keyed by field: `default`, `stepTimeoutMs`, or a path into the registry
 * such as `providers.1.baseURL`, `providers.1.capabilities.contextTokens`,
 * or `tasks.review.prefer`.
 *
 * The key is deliberately `issue.path.join('.')` — the shape a zod issue
 * from a 400 already has — so a server-side error and a client-side one land
 * on the same input with no translation table between them. The one
 * exception is a route row's OWN validation, keyed `route.<row key>.<field>`
 * instead: a client-side route error can belong to a row whose task name is
 * empty or duplicated, which no server path could address.
 */
export type FieldErrors = Record<string, string>;

let counter = 0;
function nextKey(): string {
  counter += 1;
  return `row-${counter}`;
}

function tri(value: boolean | undefined): Tri {
  return value === undefined ? '' : value ? 'yes' : 'no';
}

export function emptyRow(): ProviderRow {
  return { key: nextKey(), id: '', baseURL: '', apiKeyEnv: '', tools: '', caching: '', thinking: '', contextTokens: '', auth: '', extra: {} };
}

/**
 * The guided starts (cou-84). Each returns a PREFILLED row, not a saved one:
 * the operator still reads it, finishes it, and presses the one Save — so a
 * misclick costs nothing and the save semantics stay whole-form.
 */

/** "I have an OpenAI API key." The id is the vendor's current flagship; the
 * key is named by environment variable, never typed into the form. */
export function openaiKeyRow(): ProviderRow {
  return { ...emptyRow(), id: 'openai/gpt-5.6', apiKeyEnv: 'OPENAI_API_KEY' };
}

/** "I run a model with Ollama." The id is left for the operator to finish —
 * only they know which model `ollama list` shows. */
export function ollamaRow(): ProviderRow {
  return { ...emptyRow(), id: 'ollama/' };
}

/** "I have a key for <vendor>." The id is the prefix, left for the operator
 * to finish with a model (the picker lands in step 3); the key's variable
 * is the vendor's usual one. */
export function vendorKeyRow(prefix: string, keyEnv: string): ProviderRow {
  return { ...emptyRow(), id: `${prefix}/`, apiKeyEnv: keyEnv };
}

/** A local OpenAI-compatible server at a known port (LM Studio). */
export function presetRow(baseURL: string): ProviderRow {
  return { ...emptyRow(), id: 'openai-compatible/', baseURL };
}

/** A row from the catalog picker (providers spec §3): the prefix, the
 * usual key variable, and a preset's base URL when it has one. The id is
 * left for the operator to finish with a model (the picker lands in step 3). */
export function catalogRow(v: { prefix: string; keyEnv?: string; baseURL?: string; fields?: Array<{ name: string; secret: boolean; default?: string }> }): ProviderRow {
  // An enterprise vendor's non-secret fields start at their defaults
  // (`location: us-central1`); the secret ones are not the form's to hold.
  const extra: Record<string, string> = {};
  for (const f of v.fields ?? []) if (!f.secret && f.default !== undefined) extra[f.name] = f.default;
  return { ...emptyRow(), id: `${v.prefix}/`, apiKeyEnv: v.keyEnv ?? '', baseURL: v.baseURL ?? '', extra };
}

export function emptyRoute(): RouteRow {
  return { key: nextKey(), task: '', prefer: '', tools: '', caching: '', thinking: '', contextTokens: '', remote: '' };
}

export function routeRowFrom(task: string, route: TaskRouteData): RouteRow {
  const req = route.require ?? {};
  return {
    key: nextKey(),
    task,
    prefer: route.prefer,
    tools: tri(req.tools),
    caching: tri(req.caching),
    thinking: tri(req.thinking),
    contextTokens: req.contextTokens === undefined ? '' : String(req.contextTokens),
    remote: tri(route.allow_remote),
  };
}

/**
 * A millisecond count as a person would say it — "2 minutes", "1 minute 30
 * seconds" — for the step-timeout field, whose unit the server fixed in
 * milliseconds long before anyone had to read it. Empty string when there is
 * nothing sayable (not a positive finite number).
 */
export function humanDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  if (ms < 1000) return `${ms} ms`;
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export function rowFromEntry(entry: RegistryEntry): ProviderRow {
  const caps = entry.capabilities ?? {};
  return {
    key: nextKey(),
    id: entry.id,
    baseURL: entry.baseURL ?? '',
    apiKeyEnv: entry.apiKeyEnv ?? '',
    tools: tri(caps.tools),
    caching: tri(caps.caching),
    thinking: tri(caps.thinking),
    contextTokens: caps.contextTokens === undefined ? '' : String(caps.contextTokens),
    auth: caps.auth ?? '',
    extra: { ...(entry.extra ?? {}) },
  };
}

export function formFromRegistry(reg: RegistryFileData): FormState {
  return {
    default: reg.default ?? '',
    stepTimeoutMs: reg.stepTimeoutMs === undefined ? '' : String(reg.stepTimeoutMs),
    providers: (reg.providers ?? []).map(rowFromEntry),
    routes: Object.entries(reg.tasks ?? {}).map(([task, route]) => routeRowFrom(task, route)),
  };
}

export type BuildResult = { ok: true; registry: RegistryFileData } | { ok: false; errors: FieldErrors };

function boolOf(value: Tri): boolean | undefined {
  return value === '' ? undefined : value === 'yes';
}

/**
 * The form as a registry, or the fields that stop it being one.
 *
 * The checks here are only the ones a round trip cannot make: a number that
 * is not a number, JSON that will not parse, a provider with no id. Anything
 * the server's schema owns — the `baseURL` rule above all — is left to the
 * server, so there is one definition of it and the page cannot drift into
 * accepting what the runtime rejects.
 */
export function registryFromForm(form: FormState): BuildResult {
  const errors: FieldErrors = {};
  const registry: RegistryFileData = {};

  const defaultId = form.default.trim();
  if (defaultId !== '') registry.default = defaultId;

  const timeout = form.stepTimeoutMs.trim();
  if (timeout !== '') {
    const ms = Number(timeout);
    if (!Number.isInteger(ms) || ms <= 0) errors.stepTimeoutMs = 'must be a whole number of milliseconds above zero';
    else registry.stepTimeoutMs = ms;
  }

  const providers: RegistryEntry[] = [];
  form.providers.forEach((row, index) => {
    const id = row.id.trim();
    if (id === '') {
      errors[`providers.${index}.id`] = 'id is required';
      return;
    }

    const capabilities: Partial<Capabilities> = {};
    const tools = boolOf(row.tools);
    if (tools !== undefined) capabilities.tools = tools;
    const caching = boolOf(row.caching);
    if (caching !== undefined) capabilities.caching = caching;
    const thinking = boolOf(row.thinking);
    if (thinking !== undefined) capabilities.thinking = thinking;
    const context = row.contextTokens.trim();
    if (context !== '') {
      const tokens = Number(context);
      if (!Number.isInteger(tokens) || tokens <= 0) errors[`providers.${index}.capabilities.contextTokens`] = 'must be a whole number above zero';
      else capabilities.contextTokens = tokens;
    }
    if (row.auth !== '') capabilities.auth = row.auth;

    // The enterprise fields: trimmed, the empty ones left out, so the file
    // never carries `region: ''` as if the operator had chosen it.
    const extra: Record<string, string> = {};
    for (const [name, value] of Object.entries(row.extra ?? {})) if (value.trim() !== '') extra[name] = value.trim();

    providers.push({
      id,
      ...(row.baseURL.trim() === '' ? {} : { baseURL: row.baseURL.trim() }),
      ...(row.apiKeyEnv.trim() === '' ? {} : { apiKeyEnv: row.apiKeyEnv.trim() }),
      ...(Object.keys(extra).length === 0 ? {} : { extra }),
      ...(Object.keys(capabilities).length === 0 ? {} : { capabilities }),
    });
  });
  if (providers.length > 0) registry.providers = providers;

  // Route rows are error-keyed by `route.<row key>.<field>`, NOT by task
  // name: two rows can hold the same (or an empty) name while being edited,
  // and each still deserves its own message on its own row.
  const tasks: Record<string, TaskRouteData> = {};
  const seen = new Set<string>();
  for (const row of form.routes) {
    const name = row.task.trim();
    if (name === '') {
      errors[`route.${row.key}.task`] = 'name the kind of work this route matches';
      continue;
    }
    if (seen.has(name)) {
      errors[`route.${row.key}.task`] = `there is already a route for "${name}"`;
      continue;
    }
    seen.add(name);
    if (row.prefer.trim() === '') {
      errors[`route.${row.key}.prefer`] = 'pick the provider this work should go to';
      continue;
    }

    const require: NonNullable<TaskRouteData['require']> = {};
    const tools = boolOf(row.tools);
    if (tools !== undefined) require.tools = tools;
    const caching = boolOf(row.caching);
    if (caching !== undefined) require.caching = caching;
    const thinking = boolOf(row.thinking);
    if (thinking !== undefined) require.thinking = thinking;
    const context = row.contextTokens.trim();
    if (context !== '') {
      const tokens = Number(context);
      if (!Number.isInteger(tokens) || tokens <= 0) errors[`route.${row.key}.contextTokens`] = 'must be a whole number above zero';
      else require.contextTokens = tokens;
    }

    tasks[name] = {
      prefer: row.prefer.trim(),
      ...(Object.keys(require).length === 0 ? {} : { require }),
      ...(row.remote === '' ? {} : { allow_remote: row.remote === 'yes' }),
    };
  }
  if (Object.keys(tasks).length > 0) registry.tasks = tasks;

  return Object.keys(errors).length === 0 ? { ok: true, registry } : { ok: false, errors };
}

/**
 * A 400's `issues` split into the fields they name and the ones nobody can
 * place. An issue whose path is empty, or points at a shape the form does
 * not draw (inside `tasks`, say), still has to be READ — dropping it would
 * leave the operator with a rejected save and no reason for it — so it comes
 * back in `general` and the form prints it above the fields.
 */
export function mapIssues(issues: SettingsIssue[]): { fields: FieldErrors; general: string[] } {
  const fields: FieldErrors = {};
  const general: string[] = [];
  for (const issue of issues) {
    const key = (issue.path ?? []).join('.');
    if (key === '') {
      general.push(issue.message);
      continue;
    }
    fields[key] = issue.message;
  }
  return { fields, general };
}

/** The server-side error keys one route row's controls look up, given the
 * row's task name. The form checks these; `unplacedTaskMessages` uses the
 * same list to find the ones nothing will show. */
export function routeErrorKeys(name: string): string[] {
  return [
    `tasks.${name}`,
    `tasks.${name}.prefer`,
    `tasks.${name}.require.tools`,
    `tasks.${name}.require.caching`,
    `tasks.${name}.require.thinking`,
    `tasks.${name}.require.contextTokens`,
    `tasks.${name}.allow_remote`,
  ];
}

/**
 * The `tasks.*` messages from a 400 that no rendered row will claim — a row
 * was renamed after the failed save, or the issue names a shape no control
 * draws. They still have to be READ (the save failed for them), so the form
 * prints them with the general notices instead of dropping them.
 */
export function unplacedTaskMessages(fields: FieldErrors, rows: RouteRow[]): string[] {
  const placed = new Set(rows.flatMap(row => routeErrorKeys(row.task.trim())));
  return Object.entries(fields)
    .filter(([key]) => (key === 'tasks' || key.startsWith('tasks.')) && !placed.has(key))
    .map(([key, message]) => `${key}: ${message}`);
}
