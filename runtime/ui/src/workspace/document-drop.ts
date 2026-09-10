import { useEffect, useRef, useState, type DragEvent } from 'react';

export const isFileDrop = (data: DataTransfer) => Array.from(data.types).includes('Files');
export function documentDropFiles(data: DataTransfer): File[] {
  const items = Array.from(data.items ?? []).filter(item => item.kind === 'file');
  if (items.some(item => item.webkitGetAsEntry?.()?.isDirectory))
    throw new Error('Drop individual documents here. To organize a folder, use Settings → Import files & folders.');
  const files = Array.from(data.files);
  if (!files.length) throw new Error('No files could be read from this drop. Use Choose File instead.');
  return files;
}
export function useDocumentDrop(receive: (files: File[]) => void, disabled: boolean, fail: (message: string) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    // Dropping outside a target must not navigate away from an unsent conversation.
    const prevent = (event: globalThis.DragEvent) => {
      if (event.dataTransfer && isFileDrop(event.dataTransfer)) event.preventDefault();
    };
    const clear = () => { depth.current = 0; setDragging(false); };
    window.addEventListener('dragover', prevent); window.addEventListener('drop', prevent);
    window.addEventListener('drop', clear); window.addEventListener('dragend', clear);
    return () => {
      window.removeEventListener('dragover', prevent); window.removeEventListener('drop', prevent);
      window.removeEventListener('drop', clear); window.removeEventListener('dragend', clear);
    };
  }, []);
  return { dragging, handlers: {
    onDragEnter(event: DragEvent) {
      if (!isFileDrop(event.dataTransfer)) return;
      event.preventDefault(); depth.current++; if (!disabled) setDragging(true);
    },
    onDragOver(event: DragEvent) {
      if (!isFileDrop(event.dataTransfer)) return;
      event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    },
    onDragLeave(event: DragEvent) {
      if (!isFileDrop(event.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false);
    },
    onDrop(event: DragEvent) {
      if (!isFileDrop(event.dataTransfer)) return;
      event.preventDefault(); event.stopPropagation(); depth.current = 0; setDragging(false);
      if (disabled) { fail('Wait for the current response or upload to finish before adding documents.'); return; }
      try { receive(documentDropFiles(event.dataTransfer)); } catch (error) { fail((error as Error).message); }
    },
  } };
}
