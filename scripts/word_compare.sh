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

echo "Comparing documents..."
echo "  Original: $ORIGINAL"
echo "  Modified: $MODIFIED"
echo "  Author:   $AUTHOR"
echo "  Output:   $OUTPUT"

# NOTE: All paths must be in user-accessible directories (e.g. ~/Desktop, ~/Documents).
# macOS sandboxing prevents Word from accessing /tmp or /private/tmp.

if osascript - "$ORIGINAL" "$MODIFIED" "$AUTHOR" "$OUTPUT" << 'ENDSCRIPT'
on run argv
    set originalPath to item 1 of argv
    set modifiedPath to item 2 of argv
    set authorName to item 3 of argv
    set outputPath to item 4 of argv

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

            -- Open the original document. A variable like this holds an
            -- AppleScript SPECIFIER that re-resolves every time it is used
            -- (in particular, 'active document' resolves to whatever window
            -- is frontmost AT THAT MOMENT) — so every long-lived reference
            -- below is pinned to a name string captured immediately, and
            -- save/close address documents by that name, never by whatever
            -- happens to be active later.
            set origDoc to open file name POSIX file originalPath
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

            -- Close exactly the documents this run created, by name. The
            -- comparison document may keep its pre-save name or take the
            -- output file's name (with or without extension) depending on
            -- the Word build, so try all candidates; closing a name that
            -- no longer matches anything is a no-op.
            repeat with candidateName in {compName, outName, outBase}
                if (exists document (contents of candidateName)) then ¬
                    close document (contents of candidateName) saving no
            end repeat
            if (exists document origName) then close document origName saving no

            -- A silent close failure is what leaves the comparison document
            -- open in Word (holding the output file); fail loudly instead.
            repeat with candidateName in {compName, outName, outBase, origName}
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
