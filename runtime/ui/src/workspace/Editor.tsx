import { useState, type FormEvent } from 'react';
import { request, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import { CitationPicker, type DraftCitation } from './CitationPicker';
import { ProfileAttribution } from './Profile';
import { MatterPicker } from './MatterPicker';
import { PracticeDraftAssist } from './PracticeDraftAssist';
import type { PracticeDraftFields } from '../../../src/workspace/practice-drafting';

export type EditorKind = 'matter' | 'reference' | 'knowledge' | 'work';
export interface EditorState {
  kind: EditorKind;
  matterId?: string;
  collection?: 'external' | 'practice';
}
const titles: Record<EditorKind, string> = {
  matter: 'New matter',
  reference: 'Add a source',
  knowledge: 'Add to practice',
  work: 'Record work',
};
const actions: Record<EditorKind, string> = {
  matter: 'Create matter',
  reference: 'Save source',
  knowledge: 'Save for review',
  work: 'Save work',
};
const endpoints: Record<EditorKind, string> = {
  matter: '/matters',
  reference: '/sources',
  knowledge: '/knowledge',
  work: '/work',
};

export function Editor({
  state,
  data,
  onClose,
  onSaved,
}: {
  state: EditorState;
  data: Snapshot;
  onClose: () => void;
  onSaved: (kind: EditorKind, id: string) => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [practiceDraft, setPracticeDraft] = useState<PracticeDraftFields>({ title: '', body: '', kind: 'position' });
  const [selectedMatter, setSelectedMatter] = useState(state.matterId ?? '');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [decision, setDecision] = useState(false);
  const [textStatus, setTextStatus] = useState('ready');
  const [citations, setCitations] = useState<DraftCitation[]>([]);
  const [citationPending, setCitationPending] = useState(false);
  const close = () => {
    if (!busy && !assisting && (!dirty || window.confirm('Discard this unsaved record?'))) onClose();
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || assisting || citationPending || (decision && !data.profile)) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const title = value('title');
    const recordText = String(form.get('body') ?? '');
    const matterId = value('matter') || null;
    let input: unknown;
    if (state.kind === 'matter') input = { title, kind: value('kind'), summary: recordText };
    if (state.kind === 'reference')
      input = {
        kind: value('kind'),
        ...(state.collection ? { collection: state.collection } : {}),
        matterIds: matterId ? [matterId] : [],
        revision: {
          title,
          body: textStatus === 'unavailable' ? null : recordText,
          textStatus,
          provenance: {
            origin: value('origin'),
            ...(value('author') ? { author: value('author') } : {}),
            mediaType: 'text/plain',
          },
        },
      };
    if (state.kind === 'knowledge')
      input = {
        kind: value('kind'),
        matterId,
        revision: { title, body: recordText, status: 'pending' },
      };
    if (state.kind === 'work')
      input = {
        title,
        matterId,
        request: value('request'),
        answer: recordText,
        evidence: citations.map(({ title: _title, ...citation }) => citation),
        ...(decision
          ? { disposition: 'decision', expectedProfileRevisionId: data.profile!.revisionId }
          : {}),
      };
    setBusy(true);
    setError('');
    try {
      const saved = await request<{ id: string }>(endpoints[state.kind], input);
      onSaved(state.kind, saved.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title={titles[state.kind]} onClose={close} busy={busy}>
      <form className="record-form" onSubmit={save} onChange={() => setDirty(true)}>
        <p className="form-intro">
          {state.kind === 'matter'
            ? 'A place for the context, references, and decisions behind your work.'
            : state.kind === 'reference'
              ? 'Save source text and where it came from. Nothing is fetched from the location you enter.'
              : state.kind === 'knowledge'
                ? 'A position, approach, or lesson worth keeping. It becomes reusable after you approve it.'
                : 'Keep a note, a piece of advice, or a decision. This records your text; it does not ask an AI.'}
        </p>
        {state.kind === 'knowledge' && <PracticeDraftAssist value={practiceDraft} matterId={selectedMatter || null}
          busyChanged={setAssisting} disabled={busy} apply={value => { setPracticeDraft(value); setDirty(true); }} />}
        <label>
          Title
          <input
            name="title"
            {...(state.kind === 'knowledge' ? { value: practiceDraft.title, disabled: busy || assisting,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPracticeDraft(current => ({ ...current, title: e.target.value })) } : {})}
            required
            maxLength={300}
            autoFocus
            placeholder={
              state.kind === 'matter'
                ? 'e.g. Employee monitoring policy'
                : 'A clear, descriptive title'
            }
          />
        </label>
        <div className="form-pair">
          {state.kind === 'matter' ? (
            <label>
              Type
              <select aria-label="Type" name="kind" defaultValue="advisory">
                <option value="advisory">Advice & research</option>
                <option value="investigation">Investigation</option>
                <option value="dispute">Dispute</option>
                <option value="compliance">Compliance</option>
                <option value="document">Document work</option>
                <option value="general">General</option>
              </select>
            </label>
          ) : (
            <label>
              Matter
              <MatterPicker name="matter" value={selectedMatter} onChange={value => { setSelectedMatter(value); setDirty(true); }}
                matters={data.matters} disabled={busy || assisting}
                choices={[{ value: '', label: state.kind === 'knowledge' ? 'Entire practice' : 'No matter' }]} />
            </label>
          )}
          {state.kind === 'reference' && (
            <label>
              Source type
              <select aria-label="Source type" name="kind" defaultValue="reference">
                <option value="reference">Reference</option>
                <option value="authority">Legal authority</option>
                <option value="document">Document text</option>
              </select>
            </label>
          )}
          {state.kind === 'knowledge' && (
            <label>
              Practice item type
              <select aria-label="Practice item type" name="kind" value={practiceDraft.kind} disabled={busy || assisting}
                onChange={e => setPracticeDraft(current => ({ ...current, kind: e.target.value as PracticeDraftFields['kind'] }))}>
                <option value="position">Position</option>
                <option value="method">Method</option>
                <option value="language">Reusable language</option>
                <option value="pattern">Lesson / pattern</option>
              </select>
            </label>
          )}
          {state.kind === 'work' && (
            <label>
              Record as
              <select
                aria-label="Record as"
                value={decision ? 'decision' : 'draft'}
                onChange={(e) => setDecision(e.target.value === 'decision')}
              >
                <option value="draft">Note / draft</option>
                <option value="decision">My decision</option>
              </select>
            </label>
          )}
        </div>
        {state.kind === 'reference' && (
          <>
            <label>
              Source location
              <input
                name="origin"
                required
                maxLength={1000}
                placeholder="URL, document name, or where this came from"
              />
            </label>
            <div className="form-pair">
              <label>
                Author (optional)
                <input name="author" maxLength={1000} />
              </label>
              <label>
                Text coverage
                <select
                  aria-label="Text coverage"
                  value={textStatus}
                  onChange={(e) => setTextStatus(e.target.value)}
                >
                  <option value="ready">Full text available</option>
                  <option value="partial">Partial text only</option>
                  <option value="unavailable">Text not available yet</option>
                </select>
              </label>
            </div>
          </>
        )}
        {state.kind === 'work' && (
          <label>
            Question or context
            <textarea
              name="request"
              required
              rows={2}
              placeholder="What is this work addressing?"
            />
          </label>
        )}
        {(state.kind !== 'reference' || textStatus !== 'unavailable') && (
          <label>
            {state.kind === 'matter'
              ? 'Context (optional)'
              : state.kind === 'reference'
                ? 'Source text'
                : state.kind === 'knowledge'
                  ? 'What should we remember?'
                  : decision
                    ? 'Your decision'
                    : 'Your note or draft'}
            <textarea
              name="body"
              aria-label={state.kind === 'knowledge' ? 'What should we remember?' : undefined}
              {...(state.kind === 'knowledge' ? { value: practiceDraft.body, disabled: busy || assisting,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setPracticeDraft(current => ({ ...current, body: e.target.value })) } : {})}
              required={state.kind !== 'matter'}
              rows={state.kind === 'matter' ? 4 : 7}
              maxLength={2_000_000}
              placeholder={
                state.kind === 'reference'
                  ? 'Paste the text you want to keep and search…'
                  : 'Write here…'
              }
            />
          </label>
        )}
        {decision && state.kind === 'work' && <ProfileAttribution profile={data.profile} />}
        {state.kind === 'work' && (
          <CitationPicker
            data={data}
            citations={citations}
            onChange={setCitations}
            onPending={setCitationPending}
            disabled={busy}
          />
        )}
        {state.kind === 'reference' && (
          <p className="field-help">
            This form saves pasted text. To retain an original PDF, Word or text document, use Add a file in Practice, Import, or Add documents in a chat.
          </p>
        )}
        {state.kind === 'knowledge' && (
          <p className="field-help">New practice material stays out of normal search until reviewed.</p>
        )}
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" onClick={close} disabled={busy || assisting}>
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || assisting || citationPending || (decision && !data.profile)}
          >
            {busy ? 'Saving…' : actions[state.kind]}
          </button>
        </div>
      </form>
    </Modal>
  );
}
