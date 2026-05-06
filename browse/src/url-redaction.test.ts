import { describe, expect, test } from 'bun:test';
import { redactUrl } from './url-redaction';

describe('URL redaction', () => {
  test('strips query strings and fragments by default', () => {
    expect(redactUrl('https://example.test/path?token=secret#access_token=secret')).toBe('https://example.test/path?[redacted]#[redacted]');
  });

  test('leaves URLs unchanged when full logging is explicitly enabled', () => {
    const original = process.env.BROWSE_LOG_FULL_URLS;
    process.env.BROWSE_LOG_FULL_URLS = '1';
    try {
      expect(redactUrl('https://example.test/path?token=secret#frag')).toBe('https://example.test/path?token=secret#frag');
    } finally {
      if (original === undefined) {
        delete process.env.BROWSE_LOG_FULL_URLS;
      } else {
        process.env.BROWSE_LOG_FULL_URLS = original;
      }
    }
  });
});
