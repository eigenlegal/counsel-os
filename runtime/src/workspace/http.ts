import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { bearerToken, tokensMatch } from '../server/auth';
import { serveStatic } from '../server/static';
import {
  KnowledgeInput,
  MatterInput,
  SourceInput,
  WorkInput,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
} from './types';
import type { WorkspaceStore } from './store';
import { workspaceSetup, SetupAction } from './onboarding';
import type { WorkspaceChat } from './chat';
import { OrganizationJobStart, OrganizationJobControl, OrganizationJobApply } from './import-organization-job-types';
import { ConversationInput, SendInput } from './conversations';
import { ConversationState, ConversationChange } from './conversation-lifecycle';
import { SourceMatterChange } from './source-matters';
import { RecordChange, RecordTrashQuery } from './record-lifecycle';
import { ProfileInput } from './profile';
import { OutputInput, MatterBriefInput, OrganizeConversationInput } from './organization';
import { FileInput, FILE_MAX_REQUEST_BYTES } from './files';
import { WORD_MEDIA_TYPE } from './exports';
import { SourceFileUpdate, SourceTextUpdate } from './source-updates';
import { KnowledgeUpdate } from './knowledge-updates';
import { BriefReview, BriefUndo } from './brief-proposals';
import { TemplateCreate, TemplateUpdate } from './templates';
import { BACKUP_MAX_BYTES, BACKUP_MEDIA_TYPE } from './backup-format';
import { createWorkspaceBackupFile, inspectWorkspaceBackup, type WorkspaceBackupFile } from './backups';
import { ConnectionInput, type WorkspaceConnection, type ConnectionStatus } from './connection';
import { ConnectionKind, ModelPreferenceInput, sameConnection } from './model-choice';
import { ImportCreate, ImportEdit, ImportCommit, ImportQueueAction, ImportQuery, ImportSelection, ImportBulkEdit, ImportChoiceEdits, IMPORT_MAX_MANIFEST_BYTES } from './import-types';
import { ImportOrganizeInput } from './import-organization';
import { ImportLinkApply, ImportLinkQuery } from './import-links';
import { SourceOrganizationSelection, SourceOrganizationApply, SourceOrganizationSuggest } from './source-organization';
import { SourceLinkQuery, SourceLinkApply } from './source-links';
import { AutoFilingEnable, AutoFilingControl, AutoFilingReview, AutoFilingQuery } from './auto-filing-types';
import { guideCatalog, readPracticeGuide } from './practice-guides';
import { ClientCreate, ClientUpdate, ClientAssignment } from './clients';
import { LibraryQuery, PlacementInput } from './source-library';
import { PracticeLibraryQuery } from './practice-library';
import { PracticeDraftInput } from './practice-drafting';
import { BriefDraftInput } from './brief-drafting';
import { checkSignatory, SignatoryCheckInput } from './entities';
import { lookupAuthority } from './authorities';
import { lookupStatute } from './statutes';
import { DuplicateSkip, ImportUndo } from './import-maintenance';
import { UpkeepQuery, UpkeepDecision } from './upkeep-types';

const Id = z.string().uuid();
const Review = z
  .object({
    expectedRevisionId: Id,
    action: z.enum(['approve', 'reject']),
    expectedProfileRevisionId: Id,
  })
  .strict();
const WorkRequest = WorkInput.omit({ decisionBy: true })
  .extend({
    disposition: z.enum(['draft', 'decision']).default('draft'),
    expectedProfileRevisionId: Id.optional(),
  })
  .strict()
  .refine(
    (input) =>
      (input.disposition === 'decision') === (input.expectedProfileRevisionId !== undefined),
    'A decision must identify the saved profile version; drafts do not record an approving identity.',
  );
const MAX_BODY = 2_200_000;
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function body(req: Request): Promise<unknown> {
  const pathname = new URL(req.url).pathname;
  const isUpload =
    pathname === '/api/workspace/files' ||
    /^\/api\/workspace\/imports\/[^/]+\/files\/[^/]+$/.test(pathname) ||
    /^\/api\/workspace\/sources\/[^/]+\/files$/.test(pathname);
  const isManifest = pathname === '/api/workspace/imports';
  const maxBody = isUpload ? FILE_MAX_REQUEST_BYTES : isManifest ? IMPORT_MAX_MANIFEST_BYTES : MAX_BODY;
  const tooLarge = isUpload
    ? 'This document upload is too large. Choose a file of 25 MB or less.'
    : isManifest ? 'This file inventory is too large. Choose up to 10,000 files with shorter folder paths.' : 'This record is too large. Use less than 2 MB of text.';
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'Send JSON content.');
  if (Number(req.headers.get('content-length')) > maxBody) throw new HttpError(413, tooLarge);
  if (!req.body) throw new HttpError(400, 'A record is required.');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > maxBody) {
        await reader.cancel();
        throw new HttpError(413, tooLarge);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'The record could not be read as JSON.');
  }
}

function backupBody(req: Request): ReadableStream<Uint8Array> {
  if (req.headers.get('content-type') !== 'application/octet-stream')
    throw new HttpError(415, 'Send the original backup file.');
  if (Number(req.headers.get('content-length')) > BACKUP_MAX_BYTES)
    throw new HttpError(413, 'Choose a backup file of 10 GB or less.');
  if (!req.body) throw new HttpError(400, 'Choose a backup file.');
  return req.body;
}

function backupResponse(file: WorkspaceBackupFile): Response {
  const reader = Bun.file(file.path).stream().getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) { file.dispose(); controller.close(); }
        else controller.enqueue(next.value);
      } catch (error) { file.dispose(); controller.error(error); }
    },
    async cancel() { try { await reader.cancel(); } finally { file.dispose(); } },
  });
  return new Response(body, { headers: {
    'content-type': BACKUP_MEDIA_TYPE,
    'content-length': String(file.byteCount),
    'content-disposition': `attachment; filename="${file.name}"`,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  } });
}

export interface WorkspaceHttpOptions {
  store: WorkspaceStore;
  token: string;
  origin: string;
  distDir: string | import('../server/static').StaticSource;
  demo: boolean;
  desktop?: boolean;
  chat?: WorkspaceChat;
  connection?: WorkspaceConnection;
  connectionStatus?: () => ConnectionStatus;
}

/** Separate, authenticated loopback application. Connection setup accepts secrets
 * but never returns them. Model tools use their own per-run capability boundary. */
export function workspaceHandler(
  options: WorkspaceHttpOptions,
): (req: Request) => Promise<Response> {
  const { store, token, origin, demo } = options;
  const staticHandler = serveStatic(options.distDir);
  // Single-use, short-lived capabilities grant only one already-created backup,
  // never workspace API access. Native browser downloads cannot send Bearer headers.
  const downloads = new Map<string, { file: WorkspaceBackupFile; timeout: ReturnType<typeof setTimeout> }>();
  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (
      url.origin !== origin ||
      (req.headers.has('host') && req.headers.get('host') !== new URL(origin).host)
    )
      return Response.json({ error: 'Invalid host.' }, { status: 403 });
    if (req.headers.has('origin') && req.headers.get('origin') !== origin)
      return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
    const ticket = url.pathname.match(/^\/api\/workspace\/backups\/([a-f0-9]{64})\/download$/)?.[1];
    if (ticket && req.method === 'GET') {
      if (req.headers.get('sec-fetch-site') === 'cross-site')
        return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
      const item = downloads.get(ticket);
      if (!item) return Response.json({ error: 'This backup download expired or was already used. Prepare another backup.' }, { status: 404 });
      downloads.delete(ticket);
      clearTimeout(item.timeout);
      return backupResponse(item.file);
    }
    if (!url.pathname.startsWith('/api/')) {
      // Vite builds both applications; this server's root is the new workspace.
      if (!url.pathname.startsWith('/assets/')) url.pathname = '/workspace.html';
      return (
        (await staticHandler(
          new Request(url.toString(), {
            method: req.method,
            headers: req.headers,
          }),
        )) ?? new Response(null, { status: 405 })
      );
    }
    const presented = bearerToken(req);
    if (!presented || !tokensMatch(presented, token))
      return Response.json(
        {
          error: 'Open the workspace link printed in your terminal to reconnect.',
        },
        { status: 401 },
      );
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[1] !== 'workspace')
      return Response.json({ error: 'Unknown workspace route.' }, { status: 404 });
    const [, , collection, id, operation] = parts;
    if (req.method === 'GET') {
      if (collection === 'drafts' && parts.length === 3)
        return Response.json(url.searchParams.has('key') ? store.drafts.get(url.searchParams.get('key')!) : store.drafts.list());
      if (collection === 'upkeep' && parts.length === 3)
        return Response.json(store.upkeep.status(UpkeepQuery.parse(Object.fromEntries(url.searchParams))));
      if (collection === 'entity-registry' && parts.length === 3) return Response.json(store.getEntityRegistry());
      if (collection === 'practice-drafting' && parts.length === 3)
        return Response.json(options.connectionStatus?.() ?? options.connection?.status() ?? { ready: false, config: null, label: 'Not connected' });
      if (collection === 'working-preferences' && parts.length === 3) return Response.json(store.getWorkingPreferences());
      if (collection === 'imports' && parts.length === 3) return Response.json(store.imports.list());
      if (collection === 'imports' && id && parts.length === 4) return Response.json(store.imports.get(Id.parse(id), ImportQuery.parse(Object.fromEntries(url.searchParams))));
      if (collection === 'imports' && id && operation === 'links' && parts.length === 5)
        return Response.json(store.imports.links(Id.parse(id), ImportLinkQuery.parse(Object.fromEntries(url.searchParams))));
      if (collection === 'imports' && id && operation === 'organization' && parts.length === 5) {
        const query = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0), attention: z.enum(['true','false']).default('false') }).strict().parse(Object.fromEntries(url.searchParams));
        return Response.json(store.imports.organization.get(Id.parse(id), query.offset, query.attention === 'true'));
      }
      if (collection === 'imports' && id && operation === 'upload-plan' && parts.length === 5) return Response.json(store.imports.uploadPlan(Id.parse(id)));
      if (collection === 'imports' && id && operation === 'selection' && parts.length === 5)
        return Response.json(store.imports.selectEntries(Id.parse(id), ImportSelection.parse(Object.fromEntries(url.searchParams))));
      if (collection === 'imports' && id && operation === 'duplicates' && parts.length === 5)
        return Response.json(store.imports.duplicates(Id.parse(id)));
      if (collection === 'imports' && id && operation === 'undo' && parts.length === 5)
        return Response.json(store.imports.undoPreview(Id.parse(id)));
      if (collection === 'imports' && id && operation === 'files' && parts.length === 6)
        return Response.json(store.imports.inspect(Id.parse(id), Id.parse(parts[5])));
      if (collection === 'templates' && parts.length === 3)
        return Response.json(store.templates.list());
      if (collection === 'templates' && id && parts.length === 4)
        return Response.json(store.templates.get(Id.parse(id)));
      if (collection === 'templates' && id && operation === 'history' && parts.length === 5)
        return Response.json(store.templates.history(Id.parse(id)));
      if (collection === 'matters' && id && operation === 'brief' && parts.length === 5)
        return Response.json(store.matterBrief(Id.parse(id)));
      if (collection === 'work' && id && operation === 'reference-changes' && parts.length === 5) {
        store.getWork(Id.parse(id));
        return Response.json(store.referenceChanges(id));
      }
      if (collection === 'work' && id && operation === 'reference-impact' && parts.length === 5) {
        store.getWork(Id.parse(id));
        return Response.json(store.referenceImpact(id));
      }
      if (collection === 'knowledge-revisions' && id && operation === 'reference-impact' && parts.length === 5) {
        store.getKnowledgeRevision(Id.parse(id));
        return Response.json(store.knowledgeImpact(id));
      }
      if (collection === 'knowledge' && id && operation === 'history' && parts.length === 5)
        return Response.json(store.knowledgeHistory(Id.parse(id)));
      if (collection === 'sources' && id && operation === 'history' && parts.length === 5)
        return Response.json(store.sourceHistory(Id.parse(id)));
      if (collection === 'work' && id && operation === 'source-changes' && parts.length === 5) {
        store.getWork(Id.parse(id));
        return Response.json(store.sourceChanges(id));
      }
      if (collection === 'work' && id && operation === 'exports' && parts.length === 5)
        return Response.json(store.exports.list(Id.parse(id)));
      if (collection === 'exports' && id && operation === 'clean-proposal' && parts.length === 5)
        return Response.json(store.exports.cleanProposal(Id.parse(id)));
      if (collection === 'exports' && id && operation === 'download' && parts.length === 5) {
        const { record, bytes } = store.exports.download(Id.parse(id));
        return new Response(new Uint8Array(bytes), {
          headers: {
            'content-type': WORD_MEDIA_TYPE,
            'x-content-type-options': 'nosniff',
            'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.name).replace(/'/g, '%27')}`,
          },
        });
      }
      if (
        collection === 'source-revisions' &&
        id &&
        operation === 'original' &&
        parts.length === 5
      ) {
        if (!store.sourceRevisionAvailable(id)) throw new HttpError(409, 'This document is in Trash or unavailable. Restore it before downloading.');
        const original = store.originalFile(Id.parse(id));
        return new Response(new Uint8Array(original.bytes), {
          headers: {
            'content-type': 'application/octet-stream',
            'x-content-type-options': 'nosniff',
            'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(original.name).replace(/'/g, '%27')}`,
          },
        });
      }
      if (collection === 'profile' && parts.length === 3) return Response.json(store.getProfile());
      if (collection === 'auto-filing' && parts.length === 3) return Response.json(store.autoFiling.status(AutoFilingQuery.parse(Object.fromEntries(url.searchParams))));
      if (!collection && parts.length === 2)
        return Response.json({
          ...store.catalog(),
          interfaceVersion: 29,
          practiceReviewCount: store.practiceLibrary({ status: 'review' }).total,
          templates: store.templates.list(),
          clients: store.clients.list(),
          demo,
          desktop: !!options.desktop,
          setup: workspaceSetup(store, demo),
          databasePath: store.databasePath,
          profile: store.getProfile(),
          workingPreferences: store.getWorkingPreferences(),
          hasPreferenceDraft: !!store.drafts.get('working-preferences').value,
          entityRegistry: store.getEntityRegistry(),
          connection: options.connectionStatus?.() ??
            options.connection?.status() ?? {
              config: null,
              ready: false,
              label: 'Not connected',
              storage: 'none',
              codexInstalled: false,
              claudeInstalled: false,
              qualification: 'not-live-qualified',
            },
        });
      if (collection === 'conversations' && parts.length === 3)
        return Response.json(store.conversations.list(undefined, undefined, ConversationState.parse(url.searchParams.get('state') ?? 'active')));
      if (collection === 'navigation' && parts.length === 3) return Response.json(store.navigation.snapshot());
      if (collection === 'conversations' && id && operation === 'impact' && parts.length === 5)
        return Response.json(store.conversations.impact(id));
      if (collection === 'sources' && id && operation === 'matters' && parts.length === 5)
        return Response.json(store.sourceMatters(id));
      if (collection === 'sources' && id && operation === 'links' && parts.length === 5)
        return Response.json(store.sourceLinks(id, SourceLinkQuery.parse(Object.fromEntries(url.searchParams))));
      if ((collection === 'sources' || collection === 'work') && id && operation === 'impact' && parts.length === 5)
        return Response.json(store.recordImpact(collection === 'sources' ? 'source' : 'work', id));
      if (collection === 'trash' && parts.length === 3) return Response.json(store.recordTrash(RecordTrashQuery.parse({ kind: url.searchParams.get('kind'), query: url.searchParams.get('q') ?? '', page: Number(url.searchParams.get('page') ?? 0) })));
      if (collection === 'guides' && parts.length === 3) {
        const catalog = guideCatalog();
        return Response.json(catalog.map(guide => readPracticeGuide(guide.id, catalog)));
      }
      if (collection === 'source-library' && parts.length === 3) return Response.json(store.sourceLibrary(LibraryQuery.parse({
        collection: url.searchParams.get('collection'), query: url.searchParams.get('q') ?? '', page: Number(url.searchParams.get('page') ?? 0),
      })));
      if (collection === 'practice-library' && parts.length === 3) return Response.json(store.practiceLibrary(PracticeLibraryQuery.parse({
        query: url.searchParams.get('q') ?? '', page: Number(url.searchParams.get('page') ?? 0),
        category: url.searchParams.get('category') ?? 'all', status: url.searchParams.get('status') ?? 'all',
      })));
      if (collection === 'knowledge' && id && operation === 'originals' && parts.length === 5) return Response.json(store.practiceOriginals(id));
      if (collection === 'clients' && parts.length === 3) return Response.json(store.clients.list());
      if (collection === 'clients' && id && parts.length === 4) return Response.json({ client: store.clients.get(id), matters: store.clients.matters(id),
        conversations: store.conversations.list(undefined, id) });
      if (collection === 'matters' && id && operation === 'client' && parts.length === 5) return Response.json(store.clients.link(id));
      if (collection === 'matters' && id === 'picker' && parts.length === 4)
        return Response.json(store.matterOptions(url.searchParams.get('q') ?? ''));
      if (collection === 'conversations' && id && parts.length === 4)
        return Response.json({
          conversation: store.conversations.get(id),
          turns: store.conversations.turns(id),
          unavailableAttachments: [...new Set(store.conversations.turns(id).flatMap(turn => turn.attachments))].filter(id => !store.sourceRevisionAvailable(id)),
          modelPreference: store.conversations.modelPreference(id),
        });
      if (collection === 'search' && parts.length === 3) {
        const kind = z
          .enum(['source', 'knowledge', 'work'])
          .optional()
          .parse(url.searchParams.get('kind') ?? undefined);
        const query = url.searchParams.get('q') ?? '';
        if ((query.match(/[\p{L}\p{N}_]+/gu) ?? []).length > 64)
          throw new HttpError(400, 'Search with 64 words or fewer.');
        return Response.json(
          store.search({
            query,
            matterId: url.searchParams.get('matter') ?? undefined,
            includeHistory: url.searchParams.get('history') === 'true',
            ...(kind ? { kinds: [kind] } : {}),
            limit: 100,
          }),
        );
      }
      if (collection === 'matters' && id && operation === 'context' && parts.length === 5) {
        Id.parse(id);
        return Response.json({
          matter: store.getMatter(id),
          brief: store.matterBrief(id),
          conversations: store.conversations.list(id),
          ...store.catalog(500, id),
        });
      }
      if (id && parts.length === 4) {
        Id.parse(id);
        if (collection === 'matters') return Response.json(store.getMatter(id));
        if (collection === 'sources') return Response.json(store.getSource(id));
        if (collection === 'knowledge') return Response.json(store.getKnowledge(id));
        if (collection === 'work') return Response.json(store.getWork(id, true));
        if (collection === 'source-revisions') return Response.json(store.getSourceRevision(id));
        if (collection === 'knowledge-revisions')
          return Response.json(store.getKnowledgeRevision(id));
      }
    }
    if (req.method === 'POST') {
      if (collection === 'auto-filing' && parts.length === 4) {
        if (id === 'review') return Response.json(store.autoFiling.review(AutoFilingReview.parse(await body(req))));
        if (!options.chat) throw new WorkspaceConflictError('Connect AI before enabling background filing. Manual filing remains available.');
        if (id === 'enable') return Response.json(options.chat.enableAutoFiling(AutoFilingEnable.parse(await body(req))));
        if (id === 'control') return Response.json(options.chat.controlAutoFiling(AutoFilingControl.parse(await body(req))));
      }
      if (collection === 'upkeep' && id === 'check' && parts.length === 4) {
        z.object({}).strict().parse(await body(req));
        store.upkeep.request('manual');
        store.upkeep.start();
        return Response.json({ queued: true });
      }
      if (collection === 'upkeep' && id === 'decision' && parts.length === 4)
        return Response.json(store.upkeep.decide(UpkeepDecision.parse(await body(req))));
      if (collection === 'navigation' && parts.length === 3) return Response.json(store.navigation.change(await body(req)));
      if (collection === 'drafts' && parts.length === 3) return Response.json(store.drafts.save(await body(req)));
      if (collection === 'setup' && parts.length === 3) {
        SetupAction.parse(await body(req));
        store.setSetting('workspace-onboarding', { dismissedAt: new Date().toISOString() });
        return Response.json(workspaceSetup(store, demo));
      }
      if (collection === 'entity-registry' && parts.length === 3) return Response.json(store.saveEntityRegistry(await body(req)));
      if (collection === 'entity-registry' && id === 'check' && parts.length === 4) {
        const registry = store.getEntityRegistry();
        // The authenticated manual checker is local and does not enable model access.
        return Response.json(checkSignatory(registry ? { ...registry, availableToChats: true } : null, SignatoryCheckInput.parse(await body(req))));
      }
      if (collection === 'brief-drafting' && parts.length === 3) {
        if (!options.chat) throw new HttpError(503, 'AI is not connected. You can still complete and save the form manually.');
        return Response.json(await options.chat.draftBrief(BriefDraftInput.parse(await body(req)), req.signal));
      }
      if (collection === 'practice-drafting' && parts.length === 3) {
        if (!options.chat) throw new HttpError(503, 'AI is not connected. You can still complete and save the form manually.');
        return Response.json(await options.chat.draftPractice(PracticeDraftInput.parse(await body(req)), req.signal));
      }
      if (collection === 'working-preferences' && parts.length === 3)
        return Response.json(store.saveWorkingPreferences(await body(req)));
      if (collection === 'turns' && id && operation === 'preference-review' && parts.length === 5)
        return Response.json(store.reviewPreferenceProposal(Id.parse(id), await body(req)));
      if (collection === 'sources' && id && operation === 'placement' && parts.length === 5)
        return Response.json(store.placeSource(id, PlacementInput.parse(await body(req))));
      if (collection === 'clients' && id && parts.length === 4) return Response.json(store.clients.update(id, ClientUpdate.parse(await body(req))));
      if (collection === 'matters' && id && operation === 'client' && parts.length === 5)
        return Response.json(store.clients.assign(id, ClientAssignment.parse(await body(req))));
      if (collection === 'turns' && id && operation === 'brief-review' && parts.length === 5)
        return Response.json(
          store.reviewBriefProposal(Id.parse(id), BriefReview.parse(await body(req))),
        );
      if (collection === 'turns' && id && operation === 'brief-undo' && parts.length === 5)
        return Response.json(store.undoBriefUpdate(Id.parse(id), BriefUndo.parse(await body(req)).proposalId));
      if (collection === 'knowledge' && id && operation === 'revisions' && parts.length === 5)
        return Response.json(
          store.proposeKnowledgeUpdate(Id.parse(id), KnowledgeUpdate.parse(await body(req))),
        );
      if (collection === 'sources' && id && operation === 'files' && parts.length === 5)
        return Response.json(
          await store.updateSourceFile(Id.parse(id), SourceFileUpdate.parse(await body(req))),
        );
      if (collection === 'source-organization' && parts.length === 4) {
        if (id === 'preview') return Response.json(store.previewSourceOrganization(SourceOrganizationSelection.parse(await body(req))));
        if (id === 'apply') return Response.json(store.organizeSources(SourceOrganizationApply.parse(await body(req))));
        if (id === 'suggest') {
          if (!options.chat) throw new WorkspaceConflictError('AI organization is not connected. Organize the files manually.');
          return Response.json(await options.chat.organizeSources(SourceOrganizationSuggest.parse(await body(req)), req.signal));
        }
      }
      if (collection === 'sources' && id && operation === 'revisions' && parts.length === 5)
        return Response.json(
          store.updateSourceText(Id.parse(id), SourceTextUpdate.parse(await body(req))),
        );
      if (collection === 'backups' && (parts.length === 3 || (id === 'prepare' && parts.length === 4))) {
        z.object({})
          .strict()
          .parse(await body(req));
        const file = await createWorkspaceBackupFile(store.databasePath);
        if (!id) return backupResponse(file); // Existing authenticated clients can stream directly.
        const ticket = randomBytes(32).toString('hex');
        const timeout = setTimeout(() => { downloads.delete(ticket); file.dispose(); }, 300_000);
        timeout.unref();
        downloads.set(ticket, { file, timeout });
        return Response.json({ name: file.name, byteCount: file.byteCount, downloadUrl: `/api/workspace/backups/${ticket}/download` });
      }
      if (collection === 'backups' && id === 'verify' && parts.length === 4)
        return Response.json(await inspectWorkspaceBackup(backupBody(req)));
      if (collection === 'imports' && id && operation === 'files' && parts.length === 6) {
        const input = z.object({ base64: FileInput.shape.base64 }).strict().parse(await body(req));
        return Response.json(store.imports.receive(Id.parse(id), Id.parse(parts[5]), input.base64), { status: 202 });
      }
      if (collection === 'imports' && id && operation === 'queue' && parts.length === 5) {
        store.imports.control(Id.parse(id), ImportQueueAction.parse(await body(req)));
        return Response.json(store.imports.get(id, {}));
      }
      if (collection === 'imports' && id && operation === 'choices' && parts.length === 6) {
        store.imports.edit(Id.parse(id), Id.parse(parts[5]), ImportEdit.parse(await body(req)));
        return Response.json(store.imports.get(id, {}));
      }
      if (collection === 'imports' && id && operation === 'bulk' && parts.length === 5)
        return Response.json(store.imports.bulkEdit(Id.parse(id), ImportBulkEdit.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'links' && parts.length === 5)
        return Response.json(store.imports.applyLinks(Id.parse(id), ImportLinkApply.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'duplicates' && parts.length === 5)
        return Response.json(store.imports.skipDuplicates(Id.parse(id), DuplicateSkip.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'undo' && parts.length === 5)
        return Response.json(store.imports.undo(Id.parse(id), ImportUndo.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'choices' && parts.length === 5)
        return Response.json(store.imports.editChoices(Id.parse(id), ImportChoiceEdits.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'organize' && parts.length === 5) {
        if (!options.chat) throw new WorkspaceConflictError('Connect an AI provider before requesting suggestions.');
        return Response.json(await options.chat.organizeImport(Id.parse(id), ImportOrganizeInput.parse(await body(req)), req.signal));
      }
      if (collection === 'imports' && id && operation === 'organization' && parts.length === 5) {
        if (!options.chat) throw new WorkspaceConflictError('AI organization is unavailable. Manual import is still available.');
        return Response.json(options.chat.startImportOrganization(Id.parse(id), OrganizationJobStart.parse(await body(req))), { status: 202 });
      }
      if (collection === 'imports' && id && operation === 'organization-control' && parts.length === 5) {
        if (!options.chat) throw new WorkspaceConflictError('AI organization is unavailable.');
        return Response.json(options.chat.controlImportOrganization(Id.parse(id), OrganizationJobControl.parse(await body(req))));
      }
      if (collection === 'imports' && id && operation === 'organization-apply' && parts.length === 5)
        return Response.json(store.imports.organization.apply(Id.parse(id), OrganizationJobApply.parse(await body(req))));
      if (collection === 'imports' && id && operation === 'commit' && parts.length === 5) {
        store.imports.commit(Id.parse(id), ImportCommit.parse(await body(req)));
        return Response.json(store.imports.get(id, {}));
      }
      if (collection === 'imports' && id && operation === 'discard' && parts.length === 5) {
        const input = z.object({ expectedRevisionId: Id }).strict().parse(await body(req));
        store.imports.discard(Id.parse(id), input.expectedRevisionId);
        return Response.json(store.imports.get(id, {}));
      }
      if (collection === 'work' && id && operation === 'exports' && parts.length === 5) {
        z.object({})
          .strict()
          .parse(await body(req));
        return Response.json(await store.exports.create(Id.parse(id)));
      }
      if (collection === 'exports' && id && operation === 'clean-proposal' && parts.length === 5)
        return Response.json(await store.exports.createCleanProposal(Id.parse(id), await body(req), req.signal));
      if (collection === 'sources' && id && operation === 'refresh' && parts.length === 5) {
        const input = z.object({ expectedRevisionId: Id }).strict().parse(await body(req));
        const source = store.getSource(Id.parse(id)), publication = source.latest.provenance.publication;
        if (source.lifecycle === 'trashed' || source.latest.id !== input.expectedRevisionId || !publication)
          throw new WorkspaceConflictError('Open the current, active publisher source before refreshing.');
        const receipt = publication.publisher === 'uscode' ? await lookupStatute(store, { title: publication.title, section: publication.section }, req.signal) : await lookupAuthority(store, { title: publication.title, section: publication.section,
          ...(publication.requestedDate ? { asOf: publication.requestedDate } : {}) }, req.signal);
        return Response.json({ source: store.getSource(receipt.sourceId), receipt });
      }
      if (collection === 'conversations' && id && operation === 'organize' && parts.length === 5)
        return Response.json(
          store.organizeConversation(
            Id.parse(id),
            OrganizeConversationInput.parse(await body(req)),
          ),
        );
      if (collection === 'conversations' && id && operation === 'manage' && parts.length === 5)
        return Response.json(store.conversations.change(id, ConversationChange.parse(await body(req))));
      if (collection === 'sources' && id && operation === 'links' && parts.length === 5)
        return Response.json(store.applySourceLinks(id, SourceLinkApply.parse(await body(req))));
      if (collection === 'sources' && id && operation === 'matters' && parts.length === 5)
        return Response.json(store.changeSourceMatter(id, SourceMatterChange.parse(await body(req))));
      if ((collection === 'sources' || collection === 'work') && id && operation === 'manage' && parts.length === 5)
        return Response.json(store.changeRecord(collection === 'sources' ? 'source' : 'work', id, RecordChange.parse(await body(req))));
      if (collection === 'conversations' && id && operation === 'model' && parts.length === 5) {
        const input = ModelPreferenceInput.parse(await body(req));
        const config = (options.connectionStatus?.() ?? options.connection?.status())?.config;
        if (input.choice && (!config || !sameConnection(config, input.choice)))
          throw new HttpError(409, 'The AI connection or billing method changed. Review the model choice before saving.');
        return Response.json(store.conversations.saveModelPreference(Id.parse(id), input));
      }
      if (collection === 'connection' && id === 'models' && parts.length === 4) {
        const input = z.object({ kind: ConnectionKind }).strict().parse(await body(req));
        if (!options.connection)
          return Response.json({ kind: input.kind, models: [], source: 'unavailable', note: 'This synthetic workspace has no live model catalog. You can enter a test model ID.' });
        return Response.json(await options.connection.models(input.kind));
      }
      if (collection === 'matters' && id && operation === 'brief' && parts.length === 5)
        return Response.json(
          store.saveMatterBrief(Id.parse(id), MatterBriefInput.parse(await body(req))),
        );
      if (collection === 'work' && id && operation === 'output' && parts.length === 5)
        return Response.json(store.saveOutput(Id.parse(id), OutputInput.parse(await body(req))));
      if (collection === 'templates' && id && operation === 'revisions' && parts.length === 5)
        return Response.json(store.templates.update(Id.parse(id), TemplateUpdate.parse(await body(req))));
      if (collection === 'connection' && id === 'check-claude' && parts.length === 4) {
        z.object({})
          .strict()
          .parse(await body(req));
        if (!options.connection)
          throw new HttpError(503, 'Connection checks are unavailable in this test workspace.');
        return Response.json(await options.connection.checkClaudeSignIn());
      }
      if (parts.length === 3) {
        const input = await body(req);
        if (collection === 'clients') return Response.json(store.clients.create(ClientCreate.parse(input)), { status: 201 });
        if (collection === 'imports') {
          const created = store.imports.create(ImportCreate.parse(input));
          return Response.json(store.imports.get(created.id, {}), { status: 201 });
        }
        if (collection === 'templates')
          return Response.json(store.templates.create(TemplateCreate.parse(input)), { status: 201 });
        if (collection === 'profile')
          return Response.json(store.saveProfile(ProfileInput.parse(input)));
        if (collection === 'conversations')
          return Response.json(store.conversations.create(ConversationInput.parse(input)), {
            status: 201,
          });
        if (collection === 'connection') {
          if (!options.connection)
            throw new HttpError(503, 'Connection setup is unavailable in this test workspace.');
          return Response.json(options.connection.configure(ConnectionInput.parse(input)));
        }
        if (collection === 'files') {
          return Response.json(await store.importDocument(FileInput.parse(input)), { status: 201 });
        }
        if (collection === 'matters')
          return Response.json(store.createMatter(MatterInput.parse(input)), {
            status: 201,
          });
        if (collection === 'sources')
          return Response.json(store.createSource(SourceInput.parse(input)), {
            status: 201,
          });
        if (collection === 'work') {
          const { disposition, expectedProfileRevisionId, ...work } = WorkRequest.parse(input);
          return Response.json(
            store.recordWork({
              ...work,
              ...(disposition === 'decision'
                ? { decisionBy: store.profileActor(expectedProfileRevisionId!) }
                : {}),
            }),
            {
              status: 201,
            },
          );
        }
        if (collection === 'knowledge') {
          const parsed = KnowledgeInput.parse(input);
          if (parsed.ownership !== 'user' || parsed.revision.status !== 'pending')
            throw new HttpError(400, 'New knowledge must be user-owned and awaiting review.');
          if (!parsed.revision.body.trim())
            throw new HttpError(400, 'Write the proposed knowledge before saving it.');
          return Response.json(store.createKnowledge(parsed), { status: 201 });
        }
      }
      if (collection === 'conversations' && id && parts.length === 5) {
        if (!options.chat)
          throw new HttpError(503, 'AI is not connected. Open Settings to choose a connection.');
        if (operation === 'send')
          return Response.json(options.chat.start(Id.parse(id), SendInput.parse(await body(req))), {
            status: 202,
          });
        if (operation === 'stop') {
          const input = z
            .object({ turnId: Id })
            .strict()
            .parse(await body(req));
          return Response.json(options.chat.cancel(Id.parse(id), input.turnId));
        }
      }
      if (collection === 'knowledge' && id && operation === 'review' && parts.length === 5) {
        const input = Review.parse(await body(req));
        return Response.json(
          store.reviewKnowledge(
            Id.parse(id),
            input.expectedRevisionId,
            input.action,
            store.profileActor(input.expectedProfileRevisionId),
          ),
        );
      }
      if (collection === 'work' && id && operation === 'assign' && parts.length === 5) {
        const input = z
          .object({ matterId: Id })
          .strict()
          .parse(await body(req));
        return Response.json(store.assignWork(Id.parse(id), input.matterId));
      }
    }
    return Response.json({ error: 'Unknown workspace route.' }, { status: 404 });
  }
  return async (req) => {
    let response: Response;
    try {
      response = await route(req);
    } catch (error) {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : error instanceof WorkspaceNotFoundError
              ? 404
              : error instanceof WorkspaceConflictError
                ? 409
                : 500;
      const message =
        error instanceof z.ZodError
          ? `Check ${error.issues[0]?.path.join('.') || 'the record'}: ${error.issues[0]?.message}`
          : status === 500
            ? 'The workspace could not complete this action. Your unsaved text is still here; try again.'
            : (error as Error).message;
      response = Response.json({ error: message }, { status });
    }
    const headers = new Headers(response.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'no-referrer');
    headers.set(
      'content-security-policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (new URL(req.url).pathname.startsWith('/api/')) headers.set('cache-control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  };
}
