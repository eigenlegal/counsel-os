import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '../test/dom';
import { FilenameExamples } from './FilenameExamples';
afterEach(cleanup);
test('examples show the exact draft/redline variants and explain their source names', () => {
  render(<FilenameExamples pattern="{document} - {variant}" author="Synthetic Avery" date="2026-01-02" />);
  expect(screen.getByText('Mutual NDA - redline.docx')).toBeTruthy();
  expect(screen.getByText('NDA review - draft.docx')).toBeTruthy();
  expect(screen.getByRole('group', {name:'Example Word filenames'}).textContent).toContain('for an answer downloaded as Word');
});
test('examples update with the actual pattern, UTC date and author', () => {
  const {rerender} = render(<FilenameExamples pattern="{document}_{variant}_{author}_{date}" author="Synthetic Avery" date="2026-01-02" />);
  expect(screen.getByText('Mutual NDA_redline_Synthetic Avery_2026-01-02.docx')).toBeTruthy();
  expect(screen.getByText('NDA review_draft_Synthetic Avery_2026-01-02.docx')).toBeTruthy();
  rerender(<FilenameExamples pattern="{document} - {variant}.docx" author="Counsel" date="2026-01-02" />);
  expect(screen.getByText('NDA review - draft.docx')).toBeTruthy();
  expect(screen.queryByText(/\.docx\.docx/)).toBeNull();
});
test('invalid patterns do not display misleading filenames', () => {
  render(<FilenameExamples pattern="../{unknown}" author="Counsel" />);
  expect(screen.getByText('Enter a valid filename pattern to see examples.')).toBeTruthy();
  expect(screen.queryByRole('group', {name:'Example Word filenames'})).toBeNull();
});
test('custom labels reproduce separate redline and draft parentheticals without changing the author', () => {
  render(<FilenameExamples pattern="{document} ({variant} {date})" redlineLabel="ExampleCo redline" draftLabel="Draft" author="Synthetic Avery" date="2026-01-02" />);
  expect(screen.getByText('Mutual NDA (ExampleCo redline 2026-01-02).docx')).toBeTruthy();
  expect(screen.getByText('NDA review (Draft 2026-01-02).docx')).toBeTruthy();
  expect(screen.getByRole('group', {name:'Example Word filenames'}).textContent).toContain('becomes ExampleCo redline');
});
