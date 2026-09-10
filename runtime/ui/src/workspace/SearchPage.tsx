import { useEffect, useState, type FormEvent } from 'react';
import { href, request, type SearchResult, type Snapshot } from './api';
import { Badge, Empty, ErrorNotice, PageHeader, Status } from './components';
import { Icon } from './icons';

export function SearchPage({
  data,
  initialQuery,
  initialMatter,
}: {
  data: Snapshot;
  initialQuery: string;
  initialMatter: string;
}): JSX.Element {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [kind, setKind] = useState('');
  const [matter, setMatter] = useState(initialMatter);
  const [history, setHistory] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!submitted.trim()) {
      setResult(null);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    const params = new URLSearchParams({ q: submitted, history: String(history) });
    if (kind) params.set('kind', kind);
    if (matter) params.set('matter', matter);
    request<SearchResult>(`/search?${params}`, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setResult(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [submitted, kind, matter, history, attempt]);
  function search(e: FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
    setAttempt((a) => a + 1);
    // Preserve filters in this component, while making the query bookmarkable.
    window.history.replaceState(
      null,
      '',
      href('search', { q: query.trim(), matter: matter || undefined }),
    );
  }
  return (
    <>
      <PageHeader
        title="Search your workspace"
        description="Find the source, the reasoning, or the decision you already have."
      />
      <form className="search-page-form" onSubmit={search}>
        <Icon name="search" size={22} />
        <input
          aria-label="Search query"
          placeholder="Search by words or a phrase…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={1000}
          autoFocus
        />
        <button className="button button-primary" disabled={!query.trim()}>
          Search
        </button>
      </form>
      <div className="search-filters">
        <label>
          Look in
          <select
            aria-label="Search record type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">Everything</option>
            <option value="work">Work & decisions</option>
            <option value="knowledge">Knowledge</option>
            <option value="source">References</option>
          </select>
        </label>
        <label>
          Matter
          <select
            aria-label="Search matter"
            value={matter}
            onChange={(e) => setMatter(e.target.value)}
          >
            <option value="">Entire workspace</option>
            {data.matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
          Include previous & unapproved versions
        </label>
      </div>
      <p className="search-explanation">
        Local text search, not an AI answer. All search words must appear in a record.
        {!history && ' Uses current sources and approved practice material.'}
      </p>
      {error && <ErrorNotice message={error} retry={() => setAttempt((a) => a + 1)} />}
      <div aria-live="polite">
        {loading && <div className="loading-state">Searching your workspace…</div>}
        {result && (
          <>
            <div className="search-result-heading">
              <h2>
                {result.hits.length} {result.hits.length === 1 ? 'result' : 'results'}
                {result.truncated ? '+' : ''}
              </h2>
              <span>for “{submitted}”</span>
            </div>
            {!result.coverage.complete && (
              <div className="coverage-notice">
                <Icon name="review" size={20} />
                <div>
                  <strong>Some source text is missing</strong>
                  <p>These sources may contain material search cannot find:</p>
                  <ul>
                    {result.coverage.gaps.map((g) => (
                      <li key={g.revisionId}>
                        <a href={href('references', { id: g.sourceId, revision: g.revisionId })}>
                          {g.title}
                        </a>{' '}
                        ({g.textStatus === 'partial' ? 'partial text' : 'no text'})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {result.hits.length ? (
              <div className="search-results">
                {result.hits.map((hit) => (
                  <a
                    className="search-result"
                    key={`${hit.recordId}:${hit.revisionId}`}
                    href={href(
                      hit.kind === 'source'
                        ? 'references'
                        : hit.kind === 'knowledge'
                          ? 'knowledge'
                          : 'work',
                      { id: hit.recordId, revision: hit.revisionId ?? undefined },
                    )}
                  >
                    <div className="search-result-meta">
                      <Badge>
                        {hit.kind === 'source'
                          ? 'Reference'
                          : hit.kind === 'knowledge'
                            ? 'Practice'
                            : 'Work'}
                      </Badge>
                      <Status value={hit.status} />
                      {history && <span>Saved version</span>}
                    </div>
                    <h3>{hit.title}</h3>
                    <p>{hit.snippet}</p>
                    <span className="result-context">
                      {hit.matterIds
                        .map(
                          (id) => data.matters.find((m) => m.id === id)?.title ?? 'Linked matter',
                        )
                        .join(', ') || (hit.kind === 'knowledge' ? 'Practice-wide' : 'No matter')}
                      <Icon name="arrow" size={16} />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty title="No matching records" icon="search">
                Try fewer or different words. Search only covers what you have saved here, not the
                web.
              </Empty>
            )}
            {result.truncated && (
              <p className="field-help">
                Showing the first 100 matches. Add search words or choose a matter to narrow the
                results.
              </p>
            )}
          </>
        )}
        {!result && !loading && !error && (
          <Empty title="Start with what you remember" icon="search">
            A phrase from a document, a subject, or a word from a past decision.
          </Empty>
        )}
      </div>
    </>
  );
}
