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
    expect(page.get_by_role('checkbox', name='Let Counsel OS organize my files after upload')).to_be_checked()
    expect(page.get_by_text('Large imports can use substantial AI capacity.', exact=False)).to_be_visible()
    files = [{'name': f'file-{i}.txt', 'mimeType': 'text/plain', 'buffer': f'Background organization fixture. Aster NDA negotiation note {i}.'.encode()} for i in range(9)]
    files += [{'name': 'scan.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster employment dispute.'},
              {'name': 'misc.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster company background.'},
              {'name': 'failed.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster NDA. BROKEN EVIDENCE'},
              {'name': 'repair.txt', 'mimeType': 'text/plain', 'buffer': b'Background organization fixture. Aster NDA. REPAIR EVIDENCE'}]
    page.get_by_label('Choose import files', exact=True).set_input_files(files)
    expect(page.get_by_role('button', name='Pause and review manually', exact=True)).to_be_visible()
    expect(page.get_by_role('progressbar', name='Files analyzed for organization')).to_be_visible()
    page.get_by_text('Inspect or edit individual files', exact=True).click()
    expect(page.get_by_role('checkbox', name='Select files on this page')).to_be_disabled()
    expect(page.get_by_role('button', name='Select all matching files')).to_be_disabled()
    expect(page.get_by_role('button', name='Review and import 13 files', exact=True)).to_be_disabled()
    expect(page.get_by_role('heading', name='File preview · read-only for now')).to_be_visible()
    expect(page.get_by_text('Ready for your review', exact=True)).to_have_count(0)
    page.screenshot(path=str(OUT/'background-import-working-1440.png'), full_page=True)
    batch_id = page.url.split('id=')[1]
    # Navigation and reload do not cancel the app-owned job.
    page.goto(BASE+'/#/conversations')
    page.reload()
    page.goto(BASE+'/#/imports?id='+batch_id)
    expect(page.get_by_role('heading', name='Organization ready to review')).to_be_visible(timeout=20000)
    expect(page.get_by_role('heading', name='Your files', exact=True)).to_be_visible()
    assert not page.locator('.import-file-inspector').evaluate('(node) => node.open')
    expect(page.get_by_text('this workspace server needs a restart', exact=False)).to_have_count(0)
    expect(page.get_by_text('The interface and workspace engine need the same update.', exact=False)).to_have_count(0)
    job = api('/imports/'+batch_id+'/organization')
    assert job['analyzed'] == 12 and job['calls'] == 4 and job['attention'] == 2 and job['failed'] == 1 and job['applied'] == 11, job
    assert job['remaining'] == 0
    assert len(api('')['sources']) == len(before['sources'])
    page.screenshot(path=str(OUT/'background-import-ready-1440.png'), full_page=True)
    page.get_by_role('button', name='Review 2 exceptions', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review Counsel OS’s organization')
    expect(dialog.get_by_text('failed.txt', exact=True)).to_be_visible()
    expect(dialog.get_by_text('The retry also failed.', exact=False)).to_be_visible()
    expect(dialog.get_by_role('button', name='Prepare 11 retained suggestions')).to_have_count(0)
    expect(dialog.get_by_role('checkbox', name='misc.txt', exact=True)).not_to_be_checked()
    for width, height in [(1440,1000), (390,844), (320,568)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'background-import-review-{width}.png'))
    dialog.get_by_role('button', name='Leave 2 exceptions unfiled').click()
    expect(dialog.get_by_role('button', name='Leave 2 exceptions unfiled')).to_have_count(0)
    assert len(api('')['sources']) == len(before['sources'])
    dialog.get_by_role('button', name='Back to import').click()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.get_by_role('button', name='Review and import 13 files', exact=True).click()
    expect(page.get_by_role('dialog').get_by_role('region', name='Prepared filing summary')).to_be_visible()
    page.get_by_role('dialog').get_by_role('button', name='Import into workspace', exact=True).click()
    expect(page.get_by_text('13 originals imported', exact=False)).to_be_visible()
    result = api('/imports/'+batch_id)
    assert len(result['receipt']['matterIds']) == 1
    assert len(api('')['sources']) == len(before['sources'])+13
    assert len(api('')['knowledge']) == len(before['knowledge'])
    assert len([e for e in result['entries'] if e['choice']['matterId'] == matter['id']]) == 10
    assert not errors, errors
    assert not external, external
    browser.close()
print('PASS: automatic staging, isolated evidence failures and repair, grouped filing, navigation/reload, leave exceptions unfiled, separate import, desktop/mobile; no real model calls')
