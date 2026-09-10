"""Unified Practice and recoverable record management. Synthetic fixture; no model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7473'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [1440, 390]:
        context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        errors, external = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
        def api(path, body=None):
            args = {'headers': {'Authorization': 'Bearer workspace-browser-test-only'}}
            r = context.request.get(BASE + '/api/workspace' + path, **args) if body is None else context.request.post(BASE + '/api/workspace' + path, data=body, **args)
            assert r.ok, r.text()
            return r.json()
        def shot(name):
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT / f'{name}-{width}.png'), animations='disabled')
        page.goto(BASE + '/#token=workspace-browser-test-only')
        page.wait_for_load_state('networkidle')
        page.goto(BASE + '/#/knowledge')
        library = page.get_by_role('region', name='Practice library', exact=True)
        expect(library.get_by_role('link').first).to_be_visible()
        expect(page.get_by_role('button', name='Positions & methods', exact=True)).to_have_count(0)
        expect(page.get_by_role('button', name='Practice files', exact=True)).to_have_count(0)
        search = library.get_by_role('textbox', name='Search practice', exact=True)
        search.fill('Employee monitoring — practice position')
        expect(library.locator('.resource-row')).to_have_count(1)
        expect(library).to_contain_text('Imported baseline · in use')
        library.locator('.resource-row').click()
        expect(page.locator('.reader-heading')).to_contain_text('Imported baseline · in use')
        expect(page.get_by_role('button', name='Approve for practice', exact=True)).to_have_count(0)
        expect(page.locator('.reading-body')).to_contain_text('Limit employee location retention to 14 days.')
        expect(page.locator('.practice-originals a')).to_have_count(1)
        from urllib.parse import parse_qs
        practice_id = parse_qs(page.url.split('?')[1])['id'][0]
        original_link = api('/knowledge/' + practice_id + '/originals')[0]
        original_record = api('/source-revisions/' + original_link['revisionId'])
        page.locator('.integrity-details summary').click()
        expect(page.locator('.integrity-details')).to_contain_text(original_record['id'])
        expect(page.locator('.integrity-details')).to_contain_text(original_record['contentHash'])
        page.get_by_role('button', name='Propose an update', exact=True).click()
        draft = page.get_by_role('dialog', name='Propose a practice update', exact=True)
        expect(draft.get_by_role('textbox', name='Proposed practice material', exact=True)).to_have_value(original_record['body'])
        draft.get_by_role('button', name='Cancel', exact=True).click()
        shot('practice-unified-reader')
        page.get_by_role('link', name='All practice', exact=True).click()
        library.get_by_label('Practice category').select_option('method')
        expect(library.locator('.resource-row')).to_have_count(1)
        expect(library).to_contain_text('Employee monitoring review method')
        library.get_by_label('Practice category').select_option('all')
        expect(library.locator('.resource-row').first).to_be_visible()
        shot('practice-unified-library')
        page.get_by_role('button', name='Add a file', exact=True).click()
        upload = page.get_by_role('dialog', name='Add a practice file', exact=True)
        uploaded_name = f'Practice upload {width}.md'
        original_bytes = b'# Synthetic practice material\n\nThis is a retained original, not a standard.'
        upload.get_by_label('Upload document', exact=True).set_input_files({'name': uploaded_name, 'mimeType': 'text/markdown', 'buffer': original_bytes})
        expect(upload).to_have_count(0, timeout=10000)
        expect(page.locator('.reader-heading')).to_contain_text(uploaded_name)
        source_id = parse_qs(page.url.split('?')[1])['id'][0]
        retained = api('/sources/' + source_id)
        assert retained['placement']['collection'] == 'practice'
        assert retained['matterIds'] == []
        page.get_by_role('link', name='All practice', exact=True).click()
        # A template and its original appear once; its content and actions open in the same library.
        file = api('/sources', {'kind': 'document', 'revision': {'title': f'Synthetic reusable original {width}', 'body': '# Starting document\n\nSynthetic terms.', 'provenance': {'origin': 'fixture', 'mediaType': 'text/markdown'}}})
        import uuid
        template = api('/templates', {'clientId': str(uuid.uuid4()), 'sourceRevisionId': file['latest']['id'], 'title': f'Synthetic template {width}', 'whenToUse': 'Synthetic drafting only.', 'practiceWideUse': True})
        page.reload()
        library.get_by_label('Practice category').select_option('template')
        library.get_by_role('textbox', name='Search practice').fill(f'Synthetic template {width}')
        expect(library.locator('.resource-row')).to_have_count(1)
        library.locator('.resource-row').click()
        detail = page.get_by_role('region', name='Practice template', exact=True)
        expect(detail.get_by_role('button', name='Start a draft')).to_be_enabled()
        expect(detail.locator('.reading-sheet')).to_contain_text('Synthetic terms.')
        expect(detail.get_by_role('link', name='Open pinned original')).to_be_visible()
        shot('practice-unified-template')
        detail.get_by_role('link', name='Open pinned original').click()
        matters = page.get_by_role('region', name='Document matters', exact=True)
        def link_matter(title):
            matters.get_by_role('button', name='Add to a matter', exact=True).click()
            dialog = page.get_by_role('dialog', name='Add document to a matter', exact=True)
            dialog.get_by_role('button', name='Matter', exact=True).click()
            picker = page.get_by_role('dialog', name='Choose a matter', exact=True)
            picker.get_by_role('combobox', name='Search matters').fill(title)
            picker.get_by_role('option', name=title, exact=True).click()
            dialog.get_by_role('button', name='Add to matter', exact=True).click()
            expect(dialog).to_have_count(0)
            expect(matters.get_by_role('link', name=title, exact=True)).to_be_visible()
        link_matter('Internal investigation')
        link_matter('Employee monitoring advice')
        matters.get_by_role('button', name='Remove from Internal investigation', exact=True).click()
        dialog = page.get_by_role('dialog', name='Remove document from matter', exact=True)
        expect(dialog).to_contain_text('workspace copy')
        dialog.get_by_role('button', name='Remove from matter', exact=True).click()
        expect(matters.get_by_role('link', name='Internal investigation', exact=True)).to_have_count(0)
        expect(matters.get_by_role('link', name='Employee monitoring advice', exact=True)).to_be_visible()
        page.get_by_role('button', name='Move to Trash', exact=True).click()
        dialog = page.get_by_role('dialog', name='Move document to Trash', exact=True)
        expect(dialog).to_contain_text('These records will remain')
        expect(dialog).to_contain_text(f'Synthetic template {width}')
        expect(dialog).to_contain_text('Employee monitoring advice')
        shot('document-trash-preview')
        dialog.get_by_role('button', name='Move to Trash', exact=True).click()
        expect(page.get_by_role('button', name='Restore', exact=True)).to_be_visible()
        assert not api('/templates/' + template['id']) is None
        page.goto(BASE + '/#/trash')
        trash = page.locator('.record-trash-page')
        trash.get_by_role('textbox', name='Find in Trash').fill(f'Synthetic reusable original {width}')
        expect(trash.locator('.record-trash-list li')).to_have_count(1)
        shot('record-trash')
        trash.get_by_role('button', name='Restore', exact=True).click()
        page.get_by_role('dialog', name='Restore from Trash', exact=True).get_by_role('button', name='Restore record', exact=True).click()
        expect(trash.locator('.record-trash-list li')).to_have_count(0)
        assert api('/sources/' + file['id'])['latest']['id'] == file['latest']['id']
        assert len(api('/sources/' + file['id'] + '/matters')['matters']) == 1
        # Saved outputs have the same reversible management; copies elsewhere are not removed.
        work = api('/work', {'title': f'Synthetic saved output {width}', 'request': 'A question', 'answer': 'A retained answer'})
        page.goto(BASE + '/#/work?id=' + work['id'])
        page.get_by_role('button', name='Move to Trash', exact=True).click()
        page.get_by_role('dialog', name='Move saved output to Trash', exact=True).get_by_role('button', name='Move to Trash', exact=True).click()
        expect(page.get_by_role('button', name='Restore', exact=True)).to_be_visible()
        page.get_by_role('button', name='Restore', exact=True).click()
        page.get_by_role('dialog', name='Restore from Trash', exact=True).get_by_role('button', name='Restore record', exact=True).click()
        expect(page.locator('.reading-body')).to_contain_text('A retained answer')
        assert not errors, errors
        assert not external, external
        context.close()
    browser.close()
print('Unified Practice, originals, template detail, matter filing/unlinking, document/output Trash and restore passed at desktop and mobile widths. No model calls or external requests.')
