import { lstatSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { locateCli } from '../providers/cli-locate';
import type { ModelProvider } from '../core/types';
export interface LocalSignIn { installed: boolean; loggedIn: boolean; billing: 'subscription' | 'api' | 'unknown'; message: string }
/** Local format check only. Never returns account data or claims server access. */
export function checkCodexSignIn(home = process.env.CODEX_HOME ?? join(homedir(), '.codex'), installed = locateCli('codex') !== null): LocalSignIn {
  if (!installed) return { installed: false, loggedIn: false, billing: 'unknown', message: 'Install Codex, then sign in with ChatGPT.' };
  try {
    const path = join(home, 'auth.json'), info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 100_000) throw new Error('Unsupported credential file');
    const auth = JSON.parse(readFileSync(path, 'utf8'));
    if (auth.auth_mode === 'apikey') return { installed, loggedIn: false, billing: 'api', message: 'Codex is set to API billing. This connection requires a ChatGPT sign-in; no API fallback will be used.' };
    if (auth.auth_mode !== 'chatgpt' || !auth.tokens || typeof auth.tokens.access_token !== 'string' || !auth.tokens.access_token) throw new Error('No supported login');
    return { installed, loggedIn: true, billing: 'subscription', message: 'Local ChatGPT sign-in found. Server access and the selected model have not been tested.' };
  } catch { return { installed, loggedIn: false, billing: 'unknown', message: 'No supported file-backed ChatGPT sign-in found. Sign in through Codex using the command below. Keychain-only sign-ins are not supported by this adapter.' }; }
}
export async function testModelConnection(provider: ModelProvider, signal: AbortSignal) {
  signal.throwIfAborted();
  let complete = false;
  for await (const event of provider.run({ tenant: 'workspace-connection-test', system: 'This is a connectivity test. Reply with OK. Do not use tools.', messages: [{ role: 'user', content: 'Reply with OK.' }], tools: [], maxTokens: 16, maxToolCalls: 0, signal })) {
    signal.throwIfAborted();
    if (event.type === 'error' || event.type === 'tool_call') throw new Error('The selected model did not complete the connection test.');
    if (event.type === 'done') complete = true;
  }
  signal.throwIfAborted();
  if (!complete) throw new Error('The connection test ended without a completed response.');
  return { checkedAt: new Date().toISOString(), message: 'This model completed a small test response. No practice files, chats, or documents were sent. This checks access, not legal accuracy or document-tool performance.' };
}
