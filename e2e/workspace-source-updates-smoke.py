"""Source updates, history, preserved citations and stale-edit UX; synthetic only."""
import base64
import json
import subprocess
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
TOKEN = 'workspace-browser-test-only'
repo = Path(__file__).resolve().parent.parent
artifacts = repo / 'e2e' / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
fixtures = json.loads(subprocess.check_output([shutil.which('bun'), 'e2e/workspace-document-fixtures.ts'], cwd=repo))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def api(path='', data=None):
        args = {'headers': {'Authorization': 'Bearer ' + TOKEN}}
        response = page.request.get(BASE + '/api/workspace' + path, **args) if data is None else page.request.post(BASE + '/api/workspace' + path, data=data, **args)
        assert response.ok, response.text()
        return response.json()
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('What remains unresolved?')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    chat_url = page.url
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    old_id = turn['state']['citations'][0]['target']['revisionId']
    source_id = api('/source-revisions/' + old_id)['sourceId']
    page.goto(BASE + '/#/references?id=' + source_id)
    expect(page.get_by_role('heading', name='Versions & updates')).to_be_visible()
    page.get_by_role('button', name='Update saved text', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    dialog.get_by_label('Saved text', exact=True).fill('The witness interview is complete. The timing remains disputed.')
    dialog.get_by_role('button', name='Save new version', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_role('heading', name='Earlier work to revisit')).to_be_visible()
    expect(page.locator('.reading-body')).to_contain_text('The witness interview is complete.')
    expect(page.get_by_role('link', name='Version 1', exact=False)).to_be_visible()
    latest = api('/sources/' + source_id)['latest']
    assert latest['number'] == 2
    page.get_by_role('link', name='Version 1', exact=False).click()
    expect(page.get_by_text('You are reading the exact version referenced at the time.')).to_be_visible()
    expect(page.locator('.reading-body')).to_contain_text('The witness interview remains outstanding.')
    expect(page.get_by_role('button', name='Update saved text', exact=True)).to_have_count(0)
    page.goto(chat_url)
    expect(page.get_by_role('complementary', name='Reference updates')).to_contain_text('cited v1; current v2')
    expect(page.locator('.chat-answer')).to_contain_text('The witness interview remains outstanding.')
    page.screenshot(path=str(artifacts / 'source-update-chat.png'), full_page=True)
    page.get_by_role('link', name='Files and sources', exact=True).click()
    expect(page.get_by_role('complementary', name='Reference updates')).to_be_visible()
    page.goto(BASE + '/#/references?id=' + source_id)
    # Updating in a second window must not silently replace the visible edit.
    page.get_by_role('button', name='Update saved text', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_label('Saved text', exact=True).fill('My unsaved text must remain here.')
    api('/sources/' + source_id + '/revisions', {'expectedRevisionId': latest['id'], 'title': latest['title'], 'body': 'A separate window saved this version.', 'origin': latest['provenance']['origin']})
    dialog.get_by_role('button', name='Save new version', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('changed in another window')
    expect(dialog.get_by_label('Saved text', exact=True)).to_have_value('My unsaved text must remain here.')
    page.once('dialog', lambda prompt: prompt.accept())
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    page.reload()
    expect(page.locator('.reading-body')).to_contain_text('A separate window saved this version.')
    # Binary document revisions use the same source identity and preserve exact bytes.
    original = b'Original uploaded document.\n'
    document = api('/files', {'name': 'Version one.txt', 'base64': base64.b64encode(original).decode()})
    page.goto(BASE + '/#/references?id=' + document['id'])
    page.get_by_role('button', name='Add document version', exact=True).click()
    dialog = page.get_by_role('dialog')
    word = base64.b64decode(fixtures['Synthetic notice.docx'])
    dialog.get_by_label('Revised document').set_input_files({'name': 'Revised notice.docx', 'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'buffer': word})
    assert api('/sources/' + document['id'])['latest']['number'] == 1, 'Selecting a file must not save it'
    dialog.get_by_role('button', name='Save new version', exact=True).click()
    expect(dialog).to_have_count(0, timeout=15000)
    expect(page.locator('.reading-body')).to_contain_text('Written notice is required.')
    with page.expect_download() as download:
        page.get_by_role('button', name='Download original', exact=True).click()
    assert Path(download.value.path()).read_bytes() == word
    page.get_by_role('link', name='Version 1', exact=False).click()
    with page.expect_download() as download:
        page.get_by_role('button', name='Download original', exact=True).click()
    assert Path(download.value.path()).read_bytes() == original
    page.screenshot(path=str(artifacts / 'source-versions-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'source-versions-mobile.png'), full_page=True)
    assert not errors, errors
    browser.close()
    print('PASS: source edits, preserved history/citations, chat and output flags, stale-edit protection, explicit document replacement, exact originals and mobile layout')
