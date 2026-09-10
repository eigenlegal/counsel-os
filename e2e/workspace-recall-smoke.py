"""Meaning-informed recall receipt, exact citation and history; synthetic provider only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:7461'
OUT=Path(__file__).parent/'.tmp'/'workspace'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page()
    errors,external=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    context.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path,body=None):
        headers={'Authorization':'Bearer workspace-browser-test-only'}
        r=context.request.get(BASE+'/api/workspace'+path,headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path,headers=headers,data=body)
        assert r.ok,r.text()
        return r.json()
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.get_by_role('textbox',name='Message Counsel',exact=True).fill('Can they recruit our employees?')
    page.get_by_role('button',name='Send message',exact=True).click()
    expect(page.get_by_text('Saved in conversation',exact=True)).to_be_visible(timeout=20000)
    for width,height in [(1440,1000),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height})
        page.get_by_role('button',name='View context',exact=True).click()
        page.get_by_role('button',name='Latest response',exact=True).click()
        page.get_by_text('How Counsel searched',exact=True).click()
        receipt=page.get_by_label('Search approach',exact=True)
        expect(receipt).to_contain_text('nonsolicitation')
        expect(receipt).to_contain_text('not sources or evidence')
        expect(page.get_by_label('Automatic context preparation',exact=True)).to_contain_text('1 record')
        expect(page.locator('.context-record').filter(has_text='Saved NDA instruction')).to_contain_text('Prepared')
        receipt.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'recall-{width}.png'),animations='disabled')
        page.keyboard.press('Escape')
        page.reload()
        expect(page.get_by_text('Saved in conversation',exact=True)).to_be_visible()
    assert not errors,errors
    assert not external,external
    browser.close()
print('PASS: alternate vocabulary, exact prepared/cited instruction, persisted receipt and desktop/mobile; synthetic only')
