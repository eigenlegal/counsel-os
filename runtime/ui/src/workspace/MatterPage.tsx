import { useState, type FormEvent } from 'react';
import {
  href,
  request,
  type Snapshot,
  type Matter,
  type MatterBrief,
  type ConversationSummary,
} from './api';
import { Badge, Empty, dateLabel, kindLabel, Prose, Modal, ErrorNotice } from './components';
import { WorkRow } from './Home';
import { Icon } from './icons';
import type { EditorState } from './Editor';
import { DocumentUpload } from './DocumentUpload';
import { MatterClient } from './Clients';
import { BriefDraftAssist } from './BriefDraftAssist';
import type { BriefDraftFields } from '../../../src/workspace/brief-drafting';

import { ContextualChatHints } from './CapabilityHints';

export function MatterPage({
  matter,
  brief,
  conversations,
  data,
  openEditor,
  refresh,
}: {
  matter: Matter;
  brief: MatterBrief | null;
  conversations: ConversationSummary[];
  data: Snapshot;
  openEditor: (s: EditorState) => void;
  refresh: () => void;
}): JSX.Element {
  const [tab, setTab] = useState('Overview');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false),
    [importing, setImporting] = useState(false);
  const saved = data.savedWork.filter((w) => w.matterId === matter.id);
  const outputs = saved.filter((w) => w.disposition !== 'decision');
  const decisions = saved.filter((w) => w.disposition === 'decision');
  const sources = data.sources.filter((s) => s.matterIds.includes(matter.id));
  const chats = (limit?: number) => (
    <div className="matter-chat-list">
      {(limit ? conversations.slice(0, limit) : conversations).map((c) => (
        <a key={c.id} className="matter-chat-row" href={href('home', { id: c.id })}>
          <Icon name="chat" size={19} />
          <span>
            <strong>{c.title}</strong>
            <small>
              {c.turnCount} {c.turnCount === 1 ? 'exchange' : 'exchanges'} ·{' '}
              {dateLabel(c.updatedAt)}
            </small>
          </span>
          {c.running ? <Badge tone="blue">Working</Badge> : <Icon name="chevron" size={15} />}
        </a>
      ))}
      {!conversations.length && (
        <Empty title="Start the conversation">
          Ask about this matter. Related conversations will stay together here.
        </Empty>
      )}
      {conversations.length === 200 && (
        <p className="field-help">
          Showing the 200 most recently updated conversations in this matter.
        </p>
      )}
    </div>
  );
  return (
    <>
      <a className="back-link" href={href('matters')}>
        <Icon name="back" size={16} />
        All matters
      </a>
      <div className="matter-heading">
        <div>
          <div className="matter-heading-labels">
            <Badge tone="blue">{kindLabel(matter.kind)}</Badge>
            <Badge>{brief ? kindLabel(brief.status) : 'Open'}</Badge>
          </div>
          <h1>{matter.title}</h1>
        </div>
        <a
          className="button button-primary"
          href={href('home', { matter: matter.id, new: 'matter' })}
        >
          <Icon name="plus" size={17} />
          Ask about this matter
        </a>
      </div>
      {!!data.clients?.length && <MatterClient matterId={matter.id} data={data}/>}
      <div className="matter-tabs filter-tabs" aria-label="Matter views">
        {['Overview', 'Conversations', 'Documents', 'Outputs', 'Decisions'].map((label) => (
          <button
            key={label}
            className={tab === label ? 'selected' : ''}
            aria-pressed={tab === label}
            onClick={() => setTab(label)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'Overview' ? (
        <div className="matter-hub-layout">
          <div>
            <section className="matter-context">
              <div className="section-heading">
                <h2>The matter at a glance</h2>
                <button className="text-button" onClick={() => setEditing(true)}>
                  Edit brief
                </button>
              </div>
              <Prose
                text={
                  brief
                    ? brief.summary
                    : matter.summary ||
                      'Add the background and the question you are working through.'
                }
              />
              <ContextualChatHints matterId={matter.id} />
              {brief && (
                <p className="fine-print">
                  Your brief · updated {dateLabel(brief.recordedAt)}. Not an automatically generated
                  status report.
                </p>
              )}
            </section>
            <section className="matter-activity">
              <div className="section-heading">
                <h2>Recent conversations</h2>
                <button className="text-button" onClick={() => setTab('Conversations')}>
                  View all
                </button>
              </div>
              {chats(5)}
            </section>
            {outputs.length > 0 && (
              <section className="matter-activity">
                <div className="section-heading">
                  <h2>Outputs & notes</h2>
                  <button className="text-button" onClick={() => setTab('Outputs')}>
                    View all
                  </button>
                </div>
                {outputs.slice(0, 3).map((w) => (
                  <WorkRow key={w.id} work={w} data={data} />
                ))}
              </section>
            )}
          </div>
          <aside className="matter-hub-aside">
            <section>
              <h2>Open questions</h2>
              <Prose text={brief?.questions || 'No open questions recorded yet.'} />
            </section>
            <section>
              <h2>Next steps</h2>
              <Prose text={brief?.nextActions || 'No next steps recorded yet.'} />
              <p className="fine-print">Notes for your work, not scheduled reminders.</p>
            </section>
            <a className="text-button" href={href('search', { matter: matter.id })}>
              <Icon name="search" size={16} />
              Search this matter
            </a>
            <section>
              <h2>Matter positions & methods</h2>
              {data.knowledge
                .filter((k) => k.matterId === matter.id)
                .map((k) => (
                  <a key={k.id} className="context-link" href={href('knowledge', { id: k.id })}>
                    <Icon name="knowledge" size={17} />
                    <span>
                      {k.title}
                      <small>{k.status === 'pending' ? 'Needs review' : kindLabel(k.status)}</small>
                    </span>
                  </a>
                ))}
              <p className="fine-print">
                Approved practice-wide knowledge is also available to matter conversations.
              </p>
            </section>
          </aside>
        </div>
      ) : tab === 'Conversations' ? (
        <section className="matter-view">
          <h2>Conversations in this matter</h2>
          <p className="subtle">
            Separate discussions, shared matter context. Multiple chats can run at once.
          </p>
          {chats()}
        </section>
      ) : tab === 'Documents' ? (
        <section className="matter-view">
          <div className="section-heading">
            <h2>Documents & sources</h2>
            <div className="matter-document-actions">
              <button
                className="button button-quiet"
                onClick={() => openEditor({ kind: 'reference', matterId: matter.id })}
              >
                Add source text
              </button>
              <button className="button button-primary" onClick={() => setUploading(true)}>
                Add document
              </button>
            </div>
          </div>
          {sources.map((s) => (
            <a key={s.id} className="matter-chat-row" href={href('references', { id: s.id })}>
              <Icon name="reference" size={19} />
              <span>
                <strong>{s.title}</strong>
                <small>
                  {s.textStatus === 'ready'
                    ? 'Text available'
                    : s.textStatus === 'partial'
                      ? 'Partial extraction'
                      : 'Text unavailable'}
                </small>
              </span>
              <Icon name="chevron" size={15} />
            </a>
          ))}
          {!sources.length && (
            <Empty title="Bring in the source material">
              Attach a document in a matter conversation, or add source text here.
            </Empty>
          )}
        </section>
      ) : (
        <section className="matter-view">
          <div className="section-heading">
            <h2>{tab === 'Outputs' ? 'Outputs & notes' : 'Recorded decisions'}</h2>
            <button
              className="button"
              onClick={() => openEditor({ kind: 'work', matterId: matter.id })}
            >
              Add a note or decision
            </button>
          </div>
          <p className="subtle">
            {tab === 'Outputs'
              ? 'Substantive deliverables and saved notes. Everyday discussion stays in conversations.'
              : 'Your explicit decisions, not the assistant’s recommendations.'}
          </p>
          {(tab === 'Outputs' ? outputs : decisions).map((w) => (
            <WorkRow key={w.id} work={w} data={data} />
          ))}
          {!(tab === 'Outputs' ? outputs : decisions).length && (
            <Empty title={tab === 'Outputs' ? 'No saved outputs yet' : 'No decisions recorded yet'}>
              {tab === 'Outputs'
                ? 'Ask Counsel to draft or assess something. You can also keep an answer using “Save as output” in chat.'
                : 'Record a decision when you make one. Approving or rejecting practice material also preserves your decision.'}
            </Empty>
          )}
        </section>
      )}
      {(data.totals.work > data.limit || data.totals.sources > data.limit) && (
        <p className="field-help">
          Lists show up to {data.limit} recent records per type. Search this matter for older
          material.
        </p>
      )}
      {editing && (
        <BriefEditor
          matter={matter}
          brief={brief}
          close={() => setEditing(false)}
          saved={() => {
            setEditing(false);
            refresh();
          }}
        />
      )}
      {uploading && (
        <Modal
          title="Add a document to this matter"
          busy={importing}
          onClose={() => setUploading(false)}
        >
          <div className="attachment-picker">
            <DocumentUpload
              matterId={matter.id}
              busyChanged={setImporting}
              imported={() => {
                setUploading(false);
                refresh();
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

export function BriefEditor({
  matter,
  brief,
  close,
  saved,
}: {
  matter: Matter;
  brief: MatterBrief | null;
  close: () => void;
  saved: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const [base] = useState(brief);
  const [assisting, setAssisting] = useState(false);
  const [fields, setFields] = useState<BriefDraftFields>({ status: brief?.status ?? 'open',
    summary: brief?.summary ?? matter.summary, questions: brief?.questions ?? '', nextActions: brief?.nextActions ?? '' });
  const change = <K extends keyof BriefDraftFields>(key: K, value: BriefDraftFields[K]) => {
    setFields(current => ({ ...current, [key]: value })); setDirty(true);
  };
  const dismiss = () => {
    if (!busy && !assisting && (!dirty || confirm('Discard this unsaved matter brief?'))) close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || assisting) return;
    setBusy(true);
    setError('');
    try {
      await request(`/matters/${matter.id}/brief`, {
        expectedRevisionId: base?.id ?? null,
        ...fields,
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Edit matter brief" onClose={dismiss} busy={busy || assisting}>
      <form className="record-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <p className="form-intro">
          Your working context. New responses use this brief; earlier responses keep their original
          context.
        </p>
        <BriefDraftAssist value={fields} matterId={matter.id} expectedRevisionId={base?.id ?? null}
          disabled={busy} busyChanged={setAssisting} apply={value => { setFields(value); setDirty(true); }} />
        <label>
          Status
          <select
            aria-label="Status"
            name="status"
            value={fields.status}
            onChange={e => change('status', e.target.value as BriefDraftFields['status'])}
            disabled={busy || assisting}
          >
            <option value="open">Open</option>
            <option value="on-hold">On hold</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Background and purpose
          <textarea
            aria-label="Background and purpose"
            name="summary"
            rows={5}
            maxLength={12000}
            value={fields.summary}
            onChange={e => change('summary', e.target.value)}
            disabled={busy || assisting}
          />
        </label>
        <label>
          Open questions
          <textarea
            aria-label="Open questions"
            name="questions"
            rows={3}
            maxLength={6000}
            value={fields.questions}
            onChange={e => change('questions', e.target.value)}
            disabled={busy || assisting}
          />
        </label>
        <label>
          Next steps
          <textarea
            aria-label="Next steps"
            name="nextActions"
            rows={3}
            maxLength={6000}
            value={fields.nextActions}
            onChange={e => change('nextActions', e.target.value)}
            disabled={busy || assisting}
          />
        </label>
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" onClick={dismiss} disabled={busy || assisting}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy || assisting}>
            {busy ? 'Saving…' : 'Save brief'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
