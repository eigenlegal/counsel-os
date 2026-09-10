import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen, userEvent } from '../test/dom';
import { useState } from 'react';
import { ImportPreferenceFields } from './ImportPreferenceFields';
import { mapImportPreferences, type ImportPreferenceReview } from '../../../src/workspace/import-preferences';
import { WorkingPreferences } from '../../../src/workspace/working-preferences';
afterEach(cleanup);
const current=WorkingPreferences.parse({revisionId:crypto.randomUUID(),version:1,updatedAt:'2026-09-09T00:00:00Z',ndaReview:'Existing NDA guidance.',writingInstructions:'Keep my writing.'});

test('mapped preferences start unchecked; choosing and editing one field never resets unrelated defaults', async()=>{
  let last:ImportPreferenceReview|null=null;
  function Harness(){const[review,setReview]=useState<ImportPreferenceReview|null>(null);return <ImportPreferenceFields mapping={mapImportPreferences('## NDA review\nSurgical changes.\n## Word output\nword author: Synthetic Lawyer')}
    current={current} profile={null} review={review} change={value=>{last=value;setReview(value);}}/>;}
  render(<Harness/>);const user=userEvent.setup({document});
  expect((screen.getByLabelText('Use NDA review instructions') as HTMLInputElement).checked).toBe(false);
  await user.clear(screen.getByLabelText('Imported nda review instructions'));await user.type(screen.getByLabelText('Imported nda review instructions'),'My selected guidance.');
  expect(last).toBeNull();
  await user.click(screen.getByLabelText('Use NDA review instructions'));
  expect(last as ImportPreferenceReview|null).toEqual({expectedRevisionId:current.revisionId,changes:{ndaReview:'My selected guidance.'}});
  await user.click(screen.getByLabelText('Use Word author'));
  expect(last).toMatchObject({changes:{ndaReview:'My selected guidance.',customAuthor:'Synthetic Lawyer',authorMode:'custom'}});
  expect(last!.changes).not.toHaveProperty('writingInstructions');expect(screen.getByText('Acme NDA - redline.docx')).toBeTruthy();
  await user.click(screen.getByLabelText('Use Word author'));expect(last!.changes).not.toHaveProperty('authorMode');
});
test('stale review requires explicit reselection against current preferences and keeps the draft', async()=>{
  let last:ImportPreferenceReview|null={expectedRevisionId:null,changes:{ndaReview:'Older reviewed text.'}};
  function Harness(){const[review,setReview]=useState(last);return <ImportPreferenceFields mapping={mapImportPreferences('## NDA review\nOriginal text.')}
    current={current} profile={null} review={review} change={value=>{last=value;setReview(value);}}/>;}
  render(<Harness/>);const user=userEvent.setup({document});
  expect((screen.getByLabelText('Use NDA review instructions') as HTMLInputElement).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:'Review against current preferences'}));expect(last).toBeNull();
  expect((screen.getByLabelText('Imported nda review instructions') as HTMLTextAreaElement).value).toBe('Older reviewed text.');
  await user.click(screen.getByLabelText('Use NDA review instructions'));
  expect(last).toEqual({expectedRevisionId:current.revisionId,changes:{ndaReview:'Older reviewed text.'}});
});
test('unmapped fields can be drafted manually, with empty-field warnings and escaped content',async()=>{
  let last:ImportPreferenceReview|null=null;
  function Harness(){const[review,setReview]=useState<ImportPreferenceReview|null>(null);return <ImportPreferenceFields mapping={mapImportPreferences('## Unexpected heading\nUnmapped.')}
    current={current} profile={null} review={review} change={value=>{last=value;setReview(value);}}/>;}
  const {container}=render(<Harness/>);const user=userEvent.setup({document});
  await user.click(screen.getByRole('button',{name:'Show other preference fields'}));
  await user.click(screen.getByLabelText('Imported nda review instructions'));
  await user.keyboard('{Control>}a{/Control}{Backspace}');
  await user.click(screen.getByLabelText('Use NDA review instructions'));
  expect(last as ImportPreferenceReview|null).toEqual({expectedRevisionId:current.revisionId,changes:{ndaReview:''}});
  expect(screen.getByText('This will clear the current field.')).toBeTruthy();
  await user.type(screen.getByLabelText('Imported nda review instructions'),'<script>bad()</script>');expect(container.querySelector('script')).toBeNull();
});
