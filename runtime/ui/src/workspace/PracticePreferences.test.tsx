import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { ProfileDetails, ProfileEditor } from './Profile';
import { PracticePreferences } from './PracticePreferences';
import type { Snapshot, WorkspaceProfile } from './api';

afterEach(() => { cleanup(); sessionStorage.clear(); });
const voice = '## Tone\n\nUse **plain language**.\n\n- Lead with the answer.\n\n<img src="https://invalid.example/tracker" onerror="bad()">';
const profile = { name: 'Synthetic Avery', role: 'Counsel', organization: 'Example Legal', voice, applyToChats: false } as WorkspaceProfile;
const data = { profile, databasePath: 'synthetic-preferences-reader', workingPreferences: { version: 1, ndaReview: '## NDA review\n\nMake **surgical** edits.', generalReview: '', authorMode: 'profile', filenamePattern: '{document}_{variant}' } } as Snapshot;
test('profile preferences share the Markdown reader and preserve exact saved text without remote embeds', () => {
  const { container } = render(<ProfileDetails profile={profile} />);
  expect(screen.getByRole('heading', { name: 'Tone' })).toBeTruthy();
  expect(container.querySelector('strong')?.textContent).toBe('plain language');
  expect(container.querySelector('li')?.textContent).toBe('Lead with the answer.');
  expect(container.querySelector('img, script, [onerror]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Saved text' }));
  expect(container.querySelector('.record-prose')?.textContent).toBe(voice);
});
test('Practice has a distinct profile view with an explicit sharing status and document preferences link', () => {
  let opened = false;
  render(<PracticePreferences data={data} view={null} changed={() => {}} editProfile={() => { opened = true; }} />);
  expect(screen.getByRole('region', { name: 'Your profile' })).toBeTruthy();
  expect(screen.getByText('Profile sharing off')).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByRole('link', { name: 'Document review & Word output' }).getAttribute('href')).toBe('#/knowledge?section=preferences&view=documents');
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  expect(opened).toBe(true);
});
test('saved identity explains login limits and points to Word attribution without changing sharing', () => {
  render(<PracticePreferences data={data} view={null} changed={() => { throw new Error('Viewing must not save'); }} editProfile={() => {}} />);
  expect(screen.getByText(/Counsel OS is instructed to use this saved identity—not your AI login/)).toBeTruthy();
  expect(screen.getByText(/Claude Code may independently include login details/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Word author setting' }).getAttribute('href')).toBe('#/knowledge?section=preferences&view=documents');
  expect(screen.getByText('Profile sharing off')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});
test('profile editor asks for identity confirmation in copy, not a new required checkbox or sharing change', () => {
  render(<ProfileEditor profile={profile} close={() => {}} saved={() => { throw new Error('Viewing must not save'); }} />);
  expect(screen.getByText(/Before saving, confirm the name and organization/)).toBeTruthy();
  expect(screen.getByText(/profile-sharing switch do not remove that information/)).toBeTruthy();
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect((screen.getByRole('checkbox', { name: 'Use my profile in chats' }) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('textbox', { name: 'Your name' }) as HTMLInputElement).value).toBe('Synthetic Avery');
});
test('one compact profile switch controls every field without a redundant disclosure', () => {
  const organizationContext = '- Synthetic coverage\n- Two regions';
  const {container} = render(<PracticePreferences data={{...data, profile: {...profile, organizationContext}}} view={null} changed={() => {}} editProfile={() => {}} />);
  expect(screen.getAllByRole('group', {name:'Text display'})).toHaveLength(1);
  expect(container.querySelector('.profile-card > details')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name:'Saved text'}));
  expect([...container.querySelectorAll('.record-prose')].map(node => node.textContent)).toEqual([organizationContext, voice]);
  fireEvent.click(screen.getByRole('button', {name:'Reading view'}));
  expect(screen.getByRole('heading', {name:'Tone'})).toBeTruthy();
  expect(container.querySelectorAll('img, script')).toHaveLength(0);
});
test('saved review preferences open in reading view; editing is explicit and keeps exact instructions', () => {
  const { container } = render(<PracticePreferences data={data} view="documents" changed={() => {}} editProfile={() => {}} />);
  expect(screen.getByRole('heading', { name: 'NDA review' })).toBeTruthy();
  expect(container.querySelector('strong')?.textContent).toBe('surgical');
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('Synthetic Avery')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Saved text' }));
  expect(container.querySelector('.record-prose')?.textContent).toBe(data.workingPreferences!.ndaReview);
  fireEvent.click(screen.getByRole('button', { name: 'Edit working preferences' }));
  expect((screen.getByRole('textbox', { name: 'NDA review instructions' }) as HTMLTextAreaElement).value).toBe(data.workingPreferences!.ndaReview);
});
test('writing has the shared Markdown reader and an explicit editing path', () => {
  const writingData = { ...data, workingPreferences: { ...data.workingPreferences!, writingInstructions: '## Length\n\nKeep **meaningful detail**.', signingInstructions: 'Ask about missing value.' } };
  const { container } = render(<PracticePreferences data={writingData} view="writing" changed={() => {}} editProfile={() => {}} />);
  expect(screen.getByRole('region', { name: 'Saved writing and signing preferences' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Length' })).toBeTruthy();
  expect(container.querySelector('strong')?.textContent).toBe('meaningful detail');
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Edit writing & signing' }));
  expect((screen.getByRole('textbox', { name: 'Writing instructions' }) as HTMLTextAreaElement).value).toBe(writingData.workingPreferences.writingInstructions);
});
