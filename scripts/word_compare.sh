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
OUTPUT="$(cd "$(dirname "$4")" 2>/dev/null && pwd)/$(basename "$4")" || OUTPUT="$4"

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

    tell application "Microsoft Word"
        activate

        -- Open the original document
        set origDoc to open file name POSIX file originalPath

        -- Compare with the modified document, author name set to specified author
        compare origDoc path modifiedPath author name authorName target compare target new add to recent files false

        -- The comparison result is now the active document
        set compDoc to active document

        -- Save the comparison document
        save as compDoc file name POSIX file outputPath file format format document

        -- Close all documents
        close compDoc saving no
        close origDoc saving no
    end tell
end run
ENDSCRIPT
then
    echo "Success: Tracked changes document saved to $OUTPUT"
    echo "Modified input retained: $MODIFIED"
else
    COMPARE_EXIT=$?
    echo "Error: Word Compare failed with exit code $COMPARE_EXIT"
    exit 1
fi
