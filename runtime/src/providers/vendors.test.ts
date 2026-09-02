import { describe, expect, test } from 'bun:test';
import { directProviderFromId } from './direct';
import { allVendors, handlesFor, isLoopbackURL, knownPrefixes, localityFor, PRESETS, prefixOf, vendorFor } from './vendors';

describe('the vendor catalog (providers spec §3)', () => {
  test('every direct vendor builds a model from a fake key and base URL, with no network', () => {
    for (const vendor of allVendors()) {
      if (vendor.kind !== 'direct') continue;
      const id = `${vendor.prefix}/some-model`;
      const provider = directProviderFromId(id, { apiKey: 'k', baseURL: vendor.prefix === 'openai-compatible' ? 'http://127.0.0.1:1234/v1' : undefined });
      expect(provider.id).toBe(id);
      expect(provider.kind).toBe('direct');
      expect(provider.capabilities.auth).toBe(vendor.auth);
      expect(provider.capabilities.locality).toBe(localityFor(vendor, vendor.prefix === 'openai-compatible' ? 'http://127.0.0.1:1234/v1' : undefined));
    }
  });

  test('the new prefixes are known; an unknown one is not', () => {
    for (const p of ['google', 'mistral', 'groq', 'xai', 'openrouter', 'anthropic', 'openai', 'ollama', 'openai-compatible', 'claude-sub', 'codex-sub']) {
      expect(knownPrefixes()).toContain(p);
    }
    expect(vendorFor('nope')).toBeUndefined();
    expect(prefixOf('google/gemini-2.5-pro')).toBe('google');
    expect(prefixOf('ollama/gemma4:e4b')).toBe('ollama');
  });

  test('locality: cloud vendors are cloud, Ollama is local, openai-compatible follows its base URL', () => {
    expect(localityFor(vendorFor('google')!)).toBe('cloud');
    expect(localityFor(vendorFor('ollama')!)).toBe('local');
    const compat = vendorFor('openai-compatible')!;
    expect(localityFor(compat, 'http://127.0.0.1:1234/v1')).toBe('local');
    expect(localityFor(compat, 'http://localhost:8080/v1')).toBe('local');
    expect(localityFor(compat, 'https://api.example.com/v1')).toBe('cloud');
    // Compared whole: a hostname that merely starts with a loopback string is not one.
    expect(isLoopbackURL('http://127.0.0.1.attacker.example/v1')).toBe(false);
    expect(isLoopbackURL(undefined)).toBe(false);
  });

  test('every cloud vendor names the company that receives the text and an https terms page', () => {
    for (const vendor of allVendors()) {
      if (vendor.locality !== 'cloud') continue;
      expect(vendor.handles).not.toBeNull();
      expect(vendor.handles!.company.length).toBeGreaterThan(0);
      expect(vendor.handles!.termsUrl.startsWith('https://')).toBe(true);
    }
    expect(handlesFor(vendorFor('ollama')!)).toBeNull();
    expect(handlesFor(vendorFor('openai-compatible')!, 'http://127.0.0.1:1234/v1')).toBeNull();
    expect(handlesFor(vendorFor('openai-compatible')!, 'https://llm.firm.example/v1')?.company).toBe('llm.firm.example');
  });

  test('Anthropic ships a curated model list; the others list or have none', () => {
    const anthropic = vendorFor('anthropic')!;
    expect(anthropic.models).toBe('curated');
    expect(anthropic.curated!.length).toBeGreaterThan(0);
    for (const m of anthropic.curated!) expect(m.contextTokens).toBeGreaterThan(0);
    expect(vendorFor('openrouter')!.models).toBe('list');
    expect(vendorFor('claude-sub')!.models).toBe('none');
  });

  test('every API-key vendor names its usual environment variable', () => {
    for (const vendor of allVendors()) {
      if (vendor.auth !== 'apikey' || vendor.prefix === 'openai-compatible') continue;
      expect(vendor.keyEnv).toMatch(/_API_KEY$/);
    }
  });

  test('the LM Studio preset is the OpenAI-compatible shape on a loopback port', () => {
    const lm = PRESETS.find(p => p.key === 'lmstudio')!;
    expect(lm.prefix).toBe('openai-compatible');
    expect(isLoopbackURL(lm.baseURL)).toBe(true);
  });

  test('an entry cannot claim a cloud endpoint is local', () => {
    const p = directProviderFromId('google/gemini-2.5-pro', { apiKey: 'k', capabilities: { locality: 'local' } });
    expect(p.capabilities.locality).toBe('cloud');
  });
});
