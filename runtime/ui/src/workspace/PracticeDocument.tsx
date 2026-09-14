import { useEffect, useState } from 'react';
import { request } from './api';
import { ErrorNotice, Modal } from './components';
import { DocumentReader, DocumentViewControls, type TextDisplay } from './DocumentReader';
import { Icon } from './icons';
import { FilenameExamples } from './FilenameExamples';
import { useDraftRecovery, DraftRecoveryNotice } from './useDraftRecovery';
import { legacyPracticeContent, type PracticeDocumentView, type PracticeDocumentDraft } from '../../../src/workspace/practice-document';
import { startDraftChat } from './chat-handoff';
import { PracticeSources } from './PracticeSources';
import { PracticeSupport } from './PracticeSupport';

export async function developPracticeInChat(draft?: string, attachments: string[] = []) {
  const message = attachments.length ? 'Please read these attached profile and preference files and incorporate the relevant information into my practice document. Preserve unrelated existing preferences. Resolve the clearly stated identity and Word output preferences, ask about genuine conflicts, and show me one proposed update before saving.' : draft === undefined
    ? 'Help me develop my practice profile and preferences. Read my current practice document, then help me describe how I work and what Counsel should remember. Ask focused questions where needed, and show me a proposed update before saving.'
    : `Please help me organize and incorporate this draft into my practice profile and preferences. Read the current practice document, preserve unrelated information, and show me a proposed update before saving. Resolve any clearly stated name and Word output preferences too.\n\n${draft}`;
  if (message.length > 30_000) throw new Error('Save this longer document first, then choose Develop in chat. Counsel can read the saved document in full. Your draft is unchanged.');
  await startDraftChat(message, attachments);
}

export function AppliedPracticeDetails({ value }: { value: Pick<PracticeDocumentView, 'identityName' | 'word' | 'entities'> }) {
  const registryText = legacyPracticeContent(null, null, { ...value.entities, revisionId: '00000000-0000-4000-8000-000000000000', version: 1, updatedAt: '2026-01-01T00:00:00.000Z' }).body;
  return <div className="practice-applied-details">
    <p>Exact values used to carry out your instructions. Ask Counsel to update these together with the text.</p>
    <dl><div><dt>Recorded name</dt><dd>{value.identityName ?? 'Not confirmed yet'}</dd></div>
      <div><dt>New Word changes and comments</dt><dd>{value.word.author}</dd></div>
      <div><dt>Word filenames</dt><dd><code>{value.word.filenamePattern}</code><FilenameExamples pattern={value.word.filenamePattern} author={value.word.author} redlineLabel={value.word.redlineLabel} draftLabel={value.word.draftLabel} /></dd></div></dl>
    {!!registryText && <><p>{value.entities.availableToChats ? 'Recorded entity details are available when this practice document is used in chats.' : 'Recorded entity details are not shared with ordinary chats.'}</p><DocumentReader text={registryText} markdown /></>}
  </div>;
}

export function PracticeDocumentPage({ value, changed, startEditing = false, imported = [], onChatStarted, sourcePicker = false }: { value: PracticeDocumentView; changed: () => void; startEditing?: boolean; imported?: Array<{ title: string; revisionId: string }>; onChatStarted?: () => void; sourcePicker?: boolean }) {
  const [current, setCurrent] = useState(value), [editing, setEditing] = useState(startEditing);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [choosingSources, setChoosingSources] = useState(false);
  const [display, setDisplay] = useState<TextDisplay>('reading');
  useEffect(() => setCurrent(value), [value.basis]);
  async function chat(useImported = false) {
    setBusy(true); setError('');
    try { await developPracticeInChat(undefined, useImported ? imported.map(file => file.revisionId) : []); onChatStarted?.(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="practice-document" aria-label="Your practice">
    <header className="practice-document-heading"><h2>Your practice</h2>
      {!editing && <div className="practice-document-actions"><button className="button button-primary" disabled={busy} onClick={() => void chat()}><Icon name="chat" size={16} />Develop in chat</button>
        <button className="button" onClick={() => setEditing(true)}>{current.body ? 'Edit text' : 'Write or paste text'}</button></div>}
      <p>Your work, your preferences, and what Counsel should remember.</p>
    </header>
    {error && <ErrorNotice message={error} />}
    <span className="sr-only" role="status">{notice}</span>
    {editing ? <PracticeDocumentEditor value={current} onChatStarted={onChatStarted} cancel={() => setEditing(false)} saved={next => { setCurrent(next); setEditing(false); setNotice('Saved for future work. Earlier responses keep their original context.'); changed(); }} /> : <>
      {current.body ? <div className="practice-document-paper">
        <div className="practice-document-toolbar"><DocumentViewControls display={display} change={setDisplay} compact />
          <p className="practice-document-status" title="Earlier responses keep their original context.">{current.saved ? `Version ${current.saved.version} · ${current.useInChats ? 'Used in new responses' : 'Not shared with chats'}` : 'Existing saved context'}</p></div>
        <DocumentReader text={current.body} markdown display={display} /></div>
        : <div className="practice-document-empty"><h3>Tell Counsel how you work.</h3><p>Describe your work, paste your existing instructions, or start with a preference. You can work out the wording together.</p>
          <p>Counsel proposes what to remember. You review it before it becomes a default.</p></div>}
      {current.body && !current.saved && <p className="practice-document-legacy">Your existing saved information, brought together without changing it. Edit or develop it in chat to make this your practice document.</p>}
      {sourcePicker && <div className="practice-imported-instructions"><button className="button button-quiet" onClick={() => setChoosingSources(true)}>Use saved instructions</button><p className="fine-print">Bring in context from any saved files, including later additions. Counsel proposes how to combine it with this document; you confirm the changes.</p></div>}
      {!sourcePicker && !current.saved && !!imported.length && <div className="practice-imported-instructions"><p>Already brought your instructions? These saved files can be the starting point: {imported.map(file => file.title).join(', ')}.</p>
        <button className="button" disabled={busy} onClick={() => void chat(true)}>Develop from these files</button><p className="fine-print">Adds these files to a new chat for Counsel to read. You review the resulting practice update before applying it.</p></div>}
      <details className="practice-document-details"><summary>Applied details</summary><AppliedPracticeDetails value={current} /></details>
      <PracticeSupport text={current.body} />
    </>}
    {choosingSources && <PracticeSources close={() => setChoosingSources(false)} started={onChatStarted} />}
  </section>;
}

function PracticeDocumentEditor({ value, cancel, saved, onChatStarted }: { value: PracticeDocumentView; cancel: () => void; saved: (value: PracticeDocumentView) => void; onChatStarted?: () => void }) {
  const recovery = useDraftRecovery<PracticeDocumentDraft | null>('practice-document', () => null, true, undefined, () => null);
  const draft = recovery.value;
  const before = draft?.before ?? value, text = draft?.body ?? value.body, sharing = draft?.useInChats ?? value.useInChats;
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const change = (body: string, useInChats = sharing) => recovery.set({ body, useInChats, before: { basis: before.basis } });
  async function save() {
    if (busy) return; setBusy(true); setError('');
    try {
      if (!await recovery.flush()) throw new Error('Resolve draft recovery before saving. Your text is still here.');
      const next = await request<PracticeDocumentView>('/practice-document', { body: text, useInChats: sharing, expectedBasis: before.basis });
      recovery.set(null); await recovery.flush(); saved(next);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function chat() {
    setBusy(true); setError('');
    try { if (!await recovery.flush()) throw new Error('Resolve draft recovery first.'); await developPracticeInChat(text); onChatStarted?.(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="practice-document-editor">
    <p>Use your own words. No required categories or headings. You can include background, preferences, examples, and instructions for any kind of work.</p>
    <label htmlFor="practice-document-text">Practice document</label>
    <textarea id="practice-document-text" value={text} disabled={busy || !recovery.ready} rows={16}
      placeholder="Tell Counsel about your work and how you like to approach it. Paste existing instructions here, or start in chat…"
      onChange={e => change(e.target.value)} />
    {text.length > 64_000 && <p role="alert">This text exceeds the current 64,000-character practice-context limit. Nothing was shortened. Keep a copy and reorganize it before saving or closing.</p>}
    <label className="checkbox-label"><input type="checkbox" checked={sharing} disabled={busy || !recovery.ready} onChange={e => change(text, e.target.checked)} />Use this document automatically in new responses</label>
    <p className="fine-print">Saved text becomes your standing context. Word author and other exact applied details change through a reviewed chat update—not by guessing from an edit.</p>
    <DraftRecoveryNotice recovery={recovery} />
    {error && <ErrorNotice message={error} />}
    <div className="practice-document-actions"><button className="button" disabled={busy || !recovery.ready} onClick={() => void chat()}>Develop this draft in chat</button>
      <button className="button button-quiet" disabled={busy} onClick={cancel}>Keep draft and close</button>
      <button className="button button-primary" disabled={busy || !recovery.ready} onClick={() => void save()}>Save text</button></div>
  </div>;
}

export function PracticeDocumentModal({ value, close, changed, startEditing = false }: { value: PracticeDocumentView; close: () => void; changed: () => void; startEditing?: boolean }) {
  return <Modal title="Your practice" onClose={close}><PracticeDocumentPage value={value} changed={changed} onChatStarted={close} startEditing={startEditing} /></Modal>;
}

/** Ask for the one exact value at the point an approval needs it; no profile form
 * and no AI connection required to record a local human decision. */
export function ConfirmPracticeIdentity({ value, close, saved }: { value: PracticeDocumentView; close: () => void; saved: () => void }) {
  const [name, setName] = useState(value.identityName ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <Modal title="What name should we record?" onClose={close} busy={busy}><form className="record-form" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await request('/practice-document/identity', { name, expectedBasis: value.basis }); saved(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }}><p>This name records your approvals and is added to your practice document. It does not approve the item or change your Word author.</p>
    <label>Your name<input required maxLength={200} value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label>
    {error && <ErrorNotice message={error} />}<div className="dialog-actions"><button type="button" className="button" disabled={busy} onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>Confirm name</button></div></form></Modal>;
}
