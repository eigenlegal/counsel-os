import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { inspectImage } from './images';
import { prepareImageContext, checkImageBudget } from './vision-context';
import { workspaceCodexInput, workspaceCodexConfig } from './codex';
import { claudeCodeInput, claudeCodeArgs } from './claude-code';
import { directMessages } from '../providers/direct';
import { workspaceHandler } from './http';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import type { StepRequest } from '../core/types';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ioAAAAASUVORK5CYII=', 'base64');
let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-images-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const upload = (name = 'Screenshot.png') => store.importDocument({ name, base64: png.toString('base64') });

test('static raster intake retains exact original bytes and dimensions without claiming OCR or calling a model', async () => {
  const file = await upload();
  expect(file.latest.body).toBeNull(); expect(file.latest.provenance.mediaType).toBe('image/png');
  expect(file.latest.extraction?.image).toEqual({ mediaType: 'image/png', width: 1, height: 1 });
  expect(store.originalFile(file.latest.id).bytes).toEqual(png);
  expect(store.catalog().sources[0]!.mediaType).toBe('image/png');
  expect(store.practiceSources({ all: 'true' }).items).toHaveLength(0);
  expect(store.conversations.list()).toHaveLength(0);
});

test('renamed scripts, SVG, malformed containers, oversized images and unsafe dimensions are rejected', async () => {
  for (const [name, bytes] of [['payload.png', Buffer.from('<script>bad()</script>')], ['photo.jpg', png], ['vector.svg', png], ['broken.png', png.subarray(0, 33)], ['huge.png', Buffer.alloc(7_000_001)]] as const)
    await expect(store.importDocument({ name, base64: bytes.toString('base64') })).rejects.toThrow();
  const hugeDimensions = Buffer.from(png); hugeDimensions.writeUInt32BE(9000, 16);
  expect(() => inspectImage(hugeDimensions, 'large.png')).toThrow('8,000');
  expect(store.catalog().sources).toHaveLength(0);
});

test('only explicit image attachments reach the model, follow-up retains them, and unrelated or trashed images do not', async () => {
  const image = await upload(), unrelated = await upload('Other.png');
  const model = new FakeModelProvider([{ text: 'Visual observation, not a verified quote.' }, { text: 'Following up on the same image.' }, { text: 'The image is no longer available.' }]);
  const chat = new WorkspaceChat(store, () => model), conversation = store.conversations.create({});
  try {
    const first = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Discuss this screenshot.', attachments: [image.latest.id] }); await chat.idle();
    expect(model.lastRequest!.images).toEqual([{ id: image.latest.id, title: image.latest.title, mediaType: 'image/png', data: png.toString('base64') }]);
    expect(model.lastRequest!.system).not.toContain(png.toString('base64'));
    expect(model.lastRequest!.images!.some(item => item.id === unrelated.latest.id)).toBe(false);
    const saved = store.conversations.turn(first.id);
    expect(saved.status).toBe('complete'); expect(saved.state.visualContext![0]).toMatchObject({ id: image.latest.id, number: 1, width: 1, height: 1 });
    expect(JSON.stringify(saved)).not.toContain(png.toString('base64'));
    chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Explain the same screenshot again.', attachments: [] }); await chat.idle();
    expect(model.lastRequest!.images![0]!.id).toBe(image.latest.id);
    store.changeRecord('source', image.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', image.id).version });
    chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Is it still attached?', attachments: [] }); await chat.idle();
    expect(model.lastRequest!.images).toBeUndefined();
  } finally { chat.stop(); await chat.idle(); }
});

test('budget checks do not silently omit attached images', () => {
  const metadata = { getSourceRevision: () => ({ provenance: { mediaType: 'image/png' }, original: { byteCount: 7_000_000 } }) } as unknown as WorkspaceStore;
  expect(() => checkImageBudget(metadata, ['one', 'two'])).not.toThrow();
  expect(() => checkImageBudget(metadata, ['one', 'two', 'three'])).toThrow('Nothing was sent');
});

test('WebP canvas metadata cannot hide oversized or multiple image frames', () => {
  const chunk = (type: string, bytes: Buffer) => { const header = Buffer.alloc(8); header.write(type); header.writeUInt32LE(bytes.length, 4); return Buffer.concat([header, bytes, Buffer.alloc(bytes.length % 2)]); };
  const canvas = Buffer.alloc(10), frame = Buffer.alloc(5); frame[0] = 0x2f;
  const container = (...chunks: Buffer[]) => { const body = Buffer.concat([Buffer.from('WEBP'), ...chunks]), header = Buffer.alloc(8); header.write('RIFF'); header.writeUInt32LE(body.length, 4); return Buffer.concat([header, body]); };
  const valid = container(chunk('VP8X', canvas), chunk('VP8L', frame));
  expect(inspectImage(valid, 'image.webp')).toMatchObject({ width: 1, height: 1 });
  frame.writeUInt32LE(8999, 1);
  expect(() => inspectImage(container(chunk('VP8X', canvas), chunk('VP8L', frame)), 'image.webp')).toThrow();
  frame.writeUInt32LE(0, 1);
  expect(() => inspectImage(container(chunk('VP8X', canvas), chunk('VP8L', frame), chunk('VP8L', frame)), 'image.webp')).toThrow();
});

test('all current adapters use image parts, not prose or extra filesystem tools', async () => {
  const file = await upload(), images = prepareImageContext(store, [file.latest.id]).images;
  const req: StepRequest = { tenant: 'workspace', system: 'App instructions', messages: [{ role: 'user', content: 'Read this screenshot.' }], tools: [], images };
  const codex = workspaceCodexInput(req, root);
  expect(Array.isArray(codex)).toBe(true);
  const local = (codex as Array<{ type: string; path?: string }>).find(item => item.type === 'local_image')!;
  expect(local.path).toBe(join(root, 'image-1.png')); expect(readFileSync(local.path!)).toEqual(png);
  expect(statSync(local.path!).mode & 0o777).toBe(0o600);
  expect(workspaceCodexConfig('', '/synthetic/codex', false).config!.features).toMatchObject({ view_image: false, shell_tool: false });
  const claude = JSON.parse(claudeCodeInput(req));
  expect(claude.message.content.find((part: any) => part.type === 'image').source).toEqual({ type: 'base64', media_type: 'image/png', data: png.toString('base64') });
  expect(claudeCodeArgs('model', [], '/system', '/mcp', 2, true)).toContain('--input-format');
  expect(claudeCodeArgs('model', [], '/system', '/mcp', 2, true)).toContain('--restricted');
  const direct = directMessages(req);
  expect((direct[0]!.content as any[]).find(part => part.type === 'file')).toMatchObject({ data: png, mediaType: 'image/png' });
  expect(JSON.stringify(req.messages)).not.toContain(png.toString('base64'));
});

test('image previews require authentication and availability; backups preserve originals and image metadata', async () => {
  const file = await upload(), model = new FakeModelProvider([]), chat = new WorkspaceChat(store, () => model);
  const handler = workspaceHandler({ store, chat, distDir: '/tmp', token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/source-revisions/${file.latest.id}/image`, { headers: { authorization: `Bearer ${token}` } }));
  expect((await call('wrong')).status).toBe(401);
  const response = await call(); expect(response.headers.get('content-type')).toBe('image/png'); expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name); writeFileSync(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), recovered = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(prepareImageContext(recovered, [file.latest.id]).images[0]!.data).toBe(png.toString('base64')); } finally { recovered.close(); }
  store.changeRecord('source', file.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', file.id).version });
  expect((await call()).status).toBe(409); expect(model.lastRequest).toBeUndefined();
});
