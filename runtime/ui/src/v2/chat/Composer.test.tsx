import { cleanup, fireEvent, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ProviderInfo } from '../../api/types';
import { Composer } from './Composer';

function provider(id: string): ProviderInfo {
  return { id, kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } };
}

const PROVIDERS = [provider('fake/fake'), provider('ollama/qwen3')];

function noop(): void {}

afterEach(cleanup);

describe('v2 Composer', () => {
  test('Cmd+Enter sends and clears; Enter alone does not', async () => {
    const sent: Array<[string, string]> = [];
    render(<Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={(m, p) => sent.push([m, p])} onStop={noop} />);
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await userEvent.type(box, 'Check the cap.');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sent).toEqual([]);
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    expect(sent).toEqual([['Check the cap.', 'fake/fake']]);
    expect(box.value).toBe('');
  });

  test('a default no loaded provider answers to falls back to the first, and says so', () => {
    render(<Composer providers={PROVIDERS} defaultProvider="openai/nope" streaming={false} onSend={noop} onStop={noop} />);
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('fake/fake');
    expect(screen.getByText(/is not loaded/).textContent).toContain('openai/nope');
  });

  test('streaming disables the box and offers Stop', async () => {
    let stopped = 0;
    render(<Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming onSend={noop} onStop={() => { stopped += 1; }} />);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(stopped).toBe(1);
  });
});
