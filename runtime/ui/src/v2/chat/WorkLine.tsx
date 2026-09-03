import { useState } from 'react';
import type { ToolCallView } from '../../chat/turns';
import { Chevron } from '../icons';
import { workLineOf } from '../verbs';
import { Steps } from './Steps';

export interface WorkLineProps {
  tools: ToolCallView[];
  ms: Record<string, number>;
  onOpenFile?: (path: string) => void;
}

/**
 * The turn's one quiet work line (spec §3.3): "Searched the vault · read
 * `nda.md` `acme-nda.md`" plus a chevron — filename chips, expandable to the full step
 * detail (the existing Steps timeline, show/hide and all).
 */
/**
 * How many files the line NAMES before it starts counting.
 *
 * A retro reads twenty of them, and twenty bordered monospace chips were
 * the loudest thing on the page — louder than the answer, for the least
 * important content on it. Every one is still a click away, in the step
 * detail this line already opens.
 */
const NAMED = 3;

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
        {/* The separator travels with the word after it, so a wrapped line
            never opens with a lone middle dot. */}
        {parts.read.length > 0 ? <span className="v2-wl-seg">{lead !== '' ? ' · ' : ''}read </span> : lead === '' ? 'worked ' : ''}
        {parts.read.slice(0, NAMED).map(base => (
          <span key={base} className="v2-file-chip">
            {base}
          </span>
        ))}
        {parts.read.length > NAMED ? <span className="v2-wl-seg">{` and ${parts.read.length - NAMED} more`}</span> : null}
        {parts.other > 0 ? <span className="v2-wl-seg">{` · ran ${parts.other} tool${parts.other === 1 ? '' : 's'}`}</span> : ''}
        <span className="v2-chev" aria-hidden="true">
          <Chevron />
        </span>
      </button>
      {open ? <Steps tools={tools} ms={ms} onOpenFile={onOpenFile} /> : null}
    </div>
  );
}
