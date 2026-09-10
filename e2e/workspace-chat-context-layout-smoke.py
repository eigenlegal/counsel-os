"""One chat-context surface, separate next-message and historical receipts. Synthetic only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, sends = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    def api(path, body=None):
        headers = {'Authorization':'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    def upload(names):
        page.get_by_role('button', name='Add documents', exact=True).click()
        page.get_by_label('Upload document', exact=True).set_input_files([
            {'name':name, 'mimeType':'text/plain', 'buffer':b'Synthetic note. Interview remains outstanding.'} for name in names])
        expect(page.get_by_role('dialog', name='Add documents to this chat')).to_have_count(0, timeout=10000)
    def shot(name):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/name), animations='disabled')
    def integrated_composer():
        bar_box = bar.bounding_box()
        composer_box = page.locator('.chat-composer').bounding_box()
        assert abs(bar_box['x'] - composer_box['x']) <= 2
        assert abs(bar_box['width'] - composer_box['width']) <= 2
        assert 0 <= bar_box['y'] - composer_box['y'] <= 2
        assert bar.locator('..').evaluate("el => el.matches('form.chat-composer')")
        text_box = page.get_by_role('textbox', name='Message Counsel', exact=True).bounding_box()
        assert abs(text_box['y'] - bar_box['y'] - bar_box['height']) <= 2
        for control in bar.locator('.chat-scope-selection, .context-toggle').all():
            box = control.bounding_box()
            assert box['x'] >= bar_box['x'] and box['x'] + box['width'] <= bar_box['x'] + bar_box['width']
        reminder_box = page.locator('.composer-practice-note').bounding_box()
        assert reminder_box['y'] >= composer_box['y'] + composer_box['height']
        assert abs(reminder_box['x'] - composer_box['x']) <= 4

    profile = api('/profile', {'expectedRevisionId':None, 'name':'PRIVATE-PROFILE-CANARY', 'applyToChats':False})
    prefs = api('/working-preferences', {'expectedRevisionId':None, 'generalReview':'Original synthetic review preference.'})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    bar = page.get_by_role('region', name='Chat context', exact=True)
    expect(bar.get_by_text('Scope', exact=True)).to_have_count(0)
    expect(bar.locator('.chat-scope-selection > svg')).to_have_count(0)
    expect(bar.get_by_label('Conversation context', exact=True)).to_be_visible()
    expect(bar).not_to_contain_text('Practice · saved instructions & relevant material')
    expect(page.locator('.composer-footnote').get_by_role('link', name='Practice preferences', exact=True)).to_have_attribute('href', '#/knowledge?section=preferences')
    expect(bar).not_to_contain_text('No documents added')
    expect(bar.locator('.chat-context-documents')).to_have_count(0)
    for width in [1440, 390, 320]:
        page.set_viewport_size({'width':width, 'height':1000 if width == 1440 else 844})
        integrated_composer()
        shot(f'chat-composer-empty-{width}.png')
    page.set_viewport_size({'width':1440, 'height':1000})
    expect(page.get_by_text('+ practice context', exact=True)).to_have_count(0)
    page.get_by_role('button', name='View context', exact=True).click()
    panel = page.get_by_role('complementary', name='Chat context', exact=True)
    expect(panel).to_contain_text('Available for your next message')
    expect(panel).to_contain_text('Profile sharing is off')
    expect(panel).not_to_contain_text('PRIVATE-PROFILE-CANARY')
    expect(panel.get_by_role('button', name='Latest response', exact=True)).to_have_count(0)
    page.get_by_role('button', name='Close context', exact=True).click()
    bar.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    upload(['Original evidence.txt'])
    expect(bar.locator('.document-chip')).to_have_count(1)
    expect(bar.locator('.document-chip')).to_contain_text('Next message')
    expect(page.locator('.chat-composer .document-chip')).to_have_count(1)
    field = page.get_by_role('textbox', name='Message Counsel', exact=True)
    field.fill('What remains unresolved?')
    integrated_composer()
    shot('chat-context-unified-1440.png')
    assert not sends and not api('/conversations')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=20000)
    chat_id = page.url.split('id=')[1]
    original = api('/conversations/'+chat_id)['turns'][0]
    assert original['state']['profileContext'] is None
    automatically_read = [record for record in original['state']['context'] if record['kind'] == 'source' and record['id'] not in original['attachments'] and record['ranges']]
    assert automatically_read, 'The fixture did not automatically prepare/read an unattached document.'
    for record in automatically_read:
        expect(bar.locator('.chat-context-documents')).not_to_contain_text(record['title'])
    expect(bar.locator('.document-chip')).to_contain_text('In this chat')
    # A new draft attachment and updated preferences must not appear in an old receipt.
    prefs2 = api('/working-preferences', {'expectedRevisionId':prefs['revisionId'], 'generalReview':'Updated synthetic review preference.'})
    page.reload()
    upload(['Not sent yet.txt'])
    page.get_by_role('button', name='View context', exact=True).click()
    expect(panel).to_contain_text('Not sent yet.txt')
    expect(panel).to_contain_text('Added for next message · not sent yet')
    panel.get_by_label('Working instructions for next message').locator('summary').click()
    expect(panel).to_contain_text('Updated synthetic review preference.')
    page.get_by_role('button', name='Latest response', exact=True).click()
    receipt = page.get_by_role('complementary', name='Response context', exact=True)
    expect(receipt).to_contain_text('What remains unresolved?')
    expect(receipt).not_to_contain_text('Not sent yet.txt')
    for record in automatically_read:
        expect(receipt.locator('.context-record').filter(has_text=record['title'])).to_be_visible()
    receipt.get_by_label('Working instructions included').locator('summary').click()
    expect(receipt).to_contain_text('Original synthetic review preference.')
    expect(receipt).not_to_contain_text('Updated synthetic review preference.')
    shot('chat-context-receipt-1440.png')
    page.get_by_role('button', name='Next message', exact=True).click()
    expect(panel).to_contain_text('Not sent yet.txt')
    page.set_viewport_size({'width':390, 'height':844})
    modal = page.get_by_role('dialog', name='Chat context', exact=True)
    expect(modal).to_be_visible()
    shot('chat-context-inspector-390.png')
    page.keyboard.press('Escape')
    expect(modal).to_have_count(0)
    expect(field).to_be_focused()
    shot('chat-context-unified-390.png')
    integrated_composer()
    jump = page.get_by_role('button', name='Latest response ↓', exact=True)
    if jump.count():
        jump_box = jump.bounding_box()
        assert jump_box['y'] + jump_box['height'] <= bar.bounding_box()['y'], 'Latest-response button overlaps context controls'
    page.get_by_role('button', name='Remove Not sent yet.txt', exact=True).click()
    expect(bar.locator('.document-chip')).to_have_count(1)
    expect(page.get_by_role('button', name='Remove Original evidence.txt', exact=True)).to_have_count(0)
    # An existing response's own receipt opens that response directly, not the draft.
    page.locator('.chat-receipt').get_by_role('button', name='records in context', exact=False).click()
    expect(page.get_by_role('dialog', name='Response context', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':1440, 'height':1000})
    upload([f'Additional supporting document number {i:02}.txt' for i in range(11)])
    expect(bar.locator('.document-chip')).to_have_count(12)
    assert bar.locator('.chat-context-documents').evaluate('el => el.scrollHeight > el.clientHeight && el.clientHeight <= 86')
    expect(field).to_be_visible()
    page.set_viewport_size({'width':390, 'height':844})
    shot('chat-context-many-documents-390.png')
    assert api('/profile') == profile
    assert api('/working-preferences') == prefs2
    assert api('/conversations/'+chat_id)['turns'][0] == original
    assert len(sends) == 1 and not external and not errors, (sends,external,errors)
    browser.close()
    print('PASS: context and documents integrated into composer; quiet preferences footer; 320/390/1440px; automatic reads separate from attachments; current vs historical context; pending removal; bounded 12-file list; keyboard/mobile; profile privacy; no external/model requests')
