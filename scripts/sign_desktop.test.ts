import { expect, test } from 'bun:test';
import { signingOptions, validateSigningIdentity } from './sign_desktop';
test('signing is not authorized by default or by a historical identity', () => {
  expect(() => validateSigningIdentity({ confirmed: false }, 'Developer ID Application: Fixture (ABCDEFGHIJ)')).toThrow();
  const identity = { confirmed: true, publisher: 'Fixture', teamId: 'ABCDEFGHIJ', bundleId: 'org.fixture.counsel' };
  expect(validateSigningIdentity(identity, 'Developer ID Application: Fixture (ABCDEFGHIJ)')).toEqual(identity);
  expect(() => validateSigningIdentity(identity, 'Developer ID Application: Other (ABCDEFGHIJ)')).toThrow();
  expect(() => validateSigningIdentity({ ...identity, bundleId: 'org.fixture.local' }, 'Developer ID Application: Fixture (ABCDEFGHIJ)')).toThrow();
});
test('signing requires explicit paths, supported options and a separate keychain profile', () => {
  expect(signingOptions(['--help'])).toBeNull();
  expect(() => signingOptions([])).toThrow();
  expect(() => signingOptions(['--publish', 'true'])).toThrow();
  expect(() => signingOptions(['--app', '/tmp/a', '--app', '/tmp/b'])).toThrow();
});
