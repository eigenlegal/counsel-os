import { useRef } from 'react';
import { useButton, useComboBox, useFilter, useListBox, useOption, type AriaListBoxOptions } from 'react-aria';
import { Item, useComboBoxState, type ComboBoxState } from 'react-stately';
import type { Node } from '@react-types/shared';
import { Chevron } from '../v2/icons';

export interface ProviderComboProps {
  id: string;
  label: string;
  value: string;
  /** The loaded provider ids — suggestions, never a constraint: the default
   * may legitimately name a provider that is not loaded right now, the one
   * you are about to add. */
  options: string[];
  /** Shown when the field is empty — the value the runtime falls back to. */
  placeholder?: string;
  /** The toggle's own accessible name. Default `Show providers`; a field
   * that lists something else (the task taxonomy) names it itself. */
  toggleLabel?: string;
  /**
   * Whether an option survives what has been typed. The default matches the
   * option's own text, which is right when the options ARE the answers —
   * but a caller whose options are already the result of a search (the
   * model picker, where "llama" finds Together AI) has to be able to say
   * that everything it handed over is a match.
   */
  filter?(option: string, input: string): boolean;
  onChange(value: string): void;
}

/**
 * A provider picker (the default-provider field and each task route's
 * Provider field): a combobox over the loaded provider ids that
 * still takes any typed value (cou-82 — the native `datalist` it replaces
 * could not be styled at all, and its dropdown drew in the platform's own
 * chrome). Headless react-aria hooks under our own markup and tokens — no
 * styled component library, and no portal: the list is an absolutely
 * positioned sibling of the input, which keeps it inside the form's DOM for
 * tests and screen readers alike.
 */
export function ProviderCombo({ id, label, value, options, placeholder, onChange, toggleLabel, filter }: ProviderComboProps): JSX.Element {
  const { contains } = useFilter({ sensitivity: 'base' });
  const items = options.map(option => ({ id: option }));
  const children = (item: { id: string }): JSX.Element => <Item textValue={item.id}>{item.id}</Item>;
  const props = {
    id,
    label,
    inputValue: value,
    onInputChange: onChange,
    // The typed text IS the value; picking from the list is a shortcut.
    allowsCustomValue: true,
    menuTrigger: 'focus' as const,
    items,
    children,
  };
  const state = useComboBoxState({ ...props, defaultFilter: filter ?? contains });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listBoxRef = useRef<HTMLUListElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { inputProps, listBoxProps, labelProps, buttonProps } = useComboBox(
    { ...props, inputRef, listBoxRef, popoverRef, buttonRef },
    state,
  );
  const { buttonProps: toggleProps } = useButton(buttonProps, buttonRef);

  return (
    <>
      <label {...labelProps}>{label}</label>
      <div className="v2-combo">
        <input {...inputProps} ref={inputRef} placeholder={placeholder} />
        {/* Its own name only: react-aria labels the toggle by the field
            label too, which would make it a second `Default provider` for
            anything (or anyone) looking the field up by its label. */}
        <button
          {...toggleProps}
          ref={buttonRef}
          type="button"
          className="v2-combo-toggle"
          aria-label={toggleLabel ?? 'Show providers'}
          aria-labelledby={undefined}
        >
          {/* Always down: a dropdown trigger points down open or closed —
              the open/closed rotation is tree-fold semantics, not this. */}
          <Chevron />
        </button>
        {state.isOpen ? (
          <div className="v2-combo-pop" ref={popoverRef}>
            <ProviderList listBoxProps={listBoxProps} listBoxRef={listBoxRef} state={state} />
          </div>
        ) : null}
      </div>
    </>
  );
}

interface ProviderListProps {
  listBoxProps: AriaListBoxOptions<{ id: string }>;
  listBoxRef: React.RefObject<HTMLUListElement>;
  state: ComboBoxState<{ id: string }>;
}

function ProviderList({ listBoxProps, listBoxRef, state }: ProviderListProps): JSX.Element {
  const { listBoxProps: props } = useListBox(listBoxProps, state, listBoxRef);
  return (
    <ul {...props} ref={listBoxRef} className="v2-combo-list">
      {[...state.collection].map(item => (
        <ProviderOption key={item.key} item={item} state={state} />
      ))}
    </ul>
  );
}

function ProviderOption({ item, state }: { item: Node<{ id: string }>; state: ComboBoxState<{ id: string }> }): JSX.Element {
  const ref = useRef<HTMLLIElement | null>(null);
  const { optionProps, isFocused } = useOption({ key: item.key }, state, ref);
  return (
    <li {...optionProps} ref={ref} className="v2-combo-item" data-focused={isFocused ? true : undefined}>
      {item.rendered}
    </li>
  );
}
