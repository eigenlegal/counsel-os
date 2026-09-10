"""Computed-style regressions + visual checks; only synthetic fixture data.

Run with workspace-server.ts on 7458. No model calls or saved connections.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)


def contrast(fg, bg):
    def luminance(rgb):
        channels = [int(n) / 255 for n in re.findall(r'\d+', rgb)[:3]]
        linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
        return sum(c * w for c, w in zip(linear, [.2126, .7152, .0722]))
    a, b = luminance(fg), luminance(bg)
    return (max(a, b) + .05) / (min(a, b) + .05)


def readable(locator, pseudo=None):
    state = locator.evaluate('''(el, pseudo) => {
        const s = getComputedStyle(el, pseudo);
        return {color: s.color, background: s.backgroundColor, opacity: s.opacity};
    }''', pseudo)
    assert state['background'] != 'rgba(0, 0, 0, 0)', state
    assert state['opacity'] == '1', state
    assert contrast(state['color'], state['background']) >= 4.5, state
    return state


def select_geometry(select):
    expect(select).to_be_visible()
    state = select.evaluate('''el => {
        const s = getComputedStyle(el);
        return {appearance: s.appearance, end: s.paddingInlineEnd, image: s.backgroundImage,
            position: s.backgroundPosition, size: s.backgroundSize};
    }''')
    assert state['appearance'] == 'none', state
    assert state['end'] == '34px', state
    assert 'linear-gradient' in state['image'], state
    assert '14px' in state['position'] and '19px' in state['position'], state
    assert '5px 5px' in state['size'], state

def matter_geometry(picker):
    expect(picker).to_have_attribute('aria-haspopup', 'dialog')
    state = picker.evaluate('''el => {const s = getComputedStyle(el); const icon = el.querySelector('svg').getBoundingClientRect(); const box = el.getBoundingClientRect(); return {size: icon.width, inset: box.right-icon.right, gap: parseFloat(s.gap)};}''')
    assert state['size'] == 12 and state['inset'] >= 14 and state['gap'] >= 12, state


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)

    def go(route):
        page.goto(BASE + '/' + route)
        page.wait_for_load_state('networkidle')

    def shot(name):
        page.screenshot(path=str(artifacts / (name + '.png')), full_page=True, animations='disabled')

    go('#token=workspace-browser-test-only')
    # Reconnaissance: inspect actual rendered controls before exercising them.
    print('Initial controls:', page.locator('select, button').all_text_contents())
    matter_geometry(page.get_by_label('Conversation context', exact=True))
    go('#/settings')
    connection = page.get_by_label('AI connection', exact=True)
    select_geometry(connection)
    connection.select_option('claude-code')
    select_geometry(page.get_by_label('Claude Code billing', exact=True))
    save = page.get_by_role('button', name='Save connection', exact=True)
    normal = readable(save)
    save.hover()
    hovered = readable(save)
    assert normal['background'] != hovered['background']
    shot('controls-settings-hover')
    save.focus()
    expect(save).to_be_focused()
    assert save.evaluate("el => getComputedStyle(el).outlineStyle") != 'none'
    box = save.bounding_box()
    page.mouse.move(box['x'] + 10, box['y'] + 10)
    page.mouse.down()
    readable(save)
    # Release outside the button; never save a connection in this style test.
    page.mouse.move(5, 5)
    page.mouse.up()
    readable(page.get_by_role('button', name='Check local sign-in', exact=True))
    page.get_by_role('button', name='Check local sign-in', exact=True).hover()
    readable(page.get_by_role('button', name='Check local sign-in', exact=True))
    print('PASS: settings dropdowns; primary/secondary hover, active and visible focus')

    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        for route in ['matters', 'work', 'knowledge', 'references']:
            go('#/' + route)
            field = page.get_by_role('textbox', name='Filter ' + {'work': 'saved outputs', 'knowledge': 'practice', 'references': 'sources'}.get(route, route), exact=True)
            shell = page.locator('.filter-input')
            assert shell.evaluate("el => getComputedStyle(el).flexDirection") == 'row'
            assert field.evaluate("el => getComputedStyle(el).borderTopWidth") == '0px'
            assert field.evaluate("el => getComputedStyle(el).padding") == '0px'
            icon = shell.locator('svg').bounding_box()
            box = field.bounding_box()
            assert icon['x'] + icon['width'] < box['x']
            assert abs(icon['y'] + icon['height'] / 2 - box['y'] - box['height'] / 2) < 2
            assert shell.bounding_box()['height'] <= 44
            field.fill('no-such-synthetic-record')
            expect(page.get_by_role('heading', name='No matches in this view')).to_be_visible()
            page.get_by_role('button', name='Clear filters', exact=True).click()
            expect(field).to_have_value('')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            if route == 'matters':
                shot('controls-filter-' + str(width))
        go('#/home')
        matter_geometry(page.get_by_label('Conversation context', exact=True))
        page.get_by_role('button', name='Add documents', exact=True).click()
        file = page.get_by_label('Upload document', exact=True)
        state = readable(file, '::file-selector-button')
        assert file.evaluate("el => getComputedStyle(el, '::file-selector-button').borderRadius") == '6px'
        assert file.evaluate("el => getComputedStyle(el).borderTopWidth") == '0px'
        file.focus()
        page.keyboard.press('Tab')
        page.keyboard.press('Shift+Tab')
        expect(file).to_be_focused()
        assert file.evaluate("el => getComputedStyle(el).outlineStyle") != 'none'
        box = file.bounding_box()
        page.mouse.move(box['x'] + 30, box['y'] + box['height'] / 2)
        readable(file, '::file-selector-button')
        shot('controls-file-picker-' + str(width))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # The styled native button still invokes the operating-system picker.
        with page.expect_file_chooser() as choice:
            page.mouse.click(box['x'] + 30, box['y'] + box['height'] / 2)
        choice.value.set_files({'name': f'Control check {width}.txt', 'mimeType': 'text/plain',
                                'buffer': b'Synthetic upload; no model call.'})
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.locator('.document-chip').filter(has_text=f'Control check {width}.txt')).to_be_visible()
    print('PASS: compact functional filters across all libraries; designed file picker on desktop/mobile')

    go('#/search')
    for select in page.get_by_role('combobox').all():
        select_geometry(select)
    disabled = page.get_by_role('button', name='Search', exact=True)
    expect(disabled).to_be_disabled()
    readable(disabled)
    disabled.hover(force=True)
    readable(disabled)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    for route, action in [('matters', 'New matter'), ('work', 'Add a note or decision'),
                          ('knowledge', 'Add to practice'), ('references', 'Add a source')]:
        go('#/' + route)
        button = page.get_by_role('button', name=action, exact=True).first
        button.hover()
        readable(button)
        button.click()
        dialog = page.get_by_role('dialog')
        for select in dialog.get_by_role('combobox').all():
            select_geometry(select)
        expect(dialog.get_by_role('textbox', name='Title', exact=True)).to_be_focused()
        assert dialog.get_by_role('textbox', name='Title', exact=True).evaluate(
            "el => getComputedStyle(el).borderTopWidth") == '1px'
        dialog.get_by_role('button', name='Cancel', exact=True).click()
    print('PASS: editor/citation/search dropdowns, normal form borders and disabled-button contrast')

    # A new bare native dropdown must work without any component-specific class.
    go('#/settings')
    page.evaluate('''() => {
        const root = document.createElement('section'); root.id = 'future-controls';
        root.innerHTML = '<label>Future select<select><option>Long future option</option></select></label>' +
            '<label dir="rtl">RTL<select size="1"><option>اختيار</option></select></label>' +
            '<label>Listbox<select multiple><option>One</option><option>Two</option></select></label>';
        document.querySelector('main').append(root);
    }''')
    future = page.locator('#future-controls select')
    select_geometry(future.nth(0))
    select_geometry(future.nth(1))
    assert future.nth(1).evaluate("el => getComputedStyle(el).direction") == 'rtl'
    assert future.nth(2).evaluate("el => getComputedStyle(el).backgroundImage") == 'none'
    page.emulate_media(forced_colors='active')
    assert future.nth(0).evaluate("el => getComputedStyle(el).appearance") == 'auto'
    assert future.nth(0).evaluate("el => getComputedStyle(el).backgroundImage") == 'none'
    page.emulate_media(forced_colors='none')
    print('PASS: unstyled future dropdown, RTL, native listbox and high-contrast fallback')
    assert not errors, errors
    assert not external, external
    browser.close()
    print('All control checks passed; no model calls or external requests. Screenshots:', artifacts)
