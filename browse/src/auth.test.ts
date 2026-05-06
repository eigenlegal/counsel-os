import { describe, expect, test } from 'bun:test';
import { hasPickerAccess, isAllowedOrigin } from './cookie-picker-routes';
import { validateBearerAuth } from './server';

describe('browse auth gates', () => {
  test('command bearer auth rejects missing and wrong tokens', () => {
    const token = 'secret-token';

    expect(validateBearerAuth(new Request('http://127.0.0.1:9400/command'), token)).toBe(false);
    expect(validateBearerAuth(new Request('http://127.0.0.1:9400/command', {
      headers: { authorization: 'Bearer wrong-token' },
    }), token)).toBe(false);
  });

  test('command bearer auth accepts the expected token', () => {
    expect(validateBearerAuth(new Request('http://127.0.0.1:9400/command', {
      headers: { authorization: 'Bearer secret-token' },
    }), 'secret-token')).toBe(true);
  });

  test('cookie picker origin check rejects mismatched origins', () => {
    const url = new URL('http://127.0.0.1:9400/cookie-picker/imported');
    const req = new Request(url, {
      headers: { origin: 'https://evil.example' },
    });

    expect(isAllowedOrigin(url, req)).toBe(false);
  });

  test('cookie picker access accepts query and header tokens', () => {
    const token = 'picker-token';
    const queryUrl = new URL(`http://127.0.0.1:9400/cookie-picker/imported?token=${token}`);
    const headerUrl = new URL('http://127.0.0.1:9400/cookie-picker/imported');

    expect(hasPickerAccess(queryUrl, new Request(queryUrl), token)).toBe(true);
    expect(hasPickerAccess(headerUrl, new Request(headerUrl, {
      headers: { 'x-browse-picker-token': token },
    }), token)).toBe(true);
  });

  test('cookie picker access rejects wrong token and cross-site fetch metadata', () => {
    const token = 'picker-token';
    const url = new URL('http://127.0.0.1:9400/cookie-picker/imported');

    expect(hasPickerAccess(url, new Request(url, {
      headers: { 'x-browse-picker-token': 'wrong-token' },
    }), token)).toBe(false);

    expect(hasPickerAccess(url, new Request(url, {
      headers: {
        'sec-fetch-site': 'cross-site',
        'x-browse-picker-token': token,
      },
    }), token)).toBe(false);
  });
});
