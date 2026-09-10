import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export function UserPrompt({ text, attachmentCount }: { text: string; attachmentCount: number }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  async function copy() {
    clearTimeout(timer.current); setState('copying');
    try {
      await navigator.clipboard.writeText(text);
      setState('copied'); timer.current = setTimeout(() => setState('idle'), 2_000);
    } catch { setState('error'); }
  }
  return <div className="user-message">
    <div className="user-message-heading">
      <span className="message-byline">You</span>
      <button type="button" className="copy-prompt" disabled={state === 'copying'} onClick={() => void copy()}>
        {state === 'copied' ? 'Copied' : state === 'copying' ? 'Copying…' : 'Copy prompt'}
      </button>
      <span className="sr-only" role="status">{state === 'copied' ? 'Prompt copied to clipboard.' : ''}</span>
    </div>
    <p>{text}</p>
    {attachmentCount > 0 && <span className="message-attachments"><Icon name="attach" size={14} />
      {attachmentCount} document version{attachmentCount === 1 ? '' : 's'} added</span>}
    {state === 'error' && <small className="copy-prompt-error" role="alert">Clipboard access was blocked. Select the prompt text and copy it, or try again.</small>}
  </div>;
}
