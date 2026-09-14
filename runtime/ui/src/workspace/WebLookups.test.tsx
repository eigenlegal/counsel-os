import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '../test/dom';
import { WebLookups } from './WebLookups';
afterEach(cleanup);
test('web receipts expose saved and live copies, retrieval limits and unchanged versions', () => {
  render(<WebLookups receipts={[{ sourceId: 'source', revisionId: 'revision', title: 'Public terms', version: 2,
    requestedUrl: 'https://example.org/old', url: 'https://example.org/terms', checkedAt: '2026-09-14T12:00:00.000Z',
    retrievedAt: '2026-09-13T12:00:00.000Z', originalHash: 'a'.repeat(64), mediaType: 'text/html', reused: true,
    notes: ['Scripts and login were not used.'], links: [], linksTruncated: false }]} />);
  expect(screen.getByText('1 public page retrieved · saved in Sources')).toBeTruthy();
  expect(screen.getByText(/not your document text or browser login/)).toBeTruthy();
  expect(screen.getByText(/saved version unchanged/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Public terms · version 2' }).getAttribute('href')).toBe('#/references?id=source&revision=revision');
  expect(screen.getByRole('link', { name: 'Open live page' }).getAttribute('rel')).toBe('noopener noreferrer');
  expect(screen.getByText('Redirected from https://example.org/old')).toBeTruthy();
});
