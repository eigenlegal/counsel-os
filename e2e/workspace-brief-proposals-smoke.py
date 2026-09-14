"""Chat-generated matter suggestions: review/apply, competing changes, dismissal."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7472'
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
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('Plan the witness interview.')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_role('region', name='Suggested matter update')).to_be_visible(timeout=15000)
    chat_url = page.url
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    proposal = turn['state']['briefProposal']
    matter_id = proposal['matterId']
    assert api('/matters/' + matter_id + '/brief') is None
    card = page.get_by_role('region', name='Suggested matter update')
    card.get_by_role('button', name='Review matter update', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_text('Current brief', exact=True)).to_be_visible()
    expect(dialog.get_by_text('Suggested update', exact=True)).to_be_visible()
    expect(dialog.get_by_role('button', name='Apply matter update', exact=True)).to_be_enabled()
    dialog.screenshot(path=str(artifacts / 'brief-comparison-desktop.png'))
    dialog.get_by_role('button', name='Apply matter update', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(card.get_by_text('Matter brief updated', exact=True)).to_be_visible()
    brief = api('/matters/' + matter_id + '/brief')
    assert brief['summary'] == proposal['summary'] and brief['number'] == 1
    assert api('/turns/' + turn['id'] + '/brief-review', {'proposalId': proposal['id'], 'action': 'apply'})['state']['briefProposal']['appliedRevisionId'] == brief['id']
    card.get_by_role('link', name='Open matter', exact=True).click()
    expect(page.get_by_text(proposal['summary'], exact=True)).to_be_visible()
    page.goto(chat_url)
    expect(page.get_by_role('region', name='Suggested matter update').get_by_text('Matter brief updated', exact=True)).to_be_visible()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('Compare the timing records next.')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_role('region', name='Suggested matter update')).to_have_count(2, timeout=15000)
    second_card = page.get_by_role('region', name='Suggested matter update').last
    second_card.get_by_role('button', name='Review matter update', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('button', name='Apply matter update', exact=True)).to_be_enabled()
    # A competing change after comparison was opened must be caught at commit.
    api('/matters/' + matter_id + '/brief', {'expectedRevisionId': brief['id'], 'status': 'on-hold', 'summary': 'A later manual update must survive.', 'questions': 'Await confirmation.', 'nextActions': 'Wait for the new record.'})
    dialog.get_by_role('button', name='Apply matter update', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('changed')
    dialog.get_by_role('button', name='Try again', exact=True).click()
    expect(dialog.get_by_text('This matter brief changed after the suggestion was prepared.', exact=False)).to_be_visible()
    expect(dialog.get_by_role('button', name='Apply matter update', exact=True)).to_be_disabled()
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    dialog.screenshot(path=str(artifacts / 'brief-comparison-mobile.png'))
    dialog.get_by_role('button', name='Keep current brief', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(second_card.get_by_text('Current brief kept', exact=True)).to_be_visible()
    assert api('/matters/' + matter_id + '/brief')['summary'] == 'A later manual update must survive.'
    assert not errors, errors
    browser.close()
    print('PASS: chat-generated matter proposal, before/after review, explicit apply, exact retry, reload, stale commit refusal, mobile comparison and dismissal')
