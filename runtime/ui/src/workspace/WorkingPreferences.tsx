import { useEffect, useState, type FormEvent } from 'react';
import { request, type Snapshot } from './api';
import { ErrorNotice } from './components';
import { PracticeDraftAssist } from './PracticeDraftAssist';
import { WorkingPreferenceFields, type WorkingPreferences as SavedPreferences } from '../../../src/workspace/working-preferences';
import { FilenameExamples } from './FilenameExamples';
import { PreferenceDraft } from '../../../src/workspace/draft-types';
import { useDraftRecovery, DraftRecoveryNotice } from './useDraftRecovery';

function fieldsOf(value: SavedPreferences | null | undefined): WorkingPreferenceFields {
  const defaults = WorkingPreferenceFields.parse({});
  return WorkingPreferenceFields.parse(Object.fromEntries(Object.keys(defaults).map(key =>
    [key, value?.[key as keyof WorkingPreferenceFields] ?? defaults[key as keyof WorkingPreferenceFields]])));
}

export function WorkingPreferences({ data, changed, editProfile, section = 'documents' }: { data: Snapshot; changed: () => void; editProfile: () => void; section?: 'writing' | 'documents' }): JSX.Element {
  const storageKey = `counsel-working-preferences-draft:${data.databasePath}`;
  const recovery = useDraftRecovery<PreferenceDraft | null>('working-preferences', () => {
    try {
      const local = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (PreferenceDraft.safeParse(local).success) return PreferenceDraft.parse(local);
    } catch { /* A malformed or unavailable local draft does not block the form. */ }
    return null;
  }, (data.interfaceVersion ?? 0) >= 29, storageKey, () => null);
  const [lastSaved, setLastSaved] = useState<SavedPreferences | null>(data.workingPreferences ?? null);
  const saved = recovery.value ? recovery.value.saved : lastSaved;
  const fields = recovery.value?.fields ?? fieldsOf(lastSaved);
  const dirty = recovery.value !== null;
  const [busy, setBusy] = useState(false), [assisting, setAssisting] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [helper, setHelper] = useState<'generalReview' | 'ndaReview'>('ndaReview');
  const change = <K extends keyof WorkingPreferenceFields>(key: K, value: WorkingPreferenceFields[K]) => {
    recovery.set({ fields: { ...fields, [key]: value }, saved }); setNotice('');
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || assisting) return;
    setBusy(true); setError('');
    try {
      if (!await recovery.flush()) throw new Error('Resolve draft recovery before applying these preferences. Your edits are still here.');
      const result = await request<SavedPreferences>('/working-preferences', { ...fields, expectedRevisionId: saved?.revisionId ?? null });
      setLastSaved(result); recovery.set(null); await recovery.flush(); setNotice('Saved. New responses will use these preferences; earlier responses keep their original settings.'); changed();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function reload() {
    if (dirty && !window.confirm('Discard these unsaved preferences and load the saved version?')) return;
    setBusy(true);
    try { const result = await request<SavedPreferences | null>('/working-preferences'); setLastSaved(result); recovery.set(null); await recovery.flush(); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const author = fields.authorMode === 'profile' ? data.profile?.name ?? 'Counsel' : fields.authorMode === 'custom' ? fields.customAuthor : 'Counsel';
  return <section className="working-preferences-editor" aria-label="Working preferences editor">
    {(data.interfaceVersion ?? 0) >= 29 && <DraftRecoveryNotice recovery={recovery} />}
    {dirty && <p className="field-help">These edits are not in use until you save working preferences.</p>}
    <p className="field-help">{section === 'writing' ? 'Your writing defaults and recorded signing guidance. These fields are supplied to new chats independently of profile sharing.' : 'Standing instructions for how Counsel reviews documents. These are separate from your legal positions.'}</p>
    <p className="field-help">You can also ask in chat: “For future NDA reviews, explain material edits in short comments.” Counsel will show the proposed wording for your confirmation before saving it here.</p>
    <form className="record-form" onSubmit={save}><fieldset className="draft-fields" disabled={!recovery.ready}>
      {section === 'writing' ? <>
        <label>Writing instructions<textarea aria-label="Writing instructions" rows={16} value={fields.writingInstructions} maxLength={16000} disabled={busy || assisting}
          placeholder="How you want Counsel to write, including differences for chat, memos, emails, and other audiences. Markdown is supported."
          onChange={e => change('writingInstructions', e.target.value)} /></label>
        <p className="field-help">Included in full with new responses, not shortened or selected through search. Audience-specific rules apply only to that kind of work. These instructions take precedence over an older profile writing excerpt.</p>
        <label>Signing guidance<textarea aria-label="Signing guidance" rows={7} value={fields.signingInstructions} maxLength={4000} disabled={busy || assisting}
          placeholder="Who may sign which agreements, for which entities, and within what limits."
          onChange={e => change('signingInstructions', e.target.value)} /></label>
        <p className="field-help">Recorded guidance only. Counsel cannot verify authority, automatically fill signing details, or sign a document. It should ask when the entity, agreement type, currency, or value basis is unclear.</p>
      </> : <>
      <label>General document review
        <textarea aria-label="General document review" rows={4} value={fields.generalReview} maxLength={4000} disabled={busy || assisting}
          placeholder="e.g. Preserve the document’s structure. Focus on material issues and explain important edits briefly."
          onChange={e => change('generalReview', e.target.value)} /></label>
      <label>NDA review instructions
        <textarea aria-label="NDA review instructions" rows={5} value={fields.ndaReview} maxLength={4000} disabled={busy || assisting}
          placeholder="e.g. Make surgical edits to NDAs. Keep the other side’s language where acceptable. Use comments to explain material changes, not every edit."
          onChange={e => change('ndaReview', e.target.value)} /></label>
      <div className="preference-helper-target"><label>Help draft
        <select aria-label="Help draft" value={helper} disabled={busy || assisting} onChange={e => setHelper(e.target.value as typeof helper)}>
          <option value="ndaReview">NDA review instructions</option><option value="generalReview">General document review</option>
        </select></label></div>
      <PracticeDraftAssist key={helper} target="instructions" value={{ title: helper === 'ndaReview' ? 'NDA review instructions' : 'General document review', kind: 'method', body: fields[helper] }}
        busyChanged={setAssisting} disabled={busy} apply={value => change(helper, value.body)} />
      <p className="field-help">These instructions are included automatically with each new chat response and drafting request. NDA instructions apply only to NDA work. Task-specific directions take precedence. Saving here changes your defaults; matter concessions do not.</p>
      <h2>Word output</h2>
      <div className="form-pair"><label>Changes and comments attributed to
        <select aria-label="Changes and comments attributed to" value={fields.authorMode} disabled={busy || assisting} onChange={e => change('authorMode', e.target.value as typeof fields.authorMode)}>
          <option value="counsel">Counsel</option><option value="profile">Your profile name{data.profile ? ` · ${data.profile.name}` : ''}</option><option value="custom">A custom name</option>
        </select></label>
        {fields.authorMode === 'custom' && <label>Word author name<input required maxLength={200} value={fields.customAuthor} disabled={busy || assisting} onChange={e => change('customAuthor', e.target.value)} /></label>}
      </div>
      <label>Word filename pattern<input required maxLength={180} value={fields.filenamePattern} disabled={busy || assisting} onChange={e => change('filenamePattern', e.target.value)} /></label>
      <p className="field-help">Use {'{document}'}, {'{variant}'}, {'{date}'} (UTC), and {'{author}'}. Counsel adds .docx. Applies to new redlines and answer exports.</p>
      <details className="profile-options">
        <summary>Customize filename labels</summary>
        <p className="field-help">Choose what {'{variant}'} becomes for each output. For example, “ExampleCo redline” and “Draft”.</p>
        <div className="form-pair">
          <label>Redline label<input required maxLength={80} value={fields.redlineLabel} disabled={busy || assisting} onChange={e => change('redlineLabel', e.target.value)} /></label>
          <label>Draft label<input required maxLength={80} value={fields.draftLabel} disabled={busy || assisting} onChange={e => change('draftLabel', e.target.value)} /></label>
        </div>
      </details>
      <FilenameExamples pattern={fields.filenamePattern} author={author} redlineLabel={fields.redlineLabel} draftLabel={fields.draftLabel} />
      <p className="field-help">Attribution changes only new changes and comments made by Counsel; earlier reviewers keep their names. It does not indicate human approval. Word settings are applied locally, even when profile sharing is off. Clean-copy generation is not automated yet.</p>
      </>}
      {notice && <p role="status">{notice}</p>}{error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><button type="button" className="button button-quiet" disabled={busy || assisting} onClick={() => void reload()}>Reload saved preferences</button>
        <button className="button button-primary" disabled={busy || assisting || !dirty}>{busy ? 'Saving…' : 'Save working preferences'}</button></div>
    </fieldset></form>
  </section>;
}
