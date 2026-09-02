import { cleanup, render, screen } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { KeyState, ProviderInfo } from '../../api/types';
import { nameOf, reachOf, YourModels } from './YourModels';

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

describe('the list itself', () => {
  const rows = [
    provider({ id: 'claude-sub/claude-opus-5', auth: 'subscription' }),
    provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
    provider({ id: 'openai/gpt-5.6', auth: 'apikey', locality: 'cloud', keySet: false }),
  ];

  test('each row can be told apart by a screen reader', () => {
    render(<YourModels providers={rows} defaultId="claude-sub/claude-opus-5" builtinDefault={false} busy={false} onMakeDefault={() => {}} />);
    // Not three buttons all called "use this one".
    expect(screen.getByRole('button', { name: 'Use Ollama gemma4:e4b' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Use Claude claude-opus-5' })).toBeNull();
  });

  test('a blocked row states its reason as text, not as a disabled button', () => {
    render(<YourModels providers={rows} defaultId="claude-sub/claude-opus-5" builtinDefault={false} busy={false} onMakeDefault={() => {}} />);
    // `disabled` takes a button out of the accessibility tree, which would
    // hide the one thing the row has to say.
    expect(screen.queryByRole('button', { name: /Use OpenAI/ })).toBeNull();
    expect(screen.getByText('needs a key first')).toBeDefined();
  });

  test('the same id twice is one row', () => {
    // `loadRegistry` appends the built-ins and then the file, and a file may
    // re-declare one — adding `ollama/gemma4:e4b` does exactly that.
    const doubled = [...rows, provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' })];
    render(<YourModels providers={doubled} defaultId="" builtinDefault={false} busy={false} onMakeDefault={() => {}} />);
    expect(screen.getAllByRole('row').length).toBe(3);
  });
});
