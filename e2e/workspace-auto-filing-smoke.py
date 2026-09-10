"""Durable automatic filing and reviewed access; synthetic provider/workspace only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:7461'
OUT=Path(__file__).parent/'.tmp'/'workspace'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page()
    errors,external=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    context.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path,body=None):
        headers={'Authorization':'Bearer workspace-browser-test-only'}
        response=context.request.get(BASE+'/api/workspace'+path,headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path,headers=headers,data=body)
        assert response.ok,response.text()
        return response.json()
    matter=api('/matters',{'title':'Northstar NDA'})
    files=[api('/sources',{'kind':'document','revision':{'title':f'scan-{i:02}.txt','body':'Northstar NDA correspondence. Synthetic file.', 'textStatus':'ready','provenance':{'origin':'fixture:scan'}}}) for i in range(10)]
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/references')
    page.get_by_role('button',name='Needs organizing',exact=True).click()
    page.get_by_role('button',name='Set up AI filing',exact=True).click()
    dialog=page.get_by_role('dialog',name='AI filing',exact=True)
    expect(dialog.get_by_role('button',name='Enable AI filing',exact=True)).to_be_enabled()
    assert api('/auto-filing')['settings'] is None
    page.screenshot(path=str(OUT/'auto-filing-setup.png'))
    dialog.get_by_role('button',name='Enable AI filing',exact=True).click()
    expect(dialog.get_by_role('checkbox')).to_have_count(10,timeout=20000)
    assert api('/auto-filing')['settings']['calls']==2
    assert all(api('/sources/'+file['id'])['matterIds']==[] for file in files)
    for width,height in [(1440,1000),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'auto-filing-{width}.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    dialog.get_by_role('button',name='Pause AI filing',exact=True).click()
    expect(dialog.get_by_role('button',name='Resume AI filing',exact=True)).to_be_visible()
    dialog.get_by_role('button',name='Done',exact=True).click()
    page.reload()
    page.get_by_role('button',name='Needs organizing',exact=True).click()
    page.get_by_role('button',name='Review AI filing',exact=True).click()
    expect(dialog.get_by_role('checkbox')).to_have_count(10)
    expect(dialog.get_by_role('checkbox').first).not_to_be_checked()
    dialog.get_by_role('checkbox',name='scan-00.txt',exact=True).check()
    dialog.get_by_role('button',name='Apply 1 filing suggestion',exact=True).click()
    expect(dialog.get_by_role('checkbox')).to_have_count(9)
    assert api('/sources/'+files[0]['id'])['matterIds']==[matter['id']]
    assert api('/sources/'+files[0]['id'])['latest']==files[0]['latest']
    dialog.get_by_role('checkbox',name='scan-01.txt',exact=True).check()
    dialog.get_by_role('button',name='Leave 1 unfiled',exact=True).click()
    expect(dialog.get_by_role('checkbox')).to_have_count(8)
    dialog.get_by_role('button',name='History (2)',exact=True).click()
    expect(dialog.get_by_role('heading',name='scan-00.txt',exact=True)).to_be_visible()
    expect(dialog.get_by_role('heading',name='scan-01.txt',exact=True)).to_be_visible()
    assert not external,external
    assert not errors,errors
    browser.close()
print('PASS: one-time enable, two background batches, body-based match, persisted review/pause, exact filing and leave-unfiled, desktop/mobile, no external requests')
