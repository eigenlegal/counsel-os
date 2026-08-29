import '../test/dom';

import { describe, expect, test } from 'bun:test';
import { renderMarkdown } from './markdown';
import { safeHref, sanitizeHtml } from './sanitize';

/**
 * The attacks this exists to stop, written as tests.
 *
 * A vault file is untrusted: a model wrote it, or an import dropped it in,
 * and the page renders it as HTML. Every case below is a real payload — if
 * one of them starts passing, the vault surface is an XSS hole.
 */
describe('sanitizeHtml', () => {
  test('keeps the allowed structure of a document', () => {
    const html = sanitizeHtml(
      '<h1>Indemnification</h1><p>The cap is <strong>mutual</strong>.</p><ul><li>one</li></ul><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>',
    );
    expect(html).toContain('<h1>Indemnification</h1>');
    expect(html).toContain('<strong>mutual</strong>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<td>b</td>');
  });

  test('removes a script with its contents', () => {
    const html = sanitizeHtml('<p>before</p><script>alert(1)</script><p>after</p>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('<p>before</p>');
    expect(html).toContain('<p>after</p>');
  });

  test('removes a style block, an iframe, and an object', () => {
    const html = sanitizeHtml(
      // No `src` on the iframe on purpose: happy-dom eagerly loads one even
      // in a detached document, and this test is about the tag going away.
      '<style>body{background:url(http://x/)}</style><iframe></iframe><object data="x"></object><p>text</p>',
    );
    expect(html).toBe('<p>text</p>');
  });

  test('removes an image and its onerror handler', () => {
    const html = sanitizeHtml('<p>a<img src="x" onerror="alert(1)">b</p>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('a');
    expect(html).toContain('b');
  });

  test('strips every event handler and style attribute from an allowed tag', () => {
    const html = sanitizeHtml('<p onclick="alert(1)" onmouseover="x()" style="position:fixed" class="c">text</p>');
    expect(html).toBe('<p>text</p>');
  });

  test('drops a javascript: href but keeps the link text', () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('href');
    expect(html).toContain('click');
  });

  test('keeps an http(s) href and hardens the target', () => {
    const html = sanitizeHtml('<a href="https://example.com/x">link</a>');
    expect(html).toContain('href="https://example.com/x"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test('keeps a mailto href', () => {
    expect(sanitizeHtml('<a href="mailto:a@b.example">mail</a>')).toContain('href="mailto:a@b.example"');
  });

  test('unwraps an unknown tag rather than losing its text', () => {
    expect(sanitizeHtml('<div><section><p>kept</p></section></div>')).toBe('<p>kept</p>');
  });

  test('removes comments', () => {
    expect(sanitizeHtml('<p>a</p><!-- secret -->')).toBe('<p>a</p>');
  });
});

describe('safeHref', () => {
  test('accepts http, https and mailto', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('mailto:a@b.example')).toBe('mailto:a@b.example');
  });

  test('rejects javascript:, data: and vbscript:, however it is spelled', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
    // A browser ignores the whitespace and the tab; so does this.
    expect(safeHref('  javascript:alert(1)')).toBeNull();
    expect(safeHref('java\tscript:alert(1)')).toBeNull();
    expect(safeHref('java\nscript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
  });

  test('rejects a relative path — the vault is not the web', () => {
    expect(safeHref('../secrets.md')).toBeNull();
    expect(safeHref('//evil.example/x')).toBeNull();
  });
});

describe('renderMarkdown', () => {
  test('renders headings and lists', () => {
    const html = renderMarkdown('# Title\n\n- one\n- two\n');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>one</li>');
  });

  test('renders emphasis and inline code', () => {
    const html = renderMarkdown('a *b* and `c`');
    expect(html).toContain('<em>b</em>');
    expect(html).toContain('<code>c</code>');
  });

  test('raw HTML embedded in the markdown is sanitized too', () => {
    const html = renderMarkdown('# Title\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>\n');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
  });

  test('a markdown link to javascript: loses its href', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('click');
  });
});
