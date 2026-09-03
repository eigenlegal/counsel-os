/**
 * The providers you have, and the model each one runs.
 *
 * A "provider" in the config is really a provider AND a model fused into one
 * id — `anthropic/claude-opus-5`. That is fine for routing, and wrong for a
 * person: it made a second model of a vendor you already had into a whole
 * second row, with its own key to paste and its own id to type by hand.
 *
 * So the page shows one block per PROVIDER, with the model as a picker on
 * it. You choose a provider, then you choose the model. The list comes from
 * the provider itself, so it is what they offer today rather than what we
 * hard-coded — and the key is filed under the vendor, so you paste it once.
 */
import { useEffect, useState } from 'react';
import type { ProviderInfo } from '../../api/types';
import { ModelCombo } from '../../settings/ModelCombo';
import { useModels } from '../../settings/useModels';
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
  /** A saved row's base URL for this vendor, so a local runner's model list
   * is asked for at the right address. */
  baseURLOf(prefix: string): string | undefined;
  onMakeDefault(id: string): void;
  /** Run this provider on a different model. Saves. */
  onPickModel(prefix: string, model: string): void;
}

/** `claude-sub/claude-opus-5` → `Claude` + `claude-opus-5`. The vendor's own
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
 * `locality` alone and an uncredentialed Bedrock row looks ready.
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
        ? { how: 'no credentials yet', usable: false, blocked: 'needs credentials first' }
        : { how: 'no key yet', usable: false, blocked: 'needs a key first' };
    case 'env':
      return { how: 'key from the environment', usable: true };
    case 'default-chain':
      return { how: 'the credentials on this machine', usable: true };
    case true:
      return { how: enterprise ? 'your cloud account' : 'key set', usable: true };
    default:
      return { how: 'your cloud account', usable: true };
  }
}

/** One provider, and every model of it the runtime has loaded. */
export interface ProviderGroup {
  prefix: string;
  name: string;
  reach: Reach;
  /** The model this provider runs: the one that answers if this provider is
   * the default, else the first loaded. */
  model: string;
  /** The full id of that model, which is what the default and the routes
   * actually name. */
  id: string;
}

/**
 * The loaded ids, folded into one block per provider.
 *
 * A vendor CAN hold more than one loaded model — the built-in Claude plus a
 * Claude row you saved. The block shows the one in play: whichever is the
 * default, else the first. The others stay loaded and stay nameable by a
 * task route; they are just not a second row to read past.
 */
export function groupProviders(providers: ProviderInfo[], defaultId: string): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const p of providers) {
    const prefix = prefixOf(p.id);
    const { vendor, model } = nameOf(p.id);
    const isDefault = p.id === defaultId.trim();
    const existing = groups.get(prefix);
    // First wins, unless a later one is the model that actually answers.
    if (existing !== undefined && !isDefault) continue;
    groups.set(prefix, { prefix, name: vendor, reach: reachOf(p), model, id: p.id });
  }
  return [...groups.values()];
}

export function YourModels({ providers, defaultId, builtinDefault, busy, baseURLOf, onMakeDefault, onPickModel }: YourModelsProps): JSX.Element {
  if (providers.length === 0) {
    return <p className="muted">No provider is set up. Add one below.</p>;
  }
  return (
    <ul className="v2-yours" aria-label="Providers you can use">
      {groupProviders(providers, defaultId).map(group => (
        <ProviderBlock
          key={group.prefix}
          group={group}
          isDefault={group.id === defaultId.trim()}
          builtinDefault={builtinDefault}
          busy={busy}
          baseURL={baseURLOf(group.prefix)}
          onMakeDefault={onMakeDefault}
          onPickModel={onPickModel}
        />
      ))}
    </ul>
  );
}

interface ProviderBlockProps {
  group: ProviderGroup;
  isDefault: boolean;
  builtinDefault: boolean;
  busy: boolean;
  baseURL: string | undefined;
  onMakeDefault(id: string): void;
  onPickModel(prefix: string, model: string): void;
}

function ProviderBlock({ group, isDefault, builtinDefault, busy, baseURL, onMakeDefault, onPickModel }: ProviderBlockProps): JSX.Element {
  // A prefix the catalog does not know (`serve --fake`, a hand-edited id)
  // has nowhere to ask, so do not ask.
  const known = vendorFor(group.prefix) !== undefined;
  const { result, loading, refresh } = useModels(known ? group.prefix : null, baseURL);
  const models = result?.models ?? [];
  // The combo reports every KEYSTROKE (`onInputChange`), and a save per
  // keystroke would be a save per letter. So the text is held here and
  // committed twice over: the moment it is one of the listed models — which
  // is what choosing from the list does, and it has to apply at once — and
  // otherwise when the field is left, for a model the list does not carry.
  const [text, setText] = useState(group.model);
  useEffect(() => setText(group.model), [group.model]);
  const commit = (value: string): void => {
    const next = value.trim();
    if (next === '' || next === group.model) return;
    onPickModel(group.prefix, next);
  };
  return (
    <li className={isDefault ? 'v2-yours-row v2-yours-on' : 'v2-yours-row'}>
      <p className="v2-yours-head">
        <strong>{group.name}</strong>
        <span className="v2-yours-how">{group.reach.how}</span>
        <span className="v2-yours-act">
          {isDefault ? (
            <span className="v2-yours-default">
              answers by default
              {builtinDefault ? <span className="v2-yours-note"> · built in, not yet saved</span> : null}
            </span>
          ) : group.reach.usable ? (
            // Named per row: a reader pulling up the button list hears "use
            // this one" once per provider otherwise, with nothing to tell
            // them apart.
            <button type="button" className="v2-link" disabled={busy} aria-label={`Use ${group.name}`} onClick={() => onMakeDefault(group.id)}>
              use this one
            </button>
          ) : (
            <span className="v2-yours-note">{group.reach.blocked}</span>
          )}
        </span>
      </p>
      <div
        className="v2-yours-model"
        // Leaving the field commits a model the list does not carry. Focus
        // moving to this block's own toggle button is not leaving it.
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit(text);
        }}
      >
        <ModelCombo
          id={`v2-model-${group.prefix}`}
          label={`${group.name} model`}
          value={text}
          models={models}
          placeholder={loading ? 'listing…' : 'pick or type a model'}
          onChange={value => {
            setText(value);
            if (models.some(m => m.id === value.trim())) commit(value);
          }}
        />
        <p className="v2-yours-count" role="note">
          {result === null
            ? loading
              ? 'asking…'
              : ''
            : result.error !== undefined
              ? result.error
              : `${models.length} model${models.length === 1 ? '' : 's'} ${result.source === 'curated' ? 'known' : 'listed'}`}
          <button type="button" className="v2-link" onClick={refresh}>
            refresh
          </button>
        </p>
      </div>
    </li>
  );
}
