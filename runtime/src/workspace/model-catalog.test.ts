import { expect, test } from "bun:test";
import { parseBundledCodexModels } from "./model-catalog";

test("documented Astra remains selectable when bundled as hidden, without exposing other hidden models", () => {
  expect(parseBundledCodexModels({ models: [
    { slug: "gpt-6-astra", display_name: "GPT-6-Astra", visibility: "hide" },
    { slug: "gpt-5.6-sol", display_name: "GPT-5.6-Sol", visibility: "list" },
    { slug: "internal-synthetic", visibility: "hide" },
    { slug: "gpt-6-astra-internal", visibility: "hide" },
    { slug: "unlisted-synthetic" },
  ] })).toEqual([
    { id: "gpt-6-astra", label: "GPT-6-Astra" },
    { id: "gpt-5.6-sol", label: "GPT-5.6-Sol" },
  ]);
});

test("catalog parser validates shape and IDs, deduplicates Astra, and never invents absent models", () => {
  for (const raw of [null, "models", [], {}, { models: {} }])
    expect(() => parseBundledCodexModels(raw)).toThrow("Invalid CLI catalog");
  expect(parseBundledCodexModels({ models: [] })).toEqual([]);
  expect(parseBundledCodexModels({ models: [
    null, 4, "invalid", { visibility: "list" },
    { slug: "--config=unsafe", visibility: "list" },
    { slug: "gpt-6-astra", visibility: "hide" },
    { slug: "gpt-6-astra", display_name: "Astra", visibility: "list" },
  ] })).toEqual([{ id: "gpt-6-astra", label: "Astra" }]);
});

test("catalog bounds apply before filtering and labels and output remain bounded", () => {
  const entries = Array.from({ length: 2_000 }, (_, i) => ({ slug: `test-${i}`, display_name: "x".repeat(180), visibility: "list" }));
  const result = parseBundledCodexModels({ models: entries });
  expect(result).toHaveLength(300);
  expect(result.every(model => model.label.length === 150)).toBe(true);
  expect(parseBundledCodexModels({ models: [
    ...entries.map(item => ({ ...item, visibility: "hide" })),
    { slug: "gpt-6-astra", visibility: "hide" },
  ] })).toEqual([]);
});
