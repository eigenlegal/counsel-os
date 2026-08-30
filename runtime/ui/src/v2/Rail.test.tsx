import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ThreadHeader } from '../api/types';
import { Rail, railLabel } from './Rail';

const at = '2026-08-29T10:00:00.000Z';
const titled: ThreadHeader = { id: 't-1', title: 'Acme NDA term', createdAt: at, updatedAt: at, sessions: {} };
const untitled: ThreadHeader = { id: 't-2', createdAt: at, updatedAt: at, sessions: {} };

function noop(): void {}

afterEach(cleanup);

describe('railLabel', () => {
  test('is the title, or Untitled', () => {
    expect(railLabel(titled)).toBe('Acme NDA term');
    // Not a date: the row's second line is already the date, and a title
    // that repeats it names nothing.
    expect(railLabel(untitled)).toBe('Untitled');
    expect(railLabel({ ...titled, title: '   ' })).toBe('Untitled');
  });
});

describe('Rail', () => {
  test('lists titles, marks the selected thread, and New starts a draft', async () => {
    let created = 0;
    const picked: string[] = [];
    render(
      <Rail
        threads={[titled, untitled]}
        selected="t-1"
        draft={false}
        onSelect={id => picked.push(id)}
        onNew={() => {
          created += 1;
        }}
        onDelete={noop}
      />,
    );
    expect(screen.getByText('Acme NDA term')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Acme NDA term');

    // The untitled row reads `Untitled`, and its date line still says when.
    await userEvent.click(screen.getByText('Untitled', { selector: '.v2-thread-title' }));
    expect(picked).toEqual(['t-2']);
    expect(document.querySelectorAll('.v2-thread-date')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(created).toBe(1);
  });

  test('a draft shows as the current row without a request', () => {
    render(<Rail threads={[titled]} selected={null} draft onSelect={noop} onNew={noop} onDelete={noop} />);
    expect(document.querySelector('li.v2-draft[aria-current="true"]')?.textContent).toContain('New conversation');
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
  });

  test('empty says so', () => {
    render(<Rail threads={[]} selected={null} draft={false} onSelect={noop} onNew={noop} onDelete={noop} />);
    expect(screen.getByText('No threads yet.')).toBeTruthy();
  });
});
