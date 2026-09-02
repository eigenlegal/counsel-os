import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { useState } from 'react';
import type { DiscoveredModel } from '../api/types';
import { contextLabel, ModelCombo } from './ModelCombo';

function Harness({ models }: { models: DiscoveredModel[] }): JSX.Element {
  const [value, setValue] = useState('gpt-5.6');
  return <ModelCombo id="m" label="Model" value={value} models={models} onChange={setValue} />;
}

afterEach(cleanup);

describe('ModelCombo (providers spec §4)', () => {
  test('lists the vendor models with their context size as set text; a click fills the field', async () => {
    render(<Harness models={[{ id: 'gpt-5.6', contextTokens: 400_000 }, { id: 'gpt-5.6-mini', contextTokens: 128_000 }, { id: 'o-something' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show models' }));
    const rows = Array.from(document.querySelectorAll('.v2-combo-item-model'), el => el.textContent);
    expect(rows).toEqual(['gpt-5.6400k', 'gpt-5.6-mini128k', 'o-something']);
    await userEvent.click(screen.getByText('gpt-5.6-mini'));
    expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe('gpt-5.6-mini');
  });

  test('a model the list does not carry is still typeable', async () => {
    render(<Harness models={[{ id: 'gpt-5.6' }]} />);
    const user = userEvent.setup({ document });
    const input = screen.getByLabelText('Model') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'gpt-7-preview');
    expect(input.value).toBe('gpt-7-preview');
  });

  test('with nothing listed the toggle opens no empty box', async () => {
    render(<Harness models={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show models' }));
    expect(document.querySelector('.v2-combo-pop')).toBeNull();
  });

  test('contextLabel', () => {
    expect(contextLabel(1_048_576)).toBe('1M');
    expect(contextLabel(2_000_000)).toBe('2M');
    expect(contextLabel(131_072)).toBe('131k');
    expect(contextLabel(512)).toBe('512');
    expect(contextLabel(undefined)).toBeNull();
  });
});
