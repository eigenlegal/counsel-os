"""Reviewed cross-folder links and multi-matter supporting files; synthetic only."""
import base64
from uuid import uuid4
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
    page.on('pageerror', lambda e: errors.append(str(e)))
    context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
    def api(path, body=None):
        headers = {'Authorization': 'Bearer workspace-browser-test-only'}
        response = context.request.get(BASE+'/api/workspace'+path, headers=headers) if body is None else context.request.post(BASE+'/api/workspace'+path, headers=headers, data=body)
        assert response.ok, response.text()
        return response.json()
    nda = api('/matters', {'title': 'Acme NDA'})
    employment = api('/matters', {'title': 'Acme employment dispute'})
    before = api('')
    files = {'Practice/notes/nda.md': 'NDA note. [Company](../../Companies/Acme/background.md)\n[[Missing/signed.docx]]\n[[agreement]]',
             'Practice/notes/employment.md': 'Employment note. [[Companies/Acme/background]]',
             'Companies/Acme/background.md': 'Company background, shared only after review.',
             'Deals/A/agreement.md': 'First deal', 'Deals/B/agreement.md': 'Another deal'}
    batch = api('/imports', {'clientId': str(uuid4()), 'label': 'Cross-folder relationships', 'files': [{'path': path, 'byteCount': len(body.encode())} for path, body in files.items()]})
    for entry in batch['entries']:
        api('/imports/'+batch['id']+'/files/'+entry['id'], {'base64': base64.b64encode(files[entry['path']].encode()).decode()})
    page.goto(BASE+'/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    batch = api('/imports/'+batch['id'])
    changes = [{'entryId': entry['id'], 'choice': {**entry['choice'], 'matterId': nda['id'] if '/nda.md' in entry['path'] else employment['id'], 'matterTitle': None}}
               for entry in batch['entries'] if '/notes/' in entry['path']]
    api('/imports/'+batch['id']+'/choices', {'expectedRevisionId': batch['revisionId'], 'changes': changes})
    page.goto(BASE+'/#/imports?id='+batch['id'])
    expect(page.get_by_text('2 references matched · 2 unresolved · 2 possible matter links')).to_be_visible()
    page.get_by_role('button', name='Review document links', exact=True).click()
    dialog = page.get_by_role('dialog', name='Review linked documents')
    expect(dialog.get_by_role('button', name='Add 0 links to import choices')).to_be_disabled()
    expect(dialog.get_by_text('More than one selected file matches; no target was chosen.')).to_be_visible()
    assert len(api('')['sources']) == len(before['sources'])
    for width, height in [(1440,1000), (390,844), (320,740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'import-links-{width}.png'))
    for prefix in ['nda', 'employment']:
        dialog.get_by_role('checkbox', name=f'Practice/notes/{prefix}.md → Companies/Acme/background.md', exact=True).check()
    dialog.get_by_role('button', name='Add 2 links to import choices').click()
    expect(dialog.get_by_role('button', name='Add 0 links to import choices')).to_be_disabled()
    expect(dialog.get_by_text('Already included in this matter’s import choices.')).to_have_count(2)
    assert len(api('')['sources']) == len(before['sources'])
    dialog.get_by_role('button', name='Back to import').click()
    page.get_by_role('button', name='Review Companies/Acme/background.md', exact=True).click()
    editor = page.get_by_role('dialog')
    expect(editor.get_by_role('heading', name='Additional matter sharing')).to_be_visible()
    expect(editor.get_by_role('button', name='Remove', exact=True)).to_have_count(2)
    editor.get_by_role('button', name='Cancel', exact=True).click()
    page.reload()
    page.get_by_role('button', name='Review and import 5 files', exact=True).click()
    expect(page.get_by_role('dialog').get_by_text('2 reviewed additional matter links', exact=False)).to_be_visible()
    page.get_by_role('button', name='Import into workspace', exact=True).click()
    expect(page.get_by_text('5 originals imported', exact=False)).to_be_visible()
    result = api('/imports/'+batch['id'])
    company_entry = next(entry for entry in batch['entries'] if entry['path'].endswith('background.md'))
    company = next(item for item in result['receipt']['items'] if item['entryId'] == company_entry['id'])
    matters = api('/sources/'+company['sourceId']+'/matters')
    assert sorted(m['id'] for m in matters['matters']) == sorted([nda['id'], employment['id']])
    assert result['receipt']['matterIds'] == []
    assert len(api('')['knowledge']) == len(before['knowledge'])
    assert not external, external
    assert not errors, errors
    browser.close()
print('PASS: cross-folder matching, missing/ambiguous review, explicit multi-matter sharing, editable choices, reload, final import, desktop/mobile; no live model calls')
