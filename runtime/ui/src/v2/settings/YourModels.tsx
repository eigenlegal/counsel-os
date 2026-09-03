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
  /** The practice's own rows, in file order. Each gets a block; a loaded
   * provider no row accounts for gets one too. */
  rows: readonly ProviderEntry[];
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

/** One provider entry: a row of the practice's file, or a loaded built-in. */
export interface ProviderGroup {
  /** Stable across every edit to the row — what React keys the block on,
   * and what the page looks the row up by. */
  key: string;
  /** The form row this block edits. Absent for a built-in, which the
   * practice's file does not name. */
  rowKey?: string;
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
 * One block per PROVIDER ENTRY: every row of the practice's own file, plus
 * every loaded provider no row accounts for (the built-ins).
 *
 * It used to fold by vendor prefix, and three things went wrong at once,
 * all of them the same mistake — addressing a row by something that is not
 * its identity:
 *
 * - Two rows of one vendor collapsed into one block. The second became
 *   invisible: no fields, no Remove, and its validation errors had nowhere
 *   to render, so Save refused with nothing marked.
 * - The block showed one row's model over another row's fields, because
 *   the block picked its identity by rank and its details by "first row
 *   with this prefix". Remove then deleted the provider you were not
 *   looking at.
 * - The block was KEYED on the prefix, which changes with every keystroke
 *   in an Id field — so typing remounted the block and dropped focus after
 *   each character.
 *
 * A row's `key` is stable for its lifetime. That is the identity.
 */
export interface ProviderEntry {
  /** Stable for the row's life, across every edit to its id. */
  key: string;
  id: string;
  baseURL?: string;
  extra?: Record<string, string>;
}

export function groupProviders(providers: ProviderInfo[], defaultId: string, rows: readonly ProviderEntry[] = []): ProviderGroup[] {
  const groups: ProviderGroup[] = [];
  const claimed = new Set<string>();
  for (const row of rows) {
    const id = row.id.trim();
    const live = providers.find(p => p.id === id);
    if (live !== undefined) claimed.add(live.id);
    const { vendor, model } = nameOf(id);
    groups.push({
      key: `row:${row.key}`,
      rowKey: row.key,
      prefix: prefixOf(id),
      // A row with no id yet is still a block: it is where its own Id field
      // lives, and without one the row was added and then invisible.
      name: id === '' ? 'A model' : vendor,
      reach: live === undefined ? pendingReach(prefixOf(id)) : reachOf(live),
      model,
      id,
      ...(live === undefined ? { pending: true } : {}),
    });
  }
  // The built-ins, and anything `serve --fake` added: loaded, real, and
  // not the practice's to edit.
  for (const p of providers) {
    if (claimed.has(p.id)) continue;
    const { vendor, model } = nameOf(p.id);
    groups.push({ key: `id:${p.id}`, prefix: prefixOf(p.id), name: vendor, reach: reachOf(p), model, id: p.id });
  }
  // The one that answers leads; a row you saved before a built-in.
  return groups.sort((a, b) => rank(a, defaultId) - rank(b, defaultId));
}

function rank(g: ProviderGroup, defaultId: string): number {
  if (g.id !== '' && g.id === defaultId.trim()) return 0;
  if (g.rowKey !== undefined) return 1;
  return 2;
}

/** What an unsaved provider still needs, from the catalog alone. */
function pendingReach(prefix: string): Reach {
  if (prefix === '') return { how: 'not set up yet', usable: false, blocked: 'give it an id below' };
  const connection = vendorFor(prefix)?.connection;
  const how = connection === 'local' ? 'on this machine' : connection === 'subscription' ? 'your subscription' : 'not set up yet';
  return { how, usable: false, blocked: 'pick a model to finish' };
}

export function YourModels({ providers, defaultId, builtinDefault, busy, rows, renderKey, renderDetails, relist, onMakeDefault, onPickModel }: YourModelsProps): JSX.Element {
  const groups = groupProviders(providers, defaultId, rows);
  const rowOf = (group: ProviderGroup): ProviderEntry | undefined => rows.find(r => r.key === group.rowKey);
  if (groups.length === 0) {
    return <p className="muted">No provider is set up. Add one below.</p>;
  }
  return (
    <ul className="v2-yours" aria-label="Providers you can use">
      {groups.map(group => (
        <ProviderBlock
          key={group.key}
          group={group}
          isDefault={group.id === defaultId.trim()}
          builtinDefault={builtinDefault}
          busy={busy}
          baseURL={rowOf(group)?.baseURL}
          extra={rowOf(group)?.extra}
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
          id={`v2-model-${group.key.replace(/[^A-Za-z0-9_-]/g, '-')}`}
          label={group.name === 'A model' ? 'Model' : `${group.name} model`}
          value={text}
          models={models}
          hideLabel
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
