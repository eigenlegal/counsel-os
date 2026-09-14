import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WorkspaceStore } from "./store";
import { WorkspaceChat } from "./chat";
import { chatTools } from "./chat-tools";
import { FakeModelProvider, runToolDef } from "../core/fake-provider";
import { workspaceHandler } from "./http";
import {
  createWorkspaceBackup,
  inspectWorkspaceBackup,
  restoreWorkspaceBackup,
} from "./backups";

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "counsel-client-test-"));
  store = new WorkspaceStore({ databasePath: join(root, "workspace.sqlite3") });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const send = (message = "Where are we?") => ({
  clientId: crypto.randomUUID(),
  message,
});
function fixtures() {
  const client = store.clients.create({
    id: crypto.randomUUID(),
    name: "Synthetic Atlas",
    summary: "Synthetic client background.",
  });
  const other = store.clients.create({
    id: crypto.randomUUID(),
    name: "OTHER-CLIENT-CANARY",
  });
  const a = store.createMatter({ title: "Employment advice" }),
    b = store.createMatter({ title: "Agreement review" }),
    c = store.createMatter({ title: "UNSELECTED-MATTER" }),
    d = store.createMatter({ title: "OTHER-MATTER-CANARY" });
  for (const m of [a, b, c])
    store.clients.assign(m.id, {
      clientId: client.id,
      expectedRevisionId: null,
    });
  store.clients.assign(d.id, { clientId: other.id, expectedRevisionId: null });
  const docs = [a, b, c, d].map((m) =>
    store.createSource({
      kind: "reference",
      matterIds: [m.id],
      revision: {
        title: m.title,
        body: `Status ${m.title}.`,
        provenance: { origin: "fixture" },
      },
    }),
  );
  const chat = store.conversations.create({
    scope: "client",
    clientId: client.id,
    matterIds: [a.id, b.id],
  });
  return { client, other, a, b, c, d, docs, chat };
}
test("clients are optional; explicit selections validate ownership, bounds and optimistic assignments", () => {
  expect(store.clients.list()).toEqual([]);
  const lone = store.createMatter({ title: "No client required" });
  expect(store.clients.link(lone.id)).toEqual({
    clientId: null,
    revisionId: null,
  });
  expect(
    store.conversations.create({ scope: "matter", matterId: lone.id }).scope,
  ).toBe("matter");
  const { client, other, a, b, d } = fixtures();
  for (const input of [
    { scope: "client" },
    { scope: "client", clientId: client.id, matterIds: [] },
    { scope: "client", clientId: client.id, matterIds: [a.id, a.id] },
    { scope: "client", clientId: client.id, matterIds: [d.id] },
    { scope: "matter", matterId: b.id, clientId: client.id, matterIds: [a.id] },
    { scope: "client", clientId: other.id, matterIds: [a.id] },
  ])
    expect(() => store.conversations.create(input as never)).toThrow();
  expect(() =>
    store.clients.assign(a.id, {
      clientId: other.id,
      expectedRevisionId: null,
    }),
  ).toThrow("changed");
  expect(store.clients.matters(client.id).map((m) => m.id)).toContain(a.id);
  expect(store.conversations.list(undefined, other.id)).toEqual([]);
});
test("client tools enforce the selected union for lists, search, read and citations, not all client or workspace records", async () => {
  const f = fixtures(),
    turn = store.conversations.begin(f.chat.id, send(), "fixture").turn;
  const approved = [f.a, f.b, f.c, f.d].map((m) =>
    store.createKnowledge({
      kind: "position",
      matterId: m.id,
      revision: {
        title: m.title,
        body: `Status ${m.title}`,
        status: "approved",
        approvedBy: "Synthetic reviewer",
      },
    }),
  );
  const works = [f.a, f.b, f.c, f.d].map((m) =>
    store.recordWork({
      title: m.title,
      matterId: m.id,
      request: "Status",
      answer: `Status ${m.title}`,
    }),
  );
  store.createKnowledge({
    kind: "position",
    matterId: f.a.id,
    revision: { title: "PENDING-CANARY", body: "Status pending" },
  });
  const bundle = chatTools({
    store,
    conversation: f.chat,
    turn,
    attachments: [],
    signal: new AbortController().signal,
    save: () => {},
  });
  const call = (name: string, input: unknown) =>
    runToolDef(bundle.tools, name, input, "workspace");
  for (const kind of ["source", "knowledge", "work"]) {
    const listed = await call("counsel_list_records", { kind });
    expect(listed.isError).toBe(false);
    expect(JSON.stringify(listed)).not.toMatch(/OTHER-|UNSELECTED-|PENDING-/);
  }
  expect(
    JSON.stringify(await call("counsel_search_records", { query: "Status" })),
  ).not.toMatch(/OTHER-|UNSELECTED-|PENDING-/);
  expect(turn.state.context).toEqual([]);
  for (let i = 0; i < 4; i++) {
    for (const [kind, id] of [
      ["source", f.docs[i]!.latest.id],
      ["knowledge", approved[i]!.latest.id],
      ["work", works[i]!.id],
    ])
      expect(!!(await call("counsel_read_record", { kind, id })).isError).toBe(
        i >= 2,
      );
  }
  expect(
    (
      await call("counsel_cite_passage", {
        kind: "source",
        id: f.docs[2]!.latest.id,
        quote: f.docs[2]!.latest.body,
        start: 0,
      })
    ).isError,
  ).toBe(true);
  expect(
    !!(
      await call("counsel_cite_passage", {
        kind: "source",
        id: f.docs[1]!.latest.id,
        quote: f.docs[1]!.latest.body,
        start: 0,
      })
    ).isError,
  ).toBe(false);
  expect(
    (
      await call("counsel_list_records", {
        kind: "source",
        matterIds: [f.d.id],
      })
    ).isError,
  ).toBe(true);
  expect((await call("counsel_propose_matter_brief", {})).isError).toBe(true);
  expect(() =>
    store.clients.assign(f.a.id, {
      clientId: f.other.id,
      expectedRevisionId: store.clients.link(f.a.id).revisionId,
    }),
  ).toThrow("Wait");
  const extra = store.createMatter({ title: "FUTURE-MATTER" });
  store.clients.assign(extra.id, {
    clientId: f.client.id,
    expectedRevisionId: null,
  });
  expect(
    store.conversations.get(f.chat.id).clientContext?.matters,
  ).toHaveLength(2);
  turn.status = "cancelled";
  store.conversations.save(turn);
  store.clients.assign(f.a.id, {
    clientId: f.other.id,
    expectedRevisionId: store.clients.link(f.a.id).revisionId,
  });
  expect(store.conversations.get(f.chat.id).scope).toBe("client");
  expect(() => store.conversations.begin(f.chat.id, send(), "fixture")).toThrow(
    "no longer belongs",
  );
});
test("client context, exact read receipts and originals survive backup; no implicit replay or client expansion", async () => {
  const f = fixtures();
  const fake = new FakeModelProvider([
    {
      toolCalls: [
        {
          name: "counsel_read_record",
          input: { kind: "source", id: f.docs[0]!.latest.id },
        },
        {
          name: "counsel_read_record",
          input: { kind: "source", id: f.docs[1]!.latest.id },
        },
      ],
      text: "Synthetic combined response.",
    },
  ]);
  const app = new WorkspaceChat(store, () => fake),
    turn = app.start(f.chat.id, send());
  await app.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.status).toBe("complete");
  expect(
    saved.state.scopeContext?.clientContext?.matters.map((m) => m.id),
  ).toEqual([f.a.id, f.b.id]);
  expect(fake.lastRequest?.system).toContain("Synthetic client background.");
  expect(fake.lastRequest?.system).not.toMatch(
    /OTHER-CLIENT-CANARY|OTHER-MATTER-CANARY|UNSELECTED-MATTER/,
  );
  expect(saved.state.context).toHaveLength(2);
  store.clients.update(f.client.id, {
    name: "Renamed Atlas",
    summary: "NEW BACKGROUND",
    expectedRevisionId: f.client.revisionId,
  });
  expect(
    store.conversations.turn(turn.id).state.scopeContext?.clientContext?.name,
  ).toBe("Synthetic Atlas");
  const backup = await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(20);
  const path = join(root, backup.name);
  writeFileSync(path, backup.bytes);
  const recovered = await restoreWorkspaceBackup(path, root);
  const restored = new WorkspaceStore({ databasePath: recovered.databasePath });
  try {
    expect(restored.conversations.get(f.chat.id).scope).toBe("client");
    expect(restored.clients.list()).toHaveLength(2);
    expect(restored.conversations.turn(turn.id).state).toEqual(saved.state);
    expect(restored.clients.link(f.a.id).clientId).toBe(f.client.id);
  } finally {
    restored.close();
  }
});
test("client endpoints are authenticated and cannot infer or widen a matter selection", async () => {
  const f = fixtures(),
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
  expect((await req("/clients", undefined, false)).status).toBe(401);
  expect((await req(`/clients/${f.client.id}`)).status).toBe(200);
  expect(
    (
      await req("/conversations", {
        scope: "client",
        clientId: f.client.id,
        matterIds: [f.d.id],
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await req(`/matters/${f.a.id}/client`, {
        clientId: f.other.id,
        expectedRevisionId: null,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await req(`/clients/${f.client.id}`, {
        name: "Wrong",
        summary: "",
        expectedRevisionId: f.client.revisionId,
        all: true,
      })
    ).status,
  ).toBe(400);
});
