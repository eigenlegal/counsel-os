import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '../test/dom';
import { UserPrompt } from './UserPrompt';
const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => { cleanup(); if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else Reflect.deleteProperty(navigator, 'clipboard'); });
test('copying a prompt preserves exact text and line breaks without attachments or bylines', async () => {
  let copied = '';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { copied = value; } } });
  const text = '  Synthetic question\r\n\r\nUS:\nEU: café 📄\n<literal>\n';
  render(<UserPrompt text={text} attachmentCount={2} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy());
  expect(copied).toBe(text);
  expect(screen.getByRole('status').textContent).toBe('Prompt copied to clipboard.');
});
test('clipboard failure remains visible and can be retried', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('private system diagnostic'); } } });
  render(<UserPrompt text="Synthetic" attachmentCount={0} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Clipboard access was blocked'));
  expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeTruthy();
  expect(document.body.textContent).not.toContain('private system diagnostic');
});
