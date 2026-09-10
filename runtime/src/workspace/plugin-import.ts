/** Local, one-time plugin snapshot migration. No AI, source writes or link following. */
import {
  closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter, titleOf } from '../vault/overview';
import { extractDocument, extractText, type ExtractedFile } from './files';
import { ProfileFields } from './profile';
import { WorkspaceSeed, type MatterInput } from './types';

export const pluginHash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

export interface PluginOriginal {
  key: string;
  name: string;
  bytes: Buffer;
  extraction: ExtractedFile['extraction'];
}
export interface PluginSnapshot {
  root: string;
  fingerprint: string;
  seed: WorkspaceSeed;
  originals: PluginOriginal[];
  archive: Array<{ path: string; bytes: Buffer; hash: string; imported: boolean }>;
  skipped: Array<{ path: string; reason: string }>;
  profile?: ProfileFields;
}

function readRegular(path: string, maximum: number): Buffer {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > maximum)
    throw new Error('Import requires bounded regular files.');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    if (opened.ino !== before.ino || opened.dev !== before.dev || !opened.isFile())
      throw new Error('A source changed while opening it.');
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (bytes.length !== before.size || after.mtimeMs !== before.mtimeMs || after.size !== before.size)
      throw new Error('A source changed while reading it.');
    return bytes;
  } finally { closeSync(fd); }
}

function section(text: string, title: string, maximum: number): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => /^#{2,3} /.test(line) && line.replace(/^#+ /, '').trim() === title);
  if (start < 0) return '';
  const level = lines[start]!.match(/^#+/)![0].length;
  let end = start + 1;
  while (end < lines.length && !(new RegExp(`^#{1,${level}} `)).test(lines[end]!)) end++;
  const value = lines.slice(start + 1, end).join('\n').trim();
  const note = '\n[Excerpt only. Full preferences are retained in the imported Practice Profile source.]';
  return value.length <= maximum ? value : value.slice(0, maximum - note.length) + note;
}

/** Identity is supplied explicitly by the operator, not guessed from a team roster. */
function profileFrom(text: string, name: string): ProfileFields {
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const role = text.match(new RegExp(`\\*\\*${safeName}\\*\\* — ([^\\n]+)`))?.[1] ?? '';
  return ProfileFields.parse({
    name,
    role: role.slice(0, 200),
    organization: section(text, 'Identity', 200).split('\n')[0] ?? '',
    organizationContext: section(text, 'Business Context', 2000),
    principles: section(text, 'Philosophy', 3000),
    voice: section(text, 'Voice', 2000),
    escalationThresholds: section(text, 'Escalation Triggers', 2000),
    // The user can inspect the mapping before sharing it in new chats.
    applyToChats: false,
  });
}

export async function planPluginImport(rootPath: string, profileName?: string): Promise<PluginSnapshot> {
  const root = resolve(rootPath);
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory())
    throw new Error('Select the real configured plugin directory, not a symlink.');
  const config = readRegular(join(root, 'config.md'), 500_000).toString('utf8');
  // Plugin config.md has live key/value lines, often without YAML fences.
  const configuredRoot = config.match(/^legal_root:[ \t]*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  if (!/^counsel-os-config: true\r?$/m.test(config) || resolve(configuredRoot ?? '') !== root)
    throw new Error('The directory must be the marked, configured Counsel OS legal root.');
  if (/^default_locality:[ \t]*["']?local["']?[ \t]*\r?$/m.test(config))
    throw new Error('This plugin vault requires local-only inference. The standalone importer cannot yet preserve that policy.');
  const archive: PluginSnapshot['archive'] = [], skipped: PluginSnapshot['skipped'] = [];
  let totalBytes = 0;
  function walk(directory: string, relative = '', depth = 0) {
    if (depth > 15) throw new Error('Plugin folder nesting exceeds the import limit.');
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) {
        skipped.push({ path, reason: entry.isSymbolicLink() ? 'Symlink not followed.' : 'Hidden infrastructure not imported.' });
      } else if (entry.isDirectory()) {
        const child = join(directory, entry.name);
        if (lstatSync(child).isSymbolicLink()) throw new Error('A folder changed during inventory.');
        walk(child, path, depth + 1);
      } else if (entry.isFile()) {
        if (archive.length >= 1000) throw new Error('This initial importer supports up to 1,000 files.');
        const bytes = readRegular(join(directory, entry.name), 25_000_000);
        totalBytes += bytes.length;
        if (totalBytes > 100_000_000) throw new Error('This initial importer supports up to 100 MB.');
        archive.push({ path, bytes, hash: pluginHash(bytes), imported: false });
      }
    }
  }
  walk(root);
  const fingerprint = pluginHash(JSON.stringify(archive.map(file => [file.path, file.hash])));
  const seed: WorkspaceSeed = {
    format: 'counsel-workspace-seed', schemaVersion: 1,
    id: `plugin-v1-${pluginHash(root).slice(0, 32)}`, version: 1,
    matters: [], sources: [], knowledge: [], work: [],
  };
  const originals: PluginOriginal[] = [];
  for (const file of archive) {
    const extension = extname(file.path).toLowerCase();
    const content = /^(matters|memory|practice|law)\//.test(file.path) &&
      !/(^|\/)(CLAUDE|AGENTS|FRONTMATTER)\.md$/i.test(file.path);
    if (!content || !['.md', '.txt', '.docx', '.pdf'].includes(extension)) {
      skipped.push({ path: file.path, reason: 'Preserved in the local archive; not indexed as practice content.' });
      continue;
    }
    const name = basename(file.path);
    if (name.length > 200 || /[\x00-\x1f\x7f\\]/.test(name)) throw new Error('Unsupported file name.');
    const extracted = extension === '.docx' || extension === '.pdf'
      ? await extractDocument(file.bytes, extension.slice(1) as 'docx' | 'pdf')
      : extractText(file.bytes, name);
    const key = `f-${pluginHash(file.path).slice(0, 32)}`;
    const text = extracted.body ?? '';
    if (['true', 'yes'].includes(parseFrontmatter(text).frontmatter.stays_local?.toLowerCase() ?? '')) {
      skipped.push({ path: file.path, reason: 'Preserved in archive only: local-only inference policy is not supported in the standalone workspace yet.' });
      continue;
    }
    const title = (extension === '.md' ? titleOf(text, name) : name).slice(0, 300);
    const matterKeys: string[] = [];
    if (file.path.startsWith('matters/') && extension === '.md') {
      const meta = parseFrontmatter(text).frontmatter;
      const matter: MatterInput & { key: string } = {
        key, title,
        ...(meta.type ? { kind: meta.type.slice(0, 1000) } : {}),
        summary: `Imported plugin matter record: ${file.path}. Read the linked source for its history, dates and recorded status.`,
      };
      seed.matters!.push(matter);
      matterKeys.push(key);
    }
    seed.sources!.push({
      key, kind: 'reference', matterKeys,
      revision: {
        title, body: extracted.body, textStatus: extracted.textStatus,
        provenance: { origin: `plugin:${file.path}`, originalHash: file.hash, mediaType: extracted.mediaType },
      },
    });
    originals.push({ key, name, bytes: file.bytes, extraction: extracted.extraction });
    file.imported = true;
    const kind = file.path.startsWith('practice/standards/') ? 'position'
      : file.path.startsWith('practice/library/') ? 'language'
      : file.path.startsWith('practice/methods/') ? 'method'
      : file.path === 'memory/patterns.md' ? 'pattern' : null;
    if (kind && text.trim()) seed.knowledge!.push({
      key, kind, ownership: 'user',
      revision: { title, body: `Imported from plugin:${file.path}. Pending review; no approval inferred.\n\n${text}`, status: 'pending' },
    });
  }
  // A searchable receipt preserves the root/path/hash mapping and exclusions;
  // it also makes a changed snapshot fail the same-dataset retry check.
  seed.sources!.push({ key: 'import-inventory', kind: 'reference', revision: {
    title: 'Plugin import inventory', body: JSON.stringify({ root, fingerprint,
      files: archive.map(({ path, hash, imported }) => ({ path, hash, imported })), skipped,
      limitations: 'Local snapshot only. Links and outside-vault documents were not followed. Practice entries need review. Law content was copied, not verified or refreshed.',
    }, null, 2), provenance: { origin: `plugin-import:${root}` },
  } });
  const profileFile = archive.find(file => file.path === 'practice/profile.md');
  return { root, fingerprint, seed: WorkspaceSeed.parse(seed), originals, archive, skipped,
    ...(profileName && profileFile ? { profile: profileFrom(profileFile.bytes.toString('utf8'), profileName) } : {}),
  };
}
