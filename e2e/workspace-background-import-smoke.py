"""Background, content-based organization on synthetic files only. No live model."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path, body=None):
        headers = {'Authorization': 'Bearer workspace-browser-test-only'}
        res = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert res.ok, res.text()
        return res.json()
    matter = api('/matters', {'title': 'Aster NDA'})
    before = api('')
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/imports')
    expect(page.get_by_role('checkbox', name='Let Counsel organize my files after upload')).to_be_checked()
    expect(page.get_by_text('Large imports can use substantial AI capacity.', exact=False)).to_be_visible()
    files = [{'name': f'file-{i}.txt', 'mimeType': 'text/plain', 'buffer': f'Background organization fixture. Aster NDA negotiation note {i}.'.encode()} for i in range(9)]
    files += [{'name': 'scan.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster employment dispute.'},
              {'name': 'misc.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster company background.'}]
    page.get_by_label('Choose import files', exact=True).set_input_files(files)
    expect(page.get_by_role('button', name='Pause organization', exact=True)).to_be_visible()
    batch_id = page.url.split('id=')[1]
    # Navigation and reload do not cancel the app-owned job.
    page.goto(BASE+'/#/conversations')
    page.reload()
    page.goto(BASE+'/#/imports?id='+batch_id)
    expect(page.get_by_role('heading', name='Organization ready to review')).to_be_visible(timeout=20000)
    expect(page.get_by_text('this workspace server needs a restart', exact=False)).to_have_count(0)
    job = api('/imports/'+batch_id+'/organization')
    assert job['analyzed'] == 11 and job['calls'] == 2 and job['attention'] == 1, job
    assert len(api('')['sources']) == len(before['sources'])
    page.screenshot(path=str(OUT/'background-import-ready-1440.png'), full_page=True)
    page.get_by_role('button', name='Review organization', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review Counsel’s organization')
    expect(dialog.get_by_role('button', name='Apply 10 clear suggestions')).to_be_enabled()
    expect(dialog.get_by_role('checkbox', name='misc.txt', exact=True)).not_to_be_checked()
    for width, height in [(1440,1000), (390,844), (320,568)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'background-import-review-{width}.png'))
    dialog.get_by_role('button', name='Apply 10 clear suggestions').click()
    expect(dialog.get_by_role('button', name='Apply 0 clear suggestions')).to_be_disabled()
    assert len(api('')['sources']) == len(before['sources'])
    dialog.get_by_role('button', name='Back to import').click()
    page.get_by_role('button', name='Review and import 11 files', exact=True).click()
    page.get_by_role('dialog').get_by_role('button', name='Import into workspace', exact=True).click()
    expect(page.get_by_text('11 originals imported', exact=False)).to_be_visible()
    result = api('/imports/'+batch_id)
    assert len(result['receipt']['matterIds']) == 1
    assert len(api('')['sources']) == len(before['sources'])+11
    assert len(api('')['knowledge']) == len(before['knowledge'])
    assert len([e for e in result['entries'] if e['choice']['matterId'] == matter['id']]) == 9
    assert not errors, errors
    assert not external, external
    browser.close()
print('PASS: automatic AI intake, content-based filing, cross-batch continuation, navigation/reload, uncertain review, separate import, desktop/mobile; no real model calls')
