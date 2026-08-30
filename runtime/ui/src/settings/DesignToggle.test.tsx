import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { readUiFlag, setUiFlag, UI_FLAG_KEY } from '../ui-flag';
import { DesignToggle } from './DesignToggle';

/**
 * A tab whose storage refuses writes. See `ui-flag.test.ts` for why this is
 * `defineProperty` and not `spyOn`: happy-dom's `localStorage` is a Proxy
 * with an own, pre-bound `setItem`, which a spy cannot reach.
 */
function blockWrites(): () => void {
  const original = localStorage.setItem;
  const swap = (value: unknown): void => {
    Object.defineProperty(localStorage, 'setItem', { configurable: true, writable: true, value });
  };
  swap(() => {
    throw new Error('blocked');
  });
  return () => swap(original);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  setUiFlag('v1');
});

describe('DesignToggle', () => {
  test('is off by default and turns v2 on', async () => {
    render(<DesignToggle />);
    const toggle = screen.getByRole('switch', { name: 'Try the new design' }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    await userEvent.click(toggle);

    expect(toggle.checked).toBe(true);
    expect(readUiFlag()).toBe('v2');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v2');
    expect(screen.queryByText(/this tab only/)).toBeNull();
  });

  test('says so when the choice could not be saved', async () => {
    const unblock = blockWrites();
    try {
      render(<DesignToggle />);
      await userEvent.click(screen.getByRole('switch', { name: 'Try the new design' }));
      expect(screen.getByText(/this tab only/)).toBeTruthy();
      expect(readUiFlag()).toBe('v2');
    } finally {
      unblock();
    }
  });
});
