"""Synthetic only: matter form assistance, shared layout and writing preferences."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, runs = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda req: runs.append(req) if req.method == 'POST' and req.url.endswith('/brief-drafting') else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', body=None):
        response = context.request.get(BASE + '/api/workspace' + path, headers=headers) if body is None else context.request.post(BASE + '/api/workspace' + path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    snapshot = api()
    matter = next(m for m in snapshot['matters'] if m['title'] == 'Internal investigation')
    before = api('/matters/' + matter['id'] + '/context')
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.goto(BASE + '/#/matters?id=' + matter['id'])
    page.get_by_role('button', name='Edit brief', exact=True).click()
    dialog = page.get_by_role('dialog', name='Edit matter brief', exact=True)
    toggle = dialog.get_by_role('button', name='Help me update this', exact=True)
    for width in [390, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        box, button = dialog.locator('.draft-assist').bounding_box(), toggle.bounding_box()
        assert abs((box['x'] + box['width'] / 2) - (button['x'] + button['width'] / 2)) < 2
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'brief-helper-collapsed-{width}.png'), full_page=True)
    toggle.click()
    expect(dialog.locator('.draft-assist')).to_contain_text('scripted-fixture')
    assert not runs
    original = dialog.get_by_label('Background and purpose', exact=True).input_value()
    dialog.get_by_label('What would you like to say?', exact=True).fill('Use the saved history to update the matter.')
    dialog.get_by_role('button', name='Draft into form', exact=True).click()
    expect(dialog.get_by_role('button', name='Save brief', exact=True)).to_be_disabled()
    expect(dialog.get_by_label('Background and purpose', exact=True)).to_have_value('Synthetic history: the interview remains outstanding.')
    expect(dialog).to_contain_text('Nothing has been saved.')
    receipt = dialog.locator('.draft-context-receipt')
    expect(receipt).to_contain_text('saved records included')
    receipt.locator('summary').first.click()
    expect(receipt).to_contain_text('Synthetic investigation note')
    assert api('/matters/' + matter['id'] + '/context')['brief'] == before['brief']
    dialog.get_by_role('button', name='Undo suggestion', exact=True).click()
    expect(dialog.get_by_label('Background and purpose', exact=True)).to_have_value(original)
    dialog.get_by_role('button', name='Draft into form', exact=True).click()
    expect(dialog.get_by_label('Next steps', exact=True)).to_have_value('Arrange the outstanding interview.')
    for width in [390, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'brief-helper-draft-{width}.png'), full_page=True)
    dialog.get_by_role('button', name='Save brief', exact=True).click()
    expect(dialog).to_have_count(0)
    assert api('/matters/' + matter['id'] + '/context')['brief']['summary'] == 'Synthetic history: the interview remains outstanding.'

    writing = '## Length and audience\n\nKeep **useful detail**.\n\n' + 'Full writing guidance. ' * 160 + 'END SENTINEL'
    api('/working-preferences', {'expectedRevisionId': None, 'writingInstructions': writing, 'signingInstructions': 'Ask about unknown agreement value.', 'ndaReview': 'Preserve acceptable wording.'})
    page.goto(BASE + '/#/knowledge?section=preferences&view=writing')
    reading = page.get_by_role('region', name='Saved writing and signing preferences', exact=True)
    expect(reading.get_by_role('heading', name='Length and audience', exact=True)).to_be_visible()
    expect(reading.locator('strong')).to_have_text('useful detail')
    expect(reading).to_contain_text('END SENTINEL')
    reading.get_by_role('button', name='Edit writing & signing', exact=True).click()
    editor = page.get_by_role('region', name='Working preferences editor', exact=True)
    expect(editor.get_by_label('Writing instructions', exact=True)).to_have_value(writing)
    editor.get_by_label('Writing instructions', exact=True).fill(writing + '\nPreserve this edit.')
    page.get_by_role('link', name='Document review & Word output', exact=True).click()
    expect(editor.get_by_label('NDA review instructions', exact=True)).to_have_value('Preserve acceptable wording.')
    page.get_by_role('link', name='Writing & signing', exact=True).click()
    expect(editor.get_by_label('Writing instructions', exact=True)).to_have_value(writing + '\nPreserve this edit.')
    editor.get_by_role('button', name='Save working preferences', exact=True).click()
    expect(editor).to_contain_text('Saved. New responses')
    assert api('/working-preferences')['ndaReview'] == 'Preserve acceptable wording.'
    assert api()['profile'] is None or not api()['profile']['applyToChats']
    assert not errors, errors
    browser.close()
    print('PASS: centered desktop/mobile helper; actual scoped record receipt; unsaved draft/undo/manual save; full writing reader and cross-view preservation; no live model calls')
