/**
 * The enterprise vendors (providers spec §3 step 5): Azure OpenAI, Amazon
 * Bedrock, Google Vertex — the ones whose credentials are not one API key.
 *
 * A vendor record carries a `fields` list instead of a `keyEnv`. The
 * non-secret fields (resource, region, project, location, profile) live on
 * the registry entry as `extra`; the secret ones (a key, an access key pair,
 * a service account) go to the secret store as ONE JSON item under the
 * provider's id. This module resolves the two into what the vendor's `make`
 * takes, in the order a firm laptop expects:
 *
 *   1. the store — what the operator pasted in Settings;
 *   2. the environment — the SDK's own variables (`AZURE_OPENAI_API_KEY`,
 *      `AWS_ACCESS_KEY_ID`…, `GOOGLE_APPLICATION_CREDENTIALS`), plus an AWS
 *      profile named by `AWS_PROFILE` or the entry, read from
 *      `~/.aws/credentials`;
 *   3. the SDK's default chain, where it has one — Bedrock finds the default
 *      AWS profile, Vertex finds gcloud's Application Default Credentials —
 *      reported as `default-chain` when the machine has such a thing.
 *
 * Nothing here logs a value or puts one in a message.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Vendor, VendorField } from './vendors';
import { readSecretFields, type KeyState, type SecretStore } from './secrets';

export interface EnterpriseResolution {
  /** The non-secret fields, resolved: entry → environment → the field's default. */
  extra: Record<string, string>;
  /** The secret fields, resolved: store → environment (→ an AWS profile). Empty
   * when the SDK is to use its own chain. */
  secrets: Record<string, string>;
  keyState: KeyState;
}

export interface ResolveOptions {
  id: string;
  entry?: { extra?: Record<string, string> | undefined } | undefined;
  store?: SecretStore | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  /** The home directory the AWS and gcloud files are looked up under.
   * Injected for tests. */
  home?: string | undefined;
}

export function isEnterprise(vendor: Vendor | undefined): vendor is Vendor & { fields: VendorField[] } {
  return vendor !== undefined && vendor.fields !== undefined;
}

function firstEnv(env: NodeJS.ProcessEnv, names: string[] | undefined): string | undefined {
  for (const n of names ?? []) {
    const v = env[n];
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

/**
 * One profile of `~/.aws/credentials` (the INI the AWS CLI writes), as the
 * SDK's shared-file provider would read it. Only the three credential keys
 * are taken; anything else in the profile is left alone.
 */
export function readAwsProfile(file: string, profile: string): Record<string, string> | null {
  if (!existsSync(file)) return null;
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let current: string | null = null;
  const out: Record<string, string> = {};
  let found = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith(';')) continue;
    const section = /^\[\s*(?:profile\s+)?([^\]]+?)\s*\]$/.exec(line);
    if (section !== null) {
      current = section[1] ?? null;
      if (current === profile) found = true;
      continue;
    }
    if (current !== profile) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim().toLowerCase();
    const v = line.slice(eq + 1).trim();
    if (k === 'aws_access_key_id') out['accessKeyId'] = v;
    else if (k === 'aws_secret_access_key') out['secretAccessKey'] = v;
    else if (k === 'aws_session_token') out['sessionToken'] = v;
  }
  if (!found || out['accessKeyId'] === undefined || out['secretAccessKey'] === undefined) return null;
  return out;
}

/** Whether the machine has something the vendor's SDK would find on its
 * own when handed no credentials: an AWS `default` profile, gcloud's ADC
 * file. Existence only — nothing is read. */
export function defaultChainPresent(vendor: Vendor, env: NodeJS.ProcessEnv, home: string): boolean {
  if (vendor.defaultChain !== true) return false;
  if (vendor.auth === 'sigv4') {
    const creds = env['AWS_SHARED_CREDENTIALS_FILE'] ?? join(home, '.aws', 'credentials');
    return readAwsProfile(creds, 'default') !== null || (env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] ?? '') !== '';
  }
  if (vendor.auth === 'gcp') {
    const adc = env['CLOUDSDK_CONFIG'] === undefined ? join(home, '.config', 'gcloud', 'application_default_credentials.json') : join(env['CLOUDSDK_CONFIG'], 'application_default_credentials.json');
    return existsSync(adc);
  }
  return false;
}

/**
 * What the provider builds with, and what `keySet` says. The store wins,
 * then the environment, then the SDK's own chain. A secret field whose
 * environment variable names a FILE (`GOOGLE_APPLICATION_CREDENTIALS`) is
 * left for the SDK to read — the runtime never opens it.
 */
export function resolveEnterprise(vendor: Vendor & { fields: VendorField[] }, opts: ResolveOptions): EnterpriseResolution {
  const env = opts.env ?? process.env;
  const home = opts.home ?? homedir();
  const entryExtra = opts.entry?.extra ?? {};

  const extra: Record<string, string> = {};
  for (const f of vendor.fields) {
    if (f.secret) continue;
    const v = entryExtra[f.name] ?? firstEnv(env, f.env) ?? f.default;
    if (v !== undefined && v !== '') extra[f.name] = v;
  }

  const secretFields = vendor.fields.filter(f => f.secret);
  // 1. The store.
  const stored = readSecretFields(opts.store, opts.id);
  if (stored !== null && secretFields.some(f => (stored[f.name] ?? '') !== '')) {
    const secrets: Record<string, string> = {};
    for (const f of secretFields) if ((stored[f.name] ?? '') !== '') secrets[f.name] = stored[f.name] as string;
    return { extra, secrets, keyState: true };
  }

  // 2. The environment.
  const secrets: Record<string, string> = {};
  for (const f of secretFields) {
    // A path to a key file is the SDK's to open, not ours.
    if (f.name === 'serviceAccountJson') continue;
    const v = firstEnv(env, f.env);
    if (v !== undefined) secrets[f.name] = v;
  }
  if (vendor.auth === 'sigv4' && secrets['accessKeyId'] === undefined && secrets['apiKey'] === undefined) {
    const profile = entryExtra['profile'] ?? env['AWS_PROFILE'];
    if (profile !== undefined && profile !== '') {
      const creds = env['AWS_SHARED_CREDENTIALS_FILE'] ?? join(home, '.aws', 'credentials');
      const fromProfile = readAwsProfile(creds, profile);
      if (fromProfile !== null) {
        // A profile the entry names is this machine's credential store at
        // work, which is what `default-chain` means to the operator.
        return { extra, secrets: fromProfile, keyState: entryExtra['profile'] === undefined ? 'env' : 'default-chain' };
      }
    }
  }
  if (Object.keys(secrets).length > 0 && complete(vendor, secrets)) return { extra, secrets, keyState: 'env' };
  if (vendor.auth === 'gcp' && (env['GOOGLE_APPLICATION_CREDENTIALS'] ?? '') !== '') return { extra, secrets: {}, keyState: 'env' };

  // 3. The SDK's own chain.
  if (defaultChainPresent(vendor, env, home)) return { extra, secrets: {}, keyState: 'default-chain' };
  return { extra, secrets: {}, keyState: false };
}

/** Whether a set of secret fields is enough for the vendor to sign a request. */
function complete(vendor: Vendor, secrets: Record<string, string>): boolean {
  switch (vendor.auth) {
    case 'azure':
      return (secrets['apiKey'] ?? '') !== '';
    case 'sigv4':
      return (secrets['apiKey'] ?? '') !== '' || ((secrets['accessKeyId'] ?? '') !== '' && (secrets['secretAccessKey'] ?? '') !== '');
    case 'gcp':
      return (secrets['apiKey'] ?? '') !== '' || (secrets['serviceAccountJson'] ?? '') !== '';
    default:
      return false;
  }
}

export interface FieldIssue {
  path: string[];
  message: string;
}

/** A pasted key is short; a service account JSON is a few kilobytes. */
export const FIELD_MAX_BYTES = 4096;
export const JSON_FIELD_MAX_BYTES = 16_384;

/**
 * The body of `PUT /providers/:id/key` for an enterprise vendor: `{ fields:
 * { <secret field>: value } }`. Only the vendor's SECRET fields are taken —
 * the rest belong on the registry entry, and a body that names them is
 * refused rather than silently dropped. Per vendor: Azure needs the key;
 * Bedrock needs the access key pair or a Bedrock API key (a session token
 * only beside the pair); Vertex needs a service account that parses or an
 * express-mode key. To use the SDK's own chain, send nothing — DELETE the
 * item instead.
 */
export function validateFields(vendor: Vendor & { fields: VendorField[] }, input: unknown): { ok: true; fields: Record<string, string> } | { ok: false; issues: FieldIssue[] } {
  const issues: FieldIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, issues: [{ path: ['fields'], message: 'fields must be an object' }] };
  const secretNames = new Set(vendor.fields.filter(f => f.secret).map(f => f.name));
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (!secretNames.has(name)) {
      issues.push({ path: ['fields', name], message: vendor.fields.some(f => f.name === name) ? `${name} is not a secret; it belongs on the provider row` : `${vendor.name} has no field ${name}` });
      continue;
    }
    if (typeof value !== 'string') {
      issues.push({ path: ['fields', name], message: `${name} must be a string` });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed === '') continue;
    const cap = name === 'serviceAccountJson' ? JSON_FIELD_MAX_BYTES : FIELD_MAX_BYTES;
    if (Buffer.byteLength(trimmed, 'utf8') > cap) {
      issues.push({ path: ['fields', name], message: `${name} is too long` });
      continue;
    }
    fields[name] = trimmed;
  }
  if (issues.length > 0) return { ok: false, issues };

  switch (vendor.auth) {
    case 'azure':
      if (fields['apiKey'] === undefined) issues.push({ path: ['fields', 'apiKey'], message: 'the API key is required' });
      break;
    case 'sigv4': {
      const pair = fields['accessKeyId'] !== undefined || fields['secretAccessKey'] !== undefined;
      if (pair && (fields['accessKeyId'] === undefined || fields['secretAccessKey'] === undefined)) {
        issues.push({ path: ['fields', fields['accessKeyId'] === undefined ? 'accessKeyId' : 'secretAccessKey'], message: 'the access key id and the secret access key go together' });
      }
      if (!pair && fields['sessionToken'] !== undefined) issues.push({ path: ['fields', 'sessionToken'], message: 'a session token needs the access key pair beside it' });
      if (!pair && fields['apiKey'] === undefined) issues.push({ path: ['fields'], message: 'give the access key id and secret access key, or a Bedrock API key; to use an AWS profile, name it on the row and save nothing here' });
      break;
    }
    case 'gcp': {
      const sa = fields['serviceAccountJson'];
      if (sa !== undefined) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(sa);
        } catch {
          parsed = null;
        }
        const o = (parsed ?? {}) as Record<string, unknown>;
        if (parsed === null || typeof o['client_email'] !== 'string' || typeof o['private_key'] !== 'string') {
          issues.push({ path: ['fields', 'serviceAccountJson'], message: 'that is not a service account key file (it needs client_email and private_key)' });
        }
      }
      if (sa === undefined && fields['apiKey'] === undefined) issues.push({ path: ['fields'], message: 'paste a service account JSON or an express-mode API key; to use Application Default Credentials, save nothing here' });
      break;
    }
    default:
      issues.push({ path: ['fields'], message: `${vendor.name} takes one key, not fields` });
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, fields };
}

/** Every value in a resolution, for redacting a message that might carry one. */
export function secretValues(res: { secrets: Record<string, string> } | Record<string, string>): string[] {
  const src = 'secrets' in res && typeof res.secrets === 'object' ? (res as { secrets: Record<string, string> }).secrets : (res as Record<string, string>);
  return Object.values(src).filter(v => typeof v === 'string' && v !== '');
}
