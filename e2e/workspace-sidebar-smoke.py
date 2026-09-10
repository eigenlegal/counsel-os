"""Sidebar navigation uses real activity, persistent optional pins, and accessible compact layouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, sends = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    def api(path, body=None):
        headers = {'Authorization':'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    titles = ['Northstar — Master services agreement and renewal', 'Harbor — Privacy program review', 'Summit — Mutual nondisclosure agreement']
    matters = [api('/matters', {'title':title}) for title in titles]
    chats = [api('/conversations', {'title':title, 'scope':'matter', 'matterId':matters[i%3]['id']}) for i, title in enumerate([
        'Where did we land on the renewal terms?', 'Review the revised mutual NDA', 'Prepare the sales supportability summary', 'What is still open before signing?', 'Update the privacy review', 'Summarize the outstanding interviews'])]
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    side = page.get_by_role('complementary', name='Workspace navigation', exact=True)
    expect(side.get_by_role('button', name='New chat', exact=True)).to_be_visible()
    expect(side.get_by_role('link', name='Saved outputs', exact=True)).to_be_visible()
    expect(side.get_by_role('link', name='Search workspace', exact=False)).to_be_visible()
    utilities = side.get_by_role('navigation', name='Workspace utilities', exact=True)
    def check_utilities():
        links = utilities.get_by_role('link')
        assert links.all_text_contents() == ['Import files', 'Settings', 'Trash']
        boxes = [link.bounding_box() for link in links.all()]
        assert all(abs(box['x']-boxes[0]['x']) < 1 and abs(box['width']-boxes[0]['width']) < 1
                   and abs(box['height']-boxes[0]['height']) < 1 for box in boxes)
        for previous, following in zip(boxes, boxes[1:]):
            assert following['y']-(previous['y']+previous['height']) >= 3
    check_utilities()
    utilities.get_by_role('link', name='Settings', exact=True).click()
    expect(utilities.get_by_role('link', name='Settings', exact=True)).to_have_attribute('aria-current', 'page')
    utilities.get_by_role('link', name='Import files', exact=True).hover()
    check_utilities()
    side.screenshot(path=str(OUT/'sidebar-utilities-hover-1440.png'), animations='disabled')
    utilities.get_by_role('link', name='Settings', exact=True).focus()
    page.keyboard.press('Tab')
    expect(utilities.get_by_role('link', name='Trash', exact=True)).to_be_focused()
    side.screenshot(path=str(OUT/'sidebar-utilities-focus-1440.png'), animations='disabled')
    recent = side.get_by_role('region', name='Recent matters', exact=True)
    expect(recent.get_by_role('link', name=titles[0], exact=True)).to_have_count(0)
    for matter in reversed(matters):
        page.goto(BASE+'/#/matters?id='+matter['id'])
        expect(page.get_by_role('heading', name=matter['title'], exact=True)).to_be_visible()
        expect(recent.get_by_role('link', name=matter['title'], exact=True)).to_be_visible()
    assert api('/navigation')['recentMatters'][0]['id'] == matters[0]['id']
    recent.get_by_role('button', name='Pin '+titles[0], exact=True).click()
    pinned = side.get_by_role('region', name='Pinned', exact=True)
    expect(pinned.get_by_role('link', name=titles[0], exact=True)).to_be_visible()
    expect(recent.get_by_role('link', name=titles[0], exact=True)).to_have_count(0)
    side.get_by_role('region', name='Recent chats', exact=True).get_by_role('button', name='Pin '+chats[0]['title'], exact=True).click()
    expect(pinned.get_by_role('link', name=chats[0]['title'], exact=True)).to_be_visible()
    # Persisting a section toggle disables pin buttons. The shared disabled-button
    # opacity must not reveal every normally hidden pin while that request runs.
    held = []
    def hold_navigation(route):
        if route.request.method == 'POST':
            held.append(route)
        else:
            route.continue_()
    page.route('**/api/workspace/navigation', hold_navigation)
    for section in ['Recent chats', 'Recent matters']:
        toggle = side.get_by_role('button', name=section, exact=True)
        for expanded in ['false', 'true']:
            toggle.click()
            expect(toggle).to_be_disabled()
            page.wait_for_function('document.querySelector(".sidebar-pin:disabled") !== null')
            hidden_pins = side.locator('.sidebar-recent-row:not(:hover):not(:focus-within) .sidebar-pin[aria-pressed="false"]')
            assert hidden_pins.count() > 0
            assert hidden_pins.evaluate_all('els => els.every(el => getComputedStyle(el).opacity === "0")'), hidden_pins.evaluate_all('els => els.map(el => getComputedStyle(el).opacity)')
            assert pinned.locator('.sidebar-pin').evaluate_all('els => els.every(el => getComputedStyle(el).opacity === "1")')
            assert len(held) == 1
            route = held.pop()
            route.fulfill(response=route.fetch())
            expect(toggle).to_be_enabled()
            expect(toggle).to_have_attribute('aria-expanded', expanded)
    page.unroute('**/api/workspace/navigation', hold_navigation)
    # Hidden-by-default pins still appear on row hover and keyboard focus.
    first_row = recent.locator('.sidebar-recent-row').first
    first_pin = first_row.get_by_role('button')
    first_row.get_by_role('link').hover()
    expect(first_pin).to_have_css('opacity', '1')
    page.mouse.move(900, 400)
    expect(first_pin).to_have_css('opacity', '0')
    first_row.get_by_role('link').focus()
    expect(first_pin).to_have_css('opacity', '1')
    page.keyboard.press('Tab')
    expect(first_pin).to_be_focused()
    page.keyboard.press('Enter')
    expect(pinned.get_by_role('button', name='Unpin '+titles[1], exact=True)).to_be_focused()
    page.keyboard.press('Enter')
    expect(recent.get_by_role('button', name='Pin '+titles[1], exact=True)).to_be_focused()
    side.get_by_role('button', name='Recent matters', exact=True).click()
    expect(side.get_by_role('button', name='Recent matters', exact=True)).to_have_attribute('aria-expanded','false')
    page.reload()
    expect(side.get_by_role('button', name='Recent matters', exact=True)).to_have_attribute('aria-expanded','false')
    expect(pinned.get_by_role('link', name=titles[0], exact=True)).to_be_visible()
    side.get_by_role('button', name='Recent matters', exact=True).click()
    side.get_by_role('button', name='New chat', exact=True).click()
    expect(page.get_by_role('textbox', name='Message Counsel', exact=True)).to_have_value('')
    expect(side.get_by_role('link', name='Chats', exact=True)).to_be_in_viewport()
    expect(side.get_by_role('link', name='Matters', exact=True)).to_be_in_viewport()
    page.screenshot(path=str(OUT/'sidebar-1440.png'), animations='disabled')
    # Another tab may rename/archive a pinned chat; shortcuts track its actual lifecycle.
    def manage(action, title=None):
        preview = api('/conversations/'+chats[0]['id']+'/impact')
        return api('/conversations/'+chats[0]['id']+'/manage', {'action':action, 'expectedVersion':preview['version'], **({'title':title} if title else {})})
    manage('rename', 'Renewal — decisions and next steps')
    expect(pinned.get_by_role('link', name='Renewal — decisions and next steps', exact=True)).to_be_visible(timeout=10000)
    manage('archive')
    expect(pinned.get_by_role('link', name='Renewal — decisions and next steps', exact=True)).to_have_count(0, timeout=10000)
    manage('restore')
    expect(pinned.get_by_role('link', name='Renewal — decisions and next steps', exact=True)).to_be_visible(timeout=10000)
    # Footer remains reachable even with overflowing recents, without horizontal scrolling.
    for width, height in [(1280,720), (390,844), (320,568)]:
        page.set_viewport_size({'width':width, 'height':height})
        if width <= 760:
            page.get_by_role('button', name='Open navigation', exact=True).click()
        trash = side.get_by_role('link', name='Trash', exact=True)
        if height <= 680:
            page.screenshot(path=str(OUT/f'sidebar-{width}-top.png'), animations='disabled')
            trash.scroll_into_view_if_needed()
        expect(trash).to_be_in_viewport()
        check_utilities()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        box = side.bounding_box()
        assert box['x'] >= 0 and box['x']+box['width'] <= width
        assert side.locator('.sidebar-scroll').evaluate('el => el.scrollWidth <= el.clientWidth')
        page.screenshot(path=str(OUT/f'sidebar-{width}.png'), animations='disabled')
        if width <= 760:
            storage = side.get_by_role('link', name='Files saved on this device', exact=True)
            storage.focus(); page.keyboard.press('Tab')
            expect(side.get_by_role('link', name='Counsel chats', exact=True)).to_be_focused()
            trash.click()
            expect(page.get_by_role('heading', name='Trash', exact=True)).to_be_visible()
            expect(page.locator('.app-sidebar')).to_have_attribute('aria-hidden','true')
        else:
            side.get_by_role('link', name='Saved outputs', exact=True).click()
            expect(side.get_by_role('link', name='Saved outputs', exact=True)).to_have_attribute('aria-current','page')
    assert not errors, errors
    assert not sends, sends
    browser.close()
print('Sidebar: stacked, separated utilities with aligned hit areas; recency, durable pins/collapse, no pin flashes, hover/keyboard, lifecycle, desktop/mobile, no model calls: passed')
