import "../test/dom";
import { expect, test } from "bun:test";
import { droppedFiles, selectedFiles } from "./import-files";

function file(name: string): FileSystemFileEntry {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (success: (file: File) => void) =>
      success(new File(["synthetic"], name)),
  } as FileSystemFileEntry;
}
function folder(
  name: string,
  children: FileSystemEntry[],
  visit?: () => void,
): FileSystemDirectoryEntry {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      visit?.();
      let offset = 0;
      return {
        readEntries: (success: (entries: FileSystemEntry[]) => void) => {
          const page = children.slice(offset, offset + 100);
          offset += 100;
          success(page);
        },
      };
    },
  } as FileSystemDirectoryEntry;
}
function transfer(entries: FileSystemEntry[]): DataTransfer {
  return {
    items: entries.map((entry) => ({
      kind: "file",
      webkitGetAsEntry: () => entry,
    })),
  } as unknown as DataTransfer;
}
test("folder drop reads all directory pages, preserves paths and does not traverse hidden infrastructure", async () => {
  let hiddenVisited = false;
  const entries = Array.from({ length: 601 }, (_, i) => file(`${i}.txt`));
  entries.push(
    folder(".git", [file("private.txt")], () => {
      hiddenVisited = true;
    }) as unknown as FileSystemFileEntry,
  );
  const files = await droppedFiles(transfer([folder("Selected", entries)]));
  expect(files).toHaveLength(602);
  expect(files[600]?.path).toBe("Selected/600.txt");
  expect(hiddenVisited).toBe(false);
  expect(files.at(-1)?.path).toBe("Selected/.git");
});
test("folder drop refuses oversized and deeply nested selections rather than silently truncating them", async () => {
  await expect(
    droppedFiles(
      transfer([
        folder(
          "Many",
          Array.from({ length: 10001 }, (_, i) => file(`${i}.txt`)),
        ),
      ]),
    ),
  ).rejects.toThrow("10,000 files");
  let entry: FileSystemEntry = file("end.txt");
  for (let i = 0; i < 21; i++) entry = folder(`level${i}`, [entry]);
  await expect(droppedFiles(transfer([entry]))).rejects.toThrow(
    "nested folders",
  );
});
test("ordinary input retains exact filenames and rejects duplicate or traversing paths", () => {
  expect(selectedFiles([new File(["x"], "Notice ü.txt")])[0]?.path).toBe(
    "Notice ü.txt",
  );
  expect(() =>
    selectedFiles([new File(["x"], "same.txt"), new File(["y"], "same.txt")]),
  ).toThrow();
  expect(() => selectedFiles([new File(["x"], "../private.txt")])).toThrow();
});
