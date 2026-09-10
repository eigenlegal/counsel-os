"""Profile reader hierarchy and real filename previews. Synthetic data; no model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':1050}, reduced_motion='reduce')
    page = context.new_page()
    errors, external, sends = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    context.on('request', lambda r: sends.append(r.url) if r.url.endswith('/send') else None)
    def api(path, body=None):
        headers = {'Authorization':'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    def shots(name, target):
        for width in [390,1440]:
            page.set_viewport_size({'width':width, 'height':1050})
            target.scroll_into_view_if_needed()
            page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT/f'{name}-{width}.png'))
    organization = '- Our team supports **regional operations**.\n- We work across two synthetic markets.'
    voice = '## Tone\n\nUse plain language.\n\n<img src="https://untrusted.invalid/tracker" onerror="bad()">'
    profile = api('/profile', {'expectedRevisionId':None, 'name':'Synthetic Avery', 'role':'Senior Counsel', 'organization':'Example Legal', 'organizationContext':organization,
        'principles':'- Focus on material risks.\n- Distinguish facts from assumptions.', 'voice':voice, 'applyToChats':False})
    prefs = api('/working-preferences', {'expectedRevisionId':None, 'generalReview':'Preserve the document’s structure.', 'ndaReview':'Make surgical edits. Explain material changes.',
        'authorMode':'custom', 'customAuthor':'Synthetic Avery', 'filenamePattern':'{document} - {variant}'})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE+'/#/knowledge?section=preferences')
    card = page.get_by_role('region', name='Your profile', exact=True)
    expect(card.get_by_role('group', name='Text display')).to_have_count(1)
    expect(card.locator('.profile-identity-guidance')).to_contain_text('this saved identity—not your AI login')
    expect(card).to_contain_text('profile-sharing switch do not remove that information')
    expect(card.get_by_role('link', name='Word author setting', exact=True)).to_have_attribute('href', '#/knowledge?section=preferences&view=documents')
    expect(card.locator(':scope > details')).to_have_count(0)
    expect(card.locator('img,script')).to_have_count(0)
    card.get_by_role('button', name='Saved text', exact=True).click()
    fields = card.locator('.profile-details > div')
    expect(fields.filter(has=page.get_by_text('Organization context', exact=True)).locator('.record-prose')).to_have_text(organization)
    expect(fields.filter(has=page.get_by_text('Writing and communication', exact=True)).locator('.record-prose')).to_have_text(voice)
    card.get_by_role('button', name='Reading view', exact=True).focus()
    page.keyboard.press('Enter')
    expect(card.get_by_role('heading', name='Tone', exact=True)).to_be_visible()
    shots('profile-reading-refined', card.locator('.profile-name'))
    card.get_by_role('button', name='Edit profile', exact=True).click()
    profile_editor = page.get_by_role('dialog', name='Edit your profile', exact=True)
    expect(profile_editor.locator('.profile-identity-guidance')).to_contain_text('Before saving, confirm the name and organization')
    expect(profile_editor.get_by_role('checkbox')).to_have_count(1)
    expect(profile_editor.get_by_role('checkbox', name='Use my profile in chats', exact=True)).not_to_be_checked()
    shots('profile-identity-editor', profile_editor.locator('.profile-identity-guidance'))
    profile_editor.get_by_role('button', name='Cancel', exact=True).click()
    assert api('/profile') == profile
    page.goto(BASE+'/#/knowledge?section=preferences&view=documents')
    preview = page.get_by_role('group', name='Example Word filenames', exact=True)
    expect(preview).to_contain_text('Mutual NDA - redline.docx')
    expect(preview).to_contain_text('NDA review - draft.docx')
    expect(preview).to_contain_text('for an answer downloaded as Word')
    shots('filename-examples-saved', preview)
    page.get_by_role('button', name='Edit working preferences', exact=True).click()
    editor = page.get_by_role('region', name='Working preferences editor', exact=True)
    editor.get_by_label('Word filename pattern', exact=True).fill('{document}_{variant}_{author}')
    expect(preview).to_contain_text('Mutual NDA_redline_Synthetic Avery.docx')
    expect(preview).to_contain_text('NDA review_draft_Synthetic Avery.docx')
    editor.get_by_label('Word author name', exact=True).fill('Another Author')
    expect(preview).to_contain_text('NDA review_draft_Another Author.docx')
    assert api('/working-preferences') == prefs
    shots('filename-examples-editor', preview)
    editor.get_by_text('Customize filename labels', exact=True).click()
    editor.get_by_label('Word filename pattern', exact=True).fill('{document} ({variant} {date})')
    editor.get_by_label('Redline label', exact=True).fill('ExampleCo redline')
    editor.get_by_label('Draft label', exact=True).fill('Draft')
    expect(preview).to_contain_text('Mutual NDA (ExampleCo redline ')
    expect(preview).to_contain_text('NDA review (Draft ')
    shots('filename-examples-custom-labels', preview)
    editor.get_by_role('button', name='Save working preferences', exact=True).click()
    expect(editor.get_by_role('status')).to_contain_text('Saved.')
    current_prefs = api('/working-preferences')
    assert current_prefs['redlineLabel'] == 'ExampleCo redline' and current_prefs['draftLabel'] == 'Draft'
    assert current_prefs['generalReview'] == prefs['generalReview'] and current_prefs['ndaReview'] == prefs['ndaReview']
    page.reload()
    expect(preview).to_contain_text('Mutual NDA (ExampleCo redline ')
    expect(preview).to_contain_text('NDA review (Draft ')
    page.get_by_role('button', name='Edit working preferences', exact=True).click()
    editor.get_by_label('Word filename pattern', exact=True).fill('../{document}')
    expect(preview).to_have_count(0)
    expect(editor).to_contain_text('Enter a valid filename pattern to see examples.')
    assert api('/profile') == profile
    assert not api('/conversations')
    assert not errors and not external and not sends, (errors,external,sends)
    browser.close()
    print('PASS: single profile display switch; exact saved text; safe Markdown; keyboard; live draft/redline filename previews; no settings mutation from viewing; desktop/mobile; no external/model requests')
