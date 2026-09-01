import { cleanup, fireEvent, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { Health } from '../../api/types';
import { Composer } from './Composer';

const amber: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  default: 'claude-sub/claude-opus-5',
  stepTimeoutMs: 600_000,
  providers: [{ id: 'ollama/gemma4:e4b', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 32_000, auth: 'local' } }],
};
const fine: Health = { ...amber, default: 'ollama/gemma4:e4b' };

function noop(): void {}

afterEach(cleanup);

describe('v2 Composer', () => {
  test('Cmd+Enter sends and clears; Enter alone does not', async () => {
    const sent: string[] = [];
    render(<Composer streaming={false} onSend={m => sent.push(m)} onStop={noop} />);
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await userEvent.type(box, 'Check the cap.');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sent).toEqual([]);
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    expect(sent).toEqual(['Check the cap.']);
    expect(box.value).toBe('');
  });

  test('no model picker: the provider is the runtime default, chosen once in Settings', () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} />);
    expect(screen.queryByLabelText('Model')).toBeNull();
    // One box, and the box is what holds the actions.
    expect(document.querySelector('.v2-composer-box textarea')).toBeTruthy();
    expect(document.querySelector('.v2-composer-box .v2-composer-actions')).toBeTruthy();
  });

  test('a seed fills the box once per nonce, and typing after it survives re-renders', async () => {
    const seed = { text: 'Regarding `matters/acme.md`: ', nonce: 1 };
    const { rerender } = render(<Composer streaming={false} onSend={noop} onStop={noop} seed={seed} />);
    const box = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    expect(box.value).toBe('Regarding `matters/acme.md`: ');
    await userEvent.type(box, 'is the cap mutual?');
    rerender(<Composer streaming={false} onSend={noop} onStop={noop} seed={seed} />);
    expect(box.value).toBe('Regarding `matters/acme.md`: is the cap mutual?');
  });

  test('a seed never destroys typing: a non-empty box gets it on a new line', async () => {
    const { rerender } = render(<Composer streaming={false} onSend={noop} onStop={noop} />);
    const box = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    await userEvent.type(box, 'Half a thought');
    rerender(<Composer streaming={false} onSend={noop} onStop={noop} seed={{ text: 'Regarding `matters/acme.md`: ', nonce: 1 }} />);
    expect(box.value).toBe('Half a thought\nRegarding `matters/acme.md`: ');
  });

  test('applying a seed says so, once, so the surface that pushed it can drop it', async () => {
    let used = 0;
    const seed = { text: 'Regarding `matters/acme.md`: ', nonce: 1 };
    const { rerender } = render(
      <Composer streaming={false} onSend={noop} onStop={noop} seed={seed} onSeedUsed={() => { used += 1; }} />,
    );
    rerender(<Composer streaming={false} onSend={noop} onStop={noop} seed={seed} onSeedUsed={() => { used += 1; }} />);
    expect(used).toBe(1);
  });

  test('streaming disables the box and offers Stop', async () => {
    let stopped = 0;
    render(<Composer streaming onSend={noop} onStop={() => { stopped += 1; }} />);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(stopped).toBe(1);
  });
});

describe('v2 Composer swap notice (cou-95)', () => {
  test('says which model will answer when the saved default is not loaded, and links to Settings', () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={amber} />);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toBe('Claude is not available. Counsel will answer on Ollama (gemma4:e4b).change');
    expect(notice.querySelector('a')?.getAttribute('href')).toBe('#/settings');
    expect(notice.className).toContain('v2-swap-notice');
  });

  test('silent when the default is loaded, or health is not in yet', () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={fine} />);
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={null} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
