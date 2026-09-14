import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { desktopRelease, desktopPlist, readDesktopRelease } from './desktop_release';
import { desktopReleaseTag, desktopReleaseNotesUrl } from '../desktop/version';

test('preview tags and release notes share the desktop version/build, not the plugin version', () => {
  const release = readDesktopRelease(resolve(import.meta.dir, '..'));
  expect(desktopReleaseTag()).toBe(`desktop-v${release.version}-preview.${release.build}`);
  expect(desktopReleaseTag({ version: '0.2.1', build: 42 })).toBe('desktop-v0.2.1-preview.42');
  expect(desktopReleaseNotesUrl).toBe(`https://github.com/eigenlegal/counsel-os/releases/tag/${desktopReleaseTag()}`);
});

test('desktop version/build have an independent manifest and one safe plist substitution', () => {
  const repo = resolve(import.meta.dir, '..'), release = readDesktopRelease(repo);
  const plist = desktopPlist(readFileSync(resolve(repo, 'desktop/macos/Info.plist'), 'utf8'), release);
  expect(plist).toContain(`<key>CFBundleShortVersionString</key><string>${release.version}</string>`);
  expect(plist).toContain(`<key>CFBundleVersion</key><string>${release.build}</string>`);
  expect(plist).not.toContain('__DESKTOP_');
  expect(plist).toContain('<key>CFBundleName</key><string>Counsel OS</string>');
  expect(plist).toContain('<key>CFBundleDisplayName</key><string>Counsel OS</string>');
  expect(plist).toContain('<key>CFBundleIdentifier</key><string>org.counsel.workspace.local</string>');
  expect(plist).toContain('<key>CFBundleExecutable</key><string>Counsel</string>');
  expect(() => desktopPlist('missing placeholders', release)).toThrow();
});
test('a version cannot enable public distribution, inject XML or carry extra settings', () => {
  const valid = { version: '0.1.0', build: 1, channel: 'local-test' };
  for (const value of [null, [], { ...valid, version: '01.0.0' }, { ...valid, version: '1.0.0</string>' },
    { ...valid, build: 0 }, { ...valid, build: 1.2 }, { ...valid, channel: 'stable' }, { ...valid, secret: 'not-a-setting' }])
    expect(() => desktopRelease(value)).toThrow();
});
