import { describe, expect, test } from 'bun:test';
import { DiscoveryCache, discoverModels, listingURL, parseListing } from './discovery';
import { vendorFor } from './vendors';

function reply(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
}

function recording(body: unknown): { fetch: typeof fetch; calls: Array<{ url: string; auth: string | null }> } {
  const calls: Array<{ url: string; auth: string | null }> = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(input), auth: headers.get('authorization') });
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetch: f, calls };
}

describe('parseListing — one parser per response shape (spec §4)', () => {
  test('openai: ids, with a context size when the vendor adds one (Mistral, Groq)', () => {
    const models = parseListing('openai', { object: 'list', data: [{ id: 'gpt-5.6', object: 'model' }, { id: 'mistral-large-latest', max_context_length: 131072 }, { id: 'llama-3.3-70b', context_window: 128000 }, { nope: true }] });
    expect(models).toEqual([{ id: 'gpt-5.6' }, { id: 'llama-3.3-70b', contextTokens: 128000 }, { id: 'mistral-large-latest', contextTokens: 131072 }]);
  });

  test('google: models/ prefix stripped, only generateContent, inputTokenLimit', () => {
    const models = parseListing('google', {
      models: [
        { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent', 'countTokens'], inputTokenLimit: 1048576 },
        { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'], inputTokenLimit: 2048 },
      ],
    });
    expect(models).toEqual([{ id: 'gemini-2.5-pro', contextTokens: 1048576 }]);
  });

  test('openrouter: context_length and per-token prices become per-million', () => {
    const models = parseListing('openrouter', { data: [{ id: 'anthropic/claude-opus-5', context_length: 200000, pricing: { prompt: '0.000015', completion: '0.000075' } }, { id: 'free/x', context_length: 8192, pricing: { prompt: '0', completion: '0' } }] });
    expect(models[0]).toEqual({ id: 'anthropic/claude-opus-5', contextTokens: 200000, pricing: { prompt: 15, completion: 75 } });
    // A zero price is not a price; the model is still listed.
    expect(models[1]).toEqual({ id: 'free/x', contextTokens: 8192 });
  });

  test('ollama: the tag names', () => {
    expect(parseListing('ollama', { models: [{ name: 'gemma4:e4b' }, { name: 'qwen3:32b' }, {}] })).toEqual([{ id: 'gemma4:e4b' }, { id: 'qwen3:32b' }]);
  });

  test('cohere: chat models with their context length', () => {
    expect(parseListing('cohere', { models: [{ name: 'command-a-03-2025', endpoints: ['chat'], context_length: 256000 }, { name: 'embed-v4', endpoints: ['embed'] }] })).toEqual([{ id: 'command-a-03-2025', contextTokens: 256000 }]);
  });

  test('together: a bare array, chat and language types only', () => {
    expect(parseListing('together', [{ id: 'meta-llama/Llama-4-Scout', type: 'chat', context_length: 1048576 }, { id: 'some/embedding', type: 'embedding' }])).toEqual([{ id: 'meta-llama/Llama-4-Scout', contextTokens: 1048576 }]);
  });

  test('a body of the wrong shape is an empty list, never a throw', () => {
    expect(parseListing('openai', null)).toEqual([]);
    expect(parseListing('google', 'nonsense')).toEqual([]);
    expect(parseListing('together', { data: [] })).toEqual([]);
  });
});

describe('listingURL', () => {
  test('the vendor root by shape, or the entry base URL when there is one', () => {
    expect(listingURL(vendorFor('openai')!, undefined)).toBe('https://api.openai.com/v1/models');
    expect(listingURL(vendorFor('groq')!, undefined)).toBe('https://api.groq.com/openai/v1/models');
    expect(listingURL(vendorFor('cohere')!, undefined)).toBe('https://api.cohere.com/v1/models?endpoint=chat');
    expect(listingURL(vendorFor('ollama')!, undefined)).toBe('http://127.0.0.1:11434/api/tags');
    expect(listingURL(vendorFor('ollama')!, 'http://127.0.0.1:11435/')).toBe('http://127.0.0.1:11435/api/tags');
    expect(listingURL(vendorFor('lmstudio')!, undefined)).toBe('http://127.0.0.1:1234/v1/models');
    expect(listingURL(vendorFor('openai-compatible')!, 'http://localhost:8080/v1')).toBe('http://localhost:8080/v1/models');
    expect(listingURL(vendorFor('openai-compatible')!, undefined)).toBeNull();
  });
});

describe('discoverModels', () => {
  test('a curated vendor answers from the catalog without a request', async () => {
    let called = false;
    const r = await discoverModels(vendorFor('anthropic')!, { fetch: (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch });
    expect(r.source).toBe('curated');
    expect(r.models.map(m => m.id)).toContain('claude-opus-5');
    expect(called).toBe(false);
  });

  test('a keyed vendor is not called without a key', async () => {
    let called = false;
    const r = await discoverModels(vendorFor('openai')!, { fetch: (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch });
    expect(r).toEqual({ models: [], source: 'list', error: 'No key for OpenAI yet.' });
    expect(called).toBe(false);
  });

  test('a listed vendor is asked with the bearer, and answers sorted', async () => {
    const rec = recording({ data: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }] });
    const r = await discoverModels(vendorFor('openai')!, { apiKey: 'sk-test', fetch: rec.fetch });
    expect(r).toEqual({ models: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }], source: 'list' });
    expect(rec.calls).toEqual([{ url: 'https://api.openai.com/v1/models', auth: 'Bearer sk-test' }]);
  });

  test('google takes the key as a query parameter, never as a bearer', async () => {
    const rec = recording({ models: [{ name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1048576 }] });
    const r = await discoverModels(vendorFor('google')!, { apiKey: 'g-key', fetch: rec.fetch });
    expect(r.models).toEqual([{ id: 'gemini-2.5-pro', contextTokens: 1048576 }]);
    expect(rec.calls[0]!.url).toBe('https://generativelanguage.googleapis.com/v1beta/models?key=g-key');
    expect(rec.calls[0]!.auth).toBeNull();
  });

  test('a local runner needs no key', async () => {
    const rec = recording({ models: [{ name: 'gemma4:e4b' }] });
    const r = await discoverModels(vendorFor('ollama')!, { fetch: rec.fetch });
    expect(r).toEqual({ models: [{ id: 'gemma4:e4b' }], source: 'list' });
    expect(rec.calls[0]!.auth).toBeNull();
  });

  test('a refused key, a server error, an empty list, and a timeout are sentences', async () => {
    expect((await discoverModels(vendorFor('openai')!, { apiKey: 'k', fetch: reply({ error: 'bad key' }, 401) })).error).toBe('Could not list models: the key was refused by OpenAI.');
    expect((await discoverModels(vendorFor('openai')!, { apiKey: 'k', fetch: reply({}, 503) })).error).toBe('Could not list models: OpenAI answered 503.');
    expect((await discoverModels(vendorFor('openai')!, { apiKey: 'k', fetch: reply({ data: [] }) })).error).toBe('Could not list models: OpenAI returned none.');
    const slow = ((_: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))); })) as unknown as typeof fetch;
    const r = await discoverModels(vendorFor('openai')!, { apiKey: 'k', fetch: slow, timeoutMs: 10 });
    expect(r.error).toBe('Could not list models: OpenAI did not answer in time.');
    expect(r.models).toEqual([]);
  });

  test('a vendor with no list and no curated ids says to type the id', async () => {
    const r = await discoverModels(vendorFor('claude-sub')!, {});
    expect(r.models).toEqual([]);
    expect(r.error).toContain('type the model id');
  });

  test('the bare OpenAI-compatible shape needs a base URL first', async () => {
    const r = await discoverModels(vendorFor('openai-compatible')!, { fetch: reply({ data: [{ id: 'x' }] }) });
    expect(r.error).toContain('needs a base URL');
    const ok = await discoverModels(vendorFor('openai-compatible')!, { baseURL: 'http://127.0.0.1:1234/v1', fetch: reply({ data: [{ id: 'x' }] }) });
    expect(ok.models).toEqual([{ id: 'x' }]);
  });
});

describe('DiscoveryCache', () => {
  test('remembers a good listing for the ttl, never a failure', () => {
    let t = 0;
    const cache = new DiscoveryCache(1000, () => t);
    const k = cache.key('openai', undefined);
    cache.set(k, { models: [], source: 'list', error: 'nope' });
    expect(cache.get(k)).toBeNull();
    cache.set(k, { models: [{ id: 'a' }], source: 'list' });
    expect(cache.get(k)?.models).toEqual([{ id: 'a' }]);
    t = 1001;
    expect(cache.get(k)).toBeNull();
    expect(cache.key('ollama', 'http://127.0.0.1:11434')).not.toBe(cache.key('ollama', undefined));
  });
});
