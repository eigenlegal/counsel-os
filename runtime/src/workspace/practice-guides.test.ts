import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guideCatalog, readPracticeGuide } from "./practice-guides";
import { WorkspaceStore } from "./store";
import { WorkspaceChat } from "./chat";
import { FakeModelProvider, runToolDef } from "../core/fake-provider";
import { createWorkspaceBackup, restoreWorkspaceBackup } from "./backups";
import { workspaceHandler } from "./http";

test("guide catalog is bounded metadata; exact versions are isolated and cannot turn into legal authority", () => {
  const catalog = guideCatalog();
  expect(catalog).toHaveLength(4);
  expect(
    catalog.every((item) => item.authority === "working-method-not-law"),
  ).toBe(true);
  expect(JSON.stringify(catalog)).not.toContain("sourceMap");
  const guide = readPracticeGuide("privacy", catalog);
  expect(guide.limits.join(" ")).toContain("not legal authority");
  expect(guide.method.join(" ")).toContain("employment");
  guide.method[0] = "Injected mutation";
  expect(readPracticeGuide("privacy", catalog).method[0]).not.toBe(
    "Injected mutation",
  );
  expect(() => readPracticeGuide("../../profile", catalog)).toThrow();
  expect(() =>
    readPracticeGuide("privacy", [
      { ...catalog[0]!, contentHash: "wrong-version" },
    ]),
  ).toThrow("version is unavailable");
});

test("multiple guides load through ordinary chat tools, preserve scope and survive backup as exact receipts", async () => {
  const root = mkdtempSync(join(tmpdir(), "counsel-guide-test-"));
  const store = new WorkspaceStore({
    databasePath: join(root, "workspace.sqlite3"),
  });
  let restored: WorkspaceStore | undefined;
  try {
    const fake = new FakeModelProvider([
      {
        toolCalls: [
          { name: "counsel_read_guide", input: { id: "privacy" } },
          { name: "counsel_read_guide", input: { id: "employment" } },
          { name: "counsel_read_guide", input: { id: "privacy" } },
        ],
        text: "Synthetic evaluation plan.",
      },
    ]);
    const chat = new WorkspaceChat(store, () => fake);
    const conversation = store.conversations.create({});
    const turn = chat.start(conversation.id, {
      clientId: crypto.randomUUID(),
      message: "Plan a review of staff location monitoring.",
    });
    await chat.idle();
    const saved = store.conversations.turn(turn.id);
    expect(saved.state.guidesRead?.map((guide) => guide.id)).toEqual([
      "privacy",
      "employment",
    ]);
    expect(saved.state.context).toEqual([]);
    expect(saved.state.citations).toEqual([]);
    expect(saved.state.proposalIds).toEqual([]);
    expect(store.conversations.get(conversation.id).scope).toBe("conversation");
    expect(fake.lastRequest!.system).toContain(
      "Never ask the user to select a module",
    );
    expect(
      (
        await runToolDef(
          fake.lastRequest!.tools,
          "counsel_cite_passage",
          {
            kind: "guide",
            id: "privacy",
            quote: "Read",
            start: 0,
          },
          "workspace",
        )
      ).isError,
    ).toBe(true);
    const archive = await createWorkspaceBackup(store.databasePath);
    const backupPath = join(root, archive.name);
    writeFileSync(backupPath, archive.bytes, { flag: "wx", mode: 0o600 });
    const recovery = await restoreWorkspaceBackup(backupPath, root);
    restored = new WorkspaceStore({ databasePath: recovery.databasePath });
    expect(restored.conversations.turn(turn.id).state.guidesRead).toEqual(
      saved.state.guidesRead,
    );
    expect(restored.conversations.turn(turn.id).state.discoveryContext).toEqual(
      saved.state.discoveryContext,
    );
  } finally {
    restored?.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("browsing all working guides requires workspace authentication and makes no conversation or read receipt", async () => {
  const store = new WorkspaceStore({ databasePath: ":memory:" });
  try {
    const handler = workspaceHandler({
      store,
      token: "synthetic",
      origin: "http://127.0.0.1:7458",
      distDir: ".",
      demo: true,
    });
    const url = "http://127.0.0.1:7458/api/workspace/guides";
    expect((await handler(new Request(url))).status).toBe(401);
    const response = await handler(
      new Request(url, { headers: { authorization: "Bearer synthetic" } }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as unknown[]).length).toBe(4);
    expect(store.conversations.list()).toEqual([]);
    expect(store.listWork()).toEqual([]);
    expect(
      (
        await handler(
          new Request(url, {
            method: "POST",
            headers: {
              authorization: "Bearer synthetic",
              "content-type": "application/json",
            },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(404);
  } finally {
    store.close();
  }
});
