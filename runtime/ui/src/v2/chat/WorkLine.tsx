import { useState } from 'react';
import type { ToolCallView } from '../../chat/turns';
import { workLineOf } from '../verbs';
import { Steps } from './Steps';

export interface WorkLineProps {
  tools: ToolCallView[];
  ms: Record<string, number>;
  onOpenFile?: (path: string) => void;
}

/**
 * The turn's one quiet work line (spec §3.3): "Searched the vault · read
 * `nda.md` `acme-nda.md` ⌄" — filename chips, expandable to the full step
 * detail (the existing Steps timeline, show/hide and all).
 */
export function WorkLine({ tools, ms, onOpenFile }: WorkLineProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (tools.length === 0) return null;
  const parts = workLineOf(tools);
  const lead = [parts.searched ? 'Searched the vault' : null, parts.listed ? 'listed the vault' : null]
    .filter(part => part !== null)
    .join(' · ');
  return (
    <div className="v2-work-line-wrap">
      <button type="button" className="v2-work-line" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {lead}
        {lead !== '' && parts.read.length > 0 ? ' · ' : ''}
        {parts.read.length > 0 ? 'read ' : lead === '' ? 'worked ' : ''}
        {parts.read.map(base => (
          <span key={base} className="v2-file-chip">
            {base}
          </span>
        ))}
        {parts.other > 0 ? ` · ran ${parts.other} tool${parts.other === 1 ? '' : 's'}` : ''}
        <span className="v2-chev" aria-hidden="true">
          {' '}⌄
        </span>
      </button>
      {open ? <Steps tools={tools} ms={ms} onOpenFile={onOpenFile} /> : null}
    </div>
  );
}
