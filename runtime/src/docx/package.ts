/**
 * A `.docx` is a zip of XML parts. This wraps one: the parts by name, a DOM
 * for any part on demand (through `safety.ts`, always), and `save()` back to
 * bytes. Parts that were never parsed — or parsed but never changed — go
 * back out as the exact bytes they came in with, so a read-only pass is a
 * byte-for-byte round trip for everything but the parts the caller edited.
 */
import { unzipSync, zipSync } from 'fflate';
import { XMLSerializer, type Document, type Node } from '@xmldom/xmldom';
import { parseXml } from './safety';

export const DOCUMENT_PART = 'word/document.xml';
export const NUMBERING_PART = 'word/numbering.xml';
export const COMMENTS_PART = 'word/comments.xml';
export const STYLES_PART = 'word/styles.xml';

export class NotADocxError extends Error {
  constructor(reason: string) {
    super(`not a Word document: ${reason}`);
    this.name = 'NotADocxError';
  }
}

/** Zip timestamps must fall in 1980–2099; a fixed one keeps saves deterministic. */
const FIXED_MTIME = new Date(Date.UTC(2000, 0, 1));

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

export class DocxPackage {
  private readonly raw: Record<string, Uint8Array>;
  private readonly parsed = new Map<string, Document>();
  private readonly dirty = new Set<string>();

  private constructor(raw: Record<string, Uint8Array>) {
    this.raw = raw;
  }

  /** Opens the package. Only the zip container and the presence of
   * `word/document.xml` are checked here; parts parse lazily, so a hostile
   * header does not stop a caller that never reads headers. */
  static open(bytes: Uint8Array): DocxPackage {
    let raw: Record<string, Uint8Array>;
    try {
      raw = unzipSync(bytes);
    } catch (err) {
      throw new NotADocxError(`not a zip archive (${err instanceof Error ? err.message : String(err)})`);
    }
    if (raw[DOCUMENT_PART] === undefined) throw new NotADocxError('no word/document.xml part');
    return new DocxPackage(raw);
  }

  partNames(): string[] {
    return Object.keys(this.raw).sort();
  }

  hasPart(name: string): boolean {
    return this.raw[name] !== undefined;
  }

  /** The part's bytes as they will be saved: the DOM's serialization when
   * the part was edited, the original bytes otherwise. */
  partBytes(name: string): Uint8Array {
    const bytes = this.raw[name];
    if (bytes === undefined) throw new Error(`no such part: ${name}`);
    return bytes;
  }

  partText(name: string): string {
    return decoder.decode(this.partBytes(name));
  }

  /** The part as a DOM. Cached; the safety check runs on first parse. */
  part(name: string): Document {
    const cached = this.parsed.get(name);
    if (cached !== undefined) return cached;
    const doc = parseXml(this.partText(name), name);
    this.parsed.set(name, doc);
    return doc;
  }

  get document(): Document {
    return this.part(DOCUMENT_PART);
  }

  /** Marks a parsed part as changed, so `save()` serializes its DOM. */
  touch(name: string): void {
    if (!this.parsed.has(name)) throw new Error(`touch: ${name} is not parsed`);
    this.dirty.add(name);
  }

  /** Replaces a part outright — a new comments part, a rewritten rels file. */
  setPart(name: string, content: string | Uint8Array): void {
    this.raw[name] = typeof content === 'string' ? encoder.encode(content) : content;
    this.parsed.delete(name);
    this.dirty.delete(name);
  }

  save(): Uint8Array {
    const out: Record<string, [Uint8Array, { level: 0 | 6; mtime: Date }]> = {};
    for (const name of Object.keys(this.raw)) {
      let bytes = this.raw[name]!;
      if (this.dirty.has(name)) {
        const doc = this.parsed.get(name)!;
        bytes = encoder.encode(new XMLSerializer().serializeToString(doc));
        this.raw[name] = bytes;
      }
      out[name] = [bytes, { level: name.endsWith('.xml') || name.endsWith('.rels') ? 6 : 0, mtime: FIXED_MTIME }];
    }
    this.dirty.clear();
    return zipSync(out);
  }
}

export function openDocx(bytes: Uint8Array): DocxPackage {
  return DocxPackage.open(bytes);
}

/** Serialize any element — used by tests to compare document trees
 * canonically, and by callers that need a part's XML as text. */
export function serialize(node: Node): string {
  return new XMLSerializer().serializeToString(node);
}
