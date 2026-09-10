"""AI intake option alignment and accessible toggling. Synthetic fixture; no imports or model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, reduced_motion='reduce')
    page = context.new_page()
    errors, mutations, external = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda request: mutations.append(request.url) if request.method != 'GET' else None)
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/imports')
    checkbox = page.get_by_role('checkbox', name='Let Counsel organize my files after upload', exact=True)
    expect(checkbox).to_be_checked()
    expect(checkbox).to_have_attribute('aria-describedby', 'import-ai-description')
    option = page.locator('.import-ai-option')
    label = option.locator('label > span')
    description = option.locator('p')
    expect(description).to_contain_text('Large imports can use substantial AI capacity.')
    for width, height in [(1440, 1100), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        option.scroll_into_view_if_needed()
        # Measure rendered geometry: a centered block, one shared text edge,
        # and an indented description below the last label line at every width.
        box, text_box, detail_box = option.bounding_box(), label.bounding_box(), description.bounding_box()
        drop = page.locator('.import-dropzone').bounding_box()
        check = checkbox.bounding_box()
        assert abs(box['x'] + box['width']/2 - drop['x'] - drop['width']/2) < 1
        assert box['width'] <= 530.5
        assert abs(text_box['x'] - detail_box['x']) < 1
        assert abs(text_box['x'] - check['x'] - check['width'] - 10) < 1
        assert 3 <= detail_box['y'] - text_box['y'] - text_box['height'] <= 5
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'import-alignment-{width}.png'))
    label.click()
    expect(checkbox).not_to_be_checked()
    checkbox.focus()
    page.keyboard.press('Space')
    expect(checkbox).to_be_checked()
    assert not mutations, mutations
    assert not external, external
    assert not errors, errors
    browser.close()

print('PASS: centered import option, shared label/description edge, desktop/mobile wrapping, label and keyboard toggle; no import or model calls')
