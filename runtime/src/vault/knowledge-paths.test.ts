import { describe, expect, test } from 'bun:test';
import { isKnowledgePath } from './knowledge-paths';
import type { VaultConfig } from './resolve-root';

const defaults: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters' };

describe('isKnowledgePath', () => {
  test('practice/ is a knowledge path', () => {
    expect(isKnowledgePath('practice/standards/x.md', defaults)).toBe(true);
  });

  test('memory/ is a knowledge path', () => {
    expect(isKnowledgePath('memory/decisions.md', defaults)).toBe(true);
  });

  test('law/ is a knowledge path', () => {
    expect(isKnowledgePath('law/gdpr/breach-notification.md', defaults)).toBe(true);
  });

  test('matters/ is not a knowledge path', () => {
    expect(isKnowledgePath('matters/acme/notes.md', defaults)).toBe(false);
  });

  test('the default entities/ path is a knowledge path', () => {
    expect(isKnowledgePath('entities/acme.md', defaults)).toBe(true);
  });

  test('an overridden entities_path is honored as a knowledge path', () => {
    expect(isKnowledgePath('clients/acme.md', { entitiesPath: 'clients', mattersPath: 'matters' })).toBe(true);
  });

  test('the default entities/ path is not a knowledge path once overridden away', () => {
    expect(isKnowledgePath('entities/acme.md', { entitiesPath: 'clients', mattersPath: 'matters' })).toBe(false);
  });

  test('an unrelated top-level path is not a knowledge path', () => {
    expect(isKnowledgePath('README.md', defaults)).toBe(false);
  });

  test('a name that merely starts with a knowledge prefix is not matched', () => {
    // "lawsuit-tracker.md" begins with "law" but is not under "law/".
    expect(isKnowledgePath('lawsuit-tracker.md', defaults)).toBe(false);
  });
});
