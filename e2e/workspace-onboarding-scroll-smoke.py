"""Real scrolling through first-run AI setup. Synthetic workspace; no model calls."""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

config = json.loads(Path(sys.argv[1]).read_text())
parts = urlsplit(config['url'])
base = f'{parts.scheme}://{parts.netloc}'
root = Path(config['root'])

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, model_calls = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(base + '/') else None)
    context.on('request', lambda r: model_calls.append(r.url) if r.url.endswith(('/send', '/connection/test')) else None)
    page.goto(config['url'])
    page.wait_for_load_state('networkidle')
    welcome = page.get_by_role('region', name='Set up your workspace', exact=True)
    expect(welcome).to_be_visible()
    sidebar = page.get_by_role('complementary', name='Workspace navigation', exact=True)
    expect(sidebar.get_by_role('link', name='Counsel OS chats', exact=True)).to_have_attribute('href', '#/home?view=history')
    expect(sidebar.get_by_role('link', name='Chats', exact=True)).to_have_attribute('href', '#/home?view=history')
    expect(sidebar.get_by_role('link', name='Finish setup', exact=True)).to_have_attribute('aria-current', 'page')
    expect(sidebar.locator('.nav-link[aria-current="page"]')).to_have_count(0)
    welcome.get_by_role('button', name='Choose a connection', exact=True).click()
    connection = welcome.get_by_label('AI connection', exact=True)
    main = page.locator('#workspace-content')

    def scroll_to_bottom():
        # Wheel over the actual content, not scrollIntoView (which can also
        # move clipped overflow:hidden containers and mask this regression).
        box = main.bounding_box()
        page.mouse.move(box['x'] + box['width'] * .7, min(box['y'] + 100, page.viewport_size['height'] - 20))
        page.mouse.wheel(0, 10000)
        page.wait_for_function("""() => {
            const m = document.querySelector('#workspace-content');
            return m.scrollTop > 0 && m.scrollTop + m.clientHeight >= m.scrollHeight - 2;
        }""")

    for width, height in [(1280, 720), (1440, 1000), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for provider in ['codex', 'claude-code', 'openai-api', 'anthropic-api']:
            main.evaluate('el => el.scrollTo(0, 0)')
            connection.select_option(provider)
            if provider in ['codex', 'claude-code']:
                welcome.get_by_text('Commands and troubleshooting', exact=True).click()
            assert main.evaluate("el => getComputedStyle(el).overflowY === 'auto'")
            scroll_to_bottom()
            expect(welcome.get_by_role('button', name='Explore without AI', exact=True)).to_be_in_viewport()
            save = welcome.get_by_role('button', name='Save connection', exact=True)
            box = save.bounding_box()
            page.mouse.wheel(0, box['y'] - height / 2)
            expect(save).to_be_in_viewport()
            save.focus()
            page.keyboard.press('Shift+Tab')
            page.keyboard.press('Tab')
            expect(save).to_be_focused()
            expect(save).to_be_in_viewport()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        scroll_to_bottom()
        page.screenshot(path=str(root / f'onboarding-scroll-{width}.png'), animations='disabled')

    # Returning from Settings uses ordinary document scrolling, not the fixed
    # chat layout. Both routes must reach the end of an expanded setup form.
    page.set_viewport_size({'width': 1280, 'height': 720})
    page.goto(base + '/#/settings?view=setup')
    expect(welcome).to_be_visible()
    if welcome.get_by_role('button', name='Choose a connection', exact=True).count():
        welcome.get_by_role('button', name='Choose a connection', exact=True).click()
    page.mouse.move(900, 400)
    page.mouse.wheel(0, 10000)
    expect(welcome.get_by_role('button', name='Explore without AI', exact=True)).to_be_in_viewport()
    welcome.get_by_role('button', name='Explore without AI', exact=True).click()
    field = page.get_by_role('textbox', name='Message Counsel OS', exact=True)
    expect(field).to_be_in_viewport()
    assert main.evaluate("el => getComputedStyle(el).overflowY !== 'auto'")
    assert page.evaluate('document.documentElement.scrollHeight <= innerHeight + 1')
    sidebar.get_by_role('link', name='Chats', exact=True).click()
    expect(page.get_by_role('region', name='Conversation history', exact=True)).to_be_visible()
    expect(sidebar.get_by_role('link', name='Finish setup', exact=True)).to_have_count(0)
    # Completion is durable, including old setup bookmarks and a full reload.
    page.goto(base + '/#/settings?view=setup')
    page.reload()
    expect(page.get_by_role('heading', name='Workspace settings', exact=True)).to_be_visible()
    expect(welcome).to_have_count(0)
    expect(page.get_by_role('link', name='Finish setup', exact=True)).to_have_count(0)
    expect(page.get_by_role('heading', name='Getting started', exact=True)).to_have_count(0)
    expect(page.get_by_role('link', name='Open practice preferences', exact=True)).to_be_visible()
    expect(page.get_by_role('link', name='Import files & folders', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Your AI connection', exact=True)).to_be_visible()
    page.goto(base + '/#/home')
    expect(field).to_be_in_viewport()
    expect(welcome).to_have_count(0)
    sidebar.get_by_role('link', name='Counsel OS chats', exact=True).click()
    expect(page.get_by_role('region', name='Conversation history', exact=True)).to_be_visible()
    assert not errors and not external and not model_calls, (errors, external, model_calls)
    browser.close()

print('PASS: onboarding scrolling, all AI choices, desktop/mobile, durable completion removes setup links and old setup route, regular settings remain accessible; no model calls')
