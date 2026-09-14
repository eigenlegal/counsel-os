"""Autosave must not move the writing area. Isolated SQLite fixture; no AI sends."""
from pathlib import Path
import time
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
TOKEN = 'workspace-browser-test-only'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors, sends, held = [], [], []
    mode = {'save': 'normal'}
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: sends.append(request.url) if request.url.endswith('/send') else None)

    def draft_request(route):
        if route.request.method != 'POST' or mode['save'] == 'normal':
            route.continue_()
        elif mode['save'] == 'hold':
            held.append(route)
        else:
            route.fulfill(status=503, json={'error': 'Synthetic draft save unavailable.'})

    page.route('**/api/workspace/drafts', draft_request)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    field = page.get_by_role('textbox', name='Message Counsel OS', exact=True)
    expect(field).to_be_enabled()

    def geometry():
        return page.evaluate("""() => Object.fromEntries(
          ['.chat-composer', '.chat-composer textarea', '.composer-controls', '.composer-footnote'].map(selector => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return [selector, {x:rect.x, y:rect.y, width:rect.width, height:rect.height}];
          }))""")

    def unchanged(before, phase):
        after = geometry()
        for selector, rect in before.items():
            for dimension, value in rect.items():
                assert abs(after[selector][dimension] - value) < 0.6, (phase, selector, dimension, before, after)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), phase

    for width, height, attached in [(1440, 1000, False), (390, 844, False), (320, 740, False),
                                    (1440, 1000, True), (390, 844, True), (320, 740, True)]:
        page.set_viewport_size({'width': width, 'height': height})
        if attached and width == 1440:
            page.get_by_role('button', name='Add documents', exact=True).click()
            page.get_by_label('Upload document', exact=True).set_input_files({
                'name': 'Synthetic agreement.txt', 'mimeType': 'text/plain',
                'buffer': b'Synthetic agreement for a composer layout test only.',
            })
            expect(page.get_by_role('dialog')).to_have_count(0)
            expect(page.get_by_role('button', name='Remove Synthetic agreement.txt', exact=True)).to_be_visible()
        field.fill('Review this')
        assert page.evaluate('window.counselSaveDrafts()')
        expect(page.get_by_text('Saving draft…', exact=True)).to_have_count(0)
        page.wait_for_timeout(100)  # Finish the textarea's ResizeObserver after viewport changes.
        before = geometry()
        mode['save'] = 'hold'
        field.fill('Review this NDA')
        expect(page.get_by_text('Saving draft…', exact=True)).to_be_visible()
        unchanged(before, f'{width}: debounce')
        deadline = time.monotonic() + 3
        while not held and time.monotonic() < deadline:
            page.wait_for_timeout(20)
        assert held, 'Expected a held autosave request'
        unchanged(before, f'{width}: saving')
        page.screenshot(path=str(artifacts / f'composer-saving-{width}{"-attached" if attached else ""}.png'), full_page=True)
        mode['save'] = 'normal'
        for route in held:
            route.continue_()
        held.clear()
        expect(page.get_by_text('Saving draft…', exact=True)).to_have_count(0)
        unchanged(before, f'{width}: saved')
        field.fill('Review this')
        assert page.evaluate('window.counselSaveDrafts()')
        unchanged(before, f'{width}: repeated save')

    # Genuine failures stay visible, with working recovery controls and text intact.
    mode['save'] = 'fail'
    field.fill('Keep this unsaved text')
    expect(page.get_by_role('alert')).to_contain_text('Synthetic draft save unavailable.')
    expect(field).to_have_value('Keep this unsaved text')
    expect(page.get_by_role('button', name='Retry draft save', exact=True)).to_be_visible()
    mode['save'] = 'normal'
    page.get_by_role('button', name='Retry draft save', exact=True).click()
    expect(page.get_by_role('alert')).to_have_count(0)
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(field).to_have_value('Keep this unsaved text')
    assert not errors, errors
    assert not sends, sends
    browser.close()

print('PASS: no composer movement while autosave starts/completes/repeats at 1440/390/320px, with and without attachments; failed saves remain visible and recoverable; reload preserves text; no model sends')
