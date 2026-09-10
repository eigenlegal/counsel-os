import { createContext, useContext, useEffect, useState, type FormEvent } from 'react';
import { href, request, type ProfileFields, type WorkspaceProfile } from './api';
import { Badge, ErrorNotice, Modal } from './components';
import { DocumentReader, DocumentViewControls, type TextDisplay } from './DocumentReader';

const EMPTY: ProfileFields = {
  name: '',
  role: '',
  organization: '',
  organizationContext: '',
  practiceAreas: '',
  jurisdictions: '',
  principles: '',
  voice: '',
  escalationThresholds: '',
  applyToChats: true,
};
export const ProfileSetupContext = createContext<(() => void) | null>(null);
const IDENTITY_GUIDANCE = 'When profile sharing is on, Counsel is instructed to use this saved identity—not your AI login—and ask when identity details are missing.';
const LOGIN_CONTEXT_NOTE = 'Claude Code may independently include login details in its context. These instructions and the profile-sharing switch do not remove that information.';
type LongField = readonly [Exclude<keyof ProfileFields, 'applyToChats'>, string, string, number];
const sections: ReadonlyArray<readonly [string, ReadonlyArray<LongField>]> = [
  [
    'Practice context',
    [
      [
        'organizationContext',
        'Organization context',
        'What your organization does and the work you support.',
        2000,
      ],
      [
        'practiceAreas',
        'Practice areas',
        'e.g. Employment, privacy, commercial advice, investigations',
        1000,
      ],
      [
        'jurisdictions',
        'Jurisdictions',
        'Where you usually work; individual matters can differ.',
        1000,
      ],
    ],
  ],
  [
    'Working preferences',
    [
      [
        'principles',
        'Principles and risk approach',
        'What you prioritize, how you weigh risk, and how you handle uncertainty.',
        3000,
      ],
      [
        'voice',
        'Writing and communication',
        'Optional short profile excerpt. Keep complete writing defaults in Practice → Profile & preferences → Writing & signing.',
        2000,
      ],
      [
        'escalationThresholds',
        'When to flag or escalate',
        'Issues or thresholds Counsel should bring to your attention. This does not send notifications.',
        2000,
      ],
    ],
  ],
] as const;

export function ProfileDetails({ profile, showIdentity = true }: { profile: WorkspaceProfile; showIdentity?: boolean }): JSX.Element {
  const [display, setDisplay] = useState<TextDisplay>('reading');
  const hasPreferences = sections.flatMap(([, fields]) => fields).some(([key]) => !!profile[key]);
  return (
    <div className="profile-details-view">
    {hasPreferences && <div className="profile-reader-toolbar">
      <span>{showIdentity ? 'Saved profile' : 'Practice preferences'}</span>
      <DocumentViewControls display={display} change={setDisplay} compact />
    </div>}
    <dl className="profile-details">
      {showIdentity && <><div>
        <dt>Name</dt>
        <dd>{profile.name}</dd>
      </div>
      {(['role', 'organization'] as const).map(
        (key) =>
          profile[key] && (
            <div key={key}>
              <dt>{key === 'role' ? 'Role' : 'Organization'}</dt>
              <dd>{profile[key]}</dd>
            </div>
          ),
      )}
      </>}
      {sections
        .flatMap(([, fields]) => fields)
        .map(
          ([key, label]) =>
            profile[key] && (
              <div key={key}>
                <dt>{label}</dt>
                <dd className="profile-reading-field"><DocumentReader text={profile[key]} markdown display={display} />
                  {key === 'voice' && <p className="fine-print">This is the profile’s saved excerpt. Manage full writing defaults in <a href={href('knowledge', { section: 'preferences', view: 'writing' })}>Writing &amp; signing</a>; those instructions take precedence for new responses.</p>}
                </dd>
              </div>
            ),
        )}
    </dl>
    </div>
  );
}

export function ProfileCard({
  profile,
  edit,
}: {
  profile: WorkspaceProfile | null;
  edit: () => void;
}): JSX.Element {
  return (
    <section className="settings-section profile-card" aria-label="Your profile">
      <div className="section-heading">
        <div>
          <h2>Your profile</h2>
          <p>Your practice context and how Counsel works with you.</p>
        </div>
        <div className="profile-card-actions">{profile && (
          <Badge tone={profile.applyToChats ? 'blue' : 'neutral'}>
            {profile.applyToChats ? 'Applied to new responses' : 'Profile sharing off'}
          </Badge>
        )}<button className={`button${profile ? '' : ' button-primary'}`} onClick={edit}>
          {profile ? 'Edit profile' : 'Set up profile'}
        </button></div>
      </div>
      {profile ? (
        <>
          <p className="profile-name">{profile.name}</p>
          {(profile.role || profile.organization) && (
            <p>{[profile.role, profile.organization].filter(Boolean).join(' · ')}</p>
          )}
          <p className="profile-identity-guidance">{IDENTITY_GUIDANCE}{' '}
            Word changes and comments use your separate <a href={href('knowledge', { section: 'preferences', view: 'documents' })}>Word author setting</a>.
          </p>
          <ProfileDetails profile={profile} showIdentity={false} />
          <p className="fine-print">
            Your approvals and decisions are recorded under this name. Earlier records keep the name
            used at the time.
          </p>
          <p className="fine-print">{LOGIN_CONTEXT_NOTE}</p>
        </>
      ) : (
        <p className="profile-intro">
          Set your name once for approvals and decisions. Add your role, practice context, and
          writing preferences whenever you’re ready. This is your local profile, not a new account.
        </p>
      )}
    </section>
  );
}

/** Shared attribution for chat review, the library reader, and recorded decisions. */
export function ProfileAttribution({ profile }: { profile: WorkspaceProfile | null }): JSX.Element {
  const setup = useContext(ProfileSetupContext);
  return (
    <p className="profile-attribution">
      {profile ? (
        <>
          Recorded as <strong>{profile.name}</strong>. Your explicit choice is still required.
        </>
      ) : (
        <>
          Set your name once to record your decision.{' '}
          {setup ? (
            <button type="button" className="text-button" onClick={setup}>
              Set up profile
            </button>
          ) : (
            <a href={href('knowledge', { section: 'preferences' })}>Practice → Profile &amp; preferences</a>
          )}
        </>
      )}
    </p>
  );
}

export function ProfileEditor({
  profile,
  close,
  saved,
}: {
  profile: WorkspaceProfile | null;
  close: () => void;
  saved: (value: WorkspaceProfile) => void;
}): JSX.Element {
  const fieldsOf = (value: WorkspaceProfile | null): ProfileFields =>
    Object.fromEntries(
      Object.keys(EMPTY).map((key) => [
        key,
        value?.[key as keyof ProfileFields] ?? EMPTY[key as keyof ProfileFields],
      ]),
    ) as ProfileFields;
  const [fields, setFields] = useState<ProfileFields>(() => fieldsOf(profile));
  const [revision, setRevision] = useState(profile?.revisionId ?? null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const dismiss = () => {
    if (!busy && (!dirty || window.confirm('Discard your unsaved profile changes?'))) close();
  };
  function change<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await request<WorkspaceProfile>('/profile', {
        ...fields,
        expectedRevisionId: revision,
      });
      setDirty(false);
      saved(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (dirty && !window.confirm('Replace these unsaved changes with your saved profile?')) return;
    setBusy(true);
    setError('');
    try {
      const result = await request<WorkspaceProfile | null>('/profile');
      setFields(fieldsOf(result));
      setRevision(result?.revisionId ?? null);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={profile ? 'Edit your profile' : 'Set up your profile'}
      onClose={dismiss}
      busy={busy}
    >
      <form className="record-form profile-form" onSubmit={submit}>
        <p className="form-intro">
          Only your name is required. The rest helps Counsel understand your practice and write in
          your voice.
        </p>
        <label>
          Your name
          <input
            autoComplete="name"
            required
            maxLength={200}
            value={fields.name}
            disabled={busy}
            onChange={(e) => change('name', e.target.value)}
          />
        </label>
        <div className="form-pair">
          <label>
            Role (optional)
            <input
              autoComplete="organization-title"
              maxLength={200}
              value={fields.role}
              disabled={busy}
              onChange={(e) => change('role', e.target.value)}
            />
          </label>
          <label>
            Organization (optional)
            <input
              autoComplete="organization"
              maxLength={200}
              value={fields.organization}
              disabled={busy}
              onChange={(e) => change('organization', e.target.value)}
            />
          </label>
        </div>
        <p className="field-help profile-identity-guidance">
          Before saving, confirm the name and organization you want Counsel to use for your work.{' '}
          {IDENTITY_GUIDANCE}
        </p>
        {sections.map(([title, items]) => (
          <details key={title} className="profile-options">
            <summary>{title} (optional)</summary>
            {items.map(([key, label, placeholder, limit]) => (
              <label key={key}>
                {label}
                <textarea
                  aria-label={label}
                  rows={3}
                  maxLength={limit}
                  value={fields[key]}
                  disabled={busy}
                  placeholder={placeholder}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
          </details>
        ))}
        <label className="checkbox-label profile-sharing">
          <input
            type="checkbox"
            checked={fields.applyToChats}
            disabled={busy}
            onChange={(e) => change('applyToChats', e.target.checked)}
          />
          Use my profile in chats
        </label>
        <p className="fine-print">
          When enabled, these details are sent to your selected AI connection with each new
          response. Saving makes no model call. Turning this off does not remove details from
          earlier messages or profile snapshots. Earlier chat and record content may still be used.
          Approval names stay with their records.
        </p>
        <p className="fine-print">{LOGIN_CONTEXT_NOTE}</p>
        <p className="fine-print">Changes here apply only to this workspace. Imported profile text is a snapshot; your original plugin files stay unchanged.</p>
        {error && (
          <>
            <ErrorNotice message={error} />
            <button type="button" className="button" disabled={busy} onClick={() => void reload()}>
              Reload saved profile
            </button>
          </>
        )}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" disabled={busy} onClick={dismiss}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy || !fields.name.trim()}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
