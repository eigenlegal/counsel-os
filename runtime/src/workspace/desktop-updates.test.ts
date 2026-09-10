import { expect, test } from 'bun:test';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { verifyUpdateEnvelope, downloadDesktopUpdate, desktopUpdateStatus, NoDesktopUpdate, type UpdateManifest } from './desktop-updates';
const keys = generateKeyPairSync('ed25519'), publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const now = Date.parse('2026-09-10T18:00:00Z');
const bytes = Buffer.from('synthetic installer bytes, never executable');
const manifest: UpdateManifest = { format: 1, channel: 'stable', version: '0.2.0', build: 10, bundleId: 'org.fixture.counsel', teamId: 'ABCDEFGHIJ', platform: 'darwin-arm64', minMacOS: '13.0',
  publishedAt: '2026-09-10T17:00:00Z', expiresAt: '2026-09-11T18:00:00Z', artifact: { url: 'https://downloads.example.test/Counsel.dmg', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }, notes: 'Synthetic release.' };
const trust = { publicKey, channel: 'stable', bundleId: manifest.bundleId, teamId: manifest.teamId, artifactOrigin: 'https://downloads.example.test' };
function envelope(value: unknown) { const payload = Buffer.from(JSON.stringify(value)); return JSON.stringify({ payload: payload.toString('base64'), signature: sign(null, payload, keys.privateKey).toString('base64') }); }
test('only signed, matching, unexpired forward updates are accepted', () => {
  expect(verifyUpdateEnvelope(envelope(manifest), trust, 2, 9, now)).toEqual(manifest);
  for (const value of [ { ...manifest, channel: 'preview' }, { ...manifest, teamId: 'ZZZZZZZZZZ' }, { ...manifest, bundleId: 'org.other.app' }, { ...manifest, expiresAt: '2026-09-10T17:30:00Z' }, { ...manifest, publishedAt: '2027-01-01T00:00:00Z' }, { ...manifest, artifact: { ...manifest.artifact, url: 'https://attacker.example/Counsel.dmg' } } ]) expect(() => verifyUpdateEnvelope(envelope(value), trust, 2, 9, now)).toThrow();
  expect(() => verifyUpdateEnvelope(envelope(manifest), trust, 10, 10, now)).toThrow('newer');
  expect(() => verifyUpdateEnvelope(envelope(manifest), trust, 10, 10, now)).toThrow(NoDesktopUpdate);
  expect(() => verifyUpdateEnvelope(envelope({ ...manifest, expiresAt: '2026-09-09T18:00:00Z' }), trust, 10, 10, now)).not.toThrow(NoDesktopUpdate);
  expect(() => verifyUpdateEnvelope(envelope(manifest), trust, 2, 11, now)).toThrow('newer');
});
test('tampering, wrong key, oversized metadata and extra fields fail closed', () => {
  const value = JSON.parse(envelope(manifest)); value.payload = Buffer.from(JSON.stringify({ ...manifest, build: 99 })).toString('base64');
  expect(() => verifyUpdateEnvelope(JSON.stringify(value), trust, 2, 2, now)).toThrow('signature');
  const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString();
  expect(() => verifyUpdateEnvelope(envelope(manifest), { ...trust, publicKey: other }, 2, 2, now)).toThrow('signature');
  expect(() => verifyUpdateEnvelope(' '.repeat(64001), trust, 2)).toThrow('large');
  expect(() => verifyUpdateEnvelope(envelope({ ...manifest, command: 'anything' }), trust, 2, 2, now)).toThrow();
});
test('download verifies size and bytes before offering a file; refuses truncation and cancellation', async () => {
  const requests: RequestInit[] = [];
  const fetcher = (async (_url: unknown, init: RequestInit) => { requests.push(init); return new Response(bytes); }) as typeof fetch;
  const download = await downloadDesktopUpdate(manifest, new AbortController().signal, fetcher);
  expect(readFileSync(download.path)).toEqual(bytes); expect(requests[0]?.redirect).toBe('error');
  download.dispose(); expect(existsSync(download.path)).toBe(false);
  await expect(downloadDesktopUpdate({ ...manifest, artifact: { ...manifest.artifact, sha256: '0'.repeat(64) } }, new AbortController().signal, fetcher)).rejects.toThrow('checksum');
  await expect(downloadDesktopUpdate({ ...manifest, artifact: { ...manifest.artifact, bytes: 1 } }, new AbortController().signal, fetcher)).rejects.toThrow('size');
  const controller = new AbortController(); controller.abort();
  await expect(downloadDesktopUpdate(manifest, controller.signal, fetcher)).rejects.toThrow();
});
test('a source checkout/test image has no approved update feed', () => { expect(desktopUpdateStatus().enabled).toBe(false); });
