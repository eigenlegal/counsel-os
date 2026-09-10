import { useState, type FormEvent } from 'react';
import { request, type Work } from './api';
import { ErrorNotice, Modal } from './components';

export function OutputEditor({
  workId,
  title,
  close,
  saved,
}: {
  workId: string;
  title: string;
  close: () => void;
  saved: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const dismiss = () => {
    if (!busy && (!dirty || confirm('Discard these unsaved output details?'))) close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await request<Work>(`/work/${workId}/output`, {
        title: form.get('title'),
        kind: form.get('kind'),
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Save as output" onClose={dismiss} busy={busy}>
      <form className="record-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <p className="form-intro">
          Keep this answer as a named deliverable. Its text, citations, and link to the conversation
          stay intact. It remains a draft.
        </p>
        <label>
          Output title
          <input name="title" defaultValue={title} required maxLength={300} disabled={busy} />
        </label>
        <label>
          Type
          <select aria-label="Type" name="kind" defaultValue="draft" disabled={busy}>
            <option value="draft">Draft</option>
            <option value="memo">Memo</option>
            <option value="assessment">Assessment</option>
            <option value="email">Email</option>
            <option value="chronology">Chronology</option>
            <option value="other">Other output</option>
          </select>
        </label>
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" onClick={dismiss} disabled={busy}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save output'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
