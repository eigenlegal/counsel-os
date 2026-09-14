"""Rename/archive/Trash/restore through the real UI and HTTP boundary; synthetic only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [1440, 390]:
        context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        errors, external = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        context.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
        def api(path, data=None):
            options = {'headers': {'Authorization': 'Bearer workspace-browser-test-only'}}
            response = context.request.get(BASE + '/api/workspace' + path, **options) if data is None else context.request.post(BASE + '/api/workspace' + path, data=data, **options)
            assert response.ok, response.text()
            return response.json()
        name = f'Synthetic conversation {width}'
        chat = api('/conversations', {'title': name})
        page.goto(BASE + '/#token=workspace-browser-test-only')
        page.wait_for_load_state('networkidle')
        page.goto(BASE + '/#/home?id=' + chat['id'])
        page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill('A synthetic lifecycle question')
        page.get_by_role('button', name='Send message', exact=True).click()
        expect(page.get_by_text('Saved in conversation', exact=True)).to_be_visible(timeout=20000)
        turn = api('/conversations/' + chat['id'])['turns'][0]
        api('/work/' + turn['workId'] + '/output', {'title': 'Retained advice ' + str(width), 'kind': 'memo'})
        page.goto(BASE + '/#/home?view=history')
        history = page.get_by_role('region', name='Conversation history', exact=True)
        def open_action(title, label):
            history.get_by_role('button', name='Manage conversation: ' + title, exact=True).click()
            history.get_by_role('button', name=label, exact=True).click()
        open_action(name, 'Rename')
        dialog = page.get_by_role('dialog', name='Rename conversation', exact=True)
        renamed = f'Renamed advisory discussion {width}'
        dialog.get_by_role('textbox', name='Conversation title').fill(renamed)
        dialog.get_by_role('button', name='Save name', exact=True).click()
        expect(dialog).to_have_count(0)
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_be_visible()
        open_action(renamed, 'Archive')
        dialog = page.get_by_role('dialog', name='Archive conversation', exact=True)
        dialog.get_by_role('button', name='Archive', exact=True).click()
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_have_count(0)
        history.get_by_role('button', name='Archived', exact=True).click()
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_be_visible()
        open_action(renamed, 'Move to Trash')
        dialog = page.get_by_role('dialog', name='Move conversation to Trash', exact=True)
        expect(dialog.get_by_role('link', name='Retained advice ' + str(width), exact=False)).to_be_visible()
        expect(dialog).to_contain_text('These items will remain')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        button = dialog.get_by_role('button', name='Move to Trash', exact=True)
        button.hover()
        assert button.evaluate('(e) => getComputedStyle(e).color') == 'rgb(255, 255, 255)'
        page.screenshot(path=str(OUT / f'conversation-trash-{width}.png'), animations='disabled')
        button.click()
        expect(dialog).to_have_count(0)
        history.get_by_role('button', name='Trash', exact=True).click()
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_be_visible()
        assert api('/work/' + turn['workId'])['request'] == ''
        assert not any(item['id'] == chat['id'] for item in api('/conversations'))
        page.reload()
        history.get_by_role('button', name='Trash', exact=True).click()
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_be_visible()
        page.screenshot(path=str(OUT / f'conversation-history-{width}.png'), animations='disabled')
        open_action(renamed, 'Restore conversation')
        page.get_by_role('dialog', name='Restore conversation').get_by_role('button', name='Restore to active').click()
        history.get_by_role('button', name='Active', exact=True).click()
        expect(history.get_by_role('button', name='Manage conversation: ' + renamed)).to_be_visible()
        assert api('/work/' + turn['workId'])['request'] == 'A synthetic lifecycle question'
        # Stale confirmation cannot overwrite a name changed in another tab.
        open_action(renamed, 'Rename')
        dialog = page.get_by_role('dialog', name='Rename conversation')
        expect(dialog.get_by_role('button', name='Save name')).to_be_enabled()
        impact = api('/conversations/' + chat['id'] + '/impact')
        api('/conversations/' + chat['id'] + '/manage', {'action': 'rename', 'expectedVersion': impact['version'], 'title': 'Changed in another tab ' + str(width)})
        dialog.get_by_role('textbox', name='Conversation title').fill('Stale name')
        dialog.get_by_role('button', name='Save name').click()
        expect(dialog).to_contain_text('changed. Reopen the action')
        dialog.get_by_role('button', name='Cancel', exact=True).click()
        assert not errors, errors
        assert not external, external
        context.close()
    browser.close()
print('Conversation management passed at desktop and mobile widths; no external requests or model calls.')
