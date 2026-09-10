"""Word export through real chat/storage/download APIs; synthetic fixture only."""
import io
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
TOKEN = 'workspace-browser-test-only'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, sends, external = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda req: sends.append(req.url) if req.url.endswith('/send') else None)
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(BASE) else None)
    def api(path, data=None):
        args = {'headers': {'Authorization': 'Bearer ' + TOKEN}}
        response = page.request.get(BASE + '/api/workspace' + path, **args) if data is None else page.request.post(BASE + '/api/workspace' + path, data=data, **args)
        assert response.ok, response.text()
        return response.json()
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    expect(page.get_by_role('button', name='Download Word', exact=True)).to_have_count(0)
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('What remains unresolved?')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    with page.expect_download() as event:
        page.get_by_role('button', name='Download Word', exact=True).click()
    first = event.value
    original = Path(first.path()).read_bytes()
    first.save_as(str(artifacts / 'chat-export.docx'))
    with zipfile.ZipFile(io.BytesIO(original)) as document:
        xml = document.read('word/document.xml').decode()
        assert 'w:anchor="source_1"' in xml
        assert 'The witness interview remains outstanding.' in xml
        assert 'Draft · Not approved' in xml
    expect(page.get_by_role('status')).to_contain_text('Word file prepared')
    assert len(sends) == 1
    assert len(api('/work/' + turn['workId'] + '/exports')) == 1
    assert any(w['id'] == turn['workId'] for w in api('')['savedWork'])
    page.get_by_role('link', name='Files and sources', exact=True).click()
    expect(page.locator('.reading-body').get_by_role('heading', name='Where the matter stands', exact=True)).to_be_visible()
    expect(page.get_by_text('Saved Word files (1)', exact=True)).to_be_visible()
    page.reload()
    page.get_by_text('Saved Word files (1)', exact=True).click()
    with page.expect_download() as event:
        page.get_by_role('button', name=first.suggested_filename, exact=True).click()
    assert Path(event.value.path()).read_bytes() == original
    page.screenshot(path=str(artifacts / 'word-export-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.get_by_role('button', name='Download Word', exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    # Failure keeps the saved file discoverable and offers a straightforward retry.
    page.route('**/api/workspace/work/*/exports', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":"Synthetic export failure. Try again."}'))
    page.get_by_role('button', name='Download Word', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Synthetic export failure')
    page.unroute('**/api/workspace/work/*/exports')
    with page.expect_download() as event:
        page.get_by_role('button', name='Download Word', exact=True).click()
    assert Path(event.value.path()).read_bytes() == original
    expect(page.get_by_role('alert')).to_have_count(0)
    page.screenshot(path=str(artifacts / 'word-export-mobile.png'), full_page=True)
    assert not errors, errors
    assert not external, external
    assert len(sends) == 1
    browser.close()
    print('PASS: chat export, linked citation appendix, exact re-download, curated outputs, reload, failure/retry and mobile layout; no additional model calls')
