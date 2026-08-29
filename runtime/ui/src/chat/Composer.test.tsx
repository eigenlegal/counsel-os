import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ProviderInfo } from '../api/types';
import { Composer } from './Composer';

function provider(id: string): ProviderInfo {
  return {
    id,
    kind: 'direct',
    auth: 'local',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' },
  };
}

const PROVIDERS = [provider('fake/fake'), provider('ollama/qwen3')];

function noop(): void {}

afterEach(cleanup);

describe('Composer', () => {
  test('seeds the picker with the default when it is loaded', async () => {
    const sent: Array<[string, string]> = [];
    render(
      <Composer
        providers={PROVIDERS}
        defaultProvider="ollama/qwen3"
        streaming={false}
        onSend={(message, id) => sent.push([message, id])}
        onStop={noop}
      />,
    );

    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('ollama/qwen3');
    expect(screen.queryByText(/is not loaded/)).toBeNull();

    await userEvent.type(screen.getByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByText('Send'));
    expect(sent).toEqual([['Check the cap.', 'ollama/qwen3']]);
  });

  test('a default no loaded provider answers to falls back to the first, and says so', async () => {
    // The wedge this guards: the state used to hold `openai/nope` while the
    // `<select>` showed the first option, so every Send was a 422 the page
    // never explained.
    const sent: Array<[string, string]> = [];
    render(
      <Composer
        providers={PROVIDERS}
        defaultProvider="openai/nope"
        streaming={false}
        onSend={(message, id) => sent.push([message, id])}
        onStop={noop}
      />,
    );

    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('fake/fake');
    expect(screen.getByText(/is not loaded/).textContent).toContain('openai/nope');
    expect(screen.getByText(/is not loaded/).textContent).toContain('fake/fake');

    await userEvent.type(screen.getByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByText('Send'));
    expect(sent).toEqual([['Check the cap.', 'fake/fake']]);
  });

  test('a null default just uses the first loaded provider, with no note', () => {
    render(<Composer providers={PROVIDERS} defaultProvider={null} streaming={false} onSend={noop} onStop={noop} />);

    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('fake/fake');
    expect(screen.queryByText(/is not loaded/)).toBeNull();
  });
});
