import type { WorkspaceStore } from './store';
import type { StepRequest } from '../core/types';
import { IMAGE_TURN_MAX_BYTES, isImageMedia } from './image-types';
import { inspectImage } from './images';
import { WorkspaceConflictError } from './types';

export function checkImageBudget(store: WorkspaceStore, attachments: string[]) {
  const size = attachments.reduce((total, id) => {
    const revision = store.getSourceRevision(id);
    return total + (isImageMedia(revision.provenance.mediaType) ? revision.original?.byteCount ?? 0 : 0);
  }, 0);
  if (size > IMAGE_TURN_MAX_BYTES) throw new WorkspaceConflictError('Images in one chat can total up to 20 MB. Remove a pending image, use smaller copies, or start a new chat. Nothing was sent.');
}
export function prepareImageContext(store: WorkspaceStore, attachments: string[]) {
  checkImageBudget(store, attachments);
  const images: NonNullable<StepRequest['images']> = [];
  const context: Array<{ id: string; title: string; number: number; width: number; height: number; hash: string }> = [];
  for (const id of attachments) {
    if (!store.sourceRevisionAvailable(id)) throw new WorkspaceConflictError('An attached image is in Trash or unavailable.');
    const revision = store.getSourceRevision(id);
    if (!isImageMedia(revision.provenance.mediaType)) continue;
    const original = store.originalFile(id), inspected = inspectImage(original.bytes, original.name);
    if (inspected.mediaType !== revision.provenance.mediaType) throw new WorkspaceConflictError('The image type does not match its saved version.');
    images.push({ id, title: revision.title, mediaType: inspected.mediaType, data: original.bytes.toString('base64') });
    context.push({ id, title: revision.title, number: images.length, width: inspected.width, height: inspected.height, hash: revision.provenance.originalHash! });
  }
  return { images, context };
}
