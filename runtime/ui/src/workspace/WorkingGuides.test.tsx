import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { WorkingGuides } from './WorkingGuides';
import type { PracticeGuide } from '../../../src/workspace/practice-guides';
afterEach(cleanup);
test('guide receipt is versioned, distinguishes methods from law and blocks unsafe source links', () => {
  const guide: PracticeGuide = { id: 'privacy', title: 'Privacy <literal>', version: 1, publishedAt: '2026-09-05', contentHash: 'hash',
    useWhen: 'Synthetic', authority: 'working-method-not-law', method: ['Read relevant records.'], limits: ['Not current-law verification.'],
    sourceMap: [{ title: 'Official source', url: 'https://www.govinfo.gov/', purpose: 'A starting point.' },
      { title: 'Unsafe source', url: 'javascript:alert(1)', purpose: 'Untrusted backup content.' }] };
  render(<WorkingGuides guides={[guide]} />);
  expect(screen.getByText(/not verified law/)).toBeTruthy();
  fireEvent.click(screen.getByText('Privacy <literal>'));
  expect(screen.getByText(/not a legal review date/)).toBeTruthy();
  expect(screen.getByText(/not opened by loading this guide/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Official source' }).getAttribute('rel')).toBe('noopener noreferrer');
  expect(screen.queryByRole('link', { name: 'Unsafe source' })).toBeNull();
});
test('no guide receipts are invented for earlier responses', () => {
  render(<WorkingGuides guides={[]} />);
  expect(screen.queryByRole('region', { name: 'Working guides used' })).toBeNull();
});
