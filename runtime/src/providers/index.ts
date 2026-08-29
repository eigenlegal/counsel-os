import type { ModelProvider } from '../core/types';
import { ClaudeHarnessProvider } from './claude-harness';
import { CodexHarnessProvider } from './codex-harness';
import { directProviderFromId } from './direct';

export function buildProviders(opts: { ids: string[]; vaultRoot: string; claudeCwd?: string; codexHomeDir?: string }): ModelProvider[] {
  return opts.ids.map(id => {
    const [vendor, ...rest] = id.split('/');
    const model = rest.join('/');
    if (vendor === 'claude-sub') return new ClaudeHarnessProvider({ model, id, ...(opts.claudeCwd ? { cwd: opts.claudeCwd } : {}) });
    if (vendor === 'codex-sub') return new CodexHarnessProvider({ model, vaultRoot: opts.vaultRoot, id, ...(opts.codexHomeDir ? { homeDir: opts.codexHomeDir } : {}) });
    return directProviderFromId(id);
  });
}
