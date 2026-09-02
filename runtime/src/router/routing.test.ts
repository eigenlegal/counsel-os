import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router, parseRouterConfig } from './router';
import { parseRoutingPolicy, readRoutingPolicy, renderRoutingPolicy, taskPolicy, writeRoutingPolicy } from './policy';
import { routeScores } from './scores';
import type { ProviderScore } from './scores';
import type { Scoreboard, ScoreboardRow } from '../evals/scoreboard';
import type { ModelProvider } from '../core/types';

function p(id: string, caps: Partial<ModelProvider['capabilities']> = {}): ModelProvider {
  return {
    id, kind: 'direct',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 200_000, auth: 'apikey', ...caps },
    async *run() { yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } }; },
  };
}

const providers = [
  p('anthropic/claude-opus-5'),
  p('openai/gpt-5.6'),
  p('ollama/gemma4', { auth: 'local', contextTokens: 32_000 }),
];
const router = new Router(parseRouterConfig('default: anthropic/claude-opus-5\n'), providers);

function score(providerId: string, over: Partial<ProviderScore> = {}): ProviderScore {
  return { providerId, score: 0.9, meanCostUsd: 0.2, medianMs: 40_000, set: 'shipped', ...over };
}

describe('routing from the scoreboard', () => {
  test('the best score above the bar wins, and the reason says so', () => {
    const routed = router.route('review', {
      scores: [score('openai/gpt-5.6', { score: 0.74 }), score('anthropic/claude-opus-5', { score: 0.91 })],
    });
    expect(routed.provider.id).toBe('anthropic/claude-opus-5');
    expect(routed.reason).toEqual({ kind: 'scored', text: 'review 0.91' });
  });

  test('a provider below the bar is not a candidate; the default answers and says why', () => {
    const routed = router.route('review', { scores: [score('openai/gpt-5.6', { score: 0.61 })] });
    expect(routed.provider.id).toBe('anthropic/claude-opus-5');
    expect(routed.reason.kind).toBe('below-bar');
    expect(routed.reason.text).toBe('no model clears 0.70 for review (best 0.61)');
  });

  test('a task nothing has scored falls to the default and says nothing is scored', () => {
    const routed = router.route('draft', { scores: [] });
    expect(routed.provider.id).toBe('anthropic/claude-opus-5');
    expect(routed.reason).toEqual({ kind: 'no-score', text: 'no score yet' });
  });

  test('with no scoreboard at all the reason is the plain default, not a complaint', () => {
    expect(router.route('review').reason).toEqual({ kind: 'default', text: 'the default model' });
  });

  test('cost and latency choose among peers within the band, never a materially worse answer', () => {
    const scores = [
      score('anthropic/claude-opus-5', { score: 0.91, meanCostUsd: 0.30, medianMs: 60_000 }),
      score('openai/gpt-5.6', { score: 0.88, meanCostUsd: 0.05, medianMs: 20_000 }),
      // Cheapest and fastest of all, but a materially worse answer: out of band.
      score('ollama/gemma4', { score: 0.72, meanCostUsd: 0, medianMs: 5_000 }),
    ];
    expect(router.route('review', { scores, policy: { prefer: 'cost' } }).provider.id).toBe('openai/gpt-5.6');
    expect(router.route('review', { scores, policy: { prefer: 'latency' } }).provider.id).toBe('openai/gpt-5.6');
    expect(router.route('review', { scores, policy: { prefer: 'quality' } }).provider.id).toBe('anthropic/claude-opus-5');
    expect(router.route('review', { scores, policy: { prefer: 'cost' } }).reason.text).toBe('review 0.88 · by cost');
  });

  test('an unknown cost never passes for a free one', () => {
    const scores = [
      score('anthropic/claude-opus-5', { score: 0.90, meanCostUsd: 0.30 }),
      score('openai/gpt-5.6', { score: 0.89, meanCostUsd: null }),
    ];
    expect(router.route('review', { scores, policy: { prefer: 'cost' } }).provider.id).toBe('anthropic/claude-opus-5');
  });

  test('a pin wins among the candidates and is named', () => {
    const scores = [score('anthropic/claude-opus-5', { score: 0.91 }), score('openai/gpt-5.6', { score: 0.80 })];
    const routed = router.route('review', { scores, policy: { pinned: 'openai/gpt-5.6' } });
    expect(routed.provider.id).toBe('openai/gpt-5.6');
    expect(routed.reason).toEqual({ kind: 'pinned', text: 'pinned for review · 0.80' });
  });

  test('a pin below the bar is not honoured — the bar is the practice’s floor', () => {
    const scores = [score('anthropic/claude-opus-5', { score: 0.91 }), score('openai/gpt-5.6', { score: 0.40 })];
    expect(router.route('review', { scores, policy: { pinned: 'openai/gpt-5.6' } }).provider.id).toBe('anthropic/claude-opus-5');
  });

  test('a high score never buys a way past a matter that stays on this machine', () => {
    const scores = [score('anthropic/claude-opus-5', { score: 0.95 }), score('ollama/gemma4', { score: 0.71 })];
    const routed = router.route('review', { scores, localOnly: true });
    expect(routed.provider.id).toBe('ollama/gemma4');
    expect(routed.reason.kind).toBe('scored');
  });

  test('stays-local with no scored local model still answers locally, by the old path', () => {
    const routed = router.route('review', { scores: [score('anthropic/claude-opus-5', { score: 0.95 })], localOnly: true });
    expect(routed.provider.id).toBe('ollama/gemma4');
    expect(routed.reason).toEqual({ kind: 'stays-local', text: 'stays on this machine' });
  });

  test('a scored provider that is not loaded is skipped, not resolved to nothing', () => {
    const routed = router.route('review', { scores: [score('mistral/large', { score: 0.99 }), score('openai/gpt-5.6', { score: 0.75 })] });
    expect(routed.provider.id).toBe('openai/gpt-5.6');
  });

  test('resolve() keeps its old shape for every caller that does not ask why', () => {
    expect(router.resolve('review', { scores: [score('openai/gpt-5.6')] }).id).toBe('openai/gpt-5.6');
    expect(router.resolve().id).toBe('anthropic/claude-opus-5');
  });
});

describe('the practice’s own fixtures lead the shipped ones', () => {
  function row(over: Partial<ScoreboardRow> & { providerId: string }): ScoreboardRow {
    return {
      modelVersion: over.providerId.split('/')[1] ?? over.providerId,
      score: 0.8, scored: 2, sampleSize: 2, failed: [], medianMs: 1000, meanCostUsd: 0.1,
      lastAt: '2026-09-02T00:00:00.000Z', staleDays: 0, ...over,
    };
  }
  const board: Scoreboard = {
    at: '2026-09-02T00:00:00.000Z',
    tasks: [
      {
        task: 'review',
        sets: {
          practice: { fixtures: 2, rows: [row({ providerId: 'ollama/gemma4', score: 0.77 })] },
          shipped: { fixtures: 8, rows: [row({ providerId: 'anthropic/claude-opus-5', score: 0.95 })] },
          benchmark: { fixtures: 100, rows: [row({ providerId: 'anthropic/claude-opus-5', score: 0.99 })] },
        },
      },
      {
        task: 'redline',
        sets: {
          practice: { fixtures: 0, rows: [] },
          shipped: { fixtures: 1, rows: [row({ providerId: 'anthropic/claude-opus-5', score: 0.74 }), row({ providerId: 'openai/gpt-5.6', score: null })] },
          benchmark: { fixtures: 0, rows: [] },
        },
      },
    ],
  };

  test('practice scores win where they exist; shipped stands in where they do not; benchmarks never route', () => {
    const scores = routeScores(board);
    expect(scores['review']).toEqual([{ providerId: 'ollama/gemma4', score: 0.77, meanCostUsd: 0.1, medianMs: 1000, set: 'practice' }]);
    expect(scores['redline']?.map(s => s.providerId)).toEqual(['anthropic/claude-opus-5']);
    expect(scores['redline']?.[0]?.set).toBe('shipped');
  });

  test('a failed cell is not a candidate', () => {
    expect(routeScores(board)['redline']?.some(s => s.providerId === 'openai/gpt-5.6')).toBe(false);
  });
});

describe('the routing policy file', () => {
  test('reads a written file back, and a lawyer can read the file itself', () => {
    const root = mkdtempSync(join(tmpdir(), 'routing-policy-'));
    mkdirSync(join(root, 'practice'), { recursive: true });
    writeRoutingPolicy(root, { tasks: { review: { min_score: 0.8, prefer: 'cost', pinned: 'ollama/gemma4' } } });
    const text = readFileSync(join(root, 'practice', 'routing.yaml'), 'utf8');
    expect(text).toContain('# How counsel-os routes each kind of work');
    expect(text).toContain('    pinned: ollama/gemma4');
    expect(readRoutingPolicy(root)).toEqual({ tasks: { review: { min_score: 0.8, prefer: 'cost', pinned: 'ollama/gemma4' } } });
  });

  test('a typo in one task costs that task, not the file', () => {
    const parsed = parseRoutingPolicy('tasks:\n  review: { min_score: 0.8 }\n  redline: { prefer: cheapest }\n  draft: nonsense\n');
    expect(parsed.tasks['review']).toEqual({ min_score: 0.8 });
    expect(parsed.tasks['redline']).toBeUndefined();
    expect(parsed.tasks['draft']).toBeUndefined();
  });

  test('an absent file routes by the defaults', () => {
    const root = mkdtempSync(join(tmpdir(), 'routing-policy-'));
    expect(readRoutingPolicy(root)).toEqual({ tasks: {} });
    expect(taskPolicy(readRoutingPolicy(root), 'review')).toEqual({ min_score: 0.7, prefer: 'quality' });
  });

  test('a garbled file routes by the defaults rather than stopping the practice', () => {
    const root = mkdtempSync(join(tmpdir(), 'routing-policy-'));
    mkdirSync(join(root, 'practice'), { recursive: true });
    writeFileSync(join(root, 'practice', 'routing.yaml'), 'tasks: [this is not a map\n');
    expect(readRoutingPolicy(root)).toEqual({ tasks: {} });
  });

  test('an empty policy still renders a file a lawyer can open and edit', () => {
    expect(renderRoutingPolicy({ tasks: {} })).toContain('tasks: {}');
  });
});
