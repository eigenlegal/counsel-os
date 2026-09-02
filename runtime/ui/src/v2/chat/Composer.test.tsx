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

describe('v2 Composer document intake (docx spec §6)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    sessionStorage.clear();
  });
  const dt = (files: File[]) => ({ files, types: ['Files'], items: [] });
  const NDA = () => new File([new Uint8Array([80, 75])], 'Lerner-draft.docx');

  test('the matter line shows for an explicit matter, and drops go to its folder', async () => {
    sessionStorage.setItem('counsel-os.token', 'tok');
    const uploads: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const form = init?.body as FormData;
      uploads.push(`${String(input)} ${(form.get('file') as File).name}→${form.get('dest') as string}`);
      return new Response(JSON.stringify({ path: 'matters/sinai-lerner/Lerner-draft.docx', size: 2048 }), { status: 201, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const sent: string[] = [];
    render(
      <Composer
        streaming={false}
        onSend={m => sent.push(m)}
        onStop={noop}
        matter={{ path: 'matters/sinai-lerner.md', title: 'Sinai × Lerner — K-12 AI Education Platform Partnership' }}
        dropDest="matters/sinai-lerner"
      />,
    );
    const line = document.querySelector('.v2-composer-matter')!;
    expect(line.textContent).toContain('Matter');
    expect(line.textContent).toContain('Sinai × Lerner — K-12 AI Education Platform Partnership');
    expect(line.textContent).toContain("dropped files go into this matter's folder");

    const box = document.querySelector('.v2-composer-box')!;
    fireEvent.dragEnter(box, { dataTransfer: dt([NDA()]) });
    expect(document.querySelector('.v2-drop em')?.textContent).toBe('Drop a Word document to add it to the matter');
    fireEvent.drop(box, { dataTransfer: dt([NDA()]) });
    await screen.findByRole('status');
    await new Promise(r => setTimeout(r, 0));
    expect(uploads).toEqual(['/vault/upload Lerner-draft.docx→matters/sinai-lerner']);
    expect(document.querySelector('.v2-drop')).toBeNull();
    expect(document.querySelector('.v2-ask-attached')?.textContent).toBe('matters/sinai-lerner/Lerner-draft.docx');
    expect(screen.getByRole('status').textContent).toBe('Added Lerner-draft.docx to matters/sinai-lerner · 2 KB');

    // The chip alone is a sendable message; it rides as a backticked path.
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    await userEvent.click(send);
    expect(sent).toEqual(['`matters/sinai-lerner/Lerner-draft.docx`']);
    expect(document.querySelector('.v2-ask-attached')).toBeNull();
  });

  test('no matter: no line, and a non-Word drop is refused in one line', async () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} />);
    expect(document.querySelector('.v2-composer-matter')).toBeNull();
    fireEvent.drop(document.querySelector('.v2-composer-box')!, { dataTransfer: dt([new File(['x'], 'scan.pdf')]) });
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('only Word documents (.docx) can be added for now');
  });
});

describe('v2 Composer, the matter privacy policy (providers spec §7)', () => {
  test('a stays-local matter names the local model that answers', () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={fine} policy={{ localOnly: true, source: 'matter' }} />);
    const notice = screen.getByRole('status');
    expect(notice.className).toContain('v2-policy-notice');
    expect(notice.textContent).toBe('This matter stays on this machine · answering on Ollama (gemma4:e4b)');
  });

  test('with no local model loaded it says so and points at Settings', () => {
    const cloudOnly: Health = { ...fine, default: 'claude-sub/claude-opus-5', providers: [{ id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription', capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' } }] };
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={cloudOnly} policy={{ localOnly: true, source: 'vault' }} />);
    expect(screen.getByRole('status').textContent).toBe('This matter stays on this machine, and no local model is loaded.add one');
  });

  test('no policy, no line', () => {
    render(<Composer streaming={false} onSend={noop} onStop={noop} health={fine} policy={{ localOnly: false, source: 'none' }} />);
    expect(document.querySelector('.v2-policy-notice')).toBeNull();
  });
});
