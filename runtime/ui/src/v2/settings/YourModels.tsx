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

/** How a model is reached, and whether it can answer at all. */
export interface Reach {
  /** Who gets the text, in the words that matter to a lawyer. */
  how: string;
  /** False only when the runtime has no credential to call it with. */
  usable: boolean;
  /** Why it cannot answer. Shown in place of the action, as text: a
   * disabled button is removed from the accessibility tree, so the one
   * thing a blocked row has to say would be the thing never announced. */
  blocked?: string;
}

/**
 * ONE function for both, because they were two and disagreed.
 *
 * A model server on this machine has `locality: 'local'` AND `auth:
 * 'apikey'` with no key — the vendor row takes a key, the loopback address
 * means nobody checks it. Read `auth` alone and the row is refused; read
 * `locality` alone and an uncredentialed Bedrock row looks ready. So a
 * lawyer running everything locally could not make their own model answer,
 * while one who had pasted no AWS keys at all could make Bedrock the
 * default and have every step fail at call time.
 *
 * `keySet` is the runtime's own answer to "is there a credential", and it
 * covers the enterprise chains (`'default-chain'` — an AWS profile, gcloud's
 * ADC) as well as single keys. Absent means the provider takes no key, or
 * the runtime predates the field; neither is a reason to refuse a row.
 */
export function reachOf(p: ProviderInfo): Reach {
  if (p.locality === 'local' || p.auth === 'local') return { how: 'on this machine', usable: true };
  if (p.auth === 'subscription') return { how: 'your subscription', usable: true };
  const enterprise = p.auth === 'azure' || p.auth === 'sigv4' || p.auth === 'gcp';
  switch (p.keySet) {
    case false:
      return enterprise
        ? {
            how: 'no credentials yet',
            usable: false,
            blocked: 'needs credentials first',
          }
        : { how: 'no key yet', usable: false, blocked: 'needs a key first' };
    case 'env':
      return { how: 'key from the environment', usable: true };
    case 'default-chain':
      return { how: 'the credentials on this machine', usable: true };
    case true:
      return {
        how: enterprise ? 'your cloud account' : 'key set',
        usable: true,
      };
    default:
      return { how: 'your cloud account', usable: true };
  }
}

export function YourModels({ providers, defaultId, builtinDefault, busy, onMakeDefault }: YourModelsProps): JSX.Element {
  if (providers.length === 0) {
    return <p className="muted">No model is loaded. Add one below.</p>;
  }
  const current = defaultId.trim();
  // The loaded set can name the same id twice — `loadRegistry` appends the
  // built-ins and then the file, and a file may re-declare one (adding
  // `ollama/gemma4:e4b`, which is the built-in's own model, does it). Two
  // identical rows and a duplicate React key; the first one wins.
  const seen = new Set<string>();
  const rows = providers.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  return (
    <div className="v2-yours-wrap">
      <table className="v2-yours" aria-label="Models you can use">
        <tbody>
          {rows.map(p => {
            const { vendor, model } = nameOf(p.id);
            const isDefault = p.id === current;
            const reach = reachOf(p);
            return (
              <tr key={p.id} className={isDefault ? 'v2-yours-on' : undefined}>
                <th scope="row">
                  {vendor}
                  {model === '' ? null : <span className="v2-yours-model"> · {model}</span>}
                </th>
                <td className="v2-yours-how">{reach.how}</td>
                <td className="v2-yours-act">
                  {isDefault ? (
                    <span className="v2-yours-default">
                      answers by default
                      {builtinDefault ? <span className="v2-yours-note"> · built in, not yet saved</span> : null}
                    </span>
                  ) : reach.usable ? (
                    // Named per row: a reader pulling up the button list hears
                    // "use this one" once per model otherwise, with nothing to
                    // tell them apart.
                    <button type="button" className="v2-link" disabled={busy} aria-label={`Use ${vendor}${model === '' ? '' : ` ${model}`}`} onClick={() => onMakeDefault(p.id)}>
                      use this one
                    </button>
                  ) : (
                    <span className="v2-yours-note">{reach.blocked}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
