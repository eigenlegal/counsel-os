import { request, href } from './api';
import { FormDraftAssist } from './FormDraftAssist';
import { BriefDraftResponse, type BriefDraftFields } from '../../../src/workspace/brief-drafting';

export function BriefDraftAssist({ value, apply, busyChanged, disabled, matterId, expectedRevisionId }: {
  value: BriefDraftFields; apply: (value: BriefDraftFields) => void; busyChanged: (busy: boolean) => void;
  disabled: boolean; matterId: string; expectedRevisionId: string | null;
}): JSX.Element {
  return <FormDraftAssist value={value} apply={apply} busyChanged={busyChanged} disabled={disabled}
    label="Help me update this"
    placeholder="e.g. Use this matter’s saved history to summarize where things stand, preserving anything unresolved…"
    shared="Your instruction, this form, excerpts from up to four saved sources and three prior work records in this matter, shared profile, and working instructions go to your selected AI connection. Imported matter notes are prioritized. Long records include their opening and closing passages; this is not a full-history review. Other matters and live research are not included."
    run={async (instruction, before, connection, signal) => {
      const config = connection.config!;
      const result = BriefDraftResponse.parse(await request('/brief-drafting', {
        instruction, draft: before, matterId, expectedRevisionId,
        modelChoice: { kind: config.kind, model: config.model,
          ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) },
      }, signal));
      const { question, ...fields } = result.draft;
      return { question, value: fields, receipt: <details className="fine-print draft-context-receipt">
        <summary>{result.records.length} saved records included · View context</summary>
        {result.records.length === 0 && <p>No saved sources or prior work were available. Only the form and your instruction supplied matter facts.</p>}
        {result.records.map(record => <details key={`${record.kind}:${record.id}`}>
          <summary>{record.title}{record.partial ? ' · Partial text' : ''}</summary>
          <a href={href(record.kind === 'source' ? 'references' : 'work', { id: record.recordId })} target="_blank" rel="noreferrer">Open saved record</a>
          <p>{record.status} · Saved {new Date(record.recordedAt).toLocaleString()}. A saved date is not an event date.</p>
          {record.passages.map(passage => <div key={passage.start}>
            <p>Characters {passage.start}–{passage.end} of {record.totalCharacters}</p>
            <pre className="record-prose">{passage.text || 'No extracted text available.'}</pre>
          </div>)}
        </details>)}
        <p>{result.omittedRecords > 0 ? `${result.omittedRecords} other saved records were not included. ` : ''}This is a starting point, not a verified or exhaustive status report. Use matter chat for deeper research.</p>
      </details> };
    }} />;
}
