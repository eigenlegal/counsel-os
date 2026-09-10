import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen, userEvent } from '../test/dom';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import type { Snapshot } from './api';
afterEach(cleanup);
const data = {profile:null,connection:{ready:false,config:null,label:'Not connected'}} as Snapshot;
test('first-run setup offers a local-only path without mandatory client or profile forms', async () => {
  let edited = 0;
  render(<WorkspaceWelcome data={data} changed={() => {}} editProfile={() => {edited++;}} />);
  expect(screen.getByRole('button',{name:'Explore without AI'})).toBeTruthy();
  expect(screen.getByRole('link',{name:'Import files'}).getAttribute('href')).toBe('#/imports');
  expect(screen.queryByRole('textbox')).toBeNull();
  await userEvent.setup({document}).click(screen.getByRole('button',{name:'Add your profile'})); expect(edited).toBe(1);
});
test('configured is not presented as authenticated, tested or connected to a live model', () => {
  render(<WorkspaceWelcome data={{...data,connection:{...data.connection,ready:true,label:'Synthetic connection'}}} changed={() => {}} editProfile={() => {}} />);
  expect(screen.getByText(/Account access is checked when you use it/)).toBeTruthy();
  expect(screen.getByRole('button',{name:'Start working'})).toBeTruthy();
});
