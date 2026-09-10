import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { ConversationActions } from './ConversationActions';
import type { Conversation } from './api';
afterEach(cleanup);
const conversation: Conversation = { id: 'fixture', title: 'Advice discussion', matterId: null, scope: 'conversation', createdAt: '', updatedAt: '' };
test('active conversation menu offers rename, archive and recoverable Trash', () => {
  render(<ConversationActions conversation={conversation} onChanged={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage conversation: Advice discussion' }));
  expect(screen.getByRole('button', { name: 'Rename', exact: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Archive', exact: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Move to Trash', exact: true })).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Archive', exact: true })).toBeNull();
});
test('Trash offers restore, never a misleading permanent-delete control', () => {
  render(<ConversationActions conversation={{ ...conversation, lifecycle: 'trashed' }} onChanged={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage conversation: Advice discussion' }));
  expect(screen.getByRole('button', { name: 'Restore conversation' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
});
test('running responses disable conversation management', () => {
  render(<ConversationActions conversation={conversation} running onChanged={() => {}} />);
  expect((screen.getByRole('button', { name: 'Manage conversation: Advice discussion' }) as HTMLButtonElement).disabled).toBe(true);
});
