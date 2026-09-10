import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCodexSignIn, testModelConnection } from './connection-setup';
import { FakeModelProvider } from '../core/fake-provider';
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
test('local checks distinguish missing, signed-out, wrong-billing and compatible credentials without exposing them', () => {
  const home = mkdtempSync(join(tmpdir(), 'counsel-signin-test-')); roots.push(home);
  expect(checkCodexSignIn(home, false).installed).toBe(false);
  expect(checkCodexSignIn(home, true).loggedIn).toBe(false);
  const file = join(home, 'auth.json');
  writeFileSync(file, JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: 'synthetic-not-a-key' }));
  expect(checkCodexSignIn(home, true).billing).toBe('api');
  writeFileSync(file, JSON.stringify({ auth_mode: 'chatgpt', tokens: { access_token: 'synthetic-private-value', account_id: 'private-name' } }));
  const result = checkCodexSignIn(home, true); expect(result.loggedIn).toBe(true);
  expect(JSON.stringify(result)).not.toContain('synthetic-private-value'); expect(JSON.stringify(result)).not.toContain('private-name');
  rmSync(file); symlinkSync(join(home, 'other'), file); expect(checkCodexSignIn(home, true).loggedIn).toBe(false);
});
test('model test sends only a constant prompt and no tools or workspace', async () => {
  const calls: any[] = [];
  const model = { id: 'fixture', kind: 'direct', capabilities: {}, async *run(request: unknown) { calls.push(request); yield { type: 'done', output: 'OK', usage: { inputTokens: 1, outputTokens: 1 } }; } } as any;
  expect((await testModelConnection(model, new AbortController().signal)).message).toContain('No practice');
  expect(calls).toHaveLength(1); expect(calls[0].tools).toEqual([]); expect(calls[0].messages).toEqual([{ role: 'user', content: 'Reply with OK.' }]);
  const controller = new AbortController(); controller.abort();
  await expect(testModelConnection(model, controller.signal)).rejects.toThrow();
});
