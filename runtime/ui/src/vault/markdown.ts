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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The runtime converts a Word document to markdown with its tracked changes
 * and comments in CriticMarkup — `{++inserted++}`, `{--deleted--}`,
 * `{>>comment<<}` — the dialect the model reads. For the page those become
 * the redline's own elements (`<ins>`, `<del>`) and a quiet comment note,
 * BEFORE `marked` runs, so the sanitizer still sees every byte on the way
 * to the DOM. The text inside a mark is HTML-escaped here and is not parsed
 * as markdown — a change to a clause is prose, and `*` in a deleted price
 * must not become emphasis.
 */
export function criticToHtml(source: string): string {
  return source
    .replace(/\{\+\+([\s\S]*?)\+\+\}/g, (_m, t: string) => `<ins>${escapeHtml(t)}</ins>`)
    .replace(/\{--([\s\S]*?)--\}/g, (_m, t: string) => `<del>${escapeHtml(t)}</del>`)
    .replace(/\{>>([\s\S]*?)<<\}/g, (_m, t: string) => `<span class="v2-comment">${escapeHtml(t)}</span>`);
}

/** A converted Word document as HTML: the change marks first, then the
 * same markdown path — and the same sanitizer — as every vault file. */
export function renderDocxMarkdown(source: string): string {
  return renderMarkdown(criticToHtml(source));
}
