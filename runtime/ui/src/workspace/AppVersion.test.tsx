import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '../test/dom';
import release from '../../../../desktop/release.json';
import { desktopReleaseNotesUrl, desktopReleaseTag } from '../../../../desktop/version';
import { AppVersion } from './AppVersion';

afterEach(cleanup);

test('installed app shows its version and matching preview release without fetching anything', () => {
  render(<AppVersion desktop />);
  expect(screen.getByText(`Version ${release.version} (build ${release.build})`)).toBeTruthy();
  expect(screen.getByText('macOS preview')).toBeTruthy();
  const link = screen.getByRole('link', { name: 'Release notes' });
  expect(link.getAttribute('href')).toBe(desktopReleaseNotesUrl);
  expect(link.getAttribute('title')).toBe(desktopReleaseTag());
  expect(link.getAttribute('rel')).toContain('noreferrer');
});
test('browser workspace is distinguished from an installed preview', () => {
  render(<AppVersion />);
  expect(screen.getByText('Development workspace')).toBeTruthy();
  expect(screen.queryByText('macOS preview')).toBeNull();
});
