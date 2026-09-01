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

/**
 * The bypass classes, one test each.
 *
 * These are the payloads that get past a naive tag blocklist — foreign
 * content that re-enters HTML parsing, raw-text elements whose contents are
 * re-parsed when they are unwrapped, and attributes that navigate without
 * being called `href`. None of them is a hypothetical: every one is a
 * documented sanitizer bypass. They pass today; the point of writing them
 * down is that a defense nobody asserts regresses silently.
 */
describe('sanitizeHtml — bypass classes', () => {
  test('SVG foreign content is removed whole, script and all', () => {
    // The parse ALREADY drops what follows an `<svg>` that contains a
    // `<script>` (a happy-dom quirk — a browser would keep it), so the text
    // that proves the document survived has to come before the payload.
    const html = sanitizeHtml('<p>before</p><svg><script>alert(1)</script></svg>');
    expect(html).toBe('<p>before</p>');
  });

  test('an SVG event attribute never reaches the DOM', () => {
    const html = sanitizeHtml('<svg><animate onbegin="alert(1)" attributeName="x"/></svg><p>safe</p>');
    expect(html).toBe('<p>safe</p>');
    expect(html).not.toContain('onbegin');
  });

  test('an SVG link with an xlink:href cannot smuggle a scheme in', () => {
    // `xlink:href` is not `href`, so a sanitizer that only checks `href`
    // lets `javascript:` straight through. This one drops the whole subtree.
    const html = sanitizeHtml('<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg><p>safe</p>');
    expect(html).toBe('<p>safe</p>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('xlink');
  });

  test('MathML is removed, including the mtext/style mXSS payload', () => {
    expect(sanitizeHtml('<math><mi xlink:href="javascript:alert(1)">click</mi></math><p>safe</p>')).toBe('<p>safe</p>');
    // The classic mXSS: a `<style>` inside `<mtext>` changes how the rest of
    // the string re-parses.
    const mxss = sanitizeHtml('<math><mtext><style><img src=x onerror=alert(1)></style></mtext></math><p>safe</p>');
    expect(mxss).toBe('<p>safe</p>');
    expect(mxss).not.toContain('onerror');
  });

  test('a form, its inputs, and every formaction go away', () => {
    const html = sanitizeHtml(
      '<form action="/x"><input formaction="javascript:alert(1)" value="go"><button formaction="javascript:alert(1)">go</button></form><p>safe</p>',
    );
    expect(html).toBe('<p>safe</p>');
    expect(html).not.toContain('formaction');
    expect(html).not.toContain('<input');
  });

  test('an iframe srcdoc cannot carry a document in on an attribute', () => {
    const html = sanitizeHtml('<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe><p>safe</p>');
    expect(html).toBe('<p>safe</p>');
    expect(html).not.toContain('srcdoc');
  });

  test('noscript is removed with its contents, payload and all', () => {
    // `DOMParser` parses with scripting disabled, so a `<noscript>` body is
    // real markup here and inert text in the browser that renders it — the
    // mismatch is the bypass. Dropping the subtree settles it either way.
    expect(sanitizeHtml('<noscript><p>hidden</p></noscript><p>safe</p>')).toBe('<p>safe</p>');
    const mxss = sanitizeHtml('<noscript><p title="</noscript><img src=x onerror=alert(1)>">t</p></noscript><p>safe</p>');
    expect(mxss).toBe('<p>safe</p>');
    expect(mxss).not.toContain('onerror');
  });

  test('raw-text containers do not re-animate the markup inside them', () => {
    // `xmp`, `noembed` and `textarea` hold their contents as TEXT. Unwrap
    // one carelessly and the `<img>` inside becomes an element again.
    for (const tag of ['xmp', 'noembed', 'noframes', 'listing', 'textarea', 'template']) {
      const html = sanitizeHtml(`<${tag}><img src=x onerror=alert(1)></${tag}><p>safe</p>`);
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('<img');
    }
  });

  test('an entity-encoded javascript scheme is still a javascript scheme', () => {
    // The attribute is decoded by the parser, so `&#106;` is a `j` by the
    // time it is checked — which is exactly why the check must read the
    // PARSED attribute and never the source text.
    for (const href of ['&#106;avascript:alert(1)', 'jav&#x09;ascript:alert(1)', '&#74;avaScript:alert(1)']) {
      const html = sanitizeHtml(`<a href="${href}">x</a>`);
      expect(html).toBe('<a>x</a>');
      expect(html.toLowerCase()).not.toContain('javascript');
    }
  });

  test('an anchor that keeps its href keeps NOTHING else', () => {
    // `ping` fires a request on click and `download` renames a drive-by
    // file; neither is on the allowlist, and `target` is overwritten rather
    // than trusted.
    const html = sanitizeHtml(
      '<a href="https://ok.example" onclick="alert(1)" ping="https://evil.example" download target="_self" id="x">x</a>',
    );
    expect(html).toBe('<a href="https://ok.example" target="_blank" rel="noopener noreferrer">x</a>');
  });

  test('a quote in an href cannot break out into a new attribute', () => {
    const html = sanitizeHtml('<a href=\'https://ok.example"onmouseover="alert(1)\'>x</a>');
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain('&quot;');
  });

  test('sanitizing twice changes nothing', () => {
    // Anything that only survives one pass is a re-parse bug waiting to be
    // found by a browser that normalizes differently.
    const once = sanitizeHtml('<div><p>a <a href="https://x.example">b</a></p><script>alert(1)</script></div>');
    expect(sanitizeHtml(once)).toBe(once);
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

describe('same-page fragments (the chat source chips do not come through here)', () => {
  test('a #/vault link renders as inert text — the href is dropped', () => {
    const html = sanitizeHtml('<p><a href="#/vault?path=practice%2Fsecret.md">secret.md</a></p>');
    const a = new DOMParser().parseFromString(html, 'text/html').querySelector('a')!;
    expect(a.hasAttribute('href')).toBe(false);
    // The text survives; only the way to follow it does not.
    expect(a.textContent).toBe('secret.md');
  });

  test('a scheme hiding in front of a fragment still dies', () => {
    expect(safeHref('#/vault?path=x')).toBeNull();
    expect(safeHref('javascript:alert(1)#/vault')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>#/vault')).toBeNull();
    expect(safeHref('//evil.example/#/vault')).toBeNull();
    expect(safeHref('java\tscript:alert(1)#/vault')).toBeNull();
  });

  test('an external link keeps its pre-existing behaviour: a new tab, noopener', () => {
    // Unchanged by this work, asserted so a future reader knows it is the
    // documented markdown-link design and not an oversight.
    expect(safeHref('https://evil.example/#/vault')).toBe('https://evil.example/#/vault');
    const html = sanitizeHtml('<a href="https://evil.example/#/vault">x</a>');
    expect(html).toBe('<a href="https://evil.example/#/vault" target="_blank" rel="noopener noreferrer">x</a>');
  });
});

describe('a converted Word document (ins/del/comment)', () => {
  test('ins and del survive, bare; a span keeps only the comment class', () => {
    const html = sanitizeHtml('<p>Term: <del onclick="x()">two</del><ins style="color:red">one</ins> <span class="v2-comment" data-x="1">why</span> <span class="evil">plain</span></p>');
    expect(html).toBe('<p>Term: <del>two</del><ins>one</ins> <span class="v2-comment">why</span> plain</p>');
  });
});

describe('criticToHtml / renderDocxMarkdown', () => {
  test('CriticMarkup becomes the redline elements and a comment note, escaped, not parsed as markdown', async () => {
    const { criticToHtml, renderDocxMarkdown } = await import('./markdown');
    expect(criticToHtml('a {++b *c*++} {--<d>--} {>>e (R, 2026-08-28)<<}')).toBe(
      'a <ins>b *c*</ins> <del>&lt;d&gt;</del> <span class="v2-comment">e (R, 2026-08-28)</span>',
    );
    const html = renderDocxMarkdown('## 2. Term\n\nLasts {--two--}{++one++} year. {>>ok<<}\n');
    expect(html).toContain('<h2>2. Term</h2>');
    expect(html).toContain('<del>two</del><ins>one</ins>');
    expect(html).toContain('<span class="v2-comment">ok</span>');
  });
});
