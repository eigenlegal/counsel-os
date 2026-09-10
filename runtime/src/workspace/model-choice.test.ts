import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WorkspaceStore } from "./store";
import { WorkspaceConnection } from "./connection";
import { WorkspaceChat } from "./chat";
import { ModelChoice, type ModelCatalog } from "./model-choice";
import { memoryStore } from "../providers/secrets";
import { FakeModelProvider } from "../core/fake-provider";
import { workspaceHandler } from "./http";
import { createWorkspaceBackup, restoreWorkspaceBackup } from "./backups";

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "counsel-model-choice-test-"));
  store = new WorkspaceStore({ databasePath: join(root, "workspace.sqlite3") });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const choice = { kind: "codex" as const, model: "synthetic-a" };
const other = { ...choice, model: "synthetic-b" };

test("per-chat preferences persist, reject stale edits, support retry/reset and remain in backups", async () => {
  const a = store.conversations.create({}),
    b = store.conversations.create({});
  const first = store.conversations.saveModelPreference(a.id, {
    expectedRevisionId: null,
    choice,
  });
  expect(
    store.conversations.saveModelPreference(a.id, {
      expectedRevisionId: null,
      choice,
    }),
  ).toEqual(first);
  expect(() =>
    store.conversations.saveModelPreference(a.id, {
      expectedRevisionId: null,
      choice: other,
    }),
  ).toThrow("another window");
  expect(store.conversations.modelPreference(b.id).choice).toBeNull();
  const backup = await createWorkspaceBackup(store.databasePath);
  const backupPath = join(root, backup.name);
  writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, root);
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(copy.conversations.modelPreference(a.id)).toEqual(first);
  } finally {
    copy.close();
  }
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.conversations.modelPreference(a.id)).toEqual(first);
  expect(
    store.conversations.saveModelPreference(a.id, {
      expectedRevisionId: first.revisionId,
      choice: null,
    }).choice,
  ).toBeNull();
});

test("concurrent turns freeze models; explicit choice belongs to retry identity; legacy requests use chat preference", async () => {
  const a = store.conversations.create({}),
    b = store.conversations.create({});
  store.conversations.saveModelPreference(a.id, {
    expectedRevisionId: null,
    choice,
  });
  let fallback = "synthetic-default";
  const requested: string[] = [];
  const chat = new WorkspaceChat(store, (selected) => {
    const model = selected?.model ?? fallback;
    requested.push(model);
    const fake = new FakeModelProvider([
      { text: "Synthetic response", delayMs: 20 },
    ]);
    return { ...fake, id: `fixture/${model}`, run: fake.run.bind(fake) };
  });
  try {
    const requestA = { clientId: crypto.randomUUID(), message: "One" };
    const requestB = {
      clientId: crypto.randomUUID(),
      message: "Two",
      modelChoice: other,
    };
    const turnA = chat.start(a.id, requestA),
      turnB = chat.start(b.id, requestB);
    fallback = "synthetic-new-default";
    store.conversations.saveModelPreference(b.id, {
      expectedRevisionId: null,
      choice,
    });
    expect(chat.start(b.id, requestB).id).toBe(turnB.id);
    expect(() =>
      chat.start(b.id, { ...requestB, modelChoice: choice }),
    ).toThrow("another message");
    expect(() =>
      store.conversations.begin(
        b.id,
        { ...requestB, modelChoice: choice },
        "anything",
      ),
    ).toThrow("another message");
    await chat.idle();
    expect(requested).toEqual(["synthetic-a", "synthetic-b"]);
    expect(store.conversations.turn(turnA.id).state.model).toBe(
      "fixture/synthetic-a",
    );
    expect(store.conversations.turn(turnB.id).state.model).toBe(
      "fixture/synthetic-b",
    );
    expect(store.conversations.turn(turnB.id).status).toBe("complete");
  } finally {
    chat.stop();
    await chat.idle();
  }
});

test("model overrides never change providers or Claude billing; default changes do not rewrite an explicit choice", () => {
  const connection = new WorkspaceConnection(store, memoryStore());
  connection.configure({ ...choice });
  expect(connection.resolve(other).id).toBe("codex-sub/synthetic-b");
  expect(connection.status().config?.model).toBe("synthetic-a");
  connection.configure({
    kind: "claude-code",
    model: "sonnet",
    claudeBilling: "subscription",
  });
  expect(() => connection.resolve(choice)).toThrow("billing method changed");
  expect(() =>
    connection.resolve({
      kind: "claude-code",
      model: "opus",
      claudeBilling: "api",
    }),
  ).toThrow("billing method changed");
  expect(
    connection.resolve({ kind: "claude-code", model: "opus" }).id,
  ).toContain("opus");
  expect(
    ModelChoice.safeParse({ ...choice, apiKey: "not-accepted" }).success,
  ).toBe(false);
  expect(
    ModelChoice.safeParse({ ...choice, model: "--config=unsafe" }).success,
  ).toBe(false);
});

test("catalogs are bounded, coalesced metadata requests to fixed endpoints; errors reveal no credentials", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let response = Response.json({
    data: [
      { id: "gpt-synthetic" },
      { id: "gpt-image-synthetic" },
      { id: "text-embedding-synthetic" },
      { id: "gpt-synthetic" },
    ],
  });
  const connection = new WorkspaceConnection(store, memoryStore(), {
    fetch: (async (url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return response.clone();
    }) as typeof fetch,
    codexCatalog: async () => [{ id: "synthetic-a", label: "Synthetic A" }],
  });
  expect((await connection.models("openai-api")).source).toBe("unavailable");
  expect(calls).toHaveLength(0);
  connection.configure({
    kind: "openai-api",
    model: "gpt-synthetic",
    apiKey: "synthetic-secret",
  });
  const [a, b] = await Promise.all([
    connection.models("openai-api"),
    connection.models("openai-api"),
  ]);
  expect(a).toEqual(b);
  expect(calls).toHaveLength(1);
  expect(a.models).toEqual([{ id: "gpt-synthetic", label: "gpt-synthetic" }]);
  expect(calls[0]?.url).toBe("https://api.openai.com/v1/models");
  expect(calls[0]?.init?.redirect).toBe("error");
  expect(calls[0]?.init?.body).toBeUndefined();
  expect(JSON.stringify(a)).not.toContain("synthetic-secret");
  expect((await connection.models("codex")).source).toBe("cli-bundled");
  expect(
    (await connection.models("claude-code")).models.map((v) => v.id),
  ).toEqual(["sonnet", "opus", "haiku", "fable"]);
  expect((await connection.models("claude-code")).note).toContain("usage credits");
  expect(connection.status().config).toMatchObject({ kind: "openai-api", model: "gpt-synthetic" });
  expect(calls).toHaveLength(1);
  connection.configure({
    kind: "anthropic-api",
    model: "claude-synthetic",
    apiKey: "synthetic-secret",
  });
  response = Response.json({
    data: [{ id: "claude-synthetic", display_name: "Synthetic" }],
    has_more: true,
  });
  expect((await connection.models("anthropic-api")).note).toContain(
    "first page",
  );
  expect(calls.at(-1)?.url).toBe(
    "https://api.anthropic.com/v1/models?limit=100",
  );
  connection.configure({ kind: "openai-api", model: "gpt-synthetic" });
  response = new Response("synthetic-secret provider error", { status: 401 });
  expect(JSON.stringify(await connection.models("openai-api"))).not.toContain(
    "synthetic-secret",
  );
  connection.configure({ kind: "openai-api", model: "gpt-synthetic" });
  response = new Response("x".repeat(1_000_001));
  expect((await connection.models("openai-api")).source).toBe("unavailable");
});

test("model routes require authentication, validate fields, and reject stale connection/billing choices", async () => {
  const connection = new WorkspaceConnection(store, memoryStore(), {
    codexCatalog: async () => [],
  });
  connection.configure(choice);
  const conversation = store.conversations.create({});
  const origin = "http://127.0.0.1:7432";
  const handler = workspaceHandler({
    store,
    connection,
    token: "synthetic",
    origin,
    distDir: root,
    demo: true,
  });
  const call = (path: string, data?: unknown, authenticated = true) =>
    handler(
      new Request(`${origin}/api/workspace${path}`, {
        method: data ? "POST" : "GET",
        headers: {
          origin,
          ...(authenticated ? { authorization: "Bearer synthetic" } : {}),
          "content-type": "application/json",
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      }),
    );
  expect(
    (await call("/connection/models", { kind: "codex" }, false)).status,
  ).toBe(401);
  expect(
    (await call("/connection/models", { kind: "codex", command: "unsafe" }))
      .status,
  ).toBe(400);
  expect((await call("/connection/models", { kind: "codex" })).status).toBe(
    200,
  );
  expect(
    (
      await call(`/conversations/${conversation.id}/model`, {
        expectedRevisionId: null,
        choice: other,
      })
    ).status,
  ).toBe(200);
  const state: any = await (
    await call(`/conversations/${conversation.id}`)
  ).json();
  expect(state.modelPreference.choice).toEqual(other);
  expect(
    (
      await call(`/conversations/${conversation.id}/model`, {
        expectedRevisionId: null,
        choice,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call(`/conversations/${conversation.id}/model`, {
        expectedRevisionId: state.modelPreference.revisionId,
        choice: { kind: "openai-api", model: "gpt-synthetic" },
      })
    ).status,
  ).toBe(409);
});
