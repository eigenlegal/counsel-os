import { useState } from 'react';
import { startDraftChat } from './chat-handoff';
import { ErrorNotice } from './components';

const examples = [
  ['Discuss a screenshot', 'Help me understand a screenshot. Ask me to attach it if none is available. Explain what you can see and flag anything too small or unclear to read.', 'Drop or paste a screenshot into the message box, then ask your question.'],
  ['Find relevant past work', 'Find relevant prior work and saved guidance for the question I describe next. Stay within my selected context and cite the records you use.', 'Uses the context you allow; it does not open unrelated matters.'],
  ['Review linked terms', 'Help me review public terms linked from an agreement. Ask for the agreement or URL if it is not already available, read the relevant public pages, and cite what you find.', 'Can fetch public pages and PDFs, not signed-in websites.'],
  ['Prepare a Word redline', 'Help me prepare tracked changes and comments in a Word document. Use an attached original if available; otherwise ask me for it. Confirm the name for new changes if it is not set.', 'Creates a new copy of a retained .docx; the original stays unchanged.'],
  ['Remember a preference', 'For future work, help me record a preference in my practice document. Ask what I want to change, then show me the proposed update before saving.', 'Standing instructions change only after you confirm.'],
] as const;

export function ChatCapabilityHints({ choose }: { choose: (message: string) => void }) {
  return <details className="capability-hints"><summary>What else can I ask Counsel OS to do?</summary>
    <div className="capability-examples">{examples.map(([label, prompt, detail]) => <div key={label}><button type="button" className="text-button" onClick={() => choose(prompt)}>{label}</button><p>{detail}</p></div>)}</div>
    <p className="fine-print">An example fills your message; it does not send it. You can also ask “What can you do with this?”</p>
  </details>;
}

export function ContextualChatHints({ source, matterId }: { source?: { revisionId: string; word: boolean }; matterId?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const actions = source ? [
    ['Assess this document', 'Assess this attached document, explain the issues that matter, and cite the passages you rely on. Use my relevant saved practice preferences.'],
    ...(source.word ? [['Prepare tracked changes', 'Review this attached Word document and prepare a focused redline with comments on material changes. Apply my saved instructions and confirm Word attribution if it is missing. Keep the original unchanged.']] : []),
    ['Use as practice context', 'Read this attached file and help me incorporate the relevant instructions into my practice document for future work. Preserve unrelated preferences, ask about conflicts, and show me a proposed update before saving.'],
  ] : [
    ['Summarize where things stand', 'Read the records in this matter and summarize what we know, what is unresolved, and the next steps. Cite the evidence and distinguish recorded facts from suggestions.'],
    ['Update the matter brief', 'Use this matter’s records to propose an updated brief, including background, open questions and next steps. Preserve unresolved issues and show me the proposed update for confirmation.'],
  ];
  return <details className="capability-hints contextual-chat-hints"><summary>{source ? 'Work with this file in chat' : 'Keep this matter current with chat'}</summary>
    <p>{source ? 'These examples attach the version you are viewing to a new chat. Nothing is sent until you choose Send.' : 'These examples start a chat with this matter selected. Brief updates are proposed for your review.'}</p>
    <div className="practice-document-actions">{actions.map(([label, prompt]) => <button className="button" key={label} disabled={busy} onClick={async () => {
      setBusy(true); setError(''); try { await startDraftChat(prompt!, source ? [source.revisionId] : [], matterId); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>{label}</button>)}</div>
    {error && <ErrorNotice message={error} />}
  </details>;
}
