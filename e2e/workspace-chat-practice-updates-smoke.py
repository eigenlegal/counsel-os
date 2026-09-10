"""Chat revises an existing imported practice item; stale proposals cannot approve newer edits."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7473'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    api('/profile', {'name': 'Synthetic Lawyer', 'expectedRevisionId': None})
    before = api()['totals']['knowledge']
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('practice update fixture: going forward, change our employee monitoring standard to 12 days, keeping the purpose and restricted-access requirements.')
    page.get_by_role('button', name='Send message', exact=True).click()
    card = page.get_by_role('region', name='Practice review', exact=True)
    expect(card).to_contain_text('Update your practice material?', timeout=20000)
    expect(card).to_contain_text('existing baseline remains in use')
    expect(card.locator('.proposal-body')).to_contain_text('12 days')
    assert api()['totals']['knowledge'] == before
    turn = api('/conversations/' + page.url.split('id=')[1])['turns'][0]
    item_id = turn['state']['proposalIds'][0]
    item = api('/knowledge/' + item_id)
    assert item['latest']['id'] == turn['state']['proposalRevisions'][item_id]
    assert item['latest']['number'] == 2 and item['latest']['status'] == 'pending' and item['active'] is None
    page.screenshot(path=str(OUT / 'chat-practice-update-1440.png'), full_page=True, animations='disabled')
    # A separate window changes this pending version. The old chat must remain pinned to its own proposal.
    api('/knowledge/' + item_id + '/revisions', {'expectedRevisionId': item['latest']['id'], 'title': item['latest']['title'], 'body': 'Later edit: retain records for 10 days. Record the purpose and restrict access.'})
    page.reload()
    expect(card).to_contain_text('Earlier version')
    expect(card.locator('.proposal-body')).to_contain_text('12 days')
    expect(card.locator('.proposal-body')).not_to_contain_text('10 days')
    expect(card.get_by_role('button', name='Approve for practice', exact=True)).to_have_count(0)
    expect(card.get_by_role('button', name='Edit proposal', exact=True)).to_have_count(0)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT / 'chat-practice-update-390.png'), full_page=True, animations='disabled')
    card.get_by_role('link', name='View version history', exact=False).click()
    expect(page.locator('.reading-body')).to_contain_text('10 days')
    expect(page.get_by_role('heading', name='Version history')).to_be_visible()
    assert not errors and not external, (errors, external)
    browser.close()
    print('PASS: chat updates one existing item, unchanged baseline, pinned proposal, no stale approval, version history and mobile')
