import { useEffect, useState } from 'react';
import { loadImagePreview } from './api';

/** Authenticated immutable bytes, never a model-supplied or external image URL. */
export function ImagePreview({ id, title, thumbnail = false }: { id: string; title: string; thumbnail?: boolean }) {
  const [url, setUrl] = useState(''), [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController(); let objectUrl = ''; setUrl(''); setError(false);
    loadImagePreview(id, abort.signal).then(blob => {
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  if (error) return <span className="image-preview-error">{thumbnail ? 'Image' : 'Image preview unavailable. You can try downloading the original.'}</span>;
  if (!url) return <span className={thumbnail ? 'image-thumbnail-placeholder' : 'fine-print'}>{thumbnail ? '' : 'Loading image…'}</span>;
  return <img className={thumbnail ? 'image-thumbnail' : 'image-preview'} src={url} alt={thumbnail ? '' : title} onError={() => setError(true)} />;
}
