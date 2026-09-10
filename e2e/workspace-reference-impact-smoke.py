"""Recorded source → practice → advice → follow-up dependencies; synthetic --chat fixture."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', data=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if data is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    source = api('/sources', {'kind': 'authority', 'revision': {'title': 'Synthetic notice rule', 'body': 'Written notice is required.', 'provenance': {'origin': 'fixture:rule'}}})
    quote = {'target': {'kind': 'source', 'revisionId': source['latest']['id']}, 'start': 0, 'quote': source['latest']['body']}
    item = api('/knowledge', {'kind': 'position', 'revision': {'title': 'Synthetic notice position', 'body': 'Send written notice.', 'supportingEvidence': [quote]}})
    profile = api('/profile', {'expectedRevisionId': None, 'name': 'Synthetic Avery'})
    approved = api('/knowledge/' + item['id'] + '/review', {'expectedRevisionId': item['latest']['id'], 'expectedProfileRevisionId': profile['revisionId'], 'action': 'approve'})
    advice = api('/work', {'title': 'Advice relying on the position', 'request': 'How?', 'answer': 'Send written notice.', 'evidence': [{'target': {'kind': 'knowledge', 'revisionId': approved['active']['id']}, 'start': 0, 'quote': approved['active']['body']}]})
    follow = api('/work', {'title': 'Follow-up relying on the advice', 'request': 'What next?', 'answer': 'Follow the earlier advice.', 'evidence': [{'target': {'kind': 'work', 'workId': advice['id']}, 'start': 0, 'quote': advice['answer']}]})
    api('/sources/' + source['id'] + '/revisions', {'expectedRevisionId': source['latest']['id'], 'title': 'Synthetic notice rule', 'body': 'Written notice and a receipt are required.', 'origin': 'fixture:update'})
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/work?id=' + follow['id'])
    notice = page.get_by_role('complementary', name='Reference updates')
    expect(notice).to_contain_text('A supporting reference has a newer version')
    expect(notice).to_contain_text('through saved practice material')
    expect(notice).to_contain_text('cited v1; current v2')
    expect(page.locator('.reading-body')).to_contain_text('Follow the earlier advice.')
    page.goto(BASE + '/#/knowledge?id=' + item['id'])
    expect(notice).to_contain_text('Your practice item remains unchanged.')
    page.get_by_text('Supporting passages (1)', exact=True).click()
    expect(page.locator('.knowledge-support')).to_contain_text('Synthetic notice rule')
    expect(page.locator('.knowledge-support')).to_contain_text('Written notice is required.')
    expect(page.locator('.knowledge-support a')).to_have_attribute('href', '#/references?revision=' + source['latest']['id'])
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        notice.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'reference-impact-{width}.png'), animations='disabled')
    page.goto(BASE + '/#/references?id=' + source['id'])
    related = page.locator('.source-affected-work')
    expect(related.get_by_role('link', name=advice['title'], exact=True)).to_be_visible()
    expect(related.get_by_role('link', name=follow['title'], exact=True)).to_be_visible()
    assert api('/knowledge/' + item['id'])['active']['id'] == approved['active']['id']
    assert api('/work/' + advice['id'])['answer'] == advice['answer']
    assert not errors, errors
    browser.close()
    print('PASS: source → approved practice → advice → follow-up notices, pinned support, earlier-work links, mobile and unchanged approvals')
