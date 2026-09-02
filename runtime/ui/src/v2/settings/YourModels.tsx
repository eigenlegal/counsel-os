/**
 * The models you can use, and which one answers.
 *
 * Settings used to open on a wall of text about providers files and
 * Keychains, then say "None added" — while three models were loaded and
 * working. Nowhere did it show you what you HAVE. And the model that
 * answers lived in a separate group below, as an id typed into a box, so
 * "use that one instead" meant reading an id off one group and typing it
 * into another.
 *
 * One list. Every model the runtime has loaded, what it is, how it is
 * reached, and — on the row itself — whether it is the one that answers.
 */
import type { ProviderInfo } from '../../api/types';
import { prefixOf, vendorFor } from '../vendors';

export interface YourModelsProps {
  /** What the runtime actually loaded: the built-ins and the saved rows. */
  providers: ProviderInfo[];
  /** The id that answers when nothing more specific applies. */
  defaultId: string;
  /** True while the default is the runtime's built-in rather than a choice
   * the practice saved. */
  builtinDefault: boolean;
  busy: boolean;
  onMakeDefault(id: string): void;
}

/** `claude-sub/claude-opus-5` → `Claude · claude-opus-5`. The vendor's own
 * name, then the model, because the prefix is a routing detail. */
export function nameOf(id: string): { vendor: string; model: string } {
  const cut = id.indexOf('/');
  const prefix = cut === -1 ? id : id.slice(0, cut);
  const model = cut === -1 ? '' : id.slice(cut + 1);
  return { vendor: vendorFor(prefix)?.name ?? prefix, model };
}

/** How this model is reached, in the words that matter to a lawyer: who
 * gets the text, and what it costs to ask. */
export function connectionOf(p: ProviderInfo): string {
  if (p.locality === 'local') return 'on this machine';
  switch (p.auth) {
    case 'subscription':
      return 'your subscription';
    case 'apikey':
      return p.keySet === false || p.keySet === undefined ? 'needs a key' : p.keySet === 'env' ? 'key from the environment' : 'key set';
    case 'local':
      return 'on this machine';
    default:
      return 'your cloud account';
  }
}

/** Nothing can answer without a way in. */
export function usable(p: ProviderInfo): boolean {
  return !(p.auth === 'apikey' && (p.keySet === false || p.keySet === undefined));
}

export function YourModels({ providers, defaultId, builtinDefault, busy, onMakeDefault }: YourModelsProps): JSX.Element {
  if (providers.length === 0) {
    return <p className="muted">No model is loaded. Add one below.</p>;
  }
  const current = defaultId.trim();
  return (
    <table className="v2-yours" aria-label="Models you can use">
      <tbody>
        {providers.map(p => {
          const { vendor, model } = nameOf(p.id);
          const isDefault = p.id === current;
          return (
            <tr key={p.id} className={isDefault ? 'v2-yours-on' : undefined}>
              <th scope="row">
                {vendor}
                {model === '' ? null : <span className="v2-yours-model"> · {model}</span>}
              </th>
              <td className="v2-yours-how">{connectionOf(p)}</td>
              <td className="v2-yours-act">
                {isDefault ? (
                  <span className="v2-yours-default">
                    answers by default
                    {builtinDefault ? <span className="v2-yours-note"> · built in, not yet saved</span> : null}
                  </span>
                ) : (
                  <button type="button" className="v2-link" disabled={busy || !usable(p)} onClick={() => onMakeDefault(p.id)}>
                    {usable(p) ? 'use this one' : 'needs a key first'}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
