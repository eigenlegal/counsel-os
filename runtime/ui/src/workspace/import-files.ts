import {
  IMPORT_MAX_FILES,
  ImportManifest,
} from "../../../src/workspace/import-types";

export type SelectedImportFile = { path: string; file: File };
export function selectedFiles(files: File[]): SelectedImportFile[] {
  const selected = files.map((file) => ({
    path: file.webkitRelativePath || file.name,
    file,
  }));
  ImportManifest.parse(
    selected.map((item) => ({ path: item.path, byteCount: item.file.size })),
  );
  return selected;
}

/** Capture handles synchronously inside drop. Enumerate every directory page, not just the first 100. */
export async function droppedFiles(
  data: DataTransfer,
): Promise<SelectedImportFile[]> {
  const handles = Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => {
      const entry = item as DataTransferItem & {
        getAsEntry?: () => FileSystemEntry | null;
      };
      return (
        (entry.getAsEntry?.() ?? entry.webkitGetAsEntry?.()) || item.getAsFile()
      );
    });
  const result: SelectedImportFile[] = [];
  let visited = 0;
  async function walk(
    handle: FileSystemEntry | File,
    parent = "",
    depth = 0,
  ): Promise<void> {
    if (++visited > 40_000 || depth > 19)
      throw new Error(
        "This selection has too many nested folders. Choose a smaller folder.",
      );
    const path = parent ? `${parent}/${handle.name}` : handle.name;
    if ("isDirectory" in handle && handle.isDirectory) {
      // Skip hidden infrastructure without traversing it; retain a visible exclusion in the manifest.
      if (
        handle.name.startsWith(".") ||
        /^(node_modules|__pycache__)$/i.test(handle.name)
      ) {
        result.push({ path, file: new File([], handle.name) });
      } else {
        const reader = (handle as FileSystemDirectoryEntry).createReader();
        for (;;) {
          const entries = await new Promise<FileSystemEntry[]>(
            (resolve, reject) => reader.readEntries(resolve, reject),
          );
          if (!entries.length) break;
          for (const child of entries) await walk(child, path, depth + 1);
        }
      }
    } else {
      const file =
        "isFile" in handle
          ? await new Promise<File>((resolve, reject) =>
              (handle as FileSystemFileEntry).file(resolve, reject),
            )
          : handle;
      result.push({ path, file });
    }
    if (result.length > IMPORT_MAX_FILES)
      throw new Error("Choose up to 10,000 files per import.");
  }
  for (const handle of handles) if (handle) await walk(handle);
  if (!result.length)
    throw new Error(
      "No files could be read from this drop. Use Choose files or Choose folder.",
    );
  ImportManifest.parse(
    result.map((item) => ({ path: item.path, byteCount: item.file.size })),
  );
  return result;
}
export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]!);
    reader.onerror = () =>
      reject(
        new Error("The selected file could not be read. Choose it again."),
      );
    reader.readAsDataURL(file);
  });
}
