"""Chat-first practice document. Synthetic workspace and scripted provider only."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7465'
TOKEN = 'workspace-browser-test-only'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors, sends = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda req: sends.append(req.url) if req.url.endswith('/send') else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/settings?view=setup')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='Tell Counsel about your practice', exact=True)).to_be_visible()
    page.screenshot(path=str(artifacts / 'practice-onboarding.png'), full_page=True)
    page.get_by_role('button', name='Tell Counsel about your practice', exact=True).click()
    expect(page.get_by_role('textbox', name='Message Counsel', exact=True)).to_contain_text('Help me develop my practice profile')
    assert not sends, sends
    page.goto(BASE + '/#/settings?view=setup')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Write or paste text', exact=True).click()
    setup_dialog = page.get_by_role('dialog', name='Your practice', exact=True)
    expect(setup_dialog.get_by_role('textbox', name='Practice document', exact=True)).to_be_enabled()
    setup_dialog.get_by_role('button', name='Close dialog', exact=True).click()
    page.goto(BASE + '/#/knowledge?section=preferences')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Your practice', exact=True)).to_be_visible()
    expect(page.get_by_text('The interface and workspace engine need the same update.', exact=False)).to_have_count(0)
    expect(page.get_by_role('navigation', name='Preference views')).to_have_count(0)
    expect(page.get_by_role('textbox', name='NDA review instructions')).to_have_count(0)
    page.screenshot(path=str(artifacts / 'practice-document-empty.png'), full_page=True)

    page.get_by_role('button', name='Write or paste text', exact=True).click()
    field = page.get_by_role('textbox', name='Practice document', exact=True)
    expect(field).to_be_enabled()
    draft = '# My approach\n\nKeep useful detail. Ask about genuine uncertainty.\n\nNo required categories.'
    field.fill(draft)
    assert page.evaluate('window.counselSaveDrafts()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Write or paste text', exact=True).click()
    expect(field).to_have_value(draft)
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(artifacts / f'practice-document-editor-{width}.png'), full_page=True)
    page.get_by_role('button', name='Develop this draft in chat', exact=True).click()
    message = page.get_by_role('textbox', name='Message Counsel', exact=True)
    expect(message).to_contain_text(draft)
    assert not sends, sends
    message.fill('Practice document fixture: please update my practice and Word author.')
    message.press('Enter')
    review_button = page.get_by_role('button', name='Review practice update', exact=True)
    expect(review_button).to_be_visible(timeout=15000)
    review_button.click()
    dialog = page.get_by_role('dialog', name='Review your practice update')
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        expect(dialog).to_be_visible()
        dialog.get_by_role('button', name='Proposed text', exact=True).scroll_into_view_if_needed()
        assert dialog.evaluate('(element) => element.scrollWidth <= element.clientWidth + 1')
        page.screenshot(path=str(artifacts / f'practice-document-review-{width}.png'), full_page=True)
        button = dialog.get_by_role('button', name='Save for future work', exact=True)
        button.scroll_into_view_if_needed()
        expect(button).to_be_in_viewport()
        assert dialog.evaluate('(element) => element.scrollWidth <= element.clientWidth + 1')
    dialog.get_by_role('button', name='Save for future work', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_role('heading', name='Your practice was updated')).to_be_visible()
    page.goto(BASE + '/#/knowledge?section=preferences')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='How I work')).to_be_visible()
    page.get_by_text('Applied details', exact=True).click()
    expect(page.get_by_text('Synthetic Avery', exact=True).first).to_be_visible()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.screenshot(path=str(artifacts / 'practice-document-saved.png'), full_page=True)
    page.get_by_text('Applied details', exact=True).click()
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        paper = page.locator('.practice-document')
        alignment = paper.evaluate('element => { const x = selector => element.querySelector(selector).getBoundingClientRect().left; return [x(".practice-document-heading"), x(".practice-document-toolbar"), x(".document-reader")]; }')
        assert max(alignment) - min(alignment) < 2, alignment
        page.screenshot(path=str(artifacts / f'practice-document-reading-{width}.png'), full_page=True)
    page.get_by_role('button', name='Saved text', exact=True).click()
    expect(page.get_by_text('Exact saved text, including formatting and import metadata. Citations use this text.')).to_be_visible()
    page.get_by_role('button', name='Reading view', exact=True).click()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    def api(path):
        response = page.request.get(BASE + '/api/workspace' + path, headers={'Authorization': 'Bearer ' + TOKEN})
        assert response.ok, response.text()
        return response.json()
    saved = api('/practice-document')
    send_count = len(sends)
    page.goto(BASE + '/#/imports')
    page.wait_for_load_state('networkidle')
    page.get_by_role('checkbox', name='Let Counsel organize my files after upload').uncheck()
    page.get_by_label('Choose import files', exact=True).set_input_files([
        {'name': 'notes-483.txt', 'mimeType': 'text/plain', 'buffer': b'I prefer useful detail. Keep my Obsidian vault filing conventions as external workflow notes.'},
        {'name': 'profile.md', 'mimeType': 'text/markdown', 'buffer': b'# My practice\nname: Synthetic Import Name\n## Working preferences\nKeep useful context.'},
        {'name': 'company.txt', 'mimeType': 'text/plain', 'buffer': b'Acme is an ordinary company with 20 employees.'},
    ])
    import_button = page.get_by_role('button', name='Review and import 3 files', exact=True)
    expect(import_button).to_be_enabled(timeout=15000)
    batch_id = page.url.split('id=')[1]
    import_button.click()
    confirmation = page.get_by_role('dialog')
    expect(confirmation.get_by_text('Your practice preferences and Word settings will not change during import.', exact=False)).to_be_visible()
    expect(confirmation.get_by_role('checkbox', name='Apply these reviewed preference changes')).to_have_count(0)
    confirmation.get_by_role('button', name='Import into workspace', exact=True).click()
    page.get_by_role('button', name='Set up my practice from this import', exact=True).click()
    picker = page.get_by_role('dialog', name='Bring your instructions into chat', exact=True)
    notes_choice = picker.get_by_role('checkbox', name=re.compile(r'notes.?483', re.I))
    expect(notes_choice).to_be_visible()
    expect(picker.get_by_role('checkbox', name='company', exact=False)).to_have_count(0)
    expect(picker.get_by_role('button', name='Continue in chat')).to_be_disabled()
    notes_choice.check()
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert picker.evaluate('(element) => element.scrollWidth <= element.clientWidth + 1')
        picker.get_by_role('button', name='Continue in chat').scroll_into_view_if_needed()
        expect(picker.get_by_role('button', name='Continue in chat')).to_be_in_viewport()
        page.screenshot(path=str(artifacts / f'practice-instruction-picker-{width}.png'), full_page=True)
    picker.get_by_role('button', name='Continue in chat').click()
    expect(page.get_by_role('textbox', name='Message Counsel', exact=True)).to_contain_text('Please read these attached files')
    assert len(sends) == send_count, sends
    assert api('/practice-document') == saved, 'Import or hint changed standing instructions'
    batch = api('/imports/' + batch_id)
    entry_id = next(item['id'] for item in batch['entries'] if item['path'] == 'notes-483.txt')
    revision = next(item['sourceRevisionId'] for item in batch['receipt']['items'] if item['entryId'] == entry_id)
    conversation_id = page.url.split('id=')[1]
    draft_response = page.request.get(BASE + '/api/workspace/drafts?key=chat:' + conversation_id, headers={'Authorization': 'Bearer ' + TOKEN})
    assert draft_response.ok, draft_response.text()
    assert draft_response.json()['value']['attachments'] == [revision]
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.get_by_text('What else can I ask Counsel to do?', exact=True).click()
    page.screenshot(path=str(artifacts / 'practice-chat-capabilities.png'), full_page=True)
    page.goto(BASE + '/#/settings?view=setup')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Start working', exact=True).click()
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('link', name='Finish setup', exact=True)).to_have_count(0)
    assert not errors, errors
    browser.close()
print('Practice onboarding: direct chat, free-form recovery, confirmed proposal, content-discovered import, exact attached draft, optional setup completion and responsive scrolling passed.')
