"""Real UI + SQLite + deterministic adapter. No live model calls or user records."""
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
    errors, external = [], []
    context.on('page', lambda page: page.on('pageerror', lambda e: errors.append(str(e))))
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(BASE) else None)
    def snapshot(name):
        page.screenshot(path=str(artifacts / name), full_page=True, animations='disabled')
    def api(path):
        response = page.request.get(BASE + '/api/workspace' + path, headers={'Authorization': 'Bearer ' + TOKEN})
        assert response.ok, response.text()
        return response.json()
    def new_chat(message):
        page.get_by_role('button', name='New chat', exact=True).click()
        expect(page.get_by_role('heading', name='What are we working through?')).to_be_visible()
        page.get_by_role('textbox', name='Message Counsel', exact=True).fill(message)
        page.get_by_role('button', name='Send message', exact=True).click()
        page.wait_for_url('**/#/home?id=*')
        return page.url.split('id=')[1]

    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='What are we working through?')).to_be_visible()
    assert 'token=' not in page.url
    snapshot('chat-start.png')
    page.goto(BASE + '/#/knowledge?section=preferences')
    page.get_by_role('button', name='Set up profile', exact=True).click()
    page.get_by_role('dialog').get_by_label('Your name', exact=True).fill('Synthetic reviewer')
    page.get_by_role('button', name='Save profile', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='New chat', exact=True).click()
    # One matter selection, then natural conversation. No primitive/task picker.
    select = page.get_by_label('Conversation context', exact=True)
    select.click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('What remains unresolved in this investigation?')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    first_id = page.url.split('id=')[1]
    avatar = page.locator('.counsel-avatar').first
    expect(avatar).to_be_visible()
    assert avatar.evaluate('el => parseFloat(getComputedStyle(el).lineHeight) <= el.clientHeight')
    byline = page.locator('.counsel-byline-text').first
    assert byline.evaluate("el => getComputedStyle(el).alignItems") == 'baseline'
    a, b = avatar.bounding_box(), byline.bounding_box()
    assert abs(a['y'] + a['height'] / 2 - b['y'] - b['height'] / 2) < 1
    snapshot('chat-working-alignment.png')
    second_id = new_chat('Draft a short update for the team.')
    assert first_id != second_id
    assert len([c for c in api('/conversations') if c['running']]) == 2, 'Responses did not overlap'
    print('PASS: two conversations run simultaneously')
    snapshot('chat-concurrent.png')
    # Leaving, reloading, and a second browser tab must not cancel the first run.
    page.reload()
    page.wait_for_load_state('networkidle')
    another = context.new_page()
    another.goto(BASE + '/#token=' + TOKEN)
    another.wait_for_load_state('networkidle')
    another.goto(BASE + '/#/home?id=' + first_id)
    expect(another.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    assert api('/conversations/' + first_id)['turns'][0]['state']['answer'] != api('/conversations/' + second_id)['turns'][0]['state']['answer']
    assert len(api('/conversations/' + first_id)['turns']) == 1
    print('PASS: reload, second tab, independent results and durable saves')
    another.close()
    page.goto(BASE + '/#/home?id=' + first_id)
    expect(page.get_by_role('button', name='Source S1: Synthetic investigation note', exact=True)).to_be_visible()
    page.get_by_role('button', name='Source S1: Synthetic investigation note', exact=True).click()
    panel = page.get_by_role('complementary', name='Source passage', exact=True)
    expect(panel).to_be_visible()
    expect(panel.get_by_text('Exact text verified', exact=False)).to_be_visible()
    expect(panel.locator('mark')).to_have_text('The witness interview remains outstanding.')
    snapshot('chat-source-reader.png')
    page.get_by_role('button', name='Close context', exact=True).click()
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    expect(page.get_by_role('complementary', name='Response context', exact=True)).to_contain_text('Prepared · 0–')
    assert api('/conversations/' + first_id)['turns'][0]['state']['preparedContext']['records']
    snapshot('chat-context.png')
    page.get_by_role('button', name='Close context', exact=True).click()
    page.locator('.chat-activity > summary').click()
    expect(page.locator('.chat-activity')).to_contain_text('Checking an exact citation')
    print('PASS: exact source passage, read receipts and real activity trail')
    review = page.get_by_role('region', name='Practice review', exact=True)
    expect(review).to_contain_text('Applies only to this matter')
    expect(review.locator('.profile-attribution')).to_contain_text('Synthetic reviewer')
    expect(review.get_by_role('textbox')).to_have_count(0)
    review.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(review).to_contain_text('View recorded review')
    snapshot('chat-knowledge-approved.png')
    print('PASS: inline human knowledge approval')
    # Drafts stay with their respective conversation when switching between chats.
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('Unsent draft A')
    page.goto(BASE + '/#/home?id=' + second_id)
    expect(page.get_by_role('textbox', name='Message Counsel', exact=True)).to_have_value('')
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('Unsent draft B')
    page.goto(BASE + '/#/home?id=' + first_id)
    expect(page.get_by_role('textbox', name='Message Counsel', exact=True)).to_have_value('Unsent draft A')
    print('PASS: per-conversation drafts do not bleed across chats')
    # Uploaded originals and extracted text are real, with clear support limits.
    page.get_by_role('button', name='New chat', exact=True).click()
    expect(page.get_by_role('heading', name='What are we working through?')).to_be_visible()
    page.get_by_role('button', name='Add documents', exact=True).click()
    page.get_by_label('Upload document', exact=True).set_input_files({'name': 'unsupported.doc', 'mimeType': 'application/msword', 'buffer': b'unsupported fixture'})
    expect(page.get_by_role('alert')).to_contain_text('Convert legacy .doc')
    page.get_by_label('Upload document', exact=True).set_input_files({'name': 'Evidence upload.txt', 'mimeType': 'text/plain', 'buffer': 'Interview pending. 📄 Exact original.\r\n'.encode('utf8')})
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('.document-chip')).to_contain_text('Evidence upload.txt')
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('What does the attached text establish?')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    uploaded_id = page.url.split('id=')[1]
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    expect(page.get_by_role('button', name='Source S1: Evidence upload.txt', exact=True)).to_be_visible()
    uploaded = api('/conversations/' + uploaded_id)['turns'][0]
    assert uploaded['state']['context'][0]['status'] == 'ready'
    assert uploaded['state']['context'][0]['ranges']
    snapshot('chat-upload.png')
    print('PASS: supported file upload, version pinning, citation and unsupported-file feedback')
    before = api('')['totals']['work']
    cancelled_id = new_chat('Stop this synthetic response.')
    expect(page.get_by_role('button', name='Stop response', exact=True)).to_be_visible()
    page.get_by_role('button', name='Stop response', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Stopped.')
    assert api('/conversations/' + cancelled_id)['turns'][0]['status'] == 'cancelled'
    assert api('')['totals']['work'] == before
    failed_id = new_chat('Please simulate failure.')
    expect(page.get_by_role('alert')).to_contain_text('could not finish', timeout=15000)
    assert api('/conversations/' + failed_id)['turns'][0]['status'] == 'failed'
    assert api('')['totals']['work'] == before
    print('PASS: stop/failure preserve partial answers without completed work')
    xss_id = new_chat('<img src="https://untrusted.invalid/track" onerror="alert(1)">Synthetic input')
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    assert page.locator('.chat-answer img').count() == 0
    assert api('/conversations/' + xss_id)['turns'][0]['status'] == 'complete'
    print('PASS: model Markdown sanitized and no unsolicited external requests')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(BASE + '/#/home?id=' + uploaded_id)
    expect(page.get_by_role('button', name='Source S1: Evidence upload.txt', exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    snapshot('chat-mobile.png')
    page.get_by_role('button', name='Source S1: Evidence upload.txt', exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_role('dialog').locator('mark')).to_contain_text('Interview pending.')
    snapshot('chat-mobile-source.png')
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Open navigation', exact=True).click()
    expect(page.get_by_role('complementary', name='Workspace navigation')).to_be_visible()
    snapshot('chat-mobile-navigation.png')
    print('PASS: narrow layout, accessible source dialog and navigation')
    assert not errors, errors
    assert not external, external
    browser.close()
    print('All chat browser checks passed; no model calls, browser errors or external requests.')
