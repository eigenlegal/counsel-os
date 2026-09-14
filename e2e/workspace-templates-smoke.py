"""Template lifecycle and chat handoff; synthetic local fixture, no vendor calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)

def check_results_spacing(page, result_selector, state):
    for width in [390, 1440]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 1000})
        search = page.locator('.practice-library-toolbar')
        result = page.get_by_role('region', name='Practice library').locator(result_selector)
        expect(result).to_be_visible()
        search_box, result_box = search.bounding_box(), result.bounding_box()
        gap = result_box['y'] - search_box['y'] - search_box['height']
        assert gap >= 24, f'{state} at {width}px: expected room between search and results, got {gap}'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'templates-{state}-{width}.png'), full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/knowledge')
    page.get_by_label('Practice category', exact=True).select_option('template')
    print('Template controls:', page.locator('main button').all_text_contents())
    check_results_spacing(page, '.empty-state', 'empty')
    page.get_by_role('button', name='Add a template', exact=True).click()
    dialog = page.get_by_role('dialog')
    original = b'# Synthetic mutual NDA\n\nUse written notices.\nKeep the purpose limited.\n'
    dialog.get_by_label('Upload document', exact=True).set_input_files({'name': 'Synthetic mutual NDA.md', 'mimeType': 'text/markdown', 'buffer': original})
    expect(dialog.get_by_label('Template name')).to_have_value('Synthetic mutual NDA.md')
    dialog.get_by_label('Template name').fill('Mutual NDA starting point')
    dialog.get_by_label('When to use it').fill('Initial confidentiality discussions with prospective partners. Replace the parties and confirm the purpose.')
    dialog.get_by_label('Template jurisdiction').fill('Synthetic only')
    expect(dialog.get_by_role('button', name='Save template', exact=True)).to_be_disabled()
    dialog.get_by_role('checkbox').check()
    page.screenshot(path=str(OUT / 'template-editor-1440.png'), full_page=True)
    dialog.get_by_role('button', name='Save template', exact=True).click()
    expect(page.locator('.resource-row').filter(has_text='Mutual NDA starting point')).to_be_visible()
    check_results_spacing(page, '.resource-list', 'populated')
    page.get_by_role('textbox', name='Search practice', exact=True).fill('no matching starting point')
    expect(page.get_by_role('heading', name='No practice materials here', exact=True)).to_be_visible()
    check_results_spacing(page, '.empty-state', 'no-matches')
    page.get_by_role('textbox', name='Search practice', exact=True).fill('')
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    templates = context.request.get(BASE + '/api/workspace/templates', headers=headers).json()
    assert len(templates) == 1
    template = templates[0]
    assert context.request.get(BASE + '/api/workspace/source-revisions/' + template['sourceRevisionId'] + '/original', headers=headers).body() == original
    page.locator('.resource-row').filter(has_text='Mutual NDA starting point').click()
    page.get_by_role('button', name='Start a draft', exact=True).click()
    composer = page.get_by_role('textbox', name='Message Counsel OS', exact=True)
    expect(composer).to_have_value('Help me prepare a draft using the attached template. ')
    expect(page.locator('.chat-context-documents')).to_contain_text('Synthetic mutual NDA')
    expect(page.locator('.chat-turn')).to_have_count(0)
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_function("() => document.querySelector('.chat-answer')?.textContent.includes('Synthetic upload test')")
    expect(page.locator('.inline-citation').first).to_be_visible()
    page.get_by_role('button', name='View context', exact=False).first.click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    expect(page.get_by_text('1 practice templates available for retrieval', exact=True)).to_be_visible()
    page.goto(BASE + '/#/knowledge')
    page.get_by_label('Practice category', exact=True).select_option('template')
    page.locator('.resource-row').filter(has_text='Mutual NDA starting point').click()
    page.get_by_role('button', name='Edit template', exact=True).click()
    dialog.get_by_label('Available for future work').uncheck()
    dialog.get_by_role('checkbox', name='Retire this template', exact=False).check()
    dialog.get_by_role('button', name='Save template', exact=True).click()
    expect(page.get_by_role('button', name='Start a draft', exact=True)).to_be_disabled()
    expect(page.get_by_role('region', name='Practice template', exact=True)).to_contain_text('Not in use')
    page.get_by_text('Version history', exact=True).click()
    expect(page.locator('.template-history')).to_contain_text('Version 1')
    expect(page.locator('.template-history')).to_contain_text('Version 2')
    page.reload()
    expect(page.get_by_role('button', name='Start a draft', exact=True)).to_be_disabled()
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: template upload, explicit sharing, originals, mobile layout, unsent chat draft, retrieval receipt, retirement and history')
