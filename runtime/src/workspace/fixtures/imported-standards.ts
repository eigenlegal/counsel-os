import type { WorkspaceStore } from '../store';

/** Synthetic round-trip exports, used only by tests and browser fixtures. */
export async function seedImportedStandards(store: WorkspaceStore, count = 3, kinds: Array<'position' | 'method' | 'language' | 'pattern'> = ['position']) {
  const files = Array.from({ length: count }, (_, index) => {
    const title = `Synthetic standard ${index + 1} — Position`;
    const suffix = (0x4ddf384e + index).toString(16);
    const body = `# ${title}\n\nSaved review status: pending. Re-import does not carry over approval.\nSaved version: 1\n\nImported from plugin:practice/standards/synthetic-${index}.md. Pending review; no approval inferred.\n\n---\ncounsel-os-type: practice\ncontent-version: "2026-04-08"\n---\n# ${title}\n\n## Our Position\n**Our standard:** Keep a written record of synthetic decision ${index + 1}.\n`;
    return { path: `Practice/standards/${title} - ${suffix}.md`, body };
  });
  let batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic exported standards', files: files.map(file => ({ path: file.path, byteCount: Buffer.byteLength(file.body) })) });
  for (let index = 0; index < files.length; index++) await store.imports.upload(batch.id, batch.entries[index]!.id, Buffer.from(files[index]!.body).toString('base64'));
  await store.imports.idle();
  batch = store.imports.get(batch.id);
  batch = store.imports.editChoices(batch.id, { expectedRevisionId: batch.revisionId, changes: batch.entries.map((entry, i) => ({ entryId: entry.id, choice: { ...entry.choice, destination: kinds[i % kinds.length]! } })) });
  const committed = store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId });
  return committed.receipt!.items;
}
