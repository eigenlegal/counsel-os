/** Real installed CLI, local fake Responses endpoint, no authentication or vendor model call. */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { locateCli } from "../runtime/src/providers/cli-locate";
import { workspaceCodexConfig } from "../runtime/src/workspace/codex";
import { openToolBridge } from "../runtime/src/workspace/tool-bridge";
import { chatTools, TOOL_LABELS } from "../runtime/src/workspace/chat-tools";
import { WorkspaceStore } from "../runtime/src/workspace/store";

const root = mkdtempSync(join(tmpdir(), "counsel-codex-preflight-"));
const toolFree = process.argv.includes('--no-tools');
const cliArgument = process.argv.slice(2).find(argument => argument !== '--no-tools');
const cli = cliArgument ? resolve(cliArgument) : locateCli("codex");
let captured: unknown;
let catalog: unknown;
let requests = 0;
let executions = 0;
let canaryRequests = 0;
const canaryText = `not-in-model-context-${crypto.randomUUID()}`;
const canaryPath = join(root, 'private-canary.txt');
const forbiddenOutput = join(root, 'forbidden-output.txt');
await Bun.write(canaryPath, canaryText);
const canaryServer = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => {
  canaryRequests++;
  return new Response(canaryText);
} });
// Deliberately fabricated model calls, even for tools absent from the catalog.
// All potential side effects target our temporary fixture, never user files.
const probes = [
  { type: 'custom_tool_call', name: 'exec', namespace: 'functions', input: 'text(ALL_TOOLS.map(t => t.name));' },
  { type: 'custom_tool_call', name: 'exec', namespace: 'functions', input: `text(await tools.exec_command({cmd: ${JSON.stringify(`cat ${JSON.stringify(canaryPath)}`)}}));` },
  { type: 'function_call', name: 'exec_command', namespace: 'functions', arguments: JSON.stringify({ cmd: `cat ${JSON.stringify(canaryPath)}` }) },
  { type: 'function_call', name: 'shell', namespace: 'functions', arguments: JSON.stringify({ command: ['cat', canaryPath] }) },
  { type: 'custom_tool_call', name: 'apply_patch', namespace: 'functions', input: `*** Begin Patch\n*** Add File: ${forbiddenOutput}\n+forbidden\n*** End Patch` },
  { type: 'function_call', name: 'view_image', namespace: 'functions', arguments: JSON.stringify({ path: canaryPath }) },
  { type: 'function_call', name: 'spawn_agent', namespace: 'functions', arguments: JSON.stringify({ message: `Read ${canaryPath}` }) },
  { type: 'function_call', name: 'js', namespace: 'mcp__node_repl', arguments: JSON.stringify({ code: `console.log(await (await fetch(${JSON.stringify(canaryServer.url.origin)})).text())` }) },
  { type: 'function_call', name: 'run', namespace: 'web', arguments: JSON.stringify({ open: [{ ref_id: canaryServer.url.origin }] }) },
];
const probeResults = new Map<string, unknown>();
let child: Bun.Subprocess | undefined;
const abort = new AbortController();
const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
const conversation = store.conversations.create({});
const turn = store.conversations.begin(conversation.id, {
  clientId: crypto.randomUUID(), message: 'Synthetic transport preflight.',
}, 'fixture/preflight').turn;
const production = chatTools({ store, conversation, turn, attachments: [], signal: abort.signal, save: () => {} });
const bridge = openToolBridge(
  production.tools.map((tool) => ({
    ...tool,
    execute: async () => {
      executions++;
      return { synthetic: true };
    },
  })),
  abort.signal,
);
const handshakes: unknown[] = [];
const proxy = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = await request.text();
    const parsed = body ? JSON.parse(body) : {};
    const response = await fetch(bridge.url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${bridge.token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      ...(body ? { body } : {}),
    });
    const result = await response.text();
    handshakes.push({
      method: parsed.method ?? request.method,
      status: response.status,
      result: result.slice(0, 300),
    });
    return new Response(result, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  },
});
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/v1/responses"
    ) {
      const received = await request.json();
      requests++;
      for (const item of received.input ?? []) {
        if (typeof item.call_id === 'string' && item.call_id.startsWith('preflight-probe-') &&
            (item.type === 'custom_tool_call_output' || item.type === 'function_call_output')) {
          probeResults.set(item.call_id, item.output);
        }
      }
      if (requests === 2) catalog = received.input?.filter((item: { type: string }) => item.type.endsWith("tool_call_output"));
      if (requests <= (toolFree ? 1 : 2)) {
        if (!captured) captured = received;
        const items = requests === 1
            ? probes.map((probe, index) => ({ ...probe, id: `preflight-item-${index}`, call_id: `preflight-probe-${index + 1}` }))
            : [{
                type: "function_call",
                id: "preflight-mcp",
                call_id: "preflight-mcp-call",
                name: "counsel_search_records",
                namespace: "mcp__counsel",
                arguments: JSON.stringify({ query: 'synthetic' }),
              }];
        const events = [
          {
            type: "response.created",
            response: {
              id: "preflight-response",
              status: "in_progress",
              output: [],
            },
          },
          ...items.flatMap((item, output_index) => [
            { type: "response.output_item.added", output_index, item },
            { type: "response.output_item.done", output_index, item },
          ]),
          {
            type: "response.completed",
            response: {
              id: "preflight-response",
              status: "completed",
              output: items,
              usage: { input_tokens: 0, output_tokens: 0 },
            },
          },
        ];
        return new Response(
          events
            .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
            .join(""),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }
      // No inference service exists here. Refuse immediately after seeing the tool catalog.
      setTimeout(() => child?.kill("SIGTERM"), 50);
      return Response.json(
        { error: { message: "Synthetic preflight completed; no inference." } },
        { status: 400 },
      );
    }
    return Response.json({ data: [] });
  },
});
try {
  if (!cli) throw new Error("Codex CLI unavailable.");
  const base = workspaceCodexConfig(bridge.url, cli, !toolFree).config;
  const config = {
    ...base,
    mcp_servers: toolFree ? {} : {
      counsel: {
        url: `${proxy.url.origin}/mcp`,
        bearer_token_env_var: "COUNSEL_TURN_TOKEN",
        enabled: true,
        required: true,
        default_tools_approval_mode: "approve",
      },
    },
    // Test-only transport, with no credential file and no inherited keys.
    forced_login_method: "api",
    model_provider: "local_preflight",
    model_providers: {
      local_preflight: {
        name: "Local preflight",
        base_url: `http://127.0.0.1:${server.port}/v1`,
        wire_api: "responses",
        requires_openai_auth: false,
      },
    },
    web_search: "disabled",
  };
  const args: string[] = [];
  function flatten(value: unknown, path: string) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, item] of Object.entries(value))
        flatten(item, path ? `${path}.${key}` : key);
    } else args.push("-c", `${path}=${JSON.stringify(value)}`);
  }
  flatten(config, "");
  const listed = Bun.spawn([cli, ...args, "mcp", "list", "--json"], {
    cwd: root,
    env: {
      HOME: root,
      CODEX_HOME: root,
      PATH: process.env.PATH ?? "",
      COUNSEL_TURN_TOKEN: bridge.token,
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "ignore",
  });
  console.log(
    "Configured MCP:",
    (await new Response(listed.stdout).text()).replaceAll(
      bridge.token,
      "[redacted]",
    ),
  );
  await listed.exited;
  child = Bun.spawn(
    [
      cli,
      ...args,
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "--model",
      "gpt-5.6-sol",
      "--json",
      "Synthetic transport preflight.",
    ],
    {
      cwd: root,
      env: {
        HOME: root,
        CODEX_HOME: root,
        PATH: process.env.PATH ?? "",
        COUNSEL_TURN_TOKEN: bridge.token,
      },
      stdin: "ignore",
      stdout: "ignore",
      stderr: "pipe",
    },
  );
  const timer = setTimeout(() => child?.kill("SIGKILL"), 15_000);
  const diagnostics = await new Response(child.stderr).text();
  await child.exited;
  clearTimeout(timer);
  if (!captured)
    throw new Error(`No request captured. ${diagnostics.slice(0, 1500)}`);
  const request = captured as {
    tools?: Array<Record<string, unknown>>;
    model?: string;
    input?: Array<Record<string, unknown>>;
    client_metadata?: unknown;
  };
  const definitions = [
    ...(request.tools ?? []),
    ...(request.input
      ?.filter((item) => item.type === "additional_tools")
      .flatMap((item) => item.tools as Array<Record<string, unknown>>) ?? []),
  ];
  function names(items: Array<Record<string, unknown>>, prefix = ""): string[] {
    return items.flatMap((item) =>
      item.type === "namespace"
        ? names(
            item.tools as Array<Record<string, unknown>>,
            `${prefix}${item.name}.`,
          )
        : [`${prefix}${item.name}`],
    );
  }
  const actual = names(definitions).sort();
  console.log(
    JSON.stringify(
      {
        mode: "local-fake-transport",
        toolFree,
        vendorModelCalls: 0,
        model: request.model,
        requestKeys: Object.keys(request),
        tools: actual,
        handshakes,
        catalog,
        syntheticToolExecutions: executions,
        deniedProbes: [...probeResults.entries()].map(([callId, result]) => ({ callId, result })),
        canaryRequests,
        canaryUnchanged: readFileSync(canaryPath, 'utf8') === canaryText,
        forbiddenOutputAbsent: !existsSync(forbiddenOutput),
        diagnostics: diagnostics
          .replaceAll(bridge.token, "[redacted]")
          .slice(0, 3000),
      },
      null,
      2,
    ),
  );
  const expected = [
    ...(toolFree ? [] : Object.keys(TOOL_LABELS).map((name) => `mcp__counsel.${name}`)),
    "functions.exec",
    "functions.wait",
    "functions.request_user_input",
  ].sort();
  if (
    JSON.stringify(actual) !== JSON.stringify(expected) ||
    executions !== (toolFree ? 0 : 1) ||
    (toolFree && handshakes.length !== 0) ||
    !JSON.stringify(catalog).includes("code-mode host is disabled") ||
    probeResults.size !== probes.length ||
    [...probeResults.values()].some((result) => !/(disabled|unsupported|unknown|not found|not available|unrecognized|blocked by read-only sandbox)/i.test(JSON.stringify(result))) ||
    JSON.stringify([...probeResults.values()]).includes(canaryText) ||
    readFileSync(canaryPath, 'utf8') !== canaryText ||
    existsSync(forbiddenOutput) || canaryRequests !== 0
  )
    throw new Error(
      "Tool surface, disabled host, or direct Counsel tool execution did not pass.",
    );
} finally {
  if (child?.exitCode === null) {
    child.kill("SIGKILL");
    await child.exited;
  }
  server.stop(true);
  canaryServer.stop(true);
  proxy.stop(true);
  abort.abort();
  bridge.close();
  store.close();
  rmSync(root, { recursive: true, force: true });
}
