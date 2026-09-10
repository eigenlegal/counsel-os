const messages = {
  model: 'The selected model is not available through this connection. Choose another model or check access using the same signed-in CLI or API account. No fallback model or billing method was used.',
  limit: 'This connection reached a usage or rate limit. Wait or check the selected account’s limits before retrying. No fallback connection was used.',
  auth: 'The selected connection needs attention to its sign-in or credentials. Check the same account in Settings and sign in through the CLI if applicable. No API fallback was used.',
  tools: 'The connection could not access Counsel’s required tools. Check the installed CLI version and restart the workspace. No completed work was saved.',
  other: 'The connection could not finish this response. Check your sign-in, model access or API balance in Settings. Partial text is retained; no completed work or knowledge was saved.',
};
/** Never persist raw vendor/CLI diagnostics: they can contain prompts, paths or credentials. */
export function workspaceProviderFailure(raw: unknown): string {
  const message = (raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '').slice(0, 16_000);
  if (Object.values(messages).includes(message)) return message;
  if (/model.{0,160}(?:not supported|not available|unavailable|not found|does not exist|do not have access|don't have access)|(?:access|permission).{0,80}(?:denied|not have).{0,80}model|(?:do not|don't).{0,30}have access.{0,30}model/i.test(message))
    return messages.model;
  if (/rate.limit|usage.limit|quota|insufficient_quota|too many requests|\b429\b/i.test(message))
    return messages.limit;
  if (/unauthorized|authentication|invalid.api.key|token.{0,30}expired|refresh.token|login required|sign.in|\b401\b|ENOENT.{0,200}auth\.json/i.test(message))
    return messages.auth;
  if (/code.mode host is disabled|required.*mcp|mcp.*(?:failed|unavailable)|tool.*bridge|could not access Counsel’s required tools/i.test(message))
    return messages.tools;
  return messages.other;
}
