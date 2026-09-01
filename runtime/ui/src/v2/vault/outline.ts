/** The reading pane's outline column (spec §3.4): the body's H2s, in order.
 * Fenced code is skipped so an example heading is not a section. */
/** CriticMarkup a converted Word document carries (`{++ins++}`, `{--del--}`,
 * `{>>comment<<}`, `{~~a~>b~~}`), read the way the page renders it:
 * insertions kept, deletions and comments dropped, substitutions resolved to
 * their new text. The outline is a list of headings, not a redline. */
export function stripCritic(text: string): string {
  return text
    .replace(/\{\+\+([\s\S]*?)\+\+\}/g, '$1')
    .replace(/\{--[\s\S]*?--\}/g, '')
    .replace(/\{>>[\s\S]*?<<\}/g, '')
    .replace(/\{~~[\s\S]*?~>([\s\S]*?)~~\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function outlineOf(body: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^##\s+(.+)$/.exec(line);
    if (m !== null) out.push(stripCritic(m[1]!));
  }
  return out;
}
