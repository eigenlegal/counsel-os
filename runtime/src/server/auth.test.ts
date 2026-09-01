import { describe, expect, test } from 'bun:test';
import { authorize, bearerToken, CLEAR_SESSION_COOKIE, cookieAllowedForOrigin, isAuthorized, sessionCookie, sessionCookieHeader, tokensMatch, withSessionCookie } from './auth';

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

describe('sessionCookie', () => {
  test('reads the session cookie out of a cookie header, ignoring the rest', () => {
    expect(sessionCookie(req({ cookie: 'counsel_session=abc' }))).toBe('abc');
    expect(sessionCookie(req({ cookie: 'other=1; counsel_session=abc; more=2' }))).toBe('abc');
    expect(sessionCookie(req({ cookie: 'other=1' }))).toBeNull();
    expect(sessionCookie(req({ cookie: 'counsel_session=' }))).toBeNull();
    expect(sessionCookie(req())).toBeNull();
  });
});

describe('cookieAllowedForOrigin', () => {
  test('same-origin fetches and address-bar navigations may use the cookie', () => {
    expect(cookieAllowedForOrigin(req({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(cookieAllowedForOrigin(req({ 'sec-fetch-site': 'none' }))).toBe(true);
    // A non-browser client sends neither header.
    expect(cookieAllowedForOrigin(req())).toBe(true);
  });

  test('another port on 127.0.0.1 is same-SITE, not same-origin — the gap SameSite=Strict leaves open', () => {
    expect(cookieAllowedForOrigin(req({ 'sec-fetch-site': 'same-site' }))).toBe(false);
    expect(cookieAllowedForOrigin(req({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  test('an Origin header must be this server\'s own', () => {
    expect(cookieAllowedForOrigin(req({ host: '127.0.0.1:7431', origin: 'http://127.0.0.1:7431' }))).toBe(true);
    expect(cookieAllowedForOrigin(req({ host: '127.0.0.1:7431', origin: 'http://127.0.0.1:8080' }))).toBe(false);
    expect(cookieAllowedForOrigin(req({ host: '127.0.0.1:7431', origin: 'null' }))).toBe(false);
    expect(cookieAllowedForOrigin(req({ host: '127.0.0.1:7431', origin: 'http://localhost:7431' }))).toBe(false);
  });
});

describe('authorize', () => {
  test('a right bearer is "bearer"; a right cookie from this origin is "cookie"', () => {
    expect(authorize(req({ authorization: 'Bearer secret' }), 'secret')).toBe('bearer');
    expect(authorize(req({ cookie: 'counsel_session=secret', 'sec-fetch-site': 'same-origin' }), 'secret')).toBe('cookie');
  });

  test('a wrong cookie, or a right one from elsewhere, is nothing', () => {
    expect(authorize(req({ cookie: 'counsel_session=nope' }), 'secret')).toBeNull();
    expect(authorize(req({ cookie: 'counsel_session=secret', 'sec-fetch-site': 'same-site' }), 'secret')).toBeNull();
    expect(authorize(req({ cookie: 'counsel_session=secret', 'sec-fetch-site': 'cross-site' }), 'secret')).toBeNull();
  });

  test('a wrong bearer is refused even beside a right cookie', () => {
    expect(authorize(req({ authorization: 'Bearer nope', cookie: 'counsel_session=secret' }), 'secret')).toBeNull();
    expect(isAuthorized(req({ authorization: 'Bearer nope', cookie: 'counsel_session=secret' }), 'secret')).toBe(false);
  });
});

describe('the cookie itself', () => {
  test('is HttpOnly, SameSite=Strict, a year long, for the whole origin, and never Secure (plain http on loopback)', () => {
    const value = sessionCookieHeader('secret');
    expect(value).toBe('counsel_session=secret; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict');
    expect(value).not.toContain('Secure');
    expect(CLEAR_SESSION_COOKIE).toBe('counsel_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
  });

  test('withSessionCookie keeps the response and adds the header', async () => {
    const res = withSessionCookie(Response.json({ ok: true }, { status: 201, headers: { 'x-thing': '1' } }), 'secret');
    expect(res.status).toBe(201);
    expect(res.headers.get('x-thing')).toBe('1');
    expect(res.headers.get('set-cookie')).toBe(sessionCookieHeader('secret'));
    expect(await res.json()).toEqual({ ok: true });
  });
});
