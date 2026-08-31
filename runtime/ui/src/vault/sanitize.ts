/**
 * The allowlist that stands between a vault file and the page's DOM.
 *
 * Vault files are markdown, and markdown is allowed to contain raw HTML —
 * so a rendered file is UNTRUSTED input that a model wrote, a counterparty
 * sent, or an import dropped in. `marked` does not sanitize (it removed its
 * own sanitizer years ago), and this page renders its output through
 * `dangerouslySetInnerHTML`. This function is therefore the whole security
 * boundary for the vault surface, and it is written as an allowlist: an
 * element or attribute is dropped unless it is named here, so a tag nobody
 * thought about is safe by default rather than dangerous by default.
 *
 * Pure, and separate from the component, so it can be tested against the
 * attacks it exists to stop rather than through a render.
 */

/** Everything a rendered markdown document is allowed to be. `img` is
 * deliberately absent: an image tag is a request the page makes to whatever
 * host the file names, which is both a tracking beacon and an `onerror`
 * carrier, and a lawyer reading a clause does not need it. */
export const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'br',
]);

/**
 * Tags removed WITH their contents, rather than unwrapped.
 *
 * Every other unknown tag is unwrapped — its children survive — because
 * dropping `<div>` should not drop the paragraph inside it. That is exactly
 * the wrong move for these: the "text" inside a `<script>` or a `<style>` is
 * the payload, and unwrapping it would paste the source of an attack into
 * the document as visible prose at best, and re-parse it at worst.
 */
const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'svg',
  'math',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
]);

/** The schemes a link may use. `javascript:` and `data:` are absent on
 * purpose: the first executes on click, the second can carry a whole HTML
 * document that the browser runs in this page's origin. */
const SAFE_SCHEME = /^(?:https?:|mailto:)/i;

/**
 * The href to keep, or `null` to drop the attribute.
 *
 * Control characters and whitespace come out before the scheme is checked,
 * because a browser ignores them when it resolves the URL: `java\tscript:`
 * and `  javascript:` both navigate, and only a comparison made on the
 * stripped string sees that. HTML entities are already decoded — this reads
 * the parsed attribute, not the source text — so `&#106;avascript:` arrives
 * here spelled out.
 *
 * A same-page fragment (`#/vault?path=…`) is dropped with everything else
 * that names no allowed scheme. The chat's source chips do NOT come through
 * here: they are built as elements by the client from the files a step
 * actually read (`v2/chat/cite.ts`), so a `#/vault` link a MODEL or a vault
 * document wrote can never become one.
 */
export function safeHref(raw: string): string | null {
  const stripped = raw.replace(/[\u0000-\u0020\u007f]/g, '');
  return SAFE_SCHEME.test(stripped) ? raw.trim() : null;
}

function cleanAttributes(el: Element): void {
  const tag = el.tagName.toLowerCase();
  // A snapshot: removing an attribute mutates the live `attributes` list.
  for (const name of Array.from(el.attributes, a => a.name)) {
    // `href` on an anchor is the ONLY attribute that survives. That covers
    // `on*` handlers, `style` (which can load remote resources), `srcset`,
    // `formaction`, and every attribute added to HTML after this was
    // written — none of them are named here, so none of them get through.
    if (tag === 'a' && name.toLowerCase() === 'href') continue;
    el.removeAttribute(name);
  }

  if (tag !== 'a') return;
  const href = el.getAttribute('href');
  if (href === null) return;
  const safe = safeHref(href);
  if (safe === null) {
    // The link is dropped, not the text: the reader still sees what the
    // document said, without a way to follow it somewhere it should not go.
    el.removeAttribute('href');
    return;
  }
  el.setAttribute('href', safe);
  // A vault file opens in its own tab, and `noopener` keeps the opened page
  // from reaching back into this one through `window.opener`.
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener noreferrer');
}

const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

function cleanChildren(node: Node): void {
  // A snapshot again: this loop unwraps and removes as it goes, and a live
  // `childNodes` would skip the node that slid into the vacated index.
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Clean the subtree BEFORE it is lifted out: once the children are in
      // the parent, this loop has already walked past their position.
      cleanChildren(el);
      const parent = el.parentNode;
      if (parent === null) continue;
      while (el.firstChild !== null) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }

    cleanAttributes(el);
    cleanChildren(el);
  }
}

/**
 * `html` with everything outside the allowlist removed.
 *
 * The parse is `DOMParser`, not an `innerHTML` assignment into the live
 * document: a detached document never runs a script, never fetches an
 * image, and never fires a load handler, so nothing in the input has run by
 * the time it is inspected. What comes back is serialized HTML, safe to
 * hand to `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  cleanChildren(doc.body);
  return doc.body.innerHTML;
}
