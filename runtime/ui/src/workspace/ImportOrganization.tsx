import { useEffect, useRef, useState } from 'react';
import { request, type Snapshot } from './api';
import type { ImportBulkEdit, ImportChoice } from '../../../src/workspace/import-types';
import type { ImportOrganizationResult } from '../../../src/workspace/import-organization';
import type { z } from 'zod';
import { ErrorNotice, Modal } from './components';
import { MatterPicker } from './MatterPicker';

const locations = [
  ['unfiled', 'Leave unfiled'], ['external', 'Sources · External reference'], ['practice', 'Practice · File'],
  ['position', 'Practice · Position'], ['method', 'Practice · Method'], ['language', 'Practice · Language'], ['pattern', 'Practice · Lesson'], ['skip', 'Skip these files'],
];
function locationPatch(value: string): z.infer<typeof ImportBulkEdit>['patch'] {
  return ['unfiled', 'external', 'practice'].includes(value)
    ? { destination: 'source', collection: value as ImportChoice['collection'] }
    : { destination: value as 'position' | 'method' | 'language' | 'pattern' | 'skip' };
}
function describe(choice: ImportChoice, matters: Array<{ id: string; title: string }>): string {
  const location = choice.destination === 'source'
    ? locations.find(([value]) => value === (choice.collection ?? 'unfiled'))?.[1]
    : choice.destination === 'template' ? 'Practice · Template' : locations.find(([value]) => value === choice.destination)?.[1];
  return `${location ?? choice.destination} · ${choice.matterTitle ? `New matter: ${choice.matterTitle}`
    : choice.matterId ? matters.find(matter => matter.id === choice.matterId)?.title ?? 'Selected matter' : 'Outside a matter'}`;
}

export function ImportOrganization({ batchId, revisionId, entryIds, mode, data, close, saved }: {
  batchId: string; revisionId: string; entryIds: string[]; mode: 'bulk' | 'suggest'; data: Snapshot;
  close: () => void; saved: () => void;
}): JSX.Element {
  const [location, setLocation] = useState('keep'), [matter, setMatter] = useState('keep'), [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<ImportOrganizationResult | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function suggest() {
    const config = data.connection.config;
    if (busy || !data.connection.ready || !config) return;
    const abort = new AbortController(); active.current = abort;
    setBusy(true); setError('');
    try {
      const next = await request<ImportOrganizationResult>(`/imports/${batchId}/organize`, {
        expectedRevisionId: revisionId, entryIds, instruction, shareForSuggestions: true,
        modelChoice: { kind: config.kind, model: config.model, ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) },
      }, abort.signal);
      if (!abort.signal.aborted) {
        setResult(next);
        // Uncertain recommendations require an affirmative row selection.
        setChosen(next.suggestions.filter(item => item.confidence !== 'low').map(item => item.entryId));
      }
    } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
    finally { if (active.current === abort) { setBusy(false); active.current = null; } }
  }
  function stop() {
    active.current?.abort(); active.current = null; setBusy(false);
    setError('Suggestions stopped. Your import choices are unchanged.');
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (result) await request(`/imports/${batchId}/choices`, { expectedRevisionId: result.revisionId,
        changes: result.suggestions.filter(item => chosen.includes(item.entryId)).map(item => ({ entryId: item.entryId, choice: item.choice })) });
      else {
        const patch: z.infer<typeof ImportBulkEdit>['patch'] = location === 'keep' ? {} : locationPatch(location);
        if (matter !== 'keep') { patch.matterId = matter && matter !== 'new' ? matter : null; patch.matterTitle = matter === 'new' ? title.trim() : null; }
        await request(`/imports/${batchId}/bulk`, { expectedRevisionId: revisionId, entryIds, patch });
      }
      saved(); close();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const matters = [...(result?.sharedMatters ?? []), ...data.matters];
  return <Modal title={mode === 'bulk' ? 'Organize selected files' : 'Review organization with Counsel'} onClose={close} busy={busy}>
    <div className="record-form import-organize-form">
      <p>{entryIds.length} selected files. This changes only your import choices. Files stay staged until you confirm the final import.</p>
      {mode === 'bulk' ? <>
        <label>Use these files as<select aria-label="Bulk import destination" value={location} disabled={busy} onChange={e => setLocation(e.target.value)}>
          <option value="keep">Keep each file’s current use</option>
          {locations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Matter<MatterPicker label="Bulk import matter" value={matter} disabled={busy} onChange={setMatter} matters={data.matters}
          choices={[{ value: 'keep', label: 'Keep each file’s current matter' }, { value: '', label: 'Outside a matter' }, { value: 'new', label: 'Create one new matter…' }]} /></label>
        {matter === 'new' && <label>New matter name<input aria-label="Bulk new matter name" value={title} maxLength={200} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>}
        <p className="fine-print">All {entryIds.length} selected files are included, even on other pages. Titles, contents and unrelated choices stay unchanged. Final import links files to the chosen matter, giving its chats access. Practice guidance still needs separate approval.</p>
      </> : !result ? <>
        <label>Anything Counsel should know? <span className="fine-print">Optional</span>
          <textarea aria-label="Organization instructions" rows={3} maxLength={2000} disabled={busy} value={instruction} onChange={e => setInstruction(e.target.value)}
            placeholder="For example: these are files for the Northstar renewal, except the reusable checklist…" /></label>
        <p className="fine-print">Generate suggestions sends the selected files’ names, current choices, first 3,000 text characters per file, and matching matter names to {data.connection.label}{data.connection.config ? ` · ${data.connection.config.model}` : ''}. It does not share other matter contents or your profile. Review suggestions before saving them.</p>
        {!data.connection.ready && <p>No AI connection is ready. You can organize these files manually.</p>}
      </> : <>
        <p className="fine-print">Compare each suggestion with its current location. Uncheck anything you want to keep unchanged. Low-confidence suggestions start unchecked.</p>
        <div className="import-suggestions">
          {result.suggestions.map(item => <section className="import-suggestion" key={item.entryId}>
            <label className="import-suggestion-title"><input type="checkbox" disabled={busy} checked={chosen.includes(item.entryId)}
              onChange={e => setChosen(values => e.target.checked ? [...values, item.entryId] : values.filter(value => value !== item.entryId))} />
              <span>{item.path}</span></label>
            <dl><div><dt>Current</dt><dd>{describe(item.before, matters)}</dd></div><div><dt>Suggested</dt><dd>{describe(item.choice, matters)}</dd></div></dl>
            {item.choice.destination === 'template' && <p>Use when: {item.choice.whenToUse}</p>}
            <p>{item.reason}</p><p className="fine-print">Confidence: {item.confidence}{item.partial ? ' · Partial excerpt' : ''}</p>
            <details><summary>Supporting text</summary><blockquote>{item.evidenceQuote}</blockquote></details>
          </section>)}
        </div>
        <details className="fine-print"><summary>What Counsel received</summary>
          <p>Only these selected files’ names, current choices and first 3,000 text characters per file. The following candidate names were also supplied, not their matter contents:</p>
          {result.sharedMatters.length ? <ul>{result.sharedMatters.map(item => <li key={item.id}>{item.title}</li>)}</ul> : <p>No matching matter names.</p>}
        </details>
      </>}
      {error && <ErrorNotice message={error} />}
      <div className="form-actions">
        {active.current ? <button type="button" className="button" onClick={stop}>Stop suggestions</button>
          : <button type="button" className="button" disabled={busy} onClick={close}>Cancel</button>}
        {mode === 'suggest' && !result
          ? <button type="button" className="button button-primary" disabled={busy || !data.connection.ready || entryIds.length > 20} onClick={() => void suggest()}>{busy ? 'Preparing suggestions…' : 'Generate suggestions'}</button>
          : <button type="button" className="button button-primary" disabled={busy || (result ? !chosen.length : (location === 'keep' && matter === 'keep') || (matter === 'new' && !title.trim()))}
            onClick={() => void save()}>{busy ? 'Saving…' : result ? `Save ${chosen.length} suggested choices` : 'Update import choices'}</button>}
      </div>
    </div>
  </Modal>;
}
