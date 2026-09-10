import { useEffect, useState } from 'react';
import { href, request, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import type { AutoFilingStatus } from '../../../src/workspace/auto-filing-types';

const provider = (kind: string, billing?: string) => kind === 'codex' ? 'Codex · ChatGPT subscription' : kind === 'claude-code'
  ? `Claude Code · ${billing === 'api' ? 'API billing' : 'subscription'}` : kind === 'openai-api' ? 'OpenAI API' : 'Anthropic API';

export function AutoFiling({ data }: { data: Snapshot }) {
  const [open, setOpen] = useState(false), [value, setValue] = useState<AutoFilingStatus | null>(null);
  const [view, setView] = useState<'ready'|'history'|'blocked'>('ready'), [offset, setOffset] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0), [configure, setConfigure] = useState(false), [instruction, setInstruction] = useState('');
  useEffect(() => {
    if (busy || chosen.length) return;
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const next = await request<AutoFilingStatus>(`/auto-filing?view=${view}&offset=${offset}`, undefined, abort.signal);
        if (!abort.signal.aborted) { setValue(next); setLoadError(''); }
      } catch (e) { if (!abort.signal.aborted) setLoadError((e as Error).message); }
      if (!abort.signal.aborted) timer = setTimeout(poll, open ? 2500 : 10000);
    }
    void poll(); return () => { abort.abort(); clearTimeout(timer); };
  }, [open, view, offset, busy, chosen.length, retry]);
  const config = data.connection.config, settings = value?.settings;
  const selected = value?.items.filter(item => chosen.includes(item.id)) ?? [];
  const canApply = selected.length > 0 && selected.every(item => !item.stale && item.suggestion.target.collection !== 'unfiled');
  async function action(path: string, payload: unknown) {
    if (busy) return; setBusy(true); setError('');
    try { await request(`/auto-filing/${path}`, payload); setChosen([]); setConfigure(false); setRetry(n => n + 1); }
    catch (e) { setError((e as Error).message); setChosen([]); }
    finally { setBusy(false); }
  }
  function control(actionName: 'pause'|'resume'|'check') {
    if (settings) void action('control', { action: actionName, expectedRevisionId: settings.revisionId });
  }
  function review(actionName: 'apply'|'dismiss') {
    void action('review', { action: actionName, items: selected.map(({ id, fingerprint }) => ({ id, fingerprint })),
      ...(actionName === 'apply' ? { confirmAccessChanges: true } : {}) });
  }
  function page(nextView: typeof view, nextOffset = 0) { setChosen([]); setValue(null); setView(nextView); setOffset(nextOffset); setError(''); }
  return <>
    <div className="upkeep-summary auto-filing-summary">
      <div><strong>AI filing</strong><p className="fine-print">{!value ? loadError ? 'Filing status unavailable.' : 'Checking filing status…' : !settings
        ? 'Let Counsel suggest where unfiled documents belong.' : `${settings.mode === 'running' ? 'Automatic' : settings.mode === 'paused' ? 'Paused' : 'Needs retry'} · ${value.ready} suggestions to review${value.queued + value.running ? ` · ${value.queued + value.running} files queued or reading` : ''}`}</p></div>
      <button className="button" onClick={() => setOpen(true)}>{settings ? 'Review AI filing' : 'Set up AI filing'}</button>
    </div>
    {open && <Modal title="AI filing" onClose={() => setOpen(false)} busy={busy}>
      <div className="record-form auto-filing-review">
        {!settings && <p>Counsel suggests locations for unfiled documents as files and matching matters change. Your existing filing choices stay in place.</p>}
        {settings && <div className="auto-filing-status">
          <div><strong>{settings.mode === 'running' ? 'Automatic filing suggestions are on' : settings.mode === 'paused' ? 'AI filing is paused' : 'AI filing needs retry'}</strong>
            <p className="fine-print">{settings.message}</p>
            <p className="fine-print">{provider(settings.modelChoice.kind, settings.modelChoice.claudeBilling)} · {settings.modelChoice.model} · {settings.calls} requests started</p></div>
          <div className="upkeep-actions">
            <button className="button" disabled={busy} onClick={() => control(settings.mode === 'running' ? 'pause' : 'resume')}>{settings.mode === 'running' ? 'Pause AI filing' : 'Resume AI filing'}</button>
            <button className="button" disabled={busy || !!value?.running} onClick={() => control('check')}>Check unfiled files</button>
            <button className="text-button" disabled={busy} onClick={() => { setConfigure(v => !v); setInstruction(settings.instruction); }}>Filing settings</button>
          </div>
        </div>}
        {value && (!settings || configure) && <section className="auto-filing-setup">
          <h3>{settings ? 'Update background filing' : 'Set it up once'}</h3>
          <p>While the app is running and idle, new and changed unfiled documents are analyzed in small batches. You can leave this page; suggestions are saved for review.</p>
          <p className="fine-print">Uses {data.connection.label}{config ? ` · ${config.model}` : ''} and your plan usage. Sends each file’s title, first 3,000 readable text characters, and up to 50 matching matter names. Other matter contents, chats and your profile are not sent. Files marked local-only are skipped. Large queues can use substantial AI capacity.</p>
          <label><span>Filing instructions <small className="fine-print">· Optional</small></span><textarea aria-label="Background filing instructions" rows={3} maxLength={2000} disabled={busy} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="For example: keep signed agreements with their matter." /></label>
          <p className="fine-print">Nothing moves until you apply a suggestion. This does not create matters, adopt practice standards or change already-filed documents.</p>
          {!data.connection.ready && <p>Connect AI in Settings to enable suggestions. Manual filing remains available.</p>}
          <button className="button button-primary" disabled={busy || !data.connection.ready || !config} onClick={() => config && action('enable', { expectedRevisionId: settings?.revisionId ?? null,
            shareForSuggestions: true, instruction, modelChoice: { kind: config.kind, model: config.model, ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) } })}>
            {settings ? 'Save and enable with this connection' : 'Enable AI filing'}</button>
        </section>}
        {settings && <>
          <div className="filter-tabs" role="group" aria-label="AI filing results">
            {(['ready','history','blocked'] as const).map(key => <button key={key} aria-pressed={view === key} className={view === key ? 'selected' : undefined} disabled={busy} onClick={() => page(key)}>
              {key === 'ready' ? `To review (${value?.ready ?? 0})` : key === 'history' ? `History (${value?.handled ?? 0})` : `Needs help (${value?.blocked ?? 0})`}</button>)}
          </div>
          {view === 'ready' && <>
            <details className="auto-filing-explainer"><summary>What changes when I apply?</summary><p className="fine-print">Linking to a matter makes the file available to that matter’s chats; Practice and Sources placement alone does not broaden chat access. Originals and practice standards stay unchanged. “Leave unfiled” suppresses this suggestion until the file changes.</p></details>
            {!!value?.items.length && <div className="upkeep-actions"><button className="text-button" disabled={busy || !value.items.some(item => !item.stale && item.suggestion.confidence === 'high' && item.suggestion.target.collection !== 'unfiled')}
              onClick={() => setChosen(value.items.filter(item => !item.stale && item.suggestion.confidence === 'high' && item.suggestion.target.collection !== 'unfiled').map(item => item.id))}>Select clear suggestions on this page</button>
              {chosen.length > 0 && <button className="text-button" disabled={busy} onClick={() => setChosen([])}>Clear selection</button>}</div>}
          </>}
          {chosen.length > 0 && <p role="status" className="fine-print">{chosen.length} selected. This list stays still while you review; changes are checked again when you save.</p>}
        </>}
        {(error || loadError) && <ErrorNotice message={error || loadError} retry={() => { setError(''); setChosen([]); setRetry(n => n + 1); }} />}
        {!value && !error && !loadError && <p role="status">Loading filing review…</p>}
        {value && settings && <>
          {!value.items.length && !value.issues.length && <p role="status">{view === 'ready' ? value.running || value.queued ? 'Suggestions will appear as the queue is analyzed.' : 'No filing suggestions are waiting.' : view === 'history' ? 'No completed filing reviews yet.' : 'No files currently need manual help.'}</p>}
          <div className="upkeep-findings">{value.items.map(item => <section className="upkeep-finding" key={item.id}>
            {view === 'ready' ? <label className="import-suggestion-title"><input type="checkbox" disabled={busy || item.stale} checked={chosen.includes(item.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} /><span>{item.title}</span></label> : <h3>{item.title}</h3>}
            <p>Suggested location: <strong>{item.suggestion.target.collection === 'matter' ? item.suggestion.target.matterTitle : item.suggestion.target.collection === 'practice' ? 'Practice' : item.suggestion.target.collection === 'external' ? 'Sources · external references' : 'Keep unfiled — needs a decision'}</strong></p>
            <p>{item.suggestion.reason}</p><p className="fine-print">Confidence: {item.suggestion.confidence}{item.partial ? ' · Partial excerpt' : ''}{view !== 'ready' ? ` · ${item.state}` : ''}{item.stale ? ' · Changed since this suggestion; refresh before filing' : ''}</p>
            <details><summary>Evidence and matching matters</summary><blockquote>{item.suggestion.evidenceQuote}</blockquote>
              <p className="fine-print">{item.candidateMatters.length ? `Matter names shared: ${item.candidateMatters.map(m => m.title).join('; ')}` : 'No matching matter names were shared.'}</p></details>
            <a href={href('references', { id: item.sourceId })} onClick={() => setOpen(false)}>Open file</a>
          </section>)}</div>
          {value.issues.map(item => <section className="upkeep-finding" key={item.sourceId}><h3>{item.title}</h3><p>{item.message}</p><a href={href('references', { id: item.sourceId })} onClick={() => setOpen(false)}>Open file and organize manually</a></section>)}
          {(offset > 0 || offset + 50 < value.total) && <div className="library-pagination"><button className="button" disabled={!offset || busy} onClick={() => page(view, Math.max(0, offset - 50))}>Previous</button>
            <span>Page {offset / 50 + 1}</span><button className="button" disabled={offset + 50 >= value.total || busy} onClick={() => page(view, offset + 50)}>Next</button></div>}
        </>}
        <div className="form-actions"><button className="button" disabled={busy} onClick={() => setOpen(false)}>Done</button>
          {view === 'ready' && selected.length > 0 && <><button className="button" disabled={busy || selected.some(item => item.stale)} onClick={() => review('dismiss')}>Leave {selected.length} unfiled</button>
            <button className="button button-primary" disabled={busy || !canApply} onClick={() => review('apply')}>Apply {selected.length} filing {selected.length === 1 ? 'suggestion' : 'suggestions'}</button></>}
        </div>
      </div>
    </Modal>}
  </>;
}
