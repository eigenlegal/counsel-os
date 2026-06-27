#!/bin/bash
set -uo pipefail

# Clean-machine probe for the install QA runbook (docs/install-qa-runbook.md, cou-4).
#
# READ-ONLY. Installs nothing, writes nothing, deletes nothing. Reports:
#   1. Host (OS / arch / macOS version)
#   2. Toolchain presence (claude, bun, node, pandoc, python3, python-docx, curl,
#      git, qmd, Microsoft Word, Playwright Chromium cache)
#   3. Pre-existing Counsel OS artifacts that would mask a real clean-machine pass
#
# Run it BEFORE the pass to confirm the machine is virgin (exit 1 if it is not),
# and AFTER the pass to see what the install supplied (binary, Chromium, cache).
#
# bash-3.2 compatible (stock macOS). No bashisms beyond 3.2.

mark() { printf '  %-26s %s\n' "$1" "$2"; }
have() { command -v "$1" >/dev/null 2>&1; }

ART_FOUND=0
note_artifact() { ART_FOUND=$((ART_FOUND + 1)); }

echo "Counsel OS — clean-machine probe (read-only)"
echo "============================================"

# --- 1. Host -----------------------------------------------------------------
echo
echo "Host"
mark "os/arch:" "$(uname -s)/$(uname -m)"
if [ "$(uname -s)" = "Darwin" ] && have sw_vers; then
  mark "macOS:" "$(sw_vers -productVersion 2>/dev/null || echo unknown)"
fi

# --- 2. Toolchain ------------------------------------------------------------
# For a true clean-machine browse test, bun AND playwright-chromium should be
# MISSING so the prebuilt-download path in browse/bin/find-browse is exercised.
echo
echo "Toolchain (optional deps — 'missing' is fine; see notes below)"
for tool in claude bun node pandoc python3 curl git; do
  if have "$tool"; then mark "$tool:" "ok ($(command -v "$tool"))"; else mark "$tool:" "missing"; fi
done

# qmd: optional on-device content index. For the clean-machine qmd-offer test,
# 'missing' is the wanted state — setup's Phase-1 install offer only fires when
# qmd is absent. (Whether qmd is already wired to a vault is decided by the
# 'counsel-os collection' artifact check below, not here.)
if have qmd; then
  mark "qmd:" "PRESENT ($(command -v qmd)) — setup's install-offer path won't run"
else
  mark "qmd:" "missing (good — setup's qmd install-offer path will run)"
fi

if have python3 && python3 -c "import docx" >/dev/null 2>&1; then
  mark "python-docx:" "ok"
else
  mark "python-docx:" "missing"
fi

if [ -d "/Applications/Microsoft Word.app" ]; then
  mark "Microsoft Word:" "ok"
else
  mark "Microsoft Word:" "missing"
fi

# Playwright Chromium cache (the asset the browse download path supplies).
PW_CACHE="$HOME/Library/Caches/ms-playwright"
[ "$(uname -s)" != "Darwin" ] && PW_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/ms-playwright"
[ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ] && PW_CACHE="$PLAYWRIGHT_BROWSERS_PATH"
if ls "$PW_CACHE"/chromium-* >/dev/null 2>&1; then
  mark "playwright-chromium:" "PRESENT ($PW_CACHE) — masks browse download path"
else
  mark "playwright-chromium:" "missing (good — browse download path will run)"
fi

# --- 3. Pre-existing Counsel OS artifacts ------------------------------------
# Any of these means the machine is NOT a clean slate for this pass.
echo
echo "Pre-existing Counsel OS artifacts (each one means: not a clean machine)"

MKT="$HOME/.claude/plugins/marketplaces/eigenlegal"
if [ -d "$MKT" ]; then mark "marketplace clone:" "FOUND ($MKT)"; note_artifact; else mark "marketplace clone:" "none"; fi

CACHE="$HOME/.claude/plugins/cache/eigenlegal/counsel-os"
if [ -d "$CACHE" ]; then
  ver="$(ls "$CACHE" 2>/dev/null | head -1)"
  mark "plugin cache:" "FOUND ($CACHE${ver:+, $ver})"; note_artifact
else
  mark "plugin cache:" "none"
fi

if [ -d "$HOME/.counsel-os" ]; then
  detail="$HOME/.counsel-os"
  [ -x "$HOME/.counsel-os/browse/dist/browse" ] && detail="$detail [downloaded browse binary]"
  [ -f "$HOME/.counsel-os/legal-root" ] && detail="$detail [legal-root pointer]"
  [ -d "$HOME/.counsel-os/backups" ] && detail="$detail [backups]"
  mark "~/.counsel-os:" "FOUND — $detail"; note_artifact
else
  mark "~/.counsel-os:" "none"
fi

# A configured legal root anywhere — pointer cache first, then env override.
if [ -f "$HOME/.counsel-os/legal-root" ]; then
  mark "legal-root pointer:" "FOUND -> $(cat "$HOME/.counsel-os/legal-root" 2>/dev/null)"; note_artifact
elif [ -n "${COUNSEL_OS_LEGAL_ROOT:-}" ]; then
  mark "legal-root (env):" "SET -> $COUNSEL_OS_LEGAL_ROOT"; note_artifact
else
  mark "legal-root:" "none configured"
fi

# A qmd collection named 'counsel-os' is what setup creates when it indexes the
# vault. Its presence means qmd is already wired here, so setup would report
# "qmd is wired" and make no offer — masking the clean-machine qmd-offer test.
# 'qmd collection list' is read-only (no model download — that's 'qmd embed').
if have qmd; then
  if qmd collection list 2>/dev/null | grep -qi 'counsel-os'; then
    mark "qmd counsel-os collection:" "FOUND — qmd already indexed a vault (see 'qmd collection list')"; note_artifact
  else
    mark "qmd counsel-os collection:" "none (qmd installed, no counsel-os index yet)"
  fi
else
  mark "qmd counsel-os collection:" "n/a (qmd not installed)"
fi

# --- Verdict -----------------------------------------------------------------
echo
if [ "$ART_FOUND" -eq 0 ]; then
  echo "VERDICT: CLEAN — no Counsel OS artifacts found."
  echo "         (Confirm bun + playwright-chromium + qmd are 'missing' above so the"
  echo "          browse download path AND setup's qmd install-offer both run.)"
  exit 0
else
  echo "VERDICT: NOT CLEAN — found $ART_FOUND pre-existing Counsel OS artifact(s)."
  echo "         Use a fresh macOS user account, a clean VM, or new hardware."
  echo "         (Run again AFTER the pass to confirm what the install supplied.)"
  exit 1
fi
