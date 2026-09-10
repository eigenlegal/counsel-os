"""Browser-only verification of an already running relocated packaged engine."""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

config = json.loads(Path(sys.argv[1]).read_text())
parts = urlsplit(config['url'])
base = f'{parts.scheme}://{parts.netloc}'
root = Path(config['root'])
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    errors, external, sends = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(base + '/') and not r.url.startswith('blob:') else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    page.goto(config['url'])
    page.wait_for_load_state('networkidle')
    page.goto(base + '/#/matters')
    page.locator('.matter-directory-row').filter(has_text='Packaged matter').click()
    page.get_by_role('button', name='Documents', exact=True).click()
    page.get_by_role('button', name='Add document', exact=True).click()
    dialog = page.get_by_role('dialog', name='Add a document to this matter')
    note = b'Synthetic browser import from the relocated executable.'
    dialog.get_by_label('Upload document', exact=True).set_input_files({'name': 'Packaged browser note.md', 'mimeType': 'text/markdown', 'buffer': note})
    expect(dialog).to_have_count(0)
    page.locator('.matter-view').get_by_role('link').filter(has_text='Packaged browser note.md').click()
    expect(page.locator('.reading-body')).to_contain_text(note.decode())
    with page.expect_download() as pending:
        page.get_by_role('button', name='Download original', exact=True).click()
    assert Path(pending.value.path()).read_bytes() == note
    for width, height in [(1440, 1000), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(root / f'packaged-browser-{width}.png'), animations='disabled')
    assert not errors, errors
    assert not external, external
    assert not sends, sends
    browser.close()
print('PASS: packaged UI, browser upload/download, desktop/mobile and no model/external requests')
