import { useState } from 'react';
import { go, href, request, type Snapshot } from './api';
import { ConnectionCard } from './ConnectionCard';
import { ErrorNotice } from './components';
import { Icon } from './icons';
import { developPracticeInChat } from './PracticeDocument';
import { PracticeSources } from './PracticeSources';

/** Optional orientation, not a second source of settings or a prerequisite for local work. */
export function WorkspaceWelcome({ data, changed, editProfile }: { data: Snapshot; changed: () => void; editProfile: () => void }) {
  const [connect, setConnect] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [sources, setSources] = useState(false);
  const modern = (data.interfaceVersion ?? 0) >= 33;
  async function finish() {
    setBusy(true); setError('');
    try { await request('/setup', {action:'dismiss'}); changed(); go('home', {new:crypto.randomUUID()}); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-welcome" aria-label="Set up your workspace">
    <header><Icon name="knowledge" size={30} /><h1>A workspace for your practice.</h1>
      <p>Start with a question, a document, or how you like to work. You can do all three through chat. Connect your AI when you’re ready; the rest is optional.</p></header>
    <div className="welcome-step">
      <div><h2>Connect your AI</h2><p>{data.connection.ready ? `Configured: ${data.connection.label}. Account access is checked when you use it.` : 'Use your ChatGPT or Claude subscription, or an API account. You can still import and read files before connecting.'}</p></div>
      <button type="button" className="button" aria-expanded={connect} onClick={() => setConnect(v => !v)}>{connect ? 'Close connection options' : data.connection.ready ? 'Review connection' : 'Choose a connection'}</button>
    </div>
    {connect && <div className="welcome-connection"><ConnectionCard status={data.connection} onChanged={changed} desktop={data.desktop} /></div>}
    <div className="welcome-step"><div><h2>Make it yours <small>Optional</small></h2>
      <p>{data.practiceDocument?.body ? 'Your saved practice context is ready to develop further.' : 'Tell Counsel OS what you do and how you like to work, or start with one preference. No required categories or questionnaire.'}</p>
      <p>Counsel OS proposes what to remember, including the name on your Word comments. You review it together before it applies to future work.</p></div>
      {modern ? <div className="welcome-practice-actions"><button type="button" className="button" disabled={busy} onClick={async () => {
        setBusy(true); setError(''); try { await developPracticeInChat(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>Tell Counsel OS about your practice</button><button className="text-button" onClick={editProfile}>Write or paste text</button><button className="text-button" onClick={() => setSources(true)}>Use saved instructions</button></div>
      : <button type="button" className="button" onClick={editProfile}>{data.profile ? 'Review your profile' : 'Add your profile'}</button>}</div>
    <div className="welcome-step"><div><h2>Bring in your files <small>Optional</small></h2>
      <p>Drop files or folders in any organization. Counsel OS can suggest where they belong. After importing, bring any existing instructions into your practice chat.</p>
      <p className="fine-print">Counsel OS keeps its own copies. Your original folders stay untouched and are not kept in sync.</p></div>
      <a className="button" href={href('imports')}>Import files</a></div>
    <aside className="welcome-local-note"><Icon name="shield" size={18} /><p>Work is saved on this device. Selected context goes to your AI provider when you ask Counsel OS to work, or enable an AI background task. Your subscription limits or API charges apply.</p></aside>
    {error && <ErrorNotice message={error} />}
    <footer><span>Setup closes when you continue. Your AI connection stays in Settings; your profile and preferences stay in Practice.</span><button type="button" className="button button-primary" disabled={busy} onClick={() => void finish()}>{busy ? 'Opening workspace…' : data.connection.ready ? 'Start working' : 'Explore without AI'}</button></footer>
    {sources && <PracticeSources close={() => setSources(false)} />}
  </section>;
}
