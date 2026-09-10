import { useState } from 'react';
import type { DocumentRoundReport } from '../../../src/workspace/document-rounds';
import { href } from './api';
import { Icon } from './icons';
const labels = { ACCEPTED: 'Our text retained', REVERTED: 'Our text not retained', MODIFIED: 'Our text modified', NEW: 'New change', UNMATCHED_CHANGE: 'Not attributable' };
const roles = { sent: 'Sent draft', returned: 'Returned draft', baseline: 'Before our edits' };

export function DocumentRoundCard({ value }: { value: DocumentRoundReport }): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const findings = showAll ? value.findings : value.findings.slice(0, 8);
  return <section className="chat-redline" aria-label="Document round comparison">
    <div className="chat-card-caption"><Icon name="reference" size={17} /><strong>Document rounds compared</strong></div>
    <p className="fine-print">Exact saved versions. Originals and practice standards are unchanged.</p>
    <ul className="round-documents">{value.documents.map(doc => <li key={doc.role}>
      <span>{roles[doc.role]}: </span><a href={href('references', { revision: doc.revisionId })}>{doc.title}</a> · v{doc.version}
    </li>)}</ul>
    <p>{value.summary.findings} {value.summary.findings === 1 ? 'finding' : 'findings'} · {value.summary.accepted} retained · {value.summary.reverted} not retained · {value.summary.modified} modified · {value.summary.new} new · {value.summary.unmatched_change} not attributable</p>
    <details><summary>Review the comparison{value.limited ? ' (shortened report)' : ''}</summary>
      {!value.findings.length && <p>No paragraph-text differences were identified. This is not a full document-equivalence check.</p>}
      {findings.map((finding, i) => <section className="redline-edit" key={i}>
        <h4>{labels[finding.classification]}{finding.section_context ? ` · ${finding.section_context}` : ''}</h4>
        <p className="fine-print">{finding.detail}</p>
        <p><strong>Sent:</strong> {finding.our_text || 'No matching paragraph'}</p>
        <p><strong>Returned:</strong> {finding.their_revised || 'No remaining text'}</p>
        {finding.base_text !== null && <p className="fine-print">Before our edits: {finding.base_text}</p>}
      </section>)}
      {!showAll && value.findings.length > 8 && <button className="text-button" onClick={() => setShowAll(true)}>Show {value.findings.length - 8} more findings</button>}
      {value.comments.length > 0 && <details><summary>Returned comments ({value.comments.length})</summary>
        {value.comments.map((comment, i) => <p key={i}>{'text' in comment ? <><strong>{comment.author || 'Unnamed reviewer'}:</strong> {comment.text}</> : comment.error}</p>)}
      </details>}
    </details>
    <details className="fine-print"><summary>What this comparison covers</summary>{value.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>
  </section>;
}
