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

  test('the line names the families that matched, and only those', () => {
    // Its whole job is answering "why is Together AI in my results for
    // llama". Padding it with the families that did NOT match made the
    // answer a lie.
    expect(makesLine(vendorFor('togetherai')!, 'llama')).toBe('Llama');
    expect(makesLine(vendorFor('togetherai')!, 'llama qwen')).toBe('Llama, Qwen');
    expect(makesLine(vendorFor('togetherai')!, '')).toBeNull();
    expect(makesLine(vendorFor('perplexity')!, 'llama')).toBeNull();
    // Matched by NAME, not by any family: claim no families.
    expect(makesLine(vendorFor('togetherai')!, 'together')).toBeNull();
  });

  test('a single letter credits no family at all', () => {
    // "o" matches Ollama by its name; it must not then announce
    // "Ollama (gpt-oss, Llama, Meta, Qwen)" as if a letter found four
    // model families.
    expect(searchVendors('o').map(v => v.prefix)).toContain('ollama');
    expect(makesLine(vendorFor('ollama')!, 'o')).toBeNull();
    expect(makesLine(vendorFor('ollama')!, 'a')).toBeNull();
    // Two letters onward it is a real prefix again.
    expect(makesLine(vendorFor('ollama')!, 'qw')).toBe('Qwen');
  });

  test('a family match is a word, not a substring', () => {
    // `gpt` finds gpt-oss by its first word; `oss` finds it by its second.
    expect(makesLine(vendorFor('fireworks')!, 'gpt')).toBe('gpt-oss');
    expect(makesLine(vendorFor('fireworks')!, 'oss')).toBe('gpt-oss');
  });

  test('picking an option does not throw the list away', () => {
    // react-aria writes the option's own label back into the box. `·` is in
    // no vendor's text, so a strict every-word match decided the vendor you
    // had just chosen no longer matched and re-offered the whole catalog.
    expect(vendorMatches(vendorFor('togetherai')!, 'Hosted API · Together AI')).toBe(true);
    expect(vendorMatches(vendorFor('ollama')!, 'Local runners · Ollama')).toBe(true);
  });

  test('a query nobody serves finds nothing, rather than everything', () => {
    // The old fallback answered a dead query with the entire catalog, which
    // read as thirty-odd matches.
    expect(searchVendors('gemini pro')).toEqual([]);
    expect(searchVendors('zzzz')).toEqual([]);
  });

  test('Gemma is not Gemini', () => {
    // These three serve the open-weights family only. Tagged with the
    // company, they promised a lawyer a Gemini they would never find.
    for (const prefix of ['ollama', 'groq', 'togetherai']) {
      expect(searchVendors('gemma').map(v => v.prefix)).toContain(prefix);
      expect(searchVendors('gemini').map(v => v.prefix)).not.toContain(prefix);
    }
    // The ones that really do serve Gemini still answer to it.
    expect(searchVendors('gemini').map(v => v.prefix)).toEqual(expect.arrayContaining(['google', 'vertex', 'openrouter']));
  });

  test('Replicate is not offered as a way to run Llama', () => {
    // The runtime's own catalog says no OpenAI-compatible chat endpoint was
    // found for it. Maker tags would have ranked it beside Together AI and
    // Groq for every open-model search.
    expect(searchVendors('llama').map(v => v.prefix)).not.toContain('replicate');
    expect(vendorFor('replicate')!.note).toMatch(/no openai-compatible chat endpoint/i);
  });

  test('a subscription is never offered for adding — it is already there', () => {
    expect(searchVendors('claude').map(v => v.prefix)).not.toContain('claude-sub');
  });
});
