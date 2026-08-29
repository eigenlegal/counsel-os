import { marked } from 'marked';
import { sanitizeHtml } from './sanitize';

/** Files rendered as markdown. Everything else is shown as plain text —
 * a `.json` or a `.txt` read as markdown would silently lose its own
 * punctuation to emphasis and heading rules. */
const MARKDOWN = /\.(?:md|markdown|mdx)$/i;

export function isMarkdown(path: string): boolean {
  return MARKDOWN.test(path);
}

/**
 * One vault file as HTML that is safe to insert.
 *
 * `marked` is synchronous here (`async: false`) because the caller renders
 * during React's render pass, and `breaks: true` because vault notes are
 * written by people and by models who mean a newline to be a newline.
 *
 * The sanitizer is NOT optional and NOT configurable: `marked` passes raw
 * HTML in the source straight through, so every path from a vault file to
 * the DOM goes through the allowlist. Keep these two calls together — a
 * caller that reached for `marked.parse` on its own would be the hole.
 */
export function renderMarkdown(source: string): string {
  return sanitizeHtml(marked.parse(source, { async: false, breaks: true }));
}
