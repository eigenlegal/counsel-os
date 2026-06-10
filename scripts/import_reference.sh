#!/usr/bin/env bash
# Import third-party source material (sample agreements, checklists, treatise
# excerpts) into the vault's practice/reference/ area with the standard
# frontmatter, provenance banner, and index registration.
#
# Usage:
#   scripts/import_reference.sh <source-dir-or-file> <collection-name> \
#     [--source "attribution, vintage"] [--legal-root <path>] [--force]
#
# Handles: .docx (pandoc), legacy .doc (textutil → pandoc, macOS only),
# .md/.markdown/.txt (passed through). Other types are skipped with a warning.
# Uses pandoc's `markdown` flavor, NOT gfm — gfm silently drops complex
# tables as "[TABLE]".
#
# Reference content is source material OUTSIDE the precedence layers: it
# informs issue-spotting and sample language, never governs, and must be
# cite-checked against current law/ before relying on it.
#
# bash-3.2 compatible (stock macOS).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"

SRC="${1:-}"
COLLECTION="${2:-}"
if [ -z "$SRC" ] || [ -z "$COLLECTION" ]; then
  echo "Usage: scripts/import_reference.sh <source-dir-or-file> <collection-name> [--source \"attribution\"] [--legal-root <path>] [--force]" >&2
  exit 1
fi
shift 2

ATTRIBUTION="third-party reference (attribution not recorded)"
LEGAL_ROOT=""
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --source) ATTRIBUTION="${2:-}"; shift 2 ;;
    --legal-root) LEGAL_ROOT="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

echo "$COLLECTION" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || {
  echo "Collection name must be a lowercase kebab-case slug (got: $COLLECTION)" >&2
  exit 1
}

if [ -z "$LEGAL_ROOT" ]; then
  LEGAL_ROOT="$(bash "$REPO/scripts/resolve_legal_root.sh")" || {
    echo "Could not resolve the legal root. Pass --legal-root <path> or run /counsel-os:setup." >&2
    exit 1
  }
fi
[ -d "$LEGAL_ROOT" ] || { echo "Legal root does not exist: $LEGAL_ROOT" >&2; exit 1; }

command -v pandoc >/dev/null 2>&1 || { echo "pandoc is required (brew install pandoc)." >&2; exit 1; }

DEST="$LEGAL_ROOT/practice/reference/$COLLECTION"
mkdir -p "$DEST"
TODAY="$(date +%Y-%m-%d)"

# Clean pandoc output: drop span/style artifacts and collapse blank runs.
clean_md() {
  sed -E -e 's/\[ *\]\{\.Apple-converted-space\}/ /g' -e 's/\*\*\*\*//g' -e '/^\\$/d' -e 's/ \.( \.){3,}//g' | cat -s
}

convert_one() {
  # $1 = source file; prints markdown body to stdout, or returns 1 if unsupported
  case "$1" in
    *.docx|*.DOCX)
      pandoc -f docx -t markdown-raw_html-bracketed_spans-native_spans --wrap=none "$1" | clean_md ;;
    *.doc|*.DOC)
      command -v textutil >/dev/null 2>&1 || { echo "  SKIP (legacy .doc needs macOS textutil): $1" >&2; return 1; }
      textutil -convert html "$1" -stdout 2>/dev/null \
        | pandoc -f html -t markdown-raw_html-bracketed_spans-native_spans --wrap=none | clean_md ;;
    *.md|*.markdown|*.txt)
      cat "$1" ;;
    *)
      echo "  SKIP (unsupported type): $1" >&2; return 1 ;;
  esac
}

imported=0
skipped=0
# Build the file list (single file or directory contents, non-recursive).
if [ -f "$SRC" ]; then
  LIST="$SRC"
else
  LIST="$(find "$SRC" -maxdepth 1 -type f | sort)"
fi

[ -n "$LIST" ] || { echo "No files found at: $SRC" >&2; exit 1; }

echo "$LIST" | while IFS= read -r f; do
  base="$(basename "$f")"
  title="${base%.*}"
  out="$DEST/$title.md"
  if [ -e "$out" ] && [ "$FORCE" -ne 1 ]; then
    echo "  exists (use --force to overwrite): $title.md" >&2
    continue
  fi
  if body="$(convert_one "$f")"; then
    {
      printf -- '---\n'
      printf 'counsel-os-type: reference\n'
      printf 'reference-collection: %s\n' "$COLLECTION"
      printf 'source: "%s"\n' "$ATTRIBUTION"
      printf 'title: "%s"\n' "$title"
      printf 'imported: %s\n' "$TODAY"
      printf 'caution: "Third-party reference. Issue-spotting and sample language only; verify against current law/ before relying. Not a Counsel OS position or legal advice."\n'
      printf -- '---\n\n'
      printf '> ⚠️ **Reference only — third-party source material.** Source: %s. Cite-check against current law before relying. Not a Counsel OS standard, position, or legal advice.\n\n' "$ATTRIBUTION"
      printf '%s\n' "$body"
    } > "$out"
    echo "  imported: $title.md"
  fi
done

# Count results (the while ran in a subshell; recount from disk)
imported="$(find "$DEST" -maxdepth 1 -name '*.md' ! -name '_index.md' | wc -l | tr -d ' ')"

# Collection index
IDX="$DEST/_index.md"
{
  printf -- '---\ncounsel-os-type: reference\nreference-collection: %s\ntitle: "%s — index"\n---\n\n' "$COLLECTION" "$COLLECTION"
  printf '> ⚠️ **Reference only.** Source: %s. Imported %s. Outside the precedence layers — informs, never governs; cite-check against current law/.\n\n' "$ATTRIBUTION" "$TODAY"
  printf '# %s — Reference Index\n\n' "$COLLECTION"
  find "$DEST" -maxdepth 1 -name '*.md' ! -name '_index.md' | sort | while IFS= read -r f; do
    printf -- '- [[%s]]\n' "$(basename "$f" .md)"
  done
} > "$IDX"

# Register the collection in the area index
AREA_IDX="$LEGAL_ROOT/practice/reference/_index.md"
if [ -f "$AREA_IDX" ] && ! grep -q "$COLLECTION" "$AREA_IDX"; then
  printf -- '- [[%s/_index|%s]] — %s (imported %s)\n' "$COLLECTION" "$COLLECTION" "$ATTRIBUTION" "$TODAY" >> "$AREA_IDX"
  echo "  registered in practice/reference/_index.md"
fi

echo ""
echo "Imported into: $DEST ($imported files + _index.md)"
if command -v qmd >/dev/null 2>&1; then
  echo "Reindex so search sees it:  qmd update && qmd embed"
fi
