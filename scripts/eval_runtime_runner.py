"""Run one Counsel OS eval fixture against the runtime CLI (`bun runtime/src/cli.ts step`).

Unlike the `claude` runner in `run_evals.py` (a full `claude -p` plugin run over
many turns), this drives the minimal runtime loop directly for a single step —
one prompt, one typed-schema answer. Because the runtime CLI takes `--provider`,
this is model-agnostic: point it at `ollama/gemma4:e4b` (free, local),
`claude-sub/<model>` (subscription credit), or `codex-sub/<model>`.

The CLI prints one JSON line per StepEvent to stdout; the final line is always
a terminal event — `{"type": "done", "output": <parsed object>, ...}` or
`{"type": "error", "message": ...}` — and the process exits 0 or 1 to match.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any


def parse_step_lines(lines: list[str]) -> tuple[bool, Any]:
    """Parse the JSON-lines output of `bun runtime/src/cli.ts step`.

    Each line is one StepEvent; non-JSON lines are skipped. The last terminal
    event wins: a `done` yields `(True, output)`, an `error` yields `(False,
    message)`. No terminal event at all is `(False, 'no terminal event')`.
    """
    result: tuple[bool, Any] | None = None
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        event_type = event.get("type")
        if event_type == "done":
            result = (True, event.get("output"))
        elif event_type == "error":
            result = (False, event.get("message", "error"))
    if result is None:
        return False, "no terminal event"
    return result


def build_command(
    fixture: dict[str, Any],
    repo_root: Path,
    vault: Path,
    provider: str,
    timeout_s: int,
) -> list[str]:
    """The `bun runtime/src/cli.ts step` invocation for one fixture.

    Pure — no I/O, no subprocess — so it can be asserted on directly and is
    reused by both `run_fixture` and `run_evals.py --dry-run`.
    """
    schema = repo_root / "evals" / "findings.schema.json"
    return [
        "bun", "runtime/src/cli.ts", "step",
        "--vault", str(vault),
        "--provider", provider,
        "--schema", str(schema),
        "--step-timeout", str(int(timeout_s * 1000)),
        fixture["task"],
    ]


def run_fixture(
    fixture: dict[str, Any],
    repo_root: Path,
    vault: Path,
    out_path: Path,
    provider: str,
    timeout_s: int,
) -> tuple[bool, str]:
    """Run the fixture's task against the runtime CLI and write its `done.output`
    to `out_path`. `vault` must already be a prepared (temp, rewritten) fixture
    vault — see `run_evals.prepare_fixture_vault`."""
    cmd = build_command(fixture, repo_root, vault, provider, timeout_s)

    env = dict(os.environ)
    env["COUNSEL_OS_LEGAL_ROOT"] = str(vault)
    # A fresh COUNSEL_OS_HOME so this run never touches the real ~/.counsel-os
    # (its runtime.json, cached threads, provider registry overrides, etc).
    home = Path(tempfile.mkdtemp(prefix="counsel-eval-home-"))
    env["COUNSEL_OS_HOME"] = str(home)

    try:
        try:
            proc = subprocess.run(
                cmd, cwd=repo_root, env=env, capture_output=True, text=True, timeout=timeout_s + 30,
            )
        except subprocess.TimeoutExpired:
            return False, f"runtime step timed out ({timeout_s}s + grace)"

        ok, result = parse_step_lines(proc.stdout.splitlines())
        if not ok:
            tail = (proc.stdout or "")[-500:] + (proc.stderr or "")[-300:]
            return False, f"{result}. Tail: {tail}"

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
            f.write("\n")
        return True, f"output written ({out_path.stat().st_size} bytes)"
    finally:
        shutil.rmtree(home, ignore_errors=True)
