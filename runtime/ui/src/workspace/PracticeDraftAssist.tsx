import { request } from './api';
import { FormDraftAssist } from './FormDraftAssist';
import { PracticeDraftResult, type PracticeDraftFields } from '../../../src/workspace/practice-drafting';

export function PracticeDraftAssist({ value, matterId = null, apply, busyChanged, disabled = false, target = 'practice', kindLocked = false }: {
  value: PracticeDraftFields; matterId?: string | null; apply: (value: PracticeDraftFields) => void;
  busyChanged: (busy: boolean) => void; disabled?: boolean; target?: 'practice' | 'instructions'; kindLocked?: boolean;
}): JSX.Element {
  return <FormDraftAssist value={value} apply={apply} busyChanged={busyChanged} disabled={disabled}
    placeholder={target === 'instructions' ? 'e.g. Explain that I prefer surgical NDA edits, preserving the other side’s wording where possible…' : 'Describe what to capture, paste an example, or ask Counsel to refine your wording…'}
    shared="Your instruction and form text, the selected matter’s summary, shared profile, and working instructions go to your selected AI connection. This helper does not search saved files or research law."
    run={async (instruction, before, connection, signal) => {
      if (before.body.length > 20_000) throw new Error('The drafting helper supports up to 20,000 characters. Your full text is still here; shorten it or continue manually.');
      const config = connection.config!;
      const result = PracticeDraftResult.parse(await request('/practice-drafting', {
        instruction, draft: before, matterId, target,
        modelChoice: { kind: config.kind, model: config.model,
          ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) },
      }, signal));
      return { question: result.question, value: { title: target === 'instructions' ? before.title : result.title,
        body: result.body, kind: target === 'instructions' || kindLocked ? before.kind : result.kind } };
    }} />;
}
