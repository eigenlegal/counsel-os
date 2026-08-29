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
import type { Capabilities, RegistryEntry, RegistryFileData, SettingsIssue } from '../api/types';

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
}

export interface FormState {
  default: string;
  stepTimeoutMs: string;
  providers: ProviderRow[];
  /** `tasks` as JSON text. The router's task table is a nested map that no
   * flat form renders honestly, and it is edited rarely; a textarea that
   * round-trips it exactly beats a form that flattens it wrongly. */
  tasks: string;
}

/**
 * Keyed by field: `default`, `stepTimeoutMs`, `tasks`, or a path into the
 * registry such as `providers.1.baseURL` or
 * `providers.1.capabilities.contextTokens`.
 *
 * The key is deliberately `issue.path.join('.')` — the shape a zod issue
 * from a 400 already has — so a server-side error and a client-side one land
 * on the same input with no translation table between them.
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
  return { key: nextKey(), id: '', baseURL: '', apiKeyEnv: '', tools: '', caching: '', thinking: '', contextTokens: '', auth: '' };
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
  };
}

export function formFromRegistry(reg: RegistryFileData): FormState {
  return {
    default: reg.default ?? '',
    stepTimeoutMs: reg.stepTimeoutMs === undefined ? '' : String(reg.stepTimeoutMs),
    providers: (reg.providers ?? []).map(rowFromEntry),
    // Pretty-printed: the operator reads this before they edit it. An empty
    // string, not `{}`, when there are no tasks — so saving an untouched
    // form does not write a key that was not there.
    tasks: reg.tasks === undefined ? '' : JSON.stringify(reg.tasks, null, 2),
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

    providers.push({
      id,
      ...(row.baseURL.trim() === '' ? {} : { baseURL: row.baseURL.trim() }),
      ...(row.apiKeyEnv.trim() === '' ? {} : { apiKeyEnv: row.apiKeyEnv.trim() }),
      ...(Object.keys(capabilities).length === 0 ? {} : { capabilities }),
    });
  });
  if (providers.length > 0) registry.providers = providers;

  const tasks = form.tasks.trim();
  if (tasks !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(tasks);
    } catch (err) {
      errors.tasks = `not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
      parsed = undefined;
    }
    if (parsed !== undefined) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        errors.tasks = 'must be a JSON object of task name → route';
      } else {
        registry.tasks = parsed as Record<string, unknown>;
      }
    }
  }

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
    // Everything under `tasks` is one textarea on screen, so the sub-path
    // goes into the message instead of into the key — otherwise an issue at
    // `tasks.review.prefer` would have no field to attach to.
    if (key === 'tasks' || key.startsWith('tasks.')) {
      const detail = key === 'tasks' ? issue.message : `${key}: ${issue.message}`;
      fields.tasks = fields.tasks === undefined ? detail : `${fields.tasks}; ${detail}`;
      continue;
    }
    fields[key] = issue.message;
  }
  return { fields, general };
}
