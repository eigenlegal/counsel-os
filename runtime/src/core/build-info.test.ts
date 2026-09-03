import { describe, expect, test } from 'bun:test';
import { buildInfo, resetBuildInfoForTests } from './build-info';

describe('what the process is running', () => {
  test('reports the release, and the commit it read from the checkout', () => {
    resetBuildInfoForTests();
    const info = buildInfo();
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    // Tests run from a checkout, so both of these hold. A worktree keeps
    // its own HEAD and shares its refs, which is the case that used to come
    // back empty.
    expect(info.source).toBe('source');
    expect(info.commit).toMatch(/^[0-9a-f]{7}$/);
  });

  test('the start time is frozen at load, not read per call', () => {
    // It answers "how old is this process", so it must not creep forward.
    resetBuildInfoForTests();
    const first = buildInfo().startedAt;
    expect(new Date(first).getTime()).toBeLessThanOrEqual(Date.now());
    resetBuildInfoForTests();
    expect(buildInfo().startedAt).toBe(first);
  });

  test('the version matches the file the release script bumps', async () => {
    // Four manifests are kept in step by `scripts/release.sh`; this is the
    // one a running server reports, so it has to be that same number.
    const onDisk = (await Bun.file(`${import.meta.dir}/../../../VERSION`).text()).trim();
    resetBuildInfoForTests();
    expect(buildInfo().version).toBe(onDisk);
  });
});
