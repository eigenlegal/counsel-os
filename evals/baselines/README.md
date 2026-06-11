# Eval Baselines

Per-model score snapshots, written by `scripts/run_evals.py --save-baseline <model-id>`
and consumed by `--compare-baseline <model-id>`. One file per model; slashes and
colons in the model id become dashes in the filename
(`anthropic/claude-opus-4:beta` → `anthropic-claude-opus-4-beta.json`).

```json
{
  "model": "claude-opus-4-8",
  "date": "2026-06-11",
  "scores": { "<fixture-id>": 0.9525, "...": 1.0 },
  "mean": 0.9881
}
```

- `--save-baseline` refuses to write a partial baseline — every fixture must have
  a scored output first. `--date YYYY-MM-DD` overrides the recorded date.
- `--compare-baseline` prints a per-fixture delta table (to stderr; stdout stays
  JSON) and exits 1 when any fixture drops by more than 0.1 vs the baseline,
  falls below its pass threshold (optional fixture `pass_threshold`, default
  0.80), or has a baseline score but no current output.

Baselines are committed (unlike `evals/outputs/`, which is gitignored) so model
comparisons survive across machines and CI can gate on them.
