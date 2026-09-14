import { useState } from 'react';
import { href, type Snapshot } from './api';
import { Badge, Empty, kindLabel, PageHeader } from './components';
import { Icon } from './icons';
import { WorkRow } from './Home';
import type { EditorState } from './Editor';
import { SourcesLibrary } from './SourceLibrary';
import { ClientDirectory } from './Clients';
import { PracticeLibrary } from './PracticeLibrary';

export function Library({ page, data, openEditor, changed }: {
  page: 'matters' | 'knowledge' | 'references' | 'work';
  data: Snapshot; openEditor: (state: EditorState) => void; changed: () => void;
}): JSX.Element {
  const [filter, setFilter] = useState(''), [tab, setTab] = useState('all');
  if (page === 'knowledge') return <PracticeLibrary data={data} openEditor={openEditor} changed={changed} />;
  if (page === 'references') return <SourcesLibrary data={data} openEditor={openEditor} />;
  const isMatter = page === 'matters';
  const title = isMatter ? 'Matters' : 'Saved outputs';
  const kind = isMatter ? 'matter' : 'work';
  const add = isMatter ? 'New matter' : 'Add a note or decision';
  const matches = (title: string, body: string) => `${title} ${body}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase());
  const matters = data.matters.filter(m => matches(m.title, m.summary));
  const work = data.savedWork.filter(w => matches(w.title, w.preview) && (tab === 'all' || w.disposition === tab));
  const total = isMatter ? matters.length : work.length;
  return <>
    <PageHeader title={title} description={isMatter ? 'The context, work, and decisions behind every question.' : 'Deliverables and notes worth returning to. Conversations keep the discussion.'}
      action={<button className="button button-primary" onClick={() => openEditor({ kind })}><Icon name="plus" size={17} />{add}</button>} />
    {isMatter && <ClientDirectory data={data} changed={changed} />}
    <div className="collection-toolbar">
      {isMatter ? <span className="result-count">{data.totals.matters} {data.totals.matters === 1 ? 'matter' : 'matters'}</span> :
        <div className="filter-tabs" aria-label="Filter saved outputs">
          {[['all', 'Outputs & notes'], ['draft', 'Notes & drafts'], ['decision', 'Decisions']].map(([key, label]) =>
            <button key={key} aria-pressed={tab === key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key!)}>{label}</button>)}
        </div>}
      <label className="filter-input"><Icon name="search" size={17} /><input aria-label={`Filter ${title.toLowerCase()}`} placeholder="Filter this view…" value={filter} onChange={e => setFilter(e.target.value)} /></label>
    </div>
    {!total ? <Empty title={filter || tab !== 'all' ? 'No matches in this view' : `Your ${title.toLowerCase()} start here`} icon={kind}
      action={<button className="button" onClick={() => filter || tab !== 'all' ? (setFilter(''), setTab('all')) : openEditor({ kind })}>{filter || tab !== 'all' ? 'Clear filters' : add}</button>}>
      {filter || tab !== 'all' ? 'Try another filter, or search the full workspace for text inside records.' : 'Add your first record. It will be saved locally and available the next time you open Counsel OS.'}
    </Empty> : isMatter ? <div className="matter-directory">{matters.map((m, i) =>
      <a href={href('matters', { id: m.id })} className={`matter-directory-row matter-tone-${i % 3}`} key={m.id}>
        <span className="matter-symbol"><Icon name="matter" size={23} /></span>
        <span className="row-copy"><strong>{m.title}</strong><span>{m.summary || 'No context added yet.'}</span></span>
        <Badge>{kindLabel(m.kind)}</Badge><span className="directory-count">Open matter</span><Icon name="chevron" size={17} />
      </a>)}</div> : <div className="work-list collection-list">{work.map(w => <WorkRow key={w.id} work={w} data={data} />)}</div>}
    <p className="collection-footer">{total} shown{data.totals[page] > data.limit ? ` from the latest ${data.limit}. Use workspace search to find older records.` : ''}</p>
  </>;
}
