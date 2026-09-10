import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '../test/dom';
import type { Activity, ChatCitation } from '../../../src/workspace/conversations';
import { activityRows, ChatActivity } from './ChatActivity';
afterEach(cleanup);
const citation: ChatCitation = { key: 'S1', title: 'Source', category: 'Reference', version: 1,
  target: { kind: 'source', revisionId: 'source-v1' }, quote: 'Exact quote.', start: 40 };
const attempt = (id: string, status: Activity['status'], input = { kind: 'source', id: 'source-v1', quote: 'Exact quote.', start: 0 }): Activity => ({
  id, name: 'counsel_cite_passage', label: 'Checking an exact citation', status, input,
  output: status === 'complete' ? { marker: '[S1]' } : 'Quote does not match at this offset.',
});

test('only a later verified check of the exact source and quote recovers failures, preserving all diagnostics', () => {
  const items = [attempt('first', 'failed'), attempt('second', 'failed'), attempt('success', 'complete'), attempt('later', 'failed')];
  const original = JSON.stringify(items);
  const rows = activityRows(items, [citation]);
  expect(rows.map(row => row.activity.id)).toEqual(['success', 'later']);
  expect(rows[0]?.retries.map(item => item.id)).toEqual(['first', 'second']);
  expect(JSON.stringify(items)).toBe(original);
  render(<ChatActivity activity={items} citations={[citation]} running={false} />);
  expect(screen.getByText('Citation verified')).toBeTruthy();
  expect(screen.getByText('2 retries recovered')).toBeTruthy();
  expect(document.querySelector('.citation-recovered')?.hasAttribute('open')).toBe(false);
  expect(document.querySelectorAll('.citation-retries .tool-detail')).toHaveLength(3);
  expect(document.querySelectorAll('.chat-activity > ol > li')).toHaveLength(2);
});

test('legacy read handles can match exact revision IDs while interleaved reads remain visible', () => {
  const handle = 'R12345678-1';
  const read: Activity = { id: 'read', name: 'counsel_read_record', label: 'Reading a saved passage', status: 'complete', input: {}, output: { kind: 'source', id: 'source-v1', readHandle: handle } };
  const failed = attempt('failed', 'failed', { kind: 'source', id: handle, quote: 'Exact quote.', start: 0 });
  const rows = activityRows([read, failed, { ...read, id: 'reread' }, attempt('success', 'complete')], [citation]);
  expect(rows.map(row => row.activity.id)).toEqual(['read', 'reread', 'success']);
  expect(rows[2]?.retries).toEqual([failed]);
});

test('different wording, versions, record kinds and unverified or running results never hide a failed check', () => {
  const original = attempt('failed', 'failed');
  const changed = [
    attempt('success', 'complete', { kind: 'source', id: 'source-v2', quote: 'Exact quote.', start: 40 }),
    attempt('success', 'complete', { kind: 'source', id: 'source-v1', quote: 'A different quote.', start: 40 }),
    attempt('success', 'complete', { kind: 'work', id: 'source-v1', quote: 'Exact quote.', start: 40 }),
    { ...attempt('success', 'complete'), output: { marker: '[S9]' } },
    attempt('running', 'running'),
  ];
  for (const next of changed) expect(activityRows([original, next], [citation]).map(row => row.retries.length)).toEqual([0, 0]);
  expect(activityRows([original, attempt('success', 'complete')], []).map(row => row.retries.length)).toEqual([0, 0]);
});
