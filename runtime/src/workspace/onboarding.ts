import { z } from 'zod';
import type { WorkspaceStore } from './store';
export interface SetupState { dismissed: boolean; suggested: boolean }
export const SetupAction = z.object({ action: z.literal('dismiss') }).strict();
export function workspaceSetup(store: WorkspaceStore, demo: boolean): SetupState {
  const dismissed = !!store.setting('workspace-onboarding');
  const totals = store.catalog().totals;
  const hasWork = totals.matters + totals.sources + totals.knowledge + totals.work > 0 || !!store.getProfile()
    || !!store.getWorkingPreferences() || store.conversations.list().length > 0 || store.drafts.list().length > 0;
  return { dismissed, suggested: !demo && !dismissed && !hasWork };
}
