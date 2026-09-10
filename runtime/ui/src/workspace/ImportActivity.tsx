import { useEffect, useState } from 'react';
import type { ImportListItem } from '../../../src/workspace/import-types';
import { href, request } from './api';
import { Icon } from './icons';
import { useImportUploads } from './import-uploads';

/** Keep an unfinished import reachable without keeping its page open. */
export function ImportActivity({ active = false, close }: { active?: boolean; close?: () => void }): JSX.Element {
  const uploads = useImportUploads();
  const [batches, setBatches] = useState<ImportListItem[]>([]);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const poll = async () => {
      try {
        const next = await request<ImportListItem[]>('/imports', undefined, abort.signal);
        if (!disposed) setBatches(next.filter(batch => batch.status === 'review'));
      } catch { /* Keep the link to previously observed imports while offline. */ }
      if (!disposed) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { disposed = true; abort.abort(); clearTimeout(timer); };
  }, []);
  const transferring = uploads.find(upload => upload.state === 'uploading');
  return <a className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={close} href={href('imports', transferring ? { id: transferring.batchId } : {})}>
    <Icon name="attach" size={19} />
    <span>{transferring ? 'Uploading files…' : batches.length ? 'Review imports' : 'Import files'}</span>
    {(batches.length > 0 || transferring) && <span className="nav-count">{batches.length || 1}</span>}
  </a>;
}
