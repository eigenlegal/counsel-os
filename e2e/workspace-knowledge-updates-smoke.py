"""Inline proposal editing, approval boundaries and version history; no live model."""
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
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def api(path='', data=None):
        args = {'headers': {'Authorization': 'Bearer ' + TOKEN}}
        response = page.request.get(BASE + '/api/workspace' + path, **args) if data is None else page.request.post(BASE + '/api/workspace' + path, data=data, **args)
        assert response.ok, response.text()
        return response.json()
    api('/profile', {'name': 'Synthetic Lawyer', 'expectedRevisionId': None})
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('What remains unresolved?')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    chat_url = page.url
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    item_id = turn['state']['proposalIds'][0]
    original = api('/knowledge/' + item_id)
    card = page.get_by_role('region', name='Practice review')
    card.get_by_role('button', name='Edit proposal', exact=True).click()
    dialog = page.get_by_role('dialog')
    edited = 'Confirm the witness interview and retain the interview record. SYNTHETIC-EDIT'
    dialog.get_by_label('Proposed practice material', exact=True).fill(edited)
    dialog.get_by_role('button', name='Save for review', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(card.locator('.proposal-body')).to_have_text(edited)
    proposal = api('/knowledge/' + item_id)
    assert proposal['latest']['status'] == 'pending' and proposal['active'] is None
    assert api('/knowledge-revisions/' + original['latest']['id'])['body'] == original['latest']['body']
    card.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(card.get_by_role('link', name='View recorded review', exact=False)).to_be_visible()
    approved = api('/knowledge/' + item_id)
    assert approved['active']['body'] == edited
    assert approved['active']['approvedBy'] == 'Synthetic Lawyer'
    # Record reliance on this approved version, then replace the position.
    work = api('/work', {'title': 'Advice using the approved position', 'request': 'Use the position', 'answer': 'Retain the interview record.', 'evidence': [{'target': {'kind': 'knowledge', 'revisionId': approved['active']['id']}, 'quote': edited, 'start': 0}]})
    card.get_by_role('link', name='View recorded review', exact=False).click()
    page.get_by_role('button', name='Propose an update', exact=True).click()
    dialog = page.get_by_role('dialog')
    replacement = 'Retain the interview record and confirm disputed points with the witness.'
    dialog.get_by_label('Proposed practice material', exact=True).fill(replacement)
    dialog.get_by_role('button', name='Save for review', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_text('A different approved version is currently in use.')).to_be_visible()
    assert api('/knowledge/' + item_id)['active']['id'] == approved['active']['id']
    assert api('/work/' + work['id'] + '/reference-changes') == []
    page.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(page.get_by_role('button', name='Propose an update', exact=True)).to_be_visible()
    changes = api('/work/' + work['id'] + '/reference-changes')
    assert changes[0]['kind'] == 'knowledge'
    expect(page.get_by_role('heading', name='Version history')).to_be_visible()
    page.screenshot(path=str(artifacts / 'knowledge-history-desktop.png'), full_page=True)
    page.goto(BASE + '/#/work?id=' + work['id'])
    expect(page.get_by_role('complementary', name='Reference updates')).to_contain_text('cited v3; current v5')
    expect(page.locator('.reading-body')).to_contain_text('Retain the interview record.')
    page.goto(BASE + '/#/knowledge?id=' + item_id)
    # A second window's edit cannot be silently overwritten or approved from stale UI.
    latest = api('/knowledge/' + item_id)['latest']
    page.get_by_role('button', name='Propose an update', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_label('Proposed practice material', exact=True).fill('My unsaved knowledge edit.')
    api('/knowledge/' + item_id + '/revisions', {'expectedRevisionId': latest['id'], 'title': latest['title'], 'body': 'Another window made this proposal.'})
    dialog.get_by_role('button', name='Save for review', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('changed in another window')
    expect(dialog.get_by_label('Proposed practice material', exact=True)).to_have_value('My unsaved knowledge edit.')
    page.once('dialog', lambda prompt: prompt.accept())
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    page.reload()
    expect(page.locator('.reading-body')).to_contain_text('Another window made this proposal.')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'knowledge-history-mobile.png'), full_page=True)
    # The warning must open the approved replacement it names, not the later pending draft.
    page.goto(BASE + '/#/work?id=' + work['id'])
    notice = page.get_by_role('complementary', name='Reference updates')
    replacement_link = notice.get_by_role('link').first
    expect(replacement_link).to_have_attribute('href', '#/knowledge?id=' + item_id + '&revision=' + changes[0]['currentRevisionId'])
    replacement_link.click()
    expect(page.locator('.reading-body')).to_contain_text(replacement)
    expect(page.locator('.reading-body')).not_to_contain_text('Another window made this proposal.')
    assert not errors, errors
    browser.close()
    print('PASS: inline knowledge edits, separate approval, retained active policy, historical versions/names, updated-reference warning, stale-edit protection and mobile layout')
