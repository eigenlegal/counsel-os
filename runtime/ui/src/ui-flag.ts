/**
 * The design-pass rollout flag (spec §2, "Rollout"). Default off.
 *
 * Two sources, in order: the in-memory copy set this session, then
 * `localStorage['counsel-os.ui']`. The memory copy is what makes the switch
 * work in a tab whose storage is blocked — it holds for the session and the
 * toggle says so.
 *
 * `?ui=v2` in the fragment is a THIRD source, but it is consumed once by
 * `bootstrapUiFlag` before React renders — beside `bootstrapToken()` and for
 * the same reason. A fragment that has to be read and then rewritten is not
 * something a component may do from its render phase, and `readUiFlag` is a
 * pure read so that a `useState` initializer can call it.
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

/** The `ui` param of the fragment's query half (`#/?ui=v2`), or `null`. */
function fragmentFlag(hash: string): UiFlag | null {
  const cut = hash.indexOf('?');
  if (cut === -1) return null;
  return new URLSearchParams(hash.slice(cut + 1)).get('ui') === 'v2' ? 'v2' : null;
}

/** The fragment (without its `#`) with the `ui` param removed. Pure. */
export function stripUiParam(hash: string): string {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  if (cut === -1) return raw;
  const params = new URLSearchParams(raw.slice(cut + 1));
  params.delete('ui');
  const rest = params.toString();
  return rest === '' ? raw.slice(0, cut) : `${raw.slice(0, cut)}?${rest}`;
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
 */
export function setUiFlag(flag: UiFlag): { persisted: boolean } {
  memory = flag;
  let persisted = false;
  try {
    const store = storage();
    if (store !== null) {
      if (flag === 'v2') store.setItem(UI_FLAG_KEY, 'v2');
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
  if (!/[?&]ui=/.test(hash)) return;
  const { pathname, search } = globalThis.location;
  globalThis.history?.replaceState(null, '', `${pathname}${search}#${stripUiParam(hash)}`);
}

/**
 * Consumes `?ui=v2` from the fragment, once, before React renders. Returns
 * the flag now in force. The strip runs either way, so a `ui` value that is
 * not `v2` does not sit in the URL forever waiting to be misread.
 */
export function bootstrapUiFlag(): UiFlag {
  const fromFragment = fragmentFlag(globalThis.location?.hash ?? '');
  if (fromFragment !== null) setUiFlag(fromFragment);
  stripFromLocation();
  return readUiFlag();
}

/** The flag in force. Pure — the fragment is `bootstrapUiFlag`'s job. */
export function readUiFlag(): UiFlag {
  if (memory !== null) return memory;
  try {
    return storage()?.getItem(UI_FLAG_KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}
