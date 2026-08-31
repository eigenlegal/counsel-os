/**
 * Source chips (spec §3.3) — DERIVED, and only derived.
 *
 * A chip is a provenance affordance: it says "this answer read that file".
 * So the set of chips is built here, on the client, from the `vault_read`
 * calls the step actually made — never from anything the model wrote. The
 * sanitizer drops same-page `#/…` hrefs (`vault/sanitize.ts`), so a
 * `[nda.md](#/vault?path=…)` link a model or a vault document authored
 * renders as inert text: it cannot borrow the chip's look and it cannot
 * open the drawer.
 *
 * The mark is added AFTER the sanitizer, by exact-matching a code span's
 * text against the derived spellings and inserting one fixed literal
 * attribute. Nothing of the model's text is interpolated into markup, and
 * the pattern only matches a bare `<code>` — which is the only shape the
 * allowlist can produce, since it strips every attribute a document carries.
 */
import type { ToolCallView } from '../../chat/turns';

export function readPathsOf(tools: ToolCallView[]): string[] {
  const out: string[] = [];
  for (const tool of tools) {
    if (tool.name !== 'vault_read') continue;
    const input = tool.input;
    if (typeof input !== 'object' || input === null) continue;
    const path = (input as Record<string, unknown>)['path'];
    if (typeof path === 'string' && path !== '' && !out.includes(path)) out.push(path);
  }
  return out;
}

function baseOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * How the answer may spell each read file → the path a click opens. The full
 * path always; the bare basename only when ONE read file answers to it — two
 * files called `nda.md` in one turn would otherwise give a chip that points
 * at the wrong one, and a citation to the wrong file is worse than none.
 */
export function citationMap(readPaths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const path of readPaths) map.set(path, path);
  const counts = new Map<string, number>();
  for (const path of readPaths) counts.set(baseOf(path), (counts.get(baseOf(path)) ?? 0) + 1);
  for (const path of readPaths) {
    const base = baseOf(path);
    if (counts.get(base) === 1 && !map.has(base)) map.set(base, path);
  }
  return map;
}

/** Only a code span with no attributes — the one shape the allowlist emits. */
const CODE_SPAN = /<code>([^<]*)<\/code>/g;

/** The entities the sanitizer's serializer writes in text position. `&amp;`
 * comes last, or `&amp;lt;` would decode into a tag that was never there. */
function decodeText(html: string): string {
  return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** `<code>nda.md</code>` → a chip, when and only when `nda.md` is a spelling
 * of a file this step read. */
export function markCitations(html: string, spellings: ReadonlySet<string>): string {
  if (spellings.size === 0) return html;
  return html.replace(CODE_SPAN, (whole, inner: string) =>
    spellings.has(decodeText(inner)) ? `<code class="v2-cite">${inner}</code>` : whole,
  );
}
