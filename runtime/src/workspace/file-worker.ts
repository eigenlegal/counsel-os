/** Private parser entrypoint, receives original bytes only on stdin. Never open document URLs. */
import { unzipSync } from 'fflate';
import { openDocx } from '../docx/package';
import { docxToMarkdown } from '../docx/markdown';
import type { ExtractedFile } from './files';
import { readPdfResource } from './pdf-resources';

class ImportFailure extends Error {}
const warnings: string[] = [];
// PDF.js diagnostics may contain extracted material. Keep only a generic coverage warning.
function restrictWorker(): void {
console.log =
  console.warn =
  console.error =
    () => {
      if (!warnings.length)
        warnings.push(
          'The parser reported a warning. Check the original before relying on this extraction.',
        );
    };
globalThis.fetch = Object.assign(
  async () => {
    throw new ImportFailure('External document resources are not fetched.');
  },
  { preconnect: () => {} },
);
}

async function extract(bytes: Uint8Array, extension: string): Promise<ExtractedFile> {
  if (!bytes.length || bytes.length > 25_000_000)
    throw new ImportFailure('Choose a nonempty document of 25 MB or less.');
  if (extension === 'docx') {
    let total = 0,
      count = 0;
    const names = new Set<string>();
    try {
      unzipSync(bytes, {
        filter: (entry) => {
          total += entry.originalSize;
          count++;
          if (total > 40_000_000 || entry.originalSize > 12_000_000 || count > 2000)
            throw new ImportFailure(
              'This Word package expands beyond the import limits. Save a smaller copy.',
            );
          if (names.has(entry.name) || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(entry.name))
            throw new ImportFailure(
              'This Word package has ambiguous or unsafe part names. Save a new .docx copy.',
            );
          names.add(entry.name);
          return false;
        },
      });
      const pkg = openDocx(bytes);
      const result = docxToMarkdown(pkg, { changes: 'all', comments: true });
      const omissions = [...new Set(result.warnings)];
      if (
        pkg
          .partNames()
          .some((name) =>
            /^word\/(header|footer|footnotes|endnotes|embeddings|vbaProject)/.test(name),
          )
      )
        omissions.push(
          'Headers, footers, footnotes, endnotes and embedded objects are not included in the body extraction.',
        );
      if (result.markdown.length > 1_000_000)
        throw new ImportFailure(
          'The extracted text exceeds one million characters. Import a smaller copy.',
        );
      const body = result.markdown.trim() ? result.markdown : null;
      return {
        body,
        textStatus: body === null ? 'unavailable' : omissions.length ? 'partial' : 'ready',
        mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extraction: {
          parser: 'counsel-docx-v1',
          notes: [
            'Body text, numbering and tables are extracted. Visual layout is not reproduced.',
            'Tracked insertions use {++…++}, deletions {--…--}, and comments {>>…<<}. Changes have not been accepted or rejected.',
            ...omissions.slice(0, 90).map((n) => n.slice(0, 1000)),
            ...(body ? [] : ['No readable body text was found. Images are not OCRed.']),
          ],
          sections: [],
        },
      };
    } catch (e) {
      if (e instanceof ImportFailure) throw e;
      throw new ImportFailure(
        'This Word file could not be safely read. It may be damaged, encrypted, or not a .docx. Save a new .docx copy.',
      );
    }
  }
  if (extension !== 'pdf' || !new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-'))
    throw new ImportFailure('This file is not a readable PDF.');
  const { getDocument, version } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Explicitly bundle the PDF.js worker implementation. Its default dynamic
  // sibling-file import otherwise depends on node_modules after compilation.
  const { WorkerMessageHandler } = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = { WorkerMessageHandler };
  class BundledData {
    async fetch({ kind, filename }: { kind: string; filename: string }) {
      return readPdfResource(kind, filename);
    }
  }
  const task = getDocument({
    data: bytes,
    stopAtErrors: true,
    useWorkerFetch: false,
    useSystemFonts: false,
    disableFontFace: true,
    useWasm: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    enableXfa: false,
    BinaryDataFactory: BundledData,
    verbosity: 1,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 300)
      throw new ImportFailure(
        'PDFs up to 300 pages are supported. Split this document into smaller files.',
      );
    let body = '',
      hasText = false;
    const sections: ExtractedFile['extraction']['sections'] = [],
      missing: number[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .trim();
      if (text) hasText = true;
      else missing.push(n);
      const start = body.length;
      body += `Page ${n}\n${text}\n\n`;
      sections.push({ label: `Page ${n}`, start, end: body.length });
      if (body.length > 1_000_000)
        throw new ImportFailure(
          'The extracted text exceeds one million characters. Import a smaller PDF.',
        );
      page.cleanup();
    }
    return {
      body: hasText ? body : null,
      textStatus: !hasText
        ? 'unavailable'
        : missing.length || warnings.length
          ? 'partial'
          : 'ready',
      mediaType: 'application/pdf',
      extraction: {
        parser: `pdfjs-${version}`,
        pages: pdf.numPages,
        sections: hasText ? sections : [],
        notes: [
          'Text extraction only. Images, handwriting, signatures, annotations, form values and visual layout are not analyzed. Reading order may differ from the original.',
          ...(missing.length
            ? [
                `No extractable text on pages ${missing.join(', ')}. They may be blank or require OCR; OCR is not connected yet.`.slice(
                  0,
                  1000,
                ),
              ]
            : []),
          ...warnings,
        ],
      },
    };
  } catch (e) {
    if (e instanceof ImportFailure) throw e;
    if (e instanceof Error && e.name === 'PasswordException')
      throw new ImportFailure(
        'This PDF requires a password. Save an unlocked copy and import it; Counsel does not retain PDF passwords.',
      );
    throw new ImportFailure(
      'This PDF could not be read completely. It may be damaged or use unsupported features. Try exporting a new PDF.',
    );
  } finally {
    await task.destroy();
  }
}

export async function runFileWorker(extension: string): Promise<void> {
  restrictWorker();
  try {
    const bytes = new Uint8Array(await Bun.stdin.arrayBuffer());
    await Bun.write(Bun.stdout, JSON.stringify(await extract(bytes, extension)));
  } catch (e) {
    await Bun.write(
      Bun.stdout,
      JSON.stringify({
        error:
          e instanceof ImportFailure
            ? e.message
            : 'This document could not be extracted safely. Try a new copy.',
      }),
    );
  }
}
if (import.meta.main) await runFileWorker(process.argv[2] ?? '');
