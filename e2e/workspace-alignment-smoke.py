"""Shared page alignment and intentional focused layouts. Synthetic fixtures only.

Run with workspace-server.ts on 7458 and --empty on 7459. No AI calls.
"""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
parser.add_argument('--artifacts', type=Path, default=Path(__file__).parent / '.tmp' / 'workspace' / 'alignment')
args = parser.parse_args()
args.artifacts.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:7458'
SETUP = 'http://127.0.0.1:7459'
TOKEN = 'workspace-browser-test-only'
HEADERS = {'Authorization': 'Bearer ' + TOKEN}


def near(actual, expected, label):
    assert abs(actual - expected) < 1, (label, actual, expected)


def bounds(locator):
    return locator.evaluate('''el => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right,
        contentLeft:r.x + parseFloat(s.paddingLeft), paddingLeft:parseFloat(s.paddingLeft)};
    }''')


with sync_playwright() as p:
    browser = getattr(p, args.browser).launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, sends, measurements = [], [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith((BASE + '/', SETUP + '/')) else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith(('/send', '/connection/test')) else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('textbox', name='Message Counsel OS', exact=True)).to_be_enabled()
    snapshot = page.request.get(BASE + '/api/workspace', headers=HEADERS).json()
    current = page.request.get(BASE + '/api/workspace/practice-document', headers=HEADERS).json()
    response = page.request.post(BASE + '/api/workspace/practice-document', headers=HEADERS, data={
        'body': '# About my practice\n\nI advise a small business on commercial matters.\n\n## How I like to work\n\nLead with the answer. Explain material changes in plain language. Keep the useful detail.\n\n## Writing\n\nUse short paragraphs and clear headings. Ask when important context is missing.',
        'useInChats': True, 'expectedBasis': current['basis']})
    assert response.ok
    for index in range(30):
        response = page.request.post(BASE + '/api/workspace/conversations', headers=HEADERS,
                                     data={'title': f'Synthetic layout conversation {index + 1}', 'scope': 'conversation'})
        assert response.ok
    routes = [('chat', 'home'), ('chats', 'home?view=history'), ('matters', 'matters'),
        ('practice-library', 'knowledge'), ('your-practice', 'knowledge?section=preferences'),
        ('sources', 'references'), ('saved-outputs', 'work'), ('settings', 'settings'),
        ('import', 'imports'), ('search', 'search'), ('trash', 'trash'),
        ('matter-detail', 'matters?id=' + snapshot['matters'][0]['id']),
        ('source-reader', 'references?id=' + snapshot['sources'][0]['id']),
        ('output-reader', 'work?id=' + snapshot['savedWork'][0]['id'])]

    def visit(route):
        page.goto(BASE + '/#/' + route)
        page.wait_for_load_state('networkidle')
        expect(page.locator('#workspace-content')).to_be_visible()
        page.evaluate('window.scrollTo(0, 0)')

    def capture(name, width):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name, width, 'overflow')
        expect(page).to_have_title(re.compile(r' — Counsel OS$'))
        expect(page.locator('.brand-name')).to_have_text('Counsel OS')
        if width > 760:
            wordmark, brand = bounds(page.locator('.brand-name')), bounds(page.locator('.brand'))
            assert wordmark['right'] <= brand['right'] + 1, (name, width, 'clipped product name')
        page.screenshot(path=str(args.artifacts / f'{args.browser}-{name}-{width}.png'), animations='disabled')

    for width, height in [(1440, 1000), (1920, 1080), (1024, 768), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for name, route in routes:
            visit(route)
            main = page.locator('#workspace-content')
            if name == 'chat':
                expect(page.get_by_role('textbox', name='Message Counsel OS', exact=True)).to_be_enabled()
                expect(main).to_have_class('workspace-frame workspace-frame-canvas app-content page-home')
                composer, canvas = bounds(page.locator('.composer-region')), bounds(main)
                near(composer['x'] + composer['width'] / 2, canvas['x'] + canvas['width'] / 2, 'centered composer')
                assert page.evaluate('document.documentElement.scrollHeight <= innerHeight + 1')
            else:
                assert 'workspace-frame-page' in main.get_attribute('class'), name
                if name == 'practice-library':
                    expect(page.get_by_text('Loading practice…', exact=True)).to_have_count(0)
                if name == 'chats':
                    expect(page.locator('.conversation-history-list > li')).to_have_count(30)
                if name == 'your-practice':
                    expect(page.get_by_role('heading', name='About my practice', exact=True)).to_be_visible()
                if name.endswith('reader'):
                    expect(page.locator('.reading-sheet')).to_be_visible()
                if name == 'matter-detail':
                    expect(page.locator('.matter-hub-layout')).to_be_visible()
                frame, topbar = bounds(main), bounds(page.locator('.topbar-frame'))
                near(frame['x'], topbar['x'], name + ': outer frame')
                near(frame['width'], topbar['width'], name + ': frame width')
                near(frame['contentLeft'], topbar['contentLeft'], name + ': breadcrumb gutter')
                banner = page.locator('.demo-banner-frame')
                if banner.count():
                    near(bounds(banner)['contentLeft'], frame['contentLeft'], name + ': banner gutter')
                for selector in ['.page-heading', '.reader-heading', '.collection-toolbar', '.settings-stack',
                                 '.practice-document', '.reader-layout', '.conversation-history', '.matter-hub-layout']:
                    item = main.locator(selector + ':visible').first
                    if item.count():
                        near(bounds(item)['x'], frame['contentLeft'], name + ': ' + selector)
                if name == 'your-practice':
                    assert bounds(page.locator('.practice-document'))['width'] <= 840
                    near(bounds(page.locator('.practice-document-heading'))['x'],
                         bounds(page.locator('.practice-document-toolbar'))['x'], 'practice internal alignment')
                if name == 'settings':
                    assert bounds(page.locator('.settings-stack'))['width'] <= 980
                if name.endswith('reader'):
                    sheet, aside = bounds(page.locator('.reading-sheet')), bounds(page.locator('.reader-aside'))
                    assert sheet['width'] <= 840
                    if width > 1000:
                        near(aside['x'] - sheet['right'], 24, 'nearby reader details')
                    else:
                        near(aside['x'], sheet['x'], 'stacked reader details')
                measurements.append({'page': name, 'viewport': width, 'frame': frame})
            capture(name, width)
            if name == 'chats':
                page.mouse.move(bounds(main)['contentLeft'] + 100, height / 2)
                page.mouse.wheel(0, 10000)
                expect(page.locator('.conversation-history-list > li').last).to_be_in_viewport()
                assert page.evaluate('window.scrollY > 0'), 'Chats list must use ordinary page scrolling'
                capture('chats-bottom', width)

        visit('matters')
        page.get_by_role('button', name='New matter', exact=True).click()
        dialog = page.get_by_role('dialog')
        expect(dialog.get_by_role('textbox').first).to_be_enabled()
        near(bounds(dialog.locator('.dialog-heading h2'))['x'],
             bounds(dialog.locator('.record-form'))['contentLeft'], 'dialog heading and form')
        capture('matter-editor', width)
        dialog.get_by_role('button', name='Close dialog', exact=True).click()

        # The same checkbox must stay at the editor's left edge at every width.
        visit('knowledge?section=preferences&view=edit')
        field = page.get_by_role('textbox', name='Practice document', exact=True)
        expect(field).to_be_enabled()
        near(bounds(page.locator('.practice-document-editor .checkbox-label'))['x'], bounds(field)['x'], 'editor checkbox')
        capture('practice-editor', width)

    # Initial onboarding owns an independently scrolling, centered pane.
    page.goto(SETUP + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    welcome = page.get_by_role('region', name='Set up your workspace', exact=True)
    expect(welcome).to_be_visible()
    welcome.get_by_role('button', name='Choose a connection', exact=True).click()
    for width, height in [(1440, 720), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        main = page.locator('#workspace-content')
        near(bounds(welcome)['x'] + bounds(welcome)['width'] / 2,
             bounds(main)['x'] + bounds(main)['width'] / 2, 'centered onboarding')
        assert main.evaluate("el => getComputedStyle(el).overflowY === 'auto'")
        box = bounds(main)
        page.mouse.move(box['x'] + box['width'] * .7, box['y'] + 100)
        page.mouse.wheel(0, 10000)
        expect(welcome.get_by_role('button', name='Explore without AI', exact=True)).to_be_in_viewport()
        capture('setup-bottom', width)
        main.evaluate('el => el.scrollTo(0, 0)')
    assert not errors and not external and not sends, (errors, external, sends)
    (args.artifacts / f'{args.browser}-measurements.json').write_text(json.dumps(measurements, indent=2))
    browser.close()
    print(f'PASS: {args.browser}, {len(routes)} screens at four widths, editor alignment, centered chat/setup and actual setup scrolling; no overflow, page errors, external requests or AI calls')
