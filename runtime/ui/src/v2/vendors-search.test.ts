import { describe, expect, test } from 'bun:test';
import { makesLine, searchVendors, vendorFor, vendorMatches } from './vendors';

describe('finding a model by who makes it', () => {
  test('Meta sells no API, and every vendor that serves Llama answers to it', () => {
    // The founder's own words: "there are new models by meta, google, etc
    // that aren't here". They were here — behind vendor names nobody
    // searches for.
    const found = searchVendors('llama').map(v => v.prefix);
    for (const expected of ['togetherai', 'groq', 'fireworks', 'bedrock', 'ollama', 'openrouter']) {
      expect(found).toContain(expected);
    }
    expect(searchVendors('meta').map(v => v.prefix)).toContain('togetherai');
  });

  test('Gemini finds Google and Vertex; Qwen finds Alibaba and the open hosts', () => {
    expect(searchVendors('gemini').map(v => v.prefix)).toEqual(expect.arrayContaining(['google', 'vertex', 'openrouter']));
    expect(searchVendors('qwen').map(v => v.prefix)).toEqual(expect.arrayContaining(['dashscope', 'togetherai', 'ollama']));
    expect(searchVendors('grok').map(v => v.prefix)).toContain('xai');
    expect(searchVendors('claude').map(v => v.prefix)).toEqual(expect.arrayContaining(['anthropic', 'bedrock', 'vertex']));
  });

  test('every word has to land: two words are one intent', () => {
    const google = vendorFor('google')!;
    expect(vendorMatches(google, 'google gemini')).toBe(true);
    expect(vendorMatches(google, 'google llama')).toBe(false);
  });

  test('a vendor still answers to its own name, its company and its group', () => {
    expect(searchVendors('together').map(v => v.prefix)).toContain('togetherai');
    expect(searchVendors('alibaba').map(v => v.prefix)).toContain('dashscope');
    expect(searchVendors('local').map(v => v.prefix)).toContain('ollama');
    // And an empty query is everything addable, so the picker opens full.
    expect(searchVendors('').length).toBeGreaterThan(20);
  });

  test('the line says what the match will get you, matched families first', () => {
    expect(makesLine(vendorFor('togetherai')!, 'llama')).toMatch(/^Llama, /);
    expect(makesLine(vendorFor('togetherai')!, '')).toBeNull();
    expect(makesLine(vendorFor('perplexity')!, 'llama')).toBeNull();
  });

  test('a subscription is never offered for adding — it is already there', () => {
    expect(searchVendors('claude').map(v => v.prefix)).not.toContain('claude-sub');
  });
});
