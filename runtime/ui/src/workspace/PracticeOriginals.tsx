import { useEffect, useState } from 'react';
import { href, request } from './api';
import { ErrorNotice } from './components';

export function PracticeOriginals({ id }: { id: string }) {
  const [files, setFiles] = useState<Array<{ sourceId: string; revisionId: string; title: string; trashed: boolean }>>([]), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setError(''); setFiles([]);
    request<typeof files>(`/knowledge/${id}/originals`, undefined, abort.signal).then(v => { if (!abort.signal.aborted) setFiles(v); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [id]);
  if (!files.length && !error) return null;
  return <section className="practice-originals"><h2>Original files</h2><p className="fine-print">Retained from import. Practice edits do not overwrite the originals.</p>
    {files.map(file => <a key={file.sourceId} href={href('references', { id: file.sourceId })}>{file.title}{file.trashed ? ' · In Trash' : ''}</a>)}
    {error && <ErrorNotice message={error} />}
  </section>;
}
