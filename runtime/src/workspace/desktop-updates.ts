/** Signed update metadata; no background checks, unverified redirects or auto-install. */
import { createHash, createPublicKey, verify } from 'node:crypto';
import { closeSync, fsyncSync, mkdtempSync, openSync, rmSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import channel from '../../../desktop/update-channel.json';
import release from '../../../desktop/release.json';
import { workspaceDistribution } from './distribution';

export const UpdateManifest = z.object({
  format: z.literal(1), channel: z.enum(['stable', 'preview']), version: z.string().regex(/^\d+\.\d+\.\d+$/),
  build: z.number().int().positive(), bundleId: z.string().min(3), teamId: z.string().regex(/^[A-Z0-9]{10}$/),
  platform: z.literal('darwin-arm64'), minMacOS: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/),
  publishedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  artifact: z.object({ url: z.string().url(), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive().max(1_000_000_000) }).strict(),
  notes: z.string().min(1).max(4000),
}).strict();
export type UpdateManifest = z.infer<typeof UpdateManifest>;
export interface UpdateTrust { channel: string; publicKey: string; bundleId: string; teamId: string; artifactOrigin: string }
export class NoDesktopUpdate extends Error { constructor() { super('No newer update is available.'); } }
export function verifyUpdateEnvelope(raw: string, trust: UpdateTrust, currentBuild: number, highestBuild = currentBuild, now = Date.now()) {
  if (Buffer.byteLength(raw) > 64_000) throw new Error('Update metadata is too large.');
  const envelope = z.object({ payload: z.string().max(48000).regex(/^[A-Za-z0-9+/]+={0,2}$/), signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/) }).strict().parse(JSON.parse(raw));
  const payload = Buffer.from(envelope.payload, 'base64'), key = createPublicKey(trust.publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, payload, key, Buffer.from(envelope.signature, 'base64'))) throw new Error('Update signature could not be verified.');
  const value = UpdateManifest.parse(JSON.parse(payload.toString('utf8'))), url = new URL(value.artifact.url);
  if (value.channel !== trust.channel || value.bundleId !== trust.bundleId || value.teamId !== trust.teamId || url.protocol !== 'https:' || url.origin !== trust.artifactOrigin || url.username || url.password || url.hash)
    throw new Error('Update identity, channel or download origin does not match this app.');
  const published = Date.parse(value.publishedAt), expires = Date.parse(value.expiresAt);
  if (published > now + 300_000 || expires <= now || expires <= published || expires - published > 31 * 86400_000)
    throw new Error('Update metadata is expired or has an invalid validity period.');
  if (value.build === currentBuild && value.build >= highestBuild) throw new NoDesktopUpdate();
  if (value.build <= currentBuild || value.build < highestBuild) throw new Error('This is not a newer permitted update.');
  return value;
}
async function bounded(response: Response, limit: number) {
  if (!response.ok || !response.body) throw new Error('The update service is unavailable.');
  const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
  try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > limit) throw new Error('Update metadata is too large.'); chunks.push(part.value); } }
  finally { await reader.cancel(); reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
export function desktopUpdateStatus() {
  return { version: release.version, build: release.build, channel: release.channel,
    enabled: !!workspaceDistribution() && channel.enabled && !!channel.feedUrl && !!channel.publicKey && !!channel.bundleId && !!channel.teamId && !!channel.artifactOrigin,
    message: 'Updates are checked only when you ask. A verified download never replaces a running app. Workspace upgrades require a verified recovery backup.' };
}
export async function checkDesktopUpdate(highestBuild: number, signal: AbortSignal) {
  if (!desktopUpdateStatus().enabled) throw new Error('This test build has no approved signed update channel.');
  const url = new URL(channel.feedUrl!);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Invalid update feed.');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  let value: UpdateManifest;
  try { value = verifyUpdateEnvelope(await bounded(response, 64_000), channel as unknown as UpdateTrust, release.build, highestBuild); }
  catch (error) { if (error instanceof NoDesktopUpdate) return null; throw error; }
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This update is not qualified for this platform.');
  const os = Bun.spawnSync(['/usr/bin/sw_vers', '-productVersion'], { stdout: 'pipe', stderr: 'ignore' });
  const version = os.stdout.toString().trim();
  if (os.exitCode || !/^\d+\.\d+(?:\.\d+)?$/.test(version)) throw new Error('The macOS version could not be checked.');
  const a = version.split('.').map(Number), b = value.minMacOS.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((a[i] ?? 0) > (b[i] ?? 0)) break; if ((a[i] ?? 0) < (b[i] ?? 0)) throw new Error('This update requires a newer macOS version.'); }
  return value;
}
/** Fixed name; bytes stay on disk. Caller owns the one-shot download/disposal. */
export async function downloadDesktopUpdate(manifest: UpdateManifest, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  signal.throwIfAborted();
  const root = mkdtempSync(join(tmpdir(), 'counsel-verified-update-')), path = join(root, 'Counsel-update.dmg');
  const dispose = () => rmSync(root, { recursive: true, force: true });
  let fd: number | undefined;
  try {
    const response = await fetcher(manifest.artifact.url, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(300_000)]) });
    if (!response.ok || !response.body) throw new Error('The update could not be downloaded.');
    fd = openSync(path, 'wx', 0o600); let size = 0; const digest = createHash('sha256'), reader = response.body.getReader();
    try { for (;;) {
      const part = await reader.read(); if (part.done) break; signal.throwIfAborted();
      size += part.value.length; if (size > manifest.artifact.bytes) throw new Error('The update size does not match its signed metadata.');
      digest.update(part.value); let offset = 0;
      while (offset < part.value.length) { const written = writeSync(fd, part.value, offset, part.value.length - offset); if (!written) throw new Error('Update write stopped.'); offset += written; }
    } } finally { await reader.cancel(); reader.releaseLock(); }
    if (size !== manifest.artifact.bytes || digest.digest('hex') !== manifest.artifact.sha256) throw new Error('The update checksum does not match its signed metadata.');
    fsyncSync(fd); closeSync(fd); fd = undefined;
    return { path, name: 'Counsel-update.dmg', byteCount: size, dispose };
  } catch (error) { if (fd !== undefined) closeSync(fd); dispose(); throw error; }
}
