import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { WorkLine } from './WorkLine';

function tool(name: string, input: unknown): ToolCallView {
  return { id: `${name}-${JSON.stringify(input)}`, name, input, hasResult: true, output: { ok: 1 } };
}

afterEach(cleanup);

describe('WorkLine', () => {
  test('one quiet line with filename chips; the chevron unfolds the full steps', async () => {
    const tools = [tool('vault_search', { query: 'residuals' }), tool('vault_read', { path: 'practice/standards/nda.md' })];
    render(<WorkLine tools={tools} ms={{}} />);
    const line = screen.getByRole('button', { name: /Searched the vault/ });
    expect(line.textContent).toContain('read');
    expect(document.querySelector('.v2-file-chip')?.textContent).toBe('nda.md');
    expect(document.querySelector('.v2-steps')).toBeNull();

    await userEvent.click(line);
    expect(document.querySelector('.v2-steps')).toBeTruthy();
    expect(screen.getByText('Searched')).toBeTruthy();
  });

  test('no tools, no line', () => {
    render(<WorkLine tools={[]} ms={{}} />);
    expect(document.querySelector('.v2-work-line')).toBeNull();
  });
});
