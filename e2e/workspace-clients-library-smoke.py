"""Real UI, optional clients and library organization. Synthetic records/model only."""
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:7461'
TOKEN='workspace-browser-test-only'
artifacts=Path(__file__).parent/'.tmp'/'workspace'
artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def api(path, body=None):
        headers={'Authorization':'Bearer '+TOKEN}
        response=page.request.get(BASE+'/api/workspace'+path,headers=headers) if body is None else page.request.post(BASE+'/api/workspace'+path,headers=headers,data=body)
        assert response.ok,response.text()
        return response.json()
    def open_page(route):
        page.goto(BASE+'/#/'+route)
        page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#token='+TOKEN)
    page.wait_for_load_state('networkidle')
    snapshot=api('')
    assert snapshot['clients']==[]
    open_page('matters?id='+snapshot['matters'][0]['id'])
    expect(page.get_by_label('Matter client',exact=True)).to_have_count(0)
    open_page('matters')
    expect(page.get_by_role('button',name='New client',exact=True)).not_to_be_visible()
    page.locator('summary').filter(has_text='Organize by client (optional)').click()
    page.get_by_role('button',name='New client',exact=True).click()
    dialog=page.get_by_role('dialog',name='New client')
    dialog.get_by_label('Client name',exact=True).fill('Atlas Studio')
    dialog.get_by_label('Background for client-wide chats',exact=True).fill('Synthetic design business. Keep advice concise.')
    dialog.get_by_role('button',name='Create client',exact=True).click()
    page.wait_for_url('**/#/matters?client=*')
    client=api('/clients')[0]
    expect(page.get_by_role('button',name='Start client chat')).to_be_disabled()
    matters=[]
    for title in ['Employee policy review','Supplier agreement','Excluded dispute']:
        matter=api('/matters',{'title':title})
        api('/matters/'+matter['id']+'/client',{'clientId':client['id'],'expectedRevisionId':None})
        api('/sources',{'kind':'reference','matterIds':[matter['id']],'revision':{'title':title+' note','body':title+' remains open.','provenance':{'origin':'fixture:client'}}})
        matters.append(matter)
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('checkbox',name='Include Excluded dispute',exact=True).uncheck()
    expect(page.get_by_text('2 of 3 selected',exact=True)).to_be_visible()
    row=page.locator('.client-matter-row').first
    box=row.locator('input').bounding_box()
    label=row.locator('label span').bounding_box()
    assert box['x']+box['width']<label['x'] and abs(box['y']+box['height']/2-label['y']-label['height']/2)<2
    page.screenshot(path=str(artifacts/'client-1440.png'),full_page=True,animations='disabled')
    page.get_by_role('button',name='Start client chat',exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    chat_id=page.url.split('id=')[1]
    page.get_by_role('textbox',name='Message Counsel').fill('Synthetic client fixture: where are we across these matters?')
    page.get_by_role('button',name='Send message',exact=True).click()
    expect(page.get_by_text('Saved in conversation',exact=True)).to_be_visible(timeout=20000)
    turn=api('/conversations/'+chat_id)['turns'][0]
    assert turn['status']=='complete',turn['state']['error']
    assert len(turn['state']['context'])==2
    assert len(turn['state']['citations'])==2
    assert 'Excluded dispute' not in str(turn['state'])
    page.get_by_role('button',name='View context',exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    panel=page.get_by_role('complementary',name='Response context')
    panel.locator('summary').filter(has_text='2 selected matters').click()
    expect(panel).to_contain_text('Atlas Studio')
    expect(panel).to_contain_text('Supplier agreement')
    expect(panel).not_to_contain_text('Excluded dispute')
    page.screenshot(path=str(artifacts/'client-chat-1440.png'),animations='disabled')
    # Categorized originals remain separate and browsable; no approval is inferred.
    practice=api('/sources',{'kind':'reference','revision':{'title':'Our writing method','body':'Our own practice method.','provenance':{'origin':'plugin:practice/methods/writing.md'}}})
    api('/sources',{'kind':'authority','revision':{'title':'External primary reference','body':'Synthetic external text, not current law.','provenance':{'origin':'plugin:law/test/floors.md'}}})
    unfiled=api('/sources',{'kind':'document','revision':{'title':'Unsorted background','body':'Synthetic user material.','provenance':{'origin':'upload:background.txt'}}})
    open_page('references')
    expect(page.get_by_role('heading',name='Sources',exact=True)).to_be_visible()
    expect(page.locator('.resource-list')).to_contain_text('External primary reference')
    expect(page.locator('.resource-list')).not_to_contain_text('Our writing method')
    expect(page.locator('.resource-list')).not_to_contain_text('Supplier agreement')
    page.get_by_role('button',name='Counsel guides',exact=True).click()
    page.locator('summary').filter(has_text='Browse working guides').click()
    page.locator('summary').filter(has_text='Privacy and data use').click()
    expect(page.locator('.guide-library-card')).to_contain_text('not a complete migration')
    page.screenshot(path=str(artifacts/'sources-guides-1440.png'),full_page=True,animations='disabled')
    page.get_by_role('button',name='Needs organizing',exact=True).click()
    page.get_by_role('link').filter(has_text='Unsorted background').click()
    page.get_by_label('Library location',exact=True).select_option('practice')
    page.get_by_role('button',name='Save location',exact=True).click()
    expect(page.get_by_role('link',name='All practice',exact=True)).to_be_visible()
    page.get_by_role('link',name='All practice',exact=True).click()
    expect(page.locator('.resource-list')).to_contain_text('Unsorted background')
    expect(page.locator('.resource-list')).to_contain_text('Our writing method')
    assert api('/sources/'+unfiled['id'])['latest']==unfiled['latest']
    assert api('')['totals']['pending']==snapshot['totals']['pending']
    open_page('settings')
    expect(page.get_by_role('heading',name='Counsel guides',exact=True)).to_have_count(0)
    page.set_viewport_size({'width':390,'height':844})
    open_page('matters?client='+client['id'])
    expect(page.get_by_role('heading',name='Atlas Studio',exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(artifacts/'client-390.png'),full_page=True,animations='disabled')
    open_page('references')
    page.get_by_role('button',name='Counsel guides',exact=True).click()
    page.locator('summary').filter(has_text='Browse working guides').click()
    page.locator('summary').filter(has_text='Employment and workplace decisions').click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(artifacts/'sources-guides-390.png'),full_page=True,animations='disabled')
    assert not errors,errors
    browser.close()
    print('PASS: optional clients, selected-matter chat scope/receipts, guides in Sources, practice originals, unchanged evidence and mobile layout')
