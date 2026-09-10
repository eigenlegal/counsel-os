import { afterEach, expect, test } from 'bun:test';
import { cleanup, userEvent, render, screen } from '../test/dom';
import { useState } from 'react';
import { ImportProfileFields } from './ImportProfileFields';
import { mapImportProfile } from '../../../src/workspace/import-profile';
import type { ProfileFields } from './api';
afterEach(cleanup);

test('all mapped preferences can be reviewed and edited without losing other fields or enabling sharing', async () => {
  const mapping=mapImportProfile('name: Fictional Lawyer\n## Voice\nPlain words.\n## Philosophy\nProportionate advice.');
  let changed:ProfileFields|null=null;
  function Harness() {
    const [profile,setProfile]=useState(mapping.suggestion);
    return <ImportProfileFields profile={profile} mapping={mapping} change={value=>{changed=value;setProfile(value);}} />;
  }
  render(<Harness />);
  expect((screen.getByLabelText('Import profile voice') as HTMLTextAreaElement).value).toBe('Plain words.');
  const user=userEvent.setup({document});
  await user.clear(screen.getByLabelText('Import profile voice'));
  await user.type(screen.getByLabelText('Import profile voice'),'Short plain words.');
  expect(changed).toMatchObject({name:'Fictional Lawyer',principles:'Proportionate advice.',voice:'Short plain words.',applyToChats:false});
  expect(screen.getByText(/Word output preferences, NDA instructions/)).toBeTruthy();
});
test('mapping gaps and identity warnings remain visible, escaped and nonmutating', () => {
  const mapping=mapImportProfile('## Voice\n'+ 'x'.repeat(2001)+'\n## <img src=x onerror=alert(1)>\nUnknown section.');
  let changes=0;const {container}=render(<ImportProfileFields profile={mapping.suggestion} mapping={mapping} change={()=>{changes++;}} />);
  expect(screen.getByText(/not shortened or applied/)).toBeTruthy();
  expect(screen.getByText(/Not mapped to profile fields: <img/)).toBeTruthy();expect(container.querySelector('img')).toBeNull();expect(changes).toBe(0);
});
