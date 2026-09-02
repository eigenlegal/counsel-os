import { useEffect, useRef } from 'react';
import { useButton, useMenu, useMenuItem, useMenuTrigger, type AriaMenuProps } from 'react-aria';
import { Item, useMenuTriggerState, useTreeState, type TreeState } from 'react-stately';
import type { Node } from '@react-types/shared';
import type { Health } from '../api/types';
import { plateFor, footerLabel, swapNote } from './plate';
import { defaultProviderId } from './threads';

/** The final row's key. `/` never appears in it, so no provider id collides. */
const SETTINGS_KEY = 'open-settings';

export interface ModelSwitcherProps {
  health: Health | null;
  /** True in the 56px icon rail (vault route). The icon rail centers its
   * children, so the footer wrapper shrinks to the dot and a rail-anchored
   * popover would inherit a ~2px box — there the plate stays a plain button
   * and keeps the icon rail's escape hatch: navigate to Settings. */
  collapsed: boolean;
  /** Make this loaded provider the saved default (the settings round-trip
   * lives in the Shell — the rail stays presentational). */
  onSetDefault(id: string): void;
  /** The open thread's matter stays on this machine (providers spec §7):
   * cloud rows are shown but cannot be picked, with the reason on hover. */
  localOnly?: boolean;
}

export const STAYS_LOCAL_NOTE = 'This matter stays on this machine';

interface Row {
  id: string;
}

/**
 * The rail footer as a provider plate + model switcher (cou-90): the button
 * is the two-line lockup for the provider a send will actually use, and
 * clicking it opens a popover of the LOADED providers — pick one and it
 * becomes the saved default in place, no Settings trip. `Open Settings`
 * stays, as the popover's last row.
 *
 * Headless react-aria menu hooks under our own markup (the ProviderCombo
 * pattern): no portal — the popover is an absolutely positioned sibling of
 * the button, above it, inside the rail's DOM.
 *
 * The dot is green for "this is the saved default, loaded and answering";
 * AMBER when the saved default did not load and the runtime fell back —
 * the title carries the explanation, the plate itself stays calm.
 */
export function ModelSwitcher({ health, collapsed, onSetDefault, localOnly = false }: ModelSwitcherProps): JSX.Element {
  const state = useMenuTriggerState({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { menuTriggerProps, menuProps } = useMenuTrigger<Row>({}, state, triggerRef);
  const { buttonProps } = useButton(menuTriggerProps, triggerRef);

  // Outside click closes. No portal and no overlay layer, so the listener is
  // the whole dismiss story; scoped to the open state so it costs nothing
  // while the menu is shut.
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

  // A menu left open when the route collapses the rail would reappear the
  // moment the rail expands again.
  useEffect(() => {
    if (collapsed) closeRef.current();
  }, [collapsed]);

  const effective = health === null ? '' : defaultProviderId(health);
  const swap = swapNote(health);
  const plate =
    health === null ? null : plateFor(effective, health.providers.find(p => p.id === effective)?.auth);

  const rows: Row[] = [...(health?.providers ?? []).map(p => ({ id: p.id })), { id: SETTINGS_KEY }];
  const disabledKeys = new Set(localOnly ? (health?.providers ?? []).filter(p => p.auth !== 'local').map(p => p.id) : []);
  const children = (row: Row): JSX.Element => {
    if (row.id === SETTINGS_KEY) {
      return (
        <Item textValue="Open Settings">
          <span className="v2-switch-settings">Open Settings</span>
        </Item>
      );
    }
    const rowPlate = plateFor(row.id, health?.providers.find(p => p.id === row.id)?.auth);
    return (
      <Item textValue={`${rowPlate.vendor} ${rowPlate.detail}`}>
        {/* The same lockup as the footer. The dot slot is always there so the
            vendor column lines up; only the provider in use gets the ink. */}
        <span className="v2-plate">
          <span className="v2-plate-vendor">
            <span className={row.id === effective ? 'v2-dot' : 'v2-dot v2-dot-off'} aria-hidden="true" />
            {rowPlate.vendor}
          </span>
          <span className="v2-plate-detail">{rowPlate.detail}</span>
        </span>
      </Item>
    );
  };

  const openSettings = (): void => {
    globalThis.location.hash = '#/settings';
  };

  const act = (key: React.Key): void => {
    state.close();
    if (key === SETTINGS_KEY) {
      openSettings();
      return;
    }
    // Re-picking the provider already in use is a no-op, not a save.
    if (String(key) !== effective) onSetDefault(String(key));
  };

  return (
    <div className="v2-switch" ref={wrapRef}>
      {!collapsed && state.isOpen ? (
        <div
          className="v2-switch-pop"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              state.close();
              triggerRef.current?.focus();
            }
          }}
        >
          <SwitchMenu {...menuProps} items={rows} disabledKeys={disabledKeys} autoFocus={state.focusStrategy || true} onAction={act} onClose={state.close}>
            {children}
          </SwitchMenu>
        </div>
      ) : null}
      <button
        // Collapsed = plain navigation, so none of the trigger's menu
        // props (aria-haspopup/expanded would promise a popup that never
        // comes).
        {...(collapsed ? { onClick: openSettings } : buttonProps)}
        ref={triggerRef}
        type="button"
        className="v2-foot"
        title={
          health === null
            ? undefined
            : `${footerLabel(health)}${swap === null ? '' : ` — ${swap}`} — ${collapsed ? 'open Settings' : 'switch model'}`
        }
      >
        <span className={swap === null ? 'v2-dot' : 'v2-dot v2-dot-amber'} aria-hidden="true" />
        <span className="v2-lbl v2-plate">
          {plate === null ? (
            <span className="v2-plate-vendor">…</span>
          ) : (
            <>
              <span className="v2-plate-vendor">{plate.vendor}</span>
              <span className="v2-plate-detail">{plate.detail}</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}

function SwitchMenu(props: AriaMenuProps<Row> & { onClose(): void }): JSX.Element {
  const state = useTreeState(props);
  const ref = useRef<HTMLUListElement | null>(null);
  // Its own name, not the trigger's: `aria-labelledby` (from the trigger's
  // menu props) outranks `aria-label`, and would name the menu after the
  // plate's whole text. `onAction`/`onClose` register HERE and reach every
  // item through the menu's own plumbing — passing them to `useMenuItem`
  // again would fire each pick twice.
  const { menuProps } = useMenu({ ...props, 'aria-label': 'Switch model', 'aria-labelledby': undefined }, state, ref);
  return (
    <ul {...menuProps} ref={ref} className="v2-switch-list">
      {[...state.collection].map(item => (
        <SwitchRow key={item.key} item={item} state={state} />
      ))}
    </ul>
  );
}

function SwitchRow({ item, state }: { item: Node<Row>; state: TreeState<Row> }): JSX.Element {
  const ref = useRef<HTMLLIElement | null>(null);
  const { menuItemProps, isFocused, isDisabled } = useMenuItem({ key: item.key }, state, ref);
  return (
    <li
      {...menuItemProps}
      ref={ref}
      className={isDisabled ? 'v2-switch-item v2-switch-off' : 'v2-switch-item'}
      data-focused={isFocused ? true : undefined}
      title={isDisabled ? STAYS_LOCAL_NOTE : undefined}
    >
      {item.rendered}
    </li>
  );
}
