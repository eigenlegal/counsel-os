/** Reading-only cleanup. Never use this text for persistence, hashes or citations. */
export const approvedPracticeCategory = {
  position: 'Approved practice position',
  method: 'Approved working method',
  language: 'Approved reusable language — starting language, not a standing position',
  pattern: 'Approved lesson or pattern — historical context, not a standing position',
};

export function practiceReadingParts(text: string): { body: string; metadata: string[] } {
  let body = text;
  const metadata: string[] = [];
  const exported = body.match(/^# ([^\r\n]+)\r?\n\r?\nSaved review status: (?:pending|approved|rejected)\. Re-import does not carry over approval\.\r?\nSaved version: \d+\r?\n(?:\r?\n|$)/);
  if (exported) {
    metadata.push(exported[0].trim());
    body = body.slice(exported[0].length);
  }
  const receipt = body.match(/^Imported from plugin:[^\r\n]+\. Pending review; no approval inferred\.\r?\n\r?\n/);
  if (receipt) { metadata.push(receipt[0].trim()); body = body.slice(receipt[0].length); }
  const frontmatter = body.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (frontmatter && /^[A-Za-z_][\w-]*\s*:/m.test(frontmatter[1]!)) {
    metadata.push(frontmatter[0].trim()); body = body.slice(frontmatter[0].length);
  }
  return { body, metadata };
}

/** Only a receipt-linked, recognisable export can supply a cleaner display title.
 * A user's renamed title, arbitrary hex suffix, and original file stay untouched. */
export function importedPracticeTitle(title: string, original: { title: string; body: string; origin: string }): string {
  if (title !== original.title) return title;
  const suffix = title.match(/^(.*?)[\s-]+([a-f0-9]{8})$/i);
  if (!suffix || !original.origin.toLowerCase().endsWith(` - ${suffix[2]!.toLowerCase()}.md`)) return title;
  const heading = original.body.match(/^# ([^\r\n]+)\r?\n\r?\nSaved review status: (?:pending|approved|rejected)\. Re-import does not carry over approval\.\r?\nSaved version: \d+(?:\r?\n|$)/)?.[1];
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  return heading && normalize(heading) === normalize(suffix[1]!) ? heading.trim() : title;
}

export function practicePreview(body: string): string {
  return practiceReadingParts(body).body.replace(/^#{1,6}\s+[^\r\n]*(?:\r?\n|$)/gm, '')
    .replace(/(\*\*|__)([^\r\n]+?)\1/g, '$2').trim().slice(0, 400);
}
