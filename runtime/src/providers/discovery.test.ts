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
    // `codex-sub`: the Codex CLI publishes no list, and we know one model
    // name for certain, which is not a list worth inventing.
    const r = await discoverModels(vendorFor('codex-sub')!, {});
    expect(r.models).toEqual([]);
    expect(r.error).toContain('type the model id');
  });

  test('the Claude subscription lists its models, with no key and no call', async () => {
    // The harness passes the model straight through
    // (`claude-harness.ts` buildQueryOptions), so a subscription can be
    // switched between models like any other provider — it just had no list
    // to switch from.
    const r = await discoverModels(vendorFor('claude-sub')!, {});
    expect(r.source).toBe('curated');
    expect(r.models.map(m => m.id)).toContain('claude-opus-5');
    expect(r.error).toBeUndefined();
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

describe('the enterprise listings (spec §3 step 5)', () => {
  const azure = vendorFor('azure')!;
  const bedrock = vendorFor('bedrock')!;
  const vertex = vendorFor('vertex')!;

  function capture(body: unknown, status = 200): { fetch: typeof fetch; requests: Request[] } {
    const requests: Request[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(input instanceof Request ? input : new Request(String(input), init));
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    return { fetch: f, requests };
  }

  test('azure: deployments parse to ids; only succeeded ones', () => {
    expect(parseListing('azure', { data: [{ id: 'gpt-5-prod', model: 'gpt-5', status: 'succeeded' }, { id: 'old', model: 'gpt-4', status: 'deleting' }, { id: 'new-one', model: 'gpt-5.6' }] })).toEqual([{ id: 'gpt-5-prod' }, { id: 'new-one' }]);
  });

  test('azure: the URL names the resource, the key rides in api-key, no key is a sentence', async () => {
    expect(listingURL(azure, undefined, { resourceName: 'firm' })).toBe('https://firm.openai.azure.com/openai/deployments?api-version=2023-03-15-preview');
    expect(listingURL(azure, 'https://proxy.example/azure', { resourceName: 'firm' })).toBe('https://proxy.example/azure/openai/deployments?api-version=2023-03-15-preview');
    expect(listingURL(azure, undefined, {})).toBeNull();
    const rec = capture({ data: [{ id: 'dep-1', status: 'succeeded' }] });
    const r = await discoverModels(azure, { extra: { resourceName: 'firm' }, secrets: { apiKey: 'az-k' }, fetch: rec.fetch });
    expect(r).toEqual({ models: [{ id: 'dep-1' }], source: 'list' });
    expect(rec.requests[0]?.url).toBe('https://firm.openai.azure.com/openai/deployments?api-version=2023-03-15-preview');
    expect(rec.requests[0]?.headers.get('api-key')).toBe('az-k');
    expect(rec.requests[0]?.headers.get('authorization')).toBeNull();
    const none = await discoverModels(azure, { extra: { resourceName: 'firm' }, secrets: {}, fetch: rec.fetch });
    expect(none).toEqual({ models: [], source: 'list', error: 'No key for Azure OpenAI yet.' });
    expect(await discoverModels(azure, { extra: {}, secrets: { apiKey: 'k' }, fetch: rec.fetch })).toMatchObject({ error: 'Azure OpenAI needs a resource name before its models can be listed.' });
    const refused = await discoverModels(azure, { extra: { resourceName: 'firm' }, secrets: { apiKey: 'bad' }, fetch: capture({}, 401).fetch });
    expect(refused.error).toContain('credentials were refused');
  });

  test('bedrock: ListFoundationModels parses to text-out, on-demand or profile models', () => {
    const models = parseListing('bedrock', {
      modelSummaries: [
        { modelId: 'anthropic.claude-sonnet-5-v1:0', outputModalities: ['TEXT'], inferenceTypesSupported: ['INFERENCE_PROFILE'] },
        { modelId: 'amazon.nova-pro-v1:0', outputModalities: ['TEXT'], inferenceTypesSupported: ['ON_DEMAND'] },
        { modelId: 'amazon.titan-image-generator-v1', outputModalities: ['IMAGE'], inferenceTypesSupported: ['ON_DEMAND'] },
        { modelId: 'meta.llama3-provisioned', outputModalities: ['TEXT'], inferenceTypesSupported: ['PROVISIONED'] },
      ],
    });
    expect(models).toEqual([{ id: 'amazon.nova-pro-v1:0' }, { id: 'anthropic.claude-sonnet-5-v1:0' }]);
  });

  test('bedrock: the request is SigV4-signed for the region; a bearer key is a bearer; no credentials → the curated list', async () => {
    expect(listingURL(bedrock, undefined, { region: 'eu-west-1' })).toBe('https://bedrock.eu-west-1.amazonaws.com/foundation-models?byOutputModality=TEXT');
    expect(listingURL(bedrock, undefined, {})).toBeNull();
    const rec = capture({ modelSummaries: [{ modelId: 'amazon.nova-pro-v1:0' }] });
    const signed = await discoverModels(bedrock, { extra: { region: 'eu-west-1' }, secrets: { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret', sessionToken: 'tok' }, fetch: rec.fetch });
    expect(signed).toEqual({ models: [{ id: 'amazon.nova-pro-v1:0' }], source: 'list' });
    const req = rec.requests[0]!;
    expect(req.url).toBe('https://bedrock.eu-west-1.amazonaws.com/foundation-models?byOutputModality=TEXT');
    const auth = req.headers.get('authorization') ?? '';
    expect(auth.startsWith('AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE/')).toBe(true);
    expect(auth).toContain('/eu-west-1/bedrock/aws4_request');
    expect(req.headers.get('x-amz-security-token')).toBe('tok');
    expect(req.headers.get('x-amz-date')).not.toBeNull();
    // The secret itself is never in a header.
    expect([...req.headers.values()].join(' ')).not.toContain('secret');

    const bearer = capture({ modelSummaries: [{ modelId: 'x' }] });
    await discoverModels(bedrock, { extra: { region: 'us-east-1' }, secrets: { apiKey: 'bearer-1' }, fetch: bearer.fetch });
    expect(bearer.requests[0]?.headers.get('authorization')).toBe('Bearer bearer-1');

    const chain = await discoverModels(bedrock, { extra: { region: 'us-east-1' }, secrets: {}, fetch: rec.fetch });
    expect(chain.source).toBe('curated');
    expect(chain.models.length).toBeGreaterThan(0);
    expect(chain.error).toBeUndefined();
    // A refusal falls back to the curated list too, and says so.
    const refused = await discoverModels(bedrock, { extra: { region: 'us-east-1' }, secrets: { apiKey: 'bad' }, fetch: capture({}, 403).fetch });
    expect(refused.source).toBe('curated');
    expect(refused.error).toContain('refused');
    // A transport failure never echoes a secret.
    const boom = (async () => { throw new Error('connect failed for key bearer-9'); }) as unknown as typeof fetch;
    const failed = await discoverModels(bedrock, { extra: { region: 'us-east-1' }, secrets: { apiKey: 'bearer-9' }, fetch: boom });
    expect(failed.error).not.toContain('bearer-9');
    expect(failed.error).toContain('[redacted]');
  });

  test('vertex: curated — Gemini and Claude-on-Vertex ids, no request', async () => {
    const r = await discoverModels(vertex, { extra: { project: 'p', location: 'us-central1' }, fetch: (async () => { throw new Error('never'); }) as unknown as typeof fetch });
    expect(r.source).toBe('curated');
    expect(r.models.some(m => m.id.startsWith('gemini-'))).toBe(true);
    expect(r.models.some(m => m.id.startsWith('claude-'))).toBe(true);
  });
});
