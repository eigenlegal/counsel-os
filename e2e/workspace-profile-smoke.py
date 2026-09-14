"""Single-user setup, attribution and per-response profile context.

Run with workspace-server.ts --chat (7461). Synthetic records/provider only.
"""
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
    errors, external, sends = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)

    def go(route):
        page.goto(BASE + '/' + route)
        page.wait_for_load_state('networkidle')

    def api(path='', data=None):
        headers = {'Authorization': 'Bearer ' + TOKEN}
        response = page.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else \
            page.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()

    def shot(name):
        page.screenshot(path=str(artifacts / (name + '.png')), full_page=True, animations='disabled')

    def edit():
        go('#/knowledge?section=preferences')
        page.get_by_role('button', name='Edit profile', exact=True).click()
        return page.get_by_role('dialog')

    go('#token=' + TOKEN)
    print('Rendered controls:', page.locator('button, select').all_text_contents())
    assert api('/profile') is None
    go('#/knowledge')
    page.get_by_role('button', name='Needs review', exact=True).click()
    page.get_by_role('link', name='Unreviewed monitoring idea').click()
    pending_url = page.url
    expect(page.get_by_role('button', name='Approve for practice', exact=True)).to_be_disabled()
    expect(page.get_by_role('textbox', name='Reviewed by')).to_have_count(0)
    go('#/work')
    page.get_by_role('button', name='Add a note or decision', exact=True).first.click()
    work_dialog = page.get_by_role('dialog', name='Record work', exact=True)
    work_dialog.get_by_label('Title', exact=True).fill('Decision during profile setup')
    work_dialog.get_by_label('Question or context', exact=True).fill('Record my decision.')
    work_dialog.get_by_label('Record as', exact=True).select_option('decision')
    work_dialog.get_by_label('Your decision', exact=True).fill('Keep the investigation open.')
    expect(work_dialog.get_by_role('button', name='Save work', exact=True)).to_be_disabled()
    page.get_by_role('button', name='Set up profile', exact=True).click()
    dialog = page.get_by_role('dialog', name='Set up your profile', exact=True)
    expect(dialog.get_by_label('Your name', exact=True)).to_be_focused()
    expect(dialog.get_by_role('button', name='Save profile', exact=True)).to_be_disabled()
    shot('profile-setup')
    dialog.get_by_label('Your name', exact=True).fill('Synthetic Avery')
    dialog.get_by_label('Role (optional)', exact=True).fill('Counsel OS')
    dialog.get_by_label('Organization (optional)', exact=True).fill('Example Legal')
    dialog.get_by_text('Practice context (optional)', exact=True).click()
    dialog.get_by_label('Organization context', exact=True).fill('Synthetic organization supporting legal research and investigations.')
    dialog.get_by_label('Practice areas', exact=True).fill('Advisory work and investigations')
    dialog.get_by_label('Jurisdictions', exact=True).fill('Synthetic jurisdiction; confirm for each matter')
    dialog.get_by_text('Working preferences (optional)', exact=True).click()
    dialog.get_by_label('Principles and risk approach', exact=True).fill('Distinguish evidence from assumptions.')
    dialog.get_by_label('Writing and communication', exact=True).fill('## Tone\n\nPlain language; lead with the conclusion.\n\n- Explain **material** edits.')
    dialog.get_by_label('When to flag or escalate', exact=True).fill('Flag unresolved material facts before a final decision.')
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(work_dialog.get_by_label('Title', exact=True)).to_have_value('Decision during profile setup')
    expect(work_dialog.locator('.profile-attribution')).to_contain_text('Synthetic Avery')
    expect(work_dialog.get_by_label('Your decision', exact=True)).to_have_value('Keep the investigation open.')
    work_dialog.get_by_role('button', name='Save work', exact=True).click()
    expect(work_dialog).to_have_count(0)
    expect(page.locator('.decision-signature')).to_contain_text('Synthetic Avery')
    go('#/settings')
    expect(page.get_by_role('region', name='Your profile')).to_have_count(0)
    page.get_by_role('link', name='Open practice preferences', exact=True).click()
    expect(page).to_have_url(BASE + '/#/knowledge?section=preferences')
    expect(page.get_by_role('region', name='Your profile')).to_contain_text('Synthetic Avery')
    expect(page.get_by_role('heading', name='Tone', exact=True)).to_be_visible()
    expect(page.locator('.profile-details strong')).to_have_text('material')
    page.get_by_role('link', name='Document review & Word output', exact=True).click()
    expect(page.get_by_role('region', name='Saved document preferences', exact=True)).to_be_visible()
    expect(page.get_by_role('region', name='Your profile')).to_have_count(0)
    page.go_back()
    expect(page.get_by_role('region', name='Your profile')).to_be_visible()
    first = api('/profile')
    assert first['version'] == 1 and first['applyToChats']
    assert sends == [], sends
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('region', name='Your profile')).to_contain_text('Example Legal')
    shot('profile-saved')
    print('PASS: optional, persistent profile setup; no model calls on save')

    page.goto(pending_url)
    expect(page.locator('.profile-attribution')).to_contain_text('Synthetic Avery')
    page.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(page.locator('.decision-signature')).to_contain_text('Synthetic Avery')
    assert not page.get_by_role('textbox', name='Reviewed by').count()
    print('PASS: library approval uses saved identity without name entry')

    page.get_by_role('button', name='New chat', exact=True).click()
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('What remains unresolved?')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    first_chat = page.url
    first_chat_id = first_chat.split('id=')[1]
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    turn = api('/conversations/' + first_chat_id)['turns'][0]
    assert turn['state']['profileContext'] == first
    review = page.get_by_role('region', name='Practice review', exact=True)
    expect(review.locator('.profile-attribution')).to_contain_text('Synthetic Avery')
    expect(review.get_by_role('textbox')).to_have_count(0)
    review.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(review.get_by_role('link', name='View recorded review')).to_be_visible()
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    panel = page.get_by_role('complementary', name='Response context', exact=True)
    panel.get_by_text('Profile context for this response · v1', exact=True).click()
    expect(panel.locator('.profile-details')).to_contain_text('Plain language; lead with the conclusion.')
    shot('profile-context')
    page.get_by_role('button', name='Close context', exact=True).click()
    print('PASS: chat approval uses the same identity; applied profile snapshot is inspectable')

    dialog = edit()
    dialog.get_by_label('Your name', exact=True).fill('Synthetic Avery Updated')
    dialog.get_by_label('Use my profile in chats', exact=True).uncheck()
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog).to_have_count(0)
    second = api('/profile')
    assert second['version'] == 2 and not second['applyToChats']
    page.goto(first_chat)
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    panel = page.get_by_role('complementary', name='Response context', exact=True)
    panel.get_by_text('Profile context for this response · v1', exact=True).click()
    expect(panel.locator('.profile-details')).not_to_contain_text('Synthetic Avery Updated')
    assert api('/conversations/' + first_chat_id)['turns'][0]['state']['profileContext'] == first
    page.get_by_role('button', name='New chat', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('A new question with profile sharing off.')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    off_turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    assert off_turn['state']['profileContext'] is None and off_turn['state']['profileStatus'] == 'disabled'
    page.goto(pending_url)
    expect(page.locator('.decision-signature')).to_contain_text('Synthetic Avery')
    expect(page.locator('.decision-signature')).not_to_contain_text('Updated')
    print('PASS: sharing off applies to new responses, not old snapshots or approval names')

    dialog = edit()
    dialog.get_by_label('Your name', exact=True).fill('Unsaved local change')
    # Another window updates the profile while this editor retains its draft.
    previous = api('/profile')
    remote = {k: v for k, v in previous.items() if k not in ['id', 'revisionId', 'version', 'updatedAt']}
    remote.update(name='Other window change', expectedRevisionId=previous['revisionId'])
    api('/profile', remote)
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('changed in another window')
    expect(dialog.get_by_label('Your name', exact=True)).to_have_value('Unsaved local change')
    assert api('/profile')['name'] == 'Other window change'
    page.once('dialog', lambda prompt: prompt.accept())
    dialog.get_by_role('button', name='Reload saved profile', exact=True).click()
    expect(dialog.get_by_label('Your name', exact=True)).to_have_value('Other window change')
    dialog.get_by_label('Your name', exact=True).fill('Saved after retry')
    page.route('**/api/workspace/profile', lambda route: route.fulfill(status=500, content_type='application/json', body='{"error":"Synthetic profile save failure"}') if route.request.method == 'POST' else route.continue_())
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('Synthetic profile save failure')
    expect(dialog.get_by_label('Your name', exact=True)).to_have_value('Saved after retry')
    page.unroute('**/api/workspace/profile')
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog).to_have_count(0)
    assert api('/profile')['name'] == 'Saved after retry'
    print('PASS: stale and failed saves preserve entered text and support explicit reload/retry')

    page.set_viewport_size({'width': 390, 'height': 844})
    dialog = edit()
    expect(dialog.get_by_label('Your name', exact=True)).to_be_focused()
    shot('profile-mobile')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    dialog.get_by_text('Working preferences (optional)', exact=True).click()
    dialog.get_by_label('Writing and communication', exact=True).fill('<img src="https://untrusted.invalid/profile" onerror="alert(1)">')
    dialog.get_by_role('button', name='Save profile', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.locator('.profile-details img')).to_have_count(0)
    voice_reader = page.locator('.profile-details > div').filter(has=page.get_by_text('Writing and communication', exact=True))
    page.get_by_role('region', name='Your profile', exact=True).get_by_role('button', name='Saved text', exact=True).click()
    expect(voice_reader).to_contain_text('<img src=')
    dialog = edit()
    dialog.get_by_label('Your name', exact=True).fill('Do not save this')
    page.once('dialog', lambda prompt: prompt.dismiss())
    page.keyboard.press('Escape')
    expect(dialog).to_be_visible()
    expect(dialog.get_by_label('Your name', exact=True)).to_have_value('Do not save this')
    page.once('dialog', lambda prompt: prompt.accept())
    page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)
    assert api('/profile')['name'] == 'Saved after retry'
    assert not errors, errors
    assert not external, external
    print('PASS: mobile layout/focus, safe text rendering, and unsaved-change confirmation')
    browser.close()
    print('Profile browser suite passed with synthetic data only.')
