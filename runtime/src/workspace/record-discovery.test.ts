import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceStore } from "./store";
import { WorkspaceChat } from "./chat";
import { chatTools } from "./chat-tools";
import { FakeModelProvider, runToolDef } from "../core/fake-provider";
import { workspaceCodexPrompt } from "./codex";
import type { SearchBoundary } from "./search";

test("metadata browsing scopes before pagination and preserves version, approval and unavailable-text boundaries", () => {
  const store = new WorkspaceStore({ databasePath: ":memory:" });
  try {
    const a = store.createMatter({ title: "A" }),
      b = store.createMatter({ title: "OUTSIDE" });
    const create = (title: string, matterId = a.id) =>
      store.createSource({
        kind: "reference",
        matterIds: [matterId],
        revision: {
          title,
          body: "BODY-NOT-METADATA",
          textStatus: "ready",
          provenance: { origin: "PRIVATE-ORIGIN" },
        },
      });
    const old = create("Old version");
    const current = store.reviseSource(old.id, old.latest.id, {
      title: "Current version",
      body: "CURRENT-BODY",
      textStatus: "ready",
      provenance: { origin: "fixture" },
    });
    const unavailable = store.createSource({
      kind: "document",
      matterIds: [a.id],
      revision: {
        title: "Scan without text",
        body: null,
        textStatus: "unavailable",
        provenance: { origin: "fixture" },
      },
    });
    for (let i = 0; i < 49; i++) create(`In scope ${i}`);
    for (let i = 0; i < 100; i++) create(`OUTSIDE ${i}`, b.id);
    const boundary: SearchBoundary = {
      all: false,
      matterId: a.id,
      sourceRevisionIds: [],
      workIds: [],
    };
    const found = [];
    let before: number | null = null;
    do {
      const page = store.listRecords({ kind: "source", before }, boundary);
      expect(page.total).toBe(51);
      expect(page.records.length).toBeLessThanOrEqual(20);
      expect(JSON.stringify(page)).not.toMatch(
        /OUTSIDE|BODY-NOT|PRIVATE-ORIGIN/,
      );
      found.push(...page.records);
      before = page.nextBefore;
    } while (before !== null);
    expect(new Set(found.map((record) => record.id)).size).toBe(51);
    expect(found.some((record) => record.id === old.latest.id)).toBe(false);
    expect(found.find((record) => record.id === current.id)).toMatchObject({
      version: 2,
      title: "Current version",
    });
    expect(
      found.find((record) => record.id === unavailable.latest.id)?.status,
    ).toBe("unavailable");
    const restricted = {
      ...boundary,
      matterId: null,
      sourceRevisionIds: [old.latest.id],
    };
    expect(
      store.listRecords({}, restricted).records.map((record) => record.id),
    ).toEqual([old.latest.id]);
    expect(store.listRecords({}, { ...boundary, all: true }).total).toBe(151);
    const approved = store.createKnowledge({
      kind: "position",
      ownership: "user",
      revision: {
        title: "Approved",
        body: "BODY-NOT-METADATA",
        status: "approved",
        approvedBy: "Synthetic reviewer",
      },
    });
    store.createKnowledge({
      kind: "position",
      ownership: "user",
      revision: { title: "PENDING", body: "Pending body" },
    });
    store.createKnowledge({
      kind: "position",
      ownership: "user",
      matterId: b.id,
      revision: {
        title: "OUTSIDE APPROVED",
        body: "Other body",
        status: "approved",
        approvedBy: "Synthetic reviewer",
      },
    });
    expect(
      store
        .listRecords({ kind: "knowledge" }, boundary)
        .records.map((record) => record.id),
    ).toEqual([approved.active!.id]);
    const own = store.recordWork({
      title: "Own conversation",
      request: "Question",
      answer: "ANSWER-NOT-METADATA",
    });
    store.recordWork({
      title: "OUTSIDE WORK",
      request: "Question",
      answer: "Other answer",
      matterId: b.id,
    });
    expect(
      store
        .listRecords({ kind: "work" }, { ...restricted, workIds: [own.id] })
        .records.map((record) => record.id),
    ).toEqual([own.id]);
    expect(() => store.listRecords({ before: -1 }, boundary)).toThrow();
    expect(() =>
      store.listRecords({ kind: "source", all: true } as never, boundary),
    ).toThrow();
    expect(() => store.listRecords({}, boundary, 10000)).toThrow();
  } finally {
    store.close();
  }
});

test("listing never authorizes citations or marks records read; provided metadata stays scoped and survives reopen", async () => {
  const root = mkdtempSync(join(tmpdir(), "counsel-discovery-test-"));
  let store = new WorkspaceStore({
    databasePath: join(root, "workspace.sqlite3"),
  });
  try {
    const matter = store.createMatter({
      title: "Imported matter",
      summary: "Read the linked note.",
    });
    const source = store.createSource({
      kind: "reference",
      matterIds: [matter.id],
      revision: {
        title: "Imported matter note",
        body: "The interview is outstanding.",
        provenance: { origin: "fixture" },
      },
    });
    const conversation = store.conversations.create({
      scope: "matter",
      matterId: matter.id,
    });
    const turn = store.conversations.begin(
      conversation.id,
      { clientId: crypto.randomUUID(), message: "Where are we?" },
      "fixture/model",
    ).turn;
    const bundle = chatTools({
      store,
      conversation,
      turn,
      attachments: [],
      signal: new AbortController().signal,
      save: () => {},
    });
    const listing = await runToolDef(
      bundle.tools,
      "counsel_list_records",
      {},
      "workspace",
    );
    expect(listing.isError).toBe(false);
    expect(turn.state.context).toEqual([]);
    expect(
      (
        await runToolDef(
          bundle.tools,
          "counsel_cite_passage",
          {
            kind: "source",
            id: source.latest.id,
            quote: source.latest.body,
            start: 0,
          },
          "workspace",
        )
      ).isError,
    ).toBe(true);
    expect(turn.state.citations).toEqual([]);
    expect(
      (
        await runToolDef(
          bundle.tools,
          "counsel_read_record",
          { kind: "source", id: source.latest.id, start: 0 },
          "workspace",
        )
      ).isError,
    ).toBe(false);
    expect(
      (
        await runToolDef(
          bundle.tools,
          "counsel_cite_passage",
          {
            kind: "source",
            id: source.latest.id,
            quote: source.latest.body,
            start: 0,
          },
          "workspace",
        )
      ).isError,
    ).toBe(false);
    turn.status = "cancelled";
    store.conversations.save(turn);
    let captured = "";
    const fake = new FakeModelProvider([
      { text: "Synthetic response without content reads." },
    ]);
    const chat = new WorkspaceChat(store, () => ({
      ...fake,
      id: fake.id,
      kind: fake.kind,
      capabilities: fake.capabilities,
      async *run(req) {
        captured = req.system;
        expect(workspaceCodexPrompt(req)).toContain(
          "mcp__counsel tools directly",
        );
        yield* fake.run(req);
      },
    }));
    const sent = chat.start(conversation.id, {
      clientId: crypto.randomUUID(),
      message: "And now?",
    });
    await chat.idle();
    expect(captured).toContain(source.latest.id);
    expect(captured).not.toContain(source.latest.body!);
    const state = store.conversations.turn(sent.id).state;
    expect(state.context).toEqual([]);
    expect(state.discoveryContext?.pages[0]?.records[0]?.id).toBe(
      source.latest.id,
    );
    const path = store.databasePath;
    store.close();
    store = new WorkspaceStore({ databasePath: path });
    expect(store.conversations.turn(sent.id).state.discoveryContext).toEqual(
      state.discoveryContext,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
