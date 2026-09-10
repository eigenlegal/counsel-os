"""Retained cross-import references, upkeep handoff and reviewed matter access. Synthetic data only."""
import base64
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, writes = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.on('request', lambda r: writes.append(r.url) if r.method == 'POST' else None)
    def api(path, body=None):
        headers = {'Authorization': 'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    matter = api('/matters', {'title': 'Acme NDA'})
    other = api('/matters', {'title': 'Unrelated matter'})
    note = api('/sources', {'kind': 'reference', 'matterIds': [matter['id']], 'revision': {'title': 'Acme NDA history',
        'body': 'The supporting company notes are at [[Companies/Acme/background]].\n[[missing-signed-copy]]',
        'textStatus': 'ready', 'provenance': {'origin': 'plugin:matters/acme-nda.md'}}})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/references')
    page.get_by_role('button', name='Needs organizing', exact=True).click()
    page.get_by_role('button', name='Review organization', exact=True).click()
    upkeep = page.get_by_role('dialog', name='Workspace upkeep')
    row = upkeep.locator('.upkeep-finding').filter(has=page.get_by_role('heading', name='Acme NDA history', exact=True))
    expect(row.get_by_text('2 unresolved references;', exact=False)).to_be_visible(timeout=20000)
    # A completely separate, later import should wake the old note's check.
    body = 'COMPANYFACTS: synthetic corporate address information, not signing authority.'
    batch = api('/imports', {'clientId': str(uuid4()), 'label': 'Later company folder', 'files': [{'path': 'Companies/Acme/background.md', 'byteCount': len(body)}]})
    entry = batch['entries'][0]
    api('/imports/'+batch['id']+'/files/'+entry['id'], {'base64': base64.b64encode(body.encode()).decode()})
    page.wait_for_function("""async id => { const r=await fetch('/api/workspace/imports/'+id,{headers:{Authorization:'Bearer workspace-browser-test-only'}}); const b=await r.json(); return b.progress.ready===1; }""", arg=batch['id'])
    batch = api('/imports/'+batch['id'])
    api('/imports/'+batch['id']+'/choices/'+entry['id'], {'expectedRevisionId': batch['revisionId'], 'choice': {**batch['entries'][0]['choice'], 'destination': 'source', 'collection': 'unfiled', 'matterId': None, 'matterTitle': None}})
    batch = api('/imports/'+batch['id'])
    result = api('/imports/'+batch['id']+'/commit', {'expectedRevisionId': batch['revisionId']})
    source_id = result['receipt']['items'][0]['sourceId']
    before = api('/sources/'+source_id)
    expect(row.get_by_text('1 unresolved references; 1 possible matter links', exact=False)).to_be_visible(timeout=20000)
    row.get_by_role('button', name='Review document links', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review document links')
    expect(dialog.get_by_role('checkbox')).to_have_count(1)
    expect(dialog.get_by_role('checkbox')).not_to_be_checked()
    expect(dialog.get_by_text('From a separate upload or import', exact=False)).to_be_visible()
    assert api('/sources/'+source_id)['matterIds'] == []
    for width, height in [(1440,1000), (390,844), (320,740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'source-links-{width}.png'))
    dialog.get_by_role('checkbox').check()
    dialog.get_by_role('button', name='Add 1 matter link', exact=True).click()
    expect(dialog.get_by_text('1 matter link added.', exact=False)).to_be_visible()
    after = api('/sources/'+source_id)
    assert after['matterIds'] == [matter['id']]
    assert after['latest'] == before['latest']
    assert other['id'] not in after['matterIds']
    dialog.get_by_role('combobox').select_option('unresolved')
    expect(dialog.get_by_role('checkbox', name='missing-signed-copy', exact=False)).to_be_visible()
    expect(dialog.get_by_role('checkbox')).to_be_disabled()
    dialog.get_by_role('button', name='Done', exact=True).click()
    expect(upkeep).to_be_visible()
    expect(row.get_by_text('1 unresolved references; 0 possible matter links', exact=False)).to_be_visible(timeout=20000)
    row.get_by_role('button', name='Leave as is', exact=True).click()
    expect(row).to_have_count(0)
    page.reload()
    page.get_by_role('button', name='Needs organizing', exact=True).click()
    page.get_by_role('button', name='Review organization', exact=True).click()
    upkeep.get_by_role('button', name='Left as is (1)', exact=True).click()
    expect(upkeep.get_by_role('heading', name='Acme NDA history', exact=True)).to_be_visible()
    # The ordinary reader also offers the same review; this is not tied to an old import screen.
    page.goto(BASE+'/#/references?id='+note['id'])
    page.get_by_role('button', name='Review document links', exact=True).click()
    expect(dialog.get_by_text('No matter links to add in this view.', exact=False)).to_be_visible()
    assert not any('/suggest' in url for url in writes)
    assert not external, external
    assert not errors, errors
    browser.close()
print('PASS: later import wakes old note, upkeep/reader review, explicit access, unresolved handling, durable leave-as-is, desktop/mobile; no model calls')
