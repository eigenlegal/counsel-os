"""Built UI with real local extraction and original downloads; no model calls."""
import base64
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
fixtures = json.loads(subprocess.check_output(['bun', 'e2e/workspace-document-fixtures.ts']))
word_text = {
    'Round baseline.docx': 'Payment net 30.',
    'Round sent.docx': 'Payment net 45.',
    'Round returned.docx': 'Payment net 60.',
    'Synthetic notice.docx': '{--Oral notice--}{++Written notice++}',
}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors, sends, external = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    page.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) and not r.url.startswith('blob:') else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/matters')
    page.locator('.matter-directory-row').filter(has_text='Document assessment').click()
    matter_url = page.url
    page.get_by_role('button', name='Documents', exact=True).click()
    for name in fixtures:
        page.get_by_role('button', name='Add document', exact=True).click()
        dialog = page.get_by_role('dialog', name='Add a document to this matter')
        expect(dialog.get_by_label('Upload document', exact=True)).to_be_visible()
        dialog.get_by_label('Upload document', exact=True).set_input_files({'name': name, 'mimeType': 'application/octet-stream', 'buffer': base64.b64decode(fixtures[name])})
        expect(dialog).to_have_count(0, timeout=15000)
        page.locator('.matter-view').get_by_role('link').filter(has_text=name).click()
        expect(page.get_by_role('heading', name=name, exact=True)).to_be_visible()
        if name.endswith('.docx'):
            # The shared corpus also contains three clean negotiation rounds;
            # only the notice fixture contains tracked revisions.
            expect(page.locator('.reading-body')).to_contain_text(word_text[name])
        elif name.startswith('No-text'):
            expect(page.locator('.extraction-info')).to_contain_text('No extractable text')
            expect(page.locator('.reading-body')).to_contain_text('No text has been saved')
        else:
            expect(page.locator('.reading-body')).to_contain_text('Page 3')
            expect(page.locator('.extraction-info')).to_contain_text('pages 2')
        with page.expect_download() as pending:
            page.get_by_role('button', name='Download original', exact=True).click()
        download = pending.value
        assert download.suggested_filename == name
        assert Path(download.path()).read_bytes() == base64.b64decode(fixtures[name])
        if name == 'Synthetic evidence.pdf':
            shots = Path(__file__).parent / '.tmp' / 'workspace'
            shots.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(shots / 'pdf-extraction.png'), full_page=True)
        page.goto(matter_url)
        page.get_by_role('button', name='Documents', exact=True).click()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.get_by_role('button', name='Add document', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_label('Upload document', exact=True).set_input_files({'name': 'legacy.doc', 'mimeType': 'application/msword', 'buffer': b'Synthetic unsupported input'})
    expect(dialog.get_by_role('alert')).to_contain_text('Convert legacy .doc')
    dialog.get_by_label('Upload document', exact=True).set_input_files({'name': 'broken.pdf', 'mimeType': 'application/pdf', 'buffer': b'Synthetic broken PDF'})
    expect(dialog.get_by_role('alert')).to_contain_text('not a readable PDF')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    assert not sends, sends
    assert not external, external
    browser.close()
    print('PASS: Word/PDF uploads, scoped matter documents, visible extraction gaps, exact original downloads, unsupported input and mobile recovery; no model calls')
