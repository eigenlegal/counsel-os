"""Profile mapping and company-file separation in an isolated, empty workspace. No model calls."""
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
        batch=api('/imports',{'clientId':str(uuid4()),'label':'Synthetic profile review','files':[{'path':path,'byteCount':len(body.encode())} for path,body in files.items()]})
        for entry in batch['entries']:
            api('/imports/'+batch['id']+'/files/'+entry['id'],{'base64':base64.b64encode(files[entry['path']].encode()).decode()})
        deadline=time.monotonic()+10
        while time.monotonic()<deadline:
            batch=api('/imports/'+batch['id'])
            if all(entry['status']=='ready' for entry in batch['entries']): return batch
            time.sleep(0.05)
        raise AssertionError('Local extraction did not finish')
    files={'Practice/profile.md':'# My practice\n## Team\nname: Someone Else\n## Philosophy\nKeep advice proportionate.\n## Voice\nUse plain language.\n## Business Context\nIndependent advisory practice.\n## Escalation Triggers\nAsk when uncertain.\n## Word output\nA retained-only setting.',
           'Companies/Acme/profile.md':'name: Acme Inc.\nCompany background, not the lawyer’s personal profile.'}
    batch=stage(files)
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/imports?id='+batch['id'])
    expect(page.get_by_role('button',name='Review and import 2 files')).to_be_enabled()
    page.get_by_role('button',name='Review Companies/Acme/profile.md',exact=True).click()
    dialog=page.get_by_role('dialog')
    expect(dialog.get_by_label('Import destination',exact=True)).to_have_value('source')
    expect(dialog.get_by_role('heading',name='Your profile',exact=True)).to_have_count(0)
    dialog.get_by_role('button',name='Cancel',exact=True).click()
    page.get_by_role('button',name='Review Practice/profile.md',exact=True).click()
    expect(dialog.get_by_label('Import profile name',exact=True)).to_have_value('')
    expect(dialog.get_by_text('Enter your name to use these details.',exact=False)).to_be_visible()
    expect(dialog.get_by_label('Import profile voice',exact=True)).to_have_value('Use plain language.')
    expect(dialog.get_by_label('Import profile principles',exact=True)).to_have_value('Keep advice proportionate.')
    expect(dialog.get_by_role('checkbox',name='Use these reviewed profile details at import')).to_be_disabled()
    dialog.get_by_label('Import profile name',exact=True).fill('Reviewed Synthetic Lawyer')
    dialog.get_by_label('Import profile voice',exact=True).fill('Use short, plain sentences.')
    for width,height in [(1440,1000),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height})
        dialog.get_by_role('heading',name='Your profile',exact=True).scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'import-profile-{width}.png'))
    dialog.get_by_role('checkbox',name='Use these reviewed profile details at import').check()
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    assert api('')['profile'] is None
    page.reload()
    page.get_by_role('button',name='Review and import 2 files').click()
    expect(dialog.get_by_role('checkbox',name='Set my profile to Reviewed Synthetic Lawyer.',exact=False)).to_be_checked()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(page.get_by_text('2 originals imported',exact=False)).to_be_visible()
    profile=api('')['profile']
    assert profile['name']=='Reviewed Synthetic Lawyer' and profile['voice']=='Use short, plain sentences.' and not profile['applyToChats']
    assert profile['principles']=='Keep advice proportionate.'
    saved=api('/imports/'+batch['id'])
    for item in saved['receipt']['items']:
        entry=next(entry for entry in saved['entries'] if entry['id']==item['entryId'])
        response=context.request.get(BASE+'/api/workspace/source-revisions/'+item['sourceRevisionId']+'/original',headers={'Authorization':'Bearer workspace-browser-test-only'})
        assert response.body()==files[entry['path']].encode()
    # A staged profile from an earlier review must not block import into an existing profile.
    second=stage({'Practice/profile.md':'name: Different Person\n## Voice\nDifferent preferences.'})
    second=api('/imports/'+second['id'])
    entry=second['entries'][0]
    choice={**entry['choice'],'profile':{**profile,'name':'Different Person'}}
    for key in ['id','revisionId','version','updatedAt']: choice['profile'].pop(key,None)
    api('/imports/'+second['id']+'/choices/'+entry['id'],{'expectedRevisionId':second['revisionId'],'choice':choice})
    page.goto(BASE+'/#/imports?id='+second['id'])
    page.get_by_role('button',name='Review and import 1 files').click()
    expect(dialog.get_by_text('Your existing profile will be kept.',exact=False)).to_be_visible()
    expect(dialog.get_by_role('button',name='Import into workspace',exact=True)).to_be_enabled()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(page.get_by_text('1 originals imported',exact=False)).to_be_visible()
    assert api('')['profile']==profile
    assert not errors,errors
    assert not external,external
    browser.close()
print('PASS: company profile separation, complete preference review, missing-name protection, reload/commit, retained originals, existing-profile import, desktop/mobile; no model calls')
