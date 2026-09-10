"""Background browser transfer, durable local pause, reload/reselection and retries. Synthetic files only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7459'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)
HEADERS = {'Authorization': 'Bearer workspace-browser-test-only'}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors, external = [], []
    context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
    page = context.new_page()
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(BASE + '/#/imports')
    expect(page.get_by_role('heading', name='Bring your practice with you.', exact=True)).to_be_visible()

    def slow_upload_ack(target):
        target.evaluate("""() => {
          const original = window.fetch.bind(window);
          window.fetch = async (...args) => {
            const result = await original(...args);
            if (/imports\/[^/]+\/files\//.test(String(args[0])) && args[1]?.method === 'POST')
              await new Promise(resolve => setTimeout(resolve, 800));
            return result;
          };
        }""")

    def files(prefix, count):
        return [{'name': f'{prefix}-{i}.txt', 'mimeType': 'text/plain', 'buffer': f'Synthetic {prefix} document {i}'.encode()} for i in range(count)]

    def batch(batch_id):
        return context.request.get(BASE + '/api/workspace/imports/' + batch_id, headers=HEADERS).json()

    slow_upload_ack(page)
    page.get_by_label('Choose import files', exact=True).set_input_files(files('navigation', 3))
    page.wait_for_url('**/#/imports?id=*')
    first_url = page.url
    first_id = first_url.split('id=')[1]
    expect(page.get_by_text('Uploading from this browser', exact=True)).to_be_visible()
    page.screenshot(path=str(OUT / 'import-uploading-1440.png'), full_page=True)
    page.get_by_role('link', name='Chats', exact=True).click()
    expect(page.locator('.sidebar-bottom')).to_contain_text('Uploading files…')
    # The page component is now gone. All three File handles still transfer.
    page.wait_for_function("""async ({base,id,headers}) => {
      const value = await (await fetch(base+'/api/workspace/imports/'+id,{headers})).json();
      return value.progress.ready === 3;
    }""", arg={'base': BASE, 'id': first_id, 'headers': HEADERS})
    page.goto(first_url)
    expect(page.get_by_role('button', name='Review and import 3 files', exact=True)).to_be_enabled()
    assert batch(first_id)['status'] == 'review'
    assert not context.request.get(BASE+'/api/workspace',headers=HEADERS).json()['sources']

    page.goto(BASE + '/#/imports')
    slow_upload_ack(page)
    selection = files('pause', 5)
    page.get_by_label('Choose import files', exact=True).set_input_files(selection)
    page.wait_for_url('**/#/imports?id=*')
    paused_url = page.url
    paused_id = paused_url.split('id=')[1]
    page.get_by_role('button', name='Pause after current file', exact=True).click()
    expect(page.get_by_text('Import paused', exact=True)).to_be_visible()
    paused = batch(paused_id)
    assert paused['progress']['paused'] and paused['progress']['awaitingUpload'] > 0
    received = {item['id']: item['hash'] for item in paused['entries'] if item['hash']}
    assert received
    for width in [390, 1440]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'import-paused-{width}.png'), full_page=True)
    # A different tab has no browser File handles. Durable pause and copies remain.
    page.close(run_before_unload=False)
    page = context.new_page()
    page.goto(BASE + '/#token=workspace-browser-test-only')
    page.wait_for_load_state('networkidle')
    page.goto(paused_url)
    expect(page.get_by_text('Import paused', exact=True)).to_be_visible()
    page.get_by_role('button', name='Resume import', exact=True).click()
    expect(page.get_by_text('Waiting for files', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Resume your file selection', exact=True)).to_be_visible()
    uploaded_paths = []
    page.on('request', lambda request: uploaded_paths.append(request.url) if '/files/' in request.url and request.method == 'POST' else None)
    page.get_by_label('Choose import files', exact=True).set_input_files(selection)
    expect(page.get_by_role('button', name='Review and import 5 files', exact=True)).to_be_enabled()
    resumed = batch(paused_id)
    assert not resumed['progress']['paused'] and resumed['progress']['ready'] == 5
    for entry_id, digest in received.items():
        assert next(item['hash'] for item in resumed['entries'] if item['id'] == entry_id) == digest
        assert not any(url.endswith('/'+entry_id) for url in uploaded_paths)

    page.goto(BASE + '/#/imports')
    page.get_by_label('Choose import files', exact=True).set_input_files([{'name':'unreadable.pdf','mimeType':'application/pdf','buffer':b'not a PDF'}])
    page.wait_for_url('**/#/imports?id=*')
    failed_id = page.url.split('id=')[1]
    expect(page.get_by_role('button', name='Retry failed files', exact=True)).to_be_visible()
    uploads_before = len(uploaded_paths)
    revision = batch(failed_id)['revisionId']
    page.get_by_role('button', name='Retry failed files', exact=True).click()
    expect(page.get_by_text('Some files need attention', exact=True)).to_be_visible()
    assert batch(failed_id)['revisionId'] != revision
    assert len(uploaded_paths) == uploads_before
    expect(page.get_by_role('button', name='Review and import 1 files', exact=True)).to_be_disabled()
    page.screenshot(path=str(OUT / 'import-retry-1440.png'), full_page=True)
    assert not errors, errors
    assert not external, external
    browser.close()
    print('PASS: navigation-independent transfer, durable pause, tab loss/reselection without reupload, saved-copy retries, review boundary and responsive progress')
