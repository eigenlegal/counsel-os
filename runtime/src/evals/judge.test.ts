import { describe, expect, test } from 'bun:test';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider } from '../core/types';
import { Router } from '../router/router';
import { pickJudge, providerJudge, vendorOf } from './judge';
import { parseFixture } from './fixture';
import { renderResult, renderSummary, selectFixtures } from './select';
import type { LoadedFixture } from './fixture';

function named(id: string, script: ConstructorParameters<typeof FakeModelProvider>[0] = [{ text: 'x' }]): ModelProvider {
  const p = new FakeModelProvider(script);
  return Object.assign(p, { id }) as ModelProvider;
}

describe('providerJudge', () => {
  test('one structured turn per criterion; a verdict comes back as pass + quote', async () => {
    const judge = providerJudge(new FakeModelProvider([{ output: { pass: true, quote: 'the cap' } }]));
    expect(await judge({ id: 'c', text: 'Mentions the cap.' }, 'The cap is low.')).toEqual({ pass: true, quote: 'the cap' });
  });
  test('a provider error or a malformed verdict throws (the scorer records "not judged")', async () => {
    await expect(providerJudge(new FakeModelProvider([{ error: 'down' }]))({ id: 'c', text: 't' }, 'a')).rejects.toThrow(/down/);
    await expect(providerJudge(new FakeModelProvider([{ output: { verdict: 'yes' } }]))({ id: 'c', text: 't' }, 'a')).rejects.toThrow(/verdict shape/);
  });
});

describe('pickJudge', () => {
  const anthropic = named('anthropic/claude-opus-5');
  const openai = named('openai/gpt-5');
  const router = (providers: ModelProvider[]) => new Router({ default: providers[0]!.id }, providers);

  test('the default provider judges a shipped-only set, even its own vendor', () => {
    expect(pickJudge({ providers: [anthropic], router: router([anthropic]), providerId: 'anthropic/claude-sonnet-5', practiceSet: false })?.provider.id).toBe('anthropic/claude-opus-5');
  });
  test('on a practice set the judge never shares the vendor under test', () => {
    const picked = pickJudge({ providers: [anthropic, openai], router: router([anthropic]), providerId: 'anthropic/claude-sonnet-5', practiceSet: true });
    expect(picked?.provider.id).toBe('openai/gpt-5');
    expect(picked?.note).toMatch(/shares a vendor/);
    expect(pickJudge({ providers: [anthropic], router: router([anthropic]), providerId: 'anthropic/claude-sonnet-5', practiceSet: true })).toBeNull();
  });
  test('vendorOf', () => {
    expect(vendorOf('ollama/llama3.1:8b')).toBe('ollama');
    expect(vendorOf('fake')).toBe('fake');
  });
});

describe('selectFixtures', () => {
  const loaded = (id: string, extra: Record<string, unknown> = {}): LoadedFixture => ({ fixture: parseFixture({ id, task: 't', ...extra }), set: 'shipped', file: id, vaults: { kind: 'dir', dir: '/x' } });
  const all = [loaded('a', { vault: 'v' }), loaded('b', { vault: 'v', scorer: 'redline', expected: { document: 'd.docx', items: [] } }), loaded('legacy')];

  test('by id, by task, or all; legacy fixtures are skipped with a reason', () => {
    expect(selectFixtures(all, { fixtures: ['a'] }).fixtures.map(l => l.fixture.id)).toEqual(['a']);
    expect(selectFixtures(all, { fixtures: ['zzz'] }).error).toMatch(/no fixture with id zzz/);
    expect(selectFixtures(all, { fixtures: ['legacy'] }).skipped).toEqual([{ id: 'legacy', reason: 'a legacy fixture with no vault cannot be run' }]);
    expect(selectFixtures(all, { task: 'redline' }).fixtures.map(l => l.fixture.id)).toEqual(['b']);
    expect(selectFixtures(all, { task: 'docket' }).error).toMatch(/no fixture runs as the docket task/);
    const every = selectFixtures(all, { all: true });
    expect(every.fixtures.map(l => l.fixture.id)).toEqual(['a', 'b']);
    expect(every.skipped.map(s => s.id)).toEqual(['legacy']);
    expect(selectFixtures(all, {}).error).toMatch(/--fixture/);
  });

  test('renders a line and a summary', () => {
    const base = { at: '', source: 'shipped' as const, task: 'review', providerId: 'p', modelVersion: 'p', terms: {}, notes: [], durationMs: 1500 };
    expect(renderResult({ ...base, fixtureId: 'a', score: 0.775, costUsd: 0.01 })).toBe(`0.7750  ${'a'.padEnd(34)} 1.5s  $0.0100`);
    expect(renderResult({ ...base, fixtureId: 'a', documentId: 'd', score: null, error: 'boom' })).toBe(`FAIL    ${'a#d'.padEnd(34)} 1.5s  boom`);
    expect(renderResult({ ...base, fixtureId: 'a', score: 1, notes: ['Missed: x.'] })).toContain('Missed: x.');
    expect(renderSummary({ count: 2, scored: 1, failed: 1, mean: 1, costUsd: 0.5 })).toBe('1 of 2 scored, 1 failed · mean 1.0000 · $0.5000');
    expect(renderSummary({ count: 0, scored: 0, failed: 0, mean: null, costUsd: 0 })).toBe('0 of 0 scored, 0 failed · no score');
  });
});
