"""Read-only reconnaissance of the new workspace, after building its UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright

artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:7458/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=str(artifacts / 'overview.png'), full_page=True)
    print(page.locator('main').inner_text())
    print('Buttons:', page.get_by_role('button').all_text_contents())
    print('Links:', page.get_by_role('link').all_text_contents())
    print('Browser errors:', errors)
    browser.close()
