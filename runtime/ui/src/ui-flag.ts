/**
 * The design flag (spec §2, "Rollout"). **v2 is the default** — the founder
 * flipped it on 2026-08-30; v1 is still one switch away and never went away.
 *
 * Only the NON-default choice is stored, so the key is absent for everybody
 * who has not asked for the classic design: `localStorage['counsel-os.ui']`
 * is `'v1'` or missing. A stored `'v2'` is still read as v2 — tabs that
 * opted in while v2 was the option keep working — but nothing writes it any
 * more.
 *
 * Two sources, in order: the in-memory copy set this session, then storage.
 * The memory copy is what makes the switch work in a tab whose storage is
 * blocked — it holds for the session and the toggle says so.
 *
 * `ui=v1` / `ui=v2` in the fragment is a THIRD source, but it is consumed
 * once by `bootstrapUiFlag` before React renders — beside `bootstrapToken()`
 * and for the same reason. A fragment that has to be read and then rewritten
 * is not something a component may do from its render phase, and
 * `readUiFlag` is a pure read so that a `useState` initializer can call it.
 *
 * Both spellings work, and both leave the address bar afterwards:
 *
 *   http://127.0.0.1:7431/#/?ui=v1                 (a page already open)
 *   http://127.0.0.1:7431/#token=<token>&ui=v1     (the URL `serve` prints)
 *
 * Do NOT write `#token=<token>?ui=v1`: `token=` is split off at the `&`, so
 * a `?` there becomes part of the credential and the page answers 401.
 */

export const UI_FLAG_KEY = 'counsel-os.ui';

export type UiFlag = 'v1' | 'v2';

type Listener = (flag: UiFlag) => void;

const listeners = new Set<Listener>();
let memory: UiFlag | null = null;
let sessionOnly = false;

/**
 * True when the last choice could not be saved, so it holds for this tab
 * alone. It lives here rather than in `DesignToggle` because setting the flag
 * REMOUNTS the toggle — `Root` swaps the shell in the same React batch — and
 * a fact kept in the old component's state would go with it.
 */
export function isSessionOnly(): boolean {
  return sessionOnly;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** A fragment that is `&`-separated pairs rather than a route and a query —
 * which is what `#token=…&ui=v2` is, the form a person types onto the URL
 * `serve` prints. A bare route (`#/vault`) has no pair in it and is left
 * alone. */
const PAIRS = /(?:^|&)ui=/;

/**
 * The `ui` param of a fragment, in either form it arrives in:
 * `#/?ui=v1` (the route's query half) and `#token=…&ui=v1` (pairs, no `?`).
 *
 * The second is the one a reader produces by hand, and it used to be
 * ignored — which sent them to `#token=…?ui=v1` instead, where the token
 * splitter took `…?ui=v1` for the credential and the page answered 401.
 *
 * BOTH designs are nameable here. `ui=v2` was the only useful value while v2
 * was opt-in; now that v2 is the default, `ui=v1` is the one a reader needs
 * — and a link that names the design it wants should not depend on which one
 * happens to be the default.
 */
function fragmentFlag(hash: string): UiFlag | null {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  if (cut === -1 && !PAIRS.test(raw)) return null;
  const value = new URLSearchParams(cut === -1 ? raw : raw.slice(cut + 1)).get('ui');
  return value === 'v1' || value === 'v2' ? value : null;
}

/** The fragment (without its `#`) with the `ui` param removed. Pure.
 * Every other pair is kept exactly as it was written — this must not
 * re-encode a route or a path on its way through. */
export function stripUiParam(hash: string): string {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  if (cut === -1) {
    if (!PAIRS.test(raw)) return raw;
    return keepOthers(raw);
  }
  const rest = keepOthers(raw.slice(cut + 1));
  return rest === '' ? raw.slice(0, cut) : `${raw.slice(0, cut)}?${rest}`;
}

/** `&`-separated pairs, minus the `ui` one. */
function keepOthers(query: string): string {
  return query
    .split('&')
    .filter(part => part !== '' && !part.startsWith('ui='))
    .join('&');
}

/** Subscribes to flag changes; the returned function unsubscribes. */
export function onUiFlagChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Records the choice. `persisted` is false when storage refused it; the
 * memory copy still applies for this session. The `ui` fragment param, if
 * present, is removed so a later reload obeys the stored choice.
 *
 * Only `'v1'` is written. v2 is what an untouched browser gets, so choosing
 * it is choosing the default — and the honest way to record that is to leave
 * no key behind rather than to stamp the default into every profile.
 */
export function setUiFlag(flag: UiFlag): { persisted: boolean } {
  memory = flag;
  let persisted = false;
  try {
    const store = storage();
    if (store !== null) {
      if (flag === 'v1') store.setItem(UI_FLAG_KEY, 'v1');
      else store.removeItem(UI_FLAG_KEY);
      persisted = true;
    }
  } catch {
    persisted = false;
  }
  // Storage took the choice, so storage is the truth and the session copy
  // has nothing left to say. Keeping it would shadow a value written from
  // anywhere else — another tab, or a test that seeds the key directly.
  if (persisted) memory = null;
  sessionOnly = !persisted;
  stripFromLocation();
  for (const fn of [...listeners]) fn(flag);
  return { persisted };
}

/** Drops a consumed `ui` param from the address bar, keeping the route. */
function stripFromLocation(): void {
  const hash = globalThis.location?.hash ?? '';
  const stripped = stripUiParam(hash);
  // Compared rather than pattern-matched: the `ui` pair can be the whole
  // fragment (`#ui=v2`, what is left after the token is taken out of
  // `#token=…&ui=v2`), which no `[?&]ui=` test would ever see.
  if (stripped === hash.replace(/^#/, '')) return;
  const { pathname, search } = globalThis.location;
  globalThis.history?.replaceState(null, '', `${pathname}${search}#${stripped}`);
}

/**
 * Consumes `?ui=v1` / `?ui=v2` from the fragment, once, before React renders.
 * Returns the flag now in force. The strip runs either way, so a `ui` value
 * that names neither design does not sit in the URL forever waiting to be
 * misread.
 */
export function bootstrapUiFlag(): UiFlag {
  const fromFragment = fragmentFlag(globalThis.location?.hash ?? '');
  if (fromFragment !== null) setUiFlag(fromFragment);
  stripFromLocation();
  return readUiFlag();
}

/**
 * The flag in force. Pure — the fragment is `bootstrapUiFlag`'s job.
 *
 * v2 unless the classic design was asked for by name: a missing key, and a
 * value that is neither design's name, both mean the default.
 */
export function readUiFlag(): UiFlag {
  if (memory !== null) return memory;
  try {
    return storage()?.getItem(UI_FLAG_KEY) === 'v1' ? 'v1' : 'v2';
  } catch {
    return 'v2';
  }
}
