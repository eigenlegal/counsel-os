#!/usr/bin/env python3
"""Unit tests for scripts/eval_runtime_runner.py. Plain unittest, no live model
calls, no subprocess of `bun runtime/src/cli.ts` — canned StepEvent transcripts
only.

Run: python3 scripts/eval_runtime_runner_test.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_runtime_runner import build_command, parse_step_lines  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]


class ParseStepLinesTest(unittest.TestCase):
    def test_text_then_tool_call_then_done_yields_output(self) -> None:
        lines = [
            json.dumps({"type": "text", "text": "thinking..."}),
            json.dumps({"type": "tool_call", "id": "t1", "name": "read_file", "input": {}}),
            json.dumps({"type": "tool_result", "id": "t1", "name": "read_file", "output": "..."}),
            json.dumps({
                "type": "done",
                "output": {"findings": [], "citations": []},
                "usage": {"inputTokens": 10, "outputTokens": 5},
            }),
        ]

        ok, result = parse_step_lines(lines)

        self.assertTrue(ok)
        self.assertEqual(result, {"findings": [], "citations": []})

    def test_transcript_ending_in_error_is_failure(self) -> None:
        lines = [
            json.dumps({"type": "text", "text": "..."}),
            json.dumps({"type": "error", "message": "model exploded"}),
        ]

        ok, result = parse_step_lines(lines)

        self.assertFalse(ok)
        self.assertEqual(result, "model exploded")

    def test_no_terminal_event_is_failure(self) -> None:
        lines = [json.dumps({"type": "text", "text": "still going"})]

        ok, result = parse_step_lines(lines)

        self.assertFalse(ok)
        self.assertEqual(result, "no terminal event")

    def test_empty_transcript_is_failure(self) -> None:
        ok, result = parse_step_lines([])

        self.assertFalse(ok)
        self.assertEqual(result, "no terminal event")

    def test_non_json_lines_are_skipped(self) -> None:
        lines = [
            "not json at all",
            "",
            json.dumps({"type": "done", "output": {"findings": [], "citations": []}, "usage": {}}),
            "   ",
        ]

        ok, result = parse_step_lines(lines)

        self.assertTrue(ok)
        self.assertEqual(result, {"findings": [], "citations": []})

    def test_last_done_wins(self) -> None:
        lines = [
            json.dumps({"type": "done", "output": {"findings": ["first"], "citations": []}, "usage": {}}),
            json.dumps({"type": "done", "output": {"findings": ["second"], "citations": []}, "usage": {}}),
        ]

        ok, result = parse_step_lines(lines)

        self.assertTrue(ok)
        self.assertEqual(result, {"findings": ["second"], "citations": []})

    def test_error_after_done_is_the_final_word(self) -> None:
        lines = [
            json.dumps({"type": "done", "output": {"findings": [], "citations": []}, "usage": {}}),
            json.dumps({"type": "error", "message": "later failure"}),
        ]

        ok, result = parse_step_lines(lines)

        self.assertFalse(ok)
        self.assertEqual(result, "later failure")


class BuildCommandTest(unittest.TestCase):
    def test_includes_schema_provider_vault_and_task(self) -> None:
        fixture = {"id": "demo", "task": "classify this clause"}
        vault = Path("/tmp/some-vault")

        cmd = build_command(fixture, REPO_ROOT, vault, "ollama/gemma4:e4b", 540)

        self.assertEqual(cmd[0:3], ["bun", "runtime/src/cli.ts", "step"])
        self.assertIn("--schema", cmd)
        schema_arg = cmd[cmd.index("--schema") + 1]
        self.assertTrue(schema_arg.endswith("evals/findings.schema.json"))
        self.assertIn("--provider", cmd)
        self.assertEqual(cmd[cmd.index("--provider") + 1], "ollama/gemma4:e4b")
        self.assertIn("--vault", cmd)
        self.assertEqual(cmd[cmd.index("--vault") + 1], str(vault))
        self.assertIn("classify this clause", cmd)

    def test_step_timeout_converted_to_milliseconds(self) -> None:
        fixture = {"id": "demo", "task": "do the thing"}
        cmd = build_command(fixture, REPO_ROOT, Path("/tmp/v"), "ollama/gemma4:e4b", 60)

        self.assertIn("--step-timeout", cmd)
        self.assertEqual(cmd[cmd.index("--step-timeout") + 1], "60000")


class DryRunTest(unittest.TestCase):
    def test_dry_run_prints_the_runtime_command_without_running_it(self) -> None:
        result = subprocess.run(
            [
                sys.executable, str(REPO_ROOT / "scripts" / "run_evals.py"),
                "--generate", "--runner", "runtime", "--dry-run",
                "--only", "green-yellow-red-calibration",
            ],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=30,
        )

        self.assertEqual(result.returncode, 0, msg=f"stdout={result.stdout!r} stderr={result.stderr!r}")
        self.assertIn("bun runtime/src/cli.ts step", result.stdout)


if __name__ == "__main__":
    unittest.main()
