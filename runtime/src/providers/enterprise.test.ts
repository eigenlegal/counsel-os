import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultChainPresent, readAwsProfile, resolveEnterprise, validateFields } from './enterprise';
import { encodeSecretFields, memoryStore } from './secrets';
import { vendorFor, type Vendor, type VendorField } from './vendors';

const azure = vendorFor('azure') as Vendor & { fields: VendorField[] };
const bedrock = vendorFor('bedrock') as Vendor & { fields: VendorField[] };
const vertex = vendorFor('vertex') as Vendor & { fields: VendorField[] };

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'enterprise-home-'));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

function awsCredentials(text: string): string {
  mkdirSync(join(home, '.aws'), { recursive: true });
  const file = join(home, '.aws', 'credentials');
  writeFileSync(file, text, 'utf8');
  return file;
}

describe('resolveEnterprise — store → environment → the SDK’s own chain (spec §3 step 5)', () => {
  test('azure: the store wins over the environment; the environment stands in; nothing → false', () => {
    const store = memoryStore({ 'azure/dep': encodeSecretFields({ apiKey: 'stored-key' }) });
    const env = { AZURE_OPENAI_API_KEY: 'env-key', AZURE_OPENAI_API_VERSION: '2024-10-21' };
    const fromStore = resolveEnterprise(azure, { id: 'azure/dep', entry: { extra: { resourceName: 'firm' } }, store, env, home });
    expect(fromStore).toEqual({ extra: { resourceName: 'firm', apiVersion: '2024-10-21' }, secrets: { apiKey: 'stored-key' }, keyState: true });
    const fromEnv = resolveEnterprise(azure, { id: 'azure/dep', entry: { extra: { resourceName: 'firm', apiVersion: 'v1' } }, store: memoryStore(), env, home });
    // The entry's own non-secret field beats the environment's.
    expect(fromEnv).toEqual({ extra: { resourceName: 'firm', apiVersion: 'v1' }, secrets: { apiKey: 'env-key' }, keyState: 'env' });
    // The SDK's own spelling of the variable is honoured too.
    expect(resolveEnterprise(azure, { id: 'azure/dep', env: { AZURE_API_KEY: 'k2' }, home }).secrets).toEqual({ apiKey: 'k2' });
    expect(resolveEnterprise(azure, { id: 'azure/dep', env: {}, home })).toEqual({ extra: {}, secrets: {}, keyState: false });
  });

  test('a plain key under the id (not the envelope) is not mistaken for fields', () => {
    const store = memoryStore({ 'azure/dep': 'just-a-string' });
    expect(resolveEnterprise(azure, { id: 'azure/dep', store, env: {}, home }).keyState).toBe(false);
  });

  test('bedrock: keys from the store; else AWS_* from the environment; else a named profile from ~/.aws/credentials', () => {
    const store = memoryStore({ 'bedrock/m': encodeSecretFields({ accessKeyId: 'AKIA-store', secretAccessKey: 's-store' }) });
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', entry: { extra: { region: 'us-east-1' } }, store, env: { AWS_ACCESS_KEY_ID: 'AKIA-env', AWS_SECRET_ACCESS_KEY: 's-env' }, home })).toEqual({
      extra: { region: 'us-east-1' },
      secrets: { accessKeyId: 'AKIA-store', secretAccessKey: 's-store' },
      keyState: true,
    });
    const env = { AWS_ACCESS_KEY_ID: 'AKIA-env', AWS_SECRET_ACCESS_KEY: 's-env', AWS_SESSION_TOKEN: 't', AWS_REGION: 'eu-west-1' };
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', env, home })).toEqual({ extra: { region: 'eu-west-1' }, secrets: { accessKeyId: 'AKIA-env', secretAccessKey: 's-env', sessionToken: 't' }, keyState: 'env' });
    // A bearer key alone is enough (AWS_BEARER_TOKEN_BEDROCK).
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', env: { AWS_BEARER_TOKEN_BEDROCK: 'b' }, home })).toMatchObject({ secrets: { apiKey: 'b' }, keyState: 'env' });
    // Half a pair is not credentials.
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', env: { AWS_ACCESS_KEY_ID: 'AKIA-env' }, home }).keyState).toBe(false);

    awsCredentials('[default]\naws_access_key_id = AKIA-default\naws_secret_access_key = s-default\n\n[firm]\naws_access_key_id=AKIA-firm\naws_secret_access_key=s-firm\naws_session_token=tok\n');
    // AWS_PROFILE names the profile: environment.
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', env: { AWS_PROFILE: 'firm' }, home })).toMatchObject({ secrets: { accessKeyId: 'AKIA-firm', secretAccessKey: 's-firm', sessionToken: 'tok' }, keyState: 'env' });
    // The row names it: the machine's own credential store — default-chain.
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', entry: { extra: { region: 'us-east-1', profile: 'firm' } }, env: {}, home })).toMatchObject({ extra: { region: 'us-east-1', profile: 'firm' }, secrets: { accessKeyId: 'AKIA-firm' }, keyState: 'default-chain' });
    // A profile that is not in the file: nothing to sign with, but the
    // default profile is there for the SDK — default-chain, no secrets.
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', entry: { extra: { profile: 'nope' } }, env: {}, home })).toMatchObject({ secrets: {}, keyState: 'default-chain' });
    // No default profile at all → false.
    awsCredentials('[other]\naws_access_key_id = a\naws_secret_access_key = b\n');
    expect(resolveEnterprise(bedrock, { id: 'bedrock/m', env: {}, home }).keyState).toBe(false);
  });

  test('readAwsProfile takes the three credential keys and nothing else; `[profile x]` spelling is accepted', () => {
    const file = awsCredentials('# comment\n[profile firm]\nregion = us-east-1\naws_access_key_id = A\naws_secret_access_key = B\n');
    expect(readAwsProfile(file, 'firm')).toEqual({ accessKeyId: 'A', secretAccessKey: 'B' });
    expect(readAwsProfile(file, 'missing')).toBeNull();
    expect(readAwsProfile(join(home, 'nope'), 'firm')).toBeNull();
  });

  test('vertex: a service account from the store; GOOGLE_APPLICATION_CREDENTIALS is the SDK’s to open; ADC on the machine is default-chain', () => {
    const sa = '{"client_email":"a@b","private_key":"k"}';
    const store = memoryStore({ 'vertex/g': encodeSecretFields({ serviceAccountJson: sa }) });
    expect(resolveEnterprise(vertex, { id: 'vertex/g', entry: { extra: { project: 'p' } }, store, env: {}, home })).toEqual({ extra: { project: 'p', location: 'us-central1' }, secrets: { serviceAccountJson: sa }, keyState: true });
    // The path is never read here — the secrets stay empty and the SDK reads the file.
    const r = resolveEnterprise(vertex, { id: 'vertex/g', env: { GOOGLE_APPLICATION_CREDENTIALS: '/nowhere/key.json', GOOGLE_CLOUD_PROJECT: 'envp' }, home });
    expect(r).toEqual({ extra: { project: 'envp', location: 'us-central1' }, secrets: {}, keyState: 'env' });
    // An express-mode key from the environment.
    expect(resolveEnterprise(vertex, { id: 'vertex/g', env: { GOOGLE_VERTEX_API_KEY: 'x' }, home })).toMatchObject({ secrets: { apiKey: 'x' }, keyState: 'env' });
    expect(resolveEnterprise(vertex, { id: 'vertex/g', env: {}, home }).keyState).toBe(false);
    mkdirSync(join(home, '.config', 'gcloud'), { recursive: true });
    writeFileSync(join(home, '.config', 'gcloud', 'application_default_credentials.json'), '{}', 'utf8');
    expect(resolveEnterprise(vertex, { id: 'vertex/g', env: {}, home })).toEqual({ extra: { location: 'us-central1' }, secrets: {}, keyState: 'default-chain' });
    expect(defaultChainPresent(azure, {}, home)).toBe(false);
  });
});

describe('validateFields — the PUT body per vendor', () => {
  test('only the vendor’s secret fields are taken; a non-secret or unknown one is named', () => {
    const r = validateFields(azure, { apiKey: 'k', resourceName: 'firm', nope: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map(i => i.path.join('.'))).toEqual(['fields.resourceName', 'fields.nope']);
    expect(validateFields(azure, 'nope')).toMatchObject({ ok: false });
    expect(validateFields(azure, { apiKey: 42 })).toMatchObject({ ok: false });
  });

  test('azure needs the key; values are trimmed; an oversized one is refused', () => {
    expect(validateFields(azure, { apiKey: '  k  ' })).toEqual({ ok: true, fields: { apiKey: 'k' } });
    expect(validateFields(azure, { apiKey: '' })).toMatchObject({ ok: false, issues: [{ path: ['fields', 'apiKey'] }] });
    expect(validateFields(azure, { apiKey: 'x'.repeat(5000) })).toMatchObject({ ok: false });
  });

  test('bedrock: the pair, or a bearer key; half a pair, or a token alone, is refused; nothing at all says how to use a profile', () => {
    expect(validateFields(bedrock, { accessKeyId: 'A', secretAccessKey: 'B', sessionToken: 'T' })).toEqual({ ok: true, fields: { accessKeyId: 'A', secretAccessKey: 'B', sessionToken: 'T' } });
    expect(validateFields(bedrock, { apiKey: 'bearer' })).toEqual({ ok: true, fields: { apiKey: 'bearer' } });
    expect(validateFields(bedrock, { accessKeyId: 'A' })).toMatchObject({ ok: false, issues: [{ path: ['fields', 'secretAccessKey'] }] });
    expect(validateFields(bedrock, { sessionToken: 'T' })).toMatchObject({ ok: false });
    const none = validateFields(bedrock, {});
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.issues[0]?.message).toContain('AWS profile');
  });

  test('vertex: a service account must parse and carry client_email + private_key; an express key alone is fine', () => {
    expect(validateFields(vertex, { serviceAccountJson: '{"client_email":"a@b","private_key":"k","type":"service_account"}' })).toMatchObject({ ok: true });
    expect(validateFields(vertex, { serviceAccountJson: '{"foo":1}' })).toMatchObject({ ok: false, issues: [{ path: ['fields', 'serviceAccountJson'] }] });
    expect(validateFields(vertex, { serviceAccountJson: 'not json' })).toMatchObject({ ok: false });
    expect(validateFields(vertex, { apiKey: 'x' })).toEqual({ ok: true, fields: { apiKey: 'x' } });
    expect(validateFields(vertex, {})).toMatchObject({ ok: false });
    // A service account is bigger than a key; the cap allows it.
    const big = JSON.stringify({ client_email: 'a@b', private_key: 'k'.repeat(6000) });
    expect(validateFields(vertex, { serviceAccountJson: big })).toMatchObject({ ok: true });
  });
});
