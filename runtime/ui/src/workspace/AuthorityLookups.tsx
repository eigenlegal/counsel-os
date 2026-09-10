import type { AuthorityReceipt } from '../../../src/workspace/authority-types';
import { href } from './api';
import { fullDate } from './components';

export function AuthorityLookups({ receipts }: { receipts: AuthorityReceipt[] }): JSX.Element | null {
  if (!receipts.length) return null;
  return <details className="authority-lookups">
    <summary>{receipts.length} publisher {receipts.length === 1 ? 'lookup' : 'lookups'} · saved in Sources</summary>
    <p>Only legal citations and dates were sent to government publishers. Fetching a source is not a legal-currency or applicability review.</p>
    <ul>{receipts.map((receipt, index) => <li key={`${receipt.revisionId}-${index}`}>
      <a href={href('references', { id: receipt.sourceId, revision: receipt.revisionId })}>{receipt.title} · version {receipt.version}</a>
      <span>{receipt.publication.publisher === 'uscode' ? `Laws in effect ${receipt.publication.lawsInEffectOn}; updated through Public Law ${receipt.publication.currentThroughPublicLaw} (${receipt.publication.publisherCurrentThrough})` : `Text as of ${receipt.publication.versionDate}`} · checked {fullDate(receipt.checkedAt)}{receipt.reused ? ' · saved version unchanged' : ''}</span>
    </li>)}</ul>
  </details>;
}
