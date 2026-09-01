import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { Steps } from './Steps';

const running: ToolCallView = { id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' }, hasResult: false };
const done: ToolCallView = { ...running, output: { content: '# Acme', version: 'v1' }, isError: false, hasResult: true };

afterEach(cleanup);

describe('Steps', () => {
  test('a running step is a verb line with no time; the time appears with its result', () => {
    const { rerender } = render(<Steps tools={[running]} ms={{}} />);
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('matters/acme.md')).toBeTruthy();
    expect(screen.queryByText(/ms/)).toBeNull();
    expect(document.querySelector('.v2-step-running')).toBeTruthy();

    rerender(<Steps tools={[done]} ms={{ 'c-1': 18 }} />);
    expect(screen.getByText(/18 ms/)).toBeTruthy();
    expect(document.querySelector('.v2-step-ok')).toBeTruthy();
  });

  test('show reveals input and result; hide puts them away', async () => {
    render(<Steps tools={[done]} ms={{}} />);
    expect(screen.queryByText('Input')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByText('Input')).toBeTruthy();
    expect(screen.getByText('Result')).toBeTruthy();
    expect(screen.getByText(/"path": "matters\/acme.md"/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'hide' }));
    expect(screen.queryByText('Input')).toBeNull();
  });

  test('a file step opens its path when a drawer is offered', async () => {
    const opened: string[] = [];
    render(<Steps tools={[done]} ms={{}} onOpenFile={path => opened.push(path)} />);
    await userEvent.click(screen.getByRole('button', { name: 'matters/acme.md' }));
    expect(opened).toEqual(['matters/acme.md']);
  });

  test('a step that came back with nothing says so on the line', () => {
    render(<Steps tools={[{ ...done, output: [] }]} ms={{ 'c-1': 15 }} />);
    expect(screen.getByText('no results')).toBeTruthy();
    // Not an error, and not the same ink as a hit either.
    expect(document.querySelector('.v2-step-empty')).toBeTruthy();
    expect(document.querySelector('.v2-step-error')).toBeNull();
    expect(screen.getByText(/15 ms/)).toBeTruthy();
  });

  test('an errored step says so', () => {
    render(<Steps tools={[{ ...done, isError: true, output: 'boom' }]} ms={{}} />);
    expect(screen.getByText('error')).toBeTruthy();
  });
});

describe('Steps spacing', () => {
  test('a verb with no object is followed by the time with one separator, no stray space', () => {
    const tool: ToolCallView = { id: 'c-9', name: 'docket_sweep', input: {}, hasResult: true, output: { deadlines: [] }, isError: false };
    render(<Steps tools={[tool]} ms={{ 'c-9': 12 }} />);
    const line = document.querySelector('[data-testid="step-c-9"]')!;
    expect(line.textContent).toMatch(/^Ran docket_sweep · 12 ms/);
    expect(line.textContent).not.toContain('  ');
  });
});