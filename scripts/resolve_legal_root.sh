#!/usr/bin/env bash
set -euo pipefail

matches=()

# Canonical Counsel OS legal-root discovery algorithm.
#
# A marked legal root is a directory containing config.md with both:
#   counsel-os-config: true
#   legal_root:
#
# Search order:
#   1. COUNSEL_OS_LEGAL_ROOT, when set.
#   2. ~/.counsel-os/legal-root pointer, when present.
#   3. The current working directory and up to three parents.
#   4. Conventional local vault locations, scanning up to three levels deep.
#
# Exit-code contract:
#   0 = exactly one marked legal root was found; stdout is the path.
#   1 = no marked legal root was found, or COUNSEL_OS_LEGAL_ROOT is invalid.
#   2 = multiple marked legal roots were found; stderr lists candidates.
#
# This helper is intentionally non-interactive. Skills and callers own any
# user prompting and may cache a resolved path by writing the pointer file.

is_marked_root() {
  local root="$1"
  local config="$root/config.md"
  [ -d "$root" ] || return 1
  [ -f "$config" ] || return 1
  grep -q '^counsel-os-config: true$' "$config" || return 1
  grep -q '^legal_root:' "$config" || return 1
}

add_match() {
  local root="$1"
  is_marked_root "$root" || return 0
  # ${matches[@]+...} guards the empty-array expansion: bash 3.2 (stock macOS)
  # treats "${matches[@]}" on an empty array as unbound under `set -u`.
  for existing in ${matches[@]+"${matches[@]}"}; do
    [ "$existing" = "$root" ] && return 0
  done
  matches+=("$root")
}

emit_if_marked() {
  local root="$1"
  if is_marked_root "$root"; then
    printf '%s\n' "$root"
    exit 0
  fi
}

if [ -n "${COUNSEL_OS_LEGAL_ROOT:-}" ]; then
  emit_if_marked "$COUNSEL_OS_LEGAL_ROOT"
  echo "COUNSEL_OS_LEGAL_ROOT is not a marked Counsel OS legal root: $COUNSEL_OS_LEGAL_ROOT" >&2
  exit 1
fi

if [ -f "$HOME/.counsel-os/legal-root" ]; then
  pointer="$(tr -d '\n' < "$HOME/.counsel-os/legal-root")"
  if [ -n "$pointer" ]; then
    emit_if_marked "$pointer"
  fi
fi

# Walk up from the current working directory, capped to match the skill bootstrap.
dir="$PWD"
depth=0
while [ "$dir" != "/" ] && [ "$depth" -le 3 ]; do
  add_match "$dir"
  dir="$(dirname "$dir")"
  depth=$((depth + 1))
done

known_roots=(
  "$HOME/Documents/Obsidian Vault"
  "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents"
  "$HOME/Dropbox/Obsidian"
  "$HOME/legal"
  "$HOME/counsel-os"
  "$HOME/Documents/Counsel OS"
)

for base in "${known_roots[@]}"; do
  [ -d "$base" ] || continue
  while IFS= read -r config; do
    add_match "$(dirname "$config")"
  done < <(find "$base" -maxdepth 3 -type f -name config.md 2>/dev/null)
done

if [ "${#matches[@]}" -eq 1 ]; then
  printf '%s\n' "${matches[0]}"
  exit 0
fi

if [ "${#matches[@]}" -gt 1 ]; then
  echo "Multiple Counsel OS legal roots found. Set COUNSEL_OS_LEGAL_ROOT to choose one:" >&2
  for root in "${matches[@]}"; do
    echo "  $root" >&2
  done
  exit 2
fi

exit 1
