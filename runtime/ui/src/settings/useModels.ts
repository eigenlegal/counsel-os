import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { DiscoveryResult } from '../api/types';

export interface ModelsState {
  result: DiscoveryResult | null;
  loading: boolean;
  /** Ask the vendor again, past the runtime's ten-minute memory. */
  refresh(): void;
}

/** The listing path for a vendor prefix, with the row's base URL when it
 * has one (a local runner, a preset, a proxy). */
export function modelsPath(prefix: string, baseURL: string | undefined, refresh = false): string {
  const q = new URLSearchParams();
  if (baseURL !== undefined && baseURL.trim() !== '') q.set('baseURL', baseURL.trim());
  if (refresh) q.set('refresh', '1');
  const qs = q.toString();
  return `/providers/${encodeURIComponent(prefix)}/models${qs === '' ? '' : `?${qs}`}`;
}

/**
 * `GET /providers/:prefix/models` for a row (providers spec §4). Re-reads
 * when the prefix or base URL changes; a 401 is the shell's to announce and
 * is silent here; any other failure becomes the row's sentence.
 */
export function useModels(prefix: string | null, baseURL: string | undefined): ModelsState {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const load = useCallback(
    (refresh: boolean): void => {
      if (prefix === null) {
        setResult(null);
        return;
      }
      const ticket = ++seq.current;
      setLoading(true);
      void (async () => {
        try {
          const next = await fetchJson<DiscoveryResult>(modelsPath(prefix, baseURL, refresh));
          if (ticket === seq.current) setResult(next);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) return;
          if (ticket === seq.current) setResult({ models: [], source: 'list', error: `Could not list models: ${err instanceof Error ? err.message : String(err)}` });
        } finally {
          if (ticket === seq.current) setLoading(false);
        }
      })();
    },
    [prefix, baseURL],
  );

  useEffect(() => load(false), [load]);

  return { result, loading, refresh: () => load(true) };
}
