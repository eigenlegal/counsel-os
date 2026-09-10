import { useState } from 'react';
import { go, href, request, type Snapshot } from './api';
import { ConnectionCard } from './ConnectionCard';
import { ErrorNotice } from './components';
import { Icon } from './icons';

/** Optional orientation, not a second source of settings or a prerequisite for local work. */
export function WorkspaceWelcome({ data, changed, editProfile }: { data: Snapshot; changed: () => void; editProfile: () => void }) {
  const [connect, setConnect] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function finish() {
    setBusy(true); setError('');
    try { await request('/setup', {action:'dismiss'}); changed(); go('home', {new:crypto.randomUUID()}); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-welcome" aria-label="Set up your workspace">
    <header><Icon name="knowledge" size={30} /><h1>A workspace for your practice.</h1>
      <p>Start with a question or a document. Counsel brings together your matter history, saved preferences, and relevant sources as you work.</p></header>
    <div className="welcome-step">
      <div><h2>Connect your AI</h2><p>{data.connection.ready ? `Configured: ${data.connection.label}. Account access is checked when you use it.` : 'Use your own AI connection. Until then, you can import, organize, and read files locally.'}</p></div>
      <button type="button" className="button" aria-expanded={connect} onClick={() => setConnect(v => !v)}>{connect ? 'Close connection options' : data.connection.ready ? 'Review connection' : 'Choose a connection'}</button>
    </div>
    {connect && <div className="welcome-connection"><ConnectionCard status={data.connection} onChanged={changed} /></div>}
    <div className="welcome-step"><div><h2>Make it yours <small>Optional</small></h2>
      <p>{data.profile ? `Profile saved for ${data.profile.name}.` : 'Add your name and practice context. In-house counsel can work without clients; smaller practices can group matters by client later.'}</p>
      <p>Review style, writing preferences, signing guidance, and Word attribution live in Practice. Import existing preferences or add them later.</p></div>
      <button type="button" className="button" onClick={editProfile}>{data.profile ? 'Review your profile' : 'Add your profile'}</button></div>
    <div className="welcome-step"><div><h2>Bring in your files <small>Optional</small></h2>
      <p>Drop files or folders in any organization. Review the proposed matters, practice material, and sources before importing. Your originals stay untouched.</p></div>
      <a className="button" href={href('imports')}>Import files</a></div>
    <aside className="welcome-local-note"><Icon name="shield" size={18} /><p>Work is saved on this device. Selected context goes to your AI provider when you ask Counsel to work, or enable an AI background task. Your subscription limits or API charges apply.</p></aside>
    {error && <ErrorNotice message={error} />}
    <footer><span>You can return here from Settings.</span><button type="button" className="button button-primary" disabled={busy} onClick={() => void finish()}>{busy ? 'Opening workspace…' : data.connection.ready ? 'Start working' : 'Explore without AI'}</button></footer>
  </section>;
}
