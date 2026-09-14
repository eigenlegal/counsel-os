"""Automatic upkeep, durable decisions and filing handoff; only synthetic local data."""
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
    source = api('/sources', {'kind': 'reference', 'revision': {'title': 'Acme background notes', 'body': 'Synthetic Acme company information.', 'textStatus': 'partial', 'provenance': {'origin': 'fixture:upkeep'}}})
    text = '[[missing-agreement]]'
    batch = api('/imports', {'clientId': str(uuid4()), 'label': 'Second folder import', 'files': [{'path': 'notes/background.md', 'byteCount': len(text)}]})
    api('/imports/'+batch['id']+'/files/'+batch['entries'][0]['id'], {'base64': base64.b64encode(text.encode()).decode()})
    before = api('/sources/'+source['id'])
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    def review():
        page.goto(BASE+'/#/references')
        page.get_by_role('button', name='Needs organizing', exact=True).click()
        page.get_by_role('button', name='Review organization', exact=True).click()
        return page.get_by_role('dialog', name='Workspace upkeep')
    dialog = review()
    source_rows = dialog.locator('.upkeep-finding').filter(has=page.get_by_role('heading', name='Acme background notes', exact=True))
    expect(source_rows).to_have_count(2, timeout=20000)
    expect(dialog.get_by_text('1 unresolved references;', exact=False)).to_be_visible()
    assert not any('/suggest' in url for url in writes)
    for width, height in [(1440,1000), (390,844), (320,740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'upkeep-{width}.png'))
    row = source_rows.filter(has=page.get_by_text('Choose a location', exact=True))
    row.get_by_role('button', name='Leave as is', exact=True).click()
    expect(row).to_have_count(0)
    assert api('/sources/'+source['id']) == before
    dialog.get_by_role('button', name='Done', exact=True).click()
    page.reload()
    page.get_by_role('button', name='Needs organizing', exact=True).click()
    page.get_by_role('button', name='Review organization', exact=True).click()
    dialog.get_by_role('button', name='Left as is (1)', exact=True).click()
    expect(dialog.get_by_role('heading', name='Acme background notes', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Return to review', exact=True).click()
    dialog.get_by_role('group', name='Organization findings').get_by_role('button', name='To review', exact=False).click()
    expect(source_rows).to_have_count(2)
    source_rows.filter(has=page.get_by_text('Choose a location', exact=True)).get_by_role('button', name='Suggest filing', exact=True).click()
    filing = page.get_by_role('dialog', name='Review filing with Counsel OS')
    expect(filing.get_by_role('button', name='Generate suggestions', exact=True)).to_be_visible()
    assert not any('/suggest' in url for url in writes)
    filing.get_by_role('button', name='Cancel', exact=True).click()
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name='Check now', exact=True).click()
    expect(dialog.get_by_role('button', name='Check now', exact=True)).to_be_enabled(timeout=20000)
    dialog.get_by_text('Recent checks', exact=True).click()
    expect(dialog.get_by_text('Requested check', exact=False)).to_be_visible()
    # A real corrective action uses the established filing API, not upkeep permissions.
    api('/sources/'+source['id']+'/placement', {'collection': 'practice', 'expectedRevisionId': before['placement']['revisionId']})
    expect(source_rows.filter(has=page.get_by_text('Choose a location', exact=True))).to_have_count(0, timeout=20000)
    expect(source_rows.filter(has=page.get_by_text('Incomplete readable text', exact=True))).to_have_count(1)
    assert api('/sources/'+source['id'])['latest'] == before['latest']
    assert not external, external
    assert not errors, errors
    browser.close()
print('PASS: event-driven findings, staged links, leave-as-is/reload/restore, explicit AI handoff, manual check/history, filing resolves findings, desktop/mobile; no model calls')
