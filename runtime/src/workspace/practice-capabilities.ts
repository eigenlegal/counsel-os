/** Shared, factual execution boundaries for onboarding, practice review and the
 * agent. These describe this integration, not capabilities granted by prose. */
export const PRACTICE_CAPABILITIES = [
  'Confirmed practice text can guide future responses when sharing is enabled. Exact identity, Word attribution, filename patterns and entity/signatory records can be proposed together and require human confirmation.',
  'Word output uses built-in ZIP compression, including embedded fonts, while preserving font bytes. This replaces size-inflation workarounds, not a request to remove fonts. No external font-cleanup script is executed.',
  'Imported originals are retained in the Counsel workspace. Matter associations and saved outputs are workspace records, not synchronization with original folders. Local vault paths are context only: no external folder watcher, write-back, arbitrary filesystem access or shell/script execution is available.',
  'A saved instruction cannot enable a missing tool, change AI billing or permissions, execute a signature, or prove signing authority. Preserve unsupported conventions as clearly labeled external-workflow notes, not promises of automation. Explain native equivalents and continue with supported changes.',
] as const;

export function practiceCapabilityNotes(text: string): Array<{ title: string; detail: string }> {
  const notes: Array<{ title: string; detail: string }> = [];
  if (/embedded[ _-]?fonts?|font[ _-]?(?:embed|cleanup)|strip_font|font.*compress/i.test(text)) notes.push({ title: 'Font handling is built in',
    detail: 'Counsel compresses embedded fonts when saving Word files and preserves the fonts. It does not remove them or run an external cleanup script.' });
  if (/\b(?:vault|obsidian|legal_root|entities_path)\b|\/Users\/|file:\/\/|[A-Z]:\\/i.test(text)) notes.push({ title: 'External folders are not synchronized',
    detail: 'Imported files are retained in Counsel. Saving a folder path here does not connect that folder, file outputs there, or keep it in sync.' });
  if (/\b(?:execute|run|invoke)\b.{0,100}\b(?:script|python|shell)\b|\b\w+\.(?:py|sh)\b/i.test(text)) notes.push({ title: 'Local scripts are not executed',
    detail: 'Counsel can remember an external workflow, but cannot run its scripts. That instruction is not an enabled automation.' });
  return notes;
}
