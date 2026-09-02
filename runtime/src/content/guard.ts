import { MANIFEST } from './manifest';
import { SHIPPED_ROOTS, type ContentSource } from './source';

export class ShippedContentError extends Error {}

/**
 * Refuses a content source that ships nothing, or less than the manifest
 * says it should (packaging spec §3.4): a compiled binary whose plugin root
 * resolves to `/` lists zero law areas, and before this guard `init`
 * reported success over an empty vault and `update-content` reported
 * "0 current". A seeded vault with no law content is worse than an error.
 */
export function assertShippedContent(source: ContentSource): void {
  const expected = Object.keys(MANIFEST.files).length;
  let found = 0;
  for (const root of SHIPPED_ROOTS) found += source.list(root).length;
  if (found === 0) {
    throw new ShippedContentError(
      `the shipped content is empty (0 files where the manifest lists ${expected}): this ${source.kind === 'embedded' ? 'binary was built without its content' : 'checkout has no knowledge/ tree — set COUNSEL_PLUGIN_ROOT to the plugin'}`,
    );
  }
  // A checkout (or a test's fake) may legitimately carry a subset — a
  // relocated plugin, a fixture; an EMBEDDED set was generated from the
  // manifest, so anything short of it is a build that lost files.
  if (source.kind === 'embedded' && found < expected) {
    throw new ShippedContentError(`the shipped content is incomplete: ${found} files where the manifest lists ${expected} (embedded source)`);
  }
}
