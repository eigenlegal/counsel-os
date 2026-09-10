import { afterEach, expect, test } from 'bun:test';
import '../test/dom';
import { DraftRecovery } from './draft-recovery';
import type { ChatDraft, SavedDraft } from '../../../src/workspace/draft-types';
import type { request } from './api';

const active: DraftRecovery<ChatDraft>[] = [];
const empty = (): ChatDraft => ({message:'',attachments:[],scope:'conversation',clientId:crypto.randomUUID()});
afterEach(() => { active.splice(0).forEach(d => d.close()); sessionStorage.clear(); });
function server() {
  let row: SavedDraft = {key:'chat:new::',value:null,revisionId:null,writeId:null,updatedAt:null};
  let loseResponse = false, writes = 0;
  const call = (async (_: string, input?: any) => {
    if (!input) return structuredClone(row);
    if (input.writeId === row.writeId) return structuredClone(row);
    if (input.expectedRevisionId !== row.revisionId) throw new Error('another window');
    row = {...input,revisionId:crypto.randomUUID(),updatedAt:new Date().toISOString()}; writes++;
    if (loseResponse) { loseResponse = false; throw new Error('lost response'); }
    return structuredClone(row);
  }) as typeof request;
  function client(initial = empty()) { const d = new DraftRecovery('chat:new::',initial,true,undefined,call,empty()); active.push(d); return d; }
  return { client, get: () => row, writes: () => writes, lose: () => {loseResponse = true;} };
}
test('a fresh window restores text with no session storage', async () => {
  const s = server(), first = s.client(); await first.open(); first.set({...first.value,message:'Synthetic working draft'}); expect(await first.flush()).toBe(true);
  const second = s.client(); await second.open(); expect(second.value.message).toBe('Synthetic working draft'); expect(s.writes()).toBe(1);
});
test('concurrent editors do not overwrite one another and failed input remains copyable', async () => {
  const s = server(), a = s.client(), b = s.client(); await a.open(); await b.open();
  a.set({...a.value,message:'First edit'}); await a.flush(); b.set({...b.value,message:'Other edit'});
  expect(await b.flush()).toBe(false); expect(b.value.message).toBe('Other edit'); expect(b.error).toContain('another window');
  expect((s.get().value as ChatDraft).message).toBe('First edit');
  await b.load(empty()); expect(b.value.message).toBe('First edit');
});
test('a lost reply retries its exact write identity before saving newer input', async () => {
  const s = server(), a = s.client(); await a.open(); s.lose();
  a.set({...a.value,message:'First'}); expect(await a.flush()).toBe(false);
  a.set({...a.value,message:'Latest'}); expect(await a.flush()).toBe(true);
  expect(s.writes()).toBe(2); expect((s.get().value as ChatDraft).message).toBe('Latest');
});
test('typing while a save is pending flushes the latest value, and quit flush saves without waiting for debounce', async () => {
  const s = server(), a = s.client(); await a.open(); a.set({...a.value,message:'One'});
  const first = a.flush(); a.set({...a.value,message:'Two'}); const second = a.flush();
  expect(await first).toBe(true); expect(await second).toBe(true);
  a.set({...a.value,message:'Quit immediately'}); expect(await window.counselSaveDrafts!()).toBe(true);
  expect((s.get().value as ChatDraft).message).toBe('Quit immediately');
});
test('failed initial load does not claim durability or permit writes', async () => {
  const d = new DraftRecovery('chat:new::',empty(),true,undefined,(async () => {throw new Error('offline');}) as typeof request); active.push(d);
  await d.open(); expect(d.ready).toBe(false); expect(await d.flush()).toBe(false); expect(d.error).toBe('offline');
});
