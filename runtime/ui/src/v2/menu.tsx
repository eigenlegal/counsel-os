import { useRef } from 'react';
import { useMenu, useMenuItem, type AriaMenuProps } from 'react-aria';
import { useTreeState, type TreeState } from 'react-stately';
import type { Node } from '@react-types/shared';

export interface HeadlessMenuProps<T extends object> extends AriaMenuProps<T> {
  /** The menu's own accessible name. It REPLACES the trigger's
   * `aria-labelledby` (which would otherwise name the menu after the whole
   * trigger text and outrank any `aria-label`). */
  label: string;
  className?: string;
  itemClassName?: string;
  onClose(): void;
}

/**
 * The headless react-aria menu under our own markup — the pattern
 * `ModelSwitcher` established (cou-90), lifted so the next popover (the
 * thread header's matter picker) does not copy it. No portal: the caller
 * positions the list inside its own DOM.
 *
 * `onAction`/`onClose` register HERE and reach every row through the menu's
 * own plumbing; passing them to `useMenuItem` again would fire each pick
 * twice.
 */
export function HeadlessMenu<T extends object>(props: HeadlessMenuProps<T>): JSX.Element {
  const state = useTreeState(props);
  const ref = useRef<HTMLUListElement | null>(null);
  const { menuProps } = useMenu({ ...props, 'aria-label': props.label, 'aria-labelledby': undefined }, state, ref);
  return (
    <ul {...menuProps} ref={ref} className={props.className ?? 'v2-switch-list'}>
      {[...state.collection].map(item => (
        <MenuRow key={item.key} item={item} state={state} className={props.itemClassName ?? 'v2-switch-item'} />
      ))}
    </ul>
  );
}

function MenuRow<T extends object>({ item, state, className }: { item: Node<T>; state: TreeState<T>; className: string }): JSX.Element {
  const ref = useRef<HTMLLIElement | null>(null);
  const { menuItemProps, isFocused } = useMenuItem({ key: item.key }, state, ref);
  return (
    <li {...menuItemProps} ref={ref} className={className} data-focused={isFocused ? true : undefined}>
      {item.rendered}
    </li>
  );
}
