import { useEffect, useRef } from 'react';
import { useButton, useMenuTrigger } from 'react-aria';
import { Item, useMenuTriggerState } from 'react-stately';
import { TASK_IDS } from '../../tasks';
import { HeadlessMenu } from '../menu';

export interface TaskPickerProps {
  /** The step's task as recorded. */
  current: string;
  /** A pick of a DIFFERENT task from the closed set. */
  onPick(task: string): void;
}

interface Row {
  id: string;
}

/**
 * The record's task picker (routing-and-evals spec §3): a set-text `change`
 * that opens the closed taxonomy. The same headless menu as the matter
 * picker — no portal, no pill; the popover sits inside the record.
 */
export function TaskPicker({ current, onPick }: TaskPickerProps): JSX.Element {
  const state = useMenuTriggerState({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const { menuTriggerProps, menuProps } = useMenuTrigger<Row>({}, state, triggerRef);
  const { buttonProps } = useButton(menuTriggerProps, triggerRef);

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

  const rows: Row[] = TASK_IDS.map(id => ({ id }));
  const act = (key: React.Key): void => {
    state.close();
    const id = String(key);
    if (id !== current) onPick(id);
  };

  return (
    <span className="v2-matter-pick v2-task-pick" ref={wrapRef}>
      <button {...buttonProps} ref={triggerRef} type="button" className="v2-thread-link">
        change
      </button>
      {state.isOpen ? (
        <div
          className="v2-matter-pop v2-task-pop"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              state.close();
              triggerRef.current?.focus();
            }
          }}
        >
          <HeadlessMenu {...menuProps} label="Correct the task" items={rows} autoFocus={state.focusStrategy || true} onAction={act} onClose={state.close}>
            {(row: Row) => (
              <Item textValue={row.id}>
                <span className="v2-plate-vendor">
                  <span className={row.id === current ? 'v2-dot' : 'v2-dot v2-dot-off'} aria-hidden="true" />
                  {row.id}
                </span>
              </Item>
            )}
          </HeadlessMenu>
        </div>
      ) : null}
    </span>
  );
}
