"""Model picker, per-chat persistence and concurrent choices; --chat --model-catalog fixture only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def connection():
        response = context.request.get(BASE + '/api/workspace', headers=headers)
        assert response.ok, response.text()
        return response.json()['connection']['config']
    original_connection = connection()
    page.get_by_role('complementary').get_by_role('link', name='Settings', exact=True).click()
    page.get_by_role('button', name='Load model choices', exact=True).click()
    expect(page.get_by_role('option', name='GPT-6-Astra', exact=True)).to_have_count(1)
    expect(page.get_by_label('Model', exact=True)).to_have_value('scripted-fixture')
    expect(page.get_by_role('option', name='internal-synthetic', exact=True)).to_have_count(0)
    page.get_by_label('AI connection', exact=True).select_option('claude-code')
    expect(page.get_by_role('option', name='Fable', exact=True)).to_have_count(1)
    expect(page.get_by_text('in this non-interactive integration', exact=False)).to_be_visible()
    page.get_by_label('Model', exact=True).select_option('fable')
    assert connection() == original_connection  # Unsaved Settings edits are not applied.
    page.screenshot(path=str(OUT / 'model-settings-fable-1440.png'), full_page=True)
    page.get_by_role('complementary').get_by_role('button', name='New chat', exact=True).click()
    page.get_by_role('button', name='Choose model for this chat', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('option', name='GPT-6-Astra', exact=True)).to_have_count(1)
    dialog.get_by_role('checkbox', name='Use workspace default', exact=False).uncheck()
    dialog.get_by_label('Model', exact=True).select_option('gpt-6-astra')
    page.screenshot(path=str(OUT / 'model-picker-astra-1440.png'), full_page=True)
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    expect(page.locator('.composer-model')).to_contain_text('scripted-fixture')
    # Change only the disposable fixture's connection to verify the same chat picker for Claude.
    response = context.request.post(BASE + '/api/workspace/connection', headers=headers, data={
        'kind': 'claude-code', 'model': 'sonnet', 'claudeBilling': 'subscription'})
    assert response.ok
    page.reload()
    page.get_by_role('button', name='Choose model for this chat', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('option', name='Fable', exact=True)).to_have_count(1)
    dialog.get_by_role('checkbox', name='Use workspace default', exact=False).uncheck()
    dialog.get_by_label('Model', exact=True).select_option('fable')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(OUT / 'model-picker-fable-390.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    assert connection() == {'kind': 'claude-code', 'model': 'sonnet', 'claudeBilling': 'subscription'}
    response = context.request.post(BASE + '/api/workspace/connection', headers=headers, data=original_connection)
    assert response.ok
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.reload()

    def choose(model):
        page.get_by_role('button', name='Choose model for this chat', exact=True).click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('checkbox', name='Use workspace default', exact=False).uncheck()
        dialog.get_by_label('Model', exact=True).select_option('__custom')
        dialog.get_by_label('Model ID', exact=True).fill(model)
        return dialog

    dialog = choose('synthetic-model-a')
    expect(dialog.get_by_text('Counsel OS does not automatically choose a model or fallback.', exact=False)).to_be_visible()
    page.screenshot(path=str(OUT / 'model-picker-1440.png'), full_page=True)
    dialog.get_by_role('button', name='Use for this chat', exact=True).click()
    expect(page.locator('.composer-model')).to_contain_text('synthetic-model-a')
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('Synthetic first chat.')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    first_url = page.url
    first_id = first_url.split('id=')[1]
    expect(page.locator('.composer-model')).to_contain_text('synthetic-model-a')
    # Open an independent chat without stopping the first response.
    page.goto(BASE + '/#/home?new=synthetic-second-model')
    expect(page.locator('.composer-model')).to_contain_text('scripted-fixture')
    choose('synthetic-model-b').get_by_role('button', name='Use for this chat', exact=True).click()
    page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('Synthetic second chat.')
    page.get_by_role('button', name='Send message', exact=True).click()
    page.wait_for_url('**/#/home?id=*')
    second_id = page.url.split('id=')[1]
    expect(page.locator('.composer-model')).to_contain_text('synthetic-model-b')
    page.reload()
    expect(page.locator('.composer-model')).to_contain_text('synthetic-model-b')
    headers = {'Authorization': 'Bearer workspace-browser-test-only'}
    def read_chat(id):
        return context.request.get(BASE + '/api/workspace/conversations/' + id, headers=headers).json()
    for id, model in [(first_id, 'synthetic-model-a'), (second_id, 'synthetic-model-b')]:
        saved = read_chat(id)
        assert saved['modelPreference']['choice']['model'] == model
        assert saved['turns'][0]['state']['requestedModelChoice']['model'] == model
    page.goto(first_url)
    expect(page.locator('.composer-model')).to_contain_text('synthetic-model-a')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT / 'model-composer-390.png'), full_page=True)
    page.get_by_role('button', name='Choose model for this chat', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('checkbox', name='Use workspace default', exact=False).check()
    page.screenshot(path=str(OUT / 'model-picker-390.png'), full_page=True)
    dialog.get_by_role('button', name='Use for this chat', exact=True).click()
    expect(page.locator('.composer-model')).to_contain_text('scripted-fixture')
    assert read_chat(first_id)['modelPreference']['choice'] is None
    assert read_chat(second_id)['modelPreference']['choice']['model'] == 'synthetic-model-b'
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: Astra/Fable in Settings and chat, no automatic selection/billing changes, custom IDs, independent concurrent selections, send receipts, reload, reset and mobile layout')
