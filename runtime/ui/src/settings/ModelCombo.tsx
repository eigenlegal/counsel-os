import { useRef } from 'react';
import { useButton, useComboBox, useFilter, useListBox, useOption, type AriaListBoxOptions } from 'react-aria';
import { Item, useComboBoxState, type ComboBoxState } from 'react-stately';
import type { Node } from '@react-types/shared';
import type { DiscoveredModel } from '../api/types';
import { Chevron } from '../v2/icons';

export interface ModelComboProps {
  id: string;
  label: string;
  /** The model part of the id — `gpt-5.6`, `gemma4:e4b`. */
  value: string;
  /** What the vendor lists (providers spec §4) — suggestions, never a
   * constraint: a model the list does not carry yet is still typeable. */
  models: DiscoveredModel[];
  placeholder?: string;
  onChange(value: string): void;
  /**
   * A model was CHOSEN from the list, as opposed to typed.
   *
   * `onChange` fires per keystroke, so it cannot tell the two apart — and
   * acting on a keystroke that happens to spell a listed model commits the
   * wrong one: typing `grok-4-fast` passes through `grok-4`, and typing
   * `gpt-5.6-mini` passes through `gpt-5.6`. Both are real models.
   */
  onSelect?(id: string): void;
}

/** `1,048,576` → `1M`; `131072` → `131k`: the context size as set text. */
export function contextLabel(tokens: number | undefined): string | null {
  if (tokens === undefined) return null;
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return String(tokens);
}

/**
 * The model picker (providers spec §4): the same headless combobox as the
 * provider picker, over the vendor's own list, each row with its context
 * size in set text. The typed text is the value; the list is a shortcut.
 */
export function ModelCombo({ id, label, value, models, placeholder, onChange, onSelect }: ModelComboProps): JSX.Element {
  const { contains } = useFilter({ sensitivity: 'base' });
  const items = models.map(m => ({ id: m.id, context: contextLabel(m.contextTokens) }));
  const children = (item: { id: string; context: string | null }): JSX.Element => (
    <Item textValue={item.id}>
      <span className="v2-combo-model">{item.id}</span>
      {item.context === null ? null : <span className="v2-combo-ctx">{item.context}</span>}
    </Item>
  );
  const props = { id, label, inputValue: value, onInputChange: onChange, allowsCustomValue: true, menuTrigger: 'focus' as const, items, children };
  const state = useComboBoxState({
    ...props,
    defaultFilter: contains,
    // Null on clear, and the typed text itself when a custom value is
    // committed; only a real key from the collection is a choice.
    onSelectionChange: key => {
      if (key !== null && key !== undefined && models.some(m => m.id === String(key))) onSelect?.(String(key));
    },
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listBoxRef = useRef<HTMLUListElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { inputProps, listBoxProps, labelProps, buttonProps } = useComboBox({ ...props, inputRef, listBoxRef, popoverRef, buttonRef }, state);
  const { buttonProps: toggleProps } = useButton(buttonProps, buttonRef);

  return (
    <>
      <label {...labelProps}>{label}</label>
      <div className="v2-combo">
        <input {...inputProps} ref={inputRef} placeholder={placeholder} />
        <button {...toggleProps} ref={buttonRef} type="button" className="v2-combo-toggle" aria-label="Show models" aria-labelledby={undefined}>
          <Chevron />
        </button>
        {state.isOpen && items.length > 0 ? (
          <div className="v2-combo-pop" ref={popoverRef}>
            <ModelList listBoxProps={listBoxProps} listBoxRef={listBoxRef} state={state} />
          </div>
        ) : null}
      </div>
    </>
  );
}

type Row = { id: string; context: string | null };

function ModelList({ listBoxProps, listBoxRef, state }: { listBoxProps: AriaListBoxOptions<Row>; listBoxRef: React.RefObject<HTMLUListElement>; state: ComboBoxState<Row> }): JSX.Element {
  const { listBoxProps: props } = useListBox(listBoxProps, state, listBoxRef);
  return (
    <ul {...props} ref={listBoxRef} className="v2-combo-list">
      {[...state.collection].map(item => (
        <ModelOption key={item.key} item={item} state={state} />
      ))}
    </ul>
  );
}

function ModelOption({ item, state }: { item: Node<Row>; state: ComboBoxState<Row> }): JSX.Element {
  const ref = useRef<HTMLLIElement | null>(null);
  const { optionProps, isFocused } = useOption({ key: item.key }, state, ref);
  return (
    <li {...optionProps} ref={ref} className="v2-combo-item v2-combo-item-model" data-focused={isFocused ? true : undefined}>
      {item.rendered}
    </li>
  );
}
