import { useEffect, useState } from 'react';
import { href, request, type Knowledge, type KnowledgeHistory } from './api';
import { Badge, ErrorNotice, fullDate } from './components';
import { KnowledgeEditor } from './KnowledgeEditor';

export function KnowledgeVersions({
  item,
  initialBody,
  viewedRevisionId,
  updated,
}: {
  item: Knowledge;
  initialBody?: string;
  viewedRevisionId: string;
  updated: (item: Knowledge) => void;
}): JSX.Element {
  const [history, setHistory] = useState<KnowledgeHistory | null>(null),
    [error, setError] = useState('');
  const [editing, setEditing] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    request<KnowledgeHistory>(`/knowledge/${item.id}/history`, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setHistory(value);
          setError('');
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [item.id, item.latest.id, retry]);
  return (
    <section className="source-versions">
      <h2>Version history</h2>
      {viewedRevisionId === item.latest.id && item.ownership === 'user' && (
        <div className="source-version-actions">
          <button className="button" onClick={() => setEditing(true)}>
            {item.importedOriginal && item.latest.number === 1 ? 'Propose an update' : item.latest.status === 'pending' ? 'Edit proposed practice item' : 'Propose an update'}
          </button>
        </div>
      )}
      {item.ownership === 'maintained' && (
        <p className="fine-print">
          Maintained content is protected from direct edits. Save separate practice material to
          customize it.
        </p>
      )}
      {history && (
        <details open={history.totalVersions > 1}>
          <summary>
            {history.totalVersions} saved {history.totalVersions === 1 ? 'version' : 'versions'}
          </summary>
          <ol className="source-version-list">
            {history.versions.map((version) => (
              <li key={version.id}>
                <a
                  href={href('knowledge', { id: item.id, revision: version.id })}
                  aria-current={version.id === viewedRevisionId ? 'page' : undefined}
                >
                  <strong>
                    Version {version.number}
                    {item.active?.id === version.id ? ' · In use' : ''}
                  </strong>
                  <span>{version.title}</span>
                  <small>{fullDate(version.receivedAt)}</small>
                  <Badge tone={item.active?.id === version.id ? 'green' : 'neutral'}>
                    {item.importedOriginal && version.number === 1 ? 'Imported baseline' : version.status === 'approved'
                      ? item.active?.id === version.id
                        ? 'Approved'
                        : 'Historical approval'
                      : version.status === 'pending'
                        ? 'Proposed text'
                        : 'Not adopted'}
                  </Badge>
                  {version.approvedBy && <small>Approved by {version.approvedBy}</small>}
                </a>
              </li>
            ))}
          </ol>
          {history.totalVersions > history.versions.length && (
            <p className="fine-print">
              Showing the most recent {history.versions.length}. Earlier versions remain available
              through their citations.
            </p>
          )}
        </details>
      )}
      {error && <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />}
      {editing && (
        <KnowledgeEditor
          item={item}
          initialBody={initialBody}
          close={() => setEditing(false)}
          saved={(value) => {
            setEditing(false);
            updated(value);
          }}
        />
      )}
    </section>
  );
}
