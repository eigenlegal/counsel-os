"""No-model setup and recovery checks against an isolated packaged workspace."""
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
    page.goto(base + '/#/settings?view=setup')
    expect(page.get_by_role('heading', name='A workspace for your practice.')).to_be_visible()
    for width, height in [(1440,1000),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(root / f'setup-{width}.png'), full_page=True, animations='disabled')
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('button', name='Explore without AI', exact=True).click()
    field = page.get_by_role('textbox', name='Message Counsel')
    expect(field).to_be_enabled()
    field.fill('Synthetic browser recovery — あ 🧭')
    assert page.evaluate('window.counselSaveDrafts()')
    address = page.url
    other = window(); other.goto(address)
    second = other.get_by_role('textbox', name='Message Counsel')
    expect(second).to_have_value('Synthetic browser recovery — あ 🧭')
    second.fill('Synthetic latest recovery'); assert other.evaluate('window.counselSaveDrafts()')
    field.fill('Synthetic conflicting recovery'); assert page.evaluate('window.counselSaveDrafts()') is False
    expect(page.get_by_role('alert')).to_contain_text('another window')
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
    # An incomplete preference filename must survive, without becoming a setting.
    page.goto(base + '/#/knowledge?section=preferences&view=documents')
    page.get_by_role('button', name='Set review preferences', exact=True).click()
    preference = page.get_by_role('textbox', name='NDA review instructions')
    expect(preference).to_be_enabled(); preference.fill('Synthetic unsaved instructions')
    page.get_by_role('textbox', name='Word filename pattern', exact=True).fill('')
    assert page.evaluate('window.counselSaveDrafts()')
    saved = page.evaluate("""async () => (await (await fetch('/api/workspace/working-preferences', {headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token')}})).json())""")
    assert saved is None
    restored = window(); restored.goto(base + '/#/knowledge?section=preferences&view=documents')
    expect(restored.get_by_role('textbox',name='NDA review instructions')).to_have_value('Synthetic unsaved instructions')
    expect(restored.get_by_role('textbox',name='Word filename pattern',exact=True)).to_have_value('')
    # The recovery fieldset must preserve the form's spacing, not just its inputs.
    spacing = restored.evaluate("""() => {
      const general = document.querySelector('[aria-label="General document review"]');
      const nda = document.querySelector('[aria-label="NDA review instructions"]');
      const author = document.querySelector('[aria-label="Changes and comments attributed to"]');
      const filename = document.querySelector('input[maxlength="180"]');
      return {
        reviewGap: nda.closest('label').getBoundingClientRect().top - general.getBoundingClientRect().bottom,
        outputGap: filename.closest('label').getBoundingClientRect().top - author.closest('.form-pair').getBoundingClientRect().bottom,
      };
    }""")
    assert spacing['reviewGap'] >= 18 and spacing['outputGap'] >= 18, spacing
    restored.screenshot(path=str(root/'recovered-preferences.png'), full_page=True, animations='disabled')
    assert not errors, errors
    assert not sends, sends
    browser.close()
print('PASS: optional setup, fresh-window draft recovery, conflicts, guarded navigation, discard and unapplied preferences; no model sends')
