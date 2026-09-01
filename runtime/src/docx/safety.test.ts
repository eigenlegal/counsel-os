import { describe, expect, test } from 'bun:test';
import { assertSafeXml, MalformedXmlError, parseXml, UnsafeXmlError } from './safety';

// The payloads from browse/src/docx-xxe.test.ts (cou-43), now asserted
// against the TypeScript guard instead of the Python one.
const BILLION_LAUGHS = `<?xml version="1.0"?>
<!DOCTYPE lolz [
 <!ENTITY lol "lol">
 <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
 <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<root>&lol3;</root>`;

const XXE = `<?xml version="1.0"?>
<!DOCTYPE r [ <!ENTITY x SYSTEM "file:///etc/hostname"> ]>
<root>&x;</root>`;

const BENIGN = '<?xml version="1.0"?><w:p xmlns:w="urn:x"><w:t>hi</w:t></w:p>';

describe('assertSafeXml', () => {
  test('refuses billion laughs before any expansion', () => {
    expect(() => assertSafeXml(BILLION_LAUGHS, 'word/document.xml')).toThrow(UnsafeXmlError);
  });

  test('refuses an external entity (XXE)', () => {
    expect(() => parseXml(XXE, 'word/header1.xml')).toThrow(UnsafeXmlError);
  });

  test('any casing, and after a leading comment', () => {
    expect(() => assertSafeXml('<!-- hi --><!doctype r><r/>', 'x')).toThrow(UnsafeXmlError);
    expect(() => assertSafeXml('<!DocType r><r/>', 'x')).toThrow(UnsafeXmlError);
  });

  test('the error names the part', () => {
    try {
      parseXml(XXE, 'word/footnotes.xml');
      throw new Error('did not throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UnsafeXmlError);
      expect((err as UnsafeXmlError).partName).toBe('word/footnotes.xml');
      expect((err as Error).message).toContain('word/footnotes.xml');
    }
  });
});

describe('parseXml', () => {
  test('a benign OOXML part parses to a DOM', () => {
    const doc = parseXml(BENIGN, 'word/document.xml');
    expect(doc.documentElement?.localName).toBe('p');
    expect(doc.documentElement?.namespaceURI).toBe('urn:x');
    expect(doc.documentElement?.textContent).toBe('hi');
  });

  test('malformed XML is an error naming the part, not a partial tree', () => {
    expect(() => parseXml('<w:p><w:t>unclosed', 'word/document.xml')).toThrow(MalformedXmlError);
  });
});
