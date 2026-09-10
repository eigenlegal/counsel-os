"""Large folder review uses bounded pages and whole-import consent. Synthetic files only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7459'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors, external, acknowledgements = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
    def received(response):
        if '/files/' in response.url and response.request.method == 'POST':
            acknowledgements.append(len(response.body()))
    page.on('response', received)
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/imports')
    expect(page.get_by_text('up to 10,000 files and 1 GB staged', exact=False)).to_be_visible()
    transfer = page.evaluate_handle("""() => {
      const data = new DataTransfer();
      for (let i=0; i<601; i++) data.items.add(new File(['Synthetic folder evidence. '.repeat(80)], 'record-'+String(i).padStart(4,'0')+'.txt', {type:'text/plain'}));
      return data;
    }""")
    page.locator('.import-dropzone').dispatch_event('drop', {'dataTransfer': transfer})
    page.wait_for_url('**/#/imports?id=*')
    expect(page.get_by_role('button', name='Review and import 601 files', exact=True)).to_be_enabled(timeout=60000)
    expect(page.locator('.import-row')).to_have_count(50)
    expect(page.get_by_text('1–50 of 601 files', exact=True)).to_be_visible()
    page.get_by_role('button', name='Next page', exact=True).click()
    expect(page.get_by_text('51–100 of 601 files', exact=True)).to_be_visible()
    page.get_by_label('Find import files', exact=True).fill('record-0600')
    expect(page.locator('.import-row')).to_have_count(1)
    page.get_by_role('button', name='Review record-0600.txt', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_label('Import destination', exact=True).select_option('template')
    dialog.get_by_label('Imported template use', exact=True).fill('Synthetic browser-test starting point.')
    dialog.get_by_role('button', name='Save import choice', exact=True).click()
    expect(dialog).to_have_count(0)
    expect(page.locator('.import-row')).to_have_count(1)
    page.get_by_label('Find import files', exact=True).fill('record-0000')
    expect(page.locator('.import-row')).to_contain_text('record-0000.txt')
    page.get_by_role('button', name='Review and import 601 files', exact=True).click()
    expect(dialog.get_by_text('not just the current page or search results', exact=False)).to_be_visible()
    expect(dialog.get_by_role('button', name='Import into workspace', exact=True)).to_be_disabled()
    expect(dialog.get_by_role('checkbox', name='Make 1 templates available', exact=False)).to_be_visible()
    dialog.get_by_role('button', name='Back to review', exact=True).click()
    page.get_by_label('Find import files', exact=True).fill('')
    page.get_by_label('Filter import files', exact=True).select_option('attention')
    expect(page.get_by_text('No matching files', exact=True)).to_be_visible()
    page.get_by_label('Filter import files', exact=True).select_option('ready')
    expect(page.locator('.import-row')).to_have_count(50)
    for width in [1440, 390]:
        page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
        page.locator('.import-filter-bar').scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'import-large-{width}.png'))
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.get_by_role('button', name='Review and import 601 files', exact=True).click()
    dialog.get_by_role('checkbox', name='Make 1 templates available', exact=False).check()
    dialog.get_by_role('button', name='Import into workspace', exact=True).click()
    expect(page.get_by_text('601 originals imported', exact=False)).to_be_visible(timeout=30000)
    assert len(acknowledgements) == 601 and max(acknowledgements) < 100, (len(acknowledgements), max(acknowledgements, default=0))
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: 601 browser uploads, constant-size acknowledgements, 50-row pages, search/status filters, off-page template consent, whole-batch commit and responsive layout; no model calls')
