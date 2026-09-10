import { useEffect, useState } from 'react';
import { href, request } from './api';
import type { ReferenceImpact } from '../../../src/workspace/reference-impact';

/** A live annotation, separate from the immutable answer and its context receipt. */
export function SourceChangeNotice({ workId, knowledgeRevisionId }: { workId?: string; knowledgeRevisionId?: string }): JSX.Element | null {
  const [impact, setImpact] = useState<ReferenceImpact | null>(null),
    [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let controller: AbortController | undefined;
    const check = () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      request<ReferenceImpact>(knowledgeRevisionId ? `/knowledge-revisions/${knowledgeRevisionId}/reference-impact` : `/work/${workId}/reference-impact`, undefined, current.signal)
        .then((result) => {
          if (!Array.isArray(result.changes) || !result.coverage || typeof result.coverage.truncated !== 'boolean')
            throw new Error('Reference impact could not be checked.');
          if (!current.signal.aborted) {
            setImpact(result);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!current.signal.aborted) setFailed(true);
        });
    };
    check();
    window.addEventListener('focus', check);
    return () => {
      controller?.abort();
      window.removeEventListener('focus', check);
    };
  }, [workId, knowledgeRevisionId, retry]);
  if (failed)
    return (
      <p className="fine-print">
        Reference updates could not be checked.{' '}
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
          Check again
        </button>
      </p>
    );
  if (!impact || (!impact.changes.length && !impact.coverage.truncated)) return null;
  const { changes, coverage } = impact;
  return (
    <aside className="source-change-notice" aria-label="Reference updates">
      <strong>{!changes.length ? 'Reference checking reached its limit' : knowledgeRevisionId || changes.some(change => change.via?.length) ? 'A supporting reference has a newer version' : 'A cited reference has a newer version'}</strong>
      <p>
        {knowledgeRevisionId ? 'Your practice item remains unchanged.' : 'This answer and its citations have not been rewritten.'} Review the new material before relying on the earlier conclusion.
      </p>
      <ul>
        {changes.slice(0, 10).map((change) => (
          <li key={change.citedRevisionId}>
            <a
              href={href(change.kind === 'knowledge' ? 'knowledge' : 'references', {
                id: change.recordId,
                revision: change.currentRevisionId,
              })}
            >
              {change.title}
            </a>
            <span>
              {' '}
              cited v{change.citedVersion}; current v{change.currentVersion}
            </span>
            {!!change.via?.length && <small> · through {change.via.some(node => node.kind === 'knowledge') ? 'saved practice material' : 'earlier work'}{change.viaTruncated ? ' (longer chain)' : ''}</small>}
          </li>
        ))}
      </ul>
      {changes.length > 10 && (
        <p>
          {changes.length - 10} additional superseded citations. Open the saved sources to
          inspect them.
        </p>
      )}
      <p className="fine-print">
        Follows recorded citations through earlier work and practice material. Uncited reliance cannot be checked. A newer version does not by itself mean the conclusion is wrong.
        {coverage.unlinkedRecords > 0 && ` ${coverage.unlinkedRecords} linked ${coverage.unlinkedRecords === 1 ? 'record has' : 'records have'} no supporting citations.`}
        {coverage.truncated && ' Only the first 1,000 linked records were checked; other updates may be missing.'}
      </p>
    </aside>
  );
}
