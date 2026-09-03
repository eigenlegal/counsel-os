import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { KeyState, ProviderInfo } from '../../api/types';
import { groupProviders, nameOf, reachOf, YourModels } from './YourModels';

afterEach(cleanup);

function provider(over: Partial<ProviderInfo> & Pick<ProviderInfo, 'id' | 'auth'>): ProviderInfo {
  return {
    kind: 'direct',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100000, auth: over.auth },
    ...over,
  };
}

describe('how a model is reached', () => {
  test('a model server on this machine needs no key, whatever auth says', () => {
    // The case that made this one function instead of two: the vendor row
    // takes a key, the loopback address means nobody checks it. Reading
    // `auth` alone refused a lawyer their own local model.
    const local = provider({ id: 'openai-compatible/local', auth: 'apikey', locality: 'local', keySet: false });
    expect(reachOf(local)).toEqual({ how: 'on this machine', usable: true });
  });

  test('an API-key model with no key cannot be chosen, and says why', () => {
    const bare = provider({ id: 'openai/gpt-5.6', auth: 'apikey', locality: 'cloud', keySet: false });
    expect(reachOf(bare).usable).toBe(false);
    expect(reachOf(bare).blocked).toBe('needs a key first');
  });

  test('an enterprise row with no credentials cannot be chosen either', () => {
    // The inverse gap: `auth` of azure/sigv4/gcp never reached the guard, so
    // an uncredentialed Bedrock row looked ready and every step using it
    // would have failed at call time.
    const bedrock = provider({ id: 'bedrock/anthropic.claude-3', auth: 'sigv4', locality: 'cloud', keySet: false });
    expect(reachOf(bedrock).usable).toBe(false);
    expect(reachOf(bedrock).blocked).toBe('needs credentials first');
  });

  test('the credentials already on this machine count as credentials', () => {
    // An AWS profile or gcloud's ADC: the runtime reports `default-chain`.
    const chained = provider({ id: 'vertex/gemini-3-pro', auth: 'gcp', locality: 'cloud', keySet: 'default-chain' });
    expect(reachOf(chained)).toEqual({ how: 'the credentials on this machine', usable: true });
  });

  test('every other key state reads as reachable', () => {
    const states: [KeyState | undefined, string][] = [
      [true, 'key set'],
      ['env', 'key from the environment'],
      // Absent: takes no key, or a runtime older than the field. Neither is
      // a reason to refuse the row.
      [undefined, 'your cloud account'],
    ];
    for (const [keySet, how] of states) {
      const p = provider({ id: 'openai/gpt-5.6', auth: 'apikey', locality: 'cloud', ...(keySet === undefined ? {} : { keySet }) });
      expect(reachOf(p)).toEqual({ how, usable: true });
    }
    expect(reachOf(provider({ id: 'claude-sub/claude-opus-5', auth: 'subscription' })).how).toBe('your subscription');
    expect(reachOf(provider({ id: 'ollama/gemma4:e4b', auth: 'local' })).how).toBe('on this machine');
  });
});

describe('the name a lawyer reads', () => {
  test('the vendor first, then the model; the prefix is a routing detail', () => {
    expect(nameOf('claude-sub/claude-opus-5')).toEqual({ vendor: 'Claude', model: 'claude-opus-5' });
    // A slash inside the model name belongs to the model.
    expect(nameOf('huggingface/meta-llama/Llama-3.3-70B')).toEqual({ vendor: 'Hugging Face', model: 'meta-llama/Llama-3.3-70B' });
    // No vendor and no slash: say the id back rather than nothing.
    expect(nameOf('mystery')).toEqual({ vendor: 'mystery', model: '' });
  });
});

describe('one block per provider entry', () => {
  const claude = provider({ id: 'claude-sub/claude-opus-5', auth: 'subscription' });
  const sonnet = provider({ id: 'claude-sub/claude-sonnet-5', auth: 'subscription' });
  const ollama = provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' });

  test('a row and the provider it produces are ONE block', () => {
    const groups = groupProviders([claude, ollama], '', [{ key: 'r1', id: 'ollama/gemma4:e4b' }]);
    expect(groups).toHaveLength(2);
    // The row's block is the editable one; the built-in Claude has none.
    expect(groups.find(g => g.prefix === 'ollama')!.rowKey).toBe('r1');
    expect(groups.find(g => g.prefix === 'claude-sub')!.rowKey).toBeUndefined();
  });

  test('two rows of one vendor are two blocks, each with its own identity', () => {
    // Folding them into one made the second invisible: no fields, no
    // Remove, and its validation errors had nowhere to render — Save
    // refused with nothing marked.
    const groups = groupProviders([], '', [
      { key: 'r1', id: 'openai/gpt-5.6' },
      { key: 'r2', id: 'openai/gpt-4o-mini' },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.rowKey)).toEqual(['r1', 'r2']);
    expect(new Set(groups.map(g => g.key)).size).toBe(2);
  });

  test("a block's key does not change when its id does", () => {
    // The block is keyed on this. Keyed on the prefix, every keystroke in
    // an Id field remounted the block and dropped focus — one character
    // per click.
    const before = groupProviders([], '', [{ key: 'r1', id: '' }])[0]!.key;
    const after = groupProviders([], '', [{ key: 'r1', id: 'openai/gpt-5.6' }])[0]!.key;
    expect(before).toBe(after);
  });

  test('a loaded provider no row accounts for still gets a block', () => {
    const groups = groupProviders([claude, sonnet], '', []);
    expect(groups.map(g => g.model)).toEqual(['claude-opus-5', 'claude-sonnet-5']);
    expect(groups.every(g => g.rowKey === undefined)).toBe(true);
  });

  test('the one that answers leads, then your own rows, then the built-ins', () => {
    const groups = groupProviders([claude, ollama], 'ollama/gemma4:e4b', [{ key: 'r1', id: 'ollama/gemma4:e4b' }]);
    expect(groups[0]!.id).toBe('ollama/gemma4:e4b');
  });
});

describe('which model a block stands for', () => {
  test('your own row leads the built-in of the same vendor', () => {
    // Both are genuinely loaded, so both are shown — but the one you can
    // edit comes first. Picking `qwen3:32b` used to save correctly and then
    // re-render as the built-in `gemma4:e4b`, so the pick looked refused.
    const loaded = [
      provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
      provider({ id: 'ollama/qwen3:32b', auth: 'local', locality: 'local' }),
    ];
    const groups = groupProviders(loaded, 'claude-sub/claude-opus-5', [{ key: 'r1', id: 'ollama/qwen3:32b' }]);
    expect(groups.map(g => g.model)).toEqual(['qwen3:32b', 'gemma4:e4b']);
    expect(groups[0]!.rowKey).toBe('r1');
  });

  test('the model that answers beats even your own row', () => {
    const loaded = [
      provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
      provider({ id: 'ollama/qwen3:32b', auth: 'local', locality: 'local' }),
    ];
    const groups = groupProviders(loaded, 'ollama/gemma4:e4b', [{ key: 'r1', id: 'ollama/qwen3:32b' }]);
    expect(groups[0]!.model).toBe('gemma4:e4b');
  });

  test('the two vendors called Claude are told apart', () => {
    // `claude-sub` and `anthropic` are both named "Claude" in the catalog.
    // Two blocks with one name, and two buttons reading "Use Claude", is
    // exactly what the per-block labels exist to prevent.
    const loaded = [
      provider({ id: 'claude-sub/claude-opus-5', auth: 'subscription' }),
      provider({ id: 'anthropic/claude-opus-5', auth: 'apikey', locality: 'cloud', keySet: true }),
    ];
    const names = groupProviders(loaded, '').map(g => g.name);
    expect(new Set(names).size).toBe(2);
  });
});

describe('a provider you have added but not saved', () => {
  test('gets a block of its own, so its key and model have somewhere to go', () => {
    // Without this it appeared only as a stub in "Rows you added", with no
    // model picker and no key — and neither could be supplied in either
    // order: the row will not save without a model, and the vendor will not
    // list models without a key.
    const groups = groupProviders([], '', [{ key: 'r1', id: 'openai/' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.prefix).toBe('openai');
    expect(groups[0]!.pending).toBe(true);
    expect(groups[0]!.model).toBe('');
    // It cannot answer yet, so it is never offered as the one that does.
    expect(groups[0]!.reach.usable).toBe(false);
    expect(groups[0]!.reach.blocked).toBe('pick a model to finish');
  });

  test('a provider already loaded does not get a second block', () => {
    const loaded = [provider({ id: 'openai/gpt-5.6', auth: 'apikey', locality: 'cloud', keySet: true })];
    const groups = groupProviders(loaded, '', [{ key: 'r1', id: 'openai/gpt-5.6' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.model).toBe('gpt-5.6');
    expect(groups[0]!.pending).toBeUndefined();
  });

  test('a local provider says where it runs even before it is saved', () => {
    expect(groupProviders([], '', [{ key: 'r1', id: 'ollama/' }])[0]!.reach.how).toBe('on this machine');
    expect(groupProviders([], '', [{ key: 'r1', id: 'openai/' }])[0]!.reach.how).toBe('not set up yet');
  });

  test('a row with no id yet is still a block — that is where its Id field lives', () => {
    // Added and then invisible was the alternative: the row's only usable
    // control renders inside its block.
    const [blank] = groupProviders([], '', [{ key: 'r1', id: '' }]);
    expect(blank!.name).toBe('A model');
    expect(blank!.pending).toBe(true);
    expect(blank!.reach.blocked).toBe('give it an id below');
  });

  test('two rows of one vendor are two blocks — neither is hidden', () => {
    const groups = groupProviders([], '', [
      { key: 'r1', id: 'openai/' },
      { key: 'r2', id: 'openai/' },
    ]);
    expect(groups.map(g => g.rowKey)).toEqual(['r1', 'r2']);
  });
});
