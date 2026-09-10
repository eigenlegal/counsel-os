import { useState, type FormEvent } from 'react';
import { request, type Snapshot, type Conversation } from './api';
import { Modal, ErrorNotice } from './components';
import { MatterPicker } from './MatterPicker';

export function OrganizeConversation({
  id,
  data,
  close,
  saved,
}: {
  id: string;
  data: Snapshot;
  close: () => void;
  saved: (conversation: Conversation) => void;
}): JSX.Element {
  const [target, setTarget] = useState('new'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [dirty, setDirty] = useState(false),
    [requestId] = useState(() => crypto.randomUUID());
  const dismiss = () => {
    if (!busy && (!dirty || confirm('Discard this unsaved matter selection?'))) close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      saved(
        await request<Conversation>(`/conversations/${id}/organize`, {
          requestId,
          confirmShare: true,
          ...(target === 'new' ? { title: form.get('title') } : { matterId: target }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Organize into a matter" onClose={dismiss} busy={busy}>
      <form className="record-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <label>
          Matter
          <MatterPicker
            value={target}
            onChange={(value) => { setTarget(value); setDirty(true); }}
            disabled={busy}
            matters={data.matters}
            choices={[{ value: 'new', label: 'Create a new matter' }]}
          />
        </label>
        {target === 'new' && (
          <label>
            Matter name
            <input
              aria-label="Matter name"
              name="title"
              required
              maxLength={300}
              disabled={busy}
              placeholder="The question or engagement you’re working on"
            />
          </label>
        )}
        <p className="form-intro">
          This conversation and its saved answers will join the matter. Attached documents,
          including their other versions, become available to its other chats. Existing document
          links are kept. Future replies can use the matter’s context; earlier response context
          stays unchanged.
        </p>
        <label className="checkbox-label">
          <input type="checkbox" required disabled={busy} />
          Include this conversation and its documents in the matter
        </label>
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" onClick={dismiss} disabled={busy}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? 'Organizing…' : 'Organize conversation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
