import { getToken } from '../api/token';
import type { WorkspaceCatalog } from '../../../src/workspace/catalog';
import type { ConnectionStatus } from '../../../src/workspace/connection';
import type { WorkspaceProfile } from '../../../src/workspace/profile';
export type { MatterBrief, WorkOutput } from '../../../src/workspace/organization';
export type { WorkspaceProfile, ProfileFields } from '../../../src/workspace/profile';
export type { PracticeTemplate } from '../../../src/workspace/templates';
export type { BackupManifest } from '../../../src/workspace/backup-format';
export type {
  SourceHistory,
  SourceChange,
  ReferenceChange,
} from '../../../src/workspace/source-updates';
export type { KnowledgeHistory } from '../../../src/workspace/knowledge-updates';
export type { WordExport } from '../../../src/workspace/exports';
export type { ConnectionStatus, ConnectionConfig } from '../../../src/workspace/connection';
export type { ModelChoice, ModelPreference, ModelCatalog } from '../../../src/workspace/model-choice';
export type {
  Conversation,
  ConversationSummary,
  Turn,
  ContextRecord,
  ChatCitation,
} from '../../../src/workspace/conversations';
export type {
  CatalogKnowledge,
  CatalogSource,
  CatalogWork,
  WorkspaceCatalog,
} from '../../../src/workspace/catalog';
export type {
  Matter,
  Knowledge,
  KnowledgeRevision,
  Source,
  SourceRevision,
  Work,
  Evidence,
  EvidenceInput,
  SearchResult,
  SearchHit,
} from '../../../src/workspace/types';
export interface Snapshot extends WorkspaceCatalog {
  practiceDocument?: import('../../../src/workspace/practice-document').PracticeDocumentView;
  entityRegistry?: import('../../../src/workspace/entities').EntityRegistry | null;
  workingPreferences?: import('../../../src/workspace/working-preferences').WorkingPreferences | null;
  clients?: import('../../../src/workspace/clients').Client[];
  templates?: import('../../../src/workspace/templates').PracticeTemplate[];
  interfaceVersion?: number;
  practiceReviewCount?: number;
  hasPreferenceDraft?: boolean;
  desktop?: boolean;
  setup?: import('../../../src/workspace/onboarding').SetupState;
  demo: boolean;
  databasePath: string;
  connection: ConnectionStatus;
  profile: WorkspaceProfile | null;
}

export async function request<T>(path = '', data?: unknown, signal?: AbortSignal): Promise<T> {
  let token: string;
  try {
    token = getToken();
  } catch {
    throw new Error('Reopen Counsel OS to reconnect. If you started it from a terminal, open the workspace link printed there.');
  }
  let response: Response;
  try {
    response = await fetch(`/api/workspace${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (data !== undefined)
      throw new Error(
        'The connection was interrupted. This action may have been saved; check your workspace before retrying. Your entered text is still here.',
      );
    throw new Error(
      'Cannot reach your workspace. Reopen Counsel OS, or check that its workspace command is still running, then try again.',
    );
  }
  const result = await response.json();
  if (!response.ok && result.error === 'Unknown workspace route.')
    throw new Error('This interface needs a newer workspace engine. Quit and reopen the updated Counsel OS app. If you use the terminal, restart your original workspace command and open its new link. Refreshing alone will not update the engine.');
  if (!response.ok)
    throw new Error(result.error || 'This action could not be completed. Try again.');
  return result as T;
}

export async function downloadOriginal(revisionId: string, name: string): Promise<void> {
  return downloadFile(`/source-revisions/${encodeURIComponent(revisionId)}/original`, name);
}

export async function loadImagePreview(revisionId: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(`/api/workspace/source-revisions/${encodeURIComponent(revisionId)}/image`, {
    headers: { Authorization: `Bearer ${getToken()}` }, signal,
  });
  if (!response.ok) throw new Error('This image is unavailable. It may have been moved to Trash.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(response.headers.get('content-type') ?? '')) throw new Error('The saved file is not a supported image.');
  return response.blob();
}

export async function downloadWord(id: string, name: string): Promise<void> {
  return downloadFile(`/exports/${encodeURIComponent(id)}/download`, name);
}

async function downloadFile(path: string, name: string): Promise<void> {
  const response = await fetch(`/api/workspace${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'The file could not be downloaded. Try again.');
  }
  saveDownload(await response.blob(), name);
}

function saveDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadBackup(): Promise<void> {
  const response = await fetch('/api/workspace/backups/prepare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'The backup could not be created. Try again.');
  }
  const file = await response.json() as { name: string; downloadUrl: string };
  if (!/^\/api\/workspace\/backups\/[a-f0-9]{64}\/download$/.test(file.downloadUrl))
    throw new Error('The backup download could not be verified.');
  const link = document.createElement('a');
  link.href = file.downloadUrl;
  link.download = file.name;
  link.rel = 'noreferrer';
  document.body.append(link);
  link.click();
  link.remove();
}

export async function verifyBackup(
  file: File,
): Promise<import('../../../src/workspace/backup-format').BackupManifest> {
  if (!file.size || file.size > 10_000_000_000)
    throw new Error('Choose a backup file of 10 GB or less.');
  const response = await fetch('/api/workspace/backups/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || 'This backup could not be verified. Try another copy.');
  return result;
}

export type Surface =
  'home' | 'matters' | 'knowledge' | 'references' | 'work' | 'search' | 'settings' | 'imports' | 'trash';
export interface Route {
  page: Surface;
  id?: string;
  query?: string;
  revision?: string;
}
const surfaces: Surface[] = [
  'home',
  'matters',
  'knowledge',
  'references',
  'work',
  'search',
  'settings',
  'imports',
  'trash',
];
export function parseRoute(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(search);
  return {
    page: surfaces.includes(path as Surface) ? (path as Surface) : 'home',
    id: params.get('id') ?? undefined,
    query: params.get('q') ?? undefined,
    revision: params.get('revision') ?? undefined,
  };
}
export function href(page: Surface, params: Record<string, string | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) search.set(key, value);
  return `#/${page}${search.size ? `?${search}` : ''}`;
}
export function go(page: Surface, params: Record<string, string | undefined> = {}): void {
  location.hash = href(page, params);
}
