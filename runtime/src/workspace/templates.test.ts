import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceStore } from "./store";
import { WorkspaceChat } from "./chat";
import { FakeModelProvider, runToolDef } from "../core/fake-provider";
import { chatTools } from "./chat-tools";
import { TemplateCreate, type PracticeTemplate } from "./templates";
import { decodeBackup, encodeBackup } from "./backup-format";
import {
  createWorkspaceBackup,
  restoreWorkspaceBackup,
  inspectWorkspaceBackup,
} from "./backups";
import { workspaceHandler } from "./http";
let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "counsel-template-test-"));
  store = new WorkspaceStore({ databasePath: join(root, "workspace.sqlite3") });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
function source(matterId?: string) {
  return store.createSource({
    kind: "document",
    matterIds: matterId ? [matterId] : [],
    revision: {
      title: "Starting document",
      body: "Use written notices. Synthetic template.",
      provenance: { origin: "fixture:template" },
    },
  });
}
const fields = (id: string) => ({
  clientId: crypto.randomUUID(),
  sourceRevisionId: id,
  title: "NDA starting point",
  whenToUse: "Mutual confidentiality discussions.",
  jurisdiction: "Synthetic only",
  practiceWideUse: true as const,
});
test("template creation is explicit, version-pinned, durable, idempotent and does not approve positions", () => {
  const document = source();
  expect(store.templates.list()).toEqual([]);
  const input = fields(document.latest.id);
  expect(
    TemplateCreate.safeParse({ ...input, practiceWideUse: false }).success,
  ).toBe(false);
  const template = store.templates.create(input);
  expect(store.templates.create(input)).toEqual(template);
  expect(() => store.templates.create({ ...input, title: "Changed" })).toThrow(
    "identifier",
  );
  expect(store.catalog().knowledge).toHaveLength(0);
  const revised = store.reviseSource(document.id, document.latest.id, {
    title: "Revised document",
    body: "Different notices.",
    provenance: { origin: "fixture:revision" },
  });
  expect(store.templates.get(template.id).sourceRevisionId).toBe(
    document.latest.id,
  );
  const update = {
    ...input,
    clientId: undefined,
    baseRevisionId: template.revisionId,
    sourceRevisionId: revised.id,
  };
  const { clientId: _, ...validUpdate } = update;
  const next = store.templates.update(template.id, validUpdate);
  expect(next.number).toBe(2);
  expect(store.templates.update(template.id, validUpdate)).toEqual(next);
  expect(() =>
    store.templates.update(template.id, {
      ...validUpdate,
      title: "Stale change",
    }),
  ).toThrow("changed");
  expect(
    store.templates.history(template.id).map((v) => v.sourceRevisionId),
  ).toEqual([revised.id, document.latest.id]);
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.templates.get(template.id)).toEqual(next);
});
test("unreadable and missing sources cannot leave partial template records", () => {
  const empty = store.createSource({
    kind: "document",
    revision: {
      title: "Scan",
      body: null,
      textStatus: "unavailable",
      provenance: { origin: "fixture:scan" },
    },
  });
  expect(() => store.templates.create(fields(empty.latest.id))).toThrow(
    "readable text",
  );
  expect(() => store.templates.create(fields(crypto.randomUUID()))).toThrow(
    "source version",
  );
  expect(store.templates.list()).toEqual([]);
});
test("only explicit template versions cross matters; send snapshots survive retirement and later turns cannot retrieve retired templates", async () => {
  const originalMatter = store.createMatter({ title: "Private origin" });
  const unrelated = source(originalMatter.id),
    chosen = source(originalMatter.id);
  const input = fields(chosen.latest.id);
  const template = store.templates.create(input);
  const c = store.conversations.create({ scope: "conversation" });
  const fake = new FakeModelProvider([
    { text: "Synthetic response." },
    { text: "Another response." },
  ]);
  const chat = new WorkspaceChat(store, () => fake);
  const first = chat.start(c.id, {
    clientId: crypto.randomUUID(),
    message: "Find an NDA template.",
  });
  store.templates.update(template.id, {
    sourceRevisionId: chosen.latest.id,
    title: input.title,
    whenToUse: input.whenToUse,
    jurisdiction: input.jurisdiction,
    practiceWideUse: true,
    available: false,
    baseRevisionId: template.revisionId,
  });
  await chat.idle();
  const makeTools = (id: string) =>
    chatTools({
      store,
      conversation: c,
      turn: store.conversations.turn(id),
      attachments: [],
      signal: new AbortController().signal,
      save: () => {},
    }).tools;
  const tools = makeTools(first.id);
  const result = await runToolDef(
    tools,
    "counsel_search_records",
    { query: "NDA template" },
    "workspace",
  );
  expect(result.isError).toBe(false);
  expect(JSON.stringify(result.output)).toContain(chosen.latest.id);
  expect(JSON.stringify(result.output)).not.toContain(originalMatter.id);
  expect(
    (
      await runToolDef(
        tools,
        "counsel_read_record",
        { kind: "source", id: unrelated.latest.id },
        "workspace",
      )
    ).isError,
  ).toBe(true);
  const read = await runToolDef(
    tools,
    "counsel_read_record",
    { kind: "source", id: chosen.latest.id },
    "workspace",
  );
  expect(read.isError).toBe(false);
  expect(JSON.stringify(read.output)).toContain(
    "starting point, not authority",
  );
  const cite = await runToolDef(
    tools,
    "counsel_cite_passage",
    {
      kind: "source",
      id: chosen.latest.id,
      start: 0,
      quote: "Use written notices.",
    },
    "workspace",
  );
  expect(cite.isError).toBe(false);
  const next = chat.start(c.id, {
    clientId: crypto.randomUUID(),
    message: "Try again.",
  });
  await chat.idle();
  expect(
    (
      await runToolDef(
        makeTools(next.id),
        "counsel_read_record",
        { kind: "source", id: chosen.latest.id },
        "workspace",
      )
    ).isError,
  ).toBe(true);
  chat.stop();
  await chat.idle();
});
test("template endpoints require authentication, exact update identity and explicit practice-wide use", async () => {
  const doc = source(),
    input = fields(doc.latest.id);
  const origin = "http://127.0.0.1:7490";
  const handler = workspaceHandler({
    store,
    origin,
    token: "synthetic",
    distDir: root,
    demo: false,
  });
  const send = (path: string, data?: unknown, token = "synthetic") =>
    handler(
      new Request(`${origin}/api/workspace${path}`, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
    );
  expect((await send("/templates", input, "wrong")).status).toBe(401);
  expect(
    (await send("/templates", { ...input, practiceWideUse: false })).status,
  ).toBe(400);
  expect(
    (await send("/templates", { ...input, sourcePath: "/private" })).status,
  ).toBe(400);
  const response = await send("/templates", input);
  expect(response.status).toBe(201);
  const template = (await response.json()) as PracticeTemplate;
  expect(await (await send("/templates")).json()).toHaveLength(1);
  expect(
    await (await send(`/templates/${template.id}/history`)).json(),
  ).toHaveLength(1);
  expect(await (await send("")).json()).toMatchObject({
    templates: [{ sourceRevisionId: doc.latest.id }],
  });
});
test("schema-five backups still verify and restore; migration and template backups preserve records and exact originals", async () => {
  const original = Buffer.from(
    "# Synthetic starting point\nUse written notices.\n",
  );
  const doc = await store.importDocument({
    name: "Template.md",
    base64: original.toString("base64"),
  });
  const path = store.databasePath;
  store.close();
  const old = new Database(path);
  old.exec(
    DROP_UPKEEP + "DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; DROP TABLE import_entries; DROP TABLE import_batches; DROP TABLE template_revisions; DROP TABLE practice_templates; PRAGMA user_version = 5;",
  );
  old.close();
  const older = await createWorkspaceBackup(path);
  expect(older.manifest.schemaVersion).toBe(5);
  // Prior releases did not include a template count in the manifest.
  const legacy = JSON.parse(JSON.stringify(older.manifest));
  delete legacy.counts.templates;
  const decoded = decodeBackup(older.bytes);
  const oldFile = join(root, "old.counsel-backup");
  writeFileSync(
    oldFile,
    encodeBackup(legacy, decoded.database, decoded.originals),
  );
  expect((await inspectWorkspaceBackup(oldFile)).schemaVersion).toBe(5);
  const oldRestore = await restoreWorkspaceBackup(oldFile, root);
  const recovered = new WorkspaceStore({
    databasePath: oldRestore.databasePath,
  });
  expect(recovered.templates.list()).toEqual([]);
  expect(recovered.originalFile(doc.latest.id).bytes).toEqual(original);
  recovered.close();
  store = new WorkspaceStore({ databasePath: path });
  const template = store.templates.create(fields(doc.latest.id));
  const backup = await createWorkspaceBackup(path);
  expect(backup.manifest.counts.templates).toBe(1);
  const file = join(root, "templates.counsel-backup");
  writeFileSync(file, backup.bytes);
  const restored = await restoreWorkspaceBackup(file, root);
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  expect(copy.templates.get(template.id)).toEqual(template);
  expect(copy.originalFile(template.sourceRevisionId).bytes).toEqual(original);
  copy.close();
});
