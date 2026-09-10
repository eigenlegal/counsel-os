"""Combined Practice filters and responsive controls; synthetic records only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for kind, title in [('method','Synthetic witness review method'), ('language','Synthetic notice wording')]:
        r = page.request.post(BASE+'/api/workspace/knowledge', headers={'Authorization':'Bearer workspace-browser-test-only'}, data={'kind':kind, 'revision':{'title':title, 'body':'Synthetic filter example.'}})
        assert r.ok, r.text()
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/knowledge')
    category = page.get_by_label('Practice category', exact=True)
    status = page.get_by_label('Practice use', exact=True)
    search = page.get_by_label('Search practice', exact=True)
    rows = page.locator('.resource-row')
    expect(rows).to_have_count(5)
    category.select_option('position')
    expect(rows).to_have_count(2)
    status.select_option('in-use')
    search.fill('monitoring')
    expect(rows).to_have_count(1)
    expect(rows.first).to_contain_text('Approved synthetic monitoring position')
    status.select_option('review')
    expect(rows).to_have_count(0)
    expect(category).to_have_value('position')
    expect(search).to_have_value('monitoring')
    page.get_by_role('button', name='Clear filters', exact=True).click()
    expect(rows).to_have_count(5)
    expect(status).to_have_value('all')
    for kind, title in [('method','Synthetic witness review method'), ('language','Synthetic notice wording'), ('pattern','Unreviewed monitoring idea')]:
        category.select_option(kind)
        expect(rows).to_have_count(1)
        expect(rows.first).to_contain_text(title)
    category.select_option('all')
    search.focus()
    page.keyboard.press('Tab')
    expect(category).to_be_focused()
    page.keyboard.press('Tab')
    expect(status).to_be_focused()
    for width in [1440,1280,1100,900,768,600,480,390,320]:
        page.set_viewport_size({'width':width,'height':1000})
        page.locator('.practice-library-toolbar').scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        category.select_option('pattern')
        assert category.evaluate("""el => { const s=getComputedStyle(el), ctx=document.createElement('canvas').getContext('2d'); ctx.font=s.font;
            return ctx.measureText(el.selectedOptions[0].textContent).width <= el.clientWidth-parseFloat(s.paddingInlineStart)-parseFloat(s.paddingInlineEnd); }"""), width
        category.select_option('all')
        if width in [1440,390,320]:
            page.screenshot(path=str(OUT/f'practice-filter-{width}.png'), animations='disabled')
    for route, label in [('matters','Filter matters'),('work','Filter saved outputs')]:
        page.goto(BASE+'/#/'+route)
        page.get_by_role('textbox',name=label,exact=True).fill('no synthetic record has this text')
        expect(page.get_by_role('heading',name='No matches in this view',exact=True)).to_be_visible()
        page.get_by_role('button',name='Clear filters',exact=True).click()
    assert not errors, errors
    browser.close()
print('PASS: combined Practice filters, keyboard order, narrow-screen caret clearance and other collection searches')
