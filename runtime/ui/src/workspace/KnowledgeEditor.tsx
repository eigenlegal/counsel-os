import { useState, type FormEvent } from 'react';
import { request, type Knowledge } from './api';
import { ErrorNotice, Modal } from './components';
import { PracticeDraftAssist } from './PracticeDraftAssist';
import type { PracticeDraftFields } from '../../../src/workspace/practice-drafting';

export function KnowledgeEditor({
  item,
  initialBody,
  close,
  saved,
}: {
  item: Knowledge;
  initialBody?: string;
  close: () => void;
  saved: (item: Knowledge) => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const [assisting, setAssisting] = useState(false);
  const [draft, setDraft] = useState<PracticeDraftFields>({ title: item.latest.title, body: initialBody ?? item.latest.body, kind: item.kind });
  const dismiss = () => {
    if (!busy && !assisting && (!dirty || confirm('Discard these unsaved practice edits?'))) close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || assisting) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      saved(
        await request<Knowledge>(`/knowledge/${item.id}/revisions`, {
          expectedRevisionId: item.latest.id,
          title: form.get('title'),
          body: form.get('body'),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        initialBody !== undefined ? 'Propose a practice update' : item.latest.status === 'pending' ? 'Edit proposed practice item' : 'Propose a practice update'
      }
      onClose={dismiss}
      busy={busy}
    >
      <form className="record-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <p className="form-intro">
          Save a new version for review.{' '}
          {item.importedOriginal
            ? 'Your imported original remains available to chats until you approve this replacement.'
            : item.active
            ? 'Your currently approved version stays in use until you approve its replacement.'
            : 'This text will not enter normal retrieval until you approve it.'}{' '}
          Earlier text, citations and approval names remain unchanged.
        </p>
        <PracticeDraftAssist value={draft} matterId={item.matterId} busyChanged={setAssisting} disabled={busy} kindLocked
          apply={value => { setDraft({ ...value, kind: item.kind }); setDirty(true); }} />
        <p className="fine-print">
          {item.matterId
            ? 'Scope stays limited to this matter.'
            : 'Scope stays practice-wide: approved practice material can be used across matters.'}
        </p>
        <label>
          Practice item title
          <input
            name="title"
            value={draft.title}
            onChange={e => setDraft(current => ({ ...current, title: e.target.value }))}
            required
            maxLength={300}
            disabled={busy || assisting}
          />
        </label>
        <label>
          Proposed practice material
          <textarea
            aria-label="Proposed practice material"
            name="body"
            value={draft.body}
            onChange={e => setDraft(current => ({ ...current, body: e.target.value }))}
            required
            rows={12}
            maxLength={1_000_000}
            disabled={busy || assisting}
          />
        </label>
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" disabled={busy || assisting} onClick={dismiss}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy || assisting}>
            {busy ? 'Saving proposal…' : 'Save for review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
