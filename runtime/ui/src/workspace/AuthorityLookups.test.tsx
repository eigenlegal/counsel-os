import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '../test/dom';
import { AuthorityLookups } from './AuthorityLookups';
afterEach(cleanup);
test('statutes display laws-in-effect and public-law update dates separately', () => {
  render(<AuthorityLookups receipts={[{ sourceId: 'statute', revisionId: 'version', title: '15 USC 7001', version: 1,
    publication: { publisher: 'uscode', title: 15, section: '7001', requestedDate: null, versionDate: '2026-07-12', publisherCurrentThrough: '2026-07-12', lawsInEffectOn: '2026-09-06', currentThroughPublicLaw: '119-102', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section7001&num=0&edition=prelim' },
    checkedAt: '2026-09-07T20:00:00.000Z', retrievedAt: '2026-09-07T20:00:00.000Z', reused: false, notes: [] }]} />);
  expect(screen.getByText(/Laws in effect 2026-09-06; updated through Public Law 119-102 \(2026-07-12\)/)).toBeTruthy();
  expect(screen.queryByText(/Text as of/)).toBeNull();
});
test('publisher receipts distinguish retrieval, version dates and unchanged snapshots without claiming a legal review', () => {
  render(<AuthorityLookups receipts={[{ sourceId: 'source', revisionId: 'version', title: '31 CFR 1010.100', version: 2,
    publication: { publisher: 'ecfr', title: 31, section: '1010.100', requestedDate: null, versionDate: '2026-09-03', publisherCurrentThrough: '2026-09-03', url: 'https://www.ecfr.gov/on/2026-09-03/title-31/section-1010.100' },
    checkedAt: '2026-09-07T20:00:00.000Z', retrievedAt: '2026-09-06T20:00:00.000Z', reused: true, notes: [] }]} />);
  expect(screen.getByText(/1 publisher lookup/)).toBeTruthy();
  expect(screen.getByText(/Only legal citations and dates/)).toBeTruthy();
  expect(screen.getByText(/saved version unchanged/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '31 CFR 1010.100 · version 2' }).getAttribute('href')).toBe('#/references?id=source&revision=version');
});
