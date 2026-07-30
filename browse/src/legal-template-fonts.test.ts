import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as path from 'path';

// scripts/legal-template.docx is clean_format.py's style donor, and its
// stylesheets are a landmine if they ever drift back to theme fonts: theme
// attributes (asciiTheme and friends) take precedence over explicit fonts,
// so a single leftover w:asciiTheme="majorHAnsi" renders headings in
// Cambria/Calibri even with Times New Roman declared beside it. The package
// carries TWO style parts (styles.xml and the Word-2010 compat
// stylesWithEffects.xml) — both must stay pinned, or consumers that honor
// the compat part resurrect theme fonts. See --document in primitives/draft.md.
function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const fontTest = hasPython() ? test : test.skip;
const repoRoot = path.resolve(import.meta.dir, '../..');

describe('legal-template.docx font pinning', () => {
  fontTest('every rFonts in both style parts pins Times New Roman with no theme attributes', () => {
    const script = String.raw`
import sys, zipfile, re

template = sys.argv[1]
z = zipfile.ZipFile(template)
parts = [p for p in ("word/styles.xml", "word/stylesWithEffects.xml") if p in z.namelist()]

problems = []
if "word/styles.xml" not in parts:
    problems.append("no word/styles.xml part")

for part in parts:
    styles = z.read(part).decode("utf-8")

    if "Calibri" in styles:
        problems.append(f"{part}: still references Calibri")

    # Theme aliases resolve ahead of explicit fonts, so none may survive.
    themed = re.findall(r'w:(asciiTheme|hAnsiTheme|eastAsiaTheme|cstheme)=', styles)
    if themed:
        problems.append(f"{part}: {len(themed)} theme font attributes remain: {sorted(set(themed))}")

    # Every rFonts element must pin all four concrete slots. The lookahead
    # keeps bare <w:rFonts/> and multiline tags inside the check instead of
    # silently excluding them.
    rfonts = re.findall(r"<w:rFonts(?=[\s/>])[^>]*>", styles)
    if not rfonts:
        problems.append(f"{part}: no rFonts elements found")
    for el in rfonts:
        for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            m = re.search(attr + r'="([^"]*)"', el)
            if not m or m.group(1) != "Times New Roman":
                problems.append(f"{part}: {attr} is {m.group(1) if m else 'missing'} in {el[:80]}")
                break

main = z.read("word/styles.xml").decode("utf-8")
if not re.search(r"<w:docDefaults>", main):
    problems.append("no docDefaults element")

# Normal must be Times New Roman 11pt (22 half-points) to match
# clean_format.py's DEFAULT_SIZE.
norm = re.search(r'<w:style [^>]*w:styleId="Normal".*?</w:style>', main, re.S)
if not norm:
    problems.append("no Normal style")
else:
    sz = re.search(r'<w:sz w:val="(\d+)"', norm.group(0))
    if not sz or sz.group(1) != "22":
        problems.append(f"Normal size is {sz.group(1) if sz else 'missing'} half-points, expected 22 (11pt)")

print("OK" if not problems else "; ".join(problems))
`;
    const out = execFileSync(
      'python3',
      ['-c', script, path.join(repoRoot, 'scripts', 'legal-template.docx')],
      { encoding: 'utf-8', timeout: 15000 },
    ).trim();
    expect(out).toBe('OK');
  });
});
