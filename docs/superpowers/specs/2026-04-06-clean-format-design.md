# Clean Document Format

## Problem

The Word redline pipeline (`apply_redlines.py` + `word_compare.sh`) preserves the source document's formatting — whatever fonts, spacing, and styles the counterparty used. This is correct for redlines, but lawyers also need to produce professionally formatted clean documents: final agreements, internal memos, and clean versions of messy counterparty drafts.

There is currently no way to generate a .docx with consistent, professional formatting.

## Solution

Add an optional clean format step to `/deliver` that reformats any .docx to professional standards before (or instead of) applying tracked changes.

Two use cases:

1. **Standalone reformat** — "Clean up this document." Produces a reformatted .docx.
2. **Clean redline** — Reformat first, then apply redlines. Tracked changes show both formatting and content improvements.

## Architecture

### Separate script: `scripts/clean_format.py`

Not a mode in `apply_redlines.py`. Different intent — one preserves formatting, the other changes it. Separate scripts compose in any order.

```
Usage: python3 clean_format.py <input.docx> <output.docx> [--template <path>]
```

### Template: `scripts/legal-template.docx`

A .docx with predefined styles (Normal, Heading 1-3, Title). The script loads this as the base document so all styles inherit cleanly. Falls back to programmatic style definitions if missing.

### Pipeline position: Step 3a (before Step 3b)

```
Step 3:  Format the Deliverable (markdown — unchanged)
Step 3a: Clean Format (NEW, optional)
Step 3b: Word Tracked Changes (existing, unchanged)
Step 4:  Connected Service Delivery (unchanged)
```

When used WITH redlines:
1. `clean_format.py` on original → clean base
2. `apply_redlines.py` on clean base → clean + revised
3. `word_compare.sh` comparing **original** vs clean+revised
4. Tracked changes reflect both formatting and content changes

When used standalone:
1. `clean_format.py` on input → output
2. Done

## Style Definitions

All text is 10pt Calibri. Headings differentiated by bold + spacing only.

| Style | Size | Weight | Spacing (before/after) | Alignment |
|-------|------|--------|----------------------|-----------|
| Normal | 10pt | Regular | 0pt / 10pt, 1.15 line | Justified |
| Title | 10pt | Bold | 0pt / 12pt | Center |
| Heading 1 | 10pt | Bold | 18pt / 10pt | Left |
| Heading 2 | 10pt | Bold | 14pt / 8pt | Left |
| Heading 3 | 10pt | Bold | 10pt / 6pt | Left |

Font color: `#1a1a1a`. Page: 1" margins, Letter size.

## Numbering

Single multilevel numbered list throughout the document:

| Level | Format | Indent | Used for |
|-------|--------|--------|----------|
| 0 | `1.` | 0.5" | Section headings |
| 1 | `1.1.` | 1.0" | Sub-items, list items |
| 2 | `1.1.1.` | 1.5" | Nested sub-items |

All list types (bullets, manual numbering) convert to this scheme. Headings participate in the numbering at level 0, so sub-items under section 4 become 4.1, 4.2, etc.

Numbering is applied via explicit `w:numPr` XML on each paragraph. All pre-existing numbering definitions are purged from the template to avoid conflicts with built-in styles.

## Content Classification

The script classifies each source paragraph:

| Classification | Detection | Output |
|----------------|-----------|--------|
| Title | First ALL CAPS heading-like paragraph | Title style, centered |
| Heading | Existing Heading style, OR short (<120 chars) + bold/ALL CAPS, OR legal keywords (Article, Section, Recitals...) | Heading 1/2/3 + numbering level 0/1/2 |
| Bullet | Existing List Bullet style, OR leading bullet character (•, -, *, etc.) | Numbered list (level 1) |
| Numbered | Existing List Number style, OR manual prefix (1., (a), (i), etc.) | Numbered list (level 1) |
| Body | Everything else | Normal style, justified |

Manual numbering prefixes and bullet characters are stripped when native numbering is applied.

## Formatting Preservation

When copying content:
- **Preserved:** bold, italic, underline, strikethrough, subscript, superscript
- **Not preserved (replaced by style):** font name, font size, font color

Tables are copied with structure intact, cell content gets Normal style.
Headers and footers are copied as text.

## Output

JSON to stdout (matches `apply_redlines.py` pattern):

```json
{
  "paragraphs_processed": 142,
  "headings_detected": 12,
  "lists_converted": 8,
  "tables_processed": 3,
  "warnings": []
}
```

## Limitations

- **Images:** Inline images via `a:blip` elements are not copied. Floating images and embedded OLE objects are lost. Warning logged.
- **Fields:** Word field codes (TOC, cross-references, page numbers) may render as static text.
- **Complex tables:** Merged cells preserved where possible; warning if detection fails.
- **Nested lists beyond level 3:** Flattened to level 3.
- **Heading ambiguity:** Short bold text that isn't a heading (e.g., defined terms) may be misclassified. Mitigated by requiring standalone paragraph + under 120 chars.
- **macOS only:** Template path resolution assumes Unix paths.

## Files

### New
| File | Purpose |
|------|---------|
| `scripts/clean_format.py` | Clean formatting script |
| `scripts/legal-template.docx` | Template with style definitions |

### Modified
| File | Change |
|------|--------|
| `skills/deliver/SKILL.md` | Add Step 3a, modify Step 3b prompt |
| `skills/negotiate/SKILL.md` | Add /deliver prompt for .docx sources |
