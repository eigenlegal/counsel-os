import { unzipSync } from 'fflate';
import { openDocx } from '../docx/package';

/** Inspect the ZIP directory before allocating decompressed Word parts. */
export function boundedWordPackage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 5_000_000) throw new Error('Choose a Word original of 5 MB or less.');
  let total = 0, count = 0;
  const names = new Set<string>();
  unzipSync(bytes, { filter(entry) {
    total += entry.originalSize; count++;
    if (total > 40_000_000 || entry.originalSize > 12_000_000 || count > 2000 || names.has(entry.name)
      || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(entry.name)) throw new Error('This Word package exceeds the safe processing limits.');
    names.add(entry.name); return false;
  } });
  const pkg = openDocx(bytes);
  if (pkg.partNames().some(name => /vbaProject|^_xmlsignatures\//i.test(name)))
    throw new Error('Signed or macro-enabled documents are not supported. Save an unsigned .docx copy.');
  return pkg;
}
