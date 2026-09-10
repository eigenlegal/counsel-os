"""Real UI + durable synthetic guide and discovery receipts. No model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
TOKEN = 'workspace-browser-test-only'
artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='What are we working through?')).to_be_visible()
    page.get_by_label('Conversation context', exact=True).click()
    page.get_by_role('option', name='Internal investigation', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel', exact=True).fill('Synthetic guide fixture: plan a review of staff location monitoring.')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=15000)
    chat_id = page.url.split('id=')[1]
    data = page.request.get(BASE + '/api/workspace/conversations/' + chat_id, headers={'Authorization': 'Bearer ' + TOKEN}).json()
    turn = data['turns'][0]
    assert [g['id'] for g in turn['state']['guidesRead']] == ['privacy', 'employment']
    assert all(record['kind'] in ('source', 'knowledge', 'work') for record in turn['state']['context']), 'Guide loads counted as document reads'
    assert not any(record['id'] in ('privacy', 'employment') for record in turn['state']['context'])
    assert turn['state']['preparedContext']['records'], 'Automatic document preparation was not recorded separately'
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    panel = page.get_by_role('complementary', name='Response context', exact=True)
    expect(panel.get_by_role('region', name='Working guides used')).to_be_visible()
    panel.locator('summary').filter(has_text='Records available to Counsel').click()
    expect(panel.locator('.available-records')).to_contain_text('not a list of documents read')
    expect(panel.locator('.available-records')).to_contain_text('Sources and matter notes (2)')
    expect(panel.locator('.available-records')).not_to_contain_text('Synthetic agreement extraction')
    panel.locator('summary').filter(has_text='Privacy and data use').click()
    expect(panel.get_by_role('link', name='California privacy laws and regulations')).to_have_attribute('href', 'https://cppa.ca.gov/regulations/')
    expect(panel.locator('.working-guides')).to_contain_text('not a legal review date')
    expect(panel.locator('.working-guides')).to_contain_text('These sites were not opened')
    panel.screenshot(path=str(artifacts / 'guide-context-1440.png'), animations='disabled')
    # Snapshot reopening does not infer a new guide version or re-run a model.
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    expect(page.get_by_role('region', name='Working guides used')).to_contain_text('Employment and workplace decisions')
    page.get_by_role('button', name='Close context', exact=True).click()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    dialog = page.get_by_role('dialog', name='Response context', exact=True)
    expect(dialog).to_be_visible()
    dialog.locator('summary').filter(has_text='Employment and workplace decisions').click()
    expect(dialog.locator('.working-guides')).to_contain_text('Working method')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'guide-context-390.png'), full_page=True, animations='disabled')
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: automatic-guide receipts, source/read distinction, scoped inventory, reopen, mobile and no external requests')
