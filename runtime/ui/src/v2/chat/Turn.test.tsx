import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { emptyAssistantTurn, type AssistantTurn } from '../../chat/turns';
import { TurnView } from './Turn';

afterEach(cleanup);

/** The finished answer, with whatever text the model wrote. */
function answer(text: string): JSX.Element {
  return <TurnView turn={emptyAssistantTurn({ status: 'done', text })} threadId="t-1" onReload={() => {}} />;
}

describe('TurnView prose', () => {
  test('the answer is markdown, not the characters the model typed', () => {
    render(answer('**Action:** proposed `practice/standards/nda.md`.'));

    const prose = document.querySelector('.v2-prose');
    expect(prose).not.toBeNull();
    expect(prose!.querySelector('strong')?.textContent).toBe('Action:');
    expect(prose!.querySelector('code')?.textContent).toBe('practice/standards/nda.md');
    // And nothing of the markup is left on screen as literal text.
    expect(prose!.textContent).not.toContain('**');
  });

  test('an answer that tries to script the page is inert', () => {
    render(answer('# Notes\n\n<script>globalThis.__pwned = true;</script>\n\n<img src=x onerror="globalThis.__pwned = true">'));

    const prose = document.querySelector('.v2-prose');
    expect(prose).not.toBeNull();
    expect(prose!.querySelector('script')).toBeNull();
    expect(prose!.querySelector('img')).toBeNull();
    expect(prose!.innerHTML).not.toContain('onerror');
    expect((globalThis as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  test('the streaming turn renders the partial text the same way', () => {
    render(
      <TurnView
        turn={emptyAssistantTurn({ status: 'streaming', text: '**Acti' })}
        threadId="t-1"
        live
        onReload={() => {}}
      />,
    );
    // Half a bold marker is not emphasis yet — `marked` says so without
    // throwing, and the column stays prose rather than flipping typeface
    // when the stream ends.
    const prose = document.querySelector('.v2-prose');
    expect(prose).not.toBeNull();
    expect(prose!.querySelector('strong')).toBeNull();
    expect(prose!.textContent).toContain('Acti');
  });

  test('the error turn keeps its raw text in a pre', () => {
    render(
      <TurnView
        turn={emptyAssistantTurn({ status: 'error', text: '', error: { message: 'the model returned no answer', text: '**not markdown**' } })}
        threadId="t-1"
        onReload={() => {}}
      />,
    );
    expect(screen.getByText('the model returned no answer')).toBeTruthy();
    expect(document.querySelector('.v2-notice-error pre')?.textContent).toBe('**not markdown**');
  });
});

describe('TurnView source chips', () => {
  function readNda(): AssistantTurn['tools'] {
    return [{ id: 'r1', name: 'vault_read', input: { path: 'practice/standards/nda.md' }, hasResult: true, output: { content: 'x' } }];
  }

  test('a backticked mention of a read file renders as a chip that opens the drawer', async () => {
    const opened: string[] = [];
    const turn: AssistantTurn = emptyAssistantTurn({
      status: 'done',
      text: 'Your standard still says so `nda.md`.',
      tools: readNda(),
    });
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    const chip = document.querySelector('.v2-prose code.v2-cite')!;
    expect(chip.textContent).toBe('nda.md');
    await userEvent.click(chip);
    expect(opened).toEqual(['practice/standards/nda.md']);
  });

  test('a file the step never read is left as plain code, and nothing opens', async () => {
    const opened: string[] = [];
    const turn: AssistantTurn = emptyAssistantTurn({ status: 'done', text: 'See `other.md`.' });
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    expect(document.querySelector('.v2-prose code.v2-cite')).toBeNull();
    expect(document.querySelector('.v2-prose code')?.textContent).toBe('other.md');
    await userEvent.click(document.querySelector('.v2-prose code')!);
    expect(opened).toEqual([]);
  });

  test('a model-authored #/vault link cannot forge a chip or open the drawer', async () => {
    const opened: string[] = [];
    // The answer writes the link itself — the shape a prompt-injected vault
    // document would produce — naming a file this step never read.
    const turn: AssistantTurn = emptyAssistantTurn({
      status: 'done',
      text: 'See [`secret.md`](#/vault?path=practice%2Fsecret.md) and `practice/standards/nda.md`.',
      tools: readNda(),
    });
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} onOpenFile={path => opened.push(path)} />);

    const anchor = document.querySelector('.v2-prose a')!;
    // Inert: the sanitizer dropped the href, and it wears no chip styling.
    expect(anchor.hasAttribute('href')).toBe(false);
    expect(anchor.querySelector('code.v2-cite')).toBeNull();
    await userEvent.click(anchor);
    expect(opened).toEqual([]);

    // The derived citation beside it still works, so the test is not passing
    // because chips are broken.
    await userEvent.click(document.querySelector('.v2-prose code.v2-cite')!);
    expect(opened).toEqual(['practice/standards/nda.md']);
  });

  test('a basename two read files share is not a chip; the full paths are', async () => {
    const opened: string[] = [];
    const turn: AssistantTurn = emptyAssistantTurn({
      status: 'done',
      text: 'Both `nda.md` files agree; see `matters/acme/nda.md`.',
      tools: [
        { id: 'r1', name: 'vault_read', input: { path: 'practice/standards/nda.md' }, hasResult: true, output: 'x' },
        { id: 'r2', name: 'vault_read', input: { path: 'matters/acme/nda.md' }, hasResult: true, output: 'x' },
      ],
    });
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} onOpenFile={path => opened.push(path)} />);
    const chips = Array.from(document.querySelectorAll('.v2-prose code.v2-cite'), el => el.textContent);
    expect(chips).toEqual(['matters/acme/nda.md']);
    await userEvent.click(document.querySelector('.v2-prose code.v2-cite')!);
    expect(opened).toEqual(['matters/acme/nda.md']);
  });
});

describe('TurnView work line', () => {
  test('the streaming turn folds its work into one line, unfoldable to the steps', async () => {
    const turn: AssistantTurn = emptyAssistantTurn({
      status: 'streaming',
      text: 'Working on it.',
      tools: [{ id: 'r1', name: 'vault_read', input: { path: 'matters/acme.md' }, hasResult: true, output: 'x' }],
    });
    render(<TurnView turn={turn} threadId="t-1" live onReload={() => {}} />);
    const line = document.querySelector('.v2-work-line') as HTMLElement;
    expect(line).toBeTruthy();
    expect(document.querySelector('.v2-file-chip')?.textContent).toBe('acme.md');
    expect(document.querySelector('.v2-steps')).toBeNull();

    await userEvent.click(line);
    expect(document.querySelectorAll('.v2-step')).toHaveLength(1);
  });

  test('a finished turn keeps the work line above the prose', () => {
    const turn: AssistantTurn = emptyAssistantTurn({
      status: 'done',
      text: 'Done.',
      tools: [{ id: 'r1', name: 'vault_search', input: { query: 'cap' }, hasResult: true, output: [{ path: 'a.md' }] }],
    });
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} />);
    const line = document.querySelector('.v2-work-line');
    expect(line?.textContent).toContain('Searched the vault');
    // Above, not below: the reader sees what was consulted, then the answer.
    expect(line!.compareDocumentPosition(document.querySelector('.v2-prose')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('a turn that ran no tools shows no work line at all', () => {
    render(<TurnView turn={emptyAssistantTurn({ status: 'done', text: 'No lookup needed.' })} threadId="t-1" onReload={() => {}} />);
    expect(document.querySelector('.v2-work-line')).toBeNull();
  });
});
