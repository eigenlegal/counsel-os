"""Explicit adoption and export presentation, using synthetic data only. No model calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    for engine in ['chromium', 'webkit']:
        browser = getattr(p, engine).launch(headless=True)
        for width in [1440, 390]:
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            context.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
            page.goto(BASE + '/#token=workspace-browser-test-only')
            page.wait_for_load_state('networkidle')
            page.goto(BASE + '/#/knowledge')
            page.get_by_role('textbox', name='Search practice', exact=True).fill('Synthetic standard')
            expect(page.locator('.resource-row').first).to_be_visible()
            expect(page.locator('.resource-list')).not_to_contain_text('Saved review status')
            expect(page.locator('.resource-list')).not_to_contain_text('4ddf384e')
            page.screenshot(path=str(OUT / f'standards-library-{engine}-{width}.png'), animations='disabled')
            page.get_by_role('button', name='Review imported material').click()
            dialog = page.get_by_role('dialog', name='Review imported material')
            expect(dialog.get_by_role('checkbox', name='Select this page')).not_to_be_checked()
            expect(dialog.get_by_role('button', name='Approve items', exact=True)).to_be_disabled()
            first = dialog.locator('.standard-choice input').first
            title = dialog.locator('.standard-choice strong').first.inner_text()
            dialog.get_by_role('button', name='Read ' + title, exact=True).click()
            expect(dialog.locator('.document-markdown')).to_contain_text('Keep a written record')
            expect(dialog.locator('.document-markdown')).not_to_contain_text('Saved review status')
            dialog.get_by_role('button', name='Hide ' + title, exact=True).click()
            first.check()
            expect(dialog.get_by_role('button', name='Approve 1 item')).to_be_disabled()
            dialog.get_by_role('checkbox', name='Use the selected material in my practice.').check()
            assert dialog.locator('.standard-choice').first.evaluate('(e) => getComputedStyle(e).flexDirection') == 'row'
            cancel_box = dialog.get_by_role('button', name='Close', exact=True).bounding_box()
            adopt_box = dialog.get_by_role('button', name='Approve 1 item').bounding_box()
            assert adopt_box['x'] - (cancel_box['x'] + cancel_box['width']) >= 8
            assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT / f'standards-confirm-{engine}-{width}.png'), animations='disabled')
            dialog.get_by_role('button', name='Approve 1 item').click()
            expect(dialog.get_by_text('Approved 1 item. The list below shows what remains.', exact=True)).to_be_visible()
            expect(dialog.get_by_role('checkbox', name=title, exact=True)).to_have_count(0)
            dialog.get_by_role('button', name='Close', exact=True).click()
            expect(dialog).to_have_count(0)
            expect(page.get_by_text('1 imported item is now in use.', exact=False)).to_be_visible()
            row = page.locator('.resource-row').filter(has=page.get_by_text(title, exact=True))
            expect(row).to_contain_text('Standing guidance')
            expect(row).not_to_contain_text('Needs review')
            row.click()
            expect(page.get_by_role('heading', name=title, exact=True).first).to_be_visible()
            expect(page.locator('.reader-heading')).not_to_contain_text('4ddf38')
            assert not errors, errors
            assert not external, external
            context.close()
        browser.close()
print('Imported-standard adoption, clean titles, metadata, and responsive layout passed in Chromium and WebKit at desktop/mobile widths. No external requests or model calls.')
