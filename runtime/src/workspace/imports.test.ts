import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WorkspaceStore } from "./store";
import {
  ImportCreate,
  ImportChoice,
  IMPORT_LOCAL_POLICY,
  suggestImport,
  type ImportBatch,
} from "./import-types";
import { ProfileFields } from "./profile";
import { syntheticPdf } from './fixtures/documents';
import { workspaceHandler } from "./http";
import {
  createWorkspaceBackup,
  restoreWorkspaceBackup,
  inspectWorkspaceBackup,
} from "./backups";

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "counsel-import-test-"));
  store = new WorkspaceStore({ databasePath: join(root, "workspace.sqlite3") });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
async function uploadAndRead(id: string, entryId: string, base64: string): Promise<ImportBatch> {
  await store.imports.upload(id, entryId, base64);
  await store.imports.idle();
  return store.imports.get(id);
}
async function stage(files: Record<string, string>): Promise<ImportBatch> {
  let batch = store.imports.create({
    clientId: crypto.randomUUID(),
    label: "Synthetic import",
    files: Object.entries(files).map(([path, body]) => ({
      path,
      byteCount: Buffer.byteLength(body),
    })),
  });
  for (const entry of batch.entries)
    if (entry.status !== "skipped")
      batch = await uploadAndRead(
        batch.id,
        entry.id,
        Buffer.from(files[entry.path]!).toString("base64"),
      );
  return batch;
}
test("name hints remain reviewable, bounded, and literal; unsupported infrastructure is visible", () => {
  expect(suggestImport("Practice/standards/notice.md").destination).toBe(
    "position",
  );
  expect(suggestImport("Matters/Investigation/evidence.txt").matterTitle).toBe(
    "Investigation",
  );
  expect(suggestImport("contracts/notice.md").destination).toBe("source");
  expect(
    ImportCreate.safeParse({
      clientId: crypto.randomUUID(),
      label: "x",
      files: [{ path: "../secret.txt", byteCount: 1 }],
    }).success,
  ).toBe(false);
  expect(
    ImportCreate.safeParse({
      clientId: crypto.randomUUID(),
      label: "x",
      files: Array.from({ length: 10001 }, (_, i) => ({
        path: `${i}.txt`,
        byteCount: 1,
      })),
    }).success,
  ).toBe(false);
  const input = {
    clientId: crypto.randomUUID(),
    label: "x",
    files: [
      { path: ".git/config", byteCount: 20 },
      { path: "legacy.doc", byteCount: 20 },
      { path: "notes.txt", byteCount: 3 },
    ],
  };
  const batch = store.imports.create(input);
  expect(batch.entries.map((e) => e.status)).toEqual([
    "skipped",
    "skipped",
    "pending",
  ]);
  expect(store.imports.create(input)).toEqual(batch);
  expect(() => store.imports.create({ ...input, label: "changed" })).toThrow(
    "different selection",
  );
  expect(() =>
    store.imports.create({
      clientId: crypto.randomUUID(),
      label: "large",
      files: Array.from({ length: 41 }, (_, i) => ({
        path: `${i}.pdf`,
        byteCount: 25_000_000,
      })),
    }),
  ).toThrow("1 GB");
});
test("staging stays out of search and chats, survives reopening/backup, and commits originals with pending practice and grouped matters", async () => {
  const files = {
    "Folder/Matters/Advisory/notes.md":
      "# Synthetic advice\n\nDocument the purpose.",
    "Folder/Matters/Advisory/evidence.txt": "Synthetic supporting evidence.",
    "Folder/Practice/standards/notice.md":
      "# Synthetic position\n\nUse written notices.",
  };
  let batch = await stage(files);
  expect(store.catalog().sources).toHaveLength(0);
  expect(store.search({ query: "Synthetic" }).hits).toHaveLength(0);
  expect(batch.entries.every((e) => e.status === "ready")).toBe(true);
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.imports.get(batch.id)).toEqual(batch);
  const backup = await createWorkspaceBackup(path);
  expect(backup.manifest.counts.stagedFiles).toBe(3);
  const backupPath = join(root, backup.name);
  writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, root);
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(copy.imports.get(batch.id)).toEqual(batch);
  } finally {
    copy.close();
  }
  const input = { expectedRevisionId: batch.revisionId };
  batch = store.imports.commit(batch.id, input);
  expect(store.imports.commit(batch.id, input)).toEqual(batch);
  expect(batch.status).toBe("committed");
  expect(batch.receipt?.matterIds).toHaveLength(1);
  expect(store.catalog().sources).toHaveLength(3);
  expect(store.catalog().knowledge).toHaveLength(1);
  expect(store.catalog().knowledge[0]?.status).toBe("pending");
  for (const item of batch.receipt!.items) {
    const entry = batch.entries.find((e) => e.id === item.entryId)!;
    expect(store.originalFile(item.sourceRevisionId).bytes.toString()).toBe(
      files[entry.path as keyof typeof files],
    );
  }
  expect(() =>
    store.imports.commit(batch.id, {
      ...input,
      allowPracticeWideTemplates: true,
    }),
  ).toThrow("different choices");
  expect((await createWorkspaceBackup(path)).manifest.counts.stagedFiles).toBe(
    0,
  );
});
test("stale review, wrong-file retries, missing uploads and malformed extraction cannot become partial imports", async () => {
  let batch = store.imports.create({
    clientId: crypto.randomUUID(),
    label: "errors",
    files: [
      { path: "a.txt", byteCount: 3 },
      { path: "bad.pdf", byteCount: 3 },
    ],
  });
  const old = batch.revisionId;
  await expect(
    store.imports.upload(
      batch.id,
      batch.entries[0]!.id,
      Buffer.from("wrong").toString("base64"),
    ),
  ).rejects.toThrow("differs");
  batch = await uploadAndRead(
    batch.id,
    batch.entries[0]!.id,
    Buffer.from("one").toString("base64"),
  );
  await expect(
    store.imports.upload(
      batch.id,
      batch.entries[0]!.id,
      Buffer.from("two").toString("base64"),
    ),
  ).rejects.toThrow("differs");
  expect(() =>
    store.imports.edit(batch.id, batch.entries[0]!.id, {
      expectedRevisionId: old,
      choice: batch.entries[0]!.choice,
    }),
  ).toThrow("another window");
  expect(() =>
    store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId }),
  ).toThrow("not ready");
  batch = await uploadAndRead(
    batch.id,
    batch.entries[1]!.id,
    Buffer.from("bad").toString("base64"),
  );
  expect(batch.entries[1]!.status).toBe("error");
  expect(store.catalog().sources).toHaveLength(0);
  batch = store.imports.edit(batch.id, batch.entries[1]!.id, {
    expectedRevisionId: batch.revisionId,
    choice: { ...batch.entries[1]!.choice, destination: "skip" },
  });
  expect(
    store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId })
      .receipt?.items,
  ).toHaveLength(1);
});
test("failed commit rolls back records and only newly written original files; staged bytes remain recoverable", async () => {
  let batch = await stage({
    "first.txt": "First synthetic source.",
    "templates/start.md": "# Synthetic template",
  });
  expect(() =>
    store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId }),
  ).toThrow("Templates require");
  expect(store.catalog().sources).toHaveLength(0);
  expect(store.templates.list()).toHaveLength(0);
  const originals = join(root, "workspace.sqlite3.originals");
  expect(existsSync(originals) ? readdirSync(originals) : []).toEqual([]);
  expect(store.imports.get(batch.id).status).toBe("review");
  const item = batch.entries[1]!;
  batch = store.imports.edit(batch.id, item.id, {
    expectedRevisionId: batch.revisionId,
    choice: {
      ...item.choice,
      whenToUse: "A synthetic drafting starting point.",
    },
  });
  batch = store.imports.commit(batch.id, {
    expectedRevisionId: batch.revisionId,
    allowPracticeWideTemplates: true,
  });
  expect(store.templates.list()).toHaveLength(1);
  expect(batch.receipt?.items).toHaveLength(2);
});
test("local-only labels block indexing, global local-only policies block the batch, and discard changes no existing records", async () => {
  let batch = await stage({
    "local.md": "---\nstays_local: true\n---\nPrivate.",
    "other.txt": "Synthetic public fixture.",
  });
  expect(batch.entries[0]?.status).toBe("skipped");
  expect(
    store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId })
      .receipt?.items,
  ).toHaveLength(1);
  batch = await stage({
    "config.md": "default_locality: local",
    "other.txt": "Synthetic fixture.",
  });
  expect(() =>
    store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId }),
  ).toThrow(IMPORT_LOCAL_POLICY);
  const before = store.catalog();
  expect(store.imports.discard(batch.id, batch.revisionId).status).toBe(
    "discarded",
  );
  expect(store.catalog()).toEqual(before);
  expect(
    (await createWorkspaceBackup(store.databasePath)).manifest.counts
      .stagedFiles,
  ).toBe(0);
});
test("profile fields are explicitly reviewed, persist with staging, start with sharing off and never replace an existing profile", async () => {
  let batch = await stage({
    "practice/profile.md":
      "name: Synthetic Lawyer\nrole: Counsel\norganization: Example only",
    "document.txt": "Party: Another Person",
  });
  const entry = batch.entries[0]!;
  const inspection = store.imports.inspect(batch.id, entry.id);
  expect(inspection.profileSuggestion?.name).toBe("Synthetic Lawyer");
  expect(store.getProfile()).toBeNull();
  const profile = ProfileFields.parse(inspection.profileSuggestion);
  expect(() =>
    store.imports.commit(batch.id, {
      expectedRevisionId: batch.revisionId,
      profile,
    }),
  ).toThrow("Review exactly one");
  batch = store.imports.edit(batch.id, entry.id, {
    expectedRevisionId: batch.revisionId,
    choice: { ...entry.choice, profile },
  });
  expect(store.imports.get(batch.id).entries[0]?.choice.profile).toEqual(
    profile,
  );
  store.imports.commit(batch.id, {
    expectedRevisionId: batch.revisionId,
    profile,
  });
  expect(store.getProfile()?.name).toBe("Synthetic Lawyer");
  expect(store.getProfile()?.applyToChats).toBe(false);
  let next = await stage({ "profile.md": "name: Replacement" });
  const replacement = ProfileFields.parse({
    name: "Replacement",
    applyToChats: false,
  });
  next = store.imports.edit(next.id, next.entries[0]!.id, {
    expectedRevisionId: next.revisionId,
    choice: { ...next.entries[0]!.choice, profile: replacement },
  });
  expect(() =>
    store.imports.commit(next.id, {
      expectedRevisionId: next.revisionId,
      profile: replacement,
    }),
  ).toThrow("never replaced");
});
test("schema-six migration and old backup verification retain existing records", async () => {
  const original = store.createMatter({ title: "Keep me" }),
    path = store.databasePath;
  store.close();
  const db = new Database(path);
  db.exec(
    DROP_UPKEEP + "DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; DROP TABLE import_entries; DROP TABLE import_batches; PRAGMA user_version=6;",
  );
  db.close();
  const old = await createWorkspaceBackup(path);
  expect(old.manifest.schemaVersion).toBe(6);
  expect((await inspectWorkspaceBackup(old.bytes)).schemaVersion).toBe(6);
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getMatter(original.id)).toEqual(original);
  expect(store.imports.list()).toEqual([]);
});
test("HTTP import endpoints authenticate and strictly validate upload, review and commit payloads", async () => {
  const origin = "http://127.0.0.1:7432";
  const handler = workspaceHandler({
    store,
    origin,
    token: "synthetic",
    distDir: root,
    demo: true,
  });
  const call = (path: string, input?: unknown, auth = true) =>
    handler(
      new Request(`${origin}/api/workspace${path}`, {
        method: input === undefined ? "GET" : "POST",
        headers: {
          origin,
          "content-type": "application/json",
          ...(auth ? { authorization: "Bearer synthetic" } : {}),
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      }),
    );
  expect((await call("/imports", undefined, false)).status).toBe(401);
  expect(
    (
      await call("/imports", {
        clientId: crypto.randomUUID(),
        label: "x",
        files: [{ path: "a.txt", byteCount: 3 }],
        root: "/private",
      })
    ).status,
  ).toBe(400);
  const created = await call("/imports", {
    clientId: crypto.randomUUID(),
    label: "x",
    files: [{ path: "a.txt", byteCount: 3 }],
  });
  expect(created.status).toBe(201);
  const batch = (await created.json()) as ImportBatch;
  expect(
    (
      await call(`/imports/${batch.id}/files/${batch.entries[0]!.id}`, {
        base64: "b25l",
        path: "/private",
      })
    ).status,
  ).toBe(400);
  const uploaded = await call(
    `/imports/${batch.id}/files/${batch.entries[0]!.id}`,
    { base64: "b25l" },
  );
  expect(uploaded.status).toBe(202);
  const queued = await uploaded.json();
  expect(queued).toEqual({ entryId: batch.entries[0]!.id, phase: 'queued' });
  expect((await call(`/imports/${batch.id}/queue`, { action: 'pause', approve: true })).status).toBe(400);
  expect((await call(`/imports/${batch.id}/queue`, { action: 'pause' }, false)).status).toBe(401);
  await store.imports.idle();
  const ready = store.imports.get(batch.id);
  expect(
    (
      await call(`/imports/${batch.id}/commit`, {
        expectedRevisionId: ready.revisionId,
        approve: true,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await call(`/imports/${batch.id}/commit`, {
        expectedRevisionId: ready.revisionId,
      })
    ).status,
  ).toBe(200);
});

test('acknowledged originals resume after interruption without a browser or repeated upload; missing files stay explicit', async () => {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Interrupted upload', files: [
    { path: 'received.txt', byteCount: 3 }, { path: 'not-received.txt', byteCount: 3 },
  ] });
  const ack = await store.imports.upload(batch.id, batch.entries[0]!.id, 'b25l');
  expect(ack.progress).toMatchObject({ queued: 1, ready: 0, awaitingUpload: 1 });
  expect(store.catalog().sources).toHaveLength(0);
  const path = store.databasePath;
  store.close(); // Stop before the deferred extraction task starts.
  store = new WorkspaceStore({ databasePath: path });
  await store.imports.idle();
  const recovered = store.imports.get(batch.id);
  expect(recovered.progress).toMatchObject({ queued: 0, ready: 1, awaitingUpload: 1 });
  expect(store.imports.inspect(batch.id, batch.entries[0]!.id).body).toBe('one');
  expect(store.catalog().sources).toHaveLength(0);
  expect(() => store.imports.commit(batch.id, { expectedRevisionId: recovered.revisionId })).toThrow('not ready');
});

test('pause and queued originals survive backup, restore and reopen; resume never commits or approves', async () => {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Paused queue', files: [
    { path: 'practice/standards/notice.txt', byteCount: 3 },
  ] });
  await store.imports.upload(batch.id, batch.entries[0]!.id, 'b25l');
  const paused = store.imports.control(batch.id, { action: 'pause' });
  await store.imports.idle();
  expect(store.imports.get(batch.id)).toEqual(paused);
  expect(paused.progress).toMatchObject({ paused: true, queued: 1, ready: 0 });
  const backup = await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(19);
  const backupPath = join(root, backup.name);
  writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, root);
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    await copy.imports.idle();
    expect(copy.imports.get(batch.id)).toEqual(paused);
    copy.imports.control(batch.id, { action: 'resume' });
    await copy.imports.idle();
    expect(copy.imports.get(batch.id).progress.ready).toBe(1);
    expect(copy.catalog().sources).toHaveLength(0);
    expect(copy.catalog().knowledge).toHaveLength(0);
  } finally { copy.close(); }
});

test('failed files retain their originals for explicit retry and do not stall later jobs or spin automatically', async () => {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Retry queue', files: [
    { path: 'invalid.pdf', byteCount: 3 }, { path: 'later.txt', byteCount: 3 },
  ] });
  await store.imports.upload(batch.id, batch.entries[0]!.id, 'YmFk');
  await store.imports.upload(batch.id, batch.entries[1]!.id, 'b25l');
  await store.imports.idle();
  let next = store.imports.get(batch.id);
  expect(next.progress).toMatchObject({ errors: 1, ready: 1, queued: 0 });
  const failedRevision = next.revisionId;
  await store.imports.idle();
  expect(store.imports.get(batch.id).revisionId).toBe(failedRevision);
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  await store.imports.idle();
  expect(store.imports.get(batch.id).revisionId).toBe(failedRevision);
  next = store.imports.control(batch.id, { action: 'retry' });
  expect(next.entries[0]?.phase).toBe('queued');
  expect(next.entries[0]?.hash).not.toBeNull();
  await store.imports.idle();
  expect(store.imports.get(batch.id).progress).toMatchObject({ errors: 1, ready: 1, queued: 0 });
});

test('shutdown interrupts an active parser without losing the queued original or writing to a closed database', async () => {
  const bytes = syntheticPdf(['Synthetic durable parser recovery']);
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Parser restart', files: [{ path: 'original.pdf', byteCount: bytes.length }] });
  await store.imports.upload(batch.id, batch.entries[0]!.id, Buffer.from(bytes).toString('base64'));
  for (let n = 0; n < 100 && !store.imports.get(batch.id).progress.processing; n++) await Bun.sleep(1);
  expect(store.imports.get(batch.id).progress.processing).toBe(1);
  const service = store.imports;
  const path = store.databasePath;
  store.close();
  await service.idle();
  store = new WorkspaceStore({ databasePath: path });
  await store.imports.idle();
  expect(store.imports.get(batch.id).progress).toMatchObject({ ready: 1, errors: 0, queued: 0 });
  expect(store.imports.inspect(batch.id, batch.entries[0]!.id).body).toContain('Synthetic durable parser recovery');
});

test('schema-eleven staged originals migrate additively and resume without changing existing records', async () => {
  const matter = store.createMatter({ title: 'Retained matter' });
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Old interrupted import', files: [{ path: 'one.txt', byteCount: 3 }] });
  await store.imports.upload(batch.id, batch.entries[0]!.id, 'b25l');
  const path = store.databasePath;
  store.close();
  const old = new Database(path);
  old.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; PRAGMA user_version=11;');
  old.close();
  const backup = await createWorkspaceBackup(path);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(11);
  store = new WorkspaceStore({ databasePath: path });
  await store.imports.idle();
  expect(store.getMatter(matter.id)).toEqual(matter);
  expect(store.imports.get(batch.id).progress.ready).toBe(1);
  expect(store.catalog().sources).toHaveLength(0);
});

test('large imports page and filter before rendering while upload plans and approvals cover every file', async () => {
  const body = 'Synthetic import evidence. '.repeat(80);
  const files = Array.from({ length: 601 }, (_, i) => ({ path: `Folder/record-${String(i).padStart(4, '0')}.txt`, byteCount: Buffer.byteLength(body) }));
  files[600]!.path = 'Templates/last-starting-point.txt';
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Large synthetic folder', files });
  expect(store.imports.get(batch.id, {}).entries).toHaveLength(50);
  expect(store.imports.get(batch.id, { offset: 600 }).entries[0]?.path).toBe(files[600]!.path);
  expect(store.imports.get(batch.id, { query: 'last-starting' })).toMatchObject({ total: 1, selection: { included: 601, templates: 1 } });
  expect(store.imports.uploadPlan(batch.id)).toHaveLength(601);
  for (const entry of batch.entries) {
    const ack = store.imports.receive(batch.id, entry.id, Buffer.from(body).toString('base64'));
    expect(JSON.stringify(ack).length).toBeLessThan(100);
  }
  await store.imports.idle();
  expect(store.imports.get(batch.id, { status: 'ready', offset: 600 }).entries).toHaveLength(1);
  expect(store.imports.get(batch.id, { status: 'waiting' }).total).toBe(0);
  expect(store.imports.get(batch.id, { status: 'attention' }).total).toBe(0);
  const ready = store.imports.get(batch.id, { query: 'record-0001' });
  expect(ready.entries).toHaveLength(1);
  expect(() => store.imports.commit(batch.id, { expectedRevisionId: ready.revisionId })).toThrow('Templates');
  const template = store.imports.get(batch.id, { offset: 600 }).entries[0]!;
  const reviewed = store.imports.edit(batch.id, template.id, { expectedRevisionId: ready.revisionId, choice: { ...template.choice, whenToUse: 'Synthetic starting point for testing.' } });
  const committed = store.imports.commit(batch.id, { expectedRevisionId: reviewed.revisionId, allowPracticeWideTemplates: true });
  expect(committed.receipt?.items).toHaveLength(601);
  const last = committed.receipt!.items[600]!;
  expect(store.originalFile(last.sourceRevisionId).bytes.toString()).toBe(body);
  expect(store.catalog().totals.sources).toBe(601);
  const db = new Database(store.databasePath, { readonly: true });
  expect(db.query('SELECT count(*) AS n FROM import_entry_metadata').get()).toEqual({ n: 0 });
  db.close();
}, 30_000);

test('schema-twelve extraction metadata migrates without changing saved choices or pause state and backup detects tampering', async () => {
  const batch = await stage({ 'ready.txt': 'Synthetic ready text' });
  store.imports.control(batch.id, { action: 'pause' });
  const before = store.imports.get(batch.id);
  const path = store.databasePath;
  store.close();
  const old = new Database(path);
  old.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; PRAGMA user_version=12;');
  old.close();
  const backup = await createWorkspaceBackup(path);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(12);
  store = new WorkspaceStore({ databasePath: path });
  expect(store.imports.get(batch.id)).toEqual(before);
  await createWorkspaceBackup(path);
  const db = new Database(path);
  db.run('UPDATE import_entry_metadata SET extracted_byte_count=1');
  db.close();
  await expect(createWorkspaceBackup(path)).rejects.toThrow('metadata');
});

test('ten-thousand-file inventories use the larger manifest boundary without enlarging ordinary JSON or page responses', async () => {
  const origin = 'http://127.0.0.1:7459', token = 'large-manifest-test-only';
  const handler = workspaceHandler({ store, origin, token, demo: false, distDir: root });
  const files = Array.from({ length: 10_000 }, (_, i) => ({ path: `${'a'.repeat(150)}/${'b'.repeat(150)}/file-${i}.txt`, byteCount: 1 }));
  const body = JSON.stringify({ clientId: crypto.randomUUID(), label: 'Full-size inventory', files });
  expect(Buffer.byteLength(body)).toBeGreaterThan(2_200_000);
  const response = await handler(new Request(origin + '/api/workspace/imports', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body }));
  expect(response.status).toBe(201);
  const batch = await response.json() as ImportBatch;
  expect(batch.total).toBe(10_000);
  expect(batch.entries).toHaveLength(50);
  expect(JSON.stringify(batch).length).toBeLessThan(100_000);
  const get = (path: string, auth = token) => handler(new Request(origin + '/api/workspace' + path, { headers: { authorization: 'Bearer ' + auth } }));
  expect((await get(`/imports/${batch.id}/upload-plan`, 'wrong')).status).toBe(401);
  expect((await get(`/imports/${batch.id}?limit=101`)).status).toBe(400);
  const result = await (await get(`/imports/${batch.id}?query=file-9999&status=waiting`)).json() as ImportBatch;
  expect(result.entries).toHaveLength(1);
  expect(result.selection.included).toBe(10_000);
  expect((await get(`/imports/${batch.id}?offset=9950`)).status).toBe(200);
  expect((await handler(new Request(origin + '/api/workspace/matters', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body }))).status).toBe(413);
});
