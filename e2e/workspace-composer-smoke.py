"""Integrated composer: real browser and synthetic adapter, no vendor model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    print('Composer controls:', page.locator('.chat-composer').inner_text())
    field = page.get_by_role('textbox', name='Message Counsel', exact=True)
    shell = page.locator('.chat-composer')
    attach = page.get_by_role('button', name='Add documents', exact=True)
    send = page.get_by_role('button', name='Send message', exact=True)

    for width in [1440, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        field.fill('')
        field.focus()
        state = field.evaluate('''el => {
            const s = getComputedStyle(el);
            return {outline: s.outlineStyle, border: s.borderTopWidth, radius: s.borderRadius,
                resize: s.resize, background: s.backgroundColor, min: parseFloat(s.minHeight)};
        }''')
        assert state['outline'] == 'none' and state['border'] == '0px', state
        assert state['radius'] == '0px' and state['resize'] == 'none', state
        assert state['background'] == 'rgba(0, 0, 0, 0)', state
        assert shell.evaluate("el => getComputedStyle(el).borderTopColor") == 'rgb(82, 123, 181)'
        empty_height = field.bounding_box()['height']
        assert abs(empty_height - state['min']) < 1
        expect(send).to_be_disabled()
        controls = page.locator('.composer-controls')
        assert controls.evaluate("el => { const s=getComputedStyle(el); return [s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft]; }") == ['12px'] * 4
        for button in [attach, send, page.locator('.composer-model')]:
            assert button.bounding_box()['height'] == 32
        model = page.locator('.composer-model')
        expect(model.locator('small')).to_have_count(0)
        expect(model).to_have_attribute('title', 'Scripted test · no model calls · scripted-fixture')
        attach_text, model_text = attach.locator('span').bounding_box(), model.locator('span').bounding_box()
        assert abs(attach_text['y'] + attach_text['height']/2 - model_text['y'] - model_text['height']/2) < 1
        controls_box = controls.bounding_box()
        send_box = send.bounding_box()
        assert abs(controls_box['y'] + controls_box['height'] - send_box['y'] - send_box['height'] - 12) < 1
        assert abs(controls_box['x'] + controls_box['width'] - send_box['x'] - send_box['width'] - 12) < 1
        shell.screenshot(path=str(artifacts / f'composer-focused-{width}.png'))
        select = page.get_by_label('Conversation context', exact=True)
        expect(select).to_have_attribute('aria-haspopup', 'dialog')
        assert select.locator('svg').bounding_box()['width'] == 12

        field.fill('First point')
        field.press('Shift+Enter')
        field.press('End')
        field.press('S')
        expect(field).to_have_value('First point\nS')
        expect(send).to_be_enabled()
        page.keyboard.press('Tab')
        expect(attach).to_be_focused()
        assert attach.evaluate("el => getComputedStyle(el).outlineStyle") != 'none'
        page.keyboard.press('Shift+Tab')
        expect(field).to_be_focused()

        long_draft = '\n'.join(f'Synthetic point {n}: retain the source and distinguish unresolved facts.' for n in range(30))
        field.fill(long_draft)
        assert field.bounding_box()['height'] > empty_height
        assert field.bounding_box()['height'] <= (200 if width == 1440 else 150)
        assert field.evaluate('el => el.scrollHeight > el.clientHeight')
        expect(send).to_be_in_viewport()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        shell.screenshot(path=str(artifacts / f'composer-long-{width}.png'))
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(field).to_have_value(long_draft)
        assert field.bounding_box()['height'] > empty_height
        field.fill('Short draft')
        assert abs(field.bounding_box()['height'] - empty_height) < 1
        page.screenshot(path=str(artifacts / f'composer-page-{width}.png'), full_page=True)

    # The quieter footer is a real preferences link; navigation preserves this draft.
    page.get_by_role('link', name='Practice preferences', exact=True).click()
    page.wait_for_url('**/#/knowledge?section=preferences')
    page.go_back()
    page.wait_for_load_state('networkidle')
    expect(field).to_have_value('Short draft')

    # Reflow on width changes, even without a keystroke.
    page.set_viewport_size({'width': 1440, 'height': 1000})
    field.fill('A synthetic context sentence. ' * 11)
    desktop_height = field.bounding_box()['height']
    page.set_viewport_size({'width': 390, 'height': 844})
    try:
        page.wait_for_function("() => document.querySelector('.chat-composer textarea').clientHeight === 150", timeout=5000)
    except Exception:
        print('Reflow diagnostic:', field.evaluate('el => ({height: el.clientHeight, scroll: el.scrollHeight, width: el.clientWidth, inline: el.style.height, max: getComputedStyle(el).maxHeight, value: el.value})'))
        page.screenshot(path=str(artifacts / 'composer-reflow-failure.png'))
        raise
    assert desktop_height < field.bounding_box()['height']
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.wait_for_function("() => document.querySelector('.chat-composer textarea').clientHeight < 150")
    field.focus()
    page.emulate_media(forced_colors='active')
    assert shell.evaluate("el => getComputedStyle(el).outlineStyle") == 'solid'
    page.emulate_media(forced_colors='none')
    # Send clears the grown field; this server is a deterministic local fake.
    field.fill('Synthetic composer submission.')
    field.press('Enter')
    page.wait_for_url('**/#/home?id=*')
    expect(field).to_have_value('')
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    assert field.bounding_box()['height'] == 83
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: seamless focus, smaller carets, autosize, reflow, keyboard, draft restore and send.')
