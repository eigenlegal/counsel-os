"""Synthetic --empty --chat fixture: off-page filing, AI review, stale protection and narrow layouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, suggestions = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    context.on('request', lambda r: suggestions.append(r.url) if r.url.endswith('/source-organization/suggest') else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    def source(title):
        return api('/sources', {'kind': 'document', 'revision': {'title': title, 'body': title + '. Synthetic test text.', 'provenance': {'origin': 'fixture:organization'}}})
    files = [source(f'Checklist {i:03d}') for i in range(61)]
    matter = api('/matters', {'title': 'Northstar NDA'})
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    def unfiled():
        page.goto(BASE + '/#/references')
        page.get_by_role('button', name='Needs organizing', exact=True).click()
    unfiled()
    expect(page.get_by_text('61 files', exact=True)).to_be_visible()
    page.get_by_role('button', name='Select this page', exact=True).click()
    expect(page.get_by_text('50 selected', exact=True)).to_be_visible()
    page.get_by_role('button', name='Next', exact=True).click()
    expect(page.get_by_text('Page 2 of 2', exact=True)).to_be_visible()
    page.get_by_role('button', name='Select this page', exact=True).click()
    expect(page.get_by_text('61 selected', exact=True)).to_be_visible()
    page.get_by_role('button', name='Organize selected…', exact=True).click()
    dialog = page.get_by_role('dialog', name='Organize selected files', exact=True)
    dialog.get_by_label('Selected files destination').select_option('practice')
    assert api('/source-library?collection=practice')['total'] == 0
    dialog.get_by_role('button', name='Organize 61 files', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_text('No files here yet', exact=True)).to_be_visible()
    assert api('/source-library?collection=practice')['total'] == 61
    assert api()['totals']['knowledge'] == 0
    for file in files:
        assert api('/sources/' + file['id'])['latest']['id'] == file['latest']['id']
    notes, research, uncertain = source('Northstar NDA notes'), source('External research'), source('uncertain receipt')
    page.reload()
    page.get_by_role('button', name='Needs organizing', exact=True).click()
    expect(page.get_by_text('3 files', exact=True)).to_be_visible()
    page.get_by_role('button', name='Select this page', exact=True).click()
    page.get_by_role('button', name='Suggest filing…', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review filing with Counsel OS', exact=True)
    expect(dialog).to_contain_text('Other matter contents, chats and your profile are not sent.')
    dialog.get_by_role('button', name='Generate suggestions', exact=True).click()
    expect(dialog.get_by_role('button', name='Organize 2 files', exact=True)).to_be_enabled()
    expect(dialog.get_by_role('checkbox', name='uncertain receipt', exact=True)).not_to_be_checked()
    expect(dialog.get_by_role('checkbox', name='uncertain receipt', exact=True)).to_be_disabled()
    assert api('/source-library?collection=unfiled')['total'] == 3
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'source-organization-{width}.png'), animations='disabled')
    dialog.get_by_role('button', name='Organize 2 files', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_text('1 file', exact=True)).to_be_visible()
    assert api('/sources/' + notes['id'])['matterIds'] == [matter['id']]
    assert api('/source-library?collection=external')['records'][0]['id'] == research['id']
    assert api('/source-library?collection=unfiled')['records'][0]['id'] == uncertain['id']
    # Concurrent placement invalidates the entire reviewed action, including another untouched file.
    newer = source('Concurrent source')
    page.reload()
    page.get_by_role('button', name='Needs organizing', exact=True).click()
    expect(page.get_by_text('2 files', exact=True)).to_be_visible()
    page.get_by_role('button', name='Select this page', exact=True).click()
    page.get_by_role('button', name='Organize selected…', exact=True).click()
    dialog = page.get_by_role('dialog', name='Organize selected files', exact=True)
    dialog.get_by_label('Selected files destination').select_option('practice')
    api('/sources/' + newer['id'] + '/placement', {'collection': 'external', 'expectedRevisionId': None})
    dialog.get_by_role('button', name='Organize 2 files', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('already been organized')
    assert api('/source-library?collection=practice')['total'] == 61
    assert api('/source-library?collection=unfiled')['records'][0]['id'] == uncertain['id']
    assert len(suggestions) == 1 and not errors and not external, (suggestions, errors, external)
    browser.close()
    print('PASS: 61-file off-page filing, selected-only AI review, low-confidence retention, explicit matter access, stale atomic refusal and mobile')
