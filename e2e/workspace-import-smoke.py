"""Folder import review, durable choices, original bytes, profile and local-only staging. No model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:7459'
FIXTURES=Path(__file__).parent/'fixtures'/'workspace-import'
OUT=Path(__file__).parent/'.tmp'/'workspace'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page()
    errors,external=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    context.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/settings')
    page.get_by_role('link',name='Import files & folders',exact=True).click()
    expect(page.get_by_role('heading',name='Import your workspace',exact=True)).to_be_visible()
    page.screenshot(path=str(OUT/'import-start-1440.png'),full_page=True)
    expect(page.get_by_label('Choose import folder',exact=True)).to_have_attribute('webkitdirectory','')
    page.get_by_label('Choose import folder',exact=True).set_input_files(str(FIXTURES))
    page.wait_for_url('**/#/imports?id=*')
    expect(page.get_by_role('button',name='Review and import 4 files',exact=True)).to_be_enabled()
    import_url=page.url
    headers={'Authorization':'Bearer workspace-browser-test-only'}
    def snapshot(): return context.request.get(BASE+'/api/workspace',headers=headers).json()
    before=snapshot()
    assert not before['sources'] and not before['knowledge'] and before['profile'] is None
    expect(page.locator('.import-rows')).to_contain_text('Unsupported format')
    expect(page.locator('.import-rows')).to_contain_text('Hidden or application-instruction')
    page.get_by_role('button',name='Review workspace-import/Templates/starting-point.md',exact=True).click()
    dialog=page.get_by_role('dialog')
    expect(dialog.get_by_label('Import destination',exact=True)).to_have_value('template')
    dialog.get_by_label('Imported template use',exact=True).fill('A synthetic starting point for a test draft.')
    dialog.get_by_text('Read extracted text',exact=True).click()
    expect(dialog.get_by_role('heading',name='Synthetic starting document',exact=True)).to_be_visible()
    page.screenshot(path=str(OUT/'import-template-review-1440.png'),full_page=True)
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    page.get_by_role('button',name='Review workspace-import/profile.md',exact=True).click()
    dialog.get_by_label('Import destination',exact=True).select_option('profile')
    expect(dialog.get_by_label('Import profile name',exact=True)).to_have_value('Synthetic Lawyer')
    dialog.get_by_label('Import profile name',exact=True).fill('Reviewed Synthetic Lawyer')
    dialog.get_by_role('checkbox',name='Use these reviewed profile details at import',exact=True).check()
    dialog.get_by_role('button',name='Save import choice',exact=True).click()
    page.reload()
    expect(page.get_by_role('button',name='Review and import 4 files',exact=True)).to_be_enabled()
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':844 if width==390 else 1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'import-review-{width}.png'),full_page=True)
    page.get_by_role('button',name='Review and import 4 files',exact=True).click()
    expect(dialog.get_by_text('Set my profile to Reviewed Synthetic Lawyer.',exact=False)).to_be_visible()
    expect(dialog.get_by_role('button',name='Import into workspace',exact=True)).to_be_disabled()
    dialog.get_by_role('checkbox',name='Make 1 templates available',exact=False).check()
    dialog.get_by_role('button',name='Import into workspace',exact=True).click()
    expect(page.get_by_text('4 originals imported',exact=False)).to_be_visible()
    after=snapshot()
    assert len(after['sources'])==4 and len(after['knowledge'])==1 and len(after['templates'])==1
    assert after['knowledge'][0]['status']=='pending'
    assert after['profile']['name']=='Reviewed Synthetic Lawyer' and not after['profile']['applyToChats']
    assert len(after['matters'])==1 and after['matters'][0]['title']=='Investigation'
    batch_id=import_url.split('id=')[1]
    batch=context.request.get(BASE+'/api/workspace/imports/'+batch_id,headers=headers).json()
    for item in batch['receipt']['items']:
        entry=next(e for e in batch['entries'] if e['id']==item['entryId'])
        original=context.request.get(BASE+'/api/workspace/source-revisions/'+item['sourceRevisionId']+'/original',headers=headers).body()
        assert original==(FIXTURES.parent/entry['path']).read_bytes()
    page.reload()
    expect(page.get_by_text('4 originals imported',exact=False)).to_be_visible()
    assert len(snapshot()['sources'])==4
    # Exercise file drop as well as folder input, then discard only staged copies.
    page.get_by_role('link',name='Start another import',exact=True).click()
    transfer=page.evaluate_handle("""() => { const transfer=new DataTransfer(); transfer.items.add(new File(['Synthetic dropped file'], 'dropped.txt', {type:'text/plain'})); return transfer; }""")
    page.locator('.import-dropzone').dispatch_event('drop',{'dataTransfer':transfer})
    page.wait_for_url('**/#/imports?id=*')
    expect(page.get_by_role('button',name='Review and import 1 files',exact=True)).to_be_enabled()
    page.get_by_role('button',name='Discard staged import',exact=True).click()
    dialog.get_by_role('button',name='Discard staged copies',exact=True).click()
    expect(page.get_by_text('Staged file copies were discarded.',exact=False)).to_be_visible()
    assert len(snapshot()['sources'])==4
    assert not errors,errors
    assert not external,external
    browser.close()
    print('PASS: folder selection, local staging, exclusions, durable review/profile, template confirmation, atomic import, originals, mobile and file drop/discard')
