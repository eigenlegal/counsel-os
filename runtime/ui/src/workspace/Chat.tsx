import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import {
  go,
  href,
  request,
  type ChatCitation,
  type Conversation,
  type Snapshot,
  type Source,
  type Turn,
  type ModelChoice,
  type ModelPreference,
  type Matter,
} from './api';
import { Badge, ErrorNotice, Modal, Status } from './components';
import { ChatTurn } from './ChatTurn';
import { ContextPanel, type Inspection } from './ContextPanel';
import { Icon } from './icons';
import { DocumentUpload } from './DocumentUpload';
import { MatterPicker } from './MatterPicker';
import { MultiMatterPicker, type SelectedMatter } from './MultiMatterPicker';
import { useDocumentDrop } from './document-drop';
import { OrganizeConversation } from './OrganizeConversation';
import { ModelPicker } from './ModelPicker';
import { ConversationActions } from './ConversationActions';
import { sameConnection } from '../../../src/workspace/model-choice';
import { ChatDraft, type ChatDraft as Draft } from '../../../src/workspace/draft-types';
import { useDraftRecovery, DraftRecoveryNotice } from './useDraftRecovery';

interface ChatData {
  unavailableAttachments?: string[];
  conversation: Conversation;
  turns: Turn[];
  modelPreference?: ModelPreference;
}
function emptyDraft(scope: string): Draft {
  return { message: '', attachments: [], scope, clientId: crypto.randomUUID() };
}
function getDraft(key: string, scope: string): Draft {
  try {
    const value = ChatDraft.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null'));
    return value.success ? value.data : emptyDraft(scope);
  } catch {
    return emptyDraft(scope);
  }
}

// Keep the writing area part of the composer, without a manual resize handle.
// CSS owns the minimum/maximum heights; longer drafts scroll inside the field.
function fitComposer(field: HTMLTextAreaElement) {
  field.style.height = '0px';
  field.style.height = `${field.scrollHeight}px`;
}
export function citationInspection(citation: ChatCitation): Inspection {
  return {
    kind: citation.target.kind,
    id: citation.target.kind === 'work' ? citation.target.workId : citation.target.revisionId,
    quote: citation.quote,
    start: citation.start,
    title: citation.title,
  };
}
export function Chat({
  id,
  data,
  onChanged,
  initialMatter,
  newChatKey,
  focusTurn,
  initialTemplate,
}: {
  id?: string;
  data: Snapshot;
  onChanged: () => void;
  initialMatter?: string;
  newChatKey?: string;
  focusTurn?: string;
  initialTemplate?: string;
}): JSX.Element {
  const storageKey = `counsel-workspace-draft:${data.databasePath}:${id ?? `new:${initialMatter ?? ''}:${newChatKey ?? ''}`}`;
  const durableDrafts = (data.interfaceVersion ?? 0) >= 29;
  const recovery = useDraftRecovery(`chat:${id ?? `new:${initialMatter ?? ''}:${newChatKey ?? ''}`}`, () => {
    const value = getDraft(storageKey, initialMatter ?? 'conversation');
    const template = data.templates?.find(item => item.id === initialTemplate && item.available);
    if (template && !value.message && !value.attachments.length) {
      value.message = 'Help me prepare a draft using the attached template. ';
      value.attachments = [template.sourceRevisionId];
    }
    return value;
  }, durableDrafts, storageKey, () => emptyDraft(initialMatter ?? 'conversation'));
  const draft = recovery.value;
  const setDraft = (value: Draft | ((previous: Draft) => Draft)) => recovery.set(value);
  const [chat, setChat] = useState<ChatData | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [adding, setAdding] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | undefined>();
  const [organizing, setOrganizing] = useState(false);
  const [pickingModel, setPickingModel] = useState(false);
  const [pickingMatters, setPickingMatters] = useState(false);
  const [panel, setPanel] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [contextTurn, setContextTurn] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [nearBottom, setNearBottom] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (composer.current) fitComposer(composer.current);
  }, [draft.message]);
  useLayoutEffect(() => {
    const field = composer.current;
    if (!field) return;
    let width = field.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = field.getBoundingClientRect().width;
      if (nextWidth !== width) {
        width = nextWidth;
        fitComposer(field);
      }
    });
    observer.observe(field);
    // A rapid resize out and back can leave ResizeObserver seeing its original
    // width even though a keystroke sized the field at the intermediate width.
    // Refit on viewport changes as well, after layout has settled.
    let resizeFrame = 0;
    const resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        width = field.getBoundingClientRect().width;
        fitComposer(field);
      });
    };
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); cancelAnimationFrame(resizeFrame); };
  }, []);
  const alive = useRef(true);
  const completed = useRef<string>('');
  const changeRef = useRef(onChanged);
  changeRef.current = onChanged;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await request<ChatData>(`/conversations/${id}`, undefined, abort.signal);
        if (abort.signal.aborted) return;
        setChat(next);
        setLoadError('');
        const signature = next.turns
          .filter((t) => t.status !== 'running')
          .map((t) => `${t.id}:${t.status}`)
          .join('|');
        if (signature !== completed.current) {
          completed.current = signature;
          changeRef.current();
        }
      } catch (e) {
        if (!abort.signal.aborted) setLoadError((e as Error).message);
      }
      if (!abort.signal.aborted)
        timer = setTimeout(() => {
          void poll();
        }, 1000);
    }
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [id, retry]);
  const turns = chat?.turns ?? [];
  useEffect(() => {
    if (!focusTurn || !turns.some((turn) => turn.id === focusTurn)) return;
    setNearBottom(false);
    const frame = requestAnimationFrame(() =>
      document.getElementById(`turn-${focusTurn}`)?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [focusTurn, turns.length]);
  const running = turns.find((t) => t.status === 'running');
  const composerDrop = useDocumentDrop(files => { setDroppedFiles(files); setAdding(true); }, sending || !!running || adding, setError);
  const lastTurn = turns.at(-1) ?? null;
  // The header describes the next message. Only response receipts select a saved turn.
  const selectedTurn = turns.find((t) => t.id === contextTurn) ?? null;
  const conversation = chat?.conversation ?? null;
  const modelChoice = draft.modelChoice !== undefined ? draft.modelChoice : chat?.modelPreference?.choice ?? null;
  const selectedModel = draft.submittedModelChoice ?? modelChoice ?? data.connection.config;
  const modelMismatch = !!modelChoice && (!data.connection.config || !sameConnection(modelChoice, data.connection.config));
  const scope = conversation ? (conversation.matterId ?? conversation.scope) : draft.scope;
  const scopeMatterId = scope === 'conversation' || scope === 'workspace' || scope === 'client' || scope === 'matters' ? undefined : scope;
  const [remoteMatter, setRemoteMatter] = useState<Matter | null>(null);
  const knownMatter = data.matters.find((m) => m.id === scope);
  const matter = knownMatter ?? (remoteMatter?.id === scope ? remoteMatter : undefined);
  useEffect(() => {
    if (!scopeMatterId || knownMatter) return;
    const abort = new AbortController();
    request<Matter>(`/matters/${scopeMatterId}`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setRemoteMatter(value); }).catch(() => {});
    return () => abort.abort();
  }, [scopeMatterId, knownMatter?.id]);
  const inheritedAttachments = [...new Set(turns.flatMap((t) => t.attachments))];
  const allAttachments = [...new Set([...inheritedAttachments, ...draft.attachments])];
  const contextRecords = turns.flatMap((t) => t.state.context);
  const sourceTitle = (revisionId: string) =>
    contextRecords.find((r) => r.id === revisionId)?.title ??
    data.sources.find((s) => s.revisionId === revisionId)?.title ??
    'Saved document version';
  const documents = allAttachments.filter(id => !chat?.unavailableAttachments?.includes(id)).map(id => ({
    id, title: sourceTitle(id), pending: !inheritedAttachments.includes(id),
    textStatus: data.sources.find(source => source.revisionId === id)?.textStatus,
  }));
  const update = (value: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...value }));
  useEffect(() => {
    if (nearBottom)
      scroll.current?.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: 'instant',
      });
  }, [lastTurn?.state.answer, turns.length, lastTurn?.state.activity.length, nearBottom]);
  const inspect = (value: Inspection) => {
    setInspection(value);
    setPanel(true);
  };
  const closePanel = () => {
    setPanel(false);
    // Wait for the mobile dialog to close; background fields are inert until then.
    requestAnimationFrame(() => { if (alive.current) composer.current?.focus(); });
  };
  const showContext = (turnId?: string) => {
    setContextTurn(turnId ?? null);
    setInspection(null);
    setPanel(true);
  };
  const send = useCallback(async () => {
    if (!recovery.ready || !draft.message.trim() || sending || running || !data.connection.ready || modelMismatch || (id && !chat))
      return;
    setSending(true);
    setError('');
    let conversationId = id ?? draft.createdId;
    // Freeze the visible choice for retries even if another window changes the default.
    const submittedChoice = selectedModel ? { kind: selectedModel.kind, model: selectedModel.model,
      ...(selectedModel.kind === 'claude-code' ? { claudeBilling: selectedModel.claudeBilling ?? 'subscription' as const } : {}) } : undefined;
    try {
      if (!await recovery.flush()) throw new Error('Save the draft before sending. Your text is still here.');
      if (!conversationId) {
        const created = await request<Conversation>('/conversations', {
          scope:
            draft.scope === 'conversation' || draft.scope === 'workspace' || draft.scope === 'matters' ? draft.scope : 'matter',
          matterId:
            draft.scope === 'conversation' || draft.scope === 'workspace' || draft.scope === 'matters' ? null : draft.scope,
          ...(draft.scope === 'matters' ? { matterIds: (draft.selectedMatters ?? []).map(m => m.id) } : {}),
        });
        conversationId = created.id;
        // Retain the created identity before sending, so a failed submission can retry safely.
        const retained = { ...draft, createdId: conversationId, submittedModelChoice: submittedChoice };
        if (alive.current) setDraft(retained);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(retained));
        } catch {
          /* in-memory draft still retains the ID */
        }
      }
      if (!id && modelChoice) await request(`/conversations/${conversationId}/model`, {
        expectedRevisionId: null, choice: modelChoice,
      });
      const retained = { ...draft, createdId: conversationId, submittedModelChoice: submittedChoice };
      if (alive.current) setDraft(retained);
      try { sessionStorage.setItem(storageKey, JSON.stringify(retained)); } catch { /* retained in memory */ }
      if (!await recovery.flush()) throw new Error('Save the draft before sending. Your text is still here.');
      await request<Turn>(`/conversations/${conversationId}/send`, {
        clientId: draft.clientId,
        message: draft.message,
        attachments: draft.attachments,
        ...(submittedChoice ? { modelChoice: submittedChoice } : {}),
      });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* browser storage may be unavailable */
      }
      changeRef.current();
      if (alive.current) {
        const empty = { ...emptyDraft(draft.scope), selectedMatters: draft.selectedMatters };
        if (durableDrafts) await recovery.afterSend(empty);
        else setDraft(empty);
        setNearBottom(true);
        setRetry((value) => value + 1);
        if (!id) go('home', { id: conversationId });
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setSending(false);
    }
  }, [draft, sending, running, data.connection.ready, id, chat, storageKey, selectedModel, modelMismatch, modelChoice]);
  async function stop() {
    if (!id || !running || stopping) return;
    setStopping(true);
    try {
      await request(`/conversations/${id}/stop`, { turnId: running.id });
      setRetry((value) => value + 1);
      changeRef.current();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStopping(false);
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };
  const managed = () => { setRetry(value => value + 1); onChanged(); };
  if (conversation?.lifecycle === 'trashed') return <section className="conversation-history">
    <div className="chat-heading"><h1>{conversation.title}</h1><ConversationActions conversation={conversation} onChanged={managed} /></div>
    <p>This conversation is in Trash. Restore it to read its messages or continue working.</p>
    <p className="fine-print">Saved outputs, documents and applied matter or Practice changes remain in the workspace.</p>
    <a className="button" href={href('home', { view: 'history' })}>Back to Chats</a>
  </section>;
  return (
    <div className={`chat-workspace ${panel ? 'with-context' : ''}`}>
      <section className="chat-main" aria-label="Chat">
        <div className="chat-heading">
          <div>
            <span className="chat-heading-label">{id ? 'Conversation' : 'Counsel workspace'}</span>
            <h1>
              {conversation?.title ??
                (id ? 'Opening conversation…' : 'A place to think it through.')}
            </h1>
          </div>
          <div className="chat-heading-actions">{running && <Badge tone="blue">Working in background</Badge>}
            {conversation?.lifecycle === 'archived' && <Badge>Archived</Badge>}
            {conversation && <ConversationActions conversation={conversation} running={!!running} onChanged={managed} />}
          </div>
        </div>
        <div className="chat-transcript">
          <div
            className="chat-scroll"
            ref={scroll}
            onScroll={(e) => {
              const el = e.currentTarget;
              setNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
            }}
          >
            {!id && (
              <div className="chat-welcome">
                <span className="welcome-mark" aria-hidden="true">
                  c.
                </span>
                <h2>What are we working through?</h2>
                <p>
                  Ask a question, bring in a document, or pick up a matter.
                  <br />
                  You can also update your practice material or tell Counsel how you prefer to work.
                </p>
                <div className="chat-suggestions">
                  {[
                    [
                      'Think through a question',
                      'Help me think through a legal question. Ask me what you need to know.',
                    ],
                    [
                      'Make sense of a matter',
                      'What do we know, what is unresolved, and what should happen next?',
                    ],
                    [
                      'Work with a document',
                      'Help me assess this document and identify the issues that matter.',
                    ],
                    [
                      'Set how Counsel works',
                      'Help me set my preferences for future work. Ask me what I would like you to do differently, then prepare the right change for my review.',
                    ],
                  ].map(([label, message]) => (
                    <button
                      key={label}
                      onClick={() => {
                        update({ message: message! });
                        composer.current?.focus();
                      }}
                    >
                      {label}
                      <Icon name="arrow" size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {id && !chat && !error && <p className="loading-state">Opening saved conversation…</p>}
            {chat && !turns.length && (
              <div className="chat-welcome">
                <h2>Start with the question.</h2>
                <p>This conversation is ready. Its context is shown above.</p>
              </div>
            )}
            {turns.map((turn) => (
              <ChatTurn
                key={turn.id}
                turn={turn}
                profile={data.profile}
                inspect={(c) => inspect(citationInspection(c))}
                showContext={() => showContext(turn.id)}
                onChanged={onChanged}
              />
            ))}
          </div>
          {!nearBottom && (
            <button className="jump-to-latest" onClick={() => setNearBottom(true)}>
              Latest response ↓
            </button>
          )}
        </div>
        <div className="composer-region">
          {conversation?.lifecycle === 'archived' ? <div className="archived-conversation-note">This conversation is archived. Use its action menu to move it to Active before sending another message.</div> : <>
          {loadError && (
            <ErrorNotice message={loadError} retry={() => setRetry((value) => value + 1)} />
          )}
          {error && <ErrorNotice message={error} />}
          {!data.connection.ready && (
            <div className="chat-connect-prompt">
              <Icon name="link" size={17} />
              <span>Connect your AI to start working.</span>
              <a href={href('settings')}>
                Set up connection <Icon name="arrow" size={14} />
              </a>
            </div>
          )}
          <form className={`chat-composer ${composerDrop.dragging ? 'dragging-files' : ''}`} onSubmit={submit} {...composerDrop.handlers}><fieldset className="draft-fields" disabled={!recovery.ready}>
            {composerDrop.dragging && <div className="composer-drop-hint" role="status"><Icon name="attach" size={21} />Drop documents to add to this chat<span>No message is sent until you choose Send.</span></div>}
            <section className="chat-context-strip" aria-label="Chat context">
              <div className="chat-scope-row">
                <div className="chat-scope-selection" role="group" aria-label="Conversation context selection">
                  {conversation ? (
                    <span className="scope-name">
                      {matter ? (
                        <a href={href('matters', { id: matter.id })}>{matter.title}</a>
                      ) : scope === 'workspace' ? (
                        'All matters'
                      ) : conversation.clientContext ? (
                        <a href={href('matters', {client: conversation.clientContext.id})}>{conversation.clientContext.name} · {conversation.clientContext.matters.length} matters</a>
                      ) : conversation.selectedMatters ? (
                        <button type="button" className="text-button" onClick={() => showContext()}>{conversation.selectedMatters.length} selected matters</button>
                      ) : (
                        'This conversation'
                      )}
                    </span>
                  ) : draft.scope === 'matters' ? (
                    <button type="button" className="matter-picker-trigger compact" aria-label="Conversation context" aria-haspopup="dialog"
                      disabled={sending || !!draft.createdId} onClick={() => setPickingMatters(true)}
                      title={draft.selectedMatters?.map(m => m.title).join(', ')}>
                      <span>{draft.selectedMatters?.length ?? 0} selected matters</span><Icon name="chevron" size={12} />
                    </button>
                  ) : (
                    <MatterPicker
                      label="Conversation context"
                      value={draft.scope}
                      onChange={(scope) => scope === 'matters' ? setPickingMatters(true) : update({ scope, selectedMatters: undefined })}
                      disabled={sending || !!draft.createdId}
                      matters={data.matters}
                      compact
                      choices={[
                        { value: 'conversation', label: 'This conversation', description: 'This chat, added documents, approved Practice and imported reusable practice/law files.' },
                        { value: 'matters', label: 'Select several matters…', description: 'Choose specific matters to work across. No client required.' },
                        { value: 'workspace', label: 'All matters · cross-matter research', description: 'Allow retrieval across all matters in this workspace.' },
                      ]}
                    />
                  )}
                  {conversation?.scope === 'conversation' && <button type="button" className="composer-file-matter" disabled={!!running || sending} onClick={() => setOrganizing(true)}>Add to a matter</button>}
                </div>
                <button type="button" className="context-toggle" onClick={() => showContext()} aria-expanded={panel && !inspection}>
                  <Icon name="read" size={15} />
                  <span>View context</span>
                </button>
              </div>
              {documents.length > 0 && <div className="chat-context-documents" aria-label="Documents added to this chat">
                {documents.map(document => <div className="document-chip" key={document.id}>
                  <button type="button" onClick={() => inspect({kind: 'source', id: document.id})} title={document.title}>
                    <Icon name="reference" size={15} /><span>{document.title}</span>
                    <small>{document.textStatus === 'partial' ? 'Partial text · ' : document.textStatus === 'unavailable' ? 'No readable text · ' : ''}{document.pending ? 'Next message' : 'In this chat'}</small>
                  </button>
                  {document.pending && <button type="button" aria-label={`Remove ${document.title}`} disabled={sending}
                    onClick={() => update({attachments: draft.attachments.filter(id => id !== document.id), clientId: crypto.randomUUID()})}>
                    <Icon name="close" size={12} />
                  </button>}
                </div>)}
              </div>}
            </section>
            <textarea
              ref={composer}
              aria-label="Message Counsel"
              placeholder={
                matter ? `Ask about ${matter.title}…` : 'Ask Counsel anything about your work…'
              }
              value={draft.message}
              maxLength={30_000}
              disabled={sending || !recovery.ready}
              onChange={(e) =>
                update({
                  message: e.target.value,
                  clientId: crypto.randomUUID(),
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
            />
            <div className="composer-controls">
              <button
                className="attach-button"
                type="button"
                disabled={sending || !!running}
                onClick={() => { setDroppedFiles(undefined); setAdding(true); }}
              >
                <Icon name="attach" size={18} />
                <span>Add documents</span>
              </button>
              {data.connection.config ? <button type="button" className={`composer-model ${modelMismatch ? 'model-mismatch' : ''}`}
                aria-label="Choose model for this chat" onClick={() => setPickingModel(true)} disabled={sending}
                aria-description={data.connection.label}
                title={`${data.connection.label} · ${selectedModel?.model ?? ''}`}>
                <span>{modelMismatch ? 'Review model choice' : selectedModel?.model}</span>
                <Icon name="chevron" size={12} />
              </button> : <span className="composer-connection">{data.connection.label}</span>}
              {running ? (
                <button
                  className="send-button stop-button"
                  type="button"
                  aria-label="Stop response"
                  disabled={stopping}
                  onClick={() => void stop()}
                >
                  <Icon name="stop" size={17} />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  aria-label="Send message"
                  disabled={
                    sending || !recovery.ready || !draft.message.trim() || !data.connection.ready || modelMismatch || (!!id && !chat)
                  }
                >
                  <Icon name="arrow" size={18} />
                </button>
              )}
            </div>
          </fieldset></form>
          {durableDrafts && (recovery.error || recovery.saving || !recovery.ready) && <DraftRecoveryNotice recovery={recovery} />}
          <div className="composer-footnote">
            <a className="composer-practice-note" href={href('knowledge', {section: 'preferences'})}>
              <Icon name="knowledge" size={12} />Practice preferences
            </a>
            {running ? <span role="status">Working. You can start another chat.</span>
              : <span className="composer-keyboard-hint">Shift ↵ for a new line</span>}
          </div>
          </>}
        </div>
      </section>
      {panel && (
        <ContextPanel
          profile={data.profile}
          conversation={
            conversation ?? {
              scope:
                scope === 'workspace'
                  ? 'workspace'
                  : scope === 'matters'
                    ? 'matters'
                  : scope === 'conversation'
                    ? 'conversation'
                    : 'matter',
              matterId: scopeMatterId ?? null,
              ...(scope === 'matters' ? { selectedMatters: draft.selectedMatters ?? [] } : {}),
            }
          }
          turn={selectedTurn}
          latestTurn={lastTurn}
          selectTurn={showContext}
          current={{documents, matterTitle: matter?.title, workingPreferences: data.workingPreferences ?? null, entityRegistry: data.entityRegistry ?? null}}
          inspection={inspection}
          close={closePanel}
          inspect={inspect}
        />
      )}
      {organizing && conversation && (
        <OrganizeConversation
          id={conversation.id}
          data={data}
          close={() => setOrganizing(false)}
          saved={(value) => {
            setChat((current) => (current ? { ...current, conversation: value } : current));
            setOrganizing(false);
            onChanged();
          }}
        />
      )}
      {pickingMatters && <MultiMatterPicker selected={draft.selectedMatters ?? (matter ? [{id: matter.id, title: matter.title}] : [])}
        close={() => { setPickingMatters(false); requestAnimationFrame(() => composer.current?.focus()); }}
        choose={matters => {
          update({ scope: matters.length > 1 ? 'matters' : matters[0]?.id ?? 'conversation', selectedMatters: matters.length > 1 ? matters : undefined });
          setPickingMatters(false); requestAnimationFrame(() => composer.current?.focus());
        }} />}
      {pickingModel && data.connection.config && <ModelPicker config={data.connection.config}
        label={data.connection.label} choice={modelChoice} onClose={() => setPickingModel(false)}
        onSave={async choice => {
          if (draft.submittedModelChoice)
            throw new Error('A send is awaiting confirmation. Retry it with its original model or check the conversation before changing this draft’s model.');
          if (id && chat) {
            const preference = await request<ModelPreference>(`/conversations/${id}/model`, {
              expectedRevisionId: chat.modelPreference?.revisionId ?? null, choice,
            });
            setChat(current => current ? { ...current, modelPreference: preference } : current);
            update({ modelChoice: undefined });
          } else update({ modelChoice: choice });
        }} />}
      {adding && (
        <AttachmentPicker
          data={data}
          existing={allAttachments}
          matterId={scopeMatterId}
          initialFiles={droppedFiles}
          close={() => { setAdding(false); setDroppedFiles(undefined); composer.current?.focus(); }}
          add={(revision) => {
            setDraft(previous => ({ ...previous,
              attachments: [...new Set([...previous.attachments, revision])],
              clientId: crypto.randomUUID(),
            }));
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AttachmentPicker({
  data,
  existing,
  matterId,
  initialFiles,
  close,
  add,
}: {
  data: Snapshot;
  existing: string[];
  matterId?: string;
  initialFiles?: File[];
  close: () => void;
  add: (revision: string) => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sources = data.sources.filter(
    (s) => !existing.includes(s.revisionId) && s.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal title="Add documents to this chat" onClose={close} busy={busy}>
      <div className="attachment-picker">
        <DocumentUpload
          matterId={matterId}
          disabled={existing.length >= 12}
          maxFiles={Math.max(0, 12 - existing.length)}
          initialFiles={initialFiles}
          busyChanged={setBusy}
          imported={(source) => add(source.latest.id)}
          completed={close}
        />
        <p className="fine-print">
          Saved workspace sources can also be attached below. Selecting a record from another
          matter explicitly shares that version with this chat.
        </p>
        {error && <ErrorNotice message={error} />}
        <label>
          From your workspace
          <input
            aria-label="Find a saved document"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find by title…"
          />
        </label>
        <div className="attachment-options">
          {sources.slice(0, 40).map((source) => (
            <button
              key={source.id}
              disabled={busy || existing.length >= 12}
              onClick={() => { add(source.revisionId); close(); }}
            >
              <Icon name="reference" size={20} />
              <span>
                <strong>{source.title}</strong>
                <small>
                  {source.matterIds
                    .map((id) => data.matters.find((m) => m.id === id)?.title)
                    .filter(Boolean)
                    .join(' · ') || 'Workspace source'}
                </small>
                <Status value={source.textStatus} />
              </span>
              <Icon name="plus" size={16} />
            </button>
          ))}
          {!sources.length && (
            <p>No matching documents. Import text above or add a reference in the library.</p>
          )}
        </div>
        {sources.length > 40 && <p>Showing 40 matches. Narrow the title search.</p>}
      </div>
    </Modal>
  );
}
