"""Automatic context + honest library/approval UX. Synthetic fixture on 7473 only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7473'
TOKEN = 'workspace-browser-test-only'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial controls:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Aster employee monitoring', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('Can we approve the employee monitoring policy?')
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=20000)
    chat_url = page.url
    expect(page.locator('.chat-answer')).to_contain_text('14 days')
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    library = page.get_by_label('Reusable practice and law context', exact=True)
    expect(library).to_be_visible()
    library.locator('summary').click()
    expect(library).to_contain_text('Fictionland employment monitoring law')
    expect(library).to_contain_text('Imported practice baseline')
    expect(library).not_to_contain_text('PRIVATE-PROFILE')
    expect(library).not_to_contain_text('OUTSIDE-SCOPE-CANARY')
    library.locator('summary').click()
    expect(page.locator('.context-record').filter(has_text='Aster employee monitoring')).to_contain_text('Prepared')
    expect(page.locator('.context-record').filter(has_text='Employee monitoring — practice position')).to_contain_text('Prepared')
    page.screenshot(path=str(artifacts / 'context-library-1440.png'), full_page=True, animations='disabled')
    # A reload retains both the context receipt and citation; new reads are not invented.
    page.reload()
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible()
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    expect(page.get_by_label('Reusable practice and law context')).to_be_visible()
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.get_by_role('dialog')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'context-library-390.png'), full_page=True, animations='disabled')
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.goto(BASE + '/#/knowledge')
    row = page.locator('.resource-row').filter(has_text='Employee monitoring — practice position')
    expect(row).to_contain_text('Imported baseline · in use')
    row.click()
    expect(page.get_by_text('Reading the imported original currently used in chats.', exact=False)).to_be_visible()
    expect(page.locator('.knowledge-review')).to_have_count(0)
    expect(page.locator('.reading-body')).to_contain_text('Limit employee location retention to 14 days.')
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: automatic matter/practice/law context; exact source citation; durable receipts; imported-original explanation; desktop/mobile; no approvals or model calls')
