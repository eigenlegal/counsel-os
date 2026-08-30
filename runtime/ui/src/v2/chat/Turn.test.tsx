import { cleanup, render, screen } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { emptyAssistantTurn } from '../../chat/turns';
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
