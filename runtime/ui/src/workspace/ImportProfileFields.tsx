import type { JSX } from 'react';
import { IMPORT_PROFILE_FIELDS, type ImportProfileMapping } from '../../../src/workspace/import-profile';
import type { ProfileFields } from './api';

export function ImportProfileFields({ profile, mapping, change }: {
  profile: ProfileFields | null;
  mapping: ImportProfileMapping | null;
  change: (profile: ProfileFields) => void;
}): JSX.Element {
  return <section className="import-profile-fields">
    <h3>Your profile</h3>
    <p className="fine-print">Review the labeled details from this file. Company records and team lists do not establish your identity. Nothing changes until you choose to use these details and confirm the import.</p>
    {mapping?.warnings.filter(warning => !profile?.name.trim() || !warning.startsWith('Enter your name')).map(warning => <p className="status-banner" key={warning}>{warning}</p>)}
    {IMPORT_PROFILE_FIELDS.slice(0, 3).map(renderField)}
    <details open={IMPORT_PROFILE_FIELDS.slice(3).some(field => !!profile?.[field.key])}>
      <summary>Practice preferences from this file</summary>
      {IMPORT_PROFILE_FIELDS.slice(3).map(renderField)}
    </details>
    {!!mapping?.unmappedSections.length && <p className="fine-print">Not mapped to profile fields: {mapping.unmappedSections.join(', ')}. These sections remain in the original file.</p>}
    <p className="fine-print">Word output preferences, NDA instructions and signing guidance have a separate working-preferences review below. AI connections and entity directories are not imported as settings. The full original is retained.</p>
  </section>;
  function renderField(field: typeof IMPORT_PROFILE_FIELDS[number]) {
    return <label key={field.key}>
      {field.label}
      {field.limit <= 200 ? <input aria-label={`Import profile ${field.key}`} maxLength={field.limit} value={profile?.[field.key] ?? ''}
        onChange={event => update(field.key, event.target.value)} />
        : <textarea aria-label={`Import profile ${field.key}`} rows={field.limit > 1000 ? 4 : 2} maxLength={field.limit} value={profile?.[field.key] ?? ''}
          onChange={event => update(field.key, event.target.value)} />}
    </label>;
  }
  function update(field: typeof IMPORT_PROFILE_FIELDS[number]['key'], value: string) {
    change({ name:'',role:'',organization:'',jurisdictions:'',practiceAreas:'',organizationContext:'',principles:'',voice:'',escalationThresholds:'',applyToChats:false,
      ...profile,[field]:value });
  }
}
