import type { ModelProvider } from '../core/types';
import { ClaudeHarnessProvider } from './claude-harness';
import { CodexHarnessProvider } from './codex-harness';
import { directProviderFromId } from './direct';

export function buildProviders(opts: { ids: string[]; vaultRoot: string }): ModelProvider[] {
  return opts.ids.map(id => {
    const [vendor, ...rest] = id.split('/');
    const model = rest.join('/');
    if (vendor === 'claude-sub') return new ClaudeHarnessProvider({ model, id });
    if (vendor === 'codex-sub') return new CodexHarnessProvider({ model, vaultRoot: opts.vaultRoot, id });
    return directProviderFromId(id);
  });
}
