"""Synthetic exact-version round comparison, disclosure, mobile and reopen. --chat fixture."""
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
fixtures = json.loads(subprocess.check_output(['bun', 'e2e/workspace-document-fixtures.ts']))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path, data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    sources = [api('/files', {'name': name, 'base64': body}) for name, body in fixtures.items() if name.startswith('Round ')]
    conversation = api('/conversations', {})
    import uuid
    started = api('/conversations/' + conversation['id'] + '/send', {'clientId': str(uuid.uuid4()), 'message': 'round comparison fixture: compare our sent and returned drafts against baseline.', 'attachments': [s['latest']['id'] for s in sources]})
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/home?id=' + conversation['id'])
    card = page.get_by_role('region', name='Document round comparison', exact=True)
    expect(card).to_contain_text('Document rounds compared', timeout=20000)
    card.get_by_text('Review the comparison', exact=True).click()
    expect(card).to_contain_text('Our text modified')
    expect(card).to_contain_text('Payment net 45.')
    expect(card).to_contain_text('Payment net 60.')
    expect(card).to_contain_text('Before our edits: Payment net 30.')
    card.get_by_text('What this comparison covers', exact=True).click()
    expect(card).to_contain_text('not agreement or approval')
    for source in sources:
        expect(card.get_by_role('link', name=source['latest']['title'], exact=True)).to_have_attribute('href', '#/references?revision=' + source['latest']['id'])
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        card.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'round-comparison-{width}.png'), animations='disabled')
    page.reload()
    card.get_by_text('Review the comparison', exact=True).click()
    expect(card).to_contain_text('Our text modified')
    turn = api('/conversations/' + conversation['id'])['turns'][0]
    assert turn['state']['documentRound']['summary']['modified'] == 1
    assert not turn['state']['proposalIds']
    for source in sources:
        assert api('/sources/' + source['id'])['latest']['id'] == source['latest']['id']
    assert not errors, errors
    browser.close()
    print('PASS: exact round roles, modification vs reversion, original links, limitations, mobile, reopen and unchanged practice')
