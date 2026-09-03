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

describe('choosing a model on a provider block', () => {
  const rows = [provider({ id: 'xai/grok-4', auth: 'apikey', locality: 'cloud', keySet: true })];
  const realFetch = globalThis.fetch;
  let picks: Array<{ id: string; model: string }> = [];

  function show(opts: { models: string[]; saves?: boolean } = { models: [] }): void {
    picks = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/providers/') && url.includes('/models')) {
        return new Response(JSON.stringify({ models: opts.models.map(id => ({ id })), source: 'list' }), { headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
    render(
      <YourModels
        providers={rows}
        defaultId="xai/grok-4"
        builtinDefault={false}
        busy={false}
        baseURLOf={() => undefined}
        fileIds={new Set(['xai/grok-4'])}
        pendingIds={[]}
        onMakeDefault={() => {}}
        onPickModel={async (id, model) => {
          picks.push({ id, model });
          return opts.saves ?? true;
        }}
      />,
    );
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('typing a model that PASSES THROUGH another one saves only what was chosen', async () => {
    // xAI really sells both `grok-4` and `grok-4-fast`, and OpenAI both
    // `gpt-5.6` and `gpt-5.6-mini`. Saving whenever the text spelled a
    // listed model committed `grok-4` at the sixth keystroke and then reset
    // the field to it, under the hand still typing `-fast`.
    show({ models: ['grok-4', 'grok-4-fast'] });
    await waitFor(() => expect(screen.getByText(/2 models listed/)).toBeTruthy());
    const user = userEvent.setup({ document });
    const box = screen.getByLabelText('xAI model');
    await user.clear(box);
    await user.type(box, 'grok-4-fast');
    expect(picks).toEqual([]);
    expect((box as HTMLInputElement).value).toBe('grok-4-fast');
  });

  test('a model the list does not carry is saved once, when the field is left', async () => {
    show({ models: [] });
    // Let the listing land first: it re-renders the field, and a keystroke
    // racing that re-render is a test artefact, not a behaviour.
    await waitFor(() => expect(screen.getByText(/0 models listed/)).toBeTruthy());
    const user = userEvent.setup({ document });
    const box = screen.getByLabelText('xAI model');
    await user.clear(box);
    await user.type(box, 'grok-5-unreleased');
    expect(picks).toEqual([]);
    // The first tab lands on the combo's own toggle, which is still inside
    // the block — that is not leaving it, and must not save.
    await user.tab();
    expect(picks).toEqual([]);
    await user.tab();
    await waitFor(() => expect(picks).toEqual([{ id: 'xai/grok-4', model: 'grok-5-unreleased' }]));
    // Once. `group.model` only catches up when the save returns, so the
    // guard has to remember what it already sent.
    await user.tab();
    expect(picks).toHaveLength(1);
  });

  test('a save the page refused puts the field back', async () => {
    // Another row on the page is incomplete, so nothing was written. The
    // field must not go on showing a model the file does not have.
    show({ models: [], saves: false });
    await waitFor(() => expect(screen.getByText(/0 models listed/)).toBeTruthy());
    const user = userEvent.setup({ document });
    const box = screen.getByLabelText('xAI model');
    await user.clear(box);
    await user.type(box, 'grok-5-unreleased');
    await user.tab();
    await user.tab();
    await waitFor(() => expect(picks).toHaveLength(1));
    await waitFor(() => expect((box as HTMLInputElement).value).toBe('grok-4'));
  });

  test('leaving the field having changed nothing saves nothing', async () => {
    show({ models: ['grok-4'] });
    await waitFor(() => expect(screen.getByText(/1 model listed/)).toBeTruthy());
    const user = userEvent.setup({ document });
    await user.click(screen.getByLabelText('xAI model'));
    await user.tab();
    await user.tab();
    expect(picks).toEqual([]);
  });
});

describe('which model a block stands for', () => {
  test('your own row beats a built-in of the same vendor', () => {
    // `loadRegistry` loads the built-ins FIRST. Without this rule, picking
    // `qwen3:32b` on the Ollama block saved correctly and then re-rendered
    // as the built-in `gemma4:e4b` — the pick looked refused.
    const loaded = [
      provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
      provider({ id: 'ollama/qwen3:32b', auth: 'local', locality: 'local' }),
    ];
    const groups = groupProviders(loaded, 'claude-sub/claude-opus-5', new Set(['ollama/qwen3:32b']));
    expect(groups).toHaveLength(1);
    expect(groups[0]!.model).toBe('qwen3:32b');
  });

  test('the model that answers beats even your own row', () => {
    const loaded = [
      provider({ id: 'ollama/gemma4:e4b', auth: 'local', locality: 'local' }),
      provider({ id: 'ollama/qwen3:32b', auth: 'local', locality: 'local' }),
    ];
    const groups = groupProviders(loaded, 'ollama/gemma4:e4b', new Set(['ollama/qwen3:32b']));
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
    const names = groupProviders(loaded, '', new Set()).map(g => g.name);
    expect(new Set(names).size).toBe(2);
  });
});
