"""Synthetic imported Markdown only. No real workspace, models, or external requests."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
BODY = '''Imported from plugin:practice/standards/notice.md. Pending review; no approval inferred.

---
content-version: synthetic
---
# Notice provisions

## Preferred position

Use **written notices**. Keep the delivery record with the matter.

| Situation | Starting point |
| --- | --- |
| Routine notices | Written notice to the designated contact |
| A disputed deadline | Confirm timing and preserve evidence |

### Before relying on it

- Check the agreed notice address.
- Confirm receipt requirements.
- Keep unresolved facts visible.

> Synthetic example—not a statement of law.
'''
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    response = context.request.post(BASE + '/api/workspace/knowledge', headers=headers,
        data={'revision': {'title': 'Synthetic notice guide', 'body': BODY, 'status': 'pending'}, 'kind': 'position', 'matterId': None})
    assert response.ok, response.text()
    record = response.json()
    page.goto(BASE + '/#/knowledge?id=' + record['id'])
    page.wait_for_load_state('networkidle')
    print('Reader controls:', page.locator('main button').all_text_contents())
    expect(page.get_by_role('heading', name='Preferred position')).to_be_visible()
    expect(page.locator('.document-markdown table')).to_be_visible()
    expect(page.locator('.reader-metadata pre').first).not_to_be_visible()
    expect(page.get_by_text('Version history', exact=True)).to_be_visible()
    expect(page.get_by_role('alert')).to_have_count(0)
    page.screenshot(path=str(OUT / 'reader-markdown-1440.png'), full_page=True)
    page.get_by_role('button', name='Saved text', exact=True).click()
    assert page.locator('.document-reader .record-prose').text_content() == BODY
    page.get_by_role('button', name='Reading view', exact=True).click()
    for width in [390, 1440]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if width == 390:
            page.screenshot(path=str(OUT / 'reader-markdown-390.png'), full_page=True)
    page.goto(BASE + '/#/knowledge')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Practice', exact=True)).to_be_visible()
    page.get_by_label('Practice category').select_option('position')
    expect(page.get_by_role('link', name='Synthetic notice guide', exact=False)).to_be_visible()
    page.get_by_role('button', name='Profile & preferences', exact=True).click()
    page.get_by_role('button', name='Set up profile', exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.get_by_role('button', name='Close dialog').click()
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / ('practice-' + str(width) + '.png')), full_page=True)
    saved = context.request.get(BASE + '/api/workspace/knowledge/' + record['id'], headers=headers).json()
    assert saved['latest']['body'] == BODY
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: formatted reader, exact saved text, metadata, history, practice navigation, profile entry, responsive layout; no external requests')
