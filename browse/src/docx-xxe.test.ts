import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as path from 'path';

// The redline pipeline ingests .docx authored by a hostile counterparty, so
// its raw XML parts are untrusted. These tests prove scripts/xml_safety.py
// neutralises XXE (external-entity file read) and billion-laughs entity
// expansion at every stdlib/lxml parse site — see cou-43.
function hasPythonDocx(): boolean {
  try {
    execFileSync('python3', ['-c', 'import docx, lxml'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const xxeTest = hasPythonDocx() ? test : test.skip;
const repoRoot = path.resolve(import.meta.dir, '../..');

describe('xml_safety guards untrusted docx XML', () => {
  xxeTest('rejects DTDs and refuses entity expansion at both parser sites', () => {
    const script = String.raw`
import sys
from pathlib import Path

repo = Path(sys.argv[1])
sys.path.insert(0, str(repo / "scripts"))

from xml_safety import safe_fromstring, safe_lxml_fromstring, UnsafeXmlError

BILLION_LAUGHS = b"""<?xml version="1.0"?>
<!DOCTYPE lolz [
 <!ENTITY lol "lol">
 <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
 <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<root>&lol3;</root>"""

# billion-laughs must be refused before any expansion (no hang, no crash).
for parse in (safe_fromstring, safe_lxml_fromstring):
    try:
        parse(BILLION_LAUGHS)
        raise SystemExit("FAIL: %s expanded a DTD payload" % parse.__name__)
    except UnsafeXmlError:
        pass

# external-entity XXE (local file read) is likewise refused up front.
XXE = b"""<?xml version="1.0"?>
<!DOCTYPE r [ <!ENTITY x SYSTEM "file:///etc/hostname"> ]>
<root>&x;</root>"""
for parse in (safe_fromstring, safe_lxml_fromstring):
    try:
        parse(XXE)
        raise SystemExit("FAIL: %s parsed an XXE payload" % parse.__name__)
    except UnsafeXmlError:
        pass

# a benign OOXML part still parses cleanly through both hardened paths.
BENIGN = b'<?xml version="1.0"?><w:p xmlns:w="urn:x"><w:t>hi</w:t></w:p>'
assert safe_fromstring(BENIGN).tag.endswith("}p")
assert safe_lxml_fromstring(BENIGN).tag.endswith("}p")
print("OK")
`;
    const out = execFileSync('python3', ['-c', script, repoRoot], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(out.trim().endsWith('OK')).toBe(true);
  });

  xxeTest('apply_redlines skips a hostile header part without crashing or leaking', () => {
    const script = String.raw`
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from docx import Document

repo = Path(sys.argv[1])
apply_redlines = repo / "scripts" / "apply_redlines.py"
work = Path(tempfile.mkdtemp(prefix="counsel-xxe-test-"))

secret = work / "secret.txt"
secret.write_text("TOPSECRET_XXE_CANARY")

original = work / "original.docx"
doc = Document()
doc.add_paragraph("The confidential terms apply.")
doc.save(original)

# Inject a hostile word/header1.xml (raw part; apply_redlines scans it by name)
# that declares an external entity pointing at our secret file.
hostile = (
    '<?xml version="1.0"?>'
    '<!DOCTYPE hdr [ <!ENTITY leak SYSTEM "file://' + str(secret) + '"> ]>'
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    '<w:p><w:r><w:t>confidential terms &leak;</w:t></w:r></w:p></w:hdr>'
)
with zipfile.ZipFile(original, "a") as z:
    z.writestr("word/header1.xml", hostile)

redlines = work / "redlines.json"
redlines.write_text(
    '[{"current": "confidential terms", "proposed": "public terms", '
    '"comment": null, "author": "Tester"}]'
)
out_docx = work / "out.docx"

proc = subprocess.run(
    ["python3", str(apply_redlines), str(original), str(redlines), str(out_docx)],
    text=True,
    capture_output=True,
    timeout=30,
)

combined = proc.stdout + proc.stderr
assert "TOPSECRET_XXE_CANARY" not in combined, "XXE leaked secret file contents!"
assert "Traceback" not in proc.stderr, "crashed with a stacktrace:\n" + proc.stderr
assert "skipping word/header1.xml" in proc.stderr, "did not skip hostile header:\n" + proc.stderr
# body edit still applied normally (exit 0), the hostile part merely skipped.
assert proc.returncode == 0, "unexpected exit %d:\n%s" % (proc.returncode, combined)
assert Document(out_docx).paragraphs[0].text == "The public terms apply."
print("OK")
`;
    const out = execFileSync('python3', ['-c', script, repoRoot], {
      encoding: 'utf8',
      timeout: 40000,
    });
    expect(out.trim().endsWith('OK')).toBe(true);
  });
});
