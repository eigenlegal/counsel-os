"""Real UI management flows on synthetic imports only. No model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    index = 0
    for engine in ['chromium', 'webkit']:
        browser = getattr(p, engine).launch(headless=True)
        for width in [1440, 390]:
            index += 1
            title = f'Synthetic retrospective {index}'
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
            page.goto(BASE + '/#token=workspace-browser-test-only')
            page.wait_for_load_state('networkidle')
            page.goto(BASE + '/#/knowledge')
            page.get_by_role('textbox', name='Search practice', exact=True).fill(title)
            row = page.locator('.resource-row').filter(has=page.get_by_text(title, exact=True))
            expect(row).to_be_visible()
            expect(row).not_to_contain_text('abcdef')
            row.click()
            expect(page.locator('.reader-heading h1')).to_have_text(title)
            actions = page.locator('.practice-management-actions')
            expect(actions.get_by_role('button', name='Move to Trash')).to_be_visible()
            boxes = [actions.get_by_role('button', name=name).bounding_box() for name in ['File as document', 'Move to Trash']]
            assert boxes[1]['y'] - boxes[0]['y'] - boxes[0]['height'] >= 9
            page.screenshot(path=str(OUT / f'practice-management-{engine}-{width}.png'), animations='disabled')
            actions.get_by_role('button', name='Move to Trash').click()
            dialog = page.get_by_role('dialog', name='Move practice item to Trash')
            expect(dialog.get_by_text('These records will remain')).to_be_visible()
            dialog.get_by_role('button', name='Move to Trash', exact=True).click()
            expect(page.locator('.trashed-record')).to_contain_text('practice item is in Trash')
            expect(page.get_by_role('heading', name='Original files')).to_be_visible()
            page.goto(BASE + '/#/trash')
            page.get_by_role('button', name='Practice items').click()
            entry = page.locator('.record-trash-list li').filter(has=page.get_by_text(title, exact=True))
            expect(entry).to_be_visible()
            entry.get_by_role('button', name='Restore', exact=True).click()
            page.get_by_role('dialog', name='Restore from Trash').get_by_role('button', name='Restore record').click()
            expect(entry).to_have_count(0)
            page.goto(BASE + '/#/knowledge')
            page.get_by_role('textbox', name='Search practice', exact=True).fill(title)
            page.locator('.resource-row').filter(has=page.get_by_text(title, exact=True)).click()
            page.get_by_role('button', name='File as document', exact=True).click()
            dialog = page.get_by_role('dialog', name='File as document')
            expect(dialog.get_by_role('button', name='File document and remove guidance')).to_be_disabled()
            dialog.get_by_role('button', name='Matter', exact=True).click()
            picker = page.get_by_role('dialog', name='Choose a matter')
            picker.get_by_role('combobox', name='Search matters').fill('Synthetic reporting matter')
            picker.get_by_role('option', name='Synthetic reporting matter', exact=False).click()
            expect(picker).to_have_count(0)
            assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
            page.screenshot(path=str(OUT / f'practice-filing-{engine}-{width}.png'), animations='disabled')
            dialog.get_by_role('button', name='File document and remove guidance').click()
            expect(dialog).to_have_count(0)
            expect(page.locator('.reader-heading h1')).to_have_text(title)
            expect(page.locator('.source-matters')).to_contain_text('Synthetic reporting matter')
            expect(page.locator('.record-management')).to_contain_text('Manage document')
            page.goto(BASE + '/#/knowledge')
            page.get_by_role('textbox', name='Search practice', exact=True).fill(title)
            expect(page.get_by_role('heading', name='No practice materials here')).to_be_visible()
            assert not errors, errors
            assert not external, external
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            context.close()
        browser.close()
print('Practice title cleanup, Trash/restore, and matter filing passed in Chromium/WebKit at desktop/mobile widths. No external requests or model calls.')
