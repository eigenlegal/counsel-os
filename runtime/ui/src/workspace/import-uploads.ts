import { useSyncExternalStore } from 'react';
import type { ImportBatch, ImportUploadPlan } from '../../../src/workspace/import-types';
import { request } from './api';
import { fileBase64, type SelectedImportFile } from './import-files';

export interface ImportUpload {
  batchId: string;
  label: string;
  state: 'uploading' | 'paused' | 'error' | 'complete';
  uploaded: number;
  total: number;
  path: string;
  error: string;
}
type Session = { view: ImportUpload; files: Map<string, File>; stop: boolean; task?: Promise<void> };
const sessions = new Map<string, Session>();
const listeners = new Set<() => void>();
let snapshot: ImportUpload[] = [];
const publish = () => {
  snapshot = Array.from(sessions.values(), session => ({ ...session.view }));
  for (const listener of listeners) listener();
};
export function useImportUploads(): ImportUpload[] {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
}
// Browser File handles live here, not in the page component. Navigation inside
// Counsel does not stop transfer; closing/reloading the tab still loses handles.
window.addEventListener('beforeunload', event => {
  if (snapshot.some(item => item.state !== 'complete' && item.uploaded < item.total)) {
    event.preventDefault();
    event.returnValue = '';
  }
});

export async function startImportUpload(batch: ImportBatch, selected: SelectedImportFile[] = []): Promise<void> {
  if (sessions.get(batch.id)?.task) return;
  const previous = sessions.get(batch.id);
  const files = new Map(previous?.files ?? []);
  const plan = await request<ImportUploadPlan[]>(`/imports/${batch.id}/upload-plan`);
  if (sessions.get(batch.id)?.task) return;
  const manifest = new Map(plan.map(entry => [entry.path, entry]));
  for (const path of files.keys()) {
    const entry = manifest.get(path);
    if (!entry || entry.phase !== 'awaiting_upload' || entry.skip) files.delete(path);
  }
  for (const item of selected) {
    const entry = manifest.get(item.path);
    if (!entry || entry.byteCount !== item.file.size)
      throw new Error('These files do not match this import. Choose the original folder or start another import.');
    if (entry.phase === 'awaiting_upload') files.set(item.path, item.file);
  }
  const remaining = plan.filter(entry => entry.phase === 'awaiting_upload' && !entry.skip && files.has(entry.path));
  if (!remaining.length) {
    if (previous) {
      previous.files.clear();
      previous.view = { ...previous.view, state: 'complete', uploaded: previous.view.total, path: '', error: '' };
      publish();
    }
    return;
  }
  const session: Session = {
    files, stop: false,
    view: { batchId: batch.id, label: batch.label, state: 'uploading', uploaded: 0, total: remaining.length, path: '', error: '' },
  };
  sessions.set(batch.id, session);
  publish();
  session.task = (async () => {
    try {
      for (const entry of remaining) {
        if (session.stop) break;
        session.view.path = entry.path;
        publish();
        const base64 = await fileBase64(files.get(entry.path)!);
        // A pause during FileReader should not start another HTTP request.
        if (session.stop) break;
        await request(`/imports/${batch.id}/files/${entry.id}`, { base64 });
        files.delete(entry.path);
        session.view.uploaded++;
        publish();
      }
      session.view.state = session.view.uploaded === session.view.total ? 'complete' : 'paused';
    } catch (error) {
      session.view.state = 'error';
      session.view.error = (error as Error).message;
    } finally {
      session.task = undefined;
      session.view.path = '';
      publish();
    }
  })();
}
export async function pauseImportUpload(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;
  session.stop = true;
  await session.task;
}
export function forgetImportUpload(id: string): void {
  if (sessions.get(id)?.task) return;
  sessions.delete(id);
  publish();
}
