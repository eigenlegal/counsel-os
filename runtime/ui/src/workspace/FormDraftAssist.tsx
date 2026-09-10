import { useEffect, useRef, useState, type ReactNode } from 'react';
import { request, type ConnectionStatus } from './api';
import { ErrorNotice } from './components';
import { Icon } from './icons';

/** Suggestions fill the unsaved form, never its backing record. */
export function FormDraftAssist<T>({ value, apply, busyChanged, disabled = false, placeholder,
  shared, run, label = 'Help me draft this' }: {
  value: T; apply: (value: T) => void; busyChanged: (busy: boolean) => void; disabled?: boolean;
  placeholder: string; shared: ReactNode; label?: string;
  run: (instruction: string, before: T, connection: ConnectionStatus, signal: AbortSignal) =>
    Promise<{ value: T; question: string; receipt?: ReactNode }>;
}): JSX.Element {
  const [open, setOpen] = useState(false), [instruction, setInstruction] = useState('');
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<ReactNode>(null);
  const [undo, setUndo] = useState<{ before: T; after: T } | null>(null);
  const active = useRef<AbortController | null>(null);
  const current = useRef(value); current.current = value;
  const callback = useRef(busyChanged); callback.current = busyChanged;
  useEffect(() => () => { active.current?.abort(); callback.current(false); }, []);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    request<ConnectionStatus>('/practice-drafting', undefined, abort.signal).then(setConnection).catch(e => {
      if (!abort.signal.aborted) setError(e.message);
    });
    return () => abort.abort();
  }, [open]);
  async function draft() {
    if (active.current || disabled || !instruction.trim() || !connection?.ready || !connection.config) return;
    const abort = new AbortController(), before = structuredClone(value);
    active.current = abort; setBusy(true); busyChanged(true); setError(''); setMessage(''); setReceipt(null);
    try {
      const result = await run(instruction, before, connection, abort.signal);
      if (abort.signal.aborted || active.current !== abort) return;
      setReceipt(result.receipt ?? null);
      if (result.question.trim()) { setMessage(result.question); return; }
      if (JSON.stringify(current.current) !== JSON.stringify(before)) {
        setError('Your form changed while Counsel was drafting. It has not been overwritten. Try again using your latest text.'); return;
      }
      apply(result.value); setUndo({ before, after: result.value });
      setMessage('Draft added to the form. Edit it below or give another instruction. Nothing has been saved.');
    } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
    finally { if (active.current === abort) { active.current = null; setBusy(false); busyChanged(false); } }
  }
  function stop() {
    active.current?.abort(); active.current = null; setBusy(false); busyChanged(false);
    setMessage('Drafting stopped. Your form is unchanged.');
  }
  function undoDraft() {
    if (!undo) return;
    if (JSON.stringify(value) !== JSON.stringify(undo.after) && !window.confirm('Undo the suggestion and your later edits to these fields?')) return;
    apply(undo.before); setUndo(null); setMessage('Previous form text restored. Nothing has been saved.');
  }
  return <section className={`draft-assist${open ? ' is-open' : ''}`} aria-label="Drafting assistance">
    <div className="draft-assist-heading">
      <button type="button" className="draft-assist-toggle" aria-expanded={open} disabled={disabled || busy}
        onClick={() => setOpen(!open)}><Icon name="work" size={16} /><span>{label}</span><Icon name="chevron" size={14} /></button>
      <p>Describe the change. Review the draft before saving.</p>
    </div>
    {open && <div className="draft-assist-body">
      <label>What would you like to say?
        <textarea aria-label="What would you like to say?" rows={3} maxLength={4000} value={instruction} disabled={busy || disabled}
          placeholder={placeholder} onChange={e => setInstruction(e.target.value)} />
      </label>
      <div className="draft-assist-actions">
        <button type="button" className="button" disabled={busy || disabled || !instruction.trim() || !connection?.ready}
          onClick={() => void draft()}>{busy ? 'Drafting…' : 'Draft into form'}</button>
        {busy && <button type="button" className="text-button" onClick={stop}>Stop drafting</button>}
        {undo && <button type="button" className="text-button" disabled={busy || disabled} onClick={undoDraft}>Undo suggestion</button>}
      </div>
      <p className="fine-print">{connection ? connection.ready ? `${connection.label} · ${connection.config?.model}` : 'No AI connection. You can still fill out this form manually.' : 'Checking your AI connection…'}</p>
      <details className="fine-print"><summary>What is shared?</summary>{shared} Opening this helper makes no model call.</details>
      {message && <p className="draft-assist-message" role="status">{message}</p>}
      {receipt}
      {error && <ErrorNotice message={error} />}
    </div>}
  </section>;
}
