"""Post-onboarding settings and recovery checks against an isolated packaged workspace."""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

config = json.loads(Path(sys.argv[1]).read_text())
parts = urlsplit(config['url'])
base, root = f'{parts.scheme}://{parts.netloc}', Path(config['root'])
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    contexts, errors, sends = [], [], []
    def window():
        context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        contexts.append(context)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
        page.on('dialog', lambda d: d.accept())
        page.goto(config['url']); page.wait_for_load_state('networkidle')
        return page
    page = window()
    # The preceding packaged onboarding check completed setup. Old bookmarks
    # must now open ordinary Settings, not resurrect the onboarding flow.
    page.goto(base + '/#/settings?view=setup')
    expect(page.get_by_role('heading', name='Workspace settings', exact=True)).to_be_visible()
    expect(page.get_by_role('region', name='Set up your workspace')).to_have_count(0)
    expect(page.get_by_role('link', name='Finish setup', exact=True)).to_have_count(0)
    for width, height in [(1440,1000),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(root / f'post-setup-settings-{width}.png'), full_page=True, animations='disabled')
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('button', name='New chat', exact=True).click()
    field = page.get_by_role('textbox', name='Message Counsel')
    expect(field).to_be_enabled()
    assert '/#/home?new=' in page.url, 'New chat must not leave a Settings URL behind'
    expect(page.get_by_text('Finish draft recovery before leaving this page. Your text is still here.')).to_have_count(0)
    field.fill('Synthetic browser recovery — あ 🧭')
    assert page.evaluate('window.counselSaveDrafts()')
    address = page.url
    other = window(); other.goto(address)
    second = other.get_by_role('textbox', name='Message Counsel')
    expect(second).to_have_value('Synthetic browser recovery — あ 🧭')
    second.fill('Synthetic latest recovery'); assert other.evaluate('window.counselSaveDrafts()')
    field.fill('Synthetic conflicting recovery'); assert page.evaluate('window.counselSaveDrafts()') is False
    expect(page.get_by_role('alert')).to_contain_text('another window')
    # New chat uses the same guard as links; it cannot bypass a failed save.
    page.get_by_role('button', name='New chat', exact=True).click()
    expect(page.get_by_text('Finish draft recovery before leaving this page. Your text is still here.')).to_be_visible()
    expect(field).to_have_value('Synthetic conflicting recovery')
    assert page.url == address
    # A failed save cannot strand the still-copyable text behind another route.
    page.evaluate("location.hash='#/matters'")
    expect(page.get_by_text('Finish draft recovery before leaving this page. Your text is still here.')).to_be_visible()
    expect(field).to_have_value('Synthetic conflicting recovery')
    page.get_by_role('button', name='Load saved draft', exact=True).click()
    expect(field).to_have_value('Synthetic latest recovery')
    page.goto(base + '/#/home?view=history')
    expect(page.get_by_role('region', name='Recovered drafts')).to_contain_text('Synthetic latest recovery')
    page.get_by_role('button', name='Discard draft: Synthetic latest recovery', exact=True).click()
    expect(page.get_by_role('region', name='Recovered drafts')).to_have_count(0)
    other.close()
    # Arbitrary free-form instructions survive without becoming standing context.
    page.goto(base + '/#/knowledge?section=preferences&view=documents')
    expect(page.get_by_role('heading', name='Your practice', exact=True)).to_be_visible()
    expect(page.get_by_role('navigation', name='Preference views')).to_have_count(0)
    expect(page.get_by_role('textbox', name='NDA review instructions')).to_have_count(0)
    page.get_by_role('button', name='Edit text', exact=True).click()
    preference = page.get_by_role('textbox', name='Practice document', exact=True)
    expect(preference).to_be_enabled()
    original = preference.input_value()
    unsaved = '# Whatever matters to me\n\nSynthetic unsaved instructions — あ 🧭\n\nKeep the complete reasoning.'
    preference.fill(unsaved)
    assert page.evaluate('window.counselSaveDrafts()')
    saved = page.evaluate("""async () => (await (await fetch('/api/workspace/practice-document', {headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token')}})).json())""")
    assert saved['body'] == original and saved['word']['author'] == 'Counsel'
    restored = window(); restored.goto(base + '/#/knowledge?section=preferences&view=edit')
    expect(restored.get_by_role('textbox',name='Practice document',exact=True)).to_have_value(unsaved)
    expect(restored.get_by_role('textbox')).to_have_count(1)
    for width, height in [(1440,1000),(390,844),(320,740)]:
        restored.set_viewport_size({'width':width,'height':height})
        assert restored.evaluate('document.documentElement.scrollWidth <= innerWidth')
        save = restored.get_by_role('button', name='Save text', exact=True)
        save.scroll_into_view_if_needed()
        expect(save).to_be_in_viewport()
        restored.screenshot(path=str(root/f'recovered-practice-{width}.png'), full_page=True, animations='disabled')
    assert not errors, errors
    assert not sends, sends
    browser.close()
print('PASS: post-onboarding settings, fresh-window draft recovery, conflicts, guarded navigation, discard and unapplied free-form practice document; no model sends')
