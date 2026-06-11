#!/usr/bin/env bash
# Counsel OS release helper.
#
# Bumps the version in all four manifests (VERSION, package.json,
# .claude-plugin/plugin.json, .claude-plugin/marketplace.json), prepends a
# CHANGELOG.md entry from the -m/-b message (skipped if the developer already
# wrote a heading for that version), verifies the manifests agree, runs the
# knowledge lint, commits the working tree, and pushes.
#
# Usage:
#   scripts/release.sh <new-version> -m "subject" [-b "body"] [--no-tag] [--no-push]
#
# Notes:
#   - Commits ALL working-tree changes (the feature + the bump), matching the
#     repo's convention of one commit per version.
#   - Tags vX.Y.Z by default and pushes the tag — release-binaries.yml triggers
#     on it. --no-tag skips tagging.
#   - bash-3.2 compatible (stock macOS).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

VERSION_NEW="${1:-}"
if [ -z "$VERSION_NEW" ]; then
  echo "Usage: scripts/release.sh <new-version> -m \"subject\" [-b \"body\"] [--tag] [--no-push]" >&2
  exit 1
fi
shift

SUBJECT=""
BODY=""
DO_TAG=1
DO_PUSH=1
while [ $# -gt 0 ]; do
  case "$1" in
    -m) SUBJECT="${2:-}"; shift 2 ;;
    -b) BODY="${2:-}"; shift 2 ;;
    --tag) DO_TAG=1; shift ;;
    --no-tag) DO_TAG=0; shift ;;
    --no-push) DO_PUSH=0; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done
if [ -z "$SUBJECT" ]; then
  echo "A commit subject is required (-m \"subject\")." >&2
  exit 1
fi

echo "$VERSION_NEW" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "Version must be X.Y.Z" >&2; exit 1; }

CUR="$(tr -d '[:space:]' < VERSION)"
if [ "$VERSION_NEW" = "$CUR" ]; then
  echo "Version $VERSION_NEW is already current." >&2
  exit 1
fi

# Bump all four manifests
python3 - "$VERSION_NEW" <<'PY'
import re
import sys
from pathlib import Path

v = sys.argv[1]
Path("VERSION").write_text(v + "\n", encoding="utf-8")
# In each JSON file the first "version" key is the plugin's.
for f in ["package.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]:
    p = Path(f)
    t = p.read_text(encoding="utf-8")
    t2, n = re.subn(r'("version":\s*")[^"]+(")', rf"\g<1>{v}\g<2>", t, count=1)
    if n != 1:
        raise SystemExit(f"could not bump version in {f}")
    p.write_text(t2, encoding="utf-8")
print(f"bumped manifests to {v}")
PY

# Prepend a CHANGELOG.md entry for this release. If the developer already
# wrote a "## [X.Y.Z]" heading, leave the file untouched.
if [ ! -f CHANGELOG.md ]; then
  echo "CHANGELOG.md is missing — every release needs a changelog entry. Restore it before releasing." >&2
  exit 1
fi
python3 - "$VERSION_NEW" "$SUBJECT" "$BODY" <<'PY'
import re
import sys
from datetime import date
from pathlib import Path

v, subject, body = sys.argv[1], sys.argv[2], sys.argv[3]
p = Path("CHANGELOG.md")
text = p.read_text(encoding="utf-8")

if re.search(rf"^## \[{re.escape(v)}\]", text, flags=re.M):
    print(f"CHANGELOG.md already has an entry for {v} — leaving it as-is")
    raise SystemExit(0)

lines = [f"## [{v}] — {date.today():%Y-%m-%d}", "", subject.strip()]
bullets = []
for raw in body.splitlines():
    s = raw.strip()
    if not s:
        continue
    bullets.append(s if s.startswith(("- ", "* ")) else f"- {s}")
if bullets:
    lines.append("")
    lines.extend(bullets)
entry = "\n".join(lines) + "\n\n"

# Insert before the first version heading; append if none exists yet.
m = re.search(r"^## \[", text, flags=re.M)
if m:
    text = text[: m.start()] + entry + text[m.start():]
else:
    text = text.rstrip("\n") + "\n\n" + entry
p.write_text(text, encoding="utf-8")
print(f"prepended CHANGELOG.md entry for {v}")
PY

# Verify sync + content conventions before committing
python3 scripts/lint_knowledge.py --check-versions

git fetch origin >/dev/null 2>&1 || true
BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
if [ "$BEHIND" != "0" ]; then
  echo "Local branch is behind origin/main by $BEHIND commit(s) — integrate first (git pull --rebase)." >&2
  exit 1
fi

# Eval freshness: warn (never fail) when evals/outputs/ is missing or stale —
# releases should ship with reasonably fresh eval evidence. mtimes are read in
# python3 because stat -f (BSD) vs stat -c (GNU) is not portable.
# SKIP_EVAL_FRESHNESS=1 silences the check.
if [ "${SKIP_EVAL_FRESHNESS:-0}" != "1" ]; then
  python3 - <<'PY'
import time
from pathlib import Path

outputs = list(Path("evals/outputs").glob("*.json"))
if outputs:
    age_days = int((time.time() - max(p.stat().st_mtime for p in outputs)) // 86400)
    state = f"{age_days} days old" if age_days > 30 else None
else:
    state = "missing"
if state:
    bar = "!" * 72
    print(bar)
    print(f"WARNING: eval outputs are {state} — consider running")
    print("         scripts/run_evals.py --generate before releasing.")
    print("         (SKIP_EVAL_FRESHNESS=1 silences this check)")
    print(bar)
PY
fi

git add -A
if [ -n "$BODY" ]; then
  git commit -m "v$VERSION_NEW — $SUBJECT" -m "$BODY"
else
  git commit -m "v$VERSION_NEW — $SUBJECT"
fi

if [ "$DO_TAG" -eq 1 ]; then
  # Plain git tag vX.Y.Z — this is what .github/workflows/release-binaries.yml
  # triggers on (tags: v*). `claude plugin tag` creates counsel-os--vX.Y.Z,
  # which does NOT match that trigger, so it is best-effort secondary only.
  git tag -a "v$VERSION_NEW" -m "v$VERSION_NEW — $SUBJECT"
  if command -v claude >/dev/null 2>&1; then
    claude plugin tag . 2>/dev/null || echo "claude plugin tag failed — continuing (git tag created)" >&2
  fi
fi

if [ "$DO_PUSH" -eq 1 ]; then
  git push origin HEAD
  if [ "$DO_TAG" -eq 1 ]; then
    git push origin "v$VERSION_NEW" || true
  fi
fi

echo "Released v$VERSION_NEW"
