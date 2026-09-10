"""Publisher receipt, exact source, refresh history and mobile. --chat --authority-fixture."""
import uuid
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = 'http://127.0.0.1:7461'
STATUTE = '--statute' in sys.argv
LABEL = 'statute' if STATUTE else 'authority'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
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
    conversation = api('/conversations', {})
    turn = api('/conversations/' + conversation['id'] + '/send', {'clientId': str(uuid.uuid4()), 'message': 'authority lookup fixture'})
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/home?id=' + conversation['id'])
    receipt = page.locator('.authority-lookups')
    expect(receipt).to_contain_text('1 publisher lookup', timeout=20000)
    receipt.locator('summary').click()
    expect(receipt).to_contain_text('Only legal citations and dates')
    expect(receipt).to_contain_text('Laws in effect 2026-09-06; updated through Public Law 119-102 (2026-07-12)' if STATUTE else 'Text as of 2026-09-03')
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        receipt.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'{LABEL}-receipt-{width}.png'), animations='disabled')
    receipt.get_by_role('link', name=('15 USC 7001' if STATUTE else '31 CFR 1010.100') + ' · version 1').click()
    if STATUTE:
        expect(page.get_by_role('link', name='Open publisher’s latest U.S. Code text')).to_have_attribute('href', 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section7001&num=0&edition=prelim')
        expect(page.get_by_text('Publisher says laws in effect on', exact=True)).to_be_visible()
        expect(page.get_by_text('Updated through public law', exact=True)).to_be_visible()
    else:
        expect(page.get_by_role('link', name='Open dated eCFR text')).to_have_attribute('href', 'https://www.ecfr.gov/on/2026-09-03/title-31/section-1010.100')
    expect(page.get_by_text('Publisher version date', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Add document version')).to_have_count(0)
    page.get_by_role('button', name='Check publisher for updates').click()
    expect(page.get_by_text('A new publisher version was saved.', exact=False)).to_be_visible(timeout=10000)
    expect(page.get_by_text('Synthetic publisher text 2.', exact=False)).to_be_visible()
    page.screenshot(path=str(OUT / f'{LABEL}-source-390.png'), full_page=True, animations='disabled')
    page.reload()
    expect(page.get_by_text('Synthetic publisher text 2.', exact=False)).to_be_visible()
    assert not errors, errors
    browser.close()
print('Publisher lookup, dated reading, refresh version and mobile checks passed.')
