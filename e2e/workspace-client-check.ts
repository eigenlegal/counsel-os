/** One consent-gated synthetic client-union check. No user workspace input. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceStore } from "../runtime/src/workspace/store";
import { WorkspaceChat } from "../runtime/src/workspace/chat";
import { WorkspaceCodexProvider } from "../runtime/src/workspace/codex";
import { qualificationOptions } from "../runtime/src/workspace/qualification";
const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== "live" || options.provider !== "codex")
  console.log(
    "One synthetic client-wide question, no user data. No calls made. Use --live --allow-plan-usage --provider codex --model MODEL.",
  );
else {
  const root = mkdtempSync(join(tmpdir(), "counsel-client-qualification-"));
  const store = new WorkspaceStore({
    databasePath: join(root, "workspace.sqlite3"),
  });
  const vendor = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({
    id: vendor.id,
    kind: vendor.kind,
    capabilities: vendor.capabilities,
    run: (req) =>
      vendor.run({
        ...req,
        signal: AbortSignal.any([req.signal!, AbortSignal.timeout(120_000)]),
      }),
  }));
  const stop = () => chat.stop();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const client = store.clients.create({
      id: crypto.randomUUID(),
      name: "Synthetic Aster Studio",
    });
    const matterIds: string[] = [],
      revisionIds: string[] = [];
    for (const [title, body] of [
      [
        "Vendor agreement",
        "The vendor agreement is signed. Next step: obtain the final countersigned copy. No delivery date is recorded.",
      ],
      [
        "Workplace policy",
        "The workplace policy is still a draft. Next step: obtain the HR lead’s response on the unresolved rollout plan. No rollout date is recorded.",
      ],
      [
        "Unselected matter",
        "UNSELECTED-CLIENT-CANARY: Do not include this matter.",
      ],
    ]) {
      const m = store.createMatter({ title: title! });
      store.clients.assign(m.id, {
        clientId: client.id,
        expectedRevisionId: null,
      });
      const s = store.createSource({
        kind: "reference",
        matterIds: [m.id],
        revision: {
          title: `${title} — status note`,
          body: body!,
          provenance: { origin: "fixture:client-status" },
        },
      });
      matterIds.push(m.id);
      revisionIds.push(s.latest.id);
    }
    const outside = store.createMatter({ title: "OUTSIDE-CLIENT-CANARY" });
    store.createSource({
      kind: "reference",
      matterIds: [outside.id],
      revision: {
        title: "OUTSIDE-CLIENT-CANARY",
        body: "Not permitted in the selected client context.",
        provenance: { origin: "fixture:outside" },
      },
    });
    const conversation = store.conversations.create({
      scope: "client",
      clientId: client.id,
      matterIds: matterIds.slice(0, 2),
    });
    console.log(`Synthetic workspace retained: ${store.databasePath}`);
    const sent = chat.start(conversation.id, {
      clientId: crypto.randomUUID(),
      message:
        "Give me a concise status update across these matters, with the next step for each.",
    });
    await chat.idle();
    const turn = store.conversations.turn(sent.id);
    const checks = {
      complete: turn.status === "complete",
      selectedMattersOnly:
        turn.state.scopeContext?.clientContext?.matters.length === 2,
      readBoth: revisionIds
        .slice(0, 2)
        .every((id) =>
          turn.state.context.some((r) => r.id === id && r.ranges.length > 0),
        ),
      citedBoth: revisionIds
        .slice(0, 2)
        .every((id) =>
          turn.state.citations.some(
            (c) => c.target.kind === "source" && c.target.revisionId === id,
          ),
        ),
      noOutsideLeak: !JSON.stringify(turn.state).match(
        /UNSELECTED-CLIENT-CANARY|OUTSIDE-CLIENT-CANARY/,
      ),
      noScopeWrites:
        store.clients.matters(client.id).length === 3 &&
        store.conversations.get(conversation.id).clientContext?.matters
          .length === 2,
    };
    const passed = Object.values(checks).every(Boolean);
    console.log(
      JSON.stringify(
        {
          passed,
          checks,
          answer: turn.state.answer,
          error: turn.state.error,
          activity: turn.state.activity.map((a) => ({
            name: a.name,
            status: a.status,
          })),
          manualReview:
            "Vendor signed/countersigned copy outstanding; workplace policy draft/HR response outstanding; no invented dates. Integration check, not broad legal quality qualification.",
        },
        null,
        2,
      ),
    );
    if (!passed) process.exitCode = 1;
  } finally {
    chat.stop();
    await chat.idle();
    store.close();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
