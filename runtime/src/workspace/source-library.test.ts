import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceStore } from "./store";
import { createWorkspaceBackup, inspectWorkspaceBackup } from "./backups";
import { workspaceHandler } from "./http";
let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "counsel-library-test-"));
  store = new WorkspaceStore({ databasePath: join(root, "workspace.sqlite3") });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
function source(origin: string, title = origin, matterIds: string[] = []) {
  return store.createSource({
    kind: "reference",
    matterIds,
    revision: { title, body: "Original exact text.", provenance: { origin } },
  });
}
test("library placement separates user practice, external content, matter originals and unclassified files without changing evidence or scope", () => {
  const m = store.createMatter({ title: "Matter" });
  const practice = source("plugin:practice/reference/internal-background.md"),
    law = source("plugin:law/privacy/floors.md"),
    note = source("plugin:matters/matter.md", "Matter note", [m.id]),
    unknown = source("upload:Unknown.pdf");
  expect(
    store.sourceLibrary({ collection: "practice" }).records.map((r) => r.id),
  ).toEqual([practice.id]);
  expect(
    store.sourceLibrary({ collection: "external" }).records.map((r) => r.id),
  ).toEqual([law.id]);
  expect(
    store.sourceLibrary({ collection: "matter" }).records.map((r) => r.id),
  ).toEqual([note.id]);
  expect(
    store.sourceLibrary({ collection: "unfiled" }).records.map((r) => r.id),
  ).toEqual([unknown.id]);
  const work = store.recordWork({
    title: "Evidence",
    request: "Check",
    answer: "Preserved",
    matterId: m.id,
    evidence: [
      {
        target: { kind: "source", revisionId: note.latest.id },
        quote: note.latest.body!,
        start: 0,
      },
    ],
  });
  const before = store.search({ query: "Original", matterId: m.id });
  const place = store.placeSource(note.id, {
    collection: "practice",
    expectedRevisionId: null,
  });
  expect(store.getSource(note.id).latest).toEqual(note.latest);
  expect(store.getWork(work.id)).toEqual(work);
  expect(store.search({ query: "Original", matterId: m.id })).toEqual(before);
  expect(store.getSource(note.id).matterIds).toEqual([m.id]);
  expect(() =>
    store.placeSource(note.id, {
      collection: "external",
      expectedRevisionId: null,
    }),
  ).toThrow("changed");
  store.placeSource(note.id, {
    collection: "auto",
    expectedRevisionId: place.revisionId,
  });
  expect(store.getSource(note.id).placement?.collection).toBe("matter");
  expect(store.catalog().knowledge).toEqual([]);
});
test("source browsing filters before pagination and reaches older records beyond the main catalog", () => {
  for (let i = 0; i < 55; i++) source("plugin:law/test.md", `External ${i}`);
  for (let i = 0; i < 501; i++) source("upload", `Unclassified ${i}`);
  const first = store.sourceLibrary({ collection: "external" }),
    next = store.sourceLibrary({ collection: "external", page: 1 });
  expect(first.total).toBe(55);
  expect(first.hasMore).toBe(true);
  expect(next.records).toHaveLength(5);
  expect(next.hasMore).toBe(false);
  expect(
    new Set([...first.records, ...next.records].map((r) => r.id)).size,
  ).toBe(55);
  expect(
    store.sourceLibrary({ collection: "external", query: "External 0" })
      .records,
  ).toHaveLength(1);
  expect(() =>
    store.sourceLibrary({ collection: "external", page: -1 }),
  ).toThrow();
});
test("schema-seven backups remain supported and organization backfill preserves exact saved source versions and approvals", async () => {
  const practice = source("plugin:practice/methods/issue.md"),
    law = source("plugin:law/area/floors.md");
  const pending = store.createKnowledge({
    kind: "method",
    revision: { title: "Pending imported method", body: "Unapproved" },
  });
  const path = store.databasePath;
  store.close();
  const old = new Database(path);
  old.exec(
    DROP_UPKEEP + "DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; PRAGMA user_version=7;",
  );
  old.close();
  const backup = await createWorkspaceBackup(path);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(7);
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getSource(practice.id).placement?.collection).toBe("practice");
  expect(store.getSource(law.id).placement?.collection).toBe("external");
  expect(store.getSource(practice.id).latest).toEqual(practice.latest);
  expect(store.getKnowledge(pending.id).active).toBeNull();
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.clients.list()).toEqual([]);
});
test("library routes authenticate and location writes cannot supply new approval, scope or evidence fields", async () => {
  const item = source("upload"),
    handler = workspaceHandler({
      store,
      token: "synthetic",
      origin: "http://127.0.0.1:7432",
      distDir: root,
      demo: true,
    });
  const req = (path: string, input?: unknown, auth = true) =>
    handler(
      new Request(`http://127.0.0.1:7432/api/workspace${path}`, {
        method: input === undefined ? "GET" : "POST",
        headers: {
          ...(auth ? { authorization: "Bearer synthetic" } : {}),
          "content-type": "application/json",
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      }),
    );
  expect(
    (await req("/source-library?collection=external", undefined, false)).status,
  ).toBe(401);
  expect(
    (await req("/source-library?collection=external&page=-1")).status,
  ).toBe(400);
  expect(
    (
      await req(`/sources/${item.id}/placement`, {
        collection: "practice",
        expectedRevisionId: null,
        status: "approved",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await req(`/sources/${item.id}/placement`, {
        collection: "practice",
        expectedRevisionId: null,
      })
    ).status,
  ).toBe(200);
  expect((await req("/source-library?collection=practice")).status).toBe(200);
});
