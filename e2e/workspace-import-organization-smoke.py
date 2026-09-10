"""Selected-text AI suggestions, reviewed bulk organization, off-page selection, and final import boundaries."""
import base64
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, runs = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: runs.append(r.url) if r.url.endswith('/organize') else None)
    def api(path, body=None):
        headers = {'Authorization':'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    matter = api('/matters', {'title':'Northstar NDA'})
    before = api('')
    paths = [f'Northstar/note-{i}.txt' for i in range(61)] + ['research.txt', 'uncertain.txt']
    batch = api('/imports', {'clientId':str(uuid4()), 'label':'Organization fixture', 'files':[{'path':path, 'byteCount':len(path)} for path in paths]})
    for file in api('/imports/'+batch['id']+'/upload-plan'):
        api('/imports/'+batch['id']+'/files/'+file['id'], {'base64':base64.b64encode(file['path'].encode()).decode()})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/imports?id='+batch['id'])
    expect(page.get_by_role('button', name='Review and import 63 files', exact=True)).to_be_enabled()
    expect(page.locator('.import-row')).to_have_count(50)
    page.get_by_role('textbox', name='Find import files', exact=True).fill('Northstar/')
    expect(page.get_by_text('1–50 of 61 files', exact=True)).to_be_visible()
    page.get_by_role('button', name='Select all matching files', exact=True).click()
    expect(page.get_by_text('61 selected', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Suggest organization', exact=True)).to_be_disabled()
    page.get_by_role('button', name='Organize selected', exact=True).click()
    dialog = page.get_by_role('dialog', name='Organize selected files', exact=True)
    dialog.get_by_role('combobox', name='Bulk import destination', exact=True).select_option('practice')
    dialog.get_by_role('button', name='Bulk import matter', exact=True).click()
    page.get_by_role('option', name='Northstar NDA', exact=False).click()
    expect(dialog.get_by_text('All 61 selected files', exact=False)).to_be_visible()
    page.screenshot(path=str(OUT/'import-bulk-review-1440.png'))
    dialog.get_by_role('button', name='Update import choices', exact=True).click()
    expect(dialog).to_have_count(0)
    page.reload()
    last = api('/imports/'+batch['id']+'?offset=50')
    assert all(e['choice']['matterId']==matter['id'] and e['choice']['collection']=='practice' for e in last['entries'][:11])
    assert all(e['choice']['matterId'] is None for e in last['entries'][11:])
    assert len(api('')['sources']) == len(before['sources'])
    assert not runs
    # A small selected set gets suggestions, never an automatic import or approval.
    page.get_by_role('textbox', name='Find import files', exact=True).fill('research')
    expect(page.locator('.import-row')).to_have_count(1)
    page.get_by_role('checkbox', name='Select research.txt', exact=True).check()
    page.get_by_role('textbox', name='Find import files', exact=True).fill('uncertain')
    expect(page.locator('.import-row')).to_have_count(1)
    page.get_by_role('checkbox', name='Select uncertain.txt', exact=True).check()
    page.get_by_role('button', name='Suggest organization', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review organization with Counsel', exact=True)
    assert not runs
    dialog.get_by_role('button', name='Generate suggestions', exact=True).click()
    expect(dialog.get_by_role('button', name='Save 1 suggested choices', exact=True)).to_be_enabled()
    expect(dialog.get_by_role('checkbox', name='uncertain.txt', exact=True)).not_to_be_checked()
    expect(dialog.get_by_text('Sources · External reference · Outside a matter', exact=True)).to_be_visible()
    for width in [1440, 390]:
        page.set_viewport_size({'width':width, 'height':1000 if width==1440 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'import-ai-review-{width}.png'))
        if width == 390:
            dialog.get_by_role('button', name='Save 1 suggested choices', exact=True).scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/'import-ai-actions-390.png'))
    dialog.get_by_role('button', name='Save 1 suggested choices', exact=True).click()
    expect(dialog).to_have_count(0)
    assert len(runs)==1
    assert len(api('')['sources'])==len(before['sources'])
    choices = api('/imports/'+batch['id']+'?offset=50')['entries']
    assert choices[-2]['choice']['collection']=='external' and choices[-1]['choice']['collection']=='unfiled'
    # Final consent is still separate and covers the whole import.
    page.get_by_role('button', name='Review and import 63 files', exact=True).click()
    confirm = page.get_by_role('dialog', name='Bring these files into your workspace?', exact=True)
    confirm.get_by_role('button', name='Import into workspace', exact=True).click()
    expect(page.get_by_text('63 originals imported', exact=False)).to_be_visible()
    assert len(api('')['sources'])==len(before['sources'])+63
    receipt = api('/imports/'+batch['id'])['receipt']
    source_id = next(item['sourceId'] for item in receipt['items'] if item['entryId']==choices[-2]['id'])
    assert api('/sources/'+source_id)['placement']['collection']=='external'
    assert api('/source-library?collection=external')['records'][0]['id']==source_id
    assert not errors, errors
    browser.close()
print('Import organization: filtered off-page bulk choices, selected-text suggestions, low-confidence review, separate final consent, desktop/mobile: passed')
