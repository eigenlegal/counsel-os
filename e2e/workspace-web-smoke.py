"""Public source fetch/read/cite UI with deterministic network and model fixtures."""
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path, data=None):
        response = page.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else page.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    conversation = api('/conversations', {'title': 'Synthetic public terms review'})
    api('/conversations/' + conversation['id'] + '/send', {
        'message': 'Public webpage fixture: review https://example.org/terms and its definitions.',
        'clientId': str(uuid.uuid4()), 'attachments': [],
    })
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/home?id=' + conversation['id'])
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    receipt = page.get_by_label('Retrieved webpages', exact=True)
    expect(receipt).to_contain_text('2 public pages retrieved · saved in Sources')
    receipt.locator(':scope > summary').click()
    expect(receipt).to_contain_text('not your document text or browser login')
    expect(receipt.get_by_role('link', name='Synthetic terms · version 1', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Source S1: Synthetic terms', exact=True)).to_be_visible()
    page.get_by_role('button', name='Source S1: Synthetic terms', exact=True).click()
    panel = page.get_by_role('complementary', name='Source passage', exact=True)
    expect(panel.locator('mark')).to_have_text('Synthetic cancellation requires thirty days of notice.')
    page.get_by_role('button', name='Close context', exact=True).click()
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        receipt.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'web-retrieval-{width}.png'), full_page=True)
    state = api('/conversations/' + conversation['id'])['turns'][0]['state']
    assert len(state['webLookups']) == 2 and len(state['citations']) == 2
    assert all(item['url'].startswith('https://example.org/') for item in state['webLookups'])
    assert all(item['status'] == 'complete' for item in state['activity'])
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(receipt).to_contain_text('2 public pages retrieved')
    # Follow the saved-copy link, not the external page, and inspect the retained original.
    page.set_viewport_size({'width': 1440, 'height': 1000})
    receipt.locator(':scope > summary').click()
    receipt.get_by_role('link', name='Synthetic terms · version 1', exact=True).click()
    expect(page.get_by_role('heading', name='Synthetic terms', exact=True)).to_be_visible()
    original = page.request.get(BASE + '/api/workspace/source-revisions/' + state['webLookups'][0]['revisionId'] + '/original', headers=headers)
    assert original.ok and b'Synthetic cancellation requires thirty days' in original.body()
    assert not errors, errors
    assert not external, external
    browser.close()
print('PASS: public terms plus linked definitions retrieved, read, cited, retained and visible after reload at 1440/390/320px; no live model or network calls')
