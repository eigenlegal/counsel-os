/** Inventory actual compiler inputs, not every package installed for development. */
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export function packageOwner(input: string): string | null {
  let directory = dirname(input.replace(/\?.*$/, ''));
  if (!directory.includes('/node_modules/')) return null;
  for (;;) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const value = JSON.parse(readFileSync(manifest, 'utf8'));
      if (value.name && value.version) return directory;
    }
    const parent = dirname(directory);
    if (parent === directory || !parent.includes('/node_modules')) return null;
    directory = parent;
  }
}
export function licenseFiles(directory: string) {
  return readdirSync(directory, { withFileTypes: true })
    .filter(item => item.isFile() && /^(licen[cs]e|notice|copying|copyright)([._-]|$)/i.test(item.name))
    .map(item => ({ name: item.name, text: readFileSync(join(directory, item.name), 'utf8') }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function createDesktopNotices(repo: string, output: string, engineInputs: string[], uiInputs: string[], pdfRoot: string) {
  const locks = ['bun.lock', 'runtime/ui/bun.lock'].map(name => {
    const bytes = readFileSync(join(repo, name), 'utf8');
    return { name, sha256: hash(bytes), data: Bun.JSON5.parse(bytes) as { packages: Record<string, unknown[]> } };
  });
  const locked = new Set(locks.flatMap(lock => Object.values(lock.data.packages).map(value => String(value[0]))));
  const owners = new Map<string, Set<string>>();
  for (const [scope, inputs] of [['engine', engineInputs], ['interface', uiInputs], ['pdf-resources', [join(pdfRoot, 'build/pdf.mjs')]]] as const) {
    for (const input of inputs) {
      const owner = packageOwner(resolve(repo, input));
      if (!owner) continue;
      const path = realpathSync(owner);
      const scopes = owners.get(path) ?? new Set<string>(); scopes.add(scope); owners.set(path, scopes);
    }
  }
  if (!owners.size || !uiInputs.length || !engineInputs.length) throw new Error('Cannot inventory an empty build graph.');
  const components = [...owners].map(([path, scopes]) => {
    const p = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
    if (!locked.has(`${p.name}@${p.version}`)) throw new Error(`Bundled package is not locked: ${p.name}@${p.version}`);
    const notices = licenseFiles(path);
    // These exact locked npm tarballs omit the repository's notice. Retrieved
    // from each release tag; all three have the same upstream license blob.
    const vercelCommits: Record<string, string> = { '5.0.36': '8a09c78c039e2c092468eaeff97faaabf3b77366', '5.0.33': '0a0f271cff061e1ca953ed9d14ed7d525613a4a9', '5.0.32': 'c93fa8d49ad8d2c690918a6c540c2e13d63f21ee' };
    const noticeSource = p.name === '@ai-sdk/provider-utils' && vercelCommits[p.version]
      ? `https://github.com/vercel/ai/blob/${vercelCommits[p.version]}/LICENSE` : null;
    if (!notices.length && noticeSource) notices.push({ name: 'upstream-LICENSE', text: readFileSync(join(repo, 'desktop/notices/vercel-ai-LICENSE.txt'), 'utf8') });
    if (p.name === 'pdfjs-dist') for (const folder of ['cmaps', 'standard_fonts'])
      notices.push(...licenseFiles(join(path, folder)).map(file => ({ ...file, name: `${folder}/${file.name}` })));
    if (!notices.length || notices.some(file => !file.text.trim())) throw new Error(`Missing bundled license text: ${p.name}@${p.version}`);
    return { name: p.name as string, version: p.version as string, license: typeof p.license === 'string' ? p.license : 'Review required',
      scopes: [...scopes].sort(), noticeSource, notices: notices.map(n => ({ name: n.name, sha256: hash(n.text), text: n.text })) };
  }).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
  const runtimePath = join(repo, 'desktop/notices/bun-1.3.14-LICENSE.md');
  if (Bun.version !== '1.3.14') throw new Error('Review and update the bundled Bun notices before changing the compiler version.');
  const runtimeText = readFileSync(runtimePath, 'utf8');
  const reviewRequired = [
    'Bun statically linked third-party libraries: upstream inventory retained; complete corresponding notices and relinking/source obligations require distribution review.',
    ...components.filter(c => !['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'].includes(c.license))
      .map(c => `${c.name}@${c.version}: ${c.license}`),
  ];
  const text = ['Counsel OS — third-party notices', 'Generated from the engine and interface compiler inputs. Provider executables are separately installed, not redistributed.',
    ...components.map(c => `\n${c.name}@${c.version} (${c.license})\n${c.notices.map(n => `\n--- ${n.name} ---\n${n.text}`).join('\n')}`),
    `\nBun ${Bun.version} — upstream license and linked-library inventory\n${runtimeText}`].join('\n\n');
  writeFileSync(join(output, 'THIRD-PARTY-NOTICES.txt'), text, { flag: 'wx', mode: 0o600 });
  const inventory = { format: 1, compiler: { name: 'Bun', version: Bun.version, upstream: 'https://github.com/oven-sh/bun/blob/bun-v1.3.14/LICENSE.md', noticeSha256: hash(runtimeText) },
    lockfiles: locks.map(({ name, sha256 }) => ({ name, sha256 })),
    components: components.map(c => ({ ...c, notices: c.notices.map(({ name, sha256 }) => ({ name, sha256 })) })),
    excluded: { providerExecutables: ['Codex CLI', 'Claude Code CLI'], development: 'Installed packages absent from both compiler input graphs are not claimed as bundled.' },
    noticesSha256: hash(text), reviewRequired, publicDistributionApproved: false };
  writeFileSync(join(output, 'dependency-inventory.json'), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { components: components.length, noticesSha256: hash(text), inventorySha256: hash(readFileSync(join(output, 'dependency-inventory.json'))), reviewRequired };
}

export function verifyDesktopNotices(resources: string) {
  const inventory = JSON.parse(readFileSync(join(resources, 'dependency-inventory.json'), 'utf8'));
  if (inventory.format !== 1 || !inventory.components?.length || inventory.noticesSha256 !== hash(readFileSync(join(resources, 'THIRD-PARTY-NOTICES.txt'))))
    throw new Error('Bundled third-party notices do not match their inventory.');
  return inventory;
}
