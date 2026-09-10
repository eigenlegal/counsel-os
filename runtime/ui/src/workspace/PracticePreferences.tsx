import { useState } from 'react';
import { href, type Snapshot } from './api';
import { Badge } from './components';
import { DocumentReader } from './DocumentReader';
import { ProfileCard } from './Profile';
import { WorkingPreferences } from './WorkingPreferences';
import { EntityDirectory } from './EntityDirectory';
import { FilenameExamples } from './FilenameExamples';

/** One home for personal context and review preferences; viewing never changes sharing or settings. */
export function PracticePreferences({ data, changed, editProfile, view }: {
  data: Snapshot; changed: () => void; editProfile: () => void; view: string | null;
}): JSX.Element {
  const documents = view === 'documents';
  const writing = view === 'writing';
  const entities = view === 'entities';
  return <section className="practice-preferences-section" aria-label="Profile and preferences">
    <nav className="preference-views" aria-label="Preference views">
      <a href={href('knowledge', { section: 'preferences' })} aria-current={!documents && !writing && !entities ? 'page' : undefined}>Your profile</a>
      <a href={href('knowledge', { section: 'preferences', view: 'writing' })} aria-current={writing ? 'page' : undefined}>Writing &amp; signing</a>
      <a href={href('knowledge', { section: 'preferences', view: 'documents' })} aria-current={documents ? 'page' : undefined}>Document review &amp; Word output</a>
      <a href={href('knowledge', { section: 'preferences', view: 'entities' })} aria-current={entities ? 'page' : undefined}>Entities &amp; signatories</a>
    </nav>
    {entities ? <EntityDirectory data={data} changed={changed} /> : documents || writing ? <ReviewPreferences data={data} changed={changed} editProfile={editProfile} writing={writing} />
      : <ProfileCard profile={data.profile} edit={editProfile} />}
  </section>;
}

function ReviewPreferences({ data, changed, editProfile, writing }: { data: Snapshot; changed: () => void; editProfile: () => void; writing: boolean }): JSX.Element {
  const [editing, setEditing] = useState(() => {
    if (data.hasPreferenceDraft) return true;
    try { return !!sessionStorage.getItem(`counsel-working-preferences-draft:${data.databasePath}`); }
    catch { return false; }
  });
  const saved = data.workingPreferences;
  if (editing) return <>
    <button className="text-button preference-back" onClick={() => setEditing(false)}>View saved preferences</button>
    <WorkingPreferences data={data} changed={changed} editProfile={editProfile} section={writing ? 'writing' : 'documents'} />
  </>;
  if (writing) return <section className="settings-section preference-reading" aria-label="Saved writing and signing preferences">
    <div className="section-heading"><div><h2>Writing &amp; signing</h2><p>Your writing defaults and recorded signing guidance.</p></div>
      <button className="button" onClick={() => setEditing(true)}>Edit writing &amp; signing</button></div>
    {saved && <Badge tone="blue">Version {saved.version} · Used for new responses</Badge>}
    {([['writingInstructions', 'Writing instructions'], ['signingInstructions', 'Signing guidance']] as const).map(([key, label]) =>
      <section className="preference-reading-field" key={key} aria-label={label}><h3>{label}</h3>
        {saved?.[key] ? <DocumentReader text={saved[key]} markdown /> : <p className="field-help">No instructions saved.</p>}
      </section>)}
    <p className="fine-print">Supplied to new chats in full, independently of profile sharing. Signing guidance does not verify authority or automatically fill or sign documents. Earlier responses keep their saved instruction versions.</p>
  </section>;
  const author = saved?.authorMode === 'custom' ? saved.customAuthor
    : saved?.authorMode === 'profile' ? data.profile?.name || 'Counsel' : 'Counsel';
  return <section className="settings-section preference-reading" aria-label="Saved document preferences">
    <div className="section-heading"><div><h2>Document review &amp; Word output</h2><p>Your standing review instructions and how new Word files are prepared.</p></div>
      <button className="button" onClick={() => setEditing(true)}>{saved ? 'Edit working preferences' : 'Set review preferences'}</button></div>
    {saved ? <>
      <Badge tone="blue">Version {saved.version} · Used for new responses</Badge>
      {([['generalReview', 'General document review'], ['ndaReview', 'NDA review instructions']] as const).map(([key, label]) =>
        <section className="preference-reading-field" key={key} aria-label={label}>
          <h3>{label}</h3>{saved[key] ? <DocumentReader text={saved[key]} markdown /> : <p className="field-help">No standing instructions saved.</p>}
        </section>)}
      <p className="field-help">NDA instructions apply to NDA work. Your task-specific directions take precedence; deal concessions do not change these defaults.</p>
    </> : <p className="profile-intro">No review preferences are saved yet. Add instructions for general document reviews or NDAs, and choose the author name and filename pattern for Word output.</p>}
    <dl className="preference-word-details"><div><dt>New changes and comments attributed to</dt><dd>{author}</dd></div>
      <div><dt>Word filename pattern</dt><dd><code>{saved?.filenamePattern ?? '{document} - {variant}'}</code>
        <FilenameExamples pattern={saved?.filenamePattern ?? '{document} - {variant}'} author={author} redlineLabel={saved?.redlineLabel} draftLabel={saved?.draftLabel} />
      </dd></div></dl>
    <p className="fine-print">Word settings apply locally, even when profile sharing is off. Earlier reviewers keep their names. Attribution does not indicate human approval.</p>
  </section>;
}
