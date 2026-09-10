import { useState, type FormEvent } from 'react';
import { go, href, type Snapshot, type CatalogWork } from './api';
import { Badge, dateLabel, Empty, kindLabel, Status } from './components';
import { Icon } from './icons';
import type { EditorState } from './Editor';

export function WorkRow({ work, data }: { work: CatalogWork; data: Snapshot }): JSX.Element {
  const matter = data.matters.find((m) => m.id === work.matterId);
  return (
    <a className="work-row" href={href('work', { id: work.id })}>
      <span className={`record-icon ${work.disposition === 'decision' ? 'record-icon-green' : ''}`}>
        <Icon name={work.disposition === 'decision' ? 'check' : 'work'} />
      </span>
      <span className="row-copy">
        <strong>{work.title}</strong>
        <span>
          {matter?.title ?? 'Outside a matter'}
          {work.evidenceCount > 0 && (
            <span className="inline-meta">
              <Icon name="link" size={13} />
              {work.evidenceCount} {work.evidenceCount === 1 ? 'reference' : 'references'}
            </span>
          )}
        </span>
      </span>
      {work.outputKind && work.outputKind !== 'draft' ? (
        <Badge>{kindLabel(work.outputKind)} · Draft</Badge>
      ) : (
        <Status value={work.disposition} />
      )}
      <time dateTime={work.recordedAt}>{dateLabel(work.recordedAt)}</time>
      <Icon name="chevron" size={16} />
    </a>
  );
}

export function Home({
  data,
  openEditor,
}: {
  data: Snapshot;
  openEditor: (state: EditorState) => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const pending = data.knowledge.filter((k) => k.status === 'pending');
  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) go('search', { q: query.trim() });
  }
  return (
    <>
      <div className="home-intro">
        <div>
          <span className="date-line">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <h1>
            Your work.
            <br />
            With the context intact.
          </h1>
          <p>
            Find the reference, recall the reasoning,
            <br className="desktop-break" /> and pick up where you left off.
          </p>
        </div>
        <div className="context-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
      </div>
      <form className="workspace-search" onSubmit={search}>
        <div className="search-input-line">
          <Icon name="search" size={24} />
          <input
            aria-label="Search your workspace"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a reference, position, or past decision…"
            maxLength={1000}
          />
          <button className="search-submit" aria-label="Search workspace" disabled={!query.trim()}>
            <Icon name="arrow" />
          </button>
        </div>
        <div className="search-foot">
          <span>Search across your saved work and approved practice material</span>
          <span className="search-mode">
            Local search <Icon name="shield" size={13} />
          </span>
        </div>
      </form>
      <div className="quick-actions">
        <button onClick={() => openEditor({ kind: 'work' })}>
          <Icon name="work" size={18} />
          Record work
        </button>
        <button onClick={() => openEditor({ kind: 'reference' })}>
          <Icon name="reference" size={18} />
          Add a source
        </button>
        <button onClick={() => openEditor({ kind: 'knowledge' })}>
          <Icon name="knowledge" size={18} />
          Add to practice
        </button>
      </div>
      <div className="home-columns">
        <div className="home-main">
          <section>
            <div className="section-heading">
              <h2>
                Matters <span className="count">{data.totals.matters}</span>
              </h2>
              <a className="text-button" href={href('matters')}>
                All matters <Icon name="arrow" size={16} />
              </a>
            </div>
            {data.matters.length === 0 ? (
              <Empty
                title="Give your work a home"
                icon="matter"
                action={
                  <button
                    className="button button-primary"
                    onClick={() => openEditor({ kind: 'matter' })}
                  >
                    <Icon name="plus" size={16} />
                    Create a matter
                  </button>
                }
              >
                Bring the context and decisions for a question, project, or dispute together. You
                can also record work without a matter.
              </Empty>
            ) : (
              <div className="matter-cards">
                {data.matters.slice(0, 3).map((m, i) => (
                  <a
                    key={m.id}
                    className={`matter-card matter-tone-${i % 3}`}
                    href={href('matters', { id: m.id })}
                  >
                    <div className="matter-card-top">
                      <span className="matter-symbol">
                        <Icon name="matter" size={22} />
                      </span>
                      <Badge>{kindLabel(m.kind)}</Badge>
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.summary || 'A place for your context, work, and references.'}</p>
                    <div className="matter-card-foot">
                      <span>
                        {m.workCount} {m.workCount === 1 ? 'work record' : 'work records'}
                      </span>
                      <Icon name="arrow" size={18} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
          <section className="recent-section">
            <div className="section-heading">
              <h2>Recent work</h2>
              <a className="text-button" href={href('work')}>
                View all <Icon name="arrow" size={16} />
              </a>
            </div>
            <div className="work-list">
              {data.work.length ? (
                data.work.slice(0, 5).map((w) => <WorkRow key={w.id} work={w} data={data} />)
              ) : (
                <Empty title="Keep the thinking, too" icon="work">
                  Save a note or decision. It will be here when you need to recall it.
                </Empty>
              )}
            </div>
          </section>
        </div>
        <aside className="practice-aside">
          <section className="review-panel">
            <span className="review-panel-icon">
              <Icon name="review" size={22} />
            </span>
            <h2>{data.totals.pending ? 'Worth remembering' : 'Practice you can build on'}</h2>
            <p>
              {data.totals.pending
                ? `${data.totals.pending} ${data.totals.pending === 1 ? 'idea is' : 'ideas are'} waiting for your review before becoming practice material.`
                : 'Your approved positions and methods stay distinct from new ideas.'}
            </p>
            {pending.slice(0, 2).map((k) => (
              <a className="review-item" key={k.id} href={href('knowledge', { id: k.id })}>
                <span>{k.title}</span>
                <Icon name="arrow" size={17} />
              </a>
            ))}
            <a className="review-link" href={href('knowledge')}>
              {data.totals.pending ? 'Review practice' : 'Explore practice'}
              <Icon name="arrow" size={16} />
            </a>
          </section>
          <section className="library-summary">
            <h2>Your sources</h2>
            <p>The sources behind the work, kept with their provenance.</p>
            <a href={href('references')}>
              <span className="shelf-icon">
                <Icon name="reference" />
              </span>
              <span>
                <strong>
                  {data.totals.sources} saved{' '}
                  {data.totals.sources === 1 ? 'reference' : 'references'}
                </strong>
                <small>Documents, research & source text</small>
              </span>
              <Icon name="chevron" size={16} />
            </a>
          </section>
          <div className="workspace-note">
            <Icon name="shield" size={16} />
            <p>
              Saved on this device.
              <br />
              No AI provider connected.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
