import { cleanup, render, screen } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { KeyState, ProviderInfo } from '../../api/types';
import { groupProviders, nameOf, reachOf } from './YourModels';

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

describe('one block per provider', () => {
  const rows = [
    provider({ id: 'claude-sub/claude-opus-5', auth: 'subscription' }),
    provider({ id: 'claude-sub/claude-sonnet-5', auth: 'subscription' }),
    provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
  ];

  test('the models of one vendor fold into one block', () => {
    // Two Claude models loaded is not two providers to read past. It is
    // Claude, running one of them.
    const groups = groupProviders(rows, 'claude-sub/claude-opus-5');
    expect(groups.map(g => g.prefix)).toEqual(['claude-sub', 'ollama']);
    expect(groups[0]!.name).toBe('Claude');
    expect(groups[0]!.model).toBe('claude-opus-5');
  });

  test('the block shows the model that actually answers, wherever it sits', () => {
    // The default is the SECOND Claude loaded; the block must show that one,
    // not the first it happened to meet.
    const groups = groupProviders(rows, 'claude-sub/claude-sonnet-5');
    expect(groups[0]!.model).toBe('claude-sonnet-5');
    expect(groups[0]!.id).toBe('claude-sub/claude-sonnet-5');
  });

  test('with no default, the first loaded model stands for its provider', () => {
    expect(groupProviders(rows, '').map(g => g.model)).toEqual(['claude-opus-5', 'gemma4:e4b']);
  });

  test('an unknown prefix still gets a block, under its own name', () => {
    const groups = groupProviders([provider({ id: 'mystery/m', auth: 'apikey', keySet: true })], '');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe('mystery');
  });
});
