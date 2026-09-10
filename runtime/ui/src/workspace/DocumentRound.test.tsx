import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { DocumentRoundCard } from './DocumentRound';
import type { DocumentRoundReport } from '../../../src/workspace/document-rounds';
afterEach(cleanup);
const report = (): DocumentRoundReport => ({ documents: [{ role: 'sent', revisionId: 'exact-sent', title: 'Sent.docx', version: 2, contentHash: 'hash' }],
  summary: { findings: 1, accepted: 0, reverted: 0, modified: 1, new: 0, unmatched_change: 0, their_authors: [] },
  findings: [{ classification: 'MODIFIED', detail: 'Our wording changed.', section_context: 'Payment', ours_paragraph_index: 0, theirs_paragraph_index: 0,
    our_text: 'Payment net 30.', their_original: 'Payment net 30.', their_revised: '<script>unsafe()</script> Payment net 60.', base_text: null, authors: [], dates: [], comment_ids: [] }],
  comments: [], warnings: ['No pre-edit baseline supplied.'], limited: false });
test('comparison retains pinned document links, distinguishes text from approval and renders untrusted text literally', () => {
  const { container } = render(<DocumentRoundCard value={report()} />);
  expect(screen.getByRole('link', { name: 'Sent.docx' }).getAttribute('href')).toBe('#/references?revision=exact-sent');
  expect(screen.getByText('Exact saved versions. Originals and practice standards are unchanged.')).toBeTruthy();
  expect(screen.getByText('<script>unsafe()</script> Payment net 60.', { exact: false })).toBeTruthy();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('No pre-edit baseline supplied.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /approve|accept|save/i })).toBeNull();
});
test('large reports disclose truncation and progressively reveal retained findings', () => {
  const value = report(); value.limited = true; value.findings = Array(12).fill(value.findings[0]);
  render(<DocumentRoundCard value={value} />);
  expect(screen.getByText('Review the comparison (shortened report)')).toBeTruthy();
  expect(screen.getAllByRole('heading', { name: 'Our text modified · Payment' })).toHaveLength(8);
  fireEvent.click(screen.getByRole('button', { name: 'Show 4 more findings' }));
  expect(screen.getAllByRole('heading', { name: 'Our text modified · Payment' })).toHaveLength(12);
});
