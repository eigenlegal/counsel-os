"""Searchable matters, composer/upload drops and exact prompt copying; synthetic workspace only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def api(path='', data=None):
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if data is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=data)
        assert response.ok, response.text()
        return response.json()
    title = 'École — Cross-border privacy assessment and employee monitoring advice for the synthetic North Harbor group and its regional operating companies'
    target = api('/matters', {'title': title, 'kind': 'advisory'})
    for i in range(510): api('/matters', {'title': f'Synthetic engagement {i:03}', 'kind': 'document'})
    assert target['id'] not in [m['id'] for m in api()['matters']]
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    field = page.get_by_role('textbox', name='Message Counsel', exact=True)
    field.fill('An unsent synthetic question.\nKeep this line.')
    picker = page.get_by_role('button', name='Conversation context', exact=True)
    picker.click()
    dialog = page.get_by_role('dialog', name='Choose conversation context')
    search = dialog.get_by_role('combobox', name='Search matters')
    expect(search).to_be_focused()
    assert search.evaluate("el => getComputedStyle(el).outlineStyle") == 'none'
    assert search.locator('..').evaluate("el => getComputedStyle(el).outlineStyle") != 'none'
    expect(dialog.get_by_role('status')).to_contain_text('Showing 50 of 514')
    assert dialog.get_by_role('option').count() == 53
    page.screenshot(path=str(OUT/'matter-picker-recent-1440.png'), full_page=True)
    search.fill('ecole harbor')
    expect(dialog.get_by_role('option', name=title, exact=True)).to_be_visible()
    page.screenshot(path=str(OUT/'matter-picker-search-1440.png'), full_page=True)
    search.press('Enter')
    expect(dialog).to_have_count(0)
    expect(picker).to_be_focused()
    expect(picker).to_have_text(title)
    expect(field).to_have_value('An unsent synthetic question.\nKeep this line.')
    assert not api('/conversations')
    picker.click()
    search.fill('not-a-matching-name')
    expect(dialog.get_by_role('status')).to_contain_text('No matching matters')
    search.press('Enter')
    expect(dialog).to_be_visible()
    search.press('Escape')
    expect(picker).to_have_text(title)
    # Narrow layout, selected full name and focus trapping.
    page.set_viewport_size({'width':390,'height':844})
    picker.click()
    search.fill('ecole')
    expect(dialog.get_by_role('option', name=title, exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT/'matter-picker-search-390.png'), full_page=True)
    search.press('Escape')
    for width in [390, 320]:
        page.set_viewport_size({'width':width,'height':844})
        expect(picker).to_have_text(title)
        box = picker.bounding_box()
        context_box = page.get_by_role('button', name='View context', exact=True).bounding_box()
        assert box['x'] + box['width'] <= context_box['x'], 'Long matter name overlaps context control'
        assert picker.locator('span').evaluate('el => el.scrollWidth > el.clientWidth'), 'Long matter name should truncate'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'composer-long-matter-{width}.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    # Real DOM DataTransfer, handled through the actual upload API.
    def drop(selector, files):
        handle = page.evaluate_handle('''files => { const data = new DataTransfer(); for (const file of files) data.items.add(new File([file.text], file.name, {type: file.type || 'text/plain'})); return data; }''', files)
        page.locator(selector).dispatch_event('dragenter', {'dataTransfer':handle})
        page.locator(selector).dispatch_event('dragover', {'dataTransfer':handle})
        page.locator(selector).dispatch_event('drop', {'dataTransfer':handle})
        handle.dispose()
    before_sources = api()['totals']['sources']
    drop('.chat-composer', [{'name':'Dropped one.txt','text':'First synthetic note.\r\n'}, {'name':'Dropped two.md','text':'# Second synthetic note'}])
    expect(page.get_by_role('dialog', name='Add documents to this chat')).to_have_count(0, timeout=10000)
    expect(page.locator('.document-chip')).to_have_count(2)
    expect(field).to_have_value('An unsent synthetic question.\nKeep this line.')
    assert not api('/conversations')
    assert api()['totals']['sources'] == before_sources + 2
    for source in api()['sources'][:2]: assert source['matterIds'] == [target['id']]
    # Native chooser and drop panel share the same validation; no upload on an invalid batch.
    page.get_by_role('button', name='Add documents', exact=True).click()
    drop('.file-drop-label', [{'name':'not-supported.doc','text':'Synthetic legacy'}, {'name':'not-added.txt','text':'Synthetic valid'}])
    expect(page.get_by_role('alert')).to_contain_text('No files from this selection were uploaded')
    assert api()['totals']['sources'] == before_sources + 2
    drop('.file-drop-label', [{'name':'Panel drop.txt','text':'Third synthetic note'}])
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('.document-chip')).to_have_count(3)
    # A mid-batch parser failure retains the successful first file and does not silently retry.
    page.get_by_role('button', name='Add documents', exact=True).click()
    drop('.file-drop-label', [{'name':'Successful first.txt','text':'Synthetic successful first file'}, {'name':'Broken second.pdf','text':'Not a PDF'}, {'name':'Not attempted.txt','text':'Must not upload'}])
    expect(page.get_by_role('alert')).to_contain_text('1 earlier document was added successfully')
    assert api()['totals']['sources'] == before_sources + 4
    page.get_by_role('button', name='Close dialog', exact=True).click()
    expect(page.locator('.document-chip')).to_have_count(4)
    # Text drops are not reinterpreted as files, and a file dropped elsewhere cannot navigate away.
    drop('.chat-heading', [{'name':'Outside target.txt','text':'Do not navigate or upload'}])
    assert api()['totals']['sources'] == before_sources + 4
    prompt = 'Synthetic sales note:\n\nUS: confirm scope.\nEU: confirm scope.\nROW: unresolved. 📄'
    field.fill(prompt)
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    expect(page.get_by_role('button', name='Copy prompt', exact=True)).to_be_visible()
    page.get_by_role('button', name='Copy prompt', exact=True).click()
    expect(page.get_by_role('button', name='Copied', exact=True)).to_be_visible()
    assert page.evaluate('navigator.clipboard.readText()') == prompt
    page.screenshot(path=str(OUT/'prompt-copy-1440.png'), full_page=True)
    expect(page.get_by_role('button', name='Stop response')).to_have_count(0, timeout=15000)
    chat = api('/conversations')[0]
    assert chat['matterId'] == target['id']
    assert len(api('/conversations/'+chat['id'])['turns'][0]['attachments']) == 4
    page.reload()
    expect(page.get_by_role('button', name='Copy prompt', exact=True)).to_be_visible()
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('button', name='Copy prompt', exact=True).click()
    assert page.evaluate('navigator.clipboard.readText()') == prompt
    page.screenshot(path=str(OUT/'prompt-copy-390.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    assert not external, external
    print('PASS: 514-matter search, remote matter scope, keyboard/mobile, multi-file drops, partial failure and exact prompt copying; synthetic only.')
    browser.close()
