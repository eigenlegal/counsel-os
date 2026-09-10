"""Exact citation location and honest retry display; disposable --chat fixture only."""
import base64
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path, data=None):
        headers = {'Authorization': 'Bearer workspace-browser-test-only'}
        res = context.request.get(BASE+'/api/workspace'+path, headers=headers) if data is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=data)
        assert res.ok, res.text()
        return res.json()
    text = '🧭 Preface. Exact quote. Repeat. In the middle. Repeat. Closing.'
    file = api('/files', {'name': 'citation-fixture.md', 'base64': base64.b64encode(text.encode()).decode(), 'matterId': None})
    chat = api('/conversations', {'title': 'Synthetic citation recovery'})
    api('/conversations/'+chat['id']+'/send', {'message': 'Citation recovery fixture', 'clientId': str(uuid.uuid4()), 'attachments': [file['latest']['id']]})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/home?id='+chat['id'])
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    trail = page.locator('.chat-activity')
    trail.locator(':scope > summary').click()
    recovered = trail.locator('.citation-recovered')
    expect(recovered).to_have_count(1)
    expect(recovered.locator(':scope > summary')).to_contain_text('2 retries recovered')
    assert recovered.get_attribute('open') is None
    # Only the unresolved altered quote retains a top-level failed indicator.
    expect(trail.locator(':scope > ol > li > details > summary > .activity-indicator.failed')).to_have_count(1)
    page.screenshot(path=str(OUT/'citation-recovery-1440.png'), full_page=True)
    recovered.locator(':scope > summary').focus()
    page.keyboard.press('Enter')
    expect(recovered.locator('.citation-retries > li')).to_have_count(3)
    recovered.locator('.citation-retries > li').first.locator('summary').click()
    expect(recovered.get_by_text('Quote appears more than once', exact=False).first).to_be_visible()
    for width, height in [(390,844), (320,568)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        recovered.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'citation-recovery-{width}.png'), full_page=True)
    saved = api('/conversations/'+chat['id'])['turns'][0]['state']
    assert len(saved['citations']) == 2
    checks = [a for a in saved['activity'] if a['name'] == 'counsel_cite_passage']
    assert len([a for a in checks if a['status'] == 'failed']) == 3
    assert saved['citations'][0]['start'] == len(text[:text.index('Exact quote.')].encode('utf-16-le'))//2
    page.reload()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible()
    assert api('/conversations/'+chat['id'])['turns'][0]['state'] == saved
    page.locator('.chat-activity > summary').click()
    expect(page.get_by_text('2 retries recovered', exact=True)).to_be_visible()
    assert not errors, errors
    assert not external, external
    browser.close()
print('PASS: computed citation offsets, strict ambiguity/altered-text checks, recovered retries, retained failures, keyboard, mobile and unchanged saved history; no live model calls')
