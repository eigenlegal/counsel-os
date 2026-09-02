import { describe, expect, test } from 'bun:test';
import type { Health } from '../api/types';
import { footerLabel, modelName, plateFor, swapNote, swapPlates } from './plate';

describe('plateFor', () => {
  // The founder's table (cou-90), row by row.
  test('claude-sub → Claude on a subscription', () => {
    expect(plateFor('claude-sub/claude-opus-5', 'subscription')).toEqual({
      vendor: 'Claude',
      detail: 'Opus 5 · subscription',
      known: true,
    });
  });

  test('anthropic → Claude over an API key', () => {
    expect(plateFor('anthropic/claude-opus-5', 'apikey')).toEqual({
      vendor: 'Claude',
      detail: 'Opus 5 · API key',
      known: true,
    });
  });

  test('openai → OpenAI over an API key', () => {
    expect(plateFor('openai/gpt-5', 'apikey')).toEqual({ vendor: 'OpenAI', detail: 'GPT-5 · API key', known: true });
  });

  test('codex → ChatGPT on a subscription', () => {
    expect(plateFor('codex-sub/gpt-5.6-terra', 'subscription')).toEqual({
      vendor: 'ChatGPT',
      detail: 'GPT-5.6 Terra · subscription',
      known: true,
    });
    expect(plateFor('codex/gpt-5', 'subscription').vendor).toBe('ChatGPT');
  });

  test('ollama/* → Ollama, local, the model tag verbatim', () => {
    expect(plateFor('ollama/llama3', 'local')).toEqual({ vendor: 'Ollama', detail: 'llama3 · local', known: true });
    expect(plateFor('ollama/gemma4:e4b', 'local').detail).toBe('gemma4:e4b · local');
  });

  test('no auth from /health: the table supplies the connection', () => {
    expect(plateFor('ollama/llama3').detail).toBe('llama3 · local');
    expect(plateFor('claude-sub/claude-opus-5').detail).toBe('Opus 5 · subscription');
  });

  test('/health wins over the table when they disagree', () => {
    // An operator can wire a `claude-sub/…` id to anything; say what IS.
    expect(plateFor('claude-sub/claude-opus-5', 'apikey').detail).toBe('Opus 5 · API key');
  });

  test('unknown id: the raw id on the detail line — never an invented name', () => {
    expect(plateFor('acme-llm/large-latest', 'apikey')).toEqual({
      vendor: 'acme-llm',
      detail: 'acme-llm/large-latest · API key',
      known: false,
    });
    expect(plateFor('fake/fake')).toEqual({ vendor: 'fake', detail: 'fake/fake', known: false });
  });

  test('an id with no slash falls back whole', () => {
    expect(plateFor('custom', 'local')).toEqual({ vendor: 'custom', detail: 'custom · local', known: false });
  });
});

describe('modelName', () => {
  test('claude ids restyle to the marketing casing', () => {
    expect(modelName('claude-opus-5')).toBe('Opus 5');
    expect(modelName('claude-sonnet-5')).toBe('Sonnet 5');
    expect(modelName('claude-haiku-4-5')).toBe('Haiku 4.5');
  });

  test('gpt ids keep the GPT- prefix and cap the codename', () => {
    expect(modelName('gpt-5')).toBe('GPT-5');
    expect(modelName('gpt-5.6-terra')).toBe('GPT-5.6 Terra');
  });

  test('anything else stays verbatim', () => {
    expect(modelName('llama3')).toBe('llama3');
    expect(modelName('gemma4:e4b')).toBe('gemma4:e4b');
    expect(modelName('claude-opus')).toBe('claude-opus');
  });
});

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [
    {
      id: 'fake/fake',
      kind: 'direct',
      auth: 'local',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 8192, auth: 'local' },
    },
  ],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

describe('footerLabel / swapNote', () => {
  test('the title line is the raw effective id + auth', () => {
    expect(footerLabel(health)).toBe('fake/fake · local');
    expect(footerLabel(null)).toBe('…');
  });

  test('the swap is named when the saved default did not load', () => {
    const swapped: Health = { ...health, default: 'openai/nope' };
    expect(footerLabel(swapped)).toBe('fake/fake · local');
    expect(swapNote(swapped)).toBe('saved default openai/nope not loaded');
    expect(swapNote(health)).toBeNull();
    expect(swapNote(null)).toBeNull();
  });
});

describe('swapPlates (cou-95)', () => {
  const ollama = { id: 'ollama/gemma4:e4b', kind: 'direct' as const, auth: 'local' as const, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 32_000, auth: 'local' as const } };
  const base = { vault: '/v', tenant: 'default', stepTimeoutMs: 1 };

  test('null when the saved default is loaded, or nothing is saved', () => {
    expect(swapPlates(null)).toBeNull();
    expect(swapPlates({ ...base, default: 'ollama/gemma4:e4b', providers: [ollama] })).toBeNull();
    expect(swapPlates({ ...base, default: null, providers: [ollama] })).toBeNull();
  });

  test('the saved plate and the effective plate with its bare model', () => {
    const swap = swapPlates({ ...base, default: 'claude-sub/claude-opus-5', providers: [ollama] })!;
    expect(swap.saved.vendor).toBe('Claude');
    expect(swap.effective?.vendor).toBe('Ollama');
    expect(swap.effective?.model).toBe('gemma4:e4b');
  });

  test('nothing loaded at all: effective is null', () => {
    expect(swapPlates({ ...base, default: 'claude-sub/claude-opus-5', providers: [] })).toEqual({
      saved: expect.objectContaining({ vendor: 'Claude' }),
      effective: null,
    });
  });
});

import { localPlate } from './plate';

describe('localPlate (providers spec §7)', () => {
  const local = (id: string, tools = true, contextTokens = 32_000): Health['providers'][number] => ({
    id, kind: 'direct', auth: 'local', capabilities: { tools, caching: false, thinking: false, contextTokens, auth: 'local' },
  });
  const cloud: Health['providers'][number] = { id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription', capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' } };
  const base: Health = { vault: '/v', tenant: 'default', default: 'claude-sub/claude-opus-5', stepTimeoutMs: 1, providers: [] };

  test('the saved default when it is local; else tools first, then the largest context', () => {
    expect(localPlate({ ...base, default: 'ollama/small', providers: [cloud, local('ollama/small'), local('ollama/big', true, 128_000)] })?.model).toBe('small');
    expect(localPlate({ ...base, providers: [cloud, local('ollama/notools', false, 999_999), local('ollama/big', true, 128_000), local('ollama/small')] })?.model).toBe('big');
    expect(localPlate({ ...base, providers: [cloud, local('ollama/notools', false, 999_999)] })?.model).toBe('notools');
  });

  test('nothing local → null', () => {
    expect(localPlate({ ...base, providers: [cloud] })).toBeNull();
    expect(localPlate(null)).toBeNull();
  });
});

describe('plateFor reads the catalog (providers spec §3)', () => {
  test('the new vendors have names; the model stays verbatim', () => {
    expect(plateFor('google/gemini-2.5-pro')).toEqual({ vendor: 'Google', detail: 'gemini-2.5-pro · API key', known: true });
    expect(plateFor('mistral/mistral-large-latest').vendor).toBe('Mistral');
    expect(plateFor('groq/llama-3.3-70b-versatile').vendor).toBe('Groq');
    expect(plateFor('xai/grok-4').vendor).toBe('xAI');
    expect(plateFor('openrouter/anthropic/claude-sonnet-5').vendor).toBe('OpenRouter');
    expect(plateFor('openai-compatible/lmstudio').vendor).toBe('OpenAI-compatible');
  });
});
