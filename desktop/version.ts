import release from './release.json';

/** One identity for app metadata, build receipts, and owner-approved preview tags.
 * This does not enable signing, publishing, or an automatic update channel. */
export function desktopReleaseTag(value: { version: string; build: number } = release): string {
  return `desktop-v${value.version}-preview.${value.build}`;
}
export const desktopReleaseNotesUrl = `https://github.com/eigenlegal/counsel-os/releases/tag/${desktopReleaseTag()}`;
