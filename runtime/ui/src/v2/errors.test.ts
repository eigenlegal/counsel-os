import { describe, expect, test } from 'bun:test';
import { humanizeStepError } from './errors';

const CLAUDE = 'claude-sub/claude-opus-5';
const CODEX = 'codex-sub/gpt-5.6-terra';
const OLLAMA = 'ollama/gemma4:e4b';

describe('humanizeStepError', () => {
  test('the runtime\'s own shapes', () => {
    expect(humanizeStepError('step timed out after 600s', CLAUDE).line).toBe(
      'The step ran past its 10-minute limit. Ask something smaller, or raise the step timeout in Settings.',
    );
    expect(humanizeStepError('step timed out after 45s', CLAUDE).line).toContain('45-second limit');
    expect(humanizeStepError("system prompt exceeds the provider's context window (40000 > 32000)", OLLAMA).line).toBe(
      'Ollama could not take this much at once: the instructions and the document together exceed its context window.',
    );
    expect(humanizeStepError('unknown provider: openai/gpt-5.6', 'openai/gpt-5.6').line).toBe(
      'No provider called openai/gpt-5.6 is loaded. Pick one in Settings, then retry.',
    );
    expect(humanizeStepError('unknown thread: t-9', CLAUDE).line).toContain('no longer exists');
    expect(humanizeStepError('claude-sub/claude-opus-5 ended the step without a done or error event', CLAUDE).line).toBe('Claude stopped without answering. Retry.');
    expect(humanizeStepError('structured output failed validation: expected number', CODEX).line).toContain('ChatGPT answered in the wrong shape');
  });

  test('the Claude harness: login, CLI missing, busy', () => {
    expect(humanizeStepError('claude harness: Not logged in · Please run /login', CLAUDE)).toEqual({
      line: 'Claude did not answer: your Claude login has expired. Run `claude login` in a terminal, then retry.',
      detail: 'claude harness: Not logged in · Please run /login',
    });
    expect(humanizeStepError('claude harness: spawn claude ENOENT', CLAUDE).line).toContain('Claude Code CLI is not installed');
    expect(humanizeStepError('claude harness: error_max_turns', CLAUDE).line).toContain('too many tool calls');
    expect(humanizeStepError('claude harness: 429 rate_limit_error', CLAUDE).line).toBe('Claude is busy right now. Retry in a moment.');
  });

  test('the Codex harness and Ollama', () => {
    expect(humanizeStepError('codex harness: not authenticated', CODEX).line).toContain('Run `codex login`');
    expect(humanizeStepError('codex harness: spawn codex ENOENT', CODEX).line).toContain('Codex CLI is not installed');
    expect(humanizeStepError('fetch failed', OLLAMA).line).toBe('Ollama is not running on this machine. Start it, then retry.');
    expect(humanizeStepError('connect ECONNREFUSED 127.0.0.1:11434', OLLAMA).line).toContain('Ollama is not running');
    expect(humanizeStepError("model 'gemma4:e4b' not found, try pulling it first", OLLAMA).line).toBe(
      'Ollama does not have the model gemma4:e4b. Run `ollama pull gemma4:e4b`, then retry.',
    );
  });

  test('API-key providers', () => {
    expect(humanizeStepError('401 invalid x-api-key', 'anthropic/claude-opus-5').line).toContain('Claude did not answer: the API key was rejected');
    expect(humanizeStepError('Incorrect API key provided', 'openai/gpt-5.6').line).toContain('OpenAI did not answer: the API key was rejected');
    expect(humanizeStepError('429 Too Many Requests', 'openai/gpt-5.6').line).toBe('OpenAI is busy right now. Retry in a moment.');
  });

  test('anything unmatched keeps the original words, with the vendor in front', () => {
    expect(humanizeStepError('something odd happened', CLAUDE)).toEqual({ line: 'Claude did not answer: something odd happened' });
    // No provider recorded: "Counsel", never an invented vendor.
    expect(humanizeStepError('something odd happened', '')).toEqual({ line: 'Counsel did not answer: something odd happened' });
    // An unknown vendor is named by its raw id.
    expect(humanizeStepError('boom', 'acme/model-1').line).toBe('acme/model-1 did not answer: boom');
  });

  test('detail is the original text only when the line does not already carry it', () => {
    expect(humanizeStepError('boom', CLAUDE).detail).toBeUndefined();
    expect(humanizeStepError('step timed out after 600s', CLAUDE).detail).toBe('step timed out after 600s');
  });
});
