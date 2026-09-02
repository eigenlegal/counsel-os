import { describe, expect, test } from 'bun:test';
import { directProviderFromId } from './direct';
import { allVendors, baseURLFor, handlesFor, isLoopbackURL, knownPrefixes, localityFor, PRESETS, prefixOf, vendorFor } from './vendors';

describe('the vendor catalog (providers spec §3)', () => {
  test('every direct vendor builds a model from a fake key and base URL, with no network', () => {
    for (const vendor of allVendors()) {
      if (vendor.kind !== 'direct') continue;
      const id = `${vendor.prefix}/some-model`;
      const baseURL = vendor.prefix === 'openai-compatible' ? 'http://127.0.0.1:1234/v1' : vendor.baseURLFields === undefined ? undefined : vendor.defaultBaseURL!.replace('{account_id}', 'x');
      const provider = directProviderFromId(id, { apiKey: 'k', ...(baseURL === undefined ? {} : { baseURL }) });
      expect(provider.id).toBe(id);
      expect(provider.kind).toBe('direct');
      expect(provider.capabilities.auth).toBe(vendor.auth);
      expect(provider.capabilities.locality).toBe(localityFor(vendor, baseURL));
    }
  });

  test('the new prefixes are known; an unknown one is not', () => {
    for (const p of ['google', 'mistral', 'groq', 'xai', 'deepseek', 'cohere', 'perplexity', 'togetherai', 'fireworks', 'deepinfra', 'cerebras', 'openrouter', 'anthropic', 'openai', 'ollama', 'openai-compatible', 'claude-sub', 'codex-sub', 'moonshot', 'huggingface', 'lmstudio', 'vllm']) {
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

  test('every API-key vendor names its usual environment variable (uppercase, the vendor’s own spelling)', () => {
    for (const vendor of allVendors()) {
      if (vendor.auth !== 'apikey' || vendor.prefix === 'openai-compatible') continue;
      expect(vendor.keyEnv).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });

  test('presets (layer B) are data rows over the OpenAI-compatible shape', () => {
    const lm = PRESETS.find(p => p.prefix === 'lmstudio')!;
    expect(isLoopbackURL(lm.baseURL)).toBe(true);
    const v = vendorFor('lmstudio')!;
    expect(v.layer).toBe('preset');
    expect(v.locality).toBe('local');
    expect(v.defaultBaseURL).toBe('http://127.0.0.1:1234/v1');
    // A preset id builds a provider at the preset's URL with no baseURL on the entry.
    const p = directProviderFromId('lmstudio/qwen3');
    expect(p.baseURL).toBe('http://127.0.0.1:1234/v1');
    expect(p.capabilities.locality).toBe('local');
    // A hosted preset: cloud, keyed, the company named.
    const kimi = directProviderFromId('moonshot/kimi-k2', { apiKey: 'k' });
    expect(kimi.baseURL).toBe('https://api.moonshot.ai/v1');
    expect(kimi.capabilities.locality).toBe('cloud');
    expect(vendorFor('moonshot')!.handles?.company).toBe('Moonshot AI');
    expect(vendorFor('moonshot')!.keyEnv).toBe('MOONSHOT_API_KEY');
    // The entry's own base URL wins over the preset's.
    expect(directProviderFromId('zhipu/glm-4.5', { apiKey: 'k', baseURL: 'https://open.bigmodel.cn/api/paas/v4' }).baseURL).toBe('https://open.bigmodel.cn/api/paas/v4');
  });

  test('a template preset must be completed; unverified rows say so', () => {
    expect(() => directProviderFromId('cloudflare/@cf/meta/llama-3.1-8b-instruct', { apiKey: 'k' })).toThrow(/\{account_id\}/);
    expect(directProviderFromId('cloudflare/@cf/meta/llama-3.1-8b-instruct', { apiKey: 'k', baseURL: 'https://api.cloudflare.com/client/v4/accounts/abc/ai/v1' }).baseURL).toContain('/accounts/abc/');
    expect(vendorFor('sambanova')!.unverified).toBe(true);
    expect(vendorFor('baseten')!.unverified).toBeUndefined();
    for (const p of PRESETS) expect(baseURLFor(vendorFor(p.prefix)!, p.baseURLFields === undefined ? undefined : p.baseURL.replace('{account_id}', 'x'), `${p.prefix}/m`)).toBeTruthy();
  });

  test('the Ollama row carries the open-model starting points', () => {
    const families = vendorFor('ollama')!.openModels!.map(m => m.family);
    expect(families).toEqual(['Qwen3', 'Llama 4', 'gpt-oss', 'Gemma', 'DeepSeek-R1 distills', 'Mistral Small']);
  });

  test('an entry cannot claim a cloud endpoint is local', () => {
    const p = directProviderFromId('google/gemini-2.5-pro', { apiKey: 'k', capabilities: { locality: 'local' } });
    expect(p.capabilities.locality).toBe('cloud');
  });
});
