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
});
