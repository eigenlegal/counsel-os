import { expect, test } from 'bun:test';
import { workspaceProviderFailure } from './provider-failure';

test('provider failures expose actionable categories without raw account, prompt, path or key details', () => {
  for (const [error, expected] of [
    ["The 'synthetic' model is not supported when using a ChatGPT account.", 'not available'],
    ['You do not have access to model synthetic.', 'not available'],
    ['status 429: too many requests', 'usage or rate limit'],
    ['401 invalid API key', 'sign-in or credentials'],
    ['required MCP server failed', 'required tools'],
    ['Unexpected vendor diagnostic', 'could not finish'],
  ]) {
    const output = workspaceProviderFailure(`${error} SECRET-TEXT /private/user/path test@example.invalid`);
    expect(output).toContain(expected!);
    expect(output).not.toContain('SECRET-TEXT'); expect(output).not.toContain('/private'); expect(output).not.toContain('example.invalid');
    expect(workspaceProviderFailure(output)).toBe(output);
  }
});
