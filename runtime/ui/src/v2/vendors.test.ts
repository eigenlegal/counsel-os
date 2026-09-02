import { describe, expect, test } from 'bun:test';
import { addableVendors, dataLineFor, dataLineOf, GROUP_LABELS, keyedHints, OPEN_MODELS, pickerLabel, vendorByPickerLabel, VENDORS, type VendorRow } from './vendors';

describe('the UI vendor mirror (providers spec §3, §6)', () => {
  test('names for every prefix the runtime ships, in three groups', () => {
    for (const p of ['google', 'mistral', 'groq', 'xai', 'deepseek', 'cohere', 'perplexity', 'togetherai', 'fireworks', 'deepinfra', 'cerebras', 'openrouter', 'anthropic', 'openai', 'ollama', 'openai-compatible', 'claude-sub', 'codex-sub', 'moonshot', 'zhipu', 'dashscope', 'sambanova', 'baseten', 'huggingface', 'cloudflare', 'replicate', 'lmstudio', 'llamacpp', 'vllm', 'mlx', 'jan', 'gpt4all']) {
      expect(VENDORS.some((v: VendorRow) => v.prefix === p)).toBe(true);
    }
    expect(Object.keys(GROUP_LABELS)).toEqual(['subscription', 'local', 'hosted']);
    expect(addableVendors().every((v: VendorRow) => v.group !== 'subscription')).toBe(true);
  });

  test('the data line: local says nothing leaves; cloud names the company and links the terms', () => {
    expect(dataLineFor('ollama/gemma4:e4b')).toEqual({ locality: 'local', text: 'local · nothing leaves this machine', termsUrl: null });
    expect(dataLineFor('lmstudio/qwen3')?.locality).toBe('local');
    const g = dataLineFor('google/gemini-2.5-pro')!;
    expect(g.locality).toBe('cloud');
    expect(g.text).toBe('cloud · text goes to Google');
    expect(g.termsUrl?.startsWith('https://')).toBe(true);
    expect(dataLineFor('moonshot/kimi-k2')?.text).toBe('cloud · text goes to Moonshot AI');
    expect(dataLineFor('openai-compatible/lmstudio', 'http://127.0.0.1:1234/v1')?.locality).toBe('local');
    expect(dataLineFor('openai-compatible/firm', 'https://llm.firm.example/v1')?.text).toBe('cloud · text goes to llm.firm.example');
    expect(dataLineFor('nope/x')).toBeNull();
  });

  test('/health wins over the table when it speaks', () => {
    const line = dataLineOf({ id: 'openai-compatible/x', kind: 'direct', auth: 'apikey', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' }, locality: 'local', handles: null }, 'openai-compatible/x');
    expect(line?.locality).toBe('local');
    const cloud = dataLineOf({ id: 'openai-compatible/y', kind: 'direct', auth: 'apikey', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' }, locality: 'cloud', handles: { company: 'llm.firm.example', termsUrl: '' } }, 'openai-compatible/y');
    expect(cloud?.text).toBe('cloud · text goes to llm.firm.example');
    expect(cloud?.termsUrl).toBeNull();
  });

  test('the picker: grouped labels, found by label, name or prefix', () => {
    expect(pickerLabel(VENDORS.find((v: VendorRow) => v.prefix === 'google')!)).toBe('Hosted API · Google Gemini');
    expect(vendorByPickerLabel('Hosted API · Google Gemini')?.prefix).toBe('google');
    expect(vendorByPickerLabel('google gemini')?.prefix).toBe('google');
    expect(vendorByPickerLabel('lmstudio')?.baseURL).toBe('http://127.0.0.1:1234/v1');
    expect(vendorByPickerLabel('claude-sub')).toBeUndefined();
    expect(vendorByPickerLabel('')).toBeUndefined();
  });

  test('the first-run hints: hosted vendors a key unlocks, verified ones only, OpenRouter last', () => {
    const hints = keyedHints();
    expect(hints[hints.length - 1]).toBe('OpenRouter — one key, many models');
    expect(hints).toContain('Google Gemini');
    expect(hints).toContain('Kimi (Moonshot)');
    expect(hints.some(h => h.includes('SambaNova'))).toBe(false);
    expect(OPEN_MODELS.map(m => m.family)).toEqual(['Qwen3', 'Llama 4', 'gpt-oss', 'Gemma', 'DeepSeek-R1 distills', 'Mistral Small']);
  });
});
