import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { useState } from 'react';
import { ProviderCombo } from './ProviderCombo';

function Harness({ options }: { options: string[] }): JSX.Element {
  const [value, setValue] = useState('fake/fake');
  return <ProviderCombo id="combo" label="Default provider" value={value} options={options} onChange={setValue} />;
}

afterEach(() => {
  cleanup();
});

describe('ProviderCombo', () => {
  test('the toggle opens a listbox of the loaded ids; a click fills the field', async () => {
    render(<Harness options={['fake/fake', 'ollama/gemma4:e4b']} />);
    expect(document.querySelector('.v2-combo-pop')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Show providers' }));
    const listed = Array.from(document.querySelectorAll('.v2-combo-item'), el => el.textContent);
    expect(listed).toEqual(['fake/fake', 'ollama/gemma4:e4b']);

    await userEvent.click(screen.getByText('ollama/gemma4:e4b'));
    expect((screen.getByLabelText('Default provider') as HTMLInputElement).value).toBe('ollama/gemma4:e4b');
    expect(document.querySelector('.v2-combo-pop')).toBeNull();
  });

  test('typing keeps a value no loaded provider matches — the datalist contract', async () => {
    render(<Harness options={['fake/fake']} />);
    const user = userEvent.setup({ document });
    const input = screen.getByLabelText('Default provider') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'openai/gpt-5.6');
    expect(input.value).toBe('openai/gpt-5.6');
  });
});
