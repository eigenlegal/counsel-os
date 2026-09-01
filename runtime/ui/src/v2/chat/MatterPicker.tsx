import { useEffect, useRef, useState } from 'react';
import { useButton, useMenuTrigger } from 'react-aria';
import { Item, useMenuTriggerState } from 'react-stately';
import { ApiError, fetchJson } from '../../api/client';
import type { MatterOverview, VaultOverview } from '../../api/types';
import { HeadlessMenu } from '../menu';

/** The unlink row's key. A vault path always has a `/` or a `.`; this has neither. */
const NONE_KEY = 'none';

export interface MatterPickerProps {
  /** The thread's EXPLICIT matter, or `null` (inferred does not count). */
  current: string | null;
  /** The trigger's text — "link a matter" when nothing is linked, "change" otherwise. */
  label: string;
  /** A pick: a matter path, or `null` to unlink. */
  onPick(path: string | null): void;
}

interface Row {
  id: string;
}

/**
 * The thread header's matter picker: a small set-text affordance that opens a
 * popover of the vault's matters (`GET /vault/overview`, read the first time
 * it opens). Picking one makes the link EXPLICIT on the thread header, which
 * inference never overwrites. Headless react-aria menu, no portal, no pill.
 */
export function MatterPicker({ current, label, onPick }: MatterPickerProps): JSX.Element {
  const state = useMenuTriggerState({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const { menuTriggerProps, menuProps } = useMenuTrigger<Row>({}, state, triggerRef);
  const { buttonProps } = useButton(menuTriggerProps, triggerRef);
  const [matters, setMatters] = useState<MatterOverview[] | null>(null);
  const [failed, setFailed] = useState(false);

  // The overview is read once, on first open — the header does not need it
  // until the reader reaches for the picker.
  useEffect(() => {
    if (!state.isOpen || matters !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const overview = await fetchJson<VaultOverview>('/vault/overview');
        if (!cancelled) setMatters(overview.matters);
      } catch (err) {
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.isOpen, matters]);

  // Outside click closes (no overlay layer, so this is the dismiss story).
  const closeRef = useRef(state.close);
  closeRef.current = state.close;
  useEffect(() => {
    if (!state.isOpen) return;
    const onDown = (event: Event): void => {
      const target = event.target;
      if (wrapRef.current !== null && target instanceof globalThis.Node && !wrapRef.current.contains(target)) {
        closeRef.current();
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [state.isOpen]);

  const rows: Row[] = [...(current === null ? [] : [{ id: NONE_KEY }]), ...(matters ?? []).map(m => ({ id: m.path }))];
  const children = (row: Row): JSX.Element => {
    if (row.id === NONE_KEY) {
      return (
        <Item textValue="No matter">
          <span className="v2-switch-settings">No matter</span>
        </Item>
      );
    }
    const matter = matters?.find(m => m.path === row.id);
    return (
      <Item textValue={matter?.title ?? row.id}>
        <span className="v2-plate">
          <span className="v2-plate-vendor">
            <span className={row.id === current ? 'v2-dot' : 'v2-dot v2-dot-off'} aria-hidden="true" />
            {matter?.title ?? row.id}
          </span>
          <span className="v2-plate-detail">{row.id}</span>
        </span>
      </Item>
    );
  };

  const act = (key: React.Key): void => {
    state.close();
    const id = String(key);
    if (id === NONE_KEY) {
      if (current !== null) onPick(null);
      return;
    }
    if (id !== current) onPick(id);
  };

  return (
    <span className="v2-matter-pick" ref={wrapRef}>
      <button {...buttonProps} ref={triggerRef} type="button" className="v2-thread-link">
        {label}
      </button>
      {state.isOpen ? (
        <div
          className="v2-matter-pop"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              state.close();
              triggerRef.current?.focus();
            }
          }}
        >
          {failed ? (
            <p className="muted v2-matter-note" role="alert">
              Could not read the vault&rsquo;s matters.
            </p>
          ) : matters === null ? (
            <p className="muted v2-matter-note">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted v2-matter-note">No matters in the vault yet.</p>
          ) : (
            <HeadlessMenu {...menuProps} label="Link a matter" items={rows} autoFocus={state.focusStrategy || true} onAction={act} onClose={state.close}>
              {children}
            </HeadlessMenu>
          )}
        </div>
      ) : null}
    </span>
  );
}
