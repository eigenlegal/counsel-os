/**
 * The design-pass rollout flag (spec §2, "Rollout"). Default off.
 *
 * Three sources, in order: `?ui=v2` in the fragment (one load, and it is
 * persisted), the in-memory copy set this session, then
 * `localStorage['counsel-os.ui']`. The memory copy is what makes the switch
 * work in a tab whose storage is blocked — it holds for the session and the
 * toggle says so.
 */

export const UI_FLAG_KEY = 'counsel-os.ui';

export type UiFlag = 'v1' | 'v2';

type Listener = (flag: UiFlag) => void;

const listeners = new Set<Listener>();
let memory: UiFlag | null = null;

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
  const hash = globalThis.location?.hash ?? '';
  if (/[?&]ui=/.test(hash)) {
    const { pathname, search } = globalThis.location;
    globalThis.history?.replaceState(null, '', `${pathname}${search}#${stripUiParam(hash)}`);
  }
  for (const fn of [...listeners]) fn(flag);
  return { persisted };
}

export function readUiFlag(): UiFlag {
  const fromFragment = fragmentFlag(globalThis.location?.hash ?? '');
  if (fromFragment !== null) {
    setUiFlag(fromFragment);
    return fromFragment;
  }
  if (memory !== null) return memory;
  try {
    return storage()?.getItem(UI_FLAG_KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}
