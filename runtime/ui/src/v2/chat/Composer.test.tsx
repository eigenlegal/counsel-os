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

  test('a seed fills the box once per nonce, and typing after it survives re-renders', async () => {
    const seed = { text: 'Regarding `matters/acme.md`: ', nonce: 1 };
    const { rerender } = render(
      <Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={noop} onStop={noop} seed={seed} />,
    );
    const box = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    expect(box.value).toBe('Regarding `matters/acme.md`: ');
    await userEvent.type(box, 'is the cap mutual?');
    rerender(
      <Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={noop} onStop={noop} seed={seed} />,
    );
    expect(box.value).toBe('Regarding `matters/acme.md`: is the cap mutual?');
  });

  test('a seed never destroys typing: a non-empty box gets it on a new line', async () => {
    const { rerender } = render(
      <Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={noop} onStop={noop} />,
    );
    const box = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    await userEvent.type(box, 'Half a thought');
    rerender(
      <Composer
        providers={PROVIDERS}
        defaultProvider="fake/fake"
        streaming={false}
        onSend={noop}
        onStop={noop}
        seed={{ text: 'Regarding `matters/acme.md`: ', nonce: 1 }}
      />,
    );
    expect(box.value).toBe('Half a thought\nRegarding `matters/acme.md`: ');
  });

  test('applying a seed says so, once, so the surface that pushed it can drop it', async () => {
    let used = 0;
    const seed = { text: 'Regarding `matters/acme.md`: ', nonce: 1 };
    const { rerender } = render(
      <Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={noop} onStop={noop} seed={seed} onSeedUsed={() => { used += 1; }} />,
    );
    rerender(
      <Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming={false} onSend={noop} onStop={noop} seed={seed} onSeedUsed={() => { used += 1; }} />,
    );
    expect(used).toBe(1);
  });

  test('streaming disables the box and offers Stop', async () => {
    let stopped = 0;
    render(<Composer providers={PROVIDERS} defaultProvider="fake/fake" streaming onSend={noop} onStop={() => { stopped += 1; }} />);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(stopped).toBe(1);
  });
});
