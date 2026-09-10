import { afterEach, expect, test } from 'bun:test';
import { cleanup, userEvent, render, screen } from '../test/dom';
import { WorkingPreferences } from './WorkingPreferences';
import { ConversationHistory } from './ConversationHistory';
import type { Snapshot } from './api';

afterEach(() => { cleanup(); sessionStorage.clear(); });
const saved = { revisionId: '62f8844d-4090-4404-bdfb-f2cd740ee505', version: 2, updatedAt: '2026-09-06T02:00:00.000Z',
  writingInstructions: '## Writing\n\nUse plain language.', signingInstructions: 'Ask when the agreement value is unknown.',
  generalReview: 'Preserve structure.', ndaReview: 'Make surgical edits.', authorMode: 'custom' as const, customAuthor: 'Avery', filenamePattern: '{document}_{variant}', redlineLabel: 'redline', draftLabel: 'draft' };
const data = { databasePath: 'synthetic-preferences-test', workingPreferences: saved, profile: null, matters: [] } as unknown as Snapshot;
test('saved preference metadata does not break the editable form, and previews use the actual pattern', () => {
  render(<WorkingPreferences data={data} changed={() => {}} editProfile={() => {}} />);
  expect((screen.getByRole('textbox', { name: 'General document review' }) as HTMLTextAreaElement).value).toBe('Preserve structure.');
  expect((screen.getByRole('textbox', { name: 'NDA review instructions' }) as HTMLTextAreaElement).value).toBe('Make surgical edits.');
  expect(screen.getByText('Mutual NDA_redline.docx')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Save working preferences' }) as HTMLButtonElement).disabled).toBe(true);
});
test('unsaved preference edits survive navigation without changing the saved revision', async () => {
  const user = userEvent.setup({ document });
  const view = render(<WorkingPreferences data={data} changed={() => {}} editProfile={() => {}} />);
  await user.clear(screen.getByRole('textbox', { name: 'NDA review instructions' }));
  await user.type(screen.getByRole('textbox', { name: 'NDA review instructions' }), 'My unsaved edit.');
  view.unmount();
  render(<WorkingPreferences data={{ ...data, workingPreferences: { ...saved, version: 3, ndaReview: 'Another saved update.' } }} changed={() => {}} editProfile={() => {}} />);
  expect((screen.getByRole('textbox', { name: 'NDA review instructions' }) as HTMLTextAreaElement).value).toBe('My unsaved edit.');
  expect(screen.getByText('These edits are not in use until you save working preferences.')).toBeTruthy();
});
test('conversation history opens exact chats, filters titles and offers a distinct new draft', async () => {
  const user = userEvent.setup({ document });
  render(<ConversationHistory data={data} conversations={[{ id: 'chat-1', title: 'Review the NDA', scope: 'conversation', matterId: null,
    running: true, turnCount: 2, lastStatus: 'running', createdAt: saved.updatedAt, updatedAt: saved.updatedAt }]} />);
  expect(screen.getByRole('link', { name: /Review the NDA/ }).getAttribute('href')).toBe('#/home?id=chat-1');
  expect(screen.getByRole('link', { name: 'New chat' }).getAttribute('href')).toContain('#/home?new=');
  expect(screen.getByText('Responding…')).toBeTruthy();
  await user.type(screen.getByRole('textbox', { name: 'Find a conversation' }), 'missing');
  expect(screen.getByText('No matching conversations')).toBeTruthy();
});
test('writing and document views share unsaved state without dropping hidden fields', async () => {
  const user = userEvent.setup({ document });
  const view = render(<WorkingPreferences data={data} section="writing" changed={() => {}} editProfile={() => {}} />);
  await user.clear(screen.getByRole('textbox', { name: 'Writing instructions' }));
  await user.type(screen.getByRole('textbox', { name: 'Writing instructions' }), 'Full updated writing.');
  view.rerender(<WorkingPreferences data={data} section="documents" changed={() => {}} editProfile={() => {}} />);
  expect((screen.getByRole('textbox', { name: 'NDA review instructions' }) as HTMLTextAreaElement).value).toBe(saved.ndaReview);
  view.rerender(<WorkingPreferences data={data} section="writing" changed={() => {}} editProfile={() => {}} />);
  expect((screen.getByRole('textbox', { name: 'Writing instructions' }) as HTMLTextAreaElement).value).toBe('Full updated writing.');
  expect((screen.getByRole('textbox', { name: 'Signing guidance' }) as HTMLTextAreaElement).value).toBe(saved.signingInstructions);
});
