import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '../test/dom';
import { ContextPanel, type CurrentChatContext } from './ContextPanel';
import type { Turn, WorkspaceProfile } from './api';
import { preferenceSnapshot, WorkingPreferences } from '../../../src/workspace/working-preferences';

afterEach(cleanup);
const preferences = WorkingPreferences.parse({revisionId:'aa935620-a0da-49d6-9851-78ff55c0e379', version:2, updatedAt:'2026-01-01T00:00:00Z', generalReview:'Current review instructions.'});
const current: CurrentChatContext = {matterTitle:'Current matter', documents:[{id:'draft-revision', title:'New draft attachment', pending:true, textStatus:'partial'}], workingPreferences:preferences, entityRegistry:null};
const profile = {name:'PRIVATE-PROFILE-CANARY', applyToChats:false} as WorkspaceProfile;
const turn = {id:'turn-a', request:'Earlier question', status:'complete', state:{
  scopeContext:{scope:'matter', matterId:'matter-old'}, matterContext:{id:'matter-old', title:'Recorded matter', summary:'Recorded brief.', truncated:false},
  profileStatus:'disabled', profileContext:null, workingPreferences:preferenceSnapshot({...preferences, version:1, generalReview:'Earlier review instructions.'}, null),
  historyTurns:0, context:[], guidesRead:[], model:'Synthetic fixture',
}} as unknown as Turn;
const props = {profile, conversation:{scope:'matter' as const, matterId:'matter-current'}, current, latestTurn:turn, inspection:null, close:()=>{}, inspect:()=>{}, selectTurn:(_:string|undefined)=>{}};

test('next-message context shows pending files and current preferences without inventing reads or sharing a disabled profile', () => {
  let selected: string|undefined;
  const {container} = render(<ContextPanel {...props} turn={null} selectTurn={id => {selected=id;}} />);
  expect(screen.getByText('Available for your next message')).toBeTruthy();
  expect(screen.getByRole('heading', {name:'Current matter'})).toBeTruthy();
  expect(screen.getByText('Added for next message · not sent yet')).toBeTruthy();
  expect(screen.getByText('Partial text')).toBeTruthy();
  expect(container.textContent).toContain('Current review instructions.');
  expect(container.textContent).not.toContain('Earlier review instructions.');
  expect(container.textContent).not.toContain('PRIVATE-PROFILE-CANARY');
  fireEvent.click(screen.getByRole('button', {name:'Latest response'}));
  expect(selected).toBe('turn-a');
});

test('response context uses pinned scope and instructions and never includes later draft documents', () => {
  let called=false;
  const {container} = render(<ContextPanel {...props} turn={turn} selectTurn={id=>{called=id===undefined;}} />);
  expect(screen.getByText('Recorded for this response')).toBeTruthy();
  expect(screen.getByText('Earlier question')).toBeTruthy();
  expect(screen.getByRole('heading', {name:'Recorded matter'})).toBeTruthy();
  expect(container.textContent).toContain('Earlier review instructions.');
  expect(container.textContent).not.toContain('Current review instructions.');
  expect(container.textContent).not.toContain('New draft attachment');
  expect(container.textContent).not.toContain('PRIVATE-PROFILE-CANARY');
  fireEvent.click(screen.getByRole('button', {name:'Next message'}));
  expect(called).toBe(true);
});

test('an earlier response with no preference snapshot must not inherit current instructions', () => {
  const {container} = render(<ContextPanel {...props} turn={{...turn, state:{...turn.state, workingPreferences:undefined}}} />);
  expect(container.textContent).not.toContain('Current review instructions.');
  expect(screen.queryByLabelText('Working instructions included')).toBeNull();
});

test('prepared context explains evidence-following and partial matter coverage without implying complete review', () => {
  const prepared = {...turn, state:{...turn.state, preparedContext:{
    records:[{kind:'work' as const, id:'earlier'}, {kind:'source' as const, id:'source'}], note:'Fixture',
    retrieval:{method:'scoped-evidence-v2' as const, requestTerms:[], supplementalTerms:[], limited:true, characters:100,
      evidenceReads:[{kind:'source' as const, id:'source', from:{kind:'work' as const, id:'earlier'}, relation:'newer-version' as const}],
      selectedMatters:7, matterNotesRead:6, unavailableLinks:1, omittedLinks:0},
  }}};
  render(<ContextPanel {...props} turn={prepared} />);
  const explanation = screen.getByLabelText('Automatic context preparation');
  expect(explanation.textContent).toContain('Followed saved evidence links for 1 additional passage.');
  expect(explanation.textContent).toContain('not the original supporting evidence');
  expect(explanation.textContent).toContain('6 of 7 selected matters');
  expect(explanation.textContent).toContain('Some supporting links could not be followed');
  expect(explanation.textContent).toContain('not an exhaustive review');
});

test('older preparation snapshots remain readable without inventing evidence-following', () => {
  render(<ContextPanel {...props} turn={{...turn, state:{...turn.state,
    preparedContext:{records:[{kind:'work', id:'old'}], note:'Previous preparation'},
  }}} />);
  expect(screen.getByLabelText('Automatic context preparation').textContent).toContain('1 record');
  expect(screen.queryByText(/Followed saved evidence/)).toBeNull();
  expect(screen.queryByText(/Starting notes cover/)).toBeNull();
});
test('alternate search vocabulary is disclosed independently of actual reads, escaped and not presented as evidence',()=>{
  const planned={...turn,state:{...turn.state,preparedContext:{records:[],note:'Fixture',retrieval:{method:'scoped-query-fusion-v3' as const,
    requestTerms:['recruit'],supplementalTerms:[],limited:false,characters:0,plan:{status:'expanded' as const,queries:['nonsolicitation','<img src=x onerror=alert(1)>'],terms:[['nonsolicitation']],limited:true,note:'Fixture'}}}}};
  const {container}=render(<ContextPanel {...props} turn={planned}/>);
  expect(screen.getByLabelText('Search approach').textContent).toContain('nonsolicitation');
  expect(screen.getByLabelText('Search approach').textContent).toContain('not sources or evidence');
  expect(container.querySelector('img')).toBeNull();expect(screen.queryByLabelText('Automatic context preparation')).toBeNull();
  expect(screen.getByText('Only a bounded part', {exact:false})).toBeTruthy();
});
test('unavailable search planning is a recorded fallback, not a missing-record or retrieval-service failure',()=>{
  render(<ContextPanel {...props} turn={{...turn,state:{...turn.state,preparedContext:{records:[],note:'Fixture',retrieval:{method:'scoped-evidence-v2',
    requestTerms:[],supplementalTerms:[],limited:false,characters:0,plan:{status:'unavailable',queries:[],terms:[],limited:false,note:'Search planning timed out. Continued with original search, attachments and supporting links.'}}}}}}/>);
  expect(screen.getByLabelText('Search approach').textContent).toContain('Continued with original search');
  expect(screen.queryByLabelText('Automatic context preparation')).toBeNull();
});
