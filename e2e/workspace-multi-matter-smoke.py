"""Explicit multi-matter selection, frozen receipts and independent drafts. Synthetic only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path=''):
        response = context.request.get(BASE+'/api/workspace'+path, headers={'Authorization':'Bearer workspace-browser-test-only'})
        assert response.ok, response.text()
        return response.json()
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    field = page.get_by_role('textbox', name='Message Counsel', exact=True)
    field.fill('Synthetic multi-matter fixture: What remains unresolved?')
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Select several matters…', exact=True).click()
    picker = page.get_by_role('dialog', name='Select matters', exact=True)
    search = picker.get_by_role('textbox', name='Search matters to include', exact=True)
    expect(search).to_be_focused()
    search.fill('investigation')
    picker.get_by_role('checkbox', name='Internal investigation', exact=True).check()
    search.fill('monitoring')
    picker.get_by_role('checkbox', name='Employee monitoring advice', exact=True).check()
    expect(picker.get_by_label('Selected matters', exact=True)).to_contain_text('Internal investigation')
    expect(picker.get_by_label('Selected matters', exact=True)).to_contain_text('Employee monitoring advice')
    search.fill('nothing-matches-this-query')
    expect(picker.get_by_role('status')).to_contain_text('No matching matters')
    expect(picker).to_contain_text('2 selected')
    page.screenshot(path=str(OUT/'multi-matter-picker-1440.png'))
    assert not api('/conversations'), 'Selection must not create a conversation or send'
    picker.get_by_role('button', name='Use selected matters', exact=True).click()
    expect(page.get_by_label('Conversation context', exact=True)).to_contain_text('2 selected matters')
    page.reload()
    expect(page.get_by_label('Conversation context', exact=True)).to_contain_text('2 selected matters')
    expect(field).to_have_value('Synthetic multi-matter fixture: What remains unresolved?')
    # Cancel discards staged changes. Names remain accessible on small screens.
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_label('Conversation context', exact=True).click()
    picker.get_by_role('button', name='Remove Internal investigation', exact=True).click()
    expect(picker).to_contain_text('1 selected')
    for row in picker.locator('.multi-matter-results > label').all():
        assert row.evaluate("el => getComputedStyle(el).flexDirection") == 'row'
    page.screenshot(path=str(OUT/'multi-matter-picker-390.png'))
    page.keyboard.press('Escape')
    expect(field).to_be_focused()
    expect(page.get_by_label('Conversation context', exact=True)).to_contain_text('2 selected matters')
    page.get_by_role('button', name='View context', exact=True).click()
    panel = page.get_by_role('dialog', name='Chat context', exact=True)
    expect(panel).to_contain_text('Internal investigation')
    expect(panel).to_contain_text('Employee monitoring advice')
    expect(panel).not_to_contain_text('Document assessment')
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('button', name='Send message', exact=True).click()
    try:
        expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=20000)
    except Exception:
        print('Synthetic send diagnostic:', page.locator('.composer-region').inner_text(), api('/conversations'))
        for c in api('/conversations'): print(api('/conversations/'+c['id']))
        page.screenshot(path=str(OUT/'multi-matter-send-failure.png'))
        raise
    chat_id = page.url.split('id=')[1]
    saved = api('/conversations/'+chat_id)
    assert saved['conversation']['scope'] == 'matters' and saved['conversation']['matterId'] is None
    chosen = saved['conversation']['selectedMatters']
    assert len(chosen) == 2
    original = saved['turns'][0]
    assert original['state']['scopeContext']['selectedMatters'] == chosen
    assert len(original['state']['context']) > 0
    expect(page.locator('.chat-answer')).not_to_contain_text('[undefined]')
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    receipt = page.get_by_role('complementary', name='Response context', exact=True)
    expect(receipt).to_contain_text('Internal investigation')
    expect(receipt).to_contain_text('Employee monitoring advice')
    page.screenshot(path=str(OUT/'multi-matter-receipt-1440.png'))
    page.get_by_role('button', name='Close context', exact=True).click()
    # A new chat does not inherit the previous selection.
    page.get_by_role('button', name='New chat', exact=True).click()
    expect(page.get_by_label('Conversation context', exact=True)).to_contain_text('This conversation')
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Select several matters…', exact=True).click()
    picker.get_by_role('checkbox', name='Document assessment', exact=True).check()
    picker.get_by_role('button', name='Use selected matters', exact=True).click()
    expect(page.get_by_label('Conversation context', exact=True)).to_contain_text('Document assessment')
    assert api('/conversations/'+chat_id)['turns'][0] == original
    assert len(api('/conversations')) == 1 and not errors and not external, (errors,external)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    browser.close()
    print('PASS: searchable multi-matter selection without clients; cancel, reload, mobile and keyboard; isolated draft; saved scope receipts and real retrieval with synthetic provider; no external calls')
