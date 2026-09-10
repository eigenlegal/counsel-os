import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EntityRegistry, EntityRegistryFields, SignatoryCheckInput, checkSignatory, entityCatalog, readEntity, registryFields } from './entities';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { workspaceHandler } from './http';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-entities-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const entityId = crypto.randomUUID(), nda = crypto.randomUUID(), vendor = crypto.randomUUID(), fallback = crypto.randomUUID();
  return EntityRegistryFields.parse({ availableToChats: true,
    entities: [{ id: entityId, name: 'Synthetic Example LLC', aliases: ['Example US'], noticeAddress: 'SYNTHETIC PRIVATE NOTICE ADDRESS' }],
    signatories: [{ id: nda, name: 'Synthetic Alex' }, { id: vendor, name: 'Synthetic Blake' }, { id: fallback, name: 'Synthetic Casey' }],
    rules: [
      { id: crypto.randomUUID(), label: 'NDAs only', entityIds: [entityId], agreementKinds: ['nda'], signatoryId: nda },
      { id: crypto.randomUUID(), label: 'Bounded vendor authority', entityIds: [entityId], agreementKinds: ['vendor'], signatoryId: vendor, valueLimit: { maximum: '100000', currency: 'USD', basis: 'total' } },
      { id: crypto.randomUUID(), label: 'Other signing', entityIds: [entityId], agreementKinds: ['nda', 'vendor', 'other'], signatoryId: fallback, fallback: true },
    ] });
}
function save() { return store.saveEntityRegistry({ ...fixture(), expectedRevisionId: null }); }
function facts(registry: EntityRegistry) { return { entityId: registry.entities[0]!.id, agreementKind: 'vendor' as const, amount: '100000', currency: 'USD', valueBasis: 'total' as const }; }
test('inclusive threshold uses exact decimals, with a scoped fallback only for known unmatched facts', () => {
  const registry = save(), input = facts(registry);
  for (const amount of ['0', '99999.99', '100000', '100000.00']) {
    const result = checkSignatory(registry, { ...input, amount });
    expect(result.outcome).toBe('suggested'); expect(result.signatory!.name).toBe('Synthetic Blake');
  }
  expect(checkSignatory(registry, { ...input, amount: '100000.01' }).signatory!.name).toBe('Synthetic Casey');
  expect(checkSignatory(registry, { ...input, agreementKind: 'nda', amount: null, currency: null, valueBasis: null }).signatory!.name).toBe('Synthetic Alex');
  expect(checkSignatory(registry, { ...input, agreementKind: 'other', amount: null }).signatory!.name).toBe('Synthetic Casey');
  expect(checkSignatory(registry, { ...input, entityId: crypto.randomUUID() }).outcome).toBe('unavailable');
});
test('unknown amounts, types, currencies and bases cannot activate a fallback', () => {
  const registry = save(), input = facts(registry);
  for (const changed of [{ amount: null }, { currency: null }, { valueBasis: null }, { agreementKind: null }, { currency: 'EUR' }, { valueBasis: 'annual' as const }]) {
    const result = checkSignatory(registry, { ...input, ...changed });
    expect(result.outcome).toBe('needs-information'); expect(result.signatory).toBeNull();
  }
  registry.rules[1]!.valueLimit!.basis = null;
  expect(checkSignatory(registry, { ...input, amount: '100001' }).outcome).toBe('needs-information');
  for (const amount of ['-1', '1e5', '100,000', 'NaN', '100000.001', '01', '10000000000000'])
    expect(SignatoryCheckInput.safeParse({ ...input, amount }).success).toBe(false);
});
test('an annual-spend limit is inclusive and cannot use total contract value in its place', () => {
  const previous = save(), fields = registryFields(previous);
  fields.rules[1]!.valueLimit!.basis = 'annual';
  const registry = store.saveEntityRegistry({ ...fields, expectedRevisionId: previous.revisionId });
  const input = { ...facts(registry), valueBasis: 'annual' as const };
  for (const amount of ['99999.99', '100000', '100000.00'])
    expect(checkSignatory(registry, { ...input, amount }).signatory!.name).toBe('Synthetic Blake');
  expect(checkSignatory(registry, { ...input, amount: '100000.01' }).signatory!.name).toBe('Synthetic Casey');
  for (const valueBasis of ['total' as const, null]) {
    const result = checkSignatory(registry, { ...input, valueBasis });
    expect(result.outcome).toBe('needs-information'); expect(result.signatory).toBeNull();
  }
  expect(previous.rules[1]!.valueLimit!.basis).toBe('total');
  expect(registry.version).toBe(previous.version + 1);
});
test('conflicts, inactive identities, missing rules and disabled sharing are explicit', () => {
  const registry = save(), input = facts(registry);
  registry.rules.push({ ...registry.rules[1]!, id: crypto.randomUUID(), signatoryId: registry.signatories[2]!.id });
  expect(checkSignatory(registry, input).outcome).toBe('conflict');
  registry.rules.pop(); registry.signatories[1]!.active = false;
  expect(checkSignatory(registry, input).outcome).toBe('needs-information');
  registry.rules = [];
  expect(checkSignatory(registry, input).outcome).toBe('no-rule');
  registry.entities[0]!.active = false;
  expect(checkSignatory(registry, input).outcome).toBe('unavailable');
  registry.availableToChats = false;
  expect(entityCatalog(registry)).toBeNull();
  expect(() => readEntity(registry, input.entityId)).toThrow('not available');
});
test('directory updates are validated, durable, idempotent and conflict-checked without profile or practice changes', () => {
  expect(store.getEntityRegistry()).toBeNull();
  const registry = save();
  expect(store.saveEntityRegistry({ ...registryFields(registry), expectedRevisionId: null })).toEqual(registry);
  expect(() => store.saveEntityRegistry({ ...registryFields(registry), availableToChats: false, expectedRevisionId: null })).toThrow('another window');
  const broken = registryFields(registry); broken.rules[0]!.signatoryId = crypto.randomUUID();
  expect(() => store.saveEntityRegistry({ ...broken, expectedRevisionId: registry.revisionId })).toThrow('saved entities');
  const duplicate = registryFields(registry); duplicate.entities.push(duplicate.entities[0]!);
  expect(EntityRegistryFields.safeParse(duplicate).success).toBe(false);
  expect(EntityRegistryFields.safeParse({ ...registryFields(registry), approve: true }).success).toBe(false);
  expect(store.catalog().knowledge).toHaveLength(0); expect(store.listWork()).toHaveLength(0); expect(store.getProfile()).toBeNull();
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.getEntityRegistry()).toEqual(registry);
});
test('chat pins the registry before later edits; only metadata enters the initial prompt, with exact read/check receipts', async () => {
  const registry = save(), input = facts(registry);
  store.saveProfile({ name: 'UNSHARED PROFILE', applyToChats: false, expectedRevisionId: null });
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_read_entity', input: { entityId: input.entityId } }, { name: 'counsel_check_signatory', input }], text: 'Synthetic routing.' }]);
  const chat = new WorkspaceChat(store, () => provider), conversation = store.conversations.create({});
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Who signs this vendor agreement?' });
  store.saveEntityRegistry({ ...registryFields(registry), availableToChats: false, expectedRevisionId: registry.revisionId });
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.state.entityRegistry!.revisionId).toBe(registry.revisionId);
  expect(saved.state.entitiesRead).toEqual([input.entityId]);
  expect(saved.state.signatoryChecks![0]!.signatory!.name).toBe('Synthetic Blake');
  expect(provider.lastRequest!.system).toContain('Synthetic Example LLC');
  expect(provider.lastRequest!.system).not.toContain('SYNTHETIC PRIVATE NOTICE ADDRESS');
  expect(provider.lastRequest!.system).not.toContain('UNSHARED PROFILE');
  expect(JSON.stringify(saved.state.activity.find(a => a.name === 'counsel_read_entity')!.output)).toContain('SYNTHETIC PRIVATE NOTICE ADDRESS');
  expect((await runToolDef(provider.lastRequest!.tools, 'counsel_save_entity', {}, 'workspace')).isError).toBe(true);
  const other = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_read_entity', input: { entityId: input.entityId } }], text: 'No registry access.' }]);
  const nextChat = new WorkspaceChat(store, () => other), next = nextChat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Read the entity again.' });
  await nextChat.idle();
  expect(store.conversations.turn(next.id).state.entityRegistry).toBeNull();
  expect(store.conversations.turn(next.id).state.activity.find(a => a.name === 'counsel_read_entity')!.status).toBe('failed');
});
test('backup and actual restore retain full working preferences, registry and historical rule checks but no credentials', async () => {
  const registry = save(), preferences = store.saveWorkingPreferences({ expectedRevisionId: null,
    writingInstructions: 'Complete instructions. '.repeat(300) + 'END SENTINEL', signingInstructions: 'User-recorded rule.', authorMode: 'custom', customAuthor: 'Synthetic Alex' });
  store.setSetting('model-connection', { apiKey: 'DO-NOT-RESTORE-THIS-KEY' });
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_check_signatory', input: facts(registry) }], text: 'Synthetic.' }]);
  const chat = new WorkspaceChat(store, () => provider), conversation = store.conversations.create({});
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Check signatory.' }); await chat.idle();
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name); writeFileSync(path, backup.bytes);
  await inspectWorkspaceBackup(path);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(copy.getWorkingPreferences()).toEqual(preferences);
    expect(copy.getEntityRegistry()).toEqual(registry);
    expect(copy.conversations.turn(turn.id).state.signatoryChecks).toEqual(store.conversations.turn(turn.id).state.signatoryChecks);
    expect(copy.setting('model-connection')).toBeNull();
  } finally { copy.close(); }
});
test('entity HTTP routes authenticate and manual checks never turn on sharing or make model calls', async () => {
  const registry = save(); store.saveEntityRegistry({ ...registryFields(registry), availableToChats: false, expectedRevisionId: registry.revisionId });
  const handler = workspaceHandler({ store, distDir: root, token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (path: string, body?: unknown, token = 'fixture') => handler(new Request('http://127.0.0.1:7432/api/workspace/entity-registry' + path,
    { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  expect((await call('', undefined, 'wrong')).status).toBe(401);
  expect((await call('/check', facts(registry), 'wrong')).status).toBe(401);
  expect((await call('/check', { ...facts(registry), verified: true })).status).toBe(400);
  const checked = await call('/check', facts(registry));
  expect(checked.status).toBe(200); expect(await checked.json()).toMatchObject({ outcome: 'suggested' });
  expect(store.getEntityRegistry()!.availableToChats).toBe(false);
  expect(store.conversations.list()).toHaveLength(0);
});
