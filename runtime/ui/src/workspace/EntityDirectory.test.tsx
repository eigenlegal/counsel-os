import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { EntityDirectory } from './EntityDirectory';
import { SigningCheckCard } from './SigningCheck';
import { EntityRegistry, checkSignatory } from '../../../src/workspace/entities';
import type { Snapshot } from './api';

afterEach(cleanup);
const entityId = '10000000-0000-4000-8000-000000000001', personId = '10000000-0000-4000-8000-000000000002';
const registry = EntityRegistry.parse({ revisionId: '10000000-0000-4000-8000-000000000003', version: 1, updatedAt: '2026-09-06T12:00:00.000Z',
  availableToChats: false, entities: [{ id: entityId, name: 'Example LLC', sourceNote: '<img src="https://invalid.example/track">' }],
  signatories: [{ id: personId, name: 'Synthetic Alex' }], rules: [{ id: '10000000-0000-4000-8000-000000000004', label: 'NDA authority', entityIds: [entityId], agreementKinds: ['nda'], signatoryId: personId }] });
const data = { entityRegistry: registry } as Snapshot;
test('directory is optional, explicit about sharing and does not execute saved markup', () => {
  const { container } = render(<EntityDirectory data={data} changed={() => {}} />);
  expect(screen.getByText('Not shared with chats')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Make available to chats' })).toBeTruthy();
  expect(screen.getByText('Title not recorded')).toBeTruthy();
  expect(container.querySelector('img, script')).toBeNull();
  expect(container.textContent).toContain('<img src=');
});
test('entity editing preserves exact data and leaves unknown addresses blank', () => {
  render(<EntityDirectory data={data} changed={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit entity Example LLC' }));
  expect((screen.getByRole('textbox', { name: 'Legal name' }) as HTMLInputElement).value).toBe('Example LLC');
  expect((screen.getByRole('textbox', { name: 'Registered address' }) as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByRole('textbox', { name: 'Notice address' }) as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByRole('textbox', { name: 'Source or basis' }) as HTMLTextAreaElement).value).toBe(registry.entities[0]!.sourceNote);
});
test('signing check describes a suggestion and preserves its input/version receipt', () => {
  const result = checkSignatory({ ...registry, availableToChats: true }, { entityId, agreementKind: 'nda' });
  render(<SigningCheckCard value={result} />);
  expect(screen.getByRole('heading', { name: 'Suggested signatory: Synthetic Alex' })).toBeTruthy();
  expect(screen.getByText(/Directory version 1/)).toBeTruthy();
  expect(screen.getByText('A routing suggestion, not verified authority or agreement approval.')).toBeTruthy();
});
