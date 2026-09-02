import { cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { FixtureDraft } from '../../api/types';
import { FixturePanel } from './FixturePanel';

const DRAFT: FixtureDraft = {
  id: 'services-2-findings',
  title: 'services — 2 findings',
  scorer: 'findings',
  task: 'review',
  text: 'Foxglove, Inc. and Silverline LLC agree. Liability shall not exceed $9,370.',
  original: 'Acme Holdings, Inc. and Bytecraft Labs LLC agree. Liability shall not exceed $50,000.',
  documentPath: 'matters/services.md',
  message: 'Review this.\n\n`matters/document.md`',
  knowledge: [{ path: 'knowledge/practice-seed/standards/liability.md', text: '# Liability' }],
  replacements: [
    { kind: 'org', from: 'Acme Holdings, Inc.', to: 'Foxglove, Inc.', count: 1 },
    { kind: 'money', from: '$50,000', to: '$9,370', count: 1 },
  ],
  catches: [
    { id: 'liability-cap', title: 'Liability cap (Section 5)', severity: 'red', clause: 'Liability shall not exceed $9,370', why: 'Too low.', match_any: ['liability', 'cap'] },
    { id: 'indemnity', title: 'Indemnity is one-way', severity: 'yellow', clause: '', why: 'One way.', match_any: ['indemnity'] },
  ],
  citations: [],
  from: { threadId: 't-1', runId: 'r-1', providerId: 'fake/fake', at: '2026-09-01T10:00:00.000Z' },
  notes: [],
};

const realFetch = globalThis.fetch;
let draft: FixtureDraft | { status: number; error: string } = DRAFT;
let saves: Array<Record<string, unknown>> = [];
let saveStatus = 200;

function json(bodyValue: unknown, status = 200): Response {
  return new Response(JSON.stringify(bodyValue), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 't');
  draft = DRAFT;
  saves = [];
  saveStatus = 200;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/fixtures/draft') {
      return 'status' in draft ? json({ error: draft.error }, draft.status) : json(draft);
    }
    if (url === '/fixtures/save') {
      saves.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (saveStatus === 409) return json({ error: 'a fixture named x is already here' }, 409);
      if (saveStatus !== 200) return json({ error: 'the vault is read-only' }, saveStatus);
      return json({ path: 'practice/evals/services.json', id: 'services', expected: 1, negative: 1, files: 3 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

const panel = (): HTMLElement => screen.getByRole('region', { name: 'Make this a fixture' });

describe('the review screen behind "make this a fixture"', () => {
  test('shows what was replaced, the text that will be saved, and every finding kept by default', async () => {
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(within(panel()).getByText(/matters\/services.md/)).toBeTruthy());

    // What was replaced, original beside replacement.
    expect(within(panel()).getByText(/1 practice file travels with it/)).toBeTruthy();
    expect(within(panel()).getByRole('rowheader', { name: 'Acme Holdings, Inc.' })).toBeTruthy();
    expect(within(panel()).getByText('Foxglove, Inc.')).toBeTruthy();

    // The saved text is the anonymized one, and it is editable.
    const box = within(panel()).getByRole('textbox', { name: 'The anonymized document' }) as HTMLTextAreaElement;
    expect(box.value).toBe(DRAFT.text);
    expect(box.value).not.toContain('Acme');

    // Counsel raised both findings and the lawyer has read them: kept.
    for (const c of DRAFT.catches) {
      const group = within(panel()).getByRole('group', { name: `Verdict on ${c.title}` });
      expect(within(group).getByRole('button', { name: 'right' }).getAttribute('aria-pressed')).toBe('true');
    }
  });

  test('saves the lawyer’s verdicts: right is expected, wrong is penalized, left out is neither', async () => {
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(within(panel()).getByRole('textbox', { name: 'The anonymized document' })).toBeTruthy());

    await userEvent.click(within(within(panel()).getByRole('group', { name: 'Verdict on Indemnity is one-way' })).getByRole('button', { name: 'wrong' }));
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0]).toMatchObject({ threadId: 't-1', runId: 'r-1', keep: ['liability-cap'], reject: ['indemnity'], id: 'services-2-findings', text: DRAFT.text, message: DRAFT.message });
    await waitFor(() => expect(within(panel()).getByText(/practice\/evals\/services.json/)).toBeTruthy());
  });

  test('an edit to the text is what gets saved', async () => {
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    const box = await waitFor(() => within(panel()).getByRole('textbox', { name: 'The anonymized document' }));
    await userEvent.type(box, ' Nothing else.');
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));
    await waitFor(() => expect(saves[0]?.text).toBe(`${DRAFT.text} Nothing else.`));
  });

  test('a name already taken offers to replace it, and only then does it overwrite', async () => {
    saveStatus = 409;
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(within(panel()).getByRole('button', { name: 'save the fixture' })).toBeTruthy());
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));

    const replace = await waitFor(() => within(panel()).getByRole('button', { name: 'replace it' }));
    expect(saves[0]?.overwrite).toBeUndefined();
    saveStatus = 200;
    await userEvent.click(replace);
    await waitFor(() => expect(saves[1]?.overwrite).toBe(true));
  });

  test('a conversation that cannot make a fixture says why and offers a way out', async () => {
    draft = { status: 422, error: 'This conversation does not name a document, so there is nothing to score against.' };
    let closed = 0;
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => (closed += 1)} />);
    await waitFor(() => expect(within(panel()).getByRole('alert').textContent).toContain('does not name a document'));
    await userEvent.click(within(panel()).getByRole('button', { name: 'close' }));
    expect(closed).toBe(1);
  });

  test('a failed save keeps the screen and its verdicts', async () => {
    saveStatus = 500;
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(within(panel()).getByRole('button', { name: 'save the fixture' })).toBeTruthy());
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));
    await waitFor(() => expect(within(panel()).getByRole('alert').textContent).toContain('not saved'));
    expect(within(panel()).getByRole('textbox', { name: 'The anonymized document' })).toBeTruthy();
  });
});

describe('what else travels with the fixture', () => {
  test('the prompt is shown and editable, because the mapping came from the document alone', async () => {
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    const box = await waitFor(() => within(panel()).getByRole('textbox', { name: 'The prompt the fixture runs' }) as HTMLTextAreaElement);
    expect(box.value).toBe(DRAFT.message);
    await userEvent.type(box, ' Please.');
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));
    await waitFor(() => expect(saves[0]?.message).toBe(`${DRAFT.message} Please.`));
  });

  test('a cited practice file can be left out', async () => {
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(document.querySelector('.v2-fixture-files')!.textContent).toContain('liability.md'));
    await userEvent.click(within(panel()).getByRole('button', { name: 'remove' }));
    expect(within(panel()).getByRole('button', { name: 'put it back' })).toBeTruthy();
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));
    await waitFor(() => expect(saves[0]?.dropKnowledge).toEqual(['knowledge/practice-seed/standards/liability.md']));
  });

  test('renaming after a clash drops the stale offer to replace', async () => {
    saveStatus = 409;
    render(<FixturePanel threadId="t-1" runId="r-1" onClose={() => {}} />);
    await waitFor(() => expect(within(panel()).getByRole('button', { name: 'save the fixture' })).toBeTruthy());
    await userEvent.click(within(panel()).getByRole('button', { name: 'save the fixture' }));
    await waitFor(() => expect(within(panel()).getByRole('button', { name: 'replace it' })).toBeTruthy());
    await userEvent.type(within(panel()).getByLabelText('name'), '-2');
    expect(within(panel()).queryByRole('button', { name: 'replace it' })).toBeNull();
  });
});
