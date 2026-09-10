"""Reviewed working-preference imports in a disposable empty workspace. No model calls."""
import base64
import time
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:7459'
OUT=Path(__file__).parent/'.tmp'/'workspace'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page()
    errors,external=[],[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    context.on('request',lambda request:external.append(request.url) if not request.url.startswith(BASE) else None)
    def api(path,body=None):
        headers={'Authorization':'Bearer workspace-browser-test-only'}
        response=context.request.get(BASE+'/api/workspace'+path,headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path,headers=headers,data=body)
        assert response.ok,response.text()
        return response.json()
    def stage(files):
        batch=api('/imports',{'clientId':str(uuid4()),'label':'Synthetic working preferences','files':[{'path':path,'byteCount':len(body.encode())} for path,body in files.items()]})
        for entry in batch['entries']:
            api('/imports/'+batch['id']+'/files/'+entry['id'],{'base64':base64.b64encode(files[entry['path']].encode()).decode()})
        deadline=time.monotonic()+10
        while time.monotonic()<deadline:
            batch=api('/imports/'+batch['id'])
            if all(entry['status']=='ready' for entry in batch['entries']): return batch
            time.sleep(0.05)
        raise AssertionError('Local extraction did not finish')
    initial=api('/working-preferences',{'expectedRevisionId':None,'writingInstructions':'Keep this writing preference.','generalReview':'Keep these general instructions.','signingInstructions':'Keep this signing guidance.','ndaReview':'Old NDA instructions.','authorMode':'custom','customAuthor':'Original Author'})
    files={'Loose/NDA.md':'## NDA review instructions\nMake surgical edits and explain material changes.',
           'Loose/Word.md':'## Word output\nword author: Synthetic Lawyer\nfilename pattern: {document} ({variant} {date})\nredline label: SL Redline\ndraft label: SL Draft',
           'Loose/Notes.md':'A retained file without recognizable settings.'}
    batch=stage(files)
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/imports?id='+batch['id'])
    expect(page.get_by_role('button',name='Review and import 3 files')).to_be_enabled()
    for path in ['Loose/NDA.md','Loose/Word.md']:
        page.get_by_role('button',name='Review '+path,exact=True).click()
        dialog=page.get_by_role('dialog')
        expect(dialog.get_by_text('This file has labeled working preferences.',exact=False)).to_be_visible()
        dialog.get_by_label('Import destination',exact=True).select_option('profile')
        expect(dialog.get_by_role('heading',name='Working preferences',exact=True)).to_be_visible()
        expect(dialog.get_by_role('heading',name='Your profile',exact=True)).to_have_count(0)
        if path.endswith('NDA.md'):
            expect(dialog.get_by_label('Use NDA review instructions')).not_to_be_checked()
            dialog.get_by_label('Imported nda review instructions').fill('Make surgical edits. Keep comments concise.')
            dialog.get_by_label('Use NDA review instructions').check()
            dialog.locator('summary').filter(has_text='Current value').click()
            expect(dialog.get_by_text('Old NDA instructions.',exact=True)).to_be_visible()
            for width,height in [(1440,1000),(390,844),(320,740)]:
                page.set_viewport_size({'width':width,'height':height})
                dialog.get_by_role('heading',name='Working preferences',exact=True).scroll_into_view_if_needed()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.screenshot(path=str(OUT/f'import-preferences-{width}.png'))
            page.set_viewport_size({'width':1440,'height':1000})
        else:
            for name in ['Word author','Word filename pattern','Redline filename label','Draft filename label']:
                dialog.get_by_label('Use '+name,exact=True).check()
            expect(dialog.get_by_text('Acme NDA (SL Redline 2026-09-09).docx',exact=True)).to_be_visible()
        dialog.get_by_role('button',name='Save import choice',exact=True).click()
    # No-label files support manual review. Clearing a field is intentional and never inferred.
    page.get_by_role('button',name='Review Loose/Notes.md',exact=True).click()
    dialog.get_by_label('Import destination',exact=True).select_option('profile')
    dialog.get_by_role('button',name='Show other preference fields').click()
    dialog.get_by_label('Imported signing guidance').fill('')
    dialog.get_by_label('Use Signing guidance',exact=True).check()
    expect(dialog.get_by_text('This will clear the current field.',exact=True)).to_be_visible()
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    assert api('/working-preferences')==initial
    page.reload()
    page.get_by_role('button',name='Review and import 3 files').click()
    expect(dialog.get_by_label('Apply these reviewed preference changes')).not_to_be_checked()
    dialog.get_by_label('Apply these reviewed preference changes').check()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(page.get_by_text('Your reviewed working preferences were applied.',exact=False)).to_be_visible()
    saved=api('/working-preferences')
    assert saved['version']==2 and saved['writingInstructions']==initial['writingInstructions'] and saved['generalReview']==initial['generalReview']
    assert saved['ndaReview']=='Make surgical edits. Keep comments concise.' and saved['customAuthor']=='Synthetic Lawyer' and saved['authorMode']=='custom'
    assert saved['signingInstructions']=='' and saved['redlineLabel']=='SL Redline' and saved['draftLabel']=='SL Draft'
    assert api('')['profile'] is None and api('')['entityRegistry'] is None
    retained=api('/imports/'+batch['id'])
    assert retained['receipt']['workingPreferencesRevisionId']==saved['revisionId']
    for item in retained['receipt']['items']:
        entry=next(entry for entry in retained['entries'] if entry['id']==item['entryId'])
        response=context.request.get(BASE+'/api/workspace/source-revisions/'+item['sourceRevisionId']+'/original',headers={'Authorization':'Bearer workspace-browser-test-only'})
        assert response.body()==files[entry['path']].encode()
    # A later concurrent edit requires review again, not silent rebasing.
    second=stage({'profile.md':'## NDA review\nUpdated default.'})
    page.goto(BASE+'/#/imports?id='+second['id'])
    page.get_by_role('button',name='Review profile.md',exact=True).click()
    dialog.get_by_label('Use NDA review instructions').check()
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    fields={key:value for key,value in saved.items() if key not in ['revisionId','version','updatedAt']}
    concurrent=api('/working-preferences',{**fields,'expectedRevisionId':saved['revisionId'],'ndaReview':'A concurrent new instruction.'})
    page.get_by_role('button',name='Review and import 1 files').click()
    dialog.get_by_label('Apply these reviewed preference changes').check()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(dialog.get_by_text('Working preferences changed after your import review.',exact=False)).to_be_visible()
    assert api('/imports/'+second['id'])['status']=='review' and api('/working-preferences')==concurrent
    dialog.get_by_role('button',name='Back to review').click()
    page.get_by_role('button',name='Review profile.md',exact=True).click()
    expect(dialog.get_by_label('Use NDA review instructions')).to_be_disabled()
    dialog.get_by_role('button',name='Review against current preferences').click()
    expect(dialog.get_by_label('Use NDA review instructions')).not_to_be_checked()
    dialog.get_by_label('Use NDA review instructions').check()
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    page.get_by_role('button',name='Review and import 1 files').click()
    dialog.get_by_label('Apply these reviewed preference changes').check()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(page.get_by_text('Your reviewed working preferences were applied.',exact=False)).to_be_visible()
    assert api('/working-preferences')['ndaReview']=='Updated default.'
    assert not errors,errors
    assert not external,external
    browser.close()
print('PASS: explicit multi-file preference import, current/proposed review, filename examples, field clearing, unchanged settings, stale-review recovery, retained originals, desktop/mobile; no model calls')
