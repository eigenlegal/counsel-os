import { describe, expect, test } from 'bun:test';
import { dataLineFor, dataLineOf, keyedVendors, PRESETS, VENDORS } from './vendors';

describe('the UI vendor mirror (providers spec §3, §6)', () => {
  test('names for every prefix the runtime ships', () => {
    for (const p of ['google', 'mistral', 'groq', 'xai', 'openrouter', 'anthropic', 'openai', 'ollama', 'openai-compatible', 'claude-sub', 'codex-sub']) {
      expect(VENDORS.some(v => v.prefix === p)).toBe(true);
    }
  });

  test('the data line: local says nothing leaves; cloud names the company and links the terms', () => {
    expect(dataLineFor('ollama/gemma4:e4b')).toEqual({ locality: 'local', text: 'local · nothing leaves this machine', termsUrl: null });
    const g = dataLineFor('google/gemini-2.5-pro')!;
    expect(g.locality).toBe('cloud');
    expect(g.text).toBe('cloud · text goes to Google');
    expect(g.termsUrl?.startsWith('https://')).toBe(true);
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

  test('the keyed vendors are the guided starts, OpenRouter last among the hints', () => {
    const hints = keyedVendors().filter(v => v.hint !== undefined).map(v => v.prefix);
    expect(hints).toEqual(['google', 'mistral', 'groq', 'xai', 'openrouter']);
    expect(PRESETS[0]!.key).toBe('lmstudio');
  });
});
