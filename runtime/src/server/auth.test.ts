import { describe, expect, test } from 'bun:test';
import { bearerToken, isAuthorized, tokensMatch } from './auth';

const req = (headers: Record<string, string> = {}): Request =>
  new Request('http://127.0.0.1:7431/health', { headers });

describe('bearerToken', () => {
  test('reads the credential, case-insensitively on the scheme', () => {
    expect(bearerToken(req({ authorization: 'Bearer abc' }))).toBe('abc');
    expect(bearerToken(req({ authorization: 'bearer abc' }))).toBe('abc');
  });

  test('is null for anything that is not a bearer credential', () => {
    expect(bearerToken(req())).toBeNull();
    expect(bearerToken(req({ authorization: 'Basic abc' }))).toBeNull();
    expect(bearerToken(req({ authorization: 'Bearer' }))).toBeNull();
    expect(bearerToken(req({ authorization: 'Bearer ' }))).toBeNull();
  });
});

describe('tokensMatch', () => {
  test('accepts only the exact token, whatever the lengths', () => {
    expect(tokensMatch('secret', 'secret')).toBe(true);
    expect(tokensMatch('secre', 'secret')).toBe(false);
    expect(tokensMatch('secrets', 'secret')).toBe(false);
    expect(tokensMatch('', 'secret')).toBe(false);
    expect(tokensMatch('Secret', 'secret')).toBe(false);
  });
});

describe('isAuthorized', () => {
  test('needs both a bearer header and the right token', () => {
    expect(isAuthorized(req({ authorization: 'Bearer secret' }), 'secret')).toBe(true);
    expect(isAuthorized(req({ authorization: 'Bearer nope' }), 'secret')).toBe(false);
    expect(isAuthorized(req(), 'secret')).toBe(false);
  });
});
