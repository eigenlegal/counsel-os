import { useState } from 'react';
import type { RedlineReceipt } from '../../../src/workspace/redlines';
import { downloadWord, href } from './api';
import { ErrorNotice } from './components';
import { Icon } from './icons';
import { CleanProposalButton } from './CleanProposal';

export function RedlineCard({ value }: { value: RedlineReceipt }): JSX.Element {
  const count = value.edits.length + (value.insertions?.length ?? 0);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function download() {
    if (!value.file || busy) return;
    setBusy(true); setError('');
    try { await downloadWord(value.file.id, value.file.name); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="chat-redline" aria-label="Document redline">
    <div className="chat-card-caption"><Icon name="reference" size={17} /><strong>{value.status === 'saved' ? 'Draft redline ready' : 'Document changed during this response'}</strong></div>
    <p><a href={href('references', { revision: value.sourceRevisionId })}>{value.sourceTitle}</a> · version {value.sourceVersion}</p>
    {value.status === 'source-changed' ? <p className="version-notice">No redline was saved. Read the newer document and ask Counsel OS to reapply the changes.</p> : <>
      <p className="fine-print">Native Word changes and comments. Your original is unchanged. Review the draft before use.</p>
      <div className="redline-file-actions"><button className="button" disabled={busy} onClick={() => void download()}>{busy ? 'Downloading…' : 'Download redline'}</button>
        {value.file && <CleanProposalButton redline={value.file} />}</div>
    </>}
    <details><summary>Review {count} proposed {count === 1 ? 'change' : 'changes'}</summary>
      {value.edits.map((edit, index) => <section className="redline-edit" key={index}>
        <h4>Change {index + 1}</h4>
        <p><del>{edit.current}</del></p>
        <p><ins>{edit.proposed || 'Delete this text'}</ins></p>
        {edit.comment && <p className="fine-print">{edit.comment}</p>}
      </section>)}
      {value.insertions?.map((insertion, index) => <section className="redline-edit" key={`insertion-${index}`}>
        <h4>Insert {insertion.position} “{insertion.anchor}”</h4>
        {insertion.paragraphs.map((paragraph, i) => <p key={i}><ins>{paragraph.text}</ins></p>)}
        {insertion.comment && <p className="fine-print">{insertion.comment}</p>}
        <p className="fine-print">New paragraphs inherit the selected formatting examples. Review numbering and cross-references.</p>
      </section>)}
    </details>
    {error && <ErrorNotice message={error} />}
  </section>;
}
