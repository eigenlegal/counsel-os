import type { WebReceipt } from '../../../src/workspace/web-sources';
import { href } from './api';
import { fullDate } from './components';

export function WebLookups({ receipts }: { receipts: WebReceipt[] }): JSX.Element | null {
  if (!receipts.length) return null;
  return <details className="authority-lookups web-lookups" aria-label="Retrieved webpages">
    <summary>{receipts.length} public {receipts.length === 1 ? 'page' : 'pages'} retrieved · saved in Sources</summary>
    <p>Only the URLs were sent to these sites—not your document text or browser login. Saved copies stay available in this chat. Retrieval does not establish the version governing your agreement.</p>
    <ul>{receipts.map((receipt, index) => <li key={`${receipt.revisionId}-${index}`}>
      <a href={href('references', { id: receipt.sourceId, revision: receipt.revisionId })}>{receipt.title} · version {receipt.version}</a>
      <span>Checked {fullDate(receipt.checkedAt)}{receipt.reused ? ' · saved version unchanged' : ''}</span>
      <a href={receipt.url} target="_blank" rel="noopener noreferrer">Open live page</a>
      <details><summary>Retrieval details</summary>
        <p>{receipt.url}</p>
        {receipt.requestedUrl !== receipt.url && <p>Redirected from {receipt.requestedUrl}</p>}
        <p>Saved original: {receipt.mediaType}. Retrieved {fullDate(receipt.retrievedAt)}.</p>
        {receipt.notes.map((note, number) => <p key={number}>{note}</p>)}
      </details>
    </li>)}</ul>
  </details>;
}
