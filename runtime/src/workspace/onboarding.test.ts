import { expect, test } from 'bun:test';
import { WorkspaceStore } from './store';
import { workspaceSetup, SetupAction } from './onboarding';
test('setup is optional for new personal workspaces and never takes over example or existing workspaces', () => {
  const store = new WorkspaceStore({databasePath:':memory:'});
  try {
    expect(workspaceSetup(store,false)).toEqual({suggested:true,dismissed:false});
    expect(workspaceSetup(store,true).suggested).toBe(false);
    expect(() => SetupAction.parse({action:'dismiss',enableAI:true})).toThrow();
    store.setSetting('workspace-onboarding',{dismissedAt:new Date().toISOString()});
    expect(workspaceSetup(store,false)).toEqual({suggested:false,dismissed:true});
    expect(store.getProfile()).toBeNull(); expect(store.setting('connection')).toBeNull();
  } finally {store.close();}
  const used = new WorkspaceStore({databasePath:':memory:'});
  try { used.createMatter({title:'Existing synthetic work'}); expect(workspaceSetup(used,false).suggested).toBe(false); }
  finally {used.close();}
});
