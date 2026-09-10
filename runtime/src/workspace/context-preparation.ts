import type { ToolDef } from '../core/types';
import type { ContextRecord, Conversation, Turn } from './conversations';
import type { WorkspaceStore } from './store';
import type { SearchBoundary } from './search';
import type { LibraryRecord } from './context-library';
import { contextTerms, contextWindow } from './context-ranking';
import type { EvidenceDiscovery } from './evidence-discovery';
import { isSocialRequest, type RecallPlan } from './recall-plan';

type Ref = {
  kind: ContextRecord['kind']; id: string; title: string;
  matchTerms?: string[];
  window?: 'opening' | 'topical' | 'latest';
};
const MAX_READS = 16, MAX_EVIDENCE_READS = 4, MAX_CHARACTERS = 64_000;
const key = (ref: Ref) => ref.kind + ':' + ref.id;

/** Bounded, deterministic starting reads. Full-text ranking considers the entire permitted
 * index, not a newest-first catalog slice. The normal tools still check every read/citation.
 * This does not infer permission, update records, verify law or replace model-led follow-up.
 */
export async function prepareContext(options: {
  store: WorkspaceStore; conversation: Conversation; turn: Turn;
  tools: ToolDef[]; boundary: SearchBoundary; signal: AbortSignal;
  recallPlan?: RecallPlan;
}): Promise<unknown[]> {
  const { store, turn, conversation, tools, boundary, signal } = options;
  if (isSocialRequest(turn.request)) return [];
  const requestTerms = contextTerms(turn.request);
  const followUp = !turn.attachments.length && (requestTerms.length === 0 ||
    (requestTerms.length <= 3 && /\b(it|that|this|those|these|them|same|again|more|next)\b/i.test(turn.request)));
  const previousTerms = followUp
    ? contextTerms(store.conversations.turns(conversation.id).filter(item => item.id !== turn.id && item.status === 'complete').slice(-2).map(item => item.request).join('\n'), 12)
    : [];
  const supplemental = new Set(previousTerms);
  const groups = new Map<string, Ref[]>();
  const add = (ref: Ref, group = 'other') => {
    const items = groups.get(group) ?? [];
    if (!items.some(item => key(item) === key(ref) && (item.window ?? 'topical') === (ref.window ?? 'topical'))) items.push(ref);
    groups.set(group, items);
  };
  const bodies = new Map<string, string>();
  const bodyOf = (ref: Ref): string => {
    if (!bodies.has(key(ref))) bodies.set(key(ref), ref.kind === 'source'
      ? store.getSourceRevision(ref.id).body ?? ''
      : ref.kind === 'knowledge' ? store.getKnowledgeRevision(ref.id).body : store.getWork(ref.id).answer);
    return bodies.get(key(ref))!;
  };
  // New attachments are explicit; a vague follow-up uses the most recently attached
  // documents rather than silently returning to the oldest file in this conversation.
  const attachmentIds = turn.attachments.length ? turn.attachments.slice(0, 3)
    : followUp ? turn.state.context.filter(item => item.kind === 'source').slice(-2).reverse().map(item => item.id) : [];
  for (const id of attachmentIds) {
    const source = store.getSourceRevision(id), ref: Ref = { kind: 'source', id, title: source.title };
    add(ref, 'attachments');
    for (const term of contextTerms(source.body ?? '', 20)) supplemental.add(term);
  }
  const matterIds = boundary.matterIds ?? (boundary.matterId ? [boundary.matterId] : []);
  // Allocate an actual underlying note per selected matter before recency can let
  // one matter crowd the others out. This narrows the existing boundary only.
  const noteMatters = new Map<string, string>();
  for (const matterId of matterIds.slice(0, 6)) {
    const notes = store.rankContext({ terms: [], matterNotes: true }, { ...boundary, matterIds: [matterId] }, 1);
    for (const note of notes) {
      add({ ...note, window: 'opening' }, 'matter-notes');
      noteMatters.set(note.id, matterId);
      for (const term of contextTerms(note.title, 12)) supplemental.add(term);
      if (bodyOf(note).length > 16_000) add({ ...note, window: 'latest' }, 'note-updates');
    }
  }
  const supplementalTerms = [...supplemental].filter(term => !requestTerms.includes(term)).slice(0, 24);
  const alternateTerms = options.recallPlan?.status === 'expanded' ? options.recallPlan.terms : [];
  const terms = [...new Set([...requestTerms, ...supplementalTerms, ...alternateTerms.flat()])];
  const rank = (filter: { kinds?: Ref['kind'][]; ids?: string[] }, limit: number): Ref[] => {
    const result = store.rankContext({ ...filter, terms: requestTerms, alternateTerms }, boundary, limit);
    if (result.length < limit && supplementalTerms.length) {
      for (const item of store.rankContext({ ...filter, terms: supplementalTerms }, boundary, limit)) {
        if (!result.some(previous => key(previous) === key(item))) result.push(item);
      }
    }
    return result.slice(0, limit);
  };
  const library = turn.state.contextLibrary?.records ?? [];
  const relevantLibrary = (items: LibraryRecord[], limit: number): Ref[] => {
    const result = rank({ ids: items.map(item => item.id), kinds: ['source', 'knowledge'] }, limit);
    // A pinned approved revision can become historical while this response starts.
    // Its exact library identity remains readable; use its title/path as a fallback,
    // never an arbitrary provenance string or permission from search metadata.
    const topicWords = new Set(terms);
    const fallback = items.map(item => ({ item, score: contextTerms(item.title + ' ' + item.path).filter(term => topicWords.has(term)).length }))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    for (const { item } of fallback) if (!result.some(previous => key(previous) === key(item))) result.push(item);
    return result.slice(0, limit);
  };
  const family = (prefix: string) => library.filter(item => item.path.startsWith(prefix));
  for (const item of relevantLibrary(family('practice/standards/'), 2)) add(item, 'standards');
  for (const item of rank({ kinds: ['knowledge'] }, 2)) add(item, 'knowledge');
  for (const item of relevantLibrary(family('law/'), 2)) add(item, 'law');
  for (const item of relevantLibrary(family('practice/methods/'), 1)) add(item, 'methods');
  for (const item of relevantLibrary(library.filter(item => !/^(law|practice\/(standards|methods))\//.test(item.path)), 1)) add(item, 'library');
  // Rank previous attachments too, even if the user didn't attach them again.
  if (!attachmentIds.length && turn.state.context.length) {
    for (const item of rank({ kinds: ['source'], ids: turn.state.context.filter(item => item.kind === 'source').map(item => item.id) }, 2)) add(item, 'sources');
  }
  for (const item of rank({ kinds: ['source'] }, 3)) add(item, 'sources');
  for (const item of rank({ kinds: ['work'] }, 2)) add(item, 'work');
  if (matterIds.length && !groups.get('work')?.length) {
    const latest = store.listRecords({ kind: 'work' }, boundary, 1).records[0];
    if (latest) add(latest, 'work');
  }

  const selected: Ref[] = [];
  const select = (ref: Ref) => {
    if (selected.some(item => key(item) === key(ref) && (item.window ?? 'topical') === (ref.window ?? 'topical'))) return;
    selected.push(ref);
  };
  for (const name of ['attachments', 'matter-notes']) {
    for (const ref of groups.get(name) ?? []) select(ref);
    groups.delete(name);
  }
  // Round-robin categories: a long practice library must not consume every slot
  // before prior advice or source evidence gets a first read. Extra note tails last.
  const queues = ['standards', 'knowledge', 'law', 'methods', 'library', 'sources', 'work', 'note-updates']
    .map(name => [...(groups.get(name) ?? [])]);
  while (queues.some(items => items.length)) {
    for (const items of queues) { const ref = items.shift(); if (ref) select(ref); }
  }
  const candidateCount = selected.length;
  selected.splice(MAX_READS);

  const read = tools.find(tool => tool.name === 'counsel_read_record')!;
  const passages: unknown[] = [], prepared: Array<{ kind: Ref['kind']; id: string }> = [];
  const links: Array<EvidenceDiscovery['records'][number] & { from: { kind: Ref['kind']; id: string } }> = [];
  const evidenceReads: Array<{ kind: Ref['kind']; id: string; from: { kind: Ref['kind']; id: string }; relation: 'cited-version' | 'newer-version' }> = [];
  let unavailableLinks = 0, omittedLinks = 0;
  let characters = 0, partialRead = false;
  for (const [index, ref] of selected.entries()) {
    signal.throwIfAborted();
    const remaining = MAX_CHARACTERS - 16_000 - characters;
    if (!remaining) break;
    // Share the starting-read budget across the selected categories. Short records
    // leave room for later ones; a large attachment cannot consume every first read.
    const length = Math.min(16_000, Math.floor(remaining / (selected.length - index)));
    const body = bodyOf(ref);
    const start = ref.window === 'opening' ? 0 : ref.window === 'latest'
      ? Math.max(0, body.length - length) : contextWindow(body, ref.matchTerms ?? terms, length);
    const passage = await read.execute(read.inputSchema.parse({ kind: ref.kind, id: ref.id, start, length }), { tenant: 'workspace' }) as { text: string | null; nextStart: number | null; supportingRecords?: EvidenceDiscovery };
    partialRead ||= start > 0 || passage.nextStart !== null;
    characters += passage.text?.length ?? 0;
    passages.push(passage);
    if (!prepared.some(item => key(item as Ref) === key(ref))) prepared.push({ kind: ref.kind, id: ref.id });
    if (passage.supportingRecords) {
      unavailableLinks += passage.supportingRecords.unavailable;
      omittedLinks += passage.supportingRecords.omitted;
      for (const link of passage.supportingRecords.records) links.push({ ...link, from: { kind: ref.kind, id: ref.id } });
    }
  }
  // One hop only, exact cited ranges first. Never treat a link as a permission grant.
  // The normal read tool checks every target again and pins its actual supplied range.
  const linked = new Set<string>();
  let evidenceAttempts = 0;
  for (const link of links.sort((a, b) => Number(a.relation === 'newer-version') - Number(b.relation === 'newer-version'))) {
    signal.throwIfAborted();
    const identity = `${key(link)}:${link.start}`;
    if (linked.has(identity)) continue;
    linked.add(identity);
    const body = bodyOf(link);
    const start = link.relation === 'newer-version' ? contextWindow(body, terms, link.length) : link.start;
    const existing = turn.state.context.find(item => key(item as Ref) === key(link));
    if (body.length && existing?.ranges.some(range => range.start <= start && range.end >= Math.min(body.length, start + link.length))) continue;
    if (evidenceAttempts >= MAX_EVIDENCE_READS || characters >= MAX_CHARACTERS) { omittedLinks++; continue; }
    evidenceAttempts++;
    const length = Math.min(link.length, MAX_CHARACTERS - characters);
    let passage: { text: string | null };
    try { passage = await read.execute(read.inputSchema.parse({ kind: link.kind, id: link.id, start, length }), { tenant: 'workspace' }) as typeof passage; }
    catch { signal.throwIfAborted(); unavailableLinks++; continue; }
    if (!passage.text?.length) { unavailableLinks++; continue; }
    characters += passage.text?.length ?? 0;
    passages.push(passage);
    if (!prepared.some(item => key(item as Ref) === key(link))) prepared.push({ kind: link.kind, id: link.id });
    evidenceReads.push({ kind: link.kind, id: link.id, from: link.from, relation: link.relation });
  }
  const matterNotesRead = new Set(prepared.map(ref => noteMatters.get(ref.id)).filter(Boolean)).size;
  turn.state.preparedContext = {
    records: prepared,
    retrieval: { method: alternateTerms.length ? 'scoped-query-fusion-v3' : 'scoped-evidence-v2', requestTerms, supplementalTerms,
      ...(options.recallPlan ? {plan:options.recallPlan} : {}),
      limited: partialRead || candidateCount > selected.length || characters >= MAX_CHARACTERS || unavailableLinks > 0 || omittedLinks > 0 || matterIds.length > matterNotesRead,
      characters, evidenceReads, unavailableLinks, omittedLinks, selectedMatters: matterIds.length, matterNotesRead },
    note: `${alternateTerms.length ? 'Alternate AI vocabulary and original terms are searched independently and their scoped rankings combined. Search expressions are hints, not evidence. ' : ''}Initial passages use scoped full-text matches, balanced library categories, attachments, up to six selected-matter notes and one hop of permitted recorded supporting evidence (up to four additional reads). A newer-version link is a separate check, not the evidence originally cited. Older records and topical ranges are considered; recency is only a fallback. This is a bounded starting brief, not an exhaustive review or vector search. Read remaining ranges and investigate other relevant records with the tools. Unprepared matter notes are not evidence that a matter has no files. Imported law has not been checked for currency.`,
  };
  return passages;
}
