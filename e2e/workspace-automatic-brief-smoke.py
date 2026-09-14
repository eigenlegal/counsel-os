"""Routine matter notes, comparison and undo. Synthetic --briefs server only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7472'
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
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('automatic brief fixture: prepare the next interview steps.')
    page.get_by_role('button', name='Send message', exact=True).click()
    card = page.get_by_role('region', name='Automatic matter update', exact=True)
    expect(card).to_contain_text('Working notes saved automatically', timeout=15000)
    expect(card.get_by_role('button', name='Review matter update')).to_have_count(0)
    card.get_by_role('button', name='See changes', exact=True).click()
    dialog = page.get_by_role('dialog', name='Matter update', exact=True)
    expect(dialog).to_contain_text('Before this response')
    expect(dialog).to_contain_text('Saved update')
    page.screenshot(path=str(artifacts / 'automatic-brief-1440.png'), animations='disabled')
    dialog.get_by_role('button', name='Close', exact=True).click()
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(card).to_contain_text('Working notes saved automatically')
    page.set_viewport_size({'width': 390, 'height': 844})
    card.get_by_role('button', name='See changes', exact=True).click()
    expect(dialog).to_be_visible()
    expect(dialog).to_contain_text('Saved update')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'automatic-brief-390.png'), full_page=True, animations='disabled')
    dialog.get_by_role('button', name='Close', exact=True).click()
    card.get_by_role('button', name='Undo update', exact=True).click()
    expect(card).to_contain_text('Matter update undone')
    page.reload()
    expect(card).to_contain_text('Matter update undone')
    expect(card.get_by_role('button', name='Undo update')).to_have_count(0)
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: automatic notes, readable before/after, undo, reopen, mobile and no external requests')
