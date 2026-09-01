import { describe, expect, test } from 'bun:test';
import { zipSync } from 'fflate';
import { DOCUMENT_PART, NotADocxError, openDocx, serialize } from './package';
import { UnsafeXmlError } from './safety';
import { buildDocx, simpleDocx } from './test/builder';

describe('openDocx', () => {
  test('lists the parts and parses document.xml on demand', () => {
    const pkg = openDocx(simpleDocx('Hello', 'World'));
    expect(pkg.partNames()).toContain(DOCUMENT_PART);
    expect(pkg.partNames()).toContain('[Content_Types].xml');
    const body = pkg.document.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'body');
    expect(body.length).toBe(1);
    expect(pkg.document.documentElement?.textContent).toBe('HelloWorld');
  });

  test('a zip without word/document.xml is not a Word document', () => {
    const bytes = zipSync({ 'hello.txt': new TextEncoder().encode('hi') });
    expect(() => openDocx(bytes)).toThrow(NotADocxError);
  });

  test('random bytes are not a Word document', () => {
    expect(() => openDocx(new TextEncoder().encode('%PDF-1.4 nope'))).toThrow(NotADocxError);
  });

  test('a hostile part is refused when parsed, naming the part — and opening is still fine', () => {
    const hostile =
      '<?xml version="1.0"?><!DOCTYPE hdr [ <!ENTITY leak SYSTEM "file:///etc/hostname"> ]>' +
      '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>&leak;</w:t></w:r></w:p></w:hdr>';
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['body'] }], rawParts: { 'word/header1.xml': hostile } }));
    expect(pkg.document.documentElement?.textContent).toBe('body');
    expect(() => pkg.part('word/header1.xml')).toThrow(UnsafeXmlError);
    try {
      pkg.part('word/header1.xml');
    } catch (err) {
      expect((err as UnsafeXmlError).partName).toBe('word/header1.xml');
    }
  });
});

describe('save', () => {
  test('an untouched package round-trips every part byte for byte', () => {
    const original = buildDocx({
      blocks: [{ style: 'Heading1', runs: ['Title'] }, { runs: ['Body ', { text: 'bold', bold: true }] }],
      numbering: { '1': [{ lvlText: '%1.' }] },
      comments: [{ id: '0', author: 'R', date: '2026-01-01T00:00:00Z', text: 'hi' }],
    });
    const pkg = openDocx(original);
    // Parse a couple of parts: reading must not dirty them.
    void pkg.document;
    void pkg.part('word/numbering.xml');
    const saved = openDocx(pkg.save());
    expect(saved.partNames()).toEqual(pkg.partNames());
    for (const name of pkg.partNames()) {
      expect(Buffer.from(saved.partBytes(name)).equals(Buffer.from(openDocx(original).partBytes(name)))).toBe(true);
    }
  });

  test('a touched document.xml is re-serialized and canonically equal to its DOM', () => {
    const pkg = openDocx(simpleDocx('Hello'));
    const t = pkg.document.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't')[0]!;
    t.textContent = 'Goodbye';
    pkg.touch(DOCUMENT_PART);
    const saved = openDocx(pkg.save());
    expect(saved.document.documentElement?.textContent).toBe('Goodbye');
    expect(serialize(saved.document.documentElement!)).toBe(serialize(pkg.document.documentElement!));
  });

  test('setPart replaces a part and drops any parsed copy', () => {
    const pkg = openDocx(simpleDocx('Hello'));
    pkg.setPart('word/extra.xml', '<?xml version="1.0"?><x/>');
    expect(pkg.hasPart('word/extra.xml')).toBe(true);
    expect(openDocx(pkg.save()).partText('word/extra.xml')).toContain('<x/>');
  });
});
