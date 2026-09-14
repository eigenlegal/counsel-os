import { useEffect, useRef, useState } from 'react';
import { request } from './api';
import { ErrorNotice } from './components';
import type { UpdateManifest } from '../../../src/workspace/desktop-updates';
export function DesktopUpdates() {
  const [status, setStatus] = useState<{ version: string; build: number; enabled: boolean } | null>(null);
  const [update, setUpdate] = useState<{ id: string; manifest: UpdateManifest } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState(false);
  const controller = useRef<AbortController>();
  useEffect(() => { const initial = new AbortController(); void request<typeof status>('/updates', undefined, initial.signal).then(setStatus).catch(() => {}); return () => { initial.abort(); controller.current?.abort(); }; }, []);
  async function run(download: boolean) {
    if (download && !window.confirm('Download the verified installer? First save your work and a workspace backup. After downloading, quit Counsel OS before replacing the app. Nothing installs automatically.')) return;
    const abort = new AbortController(); controller.current = abort; setBusy(true); setError(''); setSaved(false);
    try {
      if (download && update) {
        const result = await request<{ downloadUrl: string }>('/updates/download', { id: update.id, consent: true }, abort.signal);
        const a = document.createElement('a'); a.href = result.downloadUrl; a.download = 'Counsel-OS-update.dmg'; a.click(); setSaved(true);
      } else { const value = await request<typeof update>('/updates/check', {}, abort.signal); if (!abort.signal.aborted) { setUpdate(value); setChecked(true); } }
    } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <section className="settings-section"><h2>App updates</h2><p>{status ? `Counsel OS ${status.version} · build ${status.build}` : 'Checking this app’s version…'}</p>
    <p>{status?.enabled ? 'Check when you choose. Downloads are verified against signed metadata; installation is manual, after you save and quit.' : 'This test build has no approved signed update channel. Install a newer verified test image manually; keep a backup first.'}</p>
    {status?.enabled && <button className="button" disabled={busy} onClick={() => void run(false)}>Check for updates</button>}
    {checked && !update && !error && <p role="status">You’re using the latest available build on this channel.</p>}
    {update && <div><h3>Counsel OS {update.manifest.version}</h3><p>{update.manifest.notes}</p><p>Requires macOS {update.manifest.minMacOS} or later on Apple silicon.</p><button className="button" disabled={busy} onClick={() => void run(true)}>Download verified installer</button></div>}
    {busy && <button className="button" onClick={() => { controller.current?.abort(); setBusy(false); }}>Cancel</button>}
    {saved && <p role="status">Installer verified. Finish saving it, back up your workspace, then quit Counsel OS before replacing the app. No installation has been performed.</p>}
    <p>Before changing a workspace’s database format, Counsel OS creates and verifies a recovery backup. If that fails, the upgrade stops.</p>
    {error && <ErrorNotice message={error} />}
  </section>;
}
