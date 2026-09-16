import { createHash, randomUUID } from 'node:crypto';
import { sourceOrganizationPreview, applySourceOrganization, type SourceOrganizationSelection, type SourceOrganizationApply } from './source-organization';
import { Publication } from './authority-types';
import { publisherKey, publisherHash, type PublisherSnapshot } from './authorities';
import type { WebSnapshot } from './web-sources';
import { publicUrl, WEB_MAX_BYTES } from './public-web';
import { practiceSources, PracticeSourceQuery } from './practice-intake';
import { extractImage } from './images';
import { isImageName } from './image-types';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { openWorkspaceDatabase } from './database';
import { ConversationStore } from './conversations';
import { sourceMatters, changeSourceMatter, SourceMatterChange } from './source-matters';
import { recordImpact, changeRecord, recordTrash, recordState, requireActiveRecord, type ManagedRecord, RecordChange, RecordTrashQuery } from './record-lifecycle';
import { VISIBLE_WORK, TRASHED_WORK } from './conversation-lifecycle';
import { findMatterOptions } from './matter-picker';
import { WorkspaceExports, exportSnapshot } from './exports';
import { WorkingPreferences, WorkingPreferenceFields, WorkingPreferenceInput, preferenceSnapshot } from './working-preferences';
import { PreferenceProposal, PreferenceReview, InstructionFields } from './preference-proposals';
import { KnowledgeUpdate, type KnowledgeHistory } from './knowledge-updates';
import { briefReviewRequested, BriefProposal, BriefReview } from './brief-proposals';
import type { Turn } from './conversations';
import {
  SourceFileUpdate,
  SourceTextUpdate,
  type SourceHistory,
  type SourceChange,
  type ReferenceChange,
} from './source-updates';
import { ProfileInput, WorkspaceProfile } from './profile';
import { PracticeDocument, PracticeDocumentView, PracticeDocumentInput, PracticeDocumentProposal, PracticeDocumentReview, legacyPracticeContent } from './practice-document';
import {
  OutputInput,
  MatterBriefInput,
  OrganizeConversationInput,
  type MatterBrief,
  type WorkOutput,
} from './organization';
import {
  FileInput,
  fileBytes,
  extractText,
  extractDocument,
  Extraction,
  ExtractedFile,
} from './files';
import { workspaceCatalog, type WorkspaceCatalog } from './catalog';
import {
  all,
  KNOWLEDGE_REVISION,
  latestKnowledge,
  one,
  required,
  sourceMatterIds,
  sourceRevision,
  SOURCE_REVISION,
  WORK,
  type SourceRevisionRow,
  type WorkRow,
} from './queries';
import { searchWorkspace, type SearchBoundary } from './search';
import { listWorkspaceRecords, RecordListInput } from './record-discovery';
import { rankContextRecords } from './context-ranking';
import { contextLibrary } from './context-library';
import { EntityRegistry, EntityRegistryInput, registryFields } from './entities';
import { importWorkspaceSeed } from './seed';
import type { PluginSnapshot } from './plugin-import';
import { WorkspaceTemplates } from './templates';
import { practiceLibrary, practiceOriginals, practiceDisplayTitle, type PracticeLibraryQuery } from './practice-library';
import { AdoptStandards, canAdoptStandard, importedStandards } from './practice-adoption';
import { WorkspaceImports } from './imports';
import { WorkspaceClients } from './clients';
import { WorkspaceNavigation } from './navigation';
import { WorkspaceDrafts } from './drafts';
import { WorkspaceUpkeep } from './upkeep';
import { AutoFiling } from './auto-filing';
import { sourceLinks, applySourceLinks, type SourceLinkQuery, type SourceLinkApply } from './source-links';
import { referenceImpact, affectedWorkQuery } from './reference-impact';
import { placeSource, sourcePlacement, sourceLibrary, type PlacementInput, type LibraryQuery } from './source-library';
import {
  KnowledgeInput,
  KnowledgeRevisionInput,
  MatterInput,
  SourceInput,
  SourceRevisionInput,
  WorkInput,
  WorkspaceConflictError,
  type Evidence,
  type EvidenceTarget,
  type Knowledge,
  type KnowledgeRevision,
  type Matter,
  type SearchInput,
  type SearchResult,
  type SeedReceipt,
  type Source,
  type SourceRevision,
  type Work,
} from './types';

export function textHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
const Id = z.string().uuid();

interface EvidenceRow {
  id: string;
  sourceRevisionId: string | null;
  knowledgeRevisionId: string | null;
  priorWorkId: string | null;
  quote: string;
  start: number;
  end: number;
  locator: string | null;
}

/** Synchronous, local application service. All compound mutations use one
 * SQLite transaction; no model, network, host-session, or legacy-vault effects.
 * The caller must explicitly select a database file (or :memory: in tests). */
export class WorkspaceStore {
  private readonly db: Database;
  private readonly clock: () => Date;
  readonly databasePath: string;
  readonly conversations: ConversationStore;
  readonly exports: WorkspaceExports;
  readonly templates: WorkspaceTemplates;
  readonly imports: WorkspaceImports;
  readonly clients: WorkspaceClients;
  readonly navigation: WorkspaceNavigation;
  readonly drafts: WorkspaceDrafts;
  readonly upkeep: WorkspaceUpkeep;
  readonly autoFiling: AutoFiling;

  constructor(options: { databasePath: string; clock?: () => Date }) {
    if (options.databasePath.trim() === '')
      throw new Error('an explicit workspace database path is required');
    this.databasePath = options.databasePath;
    this.clock = options.clock ?? (() => new Date());
    this.db = openWorkspaceDatabase(this.databasePath);
    this.navigation = new WorkspaceNavigation(this.db, () => this.now());
    this.drafts = new WorkspaceDrafts(this.db, () => this.now());
    this.clients = new WorkspaceClients(this.db, () => this.now());
    this.templates = new WorkspaceTemplates(this.db, () => this.now());
    this.imports = new WorkspaceImports(this.db, this, () => this.now());
    this.conversations = new ConversationStore(this.db, () => this.now());
    this.upkeep = new WorkspaceUpkeep(this.db, this, () => this.now());
    this.autoFiling = new AutoFiling(this.db, this, () => this.now());
    this.exports = new WorkspaceExports(
      this.db,
      (id) =>
        this.read(() => {
          const work = this.getWork(id);
          const turn = work.origin ? this.conversations.turn(work.origin.turnId) : null;
          if (turn && turn.status !== 'complete')
            throw new WorkspaceConflictError('Only completed answers can be exported.');
          const coverage = new Map<string, string>();
          for (const evidence of work.evidence) {
            const target = this.resolveTarget(evidence.target);
            if (target.body?.slice(evidence.start, evidence.end) !== evidence.quote)
              throw new WorkspaceConflictError('A saved excerpt failed its integrity check.');
            if (evidence.target.kind === 'source') {
              const source = this.getSourceRevision(evidence.target.revisionId);
              if (source.textStatus !== 'ready')
                coverage.set(
                  source.id,
                  `${source.title}: extraction is incomplete; the excerpt does not cover missing content.`,
                );
            }
          }
          return { ...exportSnapshot(work, turn?.state.citations ?? [], coverage),
            ...(turn?.state.workingPreferences ? { wordPreferences: turn.state.workingPreferences.word } : {}) };
        }),
      () => this.now(),
      (revisionId) => {
        requireActiveRecord(this.db, 'source', this.getSourceRevision(revisionId).sourceId);
        return this.originalFile(revisionId);
      },
    );
  }

  private now(): string {
    return this.clock().toISOString();
  }

  /** Trusted import service only; no model-facing prepared-content API. */
  retainPreparedImport(value: { name: string; title: string; bytes: Buffer; extracted: ExtractedFile;
    matterId: string | null; origin: string }, newFiles: Set<string>): Source {
    return this.retainDocument({ name: value.name, base64: '', matterId: value.matterId }, value.bytes,
      ExtractedFile.parse(value.extracted), undefined, { title: value.title, origin: value.origin, newFiles });
  }
  discardUnregisteredImportFiles(paths: Set<string>): void {
    const directory = join(dirname(this.databasePath), `${basename(this.databasePath)}.originals`);
    for (const path of paths) {
      if (dirname(path) !== directory || !/^[a-f0-9]{64}$/.test(basename(path))) throw new Error('Invalid import cleanup target.');
      if (!this.db.query('SELECT 1 FROM source_originals WHERE hash = ?').get(basename(path)) && existsSync(path)) unlinkSync(path);
    }
  }
  private write<T>(fn: () => T): T {
    return this.db.transaction(fn).immediate();
  }
  private read<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  setting(key: string): unknown {
    const row = this.db
      .query('SELECT value_json AS value FROM workspace_settings WHERE key = ?')
      .get(key) as { value: string } | null;
    return row ? JSON.parse(row.value) : null;
  }
  setSetting(key: string, value: unknown): void {
    this.db.run(
      'INSERT INTO workspace_settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json',
      [key, JSON.stringify(value)],
    );
  }

  getProfile(): WorkspaceProfile | null {
    const document = this.savedPracticeDocument();
    if (document) return document.identityName ? WorkspaceProfile.parse({ name: document.identityName, applyToChats: document.useInChats,
      id: document.revisionId, revisionId: document.revisionId, version: document.version, updatedAt: document.updatedAt }) : null;
    const value = this.setting('practice-profile');
    return value === null ? null : WorkspaceProfile.parse(value);
  }
  getWorkingPreferences(): WorkingPreferences | null {
    const document = this.savedPracticeDocument();
    if (document) return WorkingPreferences.parse({ authorMode: 'custom', customAuthor: document.word.author,
      filenamePattern: document.word.filenamePattern, redlineLabel: document.word.redlineLabel, draftLabel: document.word.draftLabel,
      revisionId: document.revisionId, version: document.version, updatedAt: document.updatedAt });
    const value = this.setting('working-preferences');
    return value === null ? null : WorkingPreferences.parse(value);
  }
  getEntityRegistry(): EntityRegistry | null {
    const document = this.savedPracticeDocument();
    if (document) return EntityRegistry.parse({ ...document.entities, availableToChats: document.useInChats && document.entities.availableToChats,
      revisionId: document.revisionId, version: document.version, updatedAt: document.updatedAt });
    const value = this.setting('entity-registry');
    return value === null ? null : EntityRegistry.parse(value);
  }
  saveEntityRegistry(raw: unknown): EntityRegistry {
    if (this.savedPracticeDocument()) throw new WorkspaceConflictError('Your practice is now one document. Ask Counsel OS to update the recorded entity details from that document.');
    const { expectedRevisionId, ...fields } = EntityRegistryInput.parse(raw);
    return this.write(() => {
      const previous = this.getEntityRegistry();
      if (previous && JSON.stringify(registryFields(previous)) === JSON.stringify(fields)) return previous;
      if ((previous?.revisionId ?? null) !== expectedRevisionId)
        throw new WorkspaceConflictError('Your entity directory changed in another window. Reload before saving; your draft is unchanged.');
      const value = EntityRegistry.parse({ ...fields, revisionId: randomUUID(), version: (previous?.version ?? 0) + 1, updatedAt: this.now() });
      this.setSetting('entity-registry', value);
      return value;
    });
  }
  saveWorkingPreferences(raw: unknown): WorkingPreferences {
    if (this.savedPracticeDocument()) throw new WorkspaceConflictError('Your practice is now one document. Edit Your practice or ask Counsel OS to update it in chat.');
    const { expectedRevisionId, ...fields } = WorkingPreferenceInput.parse(raw);
    return this.write(() => {
      const previous = this.getWorkingPreferences();
      if ((previous?.revisionId ?? null) !== expectedRevisionId)
        throw new WorkspaceConflictError('Working preferences changed in another window. Reload them before saving.');
      // An older open client knows only the document fields. Omission must not
      // erase newer instruction fields; an explicit empty string still clears them.
      for (const key of ['writingInstructions', 'signingInstructions'] as const)
        if (!Object.prototype.hasOwnProperty.call(raw, key)) fields[key] = previous?.[key] ?? '';
      for (const key of ['redlineLabel', 'draftLabel'] as const)
        if (!Object.prototype.hasOwnProperty.call(raw, key) && previous) fields[key] = previous[key];
      if (fields.authorMode === 'profile' && !this.getProfile())
        throw new WorkspaceConflictError('Set your profile name first, or choose a custom Word author.');
      const value = { ...fields, revisionId: randomUUID(), version: (previous?.version ?? 0) + 1, updatedAt: this.now() };
      this.setSetting('working-preferences', value);
      return value;
    });
  }
  workingPreferenceSnapshot() {
    return preferenceSnapshot(this.getWorkingPreferences(), this.getProfile());
  }
  practiceInstructionContext() {
    const document = this.savedPracticeDocument();
    return document?.useInChats ? { revisionId: document.revisionId, body: document.body } : null;
  }
  savedPracticeDocument(): PracticeDocument | null {
    const value = this.setting('practice-document');
    return value === null ? null : PracticeDocument.parse(value);
  }
  practiceDocument(): PracticeDocumentView {
    const saved = this.savedPracticeDocument();
    const legacy = saved ? null : { profile: this.getProfile(), preferences: this.getWorkingPreferences(), entities: this.getEntityRegistry() };
    const content = saved ?? legacyPracticeContent(legacy!.profile, legacy!.preferences, legacy!.entities);
    return PracticeDocumentView.parse({ body: content.body, useInChats: content.useInChats, identityName: content.identityName, word: content.word, entities: content.entities,
      // Includes all legacy revisions: a newer form/import edit must not be overwritten.
      basis: textHash(JSON.stringify(saved ?? legacy)), saved });
  }
  practiceSources(raw: z.input<typeof PracticeSourceQuery>) { return practiceSources(this.db, raw); }
  savePracticeDocument(raw: unknown): PracticeDocumentView {
    const input = PracticeDocumentInput.parse(raw);
    return this.write(() => {
      const current = this.practiceDocument();
      if (input.expectedBasis !== current.basis) throw new WorkspaceConflictError('Your practice changed in another window. Your draft is still here; review the latest text before saving.');
      this.setSetting('practice-document', PracticeDocument.parse({ body: input.body, useInChats: input.useInChats,
        identityName: current.identityName, word: current.word, entities: current.entities,
        revisionId: randomUUID(), version: (current.saved?.version ?? 0) + 1, updatedAt: this.now() }));
      return this.practiceDocument();
    });
  }
  confirmPracticeIdentity(raw: unknown): PracticeDocumentView {
    const input = z.object({ name: z.string().trim().min(1).max(200).refine(value => !/[\r\n\x00-\x1f]/.test(value)), expectedBasis: z.string() }).strict().parse(raw);
    return this.write(() => {
      const current = this.practiceDocument();
      if (input.expectedBasis !== current.basis) throw new WorkspaceConflictError('Your practice changed. Review your current name before confirming.');
      if (current.identityName && current.identityName !== input.name) throw new WorkspaceConflictError('To change an existing identity, update the practice document in chat so the text and attribution stay consistent.');
      if (current.identityName === input.name) return current;
      this.setSetting('practice-document', PracticeDocument.parse({ body: `${current.body}${current.body ? '\n\n' : ''}My name is ${input.name}.`,
        useInChats: current.useInChats, identityName: input.name, word: current.word, entities: current.entities,
        revisionId: randomUUID(), version: (current.saved?.version ?? 0) + 1, updatedAt: this.now() }));
      return this.practiceDocument();
    });
  }
  reviewPracticeDocument(turnId: string, raw: unknown): Turn {
    const input = PracticeDocumentReview.parse(raw);
    return this.write(() => {
      const turn = this.conversations.turn(Id.parse(turnId));
      if (turn.status !== 'complete' || !turn.state.practiceDocumentProposal) throw new WorkspaceConflictError('Only a completed response can offer a practice update.');
      const proposal = PracticeDocumentProposal.parse(turn.state.practiceDocumentProposal);
      if (proposal.id !== input.proposalId || !turn.request.includes(proposal.requestQuote)
        || JSON.stringify(proposal.before) !== JSON.stringify(turn.state.practiceDocument)) throw new WorkspaceConflictError('This suggestion does not match its original practice context.');
      const outcome = input.action === 'apply' ? 'applied' : input.action === 'undo' ? 'undone' : 'dismissed';
      if (proposal.review === outcome) return turn;
      if (input.action === 'undo' ? proposal.review !== 'applied' : proposal.review !== 'pending') throw new WorkspaceConflictError('This practice suggestion has already been reviewed.');
      if (input.action !== 'dismiss') {
        const current = this.practiceDocument();
        if (current.basis !== (input.action === 'apply' ? proposal.before.basis : proposal.appliedBasis)) throw new WorkspaceConflictError('Your practice changed after this suggestion. This action cannot overwrite the newer version.');
        const content = input.action === 'undo' ? proposal.before : {
          body: proposal.body, useInChats: input.useInChats ?? current.useInChats,
          identityName: proposal.identityName === undefined ? current.identityName : proposal.identityName,
          word: proposal.word ?? current.word, entities: proposal.entities ?? current.entities,
        };
        this.setSetting('practice-document', PracticeDocument.parse({ body: content.body, useInChats: content.useInChats,
          identityName: content.identityName, word: content.word, entities: content.entities,
          revisionId: randomUUID(), version: (current.saved?.version ?? 0) + 1, updatedAt: this.now() }));
        if (input.action === 'apply') proposal.appliedBasis = this.practiceDocument().basis;
        else proposal.undoBasis = this.practiceDocument().basis;
      }
      proposal.review = outcome;
      this.db.run("UPDATE conversation_turns SET state_json=json_set(state_json,'$.practiceDocumentProposal',json(?)) WHERE id=?", [JSON.stringify(proposal), turn.id]);
      return this.conversations.turn(turn.id);
    });
  }
  /** Explicit human review only. Tool calls can stage, never apply, these changes. */
  reviewPreferenceProposal(turnId: string, raw: unknown): Turn {
    const input = PreferenceReview.parse(raw);
    return this.write(() => {
      const turn = this.conversations.turn(Id.parse(turnId));
      if (turn.status !== 'complete' || !turn.state.preferenceProposal)
        throw new WorkspaceConflictError('Only a completed response can offer a preference update.');
      const proposal = PreferenceProposal.parse(turn.state.preferenceProposal);
      const snapshot = turn.state.workingPreferences;
      const before = InstructionFields.parse({ writingInstructions: snapshot?.writingInstructions ?? '', signingInstructions: snapshot?.signingInstructions ?? '', generalReview: snapshot?.generalReview ?? '', ndaReview: snapshot?.ndaReview ?? '' });
      if (input.proposalId !== proposal.id || proposal.basedOnRevisionId !== (snapshot?.revisionId ?? null)
        || JSON.stringify(before) !== JSON.stringify(proposal.before) || !turn.request.includes(proposal.requestQuote))
        throw new WorkspaceConflictError('This suggestion does not match its original preference context.');
      const outcome = input.action === 'apply' ? 'applied' : input.action === 'undo' ? 'undone' : 'dismissed';
      if (proposal.review === outcome) return turn;
      if (input.action === 'undo' ? proposal.review !== 'applied' : proposal.review !== 'pending')
        throw new WorkspaceConflictError('This preference suggestion has already been reviewed.');
      if (input.action !== 'dismiss') {
        const current = this.getWorkingPreferences();
        const expected = input.action === 'undo' ? proposal.appliedRevisionId : proposal.basedOnRevisionId;
        if ((current?.revisionId ?? null) !== expected)
          throw new WorkspaceConflictError('Working preferences changed after this suggestion. Review the current preferences; this action cannot overwrite them.');
        const fields = WorkingPreferenceFields.strip().parse(current ?? {});
        const changes = input.action === 'apply' ? proposal.changes : Object.fromEntries(Object.keys(proposal.changes).map(key => [key, proposal.before[key as keyof typeof before]]));
        const saved = this.saveWorkingPreferences({ ...fields, ...changes, expectedRevisionId: expected });
        if (input.action === 'apply') proposal.appliedRevisionId = saved.revisionId;
        else { proposal.undoRevisionId = saved.revisionId; proposal.undoneAt = this.now(); }
      }
      proposal.review = outcome;
      if (input.action !== 'undo') proposal.reviewedAt = this.now();
      // Same transaction as the setting: failure rolls both back. Never rewrite answer/context.
      this.db.run("UPDATE conversation_turns SET state_json=json_set(state_json,'$.preferenceProposal',json(?)) WHERE id=?", [JSON.stringify(PreferenceProposal.parse(proposal)), turn.id]);
      return this.conversations.turn(turn.id);
    });
  }
  saveProfile(raw: z.input<typeof ProfileInput>): WorkspaceProfile {
    if (this.savedPracticeDocument()) throw new WorkspaceConflictError('Your practice is now one document. Edit Your practice or ask Counsel OS to update your identity in chat.');
    const { expectedRevisionId, ...fields } = ProfileInput.parse(raw);
    return this.write(() => {
      const previous = this.getProfile();
      if ((previous?.revisionId ?? null) !== expectedRevisionId)
        throw new WorkspaceConflictError(
          'Your profile changed in another window. Reload the saved profile before editing again.',
        );
      const profile: WorkspaceProfile = {
        ...fields,
        id: previous?.id ?? randomUUID(),
        revisionId: randomUUID(),
        version: (previous?.version ?? 0) + 1,
        updatedAt: this.now(),
      };
      this.setSetting('practice-profile', profile);
      return profile;
    });
  }
  /** Browser actions pin the displayed identity. Never accept an actor name
   * supplied by the browser/model, or silently use a renamed profile. */
  profileActor(expectedRevisionId: string): string {
    const profile = this.getProfile();
    if (!profile)
      throw new WorkspaceConflictError(
        'Set up your profile in Settings before recording a decision.',
      );
    if (profile.revisionId !== Id.parse(expectedRevisionId))
      throw new WorkspaceConflictError(
        'Your profile changed. Refresh the workspace and review this action again.',
      );
    return profile.name;
  }

  importTextFile(raw: { name: string; base64: string; matterId?: string | null }): Source {
    if (!/\.(txt|md)$/i.test(raw.name))
      throw new WorkspaceConflictError('Choose a UTF-8 .txt or .md file.');
    const { input, bytes } = fileBytes(raw);
    return this.retainDocument(input, bytes, extractText(bytes, input.name));
  }

  async importDocument(raw: z.input<typeof FileInput>): Promise<Source> {
    const { input, bytes } = fileBytes(raw);
    if (input.matterId) this.getMatter(input.matterId);
    const extension = input.name.split('.').at(-1)!.toLowerCase();
    const extracted =
      extension === 'pdf' || extension === 'docx'
        ? await extractDocument(bytes, extension)
        : isImageName(input.name) ? extractImage(bytes, input.name) : extractText(bytes, input.name);
    return this.retainDocument(input, bytes, extracted);
  }

  /** Called only with a validated publisher response. Citations, not source
   * titles or placement, identify the series; historical dates are separate. */
  retainPublisherSnapshot(snapshot: PublisherSnapshot): { source: Source; reused: boolean } {
    const publication = Publication.parse(snapshot.publication);
    const extracted = ExtractedFile.parse(snapshot.extracted);
    const parser = publication.publisher === 'ecfr' ? 'counsel-ecfr-v1' : 'counsel-uscode-v1';
    if (extracted.extraction.parser !== parser || snapshot.bytes.length > 2_000_000)
      throw new WorkspaceConflictError('Invalid publisher snapshot.');
    return this.write(() => {
      const candidates = all<{ id: string }>(this.db, `SELECT s.id FROM sources s
        JOIN source_revisions r ON r.source_id = s.id AND r.revision_no = (SELECT max(revision_no) FROM source_revisions WHERE source_id = s.id)
        JOIN source_extractions e ON e.revision_id = r.id
        WHERE s.kind = 'authority' AND json_extract(e.details_json, '$.parser') = ?
        AND json_extract(r.provenance_json, '$.publication.publisher') = ?
        AND json_extract(r.provenance_json, '$.publication.title') = ?
        AND json_extract(r.provenance_json, '$.publication.section') = ?
        AND json_extract(r.provenance_json, '$.publication.requestedDate') IS ? LIMIT 2`,
        parser, publication.publisher, publication.title, publication.section, publication.requestedDate);
      if (candidates.length > 1) throw new WorkspaceConflictError('This publisher citation has duplicate source series. Organize those records before refreshing it.');
      const current = candidates[0] ? this.getSource(candidates[0].id) : null;
      if (current) {
        requireActiveRecord(this.db, 'source', current.id);
        if (publisherKey(current.latest.provenance.publication!) !== publisherKey(publication))
          throw new WorkspaceConflictError('Publisher identity changed.');
        const previous = current.latest.provenance.publication!;
        if (previous.versionDate > publication.versionDate || (previous.publisher === 'uscode' && publication.publisher === 'uscode' && previous.lawsInEffectOn > publication.lawsInEffectOn))
          throw new WorkspaceConflictError('The publisher response is older than the saved latest version. Nothing was replaced.');
        // House view pages contain volatile JSF state outside the statute.
        // Reuse only when extracted content, coverage AND publication metadata
        // are identical; retain the original exact page from the first check.
        const unchanged = publication.publisher === 'uscode'
          ? current.latest.body === extracted.body && current.latest.textStatus === extracted.textStatus && JSON.stringify(previous) === JSON.stringify(publication)
          : current.latest.provenance.originalHash === publisherHash(snapshot.bytes) && previous.versionDate === publication.versionDate;
        if (unchanged) {
          this.originalFile(current.latest.id);
          return { source: current, reused: true };
        }
      }
      const source = this.retainDocument({ name: snapshot.name, base64: '' }, snapshot.bytes, extracted,
        current ? { sourceId: current.id, expectedRevisionId: current.latest.id } : undefined,
        { title: snapshot.title, origin: publication.url, newFiles: new Set() },
        { publication, retrievedAt: snapshot.retrievedAt });
      return { source, reused: false };
    });
  }

  /** A fetched public page is an external reference, not verified law or a
   * Practice instruction. Re-fetching retains old originals and citation IDs. */
  retainWebSnapshot(snapshot: WebSnapshot): { source: Source; reused: boolean } {
    const url = publicUrl(snapshot.url).href, extracted = ExtractedFile.parse(snapshot.extracted);
    if (!['counsel-web-html-v1', 'counsel-web-pdf-v1', 'counsel-web-text-v1'].includes(extracted.extraction.parser)
      || !snapshot.bytes.length || snapshot.bytes.length > WEB_MAX_BYTES)
      throw new WorkspaceConflictError('Invalid public webpage snapshot.');
    return this.write(() => {
      const candidates = all<{ id: string }>(this.db, `SELECT s.id FROM sources s
        JOIN source_revisions r ON r.source_id=s.id AND r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=s.id)
        JOIN source_extractions e ON e.revision_id=r.id
        WHERE s.kind='reference' AND r.provenance_json IS NOT NULL
        AND json_extract(r.provenance_json,'$.origin')=?
        AND json_extract(e.details_json,'$.parser') IN ('counsel-web-html-v1','counsel-web-pdf-v1','counsel-web-text-v1') LIMIT 2`, url);
      if (candidates.length > 1) throw new WorkspaceConflictError('This URL has duplicate saved source series. Organize those records before fetching again.');
      const current = candidates[0] ? this.getSource(candidates[0].id) : null;
      if (current) {
        requireActiveRecord(this.db, 'source', current.id);
        if (current.latest.provenance.originalHash === publisherHash(snapshot.bytes)
          && current.latest.body === extracted.body && current.latest.textStatus === extracted.textStatus) {
          this.originalFile(current.latest.id);
          return { source: current, reused: true };
        }
      }
      const source = this.retainDocument({ name: snapshot.name, base64: '' }, snapshot.bytes, extracted,
        current ? { sourceId: current.id, expectedRevisionId: current.latest.id } : undefined,
        { title: snapshot.title, origin: url, newFiles: new Set() }, undefined,
        { retrievedAt: snapshot.retrievedAt, mediaType: snapshot.mediaType });
      return { source, reused: false };
    });
  }

  private retainDocument(
    input: z.infer<typeof FileInput>,
    bytes: Buffer,
    extracted: ExtractedFile,
    update?: { sourceId: string; expectedRevisionId: string },
    imported?: { title: string; origin: string; newFiles: Set<string> },
    published?: { publication: Publication; retrievedAt: string },
    web?: { retrievedAt: string; mediaType: string },
  ): Source {
    if (this.databasePath === ':memory:')
      throw new Error('File import needs an on-disk workspace.');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const directory = join(dirname(this.databasePath), `${basename(this.databasePath)}.originals`);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink())
      throw new Error('Originals directory must be a real directory.');
    const path = join(directory, hash);
    const existed = existsSync(path);
    if (existed) {
      if (
        !lstatSync(path).isFile() ||
        lstatSync(path).isSymbolicLink() ||
        !readFileSync(path).equals(bytes)
      )
        throw new Error('Original file integrity check failed.');
    } else {
      writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
      imported?.newFiles.add(path);
    }
    try {
      return this.write(() => {
        const revisionInput = {
          title: imported?.title ?? input.name,
          body: extracted.body,
          textStatus: extracted.textStatus,
          provenance: {
            origin: imported?.origin ?? `upload:${input.name}`,
            mediaType: published ? published.publication.publisher === 'ecfr' ? 'application/xml' : 'text/html' : extracted.mediaType,
            originalHash: hash,
            ...(published ? { ...published, author: published.publication.publisher === 'ecfr' ? 'Office of the Federal Register / Government Publishing Office' : 'U.S. House Office of the Law Revision Counsel' } : {}),
            ...(web ?? {}),
          },
        };
        let source: Source;
        if (update) {
          const current = this.getSource(update.sourceId);
          if (current.latest.id !== update.expectedRevisionId)
            throw new WorkspaceConflictError(
              'This source changed in another window. Open the current version before updating it.',
            );
          this.reviseSource(current.id, update.expectedRevisionId, revisionInput);
          source = this.getSource(current.id);
        } else {
          source = this.createSource({
            kind: published ? 'authority' : web ? 'reference' : 'document',
            ...(published || web ? { collection: 'external' as const } : {}),
            matterIds: input.matterId ? [input.matterId] : [],
            revision: revisionInput,
          });
        }
        this.db.run('INSERT INTO source_originals VALUES (?, ?, ?, ?)', [
          source.latest.id,
          input.name,
          hash,
          bytes.length,
        ]);
        this.db.run('INSERT INTO source_extractions VALUES (?, ?)', [
          source.latest.id,
          JSON.stringify(extracted.extraction),
        ]);
        return this.getSource(source.id);
      });
    } catch (error) {
      if (!existed) unlinkSync(path);
      throw error;
    }
  }

  originalFile(revisionId: string): { name: string; bytes: Buffer } {
    this.getSourceRevision(revisionId);
    const original = required(
      one<{ name: string; hash: string; byteCount: number }>(
        this.db,
        'SELECT name, hash, byte_count AS byteCount FROM source_originals WHERE revision_id = ?',
        revisionId,
      ),
      'original file',
    );
    if (!/^[a-f0-9]{64}$/.test(original.hash))
      throw new WorkspaceConflictError('Original file identity is invalid.');
    const directory = join(dirname(this.databasePath), `${basename(this.databasePath)}.originals`);
    const path = join(directory, original.hash);
    if (
      !existsSync(path) ||
      lstatSync(directory).isSymbolicLink() ||
      !lstatSync(path).isFile() ||
      lstatSync(path).isSymbolicLink()
    )
      throw new WorkspaceConflictError(
        'The original file is missing or has changed. Restore it from a workspace backup.',
      );
    const bytes = readFileSync(path);
    if (
      bytes.length !== original.byteCount ||
      createHash('sha256').update(bytes).digest('hex') !== original.hash
    )
      throw new WorkspaceConflictError(
        'The original file failed its integrity check. Restore it from a workspace backup.',
      );
    return { name: original.name, bytes };
  }

  catalog(limit = 500, matterId?: string): WorkspaceCatalog {
    z.number().int().min(1).max(2_000).parse(limit);
    return this.read(() => {
      if (matterId !== undefined) this.getMatter(matterId);
      const catalog = workspaceCatalog(this.db, limit, matterId);
      const originals = new Map(contextLibrary(this.db).records.filter(r => r.practiceItemId).map(r => [r.practiceItemId!, { sourceId: r.recordId, revisionId: r.id }]));
      for (const item of catalog.knowledge) {
        const original = originals.get(item.id);
        if (original) item.importedOriginal = original;
      }
      return catalog;
    });
  }

  /** Explicit local-human review. A new immutable revision records the
   * outcome; the cited proposal and any prior approved version survive. */
  reviewKnowledge(
    id: string,
    expectedRevisionId: string,
    action: 'approve' | 'reject',
    actor: string,
  ): Knowledge {
    z.enum(['approve', 'reject']).parse(action);
    const reviewer = z.string().trim().min(1).max(1_000).parse(actor);
    return this.write(() => {
      const item = this.getKnowledge(id);
      if (item.latest.id !== expectedRevisionId)
        throw new WorkspaceConflictError('This knowledge has changed. Reopen it before reviewing.');
      if (item.latest.status !== 'pending')
        throw new WorkspaceConflictError('This version has already been reviewed.');
      this.reviseKnowledge(id, expectedRevisionId, {
        title: item.latest.title,
        body: item.latest.body,
        status: action === 'approve' ? 'approved' : 'rejected',
        supportingEvidence: this.knowledgeEvidence(item.latest.id),
        ...(action === 'approve' ? { approvedBy: reviewer } : {}),
      });
      this.recordWork({
        title: `${action === 'approve' ? 'Approved' : 'Rejected'}: ${item.latest.title}`.slice(
          0,
          300,
        ),
        request: 'Review proposed practice knowledge.',
        answer: `${action === 'approve' ? 'Approved' : 'Rejected'} this proposed knowledge version.`,
        matterId: item.matterId,
        decisionBy: reviewer,
        evidence:
          item.latest.body.length === 0
            ? []
            : [
                {
                  target: { kind: 'knowledge', revisionId: item.latest.id },
                  quote: item.latest.body.slice(0, 1_000),
                  start: 0,
                },
              ],
      });
      return this.getKnowledge(id);
    });
  }

  createMatter(raw: MatterInput): Matter {
    const input = MatterInput.parse(raw);
    const matter: Matter = {
      id: randomUUID(),
      ...input,
      kind: input.kind ?? null,
      createdAt: this.now(),
    };
    this.db.run(
      'INSERT INTO matters (id, title, kind, summary, created_at) VALUES (?, ?, ?, ?, ?)',
      [matter.id, matter.title, matter.kind, matter.summary, matter.createdAt],
    );
    return matter;
  }

  getMatter(id: string): Matter {
    return required(
      one<Matter>(
        this.db,
        'SELECT id, title, kind, summary, created_at AS createdAt FROM matters WHERE id = ?',
        Id.parse(id),
      ),
      `matter: ${id}`,
    );
  }

  reviewBriefProposal(turnId: string, raw: z.input<typeof BriefReview>): Turn {
    const input = BriefReview.parse(raw);
    return this.write(() => {
      const turn = this.conversations.turn(Id.parse(turnId));
      if (turn.status !== 'complete' || !turn.state.briefProposal)
        throw new WorkspaceConflictError('Only a completed response can offer a matter update.');
      const proposal = BriefProposal.parse(turn.state.briefProposal);
      if (
        proposal.id !== input.proposalId ||
        turn.state.scopeContext?.matterId !== proposal.matterId ||
        turn.state.matterContext?.id !== proposal.matterId
      )
        throw new WorkspaceConflictError(
          'This proposal does not match the original matter context.',
        );
      const outcome = input.action === 'apply' ? 'applied' : 'dismissed';
      if (proposal.review === outcome) return turn;
      if (proposal.review !== 'pending')
        throw new WorkspaceConflictError('This matter suggestion has already been reviewed.');
      if (input.action === 'apply') {
        const brief = this.saveMatterBrief(proposal.matterId, {
          expectedRevisionId: proposal.basedOnRevisionId,
          summary: proposal.summary,
          questions: proposal.questions,
          nextActions: proposal.nextActions,
          status: proposal.status,
        });
        proposal.appliedRevisionId = brief.id;
      }
      proposal.review = outcome;
      proposal.reviewedAt = this.now();
      this.conversations.recordBriefReview(turn.id, proposal);
      return this.conversations.turn(turn.id);
    });
  }

  /** Called only inside successful chat finalization. Notes and the response commit together. */
  prepareCompletedBrief(turn: Turn, raw: BriefProposal): BriefProposal {
    const proposal = BriefProposal.parse(raw);
    // Repeat the guard at commit, independent of the tool's/model's flag.
    if (briefReviewRequested(turn.request)) proposal.needsReview = true;
    const context = turn.state.matterContext;
    if (!context || context.id !== proposal.matterId || turn.state.scopeContext?.matterId !== proposal.matterId)
      throw new WorkspaceConflictError('The matter update does not match this response.');
    const current = this.matterBrief(proposal.matterId);
    const deferredReason = (current?.id ?? null) !== proposal.basedOnRevisionId
      ? 'concurrent-change' : proposal.status !== (context.status ?? 'open')
        ? 'status-change' : proposal.needsReview ? 'requested-review' : null;
    if (deferredReason) return { ...proposal, mode: 'review', deferredReason };
    const brief = this.saveMatterBrief(proposal.matterId, {
      expectedRevisionId: proposal.basedOnRevisionId,
      summary: proposal.summary, questions: proposal.questions,
      nextActions: proposal.nextActions, status: proposal.status,
    });
    return { ...proposal, mode: 'automatic', review: 'applied', reviewedAt: this.now(), appliedRevisionId: brief.id };
  }

  undoBriefUpdate(turnId: string, proposalId: string): Turn {
    return this.write(() => {
      const turn = this.conversations.turn(Id.parse(turnId));
      const proposal = turn.state.briefProposal && BriefProposal.parse(turn.state.briefProposal);
      if (turn.status !== 'complete' || !proposal || proposal.id !== Id.parse(proposalId)
        || proposal.mode !== 'automatic' || proposal.review !== 'applied')
        throw new WorkspaceConflictError('Only a completed automatic matter update can be undone here.');
      if (proposal.undoRevisionId) return turn;
      const before = turn.state.matterContext;
      if (!before || before.id !== proposal.matterId || before.truncated)
        throw new WorkspaceConflictError('The original matter brief is not available. Edit the current brief instead.');
      const restored = this.saveMatterBrief(proposal.matterId, {
        expectedRevisionId: proposal.appliedRevisionId,
        summary: before.summary, questions: before.questions ?? '',
        nextActions: before.nextActions ?? '', status: MatterBriefInput.shape.status.parse(before.status ?? 'open'),
      });
      this.db.run(`UPDATE conversation_turns SET state_json = json_set(state_json,
        '$.briefProposal.undoneAt', ?, '$.briefProposal.undoRevisionId', ?) WHERE id = ?`,
        [this.now(), restored.id, turn.id]);
      return this.conversations.turn(turn.id);
    });
  }

  matterBrief(id: string): MatterBrief | null {
    this.getMatter(id);
    return (
      one<MatterBrief>(
        this.db,
        `SELECT id, matter_id AS matterId, revision_no AS number,
      status, summary, questions, next_actions AS nextActions, recorded_at AS recordedAt
      FROM matter_briefs WHERE matter_id = ? ORDER BY revision_no DESC LIMIT 1`,
        id,
      ) ?? null
    );
  }

  saveMatterBrief(id: string, raw: z.input<typeof MatterBriefInput>): MatterBrief {
    const { expectedRevisionId, ...input } = MatterBriefInput.parse(raw);
    return this.write(() => {
      const previous = this.matterBrief(id);
      if ((previous?.id ?? null) !== expectedRevisionId)
        throw new WorkspaceConflictError(
          'This matter brief changed. Reopen it to review the latest version.',
        );
      this.db.run(`INSERT INTO matter_briefs VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        randomUUID(),
        id,
        (previous?.number ?? 0) + 1,
        input.status,
        input.summary,
        input.questions,
        input.nextActions,
        this.now(),
      ]);
      return this.matterBrief(id)!;
    });
  }

  organizeConversation(id: string, raw: z.input<typeof OrganizeConversationInput>) {
    const input = OrganizeConversationInput.parse(raw);
    return this.write(() => {
      const conversation = this.conversations.get(id);
      const previous = this.setting(`organized-conversation:${id}`) as { input: string } | null;
      if (previous?.input === JSON.stringify(input)) return conversation;
      if (conversation.scope !== 'conversation')
        throw new WorkspaceConflictError(
          'Only a conversation outside a matter can be organized this way.',
        );
      const turns = this.conversations.turns(id);
      if (turns.some((turn) => turn.status === 'running'))
        throw new WorkspaceConflictError(
          'Wait for the current response to finish before changing its matter.',
        );
      const matter = input.matterId
        ? this.getMatter(input.matterId)
        : this.createMatter({ title: input.title! });
      for (const turn of turns) if (turn.workId) this.assignWork(turn.workId, matter.id);
      const sources = new Set(
        turns
          .flatMap((turn) => turn.attachments)
          .map((revisionId) => this.getSourceRevision(revisionId).sourceId),
      );
      for (const sourceId of sources) if (recordState(this.db, 'source', sourceId) !== 'trashed') this.linkSource(matter.id, sourceId);
      this.db.run(
        `UPDATE conversation_turns SET state_json = json_insert(state_json, '$.scopeContext', json(?)) WHERE conversation_id = ?`,
        [JSON.stringify({ scope: conversation.scope, matterId: conversation.matterId }), id],
      );
      this.db.run(
        "UPDATE conversations SET scope = 'matter', matter_id = ?, updated_at = ? WHERE id = ?",
        [matter.id, this.now(), id],
      );
      this.setSetting(`organized-conversation:${id}`, { input: JSON.stringify(input) });
      return this.conversations.get(id);
    });
  }

  saveOutput(id: string, raw: z.input<typeof OutputInput>): Work {
    const input = OutputInput.parse(raw);
    return this.write(() => {
      const work = this.getWork(id);
      if (work.disposition === 'decision')
        throw new WorkspaceConflictError('A decision is already recorded separately.');
      if (!work.answer.trim()) throw new WorkspaceConflictError('An output needs saved content.');
      if (work.output) {
        if (work.output.title !== input.title || work.output.kind !== input.kind)
          throw new WorkspaceConflictError(
            'This answer is already saved as an output. Open the saved output.',
          );
        return work;
      }
      this.db.run('INSERT INTO work_outputs VALUES (?, ?, ?, ?)', [
        id,
        input.title,
        input.kind,
        this.now(),
      ]);
      // Preserve the original work title, body, hash and evidence. Index the output title too.
      this.db.run('UPDATE search_entries SET title = ? WHERE work_id = ?', [
        `${work.title}\n${input.title}`,
        id,
      ]);
      const saved = this.getWork(id);
      if (saved.origin) {
        const updated = this.db.run(
          `UPDATE conversation_turns SET state_json = json_set(state_json, '$.output', json(?))
          WHERE id = ? AND work_id = ? AND status = 'complete'`,
          [JSON.stringify(saved.output), saved.origin.turnId, id],
        );
        if (updated.changes !== 1)
          throw new WorkspaceConflictError('Only a completed response can be kept as an output.');
      }
      return saved;
    });
  }

  listMatters(): Matter[] {
    return all<Matter>(
      this.db,
      'SELECT id, title, kind, summary, created_at AS createdAt FROM matters ORDER BY created_at, id',
    );
  }

  matterOptions(query: string) {
    return findMatterOptions(this.db, query);
  }

  createSource(raw: SourceInput): Source {
    const input = SourceInput.parse(raw);
    return this.write(() => {
      const id = randomUUID();
      this.db.run('INSERT INTO sources (id, kind, created_at) VALUES (?, ?, ?)', [
        id,
        input.kind,
        this.now(),
      ]);
      this.insertSourceRevision(id, 1, input.revision);
      for (const matterId of new Set(input.matterIds)) this.linkSource(matterId, id);
      const origin = input.revision.provenance.origin;
      const collection = input.collection ?? (/^plugin:(practice|memory)\//.test(origin) ? 'practice' : origin.startsWith('plugin:law/') ? 'external' : undefined);
      if (collection) placeSource(this.db, id, { collection, expectedRevisionId: null });
      return this.getSource(id);
    });
  }

  sourceLibrary(raw: z.input<typeof LibraryQuery>) { return this.read(() => sourceLibrary(this.db, raw)); }
  previewSourceOrganization(raw: z.input<typeof SourceOrganizationSelection>) { return this.read(() => sourceOrganizationPreview(this.db, raw)); }
  organizeSources(raw: z.input<typeof SourceOrganizationApply>) { return this.write(() => applySourceOrganization(this.db, raw)); }
  practiceLibrary(raw: z.input<typeof PracticeLibraryQuery>) { return this.read(() => practiceLibrary(this.db, raw)); }
  importedStandards(page = 0) { return this.read(() => importedStandards(this.db, page)); }
  adoptImportedStandards(raw: z.input<typeof AdoptStandards>) {
    const input = AdoptStandards.parse(raw);
    return this.write(() => {
      const actor = this.profileActor(input.expectedProfileRevisionId);
      for (const item of input.selections) {
        if (!canAdoptStandard(this.db, item.id, item.expectedRevisionId))
          throw new WorkspaceConflictError('One or more selected items changed or are no longer eligible. Nothing was adopted. Reload and review your selection again.');
      }
      for (const item of input.selections) this.reviewKnowledge(item.id, item.expectedRevisionId, 'approve', actor);
      return { adopted: input.selections.length };
    });
  }
  practiceOriginals(id: string) { return this.read(() => { this.getKnowledge(id); return practiceOriginals(this.db, id); }); }
  placeSource(id: string, raw: z.input<typeof PlacementInput>) {
    return this.write(() => { requireActiveRecord(this.db, 'source', id); return placeSource(this.db, Id.parse(id), raw); });
  }

  linkSource(matterId: string, sourceId: string): void {
    this.write(() => {
      requireActiveRecord(this.db, 'source', sourceId);
      this.getMatter(matterId);
      required(
        one(this.db, 'SELECT id FROM sources WHERE id = ?', Id.parse(sourceId)),
        `source: ${sourceId}`,
      );
      this.db.run(
        'INSERT INTO matter_sources (matter_id, source_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [matterId, sourceId],
      );
    });
  }

  sourceMatters(sourceId: string) { return this.read(() => sourceMatters(this.db, sourceId)); }
  sourceLinks(sourceId: string, input: z.input<typeof SourceLinkQuery> = {}) { return this.read(() => sourceLinks(this.db, sourceId, input)); }
  applySourceLinks(sourceId: string, input: z.input<typeof SourceLinkApply>) { return this.write(() => applySourceLinks(this.db, sourceId, input)); }
  changeSourceMatter(sourceId: string, input: z.input<typeof SourceMatterChange>) { return this.write(() => { requireActiveRecord(this.db, 'source', sourceId); return changeSourceMatter(this.db, sourceId, input); }); }
  recordImpact(kind: ManagedRecord, id: string) { return this.read(() => recordImpact(this.db, kind, id)); }
  changeRecord(kind: ManagedRecord, id: string, input: z.input<typeof RecordChange>) { return this.write(() => changeRecord(this.db, kind, id, input, () => this.now())); }
  recordTrash(input: z.input<typeof RecordTrashQuery>) { return this.read(() => recordTrash(this.db, input)); }
  sourceRevisionAvailable(id: string): boolean {
    const source = one<{ sourceId: string }>(this.db, 'SELECT source_id AS sourceId FROM source_revisions WHERE id=?', id);
    return !!source && recordState(this.db, 'source', source.sourceId) !== 'trashed';
  }

  getSource(id: string): Source {
    return this.read(() => {
      const source = required(
        one<Omit<Source, 'matterIds' | 'latest'>>(
          this.db,
          'SELECT id, kind, created_at AS createdAt FROM sources WHERE id = ?',
          Id.parse(id),
        ),
        `source: ${id}`,
      );
      const latest = sourceRevision(
        required(
          one<SourceRevisionRow>(
            this.db,
            `${SOURCE_REVISION} WHERE source_id = ? ORDER BY revision_no DESC LIMIT 1`,
            id,
          ),
          `source revision: ${id}`,
        ),
      );
      return {
        ...source,
        lifecycle: recordState(this.db, 'source', id),
        placement: sourcePlacement(this.db, id),
        matterIds: sourceMatterIds(this.db, id),
        latest: this.getSourceRevision(latest.id),
      };
    });
  }

  getSourceRevision(id: string): SourceRevision {
    const revision = sourceRevision(
      required(
        one<SourceRevisionRow>(this.db, `${SOURCE_REVISION} WHERE id = ?`, Id.parse(id)),
        `source revision: ${id}`,
      ),
    );
    const extraction = one<{ details: string }>(
      this.db,
      'SELECT details_json AS details FROM source_extractions WHERE revision_id = ?',
      id,
    );
    const original = one<{ name: string; byteCount: number }>(
      this.db,
      'SELECT name, byte_count AS byteCount FROM source_originals WHERE revision_id = ?',
      id,
    );
    return {
      ...revision,
      ...(extraction ? { extraction: Extraction.parse(JSON.parse(extraction.details)) } : {}),
      ...(original ? { original } : {}),
    };
  }

  reviseSource(id: string, expectedRevisionId: string, raw: SourceRevisionInput): SourceRevision {
    const input = SourceRevisionInput.parse(raw);
    return this.write(() => {
      const source = this.getSource(id);
      requireActiveRecord(this.db, 'source', id);
      if (source.latest.id !== expectedRevisionId)
        throw new WorkspaceConflictError('source changed since the expected revision');
      return this.insertSourceRevision(id, source.latest.number + 1, input);
    });
  }

  async updateSourceFile(sourceId: string, raw: z.input<typeof SourceFileUpdate>): Promise<Source> {
    const { expectedRevisionId, ...file } = SourceFileUpdate.parse(raw);
    const { input, bytes } = fileBytes(file);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const check = (): Source | null =>
      this.read(() => {
        const current = this.getSource(sourceId),
          expected = this.getSourceRevision(expectedRevisionId);
        requireActiveRecord(this.db, 'source', sourceId);
        if (current.latest.provenance.publication || current.latest.extraction?.parser.startsWith('counsel-web-'))
          throw new WorkspaceConflictError('Refresh this source from its publisher. Save your own document as a separate source.');
        if (expected.sourceId !== current.id)
          throw new WorkspaceConflictError('That version belongs to a different source.');
        // Exact retries are safe, including after an interrupted HTTP response.
        const sameFile =
          current.latest.original?.name === input.name &&
          current.latest.provenance.originalHash === hash;
        if (
          sameFile &&
          (current.latest.id === expectedRevisionId ||
            current.latest.number === expected.number + 1)
        ) {
          this.originalFile(current.latest.id); // Never bless a missing/corrupt retained original.
          return current;
        }
        if (current.latest.id !== expectedRevisionId)
          throw new WorkspaceConflictError(
            'This source changed in another window. Open the current version before updating it.',
          );
        return null;
      });
    const existing = check();
    if (existing) return existing;
    const extension = input.name.toLowerCase().split('.').at(-1)!;
    const extracted =
      extension === 'pdf' || extension === 'docx'
        ? await extractDocument(bytes, extension)
        : isImageName(input.name) ? extractImage(bytes, input.name) : extractText(bytes, input.name);
    const concurrent = check();
    return (
      concurrent ?? this.retainDocument(input, bytes, extracted, { sourceId, expectedRevisionId })
    );
  }

  updateSourceText(sourceId: string, raw: z.input<typeof SourceTextUpdate>): Source {
    const input = SourceTextUpdate.parse(raw);
    return this.write(() => {
      const current = this.getSource(sourceId),
        expected = this.getSourceRevision(input.expectedRevisionId);
      if (expected.sourceId !== current.id)
        throw new WorkspaceConflictError('That version belongs to a different source.');
      if (current.kind === 'document' || current.latest.original)
        throw new WorkspaceConflictError(
          'Upload a new document version to preserve its original file and extraction.',
        );
      const revision = {
        title: input.title,
        body: input.body,
        textStatus: input.textStatus,
        provenance: {
          origin: input.origin,
          ...(input.author ? { author: input.author } : {}),
          mediaType: 'text/plain',
        },
      };
      const same =
        current.latest.title === revision.title &&
        current.latest.body === revision.body &&
        current.latest.textStatus === revision.textStatus &&
        current.latest.provenance.origin === input.origin &&
        (current.latest.provenance.author ?? '') === input.author;
      if (
        same &&
        (current.latest.id === input.expectedRevisionId ||
          current.latest.number === expected.number + 1)
      )
        return current;
      if (current.latest.id !== input.expectedRevisionId)
        throw new WorkspaceConflictError(
          'This source changed in another window. Open the current version before updating it.',
        );
      this.reviseSource(sourceId, input.expectedRevisionId, revision);
      return this.getSource(sourceId);
    });
  }

  sourceHistory(sourceId: string): SourceHistory {
    return this.read(() => {
      this.getSource(sourceId);
      const versions = all<SourceHistory['versions'][number]>(
        this.db,
        `SELECT r.id, r.revision_no AS number, r.title,
        r.text_status AS textStatus, r.received_at AS receivedAt, r.content_hash AS contentHash,
        EXISTS(SELECT 1 FROM source_originals o WHERE o.revision_id = r.id) AS hasOriginal
        FROM source_revisions r WHERE r.source_id = ? ORDER BY r.revision_no DESC LIMIT 100`,
        sourceId,
      ).map((r) => ({ ...r, hasOriginal: !!r.hasOriginal }));
      const affected = affectedWorkQuery();
      const affectedWork = all<SourceHistory['affectedWork'][number]>(
        this.db,
        `${affected} SELECT w.id, coalesce(o.title, w.title) AS title,
        w.matter_id AS matterId, w.disposition, w.recorded_at AS recordedAt FROM affected_work w
        LEFT JOIN work_outputs o ON o.work_id = w.id ORDER BY w.recorded_at DESC, w.id LIMIT 100`,
        sourceId, sourceId,
      );
      return {
        versions,
        affectedWork,
        totalVersions: one<{ n: number }>(
          this.db,
          'SELECT count(*) AS n FROM source_revisions WHERE source_id = ?',
          sourceId,
        )!.n,
        totalAffectedWork: one<{ n: number }>(
          this.db,
          `${affected} SELECT count(*) AS n FROM affected_work`,
          sourceId, sourceId,
        )!.n,
      };
    });
  }

  sourceChanges(workId: string): SourceChange[] {
    Id.parse(workId);
    return all<SourceChange>(
      this.db,
      `SELECT DISTINCT old.source_id AS sourceId, current.title,
      old.id AS citedRevisionId, old.revision_no AS citedVersion, current.id AS currentRevisionId, current.revision_no AS currentVersion
      FROM evidence e JOIN source_revisions old ON old.id = e.source_revision_id
      JOIN source_revisions current ON current.source_id = old.source_id
      AND current.revision_no = (SELECT max(revision_no) FROM source_revisions WHERE source_id = old.source_id)
      WHERE e.work_id = ? AND current.revision_no > old.revision_no ORDER BY current.title, old.revision_no`,
      workId,
    );
  }

  referenceChanges(workId: string): ReferenceChange[] {
    return this.referenceImpact(workId).changes;
  }

  referenceImpact(workId: string) {
    return this.read(() => referenceImpact(this.db, { kind: 'work', id: Id.parse(workId) }));
  }

  knowledgeImpact(revisionId: string) {
    return this.read(() => referenceImpact(this.db, { kind: 'knowledge', id: Id.parse(revisionId) }));
  }

  private insertSourceRevision(
    sourceId: string,
    number: number,
    input: z.output<typeof SourceRevisionInput>,
  ): SourceRevision {
    const id = randomUUID();
    const hash = input.body === null ? null : textHash(input.body);
    this.db.run(
      `INSERT INTO source_revisions
      (id, source_id, revision_no, title, body, text_status, content_hash, provenance_json, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sourceId,
        number,
        input.title,
        input.body,
        input.textStatus,
        hash,
        JSON.stringify(input.provenance),
        this.now(),
      ],
    );
    this.index('source', id, input.title, input.body ?? '');
    return this.getSourceRevision(id);
  }

  createKnowledge(raw: KnowledgeInput): Knowledge {
    const input = KnowledgeInput.parse(raw);
    return this.write(() => {
      if (input.matterId !== null) this.getMatter(input.matterId);
      const id = randomUUID();
      this.db.run(
        'INSERT INTO knowledge_items (id, kind, ownership, matter_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.kind, input.ownership, input.matterId, this.now()],
      );
      this.insertKnowledgeRevision(id, 1, input.revision);
      return this.getKnowledge(id);
    });
  }

  getKnowledge(id: string): Knowledge {
    return this.read(() => {
      const item = required(
        one<Omit<Knowledge, 'latest' | 'active'>>(
          this.db,
          'SELECT id, kind, ownership, matter_id AS matterId, created_at AS createdAt FROM knowledge_items WHERE id = ?',
          Id.parse(id),
        ),
        `knowledge: ${id}`,
      );
      const imported = contextLibrary(this.db).records.find(r => r.practiceItemId === id);
      const latest = required(latestKnowledge(this.db, id), `knowledge revision: ${id}`), active = latestKnowledge(this.db, id, true);
      const displayTitle = practiceDisplayTitle(this.db, id, latest.title);
      return {
        ...item,
        ...(displayTitle !== latest.title ? { displayTitle } : {}),
        ...(imported ? { importedOriginal: { sourceId: imported.recordId, revisionId: imported.id } } : {}),
        latest: this.getKnowledgeRevision(latest.id),
        active: active ? this.getKnowledgeRevision(active.id) : null,
      };
    });
  }

  getKnowledgeRevision(id: string): KnowledgeRevision {
    const revision = required(
      one<KnowledgeRevision>(this.db, `${KNOWLEDGE_REVISION} WHERE id = ?`, Id.parse(id)),
      `knowledge revision: ${id}`,
    );
    const supportingEvidence = this.knowledgeEvidence(id).map(citation => {
      const target = citation.target;
      const title = target.kind === 'work'
        ? one<{ title: string }>(this.db, "SELECT coalesce(o.title, 'Saved work') AS title FROM work_records w LEFT JOIN work_outputs o ON o.work_id=w.id WHERE w.id=?", target.workId)?.title
        : one<{ title: string }>(this.db, `SELECT title FROM ${target.kind === 'source' ? 'source_revisions' : 'knowledge_revisions'} WHERE id=?`, target.revisionId)?.title;
      return { ...citation, ...(title ? { title } : {}) };
    });
    return { ...revision, ...(supportingEvidence.length ? { supportingEvidence } : {}) };
  }

  knowledgeEvidence(revisionId: string): import('./types').EvidenceInput[] {
    return all<Omit<EvidenceRow, 'id'>>(this.db, `SELECT source_revision_id AS sourceRevisionId, knowledge_revision_id AS knowledgeRevisionId,
      prior_work_id AS priorWorkId, quote, start_offset AS start, end_offset AS end, locator
      FROM knowledge_evidence WHERE revision_id = ? ORDER BY position`, Id.parse(revisionId)).map(row => ({
        target: row.sourceRevisionId ? { kind: 'source' as const, revisionId: row.sourceRevisionId }
          : row.knowledgeRevisionId ? { kind: 'knowledge' as const, revisionId: row.knowledgeRevisionId }
          : { kind: 'work' as const, workId: row.priorWorkId! },
        quote: row.quote, start: row.start, ...(row.locator === null ? {} : { locator: row.locator }),
      }));
  }

  reviseKnowledge(
    id: string,
    expectedRevisionId: string,
    raw: KnowledgeRevisionInput,
  ): KnowledgeRevision {
    const input = KnowledgeRevisionInput.parse(raw);
    return this.write(() => {
      const item = this.getKnowledge(id);
      if (item.latest.id !== expectedRevisionId)
        throw new WorkspaceConflictError('knowledge changed since the expected revision');
      return this.insertKnowledgeRevision(id, item.latest.number + 1, input);
    });
  }

  /** Human edits always propose a new version; approval remains a separate action. */
  proposeKnowledgeUpdate(id: string, raw: z.input<typeof KnowledgeUpdate>): Knowledge {
    const input = KnowledgeUpdate.parse(raw);
    return this.write(() => {
      const item = this.getKnowledge(id),
        expected = this.getKnowledgeRevision(input.expectedRevisionId);
      if (expected.knowledgeId !== item.id)
        throw new WorkspaceConflictError('That version belongs to a different knowledge item.');
      if (item.ownership !== 'user')
        throw new WorkspaceConflictError(
          'Maintained knowledge cannot be overwritten. Save a separate practice-owned item to customize it.',
        );
      const same =
        item.latest.status === 'pending' &&
        item.latest.title === input.title &&
        item.latest.body === input.body &&
        (input.supportingEvidence === undefined || JSON.stringify(this.knowledgeEvidence(item.latest.id)) === JSON.stringify(input.supportingEvidence));
      if (
        same &&
        (item.latest.id === input.expectedRevisionId || item.latest.number === expected.number + 1)
      )
        return item;
      if (item.latest.id !== input.expectedRevisionId)
        throw new WorkspaceConflictError(
          'This knowledge changed in another window. Reopen the latest version before editing.',
        );
      this.reviseKnowledge(id, input.expectedRevisionId, {
        title: input.title,
        body: input.body,
        status: 'pending',
        supportingEvidence: input.supportingEvidence ?? this.knowledgeEvidence(input.expectedRevisionId),
      });
      return this.getKnowledge(id);
    });
  }

  knowledgeHistory(id: string): KnowledgeHistory {
    return this.read(() => {
      this.getKnowledge(id);
      return {
        versions: all<KnowledgeHistory['versions'][number]>(
          this.db,
          `SELECT id, knowledge_id AS knowledgeId, revision_no AS number,
          title, content_hash AS contentHash, status, approved_by AS approvedBy, approved_at AS approvedAt, received_at AS receivedAt
          FROM knowledge_revisions WHERE knowledge_id = ? ORDER BY revision_no DESC LIMIT 100`,
          id,
        ),
        totalVersions: one<{ n: number }>(
          this.db,
          'SELECT count(*) AS n FROM knowledge_revisions WHERE knowledge_id = ?',
          id,
        )!.n,
      };
    });
  }

  private insertKnowledgeRevision(
    knowledgeId: string,
    number: number,
    input: z.output<typeof KnowledgeRevisionInput>,
  ): KnowledgeRevision {
    const id = randomUUID();
    const now = this.now();
    this.db.run(
      `INSERT INTO knowledge_revisions
      (id, knowledge_id, revision_no, title, body, content_hash, status, approved_by, approved_at, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        knowledgeId,
        number,
        input.title,
        input.body,
        textHash(input.body),
        input.status,
        input.approvedBy ?? null,
        input.status === 'approved' ? now : null,
        now,
      ],
    );
    for (const [position, citation] of (input.supportingEvidence ?? []).entries()) {
      const target = this.resolveTarget(citation.target), end = citation.start + citation.quote.length;
      if (target.body === null || target.body.slice(citation.start, end) !== citation.quote)
        throw new Error('supporting evidence quote does not match the referenced revision at its offset');
      this.db.run(`INSERT INTO knowledge_evidence
        (revision_id, position, source_revision_id, knowledge_revision_id, prior_work_id, quote, start_offset, end_offset, locator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, position,
        citation.target.kind === 'source' ? citation.target.revisionId : null,
        citation.target.kind === 'knowledge' ? citation.target.revisionId : null,
        citation.target.kind === 'work' ? citation.target.workId : null,
        citation.quote, citation.start, end, citation.locator ?? null]);
    }
    this.index('knowledge', id, input.title, input.body);
    return this.getKnowledgeRevision(id);
  }

  recordWork(raw: WorkInput): Work {
    const input = WorkInput.parse(raw);
    return this.write(() => {
      if (input.matterId !== null) this.getMatter(input.matterId);
      const id = randomUUID();
      this.db.run(
        `INSERT INTO work_records
        (id, matter_id, title, request, answer, disposition, decision_by, recorded_at, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.matterId,
          input.title,
          input.request,
          input.answer,
          input.decisionBy === undefined ? 'draft' : 'decision',
          input.decisionBy ?? null,
          this.now(),
          textHash(input.answer),
        ],
      );
      for (const [position, citation] of input.evidence.entries()) {
        const target = this.resolveTarget(citation.target);
        const end = citation.start + citation.quote.length;
        if (target.body === null || target.body.slice(citation.start, end) !== citation.quote) {
          throw new Error('citation quote does not match the referenced revision at its offset');
        }
        this.db.run(
          `INSERT INTO evidence
          (id, work_id, position, source_revision_id, knowledge_revision_id, prior_work_id, quote, start_offset, end_offset, locator)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            id,
            position,
            citation.target.kind === 'source' ? citation.target.revisionId : null,
            citation.target.kind === 'knowledge' ? citation.target.revisionId : null,
            citation.target.kind === 'work' ? citation.target.workId : null,
            citation.quote,
            citation.start,
            end,
            citation.locator ?? null,
          ],
        );
      }
      this.index('work', id, input.title, `${input.request}\n${input.answer}`);
      return this.getWork(id);
    });
  }

  /** Associates previously unassigned work. Reassignment is a separate future
   * operation so a stale UI cannot silently move a matter's work elsewhere. */
  assignWork(id: string, matterId: string): Work {
    return this.write(() => {
      const work = this.getWork(id);
      this.getMatter(matterId);
      if (work.matterId !== null && work.matterId !== matterId)
        throw new WorkspaceConflictError('work is already assigned to another matter');
      this.db.run('UPDATE work_records SET matter_id = ? WHERE id = ?', [matterId, id]);
      return this.getWork(id);
    });
  }

  getWork(id: string, forManagement = false): Work {
    return this.read(() => {
      const work = required(
        one<WorkRow>(this.db, `${WORK} WHERE id = ? AND id IN (SELECT w.id FROM work_records w WHERE ${VISIBLE_WORK}${forManagement ? " OR EXISTS (SELECT 1 FROM work_lifecycle wl WHERE wl.work_id=w.id AND wl.state='trashed')" : ''})`, Id.parse(id)),
        `work: ${id}`,
      );
      const rows = all<EvidenceRow>(
        this.db,
        `SELECT id, source_revision_id AS sourceRevisionId,
        knowledge_revision_id AS knowledgeRevisionId, prior_work_id AS priorWorkId,
        quote, start_offset AS start, end_offset AS end, locator FROM evidence WHERE work_id = ? ORDER BY position`,
        id,
      );
      const evidence: Evidence[] = rows.map((row) => {
        const target: EvidenceTarget =
          row.sourceRevisionId !== null
            ? { kind: 'source', revisionId: row.sourceRevisionId }
            : row.knowledgeRevisionId !== null
              ? { kind: 'knowledge', revisionId: row.knowledgeRevisionId }
              : { kind: 'work', workId: row.priorWorkId! };
        const resolved = this.resolveTarget(target);
        if (resolved.contentHash === null) throw new Error('citation target has no text hash');
        return {
          id: row.id,
          target,
          quote: row.quote,
          start: row.start,
          end: row.end,
          ...(row.locator === null ? {} : { locator: row.locator }),
          title: resolved.title,
          contentHash: resolved.contentHash,
          provenance: resolved.provenance,
        };
      });
      const output =
        one<WorkOutput>(
          this.db,
          'SELECT title, kind, created_at AS createdAt FROM work_outputs WHERE work_id = ?',
          id,
        ) ?? null;
      const origin =
        one<{ conversationId: string; turnId: string }>(
          this.db,
          'SELECT conversation_id AS conversationId, id AS turnId FROM conversation_turns WHERE work_id = ?',
          id,
        ) ?? null;
      const trashed = !!one(this.db, `SELECT w.id FROM work_records w WHERE w.id=? AND ${TRASHED_WORK}`, id);
      return { ...work, lifecycle: recordState(this.db, 'work', id), ...(trashed ? { request: '', title: output?.title ?? 'Saved work' } : {}), evidence, output, origin: trashed ? null : origin };
    });
  }

  listWork(matterId?: string): Work[] {
    return this.read(() => {
      if (matterId !== undefined) this.getMatter(matterId);
      const rows =
        matterId === undefined
          ? all<{ id: string }>(this.db, `SELECT w.id FROM work_records w WHERE ${VISIBLE_WORK} ORDER BY recorded_at, id`)
          : all<{ id: string }>(
              this.db,
              `SELECT w.id FROM work_records w WHERE matter_id = ? AND ${VISIBLE_WORK} ORDER BY recorded_at, id`,
              matterId,
            );
      return rows.map((row) => this.getWork(row.id));
    });
  }

  private resolveTarget(target: EvidenceTarget): {
    title: string;
    body: string | null;
    contentHash: string | null;
    provenance: SourceRevision['provenance'] | null;
  } {
    if (target.kind === 'source') return this.getSourceRevision(target.revisionId);
    if (target.kind === 'knowledge')
      return {
        ...this.getKnowledgeRevision(target.revisionId),
        provenance: null,
      };
    const work = required(
      one<WorkRow>(this.db, `${WORK} WHERE id = ?`, Id.parse(target.workId)),
      `work: ${target.workId}`,
    );
    return {
      title: work.title,
      body: work.answer,
      contentHash: work.contentHash,
      provenance: null,
    };
  }

  private index(
    kind: 'source' | 'knowledge' | 'work',
    id: string,
    title: string,
    body: string,
  ): void {
    this.db.run(
      `INSERT INTO search_entries (kind, source_revision_id, knowledge_revision_id, work_id, title, body)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        kind,
        kind === 'source' ? id : null,
        kind === 'knowledge' ? id : null,
        kind === 'work' ? id : null,
        title,
        body,
      ],
    );
  }

  search(input: SearchInput, boundary?: SearchBoundary): SearchResult {
    return this.read(() => searchWorkspace(this.db, input, boundary));
  }

  rankContext(options: Parameters<typeof rankContextRecords>[1], boundary: SearchBoundary, limit = 12) {
    return this.read(() => rankContextRecords(this.db, options, boundary, limit));
  }

  listRecords(input: z.input<typeof RecordListInput>, boundary: SearchBoundary, limit = 20) {
    return this.read(() => listWorkspaceRecords(this.db, input, boundary, limit));
  }

  contextLibrary() {
    return this.read(() => contextLibrary(this.db));
  }

  /** Trusted fixture/bootstrap input only. Not a legacy-vault or content-update importer. */
  importSeed(input: unknown): SeedReceipt {
    return this.write(() => importWorkspaceSeed(this.db, this, input, this.now()));
  }

  /** Developer migration path, not a model tool or arbitrary filesystem API.
   * Append records + originals + a missing profile in one immediate transaction.
   * Does not recover/stop conversations or overwrite any existing user record. */
  importPluginSnapshot(snapshot: Pick<PluginSnapshot, 'seed' | 'originals' | 'profile'>): {
    receipt: SeedReceipt; profileCreated: boolean;
  } {
    if (this.databasePath === ':memory:') throw new Error('Plugin import needs an on-disk workspace.');
    if (snapshot.seed.knowledge?.some(item => item.revision.status !== 'pending'))
      throw new Error('Imported practice entries must remain pending review.');
    const profile = snapshot.profile
      ? ProfileInput.parse({ ...snapshot.profile, applyToChats: false, expectedRevisionId: null })
      : null;
    const keys = new Set<string>();
    for (const original of snapshot.originals) {
      FileInput.shape.name.parse(original.name);
      Extraction.parse(original.extraction);
      const source = snapshot.seed.sources?.find(item => item.key === original.key);
      if (!source || keys.has(original.key) || original.bytes.length > 25_000_000 ||
          source.revision.provenance.originalHash !== createHash('sha256').update(original.bytes).digest('hex'))
        throw new Error('The import original does not match its source snapshot.');
      keys.add(original.key);
    }
    const created: string[] = [];
    try {
      return this.write(() => {
        const receipt = this.importSeed(snapshot.seed);
        if (receipt.alreadyImported) {
          for (const original of snapshot.originals)
            this.originalFile(receipt.records.sourceRevisions[original.key]!);
          return { receipt, profileCreated: false };
        }
        const directory = `${this.databasePath}.originals`;
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink())
          throw new Error('Originals directory must be a real directory.');
        for (const original of snapshot.originals) {
          const hash = createHash('sha256').update(original.bytes).digest('hex');
          const path = join(directory, hash);
          if (existsSync(path)) {
            if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink() ||
                !readFileSync(path).equals(original.bytes)) throw new Error('Original file integrity check failed.');
          } else {
            writeFileSync(path, original.bytes, { flag: 'wx', mode: 0o600 });
            created.push(path);
          }
          const revisionId = receipt.records.sourceRevisions[original.key]!;
          this.db.run('INSERT INTO source_originals VALUES (?, ?, ?, ?)',
            [revisionId, original.name, hash, original.bytes.length]);
          this.db.run('INSERT INTO source_extractions VALUES (?, ?)',
            [revisionId, JSON.stringify(original.extraction)]);
        }
        const profileCreated = !!profile && this.getProfile() === null;
        if (profileCreated) this.saveProfile(profile!);
        return { receipt, profileCreated };
      });
    } catch (error) {
      // These hashes were absent before this transaction. Existing originals
      // and every pre-import record remain untouched when the write rolls back.
      for (const path of created) unlinkSync(path);
      throw error;
    }
  }

  close(): void {
    this.upkeep.stop();
    this.imports.stop();
    this.db.close();
  }
}
