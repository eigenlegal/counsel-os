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
import { useEffect, useRef, useState } from 'react';
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
  /** An enterprise row's non-secret fields (a Bedrock region, an Azure
   * resource). They name WHERE to ask, so without them that vendor's
   * listing can only answer with an error. */
  extraOf?(prefix: string): Record<string, string> | undefined;
  /** The ids this practice's own file names, so a saved row is shown over a
   * built-in of the same vendor. */
  fileIds: ReadonlySet<string>;
  /** Rows added but not saved yet. A provider you just picked gets its
   * block AT ONCE — its key and its model are chosen on the block, and
   * before this it had neither: the row could not be saved without a model,
   * and the vendor would not list models without a key. */
  pendingIds: readonly string[];
  /** The key control for a provider, supplied by the page (this component
   * knows nothing about the settings view). */
  renderKey?(group: ProviderGroup): JSX.Element | null;
  /** This provider's own settings — its id, address, and what it can do —
   * rendered inside its block rather than as a second list of every
   * provider further down the page. */
  renderDetails?(group: ProviderGroup): JSX.Element | null;
  /** A provider whose key just changed, and a counter so the same provider
   * twice still counts. Its model list is re-asked: the key is usually the
   * whole reason the vendor would not answer. */
  relist?: { prefix: string; n: number } | null;
  onMakeDefault(id: string): void;
  /**
   * Run a provider on a different model. `id` is the block's OWN current id,
   * never re-derived from the prefix: with two models of one vendor loaded,
   * the block shows one and "the vendor's first" is a different one.
   *
   * Answers whether the save went — a refused one has to put the field back.
   */
  onPickModel(id: string, model: string): Promise<boolean>;
}

/** `claude-sub/claude-opus-5` → `Claude` + `claude-opus-5`. The vendor's own
 * name, then the model, because the prefix is a routing detail. */
export function nameOf(id: string): { vendor: string; model: string } {
  const cut = id.indexOf('/');
  const prefix = cut === -1 ? id : id.slice(0, cut);
  const model = cut === -1 ? '' : id.slice(cut + 1);
  // `label` before `name`, because two vendors answer to "Claude" — the
  // subscription and the API row. Two blocks called Claude, with two buttons
  // called "Use Claude", is the very ambiguity these labels exist to remove;
  // `label` is the catalog's own longer spelling ("Claude (API key)").
  const vendor = vendorFor(prefix);
  return { vendor: vendor?.label ?? vendor?.name ?? prefix, model };
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
  /** Added, not saved. It cannot answer or be the default yet. */
  pending?: boolean;
}

/**
 * The loaded ids, folded into one block per provider.
 *
 * A vendor can hold more than one loaded model — the built-in Ollama plus
 * the Ollama row you saved. The block shows the one in play, in this order:
 *
 *   1. the model that answers, if it is this vendor's;
 *   2. the model YOUR FILE names, over a built-in;
 *   3. whatever loaded first.
 *
 * Rule 2 is not a nicety. `loadRegistry` puts the built-ins ahead of the
 * file, so without it, picking `qwen3:32b` on the Ollama block saved
 * correctly and then re-rendered as `gemma4:e4b` — the built-in, still
 * first, still not the default. The pick looked like it had been refused.
 * The others stay loaded and stay nameable by a task route; they are just
 * not a second block to read past.
 */
export function groupProviders(
  providers: ProviderInfo[],
  defaultId: string,
  fileIds: ReadonlySet<string> = new Set(),
  pendingIds: readonly string[] = [],
): ProviderGroup[] {
  const groups = new Map<string, { group: ProviderGroup; rank: number }>();
  for (const p of providers) {
    const prefix = prefixOf(p.id);
    const { vendor, model } = nameOf(p.id);
    const rank = p.id === defaultId.trim() ? 0 : fileIds.has(p.id) ? 1 : 2;
    const existing = groups.get(prefix);
    if (existing !== undefined && existing.rank <= rank) continue;
    groups.set(prefix, { rank, group: { prefix, name: vendor, reach: reachOf(p), model, id: p.id } });
  }
  // A provider added but not saved has no loaded model to speak for it. It
  // still gets a block: the block is where its key and its model are set,
  // and both have to happen before there is anything to save.
  for (const id of pendingIds) {
    const prefix = prefixOf(id);
    if (groups.has(prefix)) continue;
    const { vendor, model } = nameOf(id);
    // A row with no id at all still needs a block: it is where its own Id
    // field lives, and without one the row was added and then invisible.
    const name = prefix === '' ? 'A model' : vendor;
    groups.set(prefix, { rank: 3, group: { prefix, name, reach: pendingReach(prefix), model, id, pending: true } });
  }
  return [...groups.values()].map(entry => entry.group);
}

/** What an unsaved provider still needs, from the catalog alone. */
function pendingReach(prefix: string): Reach {
  if (prefix === '') return { how: 'not set up yet', usable: false, blocked: 'give it an id below' };
  const connection = vendorFor(prefix)?.connection;
  const how = connection === 'local' ? 'on this machine' : connection === 'subscription' ? 'your subscription' : 'not set up yet';
  return { how, usable: false, blocked: 'pick a model to finish' };
}

export function YourModels({ providers, defaultId, builtinDefault, busy, baseURLOf, extraOf, fileIds, pendingIds, renderKey, renderDetails, relist, onMakeDefault, onPickModel }: YourModelsProps): JSX.Element {
  const groups = groupProviders(providers, defaultId, fileIds, pendingIds);
  if (groups.length === 0) {
    return <p className="muted">No provider is set up. Add one below.</p>;
  }
  return (
    <ul className="v2-yours" aria-label="Providers you can use">
      {groups.map(group => (
        <ProviderBlock
          key={group.prefix}
          group={group}
          isDefault={group.id === defaultId.trim()}
          builtinDefault={builtinDefault}
          busy={busy}
          baseURL={baseURLOf(group.prefix)}
          extra={extraOf?.(group.prefix)}
          {...(renderKey === undefined ? {} : { renderKey })}
          {...(renderDetails === undefined ? {} : { renderDetails })}
          relistN={relist != null && relist.prefix === group.prefix ? relist.n : 0}
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
  extra: Record<string, string> | undefined;
  renderKey?(group: ProviderGroup): JSX.Element | null;
  renderDetails?(group: ProviderGroup): JSX.Element | null;
  relistN: number;
  onMakeDefault(id: string): void;
  onPickModel(id: string, model: string): Promise<boolean>;
}

function ProviderBlock({ group, isDefault, builtinDefault, busy, baseURL, extra, renderKey, renderDetails, relistN, onMakeDefault, onPickModel }: ProviderBlockProps): JSX.Element {
  // A prefix the catalog does not know (`serve --fake`, a hand-edited id)
  // has nowhere to ask, so do not ask.
  const known = vendorFor(group.prefix) !== undefined;
  const { result, loading, refresh } = useModels(known ? group.prefix : null, baseURL, extra ?? {});
  const models = result?.models ?? [];
  // Ask again when this provider's key changes: "No key for OpenAI yet" is
  // the commonest reason the list is empty, and having pasted one, nobody
  // should have to find a `refresh` link to see the models it just bought.
  // Seeded with what it is mounted at, so a block re-mounted after a key
  // change does not fire an extra listing on top of `useModels`' own first
  // load — the counter lives on the page and outlives any one block.
  const seenRelist = useRef(relistN);
  useEffect(() => {
    if (relistN === seenRelist.current) return;
    seenRelist.current = relistN;
    refresh();
    // `refresh` is EXCLUDED deliberately: `useModels` returns a new closure
    // on every render, so listing it here is an endless fetch loop. This
    // effect is driven by the counter alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relistN]);
  // The combo reports every KEYSTROKE, so the text is held here and saved
  // only when it is really chosen: `onSelect` (picked from the list) or the
  // field being left (a model the list does not carry).
  //
  // NEVER on a keystroke that happens to spell a listed model. `grok-4-fast`
  // passes through `grok-4` and `gpt-5.6-mini` passes through `gpt-5.6`;
  // both are real models, so that rule saved the wrong one halfway through
  // the word and then reset the field to it under the typing hand.
  const [text, setText] = useState(group.model);
  useEffect(() => setText(group.model), [group.model]);
  // What has already been sent. `group.model` only catches up when the save
  // comes back, so without this, selecting and then clicking away sends the
  // same change twice.
  const sent = useRef(group.model);
  useEffect(() => {
    sent.current = group.model;
  }, [group.model]);
  const commit = (value: string): void => {
    const next = value.trim();
    if (next === '' || next === group.model || next === sent.current) return;
    sent.current = next;
    void onPickModel(group.id, next).then(saved => {
      // A save the page refused (some other row is incomplete) leaves the
      // file unchanged, so the field must not go on showing the new model
      // as though it had taken.
      if (!saved) {
        sent.current = group.model;
        setText(group.model);
      }
    });
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
          onChange={setText}
          onSelect={commit}
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
      {/* The key belongs to the PROVIDER, so it belongs on the provider's
          block — and it has to come before the model, because most vendors
          will not list their models without it. */}
      {renderKey?.(group) ?? null}
      {renderDetails?.(group) ?? null}
    </li>
  );
}
