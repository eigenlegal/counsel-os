import { useEffect, useState } from 'react';
import type { SavedDraft } from '../../../src/workspace/draft-types';
import { DraftRecovery } from './draft-recovery';

export function useDraftRecovery<T extends SavedDraft['value']>(key: string, initial: () => T, enabled: boolean, legacyKey?: string, empty?: () => T) {
  const [recovery] = useState(() => new DraftRecovery(key, initial(), enabled, legacyKey, undefined, empty?.()));
  const [, render] = useState(0);
  useEffect(() => {
    const unsubscribe = recovery.subscribe(() => render(v => v + 1));
    void recovery.open();
    const warn = (event: BeforeUnloadEvent) => {
      if (recovery.dirty || recovery.error) { event.preventDefault(); event.returnValue = ''; void recovery.flush(); }
    };
    window.addEventListener('beforeunload', warn);
    return () => { unsubscribe(); window.removeEventListener('beforeunload', warn); recovery.close(); };
  }, [recovery]);
  return recovery;
}

export function DraftRecoveryNotice({ recovery }: { recovery: DraftRecovery<any> }) {
  if (recovery.error) return <div className="draft-recovery-warning" role="alert">
    <span>Draft recovery needs attention. {recovery.error}</span>
    <button type="button" className="text-button" onClick={() => void (recovery.ready ? recovery.flush() : recovery.load(recovery.value))}>Retry draft save</button>
    {recovery.ready && <button type="button" className="text-button" onClick={() => {
      if (window.confirm('Replace the text in this window with the saved draft? Copy any changes you want to keep first.')) void recovery.reload();
    }}>Load saved draft</button>}
  </div>;
  return <span className="draft-recovery-status" role="status">{!recovery.ready ? 'Restoring draft…' : recovery.saving || recovery.dirty ? 'Saving draft…' : 'Draft recovery ready'}</span>;
}
