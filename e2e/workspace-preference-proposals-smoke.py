"""Explicit preference change from chat, exact review, next-chat use, undo and stale protection. Synthetic only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
PROMPT = 'Preference fixture: For future NDA work, preserve acceptable wording and explain material edits in short comments.'
UPDATED = 'Preserve acceptable wording. Explain every material NDA edit in a short comment.'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
    page = context.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    def api(path='', body=None):
        headers = {'Authorization':'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    original = api('/working-preferences', {'expectedRevisionId':None, 'writingInstructions':'Use concise prose.', 'ndaReview':'Preserve acceptable wording.', 'authorMode':'custom', 'customAuthor':'Synthetic Avery', 'filenamePattern':'{document}_{variant}'})
    before = api()
    page.goto(BASE+'/#token=workspace-browser-test-only'); page.wait_for_load_state('networkidle')
    def send(text):
        page.get_by_role('textbox', name='Message Counsel OS', exact=True).fill(text)
        page.get_by_role('button', name='Send message', exact=True).click()
        expect(page.get_by_text('Saved in conversation', exact=True).last).to_be_visible(timeout=15000)
        return page.url
    first_url = send(PROMPT)
    card = page.get_by_role('region', name='Working preference update', exact=True)
    expect(card).to_contain_text('Not saved')
    assert api('/working-preferences') == original
    card.get_by_role('button', name='Review preference update', exact=True).click()
    modal = page.get_by_role('dialog', name='Review working preferences', exact=True)
    expect(modal.get_by_role('heading', name='NDA review instructions', exact=True)).to_be_visible()
    expect(modal).to_contain_text('Preserve acceptable wording.')
    expect(modal).to_contain_text(UPDATED)
    expect(modal).to_contain_text(PROMPT)
    expect(modal.get_by_role('heading', name='Writing instructions', exact=True)).to_have_count(0)
    for width in [1440, 390, 320]:
        page.set_viewport_size({'width':width, 'height':1000 if width == 1440 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        modal.get_by_role('button', name='Save for future work', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'preference-review-{width}.png'), animations='disabled')
    modal.get_by_role('button', name='Save for future work', exact=True).click()
    expect(modal).to_have_count(0)
    expect(card).to_contain_text('Working preferences updated')
    current = api('/working-preferences')
    assert current['ndaReview'] == UPDATED and current['writingInstructions'] == original['writingInstructions']
    assert current['filenamePattern'] == original['filenamePattern'] and current['customAuthor'] == 'Synthetic Avery'
    assert len(api()['knowledge']) == len(before['knowledge'])
    page.set_viewport_size({'width':1440, 'height':1000})
    page.get_by_role('button', name='New chat', exact=True).click()
    send('Confirm the working instructions supplied to this response.')
    chat_id = page.url.split('id=')[1].split('&')[0]
    turns = api('/conversations/'+chat_id)['turns']
    assert turns[-1]['state']['workingPreferences']['ndaReview'] == UPDATED
    page.goto(first_url)
    card.get_by_role('button', name='See preference changes', exact=True).click()
    modal.get_by_role('button', name='Undo preference update', exact=True).click()
    expect(card).to_contain_text('Preference update undone')
    assert api('/working-preferences')['ndaReview'] == original['ndaReview']
    page.get_by_role('button', name='New chat', exact=True).click()
    send(PROMPT)
    saved = api('/working-preferences')
    fields = {k:v for k,v in saved.items() if k not in ['revisionId','version','updatedAt']}
    api('/working-preferences', {**fields, 'expectedRevisionId':saved['revisionId'], 'writingInstructions':'Later manual instructions.'})
    card.get_by_role('button', name='Review preference update', exact=True).click()
    expect(modal).to_contain_text('cannot overwrite the newer version')
    expect(modal.get_by_role('button', name='Save for future work', exact=True)).to_be_disabled()
    modal.get_by_role('button', name='Keep current preferences', exact=True).click()
    expect(card).to_contain_text('Current preferences kept')
    assert api('/working-preferences')['writingInstructions'] == 'Later manual instructions.'
    assert not errors, errors
    browser.close()
print('Preference chat loop: review-only staging, exact changes, next-chat use, undo, stale protection, desktop/mobile: passed')
