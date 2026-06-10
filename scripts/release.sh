#!/usr/bin/env bash
# Counsel OS release helper.
#
# Bumps the version in all four manifests (VERSION, package.json,
# .claude-plugin/plugin.json, .claude-plugin/marketplace.json), verifies they
# agree, runs the knowledge lint, commits the working tree, and pushes.
#
# Usage:
#   scripts/release.sh <new-version> -m "subject" [-b "body"] [--tag] [--no-push]
#
# Notes:
#   - Commits ALL working-tree changes (the feature + the bump), matching the
#     repo's convention of one commit per version.
#   - --tag runs `claude plugin tag` (creates counsel-os--vX.Y.Z) if available.
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
DO_TAG=0
DO_PUSH=1
while [ $# -gt 0 ]; do
  case "$1" in
    -m) SUBJECT="${2:-}"; shift 2 ;;
    -b) BODY="${2:-}"; shift 2 ;;
    --tag) DO_TAG=1; shift ;;
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

# Verify sync + content conventions before committing
python3 scripts/lint_knowledge.py --check-versions

git fetch origin >/dev/null 2>&1 || true
BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
if [ "$BEHIND" != "0" ]; then
  echo "Local branch is behind origin/main by $BEHIND commit(s) — integrate first (git pull --rebase)." >&2
  exit 1
fi

git add -A
if [ -n "$BODY" ]; then
  git commit -m "v$VERSION_NEW — $SUBJECT" -m "$BODY"
else
  git commit -m "v$VERSION_NEW — $SUBJECT"
fi

if [ "$DO_TAG" -eq 1 ]; then
  if command -v claude >/dev/null 2>&1; then
    claude plugin tag . || echo "claude plugin tag failed — continuing without tag" >&2
  else
    echo "claude CLI not found — skipping tag" >&2
  fi
fi

if [ "$DO_PUSH" -eq 1 ]; then
  git push origin HEAD
  if [ "$DO_TAG" -eq 1 ]; then
    git push origin --tags || true
  fi
fi

echo "Released v$VERSION_NEW"
