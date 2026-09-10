import { useState, type JSX } from 'react';
import { IMPORT_WORKING_FIELDS, type ImportWorkingField, type ImportPreferenceMapping, type ImportPreferenceReview, type ImportPreferenceChanges } from '../../../src/workspace/import-preferences';
import { WorkingPreferenceFields, preferenceSnapshot, wordOutputFilename, type WorkingPreferences } from '../../../src/workspace/working-preferences';
import type { WorkspaceProfile } from '../../../src/workspace/profile';
import { DocumentReader } from './DocumentReader';

export function ImportPreferenceFields({ mapping, current, profile, review, change }: {
  mapping: ImportPreferenceMapping; current: WorkingPreferences | null; profile: WorkspaceProfile | null;
  review: ImportPreferenceReview | null; change: (review: ImportPreferenceReview | null) => void;
}): JSX.Element {
  const before = WorkingPreferenceFields.strip().parse(current ?? {});
  const author = preferenceSnapshot(current, profile)?.word.author ?? 'Counsel';
  const [draft, setDraft] = useState<Partial<Record<ImportWorkingField, string>>>({ ...mapping.suggestion, ...review?.changes });
  const [all, setAll] = useState(false);
  const stale = !!review && review.expectedRevisionId !== (current?.revisionId ?? null);
  const visible = IMPORT_WORKING_FIELDS.filter(field => all || draft[field.key] !== undefined || review?.changes[field.key] !== undefined);
  const selectedWord = ['customAuthor', 'filenamePattern', 'redlineLabel', 'draftLabel'].some(key => review?.changes[key as ImportWorkingField] !== undefined);
  const next = { ...before, ...review?.changes };
  let examples: string[] = [];
  try {
    if (selectedWord) for (const variant of ['redline', 'draft'] as const) examples.push(wordOutputFilename({
      author: next.authorMode === 'custom' ? next.customAuthor : author, filenamePattern: next.filenamePattern,
      redlineLabel: next.redlineLabel, draftLabel: next.draftLabel,
    }, { document: 'Acme NDA', variant, date: '2026-09-09' }));
  } catch { /* The save endpoint provides validation; never preview a misleading invalid name. */ }
  return <section className="import-preference-review" aria-label="Import working preferences">
    <h3>Working preferences</h3>
    <p className="fine-print">Selected fields replace your current settings after import confirmation. Unchecked fields stay unchanged. Compare the current value before selecting a replacement.</p>
    <p className="fine-print">Instructions apply to new responses, even with profile sharing off. Signing guidance does not create authority records or authorize signatures.</p>
    {mapping.warnings.map(warning => <p className="status-banner" key={warning}>{warning}</p>)}
    {stale && <div className="status-banner"><p>Your preferences changed since this file was reviewed. Compare with the current values below and select your changes again.</p>
      <button className="button" type="button" onClick={() => change(null)}>Review against current preferences</button></div>}
    {visible.map(field => {
      const selected = review?.changes[field.key] !== undefined;
      const currentValue = field.key === 'customAuthor' ? author : before[field.key];
      const value = draft[field.key] ?? currentValue;
      const label = `Imported ${field.label.toLowerCase()}`;
      return <div className="import-preference-field" key={field.key}>
        <label className="model-default"><input type="checkbox" disabled={stale} checked={selected}
          onChange={event => update(field.key, event.target.checked ? value : undefined)} /><span>Use {field.label}</span></label>
        <label><span className="fine-print">Proposed value</span>{field.multiline
          ? <textarea aria-label={label} rows={5} disabled={stale} value={value} onChange={event => edit(field.key, event.target.value, selected)} />
          : <input aria-label={label} disabled={stale} value={value} onChange={event => edit(field.key, event.target.value, selected)} />}</label>
        {selected && !value.trim() && <p className="fine-print">This will clear the current field.</p>}
        <details><summary>Current value{currentValue ? '' : ': not set'}</summary>
          {currentValue && <DocumentReader text={currentValue} markdown={field.multiline} />}</details>
      </div>;
    })}
    {!all && <button type="button" className="button" onClick={() => setAll(true)}>Show other preference fields</button>}
    {!!examples.length && <div className="import-filename-examples"><p className="fine-print">Example filenames with your selected changes:</p>
      {examples.map((example, index) => <code key={index}>{example}</code>)}
      <p className="fine-print">{'{variant}'} uses your redline or draft label; {'{date}'} uses the export date in UTC. The author applies to new Word changes and comments.</p></div>}
    <p className="fine-print">Only explicitly labeled sections are suggested. Review the full file for anything else. AI connections, entity directories and substantive practice positions are not converted here.</p>
  </section>;
  function edit(key: ImportWorkingField, value: string, selected: boolean) {
    setDraft(previous => ({ ...previous, [key]: value }));
    if (selected) update(key, value);
  }
  function update(key: ImportWorkingField, value: string | undefined) {
    const changes: Partial<ImportPreferenceChanges> = { ...review?.changes };
    if (value === undefined) delete changes[key]; else changes[key] = value;
    if (key === 'customAuthor') {
      if (value === undefined) delete changes.authorMode; else changes.authorMode = 'custom';
    }
    change(Object.keys(changes).length ? { expectedRevisionId: review?.expectedRevisionId ?? current?.revisionId ?? null, changes } : null);
  }
}
