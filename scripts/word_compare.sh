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
            set origWasOpen to false
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
        end tell
    end timeout
end run
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
