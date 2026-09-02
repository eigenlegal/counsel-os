# Eval Baselines

Per-model score snapshots from the retired Python scorer (`scripts/run_evals.py
--save-baseline`, gone as of routing-and-evals step 2). One file per model;
slashes and colons in the model id became dashes in the filename.

```json
{
  "model": "claude-fable-5",
  "date": "2026-08-29",
  "scores": { "<fixture-id>": 1.0, "...": 1.0 },
  "mean": 1.0
}
```

`claude-fable-5.json` is kept as the **parity anchor**: the TypeScript findings
scorer (`runtime/src/evals/scorers/findings.ts`) must reproduce these numbers
on `evals/sample-outputs/` exactly, and `runtime/src/evals/runner.test.ts`
checks that on every push. Do not edit it.

Going forward, per-model scores are not snapshotted here. Every run appends one
line per fixture to `<vault>/.counsel/evals/results.jsonl` (spec §5), and the
scoreboard (step 3) reads those lines — three result sets (shipped fixtures,
practice fixtures, outcomes), never averaged together.
