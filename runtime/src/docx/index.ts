/**
 * The Word-document module's public surface. Everything a tool, a route, or
 * the CLI needs is exported from here; the internals (`model`, `safety`)
 * stay reachable for tests and for stage 2 (the write path).
 */
export { checkDocx, checkText, detectFormat, renderReport, type CheckReport, type DocFormat, type Finding } from './check';
export { extractRedlines, extractToMarkdown, type ChangeRecord, type CommentRecord, type ExtractResult } from './extract';
export { docxToMarkdown, type ChangesMode, type MarkdownOptions, type MarkdownResult } from './markdown';
export { commentsOf, modelOf, textOf, type DocxComment, type DocxModel, type DocxParagraph, type DocxRun } from './model';
export { DocxPackage, NotADocxError, openDocx } from './package';
export { MalformedXmlError, UnsafeXmlError } from './safety';

/** `.docx`, in any casing. */
export function isDocxPath(path: string): boolean {
  return /\.docx$/i.test(path);
}

export const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
