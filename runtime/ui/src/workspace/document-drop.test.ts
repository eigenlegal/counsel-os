import { expect, test } from 'bun:test';
import '../test/dom';
import { documentDropFiles, isFileDrop } from './document-drop';
test('file drop distinguishes text, rejects folders without walking them, and retains all selected files', () => {
  const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.md')];
  const data = { types: ['Files'], files, items: [] } as unknown as DataTransfer;
  expect(isFileDrop(data)).toBe(true);
  expect(isFileDrop({ types: ['text/plain'] } as unknown as DataTransfer)).toBe(false);
  expect(documentDropFiles(data)).toEqual(files);
  expect(() => documentDropFiles({ ...data, items: [{ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true }) }] } as unknown as DataTransfer)).toThrow('Import files & folders');
  expect(() => documentDropFiles({ ...data, files: [] } as unknown as DataTransfer)).toThrow('No files');
});
