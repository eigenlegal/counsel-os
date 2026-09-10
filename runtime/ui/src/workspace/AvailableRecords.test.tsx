import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { AvailableRecords } from './AvailableRecords';
afterEach(cleanup);
test('available record names are distinct from content reads and inspection keeps exact revision identity', () => {
  let selected: unknown;
  render(<AvailableRecords value={{ note: 'Metadata only', pages: [
    { kind: 'source', records: [{ kind: 'source', id: 'exact-revision', recordId: 'record', title: 'Matter note <literal>', status: 'partial', version: 2, recordedAt: '2026-09-05' }], total: 45, nextBefore: 19 },
    { kind: 'work', records: [], total: 0, nextBefore: null },
  ] }} inspect={record => { selected = record; }} />);
  fireEvent.click(screen.getByText('Records available to Counsel'));
  expect(screen.getByText(/not a list of documents read/)).toBeTruthy();
  expect(screen.getByText('Showing 1 of 45 record names.')).toBeTruthy();
  expect(screen.getByText('None available in this scope.')).toBeTruthy();
  expect(screen.getByText('Partial text')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Matter note <literal>' }));
  expect(selected).toEqual({ kind: 'source', id: 'exact-revision', title: 'Matter note <literal>' });
});
