import { go, request, type Conversation } from './api';

/** Create a visible, editable draft. A hint click never sends a model request. */
export async function startDraftChat(message: string, attachments: string[] = [], matterId?: string) {
  if (message.length > 30_000 || attachments.length > 12) throw new Error('Use up to 12 files and 30,000 characters in one chat draft. Nothing was sent.');
  const conversation = await request<Conversation>('/conversations', matterId ? { matterId, scope: 'matter' } : {});
  await request('/drafts', { key: `chat:${conversation.id}`, expectedRevisionId: null, writeId: crypto.randomUUID(),
    value: { message, attachments, scope: matterId ?? 'conversation', clientId: crypto.randomUUID() } });
  go('home', { id: conversation.id });
}
