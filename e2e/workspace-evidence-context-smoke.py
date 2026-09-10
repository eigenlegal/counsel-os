"""Evidence-following explanation and pinned prepared passages; synthetic 7473 only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7473'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    print('Initial controls:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Aster employee monitoring', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('Can we approve the employee monitoring policy?')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=20000)
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        page.get_by_role('button', name='View context', exact=True).click()
        page.get_by_role('button', name='Latest response', exact=True).click()
        explanation = page.get_by_label('Automatic context preparation', exact=True)
        expect(explanation).to_contain_text('Followed saved evidence links for 1 additional passage.')
        expect(explanation).to_contain_text('Some supporting links could not be followed')
        expect(explanation).to_contain_text('not an exhaustive review')
        expect(page.locator('.context-record').filter(has_text='Supporting correspondence 17')).to_contain_text('Prepared')
        expect(page.locator('.context-panel-body')).not_to_contain_text('OUTSIDE-SCOPE-CANARY')
        explanation.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(artifacts / f'evidence-context-{width}.png'), full_page=True, animations='disabled')
        page.keyboard.press('Escape')
        page.reload()
        expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible()
    assert not errors, errors
    browser.close()
print('PASS: evidence-following, excluded-link explanation, exact prepared record, reload, desktop/mobile; no model calls')
