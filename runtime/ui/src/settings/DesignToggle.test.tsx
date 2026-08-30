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
  // `setUiFlag('v2')` FIRST, then clear: v2 is the default, so setting it
  // removes the key and drops `ui-flag`'s session copy. The other order
  // would leave `'v1'` stored for the next test.
  setUiFlag('v2');
  localStorage.clear();
});

describe('DesignToggle', () => {
  test('is on by default and turning it off goes back to v1', async () => {
    render(<DesignToggle />);
    const toggle = screen.getByRole('switch', { name: 'New design' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    // On is the default, so there is nothing stored to say so.
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();

    await userEvent.click(toggle);

    expect(toggle.checked).toBe(false);
    expect(readUiFlag()).toBe('v1');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBe('v1');
    expect(screen.queryByText(/this tab only/)).toBeNull();
  });

  test('and turning it back on clears the opt-out', async () => {
    setUiFlag('v1');
    render(<DesignToggle />);
    const toggle = screen.getByRole('switch', { name: 'New design' }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    await userEvent.click(toggle);

    expect(toggle.checked).toBe(true);
    expect(readUiFlag()).toBe('v2');
    expect(localStorage.getItem(UI_FLAG_KEY)).toBeNull();
  });

  test('says so when the choice could not be saved', async () => {
    const unblock = blockWrites();
    try {
      render(<DesignToggle />);
      // Turning it OFF is the write now — the opt-out is the stored value.
      await userEvent.click(screen.getByRole('switch', { name: 'New design' }));
      expect(screen.getByText(/this tab only/)).toBeTruthy();
      expect(readUiFlag()).toBe('v1');
    } finally {
      unblock();
    }
  });

  test('and still says so after the flip remounts it', async () => {
    // The product path: setting the flag swaps the shell in the same React
    // batch, so the toggle that called `setUiFlag` unmounts before it can
    // paint. A FRESH toggle has to know — the fact lives in `ui-flag`, not
    // in this component's state.
    const unblock = blockWrites();
    try {
      const first = render(<DesignToggle />);
      await userEvent.click(screen.getByRole('switch', { name: 'New design' }));
      first.unmount();

      render(<DesignToggle />);
      expect((screen.getByRole('switch', { name: 'New design' }) as HTMLInputElement).checked).toBe(false);
      expect(screen.getByText(/this tab only/)).toBeTruthy();
    } finally {
      unblock();
    }
  });
});
