"""Cross-import duplicates and recoverable, dependency-aware cleanup. --empty fixture."""
import base64
import time
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = 'http://127.0.0.1:7459'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path, data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    def stage(files):
        batch = api('/imports', {'clientId': str(uuid.uuid4()), 'label': 'Cleanup test', 'files': [{'path': path, 'byteCount': len(text.encode())} for path, text in files.items()]})
        for entry in batch['entries']:
            api('/imports/' + batch['id'] + '/files/' + entry['id'], {'base64': base64.b64encode(files[entry['path']].encode()).decode()})
        for _ in range(100):
            batch = api('/imports/' + batch['id'])
            if all(e['status'] == 'ready' for e in batch['entries']): return batch
            time.sleep(.05)
        raise AssertionError('Import did not process')
    first = stage({'Original.txt': 'Same content.'})
    first = api('/imports/' + first['id'] + '/commit', {'expectedRevisionId': first['revisionId']})
    incoming = stage({'Renamed.txt': 'Same content.', 'Unused.txt': 'New content.', 'Used.txt': 'Kept content.'})
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/imports?id=' + incoming['id'])
    page.get_by_role('button', name='Check for existing copies').click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_contain_text('Already saved: Original · version 1')
    expect(dialog.get_by_role('button', name='Skip 0 incoming copies')).to_be_disabled()
    dialog.get_by_role('button', name='Select all eligible').click()
    dialog.get_by_role('button', name='Skip 1 incoming copy').click()
    expect(dialog).to_have_count(0)
    incoming = api('/imports/' + incoming['id'])
    assert incoming['selection']['included'] == 2
    completed = api('/imports/' + incoming['id'] + '/commit', {'expectedRevisionId': incoming['revisionId']})
    used = next(item for item in completed['receipt']['items'] if next(e for e in completed['entries'] if e['id'] == item['entryId'])['path'] == 'Used.txt')
    api('/work', {'title': 'Keep cited work', 'request': 'Test', 'answer': 'Retain this.', 'evidence': [{'target': {'kind': 'source', 'revisionId': used['sourceRevisionId']}, 'start': 0, 'quote': 'Kept content.'}]})
    page.reload()
    page.get_by_role('button', name='Undo unused additions…').click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('checkbox', name='Select Used', exact=True)).to_be_disabled()
    expect(dialog).to_contain_text('Matters and your profile are kept')
    dialog.get_by_role('button', name='Select all eligible').click()
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'import-cleanup-{width}.png'), animations='disabled')
    dialog.get_by_role('button', name='Undo 1 addition').click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_role('button', name='View import cleanup')).to_be_visible()
    receipt = api('/imports/' + incoming['id'])['receipt']
    assert len(receipt['undo']['sourceIds']) == 1
    assert api('/sources/' + used['sourceId'])['lifecycle'] == 'active'
    assert api('/sources/' + receipt['undo']['sourceIds'][0])['lifecycle'] == 'trashed'
    assert api('/sources/' + first['receipt']['items'][0]['sourceId'])['lifecycle'] == 'active'
    page.reload()
    page.get_by_role('button', name='View import cleanup').click()
    expect(page.get_by_role('dialog')).to_contain_text('Cleanup already applied.')
    assert not errors, errors
    browser.close()
print('Duplicate skip, guarded undo, retained dependencies, mobile and durable receipt passed.')
