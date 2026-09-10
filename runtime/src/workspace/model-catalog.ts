import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateCli } from "../providers/cli-locate";
import { ModelId, type ModelCatalog } from "./model-choice";

/** Read metadata only. Never copy login credentials, run a prompt, or load the user's config. */
export async function bundledCodexModels(): Promise<ModelCatalog["models"]> {
  const cli = locateCli("codex");
  if (!cli) throw new Error("CLI unavailable");
  const directory = mkdtempSync(join(tmpdir(), "counsel-model-catalog-"));
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    child = Bun.spawn([cli, "debug", "models", "--bundled"], {
      cwd: directory,
      env: { PATH: "/usr/bin:/bin", HOME: directory, CODEX_HOME: directory },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
    timer = setTimeout(() => child?.kill("SIGKILL"), 8_000);
    const raw = await boundedText(child.stdout as ReadableStream<Uint8Array>);
    if ((await child.exited) !== 0) throw new Error("CLI catalog unavailable");
    return parseBundledCodexModels(JSON.parse(raw));
  } finally {
    if (timer) clearTimeout(timer);
    child?.kill("SIGKILL");
    if (child) await child.exited;
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Bundled visibility is UI metadata, not an account-entitlement check.
 * Astra is publicly documented for `codex -m gpt-6-astra`, but some installed
 * bundles still mark it hidden. Keep this exception exact: do not expose other
 * hidden/internal entries or invent entries absent from the installed bundle.
 * Verified 2026-09-07: https://learn.chatgpt.com/docs/models
 */
export function parseBundledCodexModels(raw: unknown): ModelCatalog["models"] {
  if (!raw || typeof raw !== "object" || !("models" in raw) || !Array.isArray(raw.models))
    throw new Error("Invalid CLI catalog");
  return uniqueModels(raw.models.slice(0, 2_000)
    .filter((item) => item && typeof item === "object" && (
      item.visibility === "list" || (item.visibility === "hide" && item.slug === "gpt-6-astra")
    ))
    .map((item) => ({ id: item.slug, label: item.display_name })));
}

export async function boundedText(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) throw new Error("Empty model catalog");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) throw new Error("Model catalog too large");
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function uniqueModels(
  items: { id?: unknown; label?: unknown }[],
): ModelCatalog["models"] {
  const models = new Map<string, { id: string; label: string }>();
  for (const item of items.slice(0, 2_000)) {
    const parsed = ModelId.safeParse(item.id);
    if (!parsed.success) continue;
    models.set(parsed.data, {
      id: parsed.data,
      label:
        typeof item.label === "string" ? item.label.slice(0, 150) : parsed.data,
    });
  }
  return [...models.values()].slice(0, 300);
}
