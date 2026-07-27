#!/bin/bash
# word_compare.sh — Use Microsoft Word to compare two documents and produce
# a tracked changes document with revisions attributed to a specified author.
#
# Usage:
#   ./word_compare.sh <original.docx> <modified.docx> <author_name> <output.docx>
#
# Requires: Microsoft Word for Mac

set -euo pipefail

if [ $# -ne 4 ]; then
    echo "Usage: $0 <original.docx> <modified.docx> <author_name> <output.docx>"
    exit 1
fi

ORIGINAL="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
MODIFIED="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
AUTHOR="$3"

# Create the output directory and resolve OUTPUT to an absolute path.
# A relative path must never reach AppleScript: Word would resolve it
# against its own working directory, not ours.
OUTPUT_DIR="$(dirname "$4")"
if ! mkdir -p "$OUTPUT_DIR"; then
    echo "Error: Could not create output directory: $OUTPUT_DIR"
    exit 1
fi
if ! OUTPUT="$(cd "$OUTPUT_DIR" && pwd)/$(basename "$4")"; then
    echo "Error: Could not resolve output path to an absolute path: $4"
    exit 1
fi

# Check Word is installed
if [ ! -d "/Applications/Microsoft Word.app" ]; then
    echo "Error: Microsoft Word not found at /Applications/Microsoft Word.app"
    exit 1
fi

# Check input files exist
if [ ! -f "$ORIGINAL" ]; then
    echo "Error: Original document not found: $ORIGINAL"
    exit 1
fi

if [ ! -f "$MODIFIED" ]; then
    echo "Error: Modified document not found: $MODIFIED"
    exit 1
fi

ORIG_BASE="$(basename "$ORIGINAL")"
ORIG_DIR="$(dirname "$ORIGINAL")"
MOD_BASE="$(basename "$MODIFIED")"
OUT_NAME="$(basename "$OUTPUT")"

# Word cannot keep two same-named documents open at once, and the AppleScript
# below addresses documents by name — an output named like either input would
# collide with a document that is open during the compare.
if [ "$OUT_NAME" = "$ORIG_BASE" ] || [ "$OUT_NAME" = "$MOD_BASE" ]; then
    echo "Error: output filename ($OUT_NAME) must differ from both input filenames"
    exit 1
fi

# ── Word scripting-model health check ──────────────────────────────────────
# Word can reach a state where `count of documents` reports a document that
# cannot be addressed: `document 1` and `name of every document` both answer
# `missing value`, and — the dangerous part — `exists document "<open doc>"`
# answers FALSE for a document that is plainly open on screen. Observed on
# Word 16.111 after closing a windowless comparison document, which is exactly
# what a crashed redline run leaves behind.
#
# Every guard in this script reasons about documents by name, so in that state
# every answer is untrustworthy: the pre-flight would clear a document it
# should refuse, the lock sweep below would read a live lock as orphaned, and
# the cleanup would treat the user's open documents as this run's to close.
# There is no safe way to proceed, so refuse early and say what to do.

word_is_running() {
    pgrep -x "Microsoft Word" >/dev/null 2>&1
}

word_model_state() {
    osascript 2>/dev/null <<'ENDSTATE'
tell application "Microsoft Word"
    if (count of documents) is 0 then return "ok"
    if (name of every document) is missing value then return "wedged"
    return "ok"
end tell
ENDSTATE
}

# Newline-separated names of every open document ("" when none).
word_open_doc_names() {
    osascript 2>/dev/null <<'ENDNAMES'
tell application "Microsoft Word"
    if (count of documents) is 0 then return ""
    set nameList to name of every document
    if nameList is missing value then return ""
    if class of nameList is not list then set nameList to {nameList}
    set AppleScript's text item delimiters to linefeed
    set out to nameList as text
    set AppleScript's text item delimiters to ""
    return out
end tell
ENDNAMES
}

WORD_RUNNING=0
if word_is_running; then
    WORD_RUNNING=1
    MODEL_STATE="$(word_model_state)"
    if [ "$MODEL_STATE" != "ok" ]; then
        echo "Error: Word is running but its scripting model is not answering."
        echo "It reports an open document that cannot be addressed by name, which"
        echo "is usually a leftover windowless document from a crashed run. Every"
        echo "safety check here relies on addressing documents by name, so this run"
        echo "would be working blind."
        echo
        echo "Quit Microsoft Word (save anything you care about first) and reopen it,"
        echo "then re-run. If Word will not quit cleanly, force quit it; the redline"
        echo "inputs on disk are untouched."
        exit 1
    fi
fi

# ── Stale owner-lock pre-flight ────────────────────────────────────────────
# Word writes an advisory owner file beside every open document. The name is
# "~$" plus the basename, with the first two characters dropped once the name
# is long enough that keeping them would lengthen it (verified Word 16.111:
# "orig.docx" -> "~$orig.docx", but "Sinai AI Platform Agreement 7-27-26
# REV.docx" -> "~$nai AI Platform Agreement 7-27-26 REV.docx"). Rather than
# infer where that threshold sits, both candidate names are checked.
#
# A crashed or error-aborted run abandons one of these. Word then answers
# `open` on that document with a modal "locked for editing" dialog that
# AppleScript cannot dismiss, so the run below would hang until the 600s
# timeout and exit without cleanup, leaking yet more locks. Clearing our own
# orphans is what breaks that cycle.
#
# A lock is removed only when it is provably safe: no open document claims it,
# and the lock names us as its owner. A lock held by someone else (the vault
# is on a shared volume) or one that will not parse is left alone, and the run
# aborts with the path to fix by hand.

# Both possible lock basenames for a document basename.
lock_candidates_for() {
    local base="$1"
    printf '~$%s\n' "$base"
    if [ "${#base}" -gt 2 ]; then
        printf '~$%s\n' "${base:2}"
    fi
}

# Owner name stored in a lock file: a leading length byte, then the name.
# od/dd keep this dependency-free; a non-ASCII name simply fails to match and
# takes the safe abort path.
lock_owner() {
    local lock="$1" len
    len="$(od -An -N1 -tu1 "$lock" 2>/dev/null | tr -d ' [:space:]')"
    case "$len" in
        ''|*[!0-9]*) return 0 ;;
        0) return 0 ;;
    esac
    dd if="$lock" bs=1 skip=1 count="$len" 2>/dev/null | tr -d '\0'
}

OS_OWNER="$(id -F 2>/dev/null || true)"
WORD_OWNER=""
OPEN_DOCS=""
if [ "$WORD_RUNNING" -eq 1 ]; then
    WORD_OWNER="$(osascript -e 'tell application "Microsoft Word" to get user name' 2>/dev/null || true)"
    OPEN_DOCS="$(word_open_doc_names)"
fi

# Lock basenames claimed by a document that is genuinely open. Derived from
# the open documents themselves rather than from our targets: two different
# filenames can map to one lock name ("export.docx" and "report.docx" both
# yield "~$port.docx"), and a live lock must never be mistaken for an orphan.
LIVE_LOCKS=""
if [ -n "$OPEN_DOCS" ]; then
    while IFS= read -r open_doc; do
        [ -n "$open_doc" ] || continue
        LIVE_LOCKS="$LIVE_LOCKS$(lock_candidates_for "$open_doc")
"
    done <<EOF
$OPEN_DOCS
EOF
fi

for lock_target in "$ORIGINAL" "$MODIFIED" "$OUTPUT"; do
    LOCK_DIR="$(dirname "$lock_target")"
    LOCK_BASE="$(basename "$lock_target")"

    while IFS= read -r lock_name; do
        [ -n "$lock_name" ] || continue
        LOCK="$LOCK_DIR/$lock_name"
        [ -f "$LOCK" ] || continue

        # Claimed by an open document: legitimate. The AppleScript pre-flight
        # below decides whether that document actually blocks this run.
        if printf '%s\n' "$LIVE_LOCKS" | grep -qxF "$lock_name"; then
            continue
        fi

        LOCK_OWNER="$(lock_owner "$LOCK")"
        if [ -z "$LOCK_OWNER" ]; then
            echo "Error: could not read the owner of this Word lock file:"
            echo "  $LOCK"
            echo "No open document claims it, so it is probably stale, but it is not in"
            echo "the expected format. Remove it by hand and re-run."
            exit 1
        fi
        if [ "$LOCK_OWNER" != "$OS_OWNER" ] && [ "$LOCK_OWNER" != "$WORD_OWNER" ]; then
            echo "Error: '$LOCK_BASE' has a Word lock file held by '$LOCK_OWNER':"
            echo "  $LOCK"
            echo "Another user may have the document open on a shared volume. Word would"
            echo "show a 'locked for editing' dialog that this script cannot answer."
            echo "Confirm nobody is editing it, remove that file, then re-run."
            exit 1
        fi

        if rm -f "$LOCK"; then
            echo "Cleared orphaned Word lock file (owner '$LOCK_OWNER', no open document): $LOCK"
        else
            echo "Error: could not remove orphaned Word lock file: $LOCK"
            exit 1
        fi
    done <<EOF
$(lock_candidates_for "$LOCK_BASE")
EOF
done

echo "Comparing documents..."
echo "  Original: $ORIGINAL"
echo "  Modified: $MODIFIED"
echo "  Author:   $AUTHOR"
echo "  Output:   $OUTPUT"

# NOTE: All paths must be in user-accessible directories (e.g. ~/Desktop, ~/Documents).
# macOS sandboxing prevents Word from accessing /tmp or /private/tmp.

if osascript - "$ORIGINAL" "$MODIFIED" "$AUTHOR" "$OUTPUT" "$ORIG_BASE" "$ORIG_DIR" "$MOD_BASE" << 'ENDSCRIPT'
on run argv
    set originalPath to item 1 of argv
    set modifiedPath to item 2 of argv
    set authorName to item 3 of argv
    set outputPath to item 4 of argv
    set origBase to item 5 of argv
    set origDir to item 6 of argv
    set modBase to item 7 of argv

    -- Word renames the comparison document to the output file's name when
    -- it is saved as outputPath; derive the candidate post-save names up
    -- front so close can target them explicitly.
    set savedDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "/"
    set outName to last text item of outputPath
    set AppleScript's text item delimiters to savedDelims
    set outBase to outName
    if outName ends with ".docx" then set outBase to text 1 thru -6 of outName

    -- Large compares can exceed the default AppleEvent timeout (~2 min);
    -- allow up to 10 minutes before giving up.
    with timeout of 600 seconds
        tell application "Microsoft Word"
            activate

            -- Documents already open belong to the user and are never closed
            -- by this run. Everything open later that is absent from this
            -- list was created by this run, which is what makes cleanup
            -- possible without knowing the names in advance — including a
            -- comparison document left WINDOWLESS by a background Word,
            -- which holds a ~$ lock with no window the user could close.
            --
            -- Word sometimes answers `name of every document` with `missing
            -- value` while still reporting open documents. Treating that as
            -- "nothing was open" would make every open document look like this
            -- run's to close, so the snapshot is explicitly marked unusable
            -- instead and cleanup falls back to the names it knows are ours.
            set preNames to my documentNames()
            set haveSnapshot to (preNames is not missing value)
            if not haveSnapshot then set preNames to {}

            -- ── Pre-flight: this run must never touch a document it did ──
            -- ── not open. Word refuses to keep two same-named documents ──
            -- ── open at once, so a name match below identifies THE only ──
            -- ── possible document with that name — the risk is that it  ──
            -- ── belongs to the user, not to this run.                   ──

            -- A document already named like the output would collide with
            -- the comparison document's save/close below (e.g. the user is
            -- still reading a previous redline with this name).
            repeat with candidateName in {outName, outBase}
                if (exists document (contents of candidateName)) then ¬
                    error "A document named '" & (contents of candidateName) & "' is already open in Word; the redline output would collide with it. Close it and re-run."
            end repeat

            -- The modified input open with unsaved edits: the compare reads
            -- the file from DISK, so those edits would be silently ignored.
            if (exists document modBase) then
                if not (saved of document modBase) then ¬
                    error "'" & modBase & "' is open in Word with unsaved changes; the compare reads the saved file, so those edits would be silently ignored. Save or close it, then re-run."
            end if

            -- The original: if the same FILE is already open, 'open' would
            -- hand back the user's in-memory document — including unsaved
            -- edits — which the cleanup below would then discard with
            -- 'saving no'. Reuse it only if it is clean, and remember not
            -- to close it. A same-named document from a DIFFERENT folder
            -- cannot be opened alongside ours at all, so fail with a clear
            -- message instead of Word's cryptic one.
            -- Everything from here on can leave documents open in Word, so it
            -- runs under a handler that closes them before re-raising. These
            -- are initialised first so the handler can read them no matter how
            -- early the failure lands.
            set origWasOpen to false
            set origName to missing value
            set compName to missing value

            try
            if (exists document origBase) then
                set docDir to path of document origBase
                -- Word reports 'path' in HFS style (Colon:Separated:Dirs);
                -- normalize to POSIX before comparing with origDir.
                if docDir does not start with "/" then set docDir to POSIX path of docDir
                if docDir ends with "/" and (length of docDir) > 1 then set docDir to text 1 thru -2 of docDir
                if docDir is not equal to origDir then ¬
                    error "A different document also named '" & origBase & "' (in " & docDir & ") is open in Word; Word cannot open two documents with the same name. Close it and re-run."
                if not (saved of document origBase) then ¬
                    error "'" & origBase & "' is open in Word with unsaved changes. Save it (to include those edits in the compare) or close it, then re-run."
                set origWasOpen to true
                set origDoc to document origBase
            else
                -- Open the original document. A variable like this holds an
                -- AppleScript SPECIFIER that re-resolves every time it is
                -- used (in particular, 'active document' resolves to
                -- whatever window is frontmost AT THAT MOMENT) — so every
                -- long-lived reference below is pinned to a name string
                -- captured immediately, and save/close address documents by
                -- that name, never by whatever happens to be active later.
                set origDoc to open file name POSIX file originalPath
            end if
            set origName to name of origDoc

            -- Compare with the modified document, author name set to specified author
            compare origDoc path modifiedPath author name authorName target compare target new add to recent files false

            -- The comparison result is now the active document; bind its
            -- name before focus can shift to another window.
            set compName to name of active document

            -- The comparison document inherits the user's "Embed fonts in
            -- the file" preference; with it on, Word packs TrueType fonts
            -- (word/fonts/*.odttf) into the redline and the output balloons
            -- far past the input size (38KB in -> 6MB out in testing).
            -- Force embedding off so output size is independent of the
            -- user's Word preferences. The "embed truetype fonts" save
            -- parameter below is the effective control at save time
            -- (verified Word 16.x for Mac); the document property is a
            -- backstop for any save path that consults it instead.
            set embed true type fonts of (document compName) to false

            -- VERIFIED (Word 16.109.3 for Mac, 2026-06-10): "format document"
            -- produces a real OOXML .docx here (opens with python-docx; file(1)
            -- reports "Microsoft Word 2007+"), with tracked changes correctly
            -- attributed. If a future Word build emits a legacy OLE .doc
            -- instead, switch this enum to the docx-producing value
            -- ("format document default" / OOXML document format).
            save as (document compName) file name POSIX file outputPath file format format document embed truetype fonts false

            -- Close exactly the documents this run opened or created, by
            -- name — the pre-flight above guarantees none of these names
            -- can belong to a user document. The comparison document may
            -- keep its pre-save name or take the output file's name (with
            -- or without extension) depending on the Word build, so try
            -- all candidates; closing a name that no longer matches
            -- anything is a no-op. An original that was already open when
            -- this run started belongs to the user and stays open.
            set closeNames to {compName, outName, outBase}
            if not origWasOpen then set end of closeNames to origName

            -- Anything this run created under a name none of the candidates
            -- predicted (the windowless-zombie case) still has to be closed,
            -- or it keeps holding its lock file. Only safe while the snapshot
            -- of pre-existing documents is trustworthy.
            if haveSnapshot then
                set nowNames to my documentNames()
                if nowNames is not missing value then
                    repeat with n in nowNames
                        set thisName to contents of n
                        if not (my listHas(preNames, thisName)) then
                            if not (my listHas(closeNames, thisName)) then ¬
                                set end of closeNames to thisName
                        end if
                    end repeat
                end if
            end if

            repeat with candidateName in closeNames
                if (exists document (contents of candidateName)) then ¬
                    close document (contents of candidateName) saving no
            end repeat

            -- A silent close failure is what leaves the comparison document
            -- open in Word (holding the output file); fail loudly instead.
            repeat with candidateName in closeNames
                if (exists document (contents of candidateName)) then ¬
                    error "document '" & (contents of candidateName) & "' is still open after close"
            end repeat

            on error errMsg number errNum
                -- Close what this run opened, then re-raise unchanged. Without
                -- this, a failed compare or save leaves the original AND the
                -- comparison document open, each holding a ~$ owner lock beside
                -- the user's file. Word keeps running in the background, so the
                -- leak is invisible until the next time the document is opened
                -- and Word calls it "locked for editing".
                --
                -- The cleanup gets its own shorter budget: if the failure was
                -- the outer 600s timeout expiring on a wedged Word, these
                -- events would otherwise be free to hang for another 600s.
                try
                    with timeout of 60 seconds
                        if haveSnapshot then
                            -- Close every document this run brought into being.
                            set leftovers to my documentNames()
                            if leftovers is not missing value then
                                repeat with n in leftovers
                                    set thisName to contents of n
                                    if not (my listHas(preNames, thisName)) then
                                        try
                                            close document thisName saving no
                                        end try
                                    end if
                                end repeat
                            end if
                        else
                            -- No trustworthy snapshot: close only the names
                            -- this run is known to own. The output-name
                            -- collision check above proves none of them can
                            -- belong to the user.
                            set fallbackNames to {outName, outBase}
                            try
                                if compName is not missing value then ¬
                                    set end of fallbackNames to compName
                            end try
                            try
                                if not origWasOpen then set end of fallbackNames to origName
                            end try
                            repeat with n in fallbackNames
                                try
                                    if (exists document (contents of n)) then ¬
                                        close document (contents of n) saving no
                                end try
                            end repeat
                        end if
                    end timeout
                end try
                error errMsg number errNum
            end try
        end tell
    end timeout
end run

-- Names of every open document as a list, or `missing value` when Word will
-- not answer. A one-element result is normalised to a list so callers never
-- have to care, and `missing value` is passed through rather than flattened to
-- an empty list: the difference decides whether documents get closed.
on documentNames()
    tell application "Microsoft Word"
        try
            if (count of documents) is 0 then return {}
            set nameList to name of every document
        on error
            return missing value
        end try
    end tell
    if nameList is missing value then return missing value
    if class of nameList is not list then return {nameList}
    return nameList
end documentNames

-- Exact list membership. AppleScript's `contains` is loose enough on strings
-- to be worth avoiding when the answer decides whether a document gets closed.
on listHas(theList, theItem)
    repeat with x in theList
        if (contents of x) is equal to theItem then return true
    end repeat
    return false
end listHas
ENDSCRIPT
then
    if [ ! -f "$OUTPUT" ]; then
        echo "Error: Word reported success but no output file exists: $OUTPUT"
        exit 1
    fi
    echo "Success: Tracked changes document saved to $OUTPUT"
    echo "Modified input retained: $MODIFIED"
else
    COMPARE_EXIT=$?
    echo "Error: Word Compare failed with exit code $COMPARE_EXIT"
    exit 1
fi
