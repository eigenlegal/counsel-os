/** The reading pane's outline column (spec §3.4): the body's H2s, in order.
 * Fenced code is skipped so an example heading is not a section. */
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
    if (m !== null) out.push(m[1]!.trim());
  }
  return out;
}
