import { z } from "zod";

export const ModelId = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9._:-]+$/);
export const ConnectionKind = z.enum([
  "claude-code",
  "codex",
  "anthropic-api",
  "openai-api",
]);
export const ModelChoice = z
  .object({
    kind: ConnectionKind,
    model: ModelId,
    claudeBilling: z.enum(["subscription", "api"]).optional(),
  })
  .strict()
  .refine(
    (v) => v.kind === "claude-code" || v.claudeBilling === undefined,
    "Claude Code billing only applies to Claude Code.",
  );
export type ModelChoice = z.infer<typeof ModelChoice>;

export function sameConnection(a: ModelChoice, b: ModelChoice): boolean {
  return (
    a.kind === b.kind &&
    (a.kind !== "claude-code" ||
      (a.claudeBilling ?? "subscription") ===
        (b.claudeBilling ?? "subscription"))
  );
}
export const ModelPreferenceInput = z
  .object({
    expectedRevisionId: z.string().uuid().nullable(),
    choice: ModelChoice.nullable(),
  })
  .strict();
export const ModelPreference = z
  .object({
    revisionId: z.string().uuid().nullable(),
    choice: ModelChoice.nullable(),
  })
  .strict();
export type ModelPreference = z.infer<typeof ModelPreference>;

export interface ModelCatalog {
  kind: z.infer<typeof ConnectionKind>;
  models: { id: string; label: string }[];
  source: "cli-bundled" | "cli-aliases" | "api" | "unavailable";
  note: string;
}
