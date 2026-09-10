import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { SourceChangeNotice } from './SourceChangeNotice';
import type { ReferenceImpact } from '../../../src/workspace/reference-impact';
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; sessionStorage.clear(); });
const result = (): ReferenceImpact => ({ changes: [{ kind: 'source', recordId: 'source', title: 'Revised reference', citedRevisionId: 'old', citedVersion: 1, currentRevisionId: 'new', currentVersion: 2,
  via: [{ kind: 'knowledge', id: 'position' }, { kind: 'work', id: 'earlier' }] }], coverage: { visitedRecords: 4, unlinkedRecords: 0, truncated: false } });
test('indirect changes are identified without implying that advice or a practice position was rewritten', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  const paths: string[] = [];
  globalThis.fetch = (async (url: string) => { paths.push(url); return Response.json(result()); }) as typeof fetch;
  const view = render(<SourceChangeNotice workId="work" />);
  expect(await screen.findByText('A supporting reference has a newer version')).toBeTruthy();
  expect(screen.getByText(/through saved practice material/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Revised reference' }).getAttribute('href')).toBe('#/references?id=source&revision=new');
  expect(screen.getByText(/have not been rewritten/)).toBeTruthy();
  expect(paths).toEqual(['/api/workspace/work/work/reference-impact']);
  view.rerender(<SourceChangeNotice knowledgeRevisionId="practice-version" />);
  await waitFor(() => expect(paths.at(-1)).toBe('/api/workspace/knowledge-revisions/practice-version/reference-impact'));
  expect(screen.getByText(/Your practice item remains unchanged/)).toBeTruthy();
});
test('an incomplete traversal does not look like a clean reference check, and malformed responses can be retried', async () => {
  sessionStorage.setItem('counsel-os.token', 'fixture');
  let valid = false;
  globalThis.fetch = (async () => Response.json(valid ? { changes: [], coverage: { visitedRecords: 1000, unlinkedRecords: 3, truncated: true } } : {})) as unknown as typeof fetch;
  render(<SourceChangeNotice workId="work" />);
  expect(await screen.findByText(/Reference updates could not be checked/)).toBeTruthy();
  valid = true; fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
  expect(await screen.findByText('Reference checking reached its limit')).toBeTruthy();
  expect(screen.getByText(/other updates may be missing/)).toBeTruthy();
});
