import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { PreferenceProposalCard } from './PreferenceProposal';
import type { Turn } from './api';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const turn = { id: 'turn', status: 'complete', state: { preferenceProposal: {
  id: 'proposal', basedOnRevisionId: null, before: { writingInstructions: '', signingInstructions: '', generalReview: '', ndaReview: 'Original instructions.' },
  changes: { ndaReview: 'Use short practical comments.' }, requestQuote: 'Please use short comments on future NDA edits.', reason: 'Use the requested approach.',
  review: 'pending', reviewedAt: null, appliedRevisionId: null, undoneAt: null, undoRevisionId: null,
} } } as unknown as Turn;

test('chat cannot save without opening the exact comparison and explicitly confirming', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const posts: unknown[] = []; let refreshed = false;
  globalThis.fetch = (async (_url: string, options: RequestInit) => {
    if (options.body) { posts.push(JSON.parse(String(options.body))); return Response.json({ ...turn, state: { ...turn.state, preferenceProposal: { ...turn.state.preferenceProposal, review: 'applied' } } }); }
    return Response.json(null);
  }) as typeof fetch;
  render(<PreferenceProposalCard turn={turn} onChanged={() => { refreshed = true; }} />);
  expect(screen.getByText('Not saved')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save for future work' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Review preference update' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save for future work' }) as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByText('Original instructions.')).toBeTruthy();
  expect(screen.getByText('Use short practical comments.')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Writing instructions' })).toBeNull();
  expect(posts).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Save for future work' }));
  await waitFor(() => expect(screen.getByText('Working preferences updated')).toBeTruthy());
  expect(posts).toEqual([{ proposalId: 'proposal', action: 'apply' }]);
  expect(refreshed).toBe(true);
});

test('newer preferences block save while allowing dismissal, and unfinished responses expose no actionable card', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  globalThis.fetch = (async () => Response.json({ revisionId: 'newer' })) as unknown as typeof fetch;
  const view = render(<PreferenceProposalCard turn={turn} onChanged={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review preference update' }));
  await waitFor(() => expect(screen.getByText(/cannot overwrite the newer version/)).toBeTruthy());
  expect((screen.getByRole('button', { name: 'Save for future work' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Keep current preferences' }) as HTMLButtonElement).disabled).toBe(false);
  view.unmount();
  render(<PreferenceProposalCard turn={{ ...turn, status: 'running' }} onChanged={() => {}} />);
  expect(screen.queryByRole('region')).toBeNull();
});
