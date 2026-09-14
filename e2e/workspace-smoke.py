"""Browser acceptance checks for the standalone workspace.

Build first, then run with the webapp-testing with_server.py helper and both
fixture servers (workspace-server.ts and workspace-server.ts --empty).
Only synthetic temporary databases are changed.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

artifacts = Path(__file__).parent / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
token = 'workspace-browser-test-only'
checks = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    context.set_default_timeout(8000)
    page = context.new_page()
    errors = []
    external = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda req: external.append(req.url) if not req.url.startswith('http://127.0.0.1:') else None)

    def navigate(path):
        page.goto(f'http://127.0.0.1:7458/{path}')
        page.wait_for_load_state('networkidle')

    def shot(name):
        page.screenshot(path=str(artifacts / f'{name}.png'), full_page=True, animations='disabled')

    navigate(f'#token={token}')
    expect(page.get_by_role('heading', name='What are we working through?')).to_be_visible()
    assert 'token=' not in page.url
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    shot('overview')
    checks.append('Authenticated overview, token stripped, no horizontal overflow')
    navigate('#/settings')
    page.get_by_role('button', name='Set up profile', exact=True).click()
    page.get_by_role('dialog').get_by_label('Your name', exact=True).fill('Synthetic reviewer')
    page.get_by_role('button', name='Save profile', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.keyboard.press('Meta+k')
    expect(page.get_by_role('textbox', name='Search query')).to_be_focused()
    navigate('#/work')
    checks.append('Keyboard shortcut opens and focuses workspace search')

    page.get_by_role('link', name=re.compile('Initial monitoring advice')).click()
    expect(page.get_by_role('heading', name='Initial monitoring advice')).to_be_visible()
    expect(page.locator('.evidence-card')).to_have_count(2)
    shot('work-reader')
    page.locator('.evidence-card').first.click()
    expect(page.get_by_role('heading', name='Synthetic monitoring reference')).to_be_visible()
    expect(page.locator('.record-prose')).to_contain_text('Document the monitoring purpose')
    expect(page.get_by_text('fixture:monitoring-reference', exact=True)).to_be_visible()
    checks.append('Work reader, exact evidence links, source text and provenance')

    navigate('#/matters')
    page.get_by_role('button', name='New matter', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('textbox', name='Title', exact=True)).to_be_focused()
    dialog.get_by_label('Title', exact=True).fill('Browser test advisory')
    dialog.get_by_label('Context (optional)', exact=True).fill('Synthetic question; no agreement is required.')
    dialog.get_by_role('button', name='Create matter', exact=True).click()
    expect(dialog).not_to_be_visible()
    expect(page.get_by_role('heading', name='Browser test advisory', exact=True)).to_be_visible()
    matter_url = page.url
    shot('matter')
    page.reload()
    expect(page.get_by_role('heading', name='Browser test advisory', exact=True)).to_be_visible()
    checks.append('Create a document-free matter; persisted after reload')

    navigate('#/work')
    page.get_by_role('button', name='Add a note or decision', exact=True).last.click()
    dialog.get_by_label('Matter', exact=True).select_option(label='Browser test advisory')
    dialog.get_by_label('Title', exact=True).fill('Browser test decision')
    dialog.get_by_label('Question or context', exact=True).fill('Should the work proceed?')
    dialog.get_by_label('Record as', exact=True).select_option('decision')
    dialog.get_by_label('Your decision', exact=True).fill('Wait for further evidence.')
    expect(dialog.locator('.profile-attribution')).to_contain_text('Synthetic reviewer')
    dialog.get_by_label('Cite saved text', exact=True).select_option(label='Synthetic monitoring reference')
    expect(dialog.get_by_label('Exact quote', exact=True)).to_have_value(re.compile('Document the monitoring purpose'))
    dialog.get_by_label('Exact quote', exact=True).fill('Document the monitoring purpose and limit access.')
    dialog.get_by_role('button', name='Add citation', exact=True).click()
    dialog.get_by_role('button', name='Save work', exact=True).click()
    expect(page.get_by_role('heading', name='Browser test decision', exact=True)).to_be_visible()
    expect(page.get_by_text('Synthetic reviewer', exact=True)).to_be_visible()
    expect(page.locator('.evidence-card')).to_have_count(1)
    page.locator('.record-context').get_by_role('link', name='Browser test advisory').click()
    page.get_by_role('button', name='Decisions', exact=True).click()
    expect(page.locator('.matter-view')).to_contain_text('Browser test decision')
    checks.append('Record a human decision in a matter and recall it in matter history')

    navigate('#/references')
    page.get_by_role('button', name='Add a source', exact=True).click()
    dialog.get_by_label('Title', exact=True).fill('Browser test source')
    dialog.get_by_label('Source location', exact=True).fill('manual:browser-test')
    dialog.get_by_label('Source text', exact=True).fill('Nebulacase research text. <img src=x onerror=alert(1)>')
    dialog.get_by_role('button', name='Save source', exact=True).click()
    expect(page.get_by_role('heading', name='Browser test source', exact=True)).to_be_visible()
    expect(page.locator('.record-prose')).to_contain_text('<img src=x onerror=alert(1)>')
    expect(page.locator('.reading-sheet img')).to_have_count(0)
    checks.append('Save source text with provenance; untrusted HTML is rendered as text')

    navigate('#/search?q=Nebulacase')
    expect(page.get_by_role('heading', name='1 result', exact=True)).to_be_visible()
    page.locator('.search-result').click()
    expect(page.get_by_role('heading', name='Browser test source', exact=True)).to_be_visible()
    checks.append('Search returns a newly saved reference and opens it')

    navigate('#/references')
    page.get_by_role('button', name='Add a source', exact=True).click()
    dialog.get_by_label('Title', exact=True).fill('Text not yet imported')
    dialog.get_by_label('Source location', exact=True).fill('manual:missing-text')
    dialog.get_by_label('Text coverage', exact=True).select_option('unavailable')
    expect(dialog.get_by_label('Source text', exact=True)).to_have_count(0)
    dialog.get_by_role('button', name='Save source', exact=True).click()
    expect(page.get_by_role('heading', name='Text not yet imported', exact=True)).to_be_visible()
    navigate('#/search?q=unfindableterm')
    expect(page.get_by_role('heading', name='No matching records')).to_be_visible()
    expect(page.get_by_text('Some source text is missing', exact=True)).to_be_visible()
    checks.append('Missing source text remains visible even when search has no matches')

    navigate('#/knowledge')
    page.get_by_role('button', name='Add to practice', exact=True).click()
    dialog.get_by_label('Title', exact=True).fill('Browser proposed method')
    dialog.get_by_label('What should we remember?', exact=True).fill('Nebulacase method awaiting approval.')
    dialog.get_by_role('button', name='Save for review', exact=True).click()
    expect(page.get_by_role('heading', name='Browser proposed method', exact=True)).to_be_visible()
    proposed_url = page.url
    shot('knowledge-review')
    navigate('#/search?q=Nebulacase')
    page.get_by_label('Search record type').select_option('knowledge')
    expect(page.get_by_role('heading', name='No matching records')).to_be_visible()
    page.get_by_label('Include previous & unapproved versions').check()
    expect(page.get_by_role('heading', name='1 result', exact=True)).to_be_visible()
    page.goto(proposed_url)
    page.wait_for_load_state('networkidle')
    expect(page.locator('.profile-attribution')).to_contain_text('Synthetic reviewer')
    page.get_by_role('button', name='Approve for practice', exact=True).click()
    expect(page.get_by_text('Approved by', exact=False)).to_be_visible()
    expect(page.get_by_role('button', name='Approve for practice')).to_have_count(0)
    navigate('#/search?q=Nebulacase')
    page.get_by_label('Search record type').select_option('knowledge')
    expect(page.get_by_role('heading', name='1 result', exact=True)).to_be_visible()
    shot('search')
    checks.append('Pending knowledge excluded, historical search available, explicit approval searchable')

    navigate('#/knowledge')
    page.get_by_role('button', name='Needs review', exact=True).click()
    page.get_by_role('link', name=re.compile('Unreviewed monitoring idea')).click()
    expect(page.locator('.profile-attribution')).to_contain_text('Synthetic reviewer')
    page.get_by_role('button', name='Do not adopt', exact=True).click()
    expect(page.locator('.reader-labels')).to_contain_text('Not adopted')
    checks.append('Reject a proposed knowledge item')

    # Server errors preserve the form and text. Retrying creates one record.
    navigate('#/matters')
    page.get_by_role('button', name='New matter', exact=True).click()
    dialog.get_by_label('Title', exact=True).fill('Retry preserved matter')
    page.route('**/api/workspace/matters', lambda route: route.fulfill(status=500, content_type='application/json', body='{"error":"Synthetic save failure; retry."}'))
    dialog.get_by_role('button', name='Create matter', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('Synthetic save failure')
    expect(dialog.get_by_label('Title', exact=True)).to_have_value('Retry preserved matter')
    page.unroute('**/api/workspace/matters')
    dialog.get_by_role('button', name='Create matter', exact=True).click()
    expect(page.get_by_role('heading', name='Retry preserved matter', exact=True)).to_be_visible()
    checks.append('Failed saves keep entered text and support retry')

    navigate('#/work')
    page.get_by_role('button', name='Add a note or decision', exact=True).last.click()
    dialog.get_by_label('Title', exact=True).fill('Unsaved work to keep')
    page.once('dialog', lambda prompt: prompt.dismiss())
    dialog.get_by_role('button', name='Cancel', exact=True).click()
    expect(dialog.get_by_label('Title', exact=True)).to_have_value('Unsaved work to keep')
    page.once('dialog', lambda prompt: prompt.accept())
    page.keyboard.press('Escape')
    expect(dialog).not_to_be_visible()
    checks.append('Unsaved work requires confirmation before closing')

    # Narrow-screen route and menu coverage, with no horizontal scroll.
    page.set_viewport_size({'width': 390, 'height': 844})
    for route, name in [('#/home', 'mobile-overview'), ('#/matters', 'mobile-matters'), ('#/knowledge', 'mobile-knowledge'), ('#/references', 'mobile-references'), ('#/settings', 'mobile-settings')]:
        navigate(route)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
        shot(name)
        assert page.locator('.app-sidebar').evaluate('(el) => el.getBoundingClientRect().right <= 0'), name
    page.get_by_role('button', name='Open navigation').click()
    expect(page.locator('.app-sidebar')).to_have_class(re.compile('sidebar-open'))
    expect(page.get_by_role('link', name='Counsel OS chats', exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.locator('.sidebar-bottom').get_by_role('link', name='Settings', exact=True)).to_be_focused()
    page.get_by_role('link', name='Chats', exact=True).click()
    expect(page.locator('.app-sidebar')).not_to_have_class(re.compile('sidebar-open'))
    checks.append('Mobile layouts and collapsible navigation')

    # Empty personal workspace, independent of the synthetic demonstration.
    empty = context.new_page()
    empty.goto(f'http://127.0.0.1:7459/#token={token}')
    empty.wait_for_load_state('networkidle')
    expect(empty.get_by_role('heading', name='What are we working through?')).to_be_visible()
    expect(empty.locator('.demo-banner')).to_have_count(0)
    empty.screenshot(path=str(artifacts / 'empty-workspace.png'), full_page=True)
    empty.goto('http://127.0.0.1:7459/#/work')
    empty.get_by_role('button', name='Add a note or decision', exact=True).last.click()
    expect(empty.get_by_role('dialog').get_by_label('Matter', exact=True)).to_have_value('')
    empty.get_by_role('button', name='Cancel', exact=True).click()
    checks.append('Honest empty workspace; work does not require a matter')

    # Missing token and offline states do not leave blank screens.
    unauth = browser.new_context()
    disconnected = unauth.new_page()
    disconnected.goto('http://127.0.0.1:7458/')
    disconnected.wait_for_load_state('networkidle')
    expect(disconnected.get_by_role('heading', name='Let’s open your workspace.')).to_be_visible()
    checks.append('Missing-session recovery screen')
    unauth.close()
    assert errors == [], errors
    assert external == [], external
    print('\n'.join(f'PASS: {check}' for check in checks))
    print('No uncaught browser errors or external requests. Screenshots:', artifacts)
    context.close()
    browser.close()
