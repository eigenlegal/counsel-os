import { describe, expect, test } from 'bun:test';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider } from '../core/types';
import { Router } from '../router/router';
import { classifyByRules, classifyTask, modelClassifier } from './classify';

describe('classifyByRules (spec §3)', () => {
  test.each([
    ['Redline this for us.', 'redline'],
    ['Please mark up the indemnity.', 'redline'],
    ['Compare round 2 vs round 3 — what moved?', 'compare'],
    ['List the parties and defined terms.', 'extract'],
    ['Summarize where we stand on Acme.', 'summarize'],
    ["What's due this week?", 'docket'],
    ['Remember this: we never accept unlimited liability.', 'remember'],
    ['What does the law in Delaware require for non-competes?', 'research'],
    ['Draft a mutual NDA for Acme.', 'draft'],
    ['Would we sign this?', 'review'],
    ['Hello there', null],
  ])('%s → %s', (message, task) => {
    expect(classifyByRules(message) as string | null).toBe(task);
  });

  test('a review verb with a document attached is a review; a redline verb wins over review', () => {
    expect(classifyByRules('Flag any issues with this.\n`matters/acme/nda.docx`')).toBe('review');
    expect(classifyByRules('Review it and give me a redline.\n`matters/acme/nda.docx`')).toBe('redline');
  });

  test('"flag" and "assess" need a document; alone they are not a review', () => {
    expect(classifyByRules('Flag anything odd.')).toBeNull();
    expect(classifyByRules('Assess this.\n`matters/acme/nda.md`')).toBe('review');
  });
});

describe('classifyTask precedence', () => {
  test('the caller wins, then the thread, and a custom route name is kept as-is', async () => {
    expect(await classifyTask({ message: 'redline this', callerTask: 'classify' })).toEqual({ task: 'classify', source: 'caller' });
    expect(await classifyTask({ message: 'redline this', threadTask: 'retro' })).toEqual({ task: 'retro', source: 'caller' });
    expect(await classifyTask({ message: 'redline this', callerTask: '' })).toEqual({ task: 'redline', source: 'rule' });
  });

  test('no rule → the injected model; no model or a null answer → chat by default', async () => {
    let asked = 0;
    const model = async (): Promise<'research'> => {
      asked += 1;
      return 'research';
    };
    expect(await classifyTask({ message: 'hi there' }, model)).toEqual({ task: 'research', source: 'model' });
    expect(asked).toBe(1);
    expect(await classifyTask({ message: 'hi there' })).toEqual({ task: 'chat', source: 'default' });
    expect(await classifyTask({ message: 'hi there' }, async () => null)).toEqual({ task: 'chat', source: 'default' });
  });

  test('a rule hit never asks the model; a throwing model is a chat step, not a failure', async () => {
    let asked = 0;
    const model = async (): Promise<null> => {
      asked += 1;
      throw new Error('boom');
    };
    expect(await classifyTask({ message: 'draft a letter' }, model)).toEqual({ task: 'draft', source: 'rule' });
    expect(asked).toBe(0);
    expect(await classifyTask({ message: 'hi' }, model)).toEqual({ task: 'chat', source: 'default' });
    expect(asked).toBe(1);
  });
});

describe('modelClassifier', () => {
  test('one structured turn: the taxonomy in the system prompt, the message alone, a task id back', async () => {
    const fake = new FakeModelProvider([{ output: { task: 'summarize' } }]);
    const classify = modelClassifier([fake], new Router({ default: fake.id }, [fake]));
    expect(await classify('so where does this leave us')).toBe('summarize');
    const req = fake.lastRequest!;
    expect(req.system).toContain('- summarize:');
    expect(req.messages).toEqual([{ role: 'user', content: 'so where does this leave us' }]);
    expect(req.tools).toEqual([]);
    expect(req.outputSchema).toBeDefined();
    expect(req.maxToolCalls).toBe(0);
  });

  test('an answer outside the taxonomy, an error, or a null output is null — never a throw', async () => {
    const answers = [{ output: { task: 'classify' } }, { error: 'exploded' }, { output: null }];
    const fake = new FakeModelProvider(answers);
    const classify = modelClassifier([fake], new Router({ default: fake.id }, [fake]));
    expect(await classify('x')).toBeNull();
    expect(await classify('x')).toBeNull();
    expect(await classify('x')).toBeNull();
  });

  test('prefers the smallest local provider over the router default', async () => {
    const cloud = new FakeModelProvider([{ output: { task: 'draft' } }]);
    Object.assign(cloud, { id: 'cloud/big' });
    (cloud as { capabilities: ModelProvider['capabilities'] }).capabilities = { tools: true, caching: false, thinking: false, contextTokens: 200_000, auth: 'local', locality: 'cloud' };
    const local = new FakeModelProvider([{ output: { task: 'extract' } }]);
    Object.assign(local, { id: 'ollama/small' });
    (local as { capabilities: ModelProvider['capabilities'] }).capabilities = { tools: true, caching: false, thinking: false, contextTokens: 8_000, auth: 'local', locality: 'local' };
    const classify = modelClassifier([cloud, local], new Router({ default: 'cloud/big' }, [cloud, local]));
    expect(await classify('x')).toBe('extract');
    expect(cloud.lastRequest).toBeUndefined();
  });
});
