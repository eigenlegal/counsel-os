import { useEffect, useRef, useState } from 'react';
import { downloadBackup, verifyBackup, type BackupManifest } from './api';
import { Badge, ErrorNotice, fullDate } from './components';
import { Icon } from './icons';

const countLabel = (count: number, label: string) => `${count} ${label}${count === 1 ? '' : 's'}`;

export function BackupCard({ desktop = false }: { desktop?: boolean }): JSX.Element {
  const [busy, setBusy] = useState<'download' | 'verify' | null>(null);
  const [error, setError] = useState(''),
    [downloaded, setDownloaded] = useState(false);
  const [verified, setVerified] = useState<{ name: string; manifest: BackupManifest } | null>(null);
  const active = useRef(true),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function download() {
    if (busy) return;
    setBusy('download');
    setError('');
    setDownloaded(false);
    setVerified(null);
    try {
      await downloadBackup();
      if (active.current) setDownloaded(true);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof TypeError
            ? 'Cannot reach your workspace. Check its terminal and try again.'
            : (e as Error).message,
        );
    } finally {
      if (active.current) setBusy(null);
    }
  }
  async function verify(file: File) {
    if (busy) return;
    setBusy('verify');
    setError('');
    setVerified(null);
    setDownloaded(false);
    try {
      const manifest = await verifyBackup(file);
      if (active.current) setVerified({ name: file.name, manifest });
    } catch (e) {
      if (active.current)
        setError(
          e instanceof TypeError
            ? 'Cannot reach your workspace. Check its terminal and try again.'
            : (e as Error).message,
        );
    } finally {
      if (active.current) setBusy(null);
    }
  }
  return (
    <section className="settings-section backup-section" aria-labelledby="backup-heading">
      <div className="settings-title">
        <span className="record-icon">
          <Icon name="shield" />
        </span>
        <div>
          <h2 id="backup-heading">Backup & recovery</h2>
          <p>A portable copy of your workspace, including its documents.</p>
        </div>
        <Badge>Manual backup</Badge>
      </div>
      <div className="backup-content">
        <p>
          Keep your chats, matters, profile, practice material, templates, source versions and saved Word files
          together. You can make a backup while this workspace is open.
        </p>
        <div className="backup-actions">
          <button
            className="button button-primary"
            disabled={!!busy}
            onClick={() => void download()}
          >
            {busy === 'download' ? 'Preparing backup…' : 'Download backup'}
          </button>
          <button className="button" disabled={!!busy} onClick={() => input.current?.click()}>
            {busy === 'verify' ? 'Checking backup…' : 'Verify a backup'}
          </button>
          <input
            ref={input}
            hidden
            type="file"
            tabIndex={-1}
            accept=".counsel-backup"
            aria-label="Choose a Counsel backup"
            disabled={!!busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void verify(file);
            }}
          />
        </div>
        <p className="fine-print">
          Unencrypted: this file contains confidential workspace content. Save it somewhere
          protected, ideally on a separate device or backed-up drive. API keys, CLI sign-ins and
          text not yet autosaved are not included. Saved chat and working-preference recovery drafts, staged import files and chat model preferences are included. Backups stream directly to your download folder, up to 10 GB; backups are not scheduled
          automatically.
        </p>
        {busy && (
          <p className="fine-print" role="status">
            {busy === 'download'
              ? 'Copying saved records and checking document integrity. Your workspace remains open.'
              : 'Checking the database and every included file. Nothing will be restored or replaced.'}
          </p>
        )}
        {downloaded && (
          <p className="backup-result" role="status">
            Backup prepared. Check your browser’s downloads to confirm it was saved, then use Verify
            a backup to check that copy.
          </p>
        )}
        {error && <ErrorNotice message={error} />}
        {verified && (
          <div className="backup-result" role="status">
            <strong>Backup verified</strong>
            <p>{verified.name}</p>
            <p>
              Saved {fullDate(verified.manifest.createdAt)}.{' '}
              {countLabel(verified.manifest.counts.matters, 'matter')},{' '}
              {countLabel(verified.manifest.counts.conversations, 'chat')},{' '}
              {countLabel(verified.manifest.originals.length, 'original file')} and{' '}
              {countLabel(verified.manifest.counts.wordFiles, 'Word export')}.
            </p>
            {!!verified.manifest.counts.stagedFiles && <p>{countLabel(verified.manifest.counts.stagedFiles, 'staged import file')} included; these have not entered chat or search.</p>}
            <p>Database and file checks passed. No workspace was changed.</p>
          </div>
        )}
        <details className="backup-restore">
          <summary>Restore a separate workspace</summary>
          {desktop ? <><p>Choose a backup, review its contents, then restore a new workspace. Your current workspace is kept. Counsel remembers the workspace you open.</p><a className="button" href="counsel-desktop://restore">Restore workspace from backup</a><p>Use File → Open personal workspace to return, or File → Open workspace to choose another saved copy.</p></> : <>
          <p>
            For this development version, stop the workspace in its terminal, then run the command
            below with your backup’s full path. You can type the command through{' '}
            <code>--restore </code> and drag the file into the terminal.
          </p>
          <code className="backup-command">
            bun run workspace --restore /path/to/file.counsel-backup
          </code>
          <p>
            Counsel verifies the backup and opens a new recovered copy. Existing workspaces are
            never overwritten. Reconnect your AI in Settings; unfinished responses stay interrupted
            until you send a new request.
          </p>
          </>}
        </details>
      </div>
    </section>
  );
}
