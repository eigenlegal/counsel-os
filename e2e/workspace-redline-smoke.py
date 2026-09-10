"""Native original-DOCX editing, inspectable changes and exact downloads. Synthetic --chat fixture only."""
import io
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, sends = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    work = api('/work', {'title': 'Synthetic notice agreement', 'request': 'Create a synthetic original', 'answer': '## Notices\n\nNotices may be given orally.\n\n## Payment\n\nPayment is due within thirty days.'})
    file = api('/work/' + work['id'] + '/exports', {})
    original = context.request.get(BASE + '/api/workspace/exports/' + file['id'] + '/download', headers=headers)
    assert original.ok
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Add documents', exact=True).click()
    page.locator('input[type=file]').set_input_files({'name': 'Synthetic notice agreement.docx', 'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'buffer': original.body()})
    expect(page.get_by_role('dialog')).to_have_count(0, timeout=15000)
    expect(page.locator('.document-chip')).to_have_count(1)
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('native redline fixture: require written notice, with a comment. Leave the rest unchanged.')
    page.get_by_role('button', name='Send message', exact=True).click()
    card = page.get_by_role('region', name='Document redline', exact=True)
    expect(card).to_contain_text('Draft redline ready', timeout=20000)
    expect(page.get_by_role('button', name='Download answer as Word', exact=True)).to_be_visible()
    card.locator('summary').click()
    expect(card.locator('del')).to_have_text('orally')
    expect(card.locator('ins')).to_have_text('in writing')
    with page.expect_download() as event:
        card.get_by_role('button', name='Download redline', exact=True).click()
    first = event.value
    redline = Path(first.path()).read_bytes()
    first.save_as(str(OUT / 'chat-native-redline.docx'))
    with zipfile.ZipFile(io.BytesIO(redline)) as document:
        xml = document.read('word/document.xml').decode()
        assert '<w:del ' in xml and '<w:ins ' in xml and 'w:author="Counsel"' in xml
        assert 'in writing' in xml and 'Payment is due within thirty days.' in xml
        assert 'Use the written-notice requirement.' in document.read('word/comments.xml').decode()
    page.screenshot(path=str(OUT / 'redline-1440.png'), full_page=True, animations='disabled')
    chat_url = page.url
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    assert len(api('/work/' + turn['workId'] + '/exports')) == 1
    # Source link opens the original, not the generated copy or an unrelated current version.
    card.get_by_role('link', name='Synthetic notice agreement.docx', exact=True).click()
    expect(page.locator('.reading-body')).to_contain_text('Notices may be given orally.')
    page.goto(chat_url)
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(card).to_be_visible()
    card.locator('summary').click()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT / 'redline-390.png'), full_page=True, animations='disabled')
    # Download failure must not lose the saved file; retry/reload reuses its exact bytes.
    page.route('**/api/workspace/exports/*/download', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":"Synthetic download failure. Try again."}'))
    card.get_by_role('button', name='Download redline', exact=True).click()
    expect(card.get_by_role('alert')).to_contain_text('Synthetic download failure')
    page.unroute('**/api/workspace/exports/*/download')
    page.reload()
    with page.expect_download() as event:
        card.get_by_role('button', name='Download redline', exact=True).click()
    assert Path(event.value.path()).read_bytes() == redline
    page.get_by_role('link', name='Files and sources', exact=True).click()
    page.get_by_text('Saved Word files (1)', exact=True).click()
    with page.expect_download() as event:
        page.get_by_role('button', name=first.suggested_filename, exact=True).click()
    assert Path(event.value.path()).read_bytes() == redline
    assert len(sends) == 1
    page.goto(chat_url)
    card.get_by_role('button', name='Clean proposal…', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_contain_text('Comments, including drafting rationale, are retained.')
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    assert len(api('/work/' + turn['workId'] + '/exports')) == 1
    card.get_by_role('button', name='Clean proposal…', exact=True).click()
    dialog.get_by_role('button', name='Create clean proposal', exact=True).click()
    expect(dialog.get_by_role('button', name='Download clean proposal', exact=True)).to_be_enabled(timeout=20000)
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'clean-proposal-{width}.png'), animations='disabled')
    with page.expect_download() as event:
        dialog.get_by_role('button', name='Download clean proposal', exact=True).click()
    clean = Path(event.value.path()).read_bytes()
    event.value.save_as(str(OUT / 'chat-clean-proposal.docx'))
    with zipfile.ZipFile(io.BytesIO(clean)) as document:
        xml = document.read('word/document.xml').decode()
        assert '<w:ins ' not in xml and '<w:del ' not in xml and '<w:delText' not in xml
        assert 'in writing' in xml and 'orally' not in xml
        assert 'Use the written-notice requirement.' in document.read('word/comments.xml').decode()
    assert len(api('/work/' + turn['workId'] + '/exports')) == 2
    dialog.get_by_role('button', name='Close', exact=True).click()
    page.reload()
    card.get_by_role('button', name='Clean proposal…', exact=True).click()
    expect(dialog.get_by_role('button', name='Create clean proposal', exact=True)).to_have_count(0)
    with page.expect_download() as event:
        dialog.get_by_role('button', name='Download clean proposal', exact=True).click()
    assert Path(event.value.path()).read_bytes() == clean
    dialog.get_by_role('button', name='Close', exact=True).click()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.get_by_role('button', name='New chat', exact=True).click()
    page.get_by_role('button', name='Add documents', exact=True).click()
    page.locator('input[type=file]').set_input_files({'name': 'Synthetic insertion agreement.docx', 'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'buffer': original.body()})
    expect(page.get_by_role('dialog')).to_have_count(0, timeout=15000)
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('section insertion fixture: add electronic copies before Payment.')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(card).to_contain_text('Draft redline ready', timeout=20000)
    card.locator('summary').click()
    expect(card).to_contain_text('Insert before “Payment”')
    expect(card.locator('ins')).to_have_text(['Electronic copies', 'The parties may exchange electronic copies.'])
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        card.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'redline-insertion-{width}.png'), animations='disabled')
    with page.expect_download() as event:
        card.get_by_role('button', name='Download redline', exact=True).click()
    with zipfile.ZipFile(event.value.path()) as document:
        xml = document.read('word/document.xml').decode()
        assert xml.count('<w:ins ') == 4 and 'orally' in xml
        assert xml.index('Electronic copies') < xml.index('>Payment<')
    page.reload()
    card.locator('summary').click()
    expect(card).to_contain_text('The parties may exchange electronic copies.')
    card.get_by_role('button', name='Clean proposal…', exact=True).click()
    dialog.get_by_role('button', name='Create clean proposal', exact=True).click()
    try:
        expect(dialog.get_by_role('button', name='Download clean proposal', exact=True)).to_be_enabled(timeout=20000)
    except Exception:
        print(dialog.inner_text())
        page.screenshot(path=str(OUT / 'clean-insertion-error.png'), animations='disabled')
        raise
    with page.expect_download() as event:
        dialog.get_by_role('button', name='Download clean proposal', exact=True).click(timeout=20000)
    event.value.save_as(str(OUT / 'chat-clean-insertion.docx'))
    with zipfile.ZipFile(event.value.path()) as document:
        xml = document.read('word/document.xml').decode()
        assert '<w:ins ' not in xml and 'orally' in xml
        assert xml.index('Electronic copies') < xml.index('>Payment<')
    assert len(sends) == 2 and not errors and not external, (errors, external, sends)
    browser.close()
    print('PASS: native redline/insertion, confirmed clean proposals retaining comments, exact downloads/reopen, immutable originals, no extra model calls and mobile')
