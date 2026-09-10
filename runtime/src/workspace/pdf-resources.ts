import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceDistribution } from './distribution';

export function pdfResourceKey(kind: string, filename: string): string {
  const folder = kind === 'cMapUrl' ? 'cmaps' : kind === 'standardFontDataUrl' ? 'standard_fonts' : null;
  if (!folder || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) throw new Error('Unsupported bundled font resource');
  return `${folder}/${filename}`;
}
export async function readPdfResource(kind: string, filename: string): Promise<Uint8Array> {
  const key = pdfResourceKey(kind, filename), bundle = workspaceDistribution();
  if (bundle) {
    const path = Object.hasOwn(bundle.pdfResources, key) ? bundle.pdfResources[key] : undefined;
    if (!path) throw new Error('Required PDF resource is missing from this build.');
    return new Uint8Array(await Bun.file(path).arrayBuffer());
  }
  const root = dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
  return new Uint8Array(await readFile(join(root, key)));
}
