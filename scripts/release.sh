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
#   scripts/release.sh <new-version> -m "subject" [-b "body"] [--no-tag] [--no-push] [--offline] [--yes]
#
# Notes:
#   - Refuses to run unless HEAD is the `main` branch — a release commit must
#     never be built on a topic branch, since release-binaries.yml fires on any
#     v* tag and would ship binaries for a commit that is not on main. Set
#     ALLOW_RELEASE_BRANCH=1 to override (you almost never want this).
#   - Commits ALL working-tree changes (the feature + the bump), matching the
#     repo's convention of one commit per version. Untracked files would be
#     swept in by `git add -A`; the script lists them and refuses to include
#     them non-interactively unless --yes is passed.
#   - Requires a successful `git fetch origin` to confirm the release builds on
#     current origin/main. Pass --offline to release from the local base anyway.
#   - Tags vX.Y.Z by default and pushes the tag — release-binaries.yml triggers
#     on it. --no-tag skips tagging. A failed tag push is fatal (not swallowed):
#     without the tag the binaries never build.
#   - bash-3.2 compatible (stock macOS).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

VERSION_NEW="${1:-}"
if [ -z "$VERSION_NEW" ]; then
  echo "Usage: scripts/release.sh <new-version> -m \"subject\" [-b \"body\"] [--no-tag] [--no-push] [--offline] [--yes]" >&2
  exit 1
fi
shift

SUBJECT=""
BODY=""
DO_TAG=1
DO_PUSH=1
DO_OFFLINE=0
ASSUME_YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    -m) SUBJECT="${2:-}"; shift 2 ;;
    -b) BODY="${2:-}"; shift 2 ;;
    --tag) DO_TAG=1; shift ;;
    --no-tag) DO_TAG=0; shift ;;
    --no-push) DO_PUSH=0; shift ;;
    --offline) DO_OFFLINE=1; shift ;;
    -y|--yes) ASSUME_YES=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done
if [ -z "$SUBJECT" ]; then
  echo "A commit subject is required (-m \"subject\")." >&2
  exit 1
fi

# Branch guard: a release commit must be built on main. release-binaries.yml
# fires on any v* tag, so tagging from a topic branch would ship binaries for a
# commit that never landed on main. Check before any manifest mutation so an
# accidental run on the wrong branch exits clean. Detached HEAD fails
# symbolic-ref (no branch name) and is likewise refused.
BRANCH="$(git symbolic-ref --short -q HEAD || echo '(detached HEAD)')"
if [ "$BRANCH" != "main" ] && [ "${ALLOW_RELEASE_BRANCH:-0}" != "1" ]; then
  echo "Refusing to release from '$BRANCH' — releases must be cut from the 'main' branch." >&2
  echo "Merge to main and run from there. (ALLOW_RELEASE_BRANCH=1 overrides — you almost never want this.)" >&2
  exit 1
fi

echo "$VERSION_NEW" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "Version must be X.Y.Z" >&2; exit 1; }

CUR="$(tr -d '[:space:]' < VERSION)"
if [ "$VERSION_NEW" = "$CUR" ]; then
  # Resume tolerance: an aborted run (e.g. the behind-origin guard fired after
  # the manifest bump) leaves VERSION already at the target with the release
  # commit not yet made. If the bump is uncommitted, continue; only refuse
  # when this version was actually committed already.
  if git diff --quiet HEAD -- VERSION; then
    echo "Version $VERSION_NEW is already current and committed." >&2
    exit 1
  fi
  echo "Version $VERSION_NEW already staged in the working tree — resuming the aborted release." >&2
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

# Confirm the release builds on current origin/main. A silently-swallowed fetch
# would let a release be cut on a stale base; require it to succeed unless the
# maintainer explicitly opts out with --offline.
if git fetch origin >/dev/null 2>&1; then
  :
elif [ "$DO_OFFLINE" -eq 1 ]; then
  echo "git fetch origin failed but --offline was passed — skipping the base-freshness check." >&2
else
  echo "git fetch origin failed — cannot verify this release builds on current origin/main." >&2
  echo "Fix connectivity, or pass --offline to release from the local base anyway." >&2
  exit 1
fi
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

# `git add -A` sweeps EVERYTHING, including stray untracked files (e.g. a local
# drafts/ dir), into the public release commit. Show what will be committed and
# refuse to include untracked files non-interactively unless --yes is given.
echo "Changes to be committed in the release:"
git status --short
UNTRACKED="$(git ls-files --others --exclude-standard)"
if [ -n "$UNTRACKED" ] && [ "$ASSUME_YES" -eq 0 ]; then
  echo "" >&2
  echo "WARNING: 'git add -A' will sweep these UNTRACKED files into the public release commit:" >&2
  echo "$UNTRACKED" | sed 's/^/    /' >&2
  if [ -t 0 ]; then
    printf "Include them in the release commit? [y/N] " >&2
    read -r reply
    case "$reply" in
      [Yy]*) ;;
      *) echo "Aborted — remove or stash the untracked files, then re-run." >&2; exit 1 ;;
    esac
  else
    echo "Refusing to sweep untracked files non-interactively. Remove/stash them, or pass --yes." >&2
    exit 1
  fi
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
    # A failed tag push is fatal: the commit is pushed but without the vX.Y.Z
    # tag release-binaries.yml never fires, so the binaries silently never
    # build. Do not swallow it — surface it loudly with the retry command.
    if ! git push origin "v$VERSION_NEW"; then
      echo "" >&2
      echo "!!! TAG PUSH FAILED — 'v$VERSION_NEW' did not reach origin." >&2
      echo "    The release commit IS pushed, but release-binaries.yml will NOT build the binaries." >&2
      echo "    Retry the tag push manually:" >&2
      echo "        git push origin v$VERSION_NEW" >&2
      exit 1
    fi
  fi
fi

echo "Released v$VERSION_NEW"
