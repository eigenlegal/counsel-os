/**
 * The one place a DOM is made from a Word package part.
 *
 * A `.docx` that arrives for review was written by a counterparty, so every
 * XML part inside it is untrusted. Two classic attacks ride on the DTD: an
 * external entity that reads a local file into the document (XXE), and an
 * entity that expands into gigabytes (billion laughs). Both need a
 * `<!DOCTYPE`. Office never writes one, so any part that carries one is
 * refused before a parser sees it — the same rule `scripts/xml_safety.py`
 * enforced for the Python pipeline (cou-43).
 *
 * `parseXml` is the only function in `runtime/src/docx` allowed to construct
 * a `DOMParser`; a second parse site would be a second place to forget the
 * check.
 */
import { DOMParser } from '@xmldom/xmldom';

export class UnsafeXmlError extends Error {
  readonly partName: string;
  constructor(partName: string, reason: string) {
    super(`${partName}: ${reason}`);
    this.name = 'UnsafeXmlError';
    this.partName = partName;
  }
}

export class MalformedXmlError extends Error {
  readonly partName: string;
  constructor(partName: string, reason: string) {
    super(`${partName}: ${reason}`);
    this.name = 'MalformedXmlError';
    this.partName = partName;
  }
}

/** Case-insensitive, anywhere in the text — a DOCTYPE after a leading
 * comment or processing instruction is still a DOCTYPE. */
const DOCTYPE = /<!doctype/i;

export function assertSafeXml(text: string, partName: string): void {
  if (DOCTYPE.test(text)) {
    throw new UnsafeXmlError(partName, 'refused: the part declares a DOCTYPE (external entities or entity expansion)');
  }
}

/** `text` as a DOM, after the safety check. A malformed part is an error
 * naming the part, never a half-built tree. */
export function parseXml(text: string, partName: string): Document {
  assertSafeXml(text, partName);
  const problems: string[] = [];
  const parser = new DOMParser({
    onError: (level, message) => {
      if (level === 'fatalError' || level === 'error') problems.push(message);
    },
  });
  let doc: Document;
  try {
    doc = parser.parseFromString(text, 'application/xml');
  } catch (err) {
    // xmldom throws on its own for some faults (an unbound prefix, a broken
    // DOM build) and reports others through `onError`; both are one error.
    throw new MalformedXmlError(partName, err instanceof Error ? err.message : String(err));
  }
  if (problems.length > 0 || doc.documentElement === null) {
    throw new MalformedXmlError(partName, problems[0] ?? 'no document element');
  }
  return doc;
}
