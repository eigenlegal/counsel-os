import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DesktopRelease { version: string; build: number; channel: 'local-test' }
export function desktopRelease(value: unknown): DesktopRelease {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid desktop release manifest');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'build,channel,version' || typeof v.version !== 'string'
    || !/^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/.test(v.version)
    || typeof v.build !== 'number' || !Number.isSafeInteger(v.build) || v.build < 1 || v.build > 999999
    || v.channel !== 'local-test') throw new Error('Desktop version/build must be valid and the channel must remain local-test until release signing is implemented');
  return v as unknown as DesktopRelease;
}
export function readDesktopRelease(repo: string) { return desktopRelease(JSON.parse(readFileSync(join(repo, 'desktop/release.json'), 'utf8'))); }
export function desktopPlist(template: string, release: DesktopRelease) {
  const validated = desktopRelease(release);
  if (template.split('__DESKTOP_VERSION__').length !== 2 || template.split('__DESKTOP_BUILD__').length !== 2) throw new Error('Desktop Info.plist must use exactly one version and build placeholder');
  return template.replace('__DESKTOP_VERSION__', validated.version).replace('__DESKTOP_BUILD__', String(validated.build));
}
