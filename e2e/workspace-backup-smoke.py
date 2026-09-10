"""Backup Settings UI and actual restore launcher, synthetic workspace only."""
import json
import base64
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7458'
TOKEN = 'workspace-browser-test-only'
repo = Path(__file__).resolve().parent.parent
artifacts = repo / 'e2e' / '.tmp' / 'workspace'
artifacts.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='counsel-backup-browser-') as temporary, sync_playwright() as p:
    root = Path(temporary)
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(BASE) else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    print('Initial actions:', page.get_by_role('button').all_text_contents())
    def api(path='', data=None):
        args = {'headers': {'Authorization': 'Bearer ' + TOKEN}}
        response = page.request.get(BASE + '/api/workspace' + path, **args) if data is None else page.request.post(BASE + '/api/workspace' + path, data=data, **args)
        assert response.ok, response.text()
        return response.json()
    original = b'Synthetic original for the recovery browser test.\n'
    source = api('/files', {'name': 'Recovery original.txt', 'base64': base64.b64encode(original).decode()})
    exported = api('/work/' + api()['savedWork'][0]['id'] + '/exports', {})
    word_response = page.request.get(BASE + '/api/workspace/exports/' + exported['id'] + '/download', headers={'Authorization': 'Bearer ' + TOKEN})
    assert word_response.ok
    word_bytes = word_response.body()
    page.get_by_role('link', name='Settings', exact=True).click()
    card = page.locator('.backup-section')
    expect(card.get_by_role('heading', name='Backup & recovery')).to_be_visible()
    with page.expect_download() as event:
        card.get_by_role('button', name='Download backup', exact=True).click()
    backup = root / event.value.suggested_filename
    event.value.save_as(str(backup))
    expect(card.get_by_role('status')).to_contain_text('Backup prepared')
    assert backup.read_bytes().startswith(b'Counsel workspace backup v1\n')
    card.get_by_label('Choose a Counsel backup').set_input_files(str(backup))
    expect(card.get_by_text('Backup verified', exact=True)).to_be_visible(timeout=15000)
    expect(card.get_by_text('Database and file checks passed. No workspace was changed.')).to_be_visible()
    card.get_by_text('Restore a separate workspace', exact=True).click()
    expect(card.locator('.backup-command')).to_contain_text('bun run workspace --restore')
    card.screenshot(path=str(artifacts / 'backup-desktop.png'))
    corrupt = root / 'corrupt.counsel-backup'
    corrupt.write_bytes(backup.read_bytes()[:-100])
    card.get_by_label('Choose a Counsel backup').set_input_files(str(corrupt))
    expect(card.get_by_role('alert')).to_contain_text('truncated')
    expect(card.get_by_text('Backup verified', exact=True)).to_have_count(0)
    card.get_by_label('Choose a Counsel backup').set_input_files(str(backup))
    expect(card.get_by_text('Backup verified', exact=True)).to_be_visible()
    page.set_viewport_size({'width': 390, 'height': 844})
    card.scroll_into_view_if_needed()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    card.screenshot(path=str(artifacts / 'backup-mobile.png'))
    assert not errors, errors
    assert not external, external
    browser.close()

    bun = shutil.which('bun')
    checked = subprocess.run([bun, 'run', 'workspace', '--check-backup', str(backup)], cwd=repo, capture_output=True, text=True, timeout=20)
    assert checked.returncode == 0 and 'Backup verified:' in checked.stdout, checked.stderr
    # Use a fresh parent folder and a different port. No user workspace is opened.
    log_path = root / 'restore.log'
    with log_path.open('w') as log:
        child = subprocess.Popen([bun, 'run', 'workspace', '--restore', str(backup), '--restore-root', str(root / 'recovered'), '--no-open', '--skip-build', '--port', '7468'], cwd=repo, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 20
            launch_url = None
            while time.monotonic() < deadline:
                match = re.search(r'^Open: (http://[^\s]+)', log_path.read_text(), re.MULTILINE)
                if match:
                    launch_url = match.group(1)
                    break
                assert child.poll() is None, 'Restore launcher exited before opening the new workspace'
                time.sleep(.05)
            assert launch_url, 'Restore did not open its new workspace'
            parsed = urlparse(launch_url)
            token = parsed.fragment.split('token=', 1)[1]
            origin = f'{parsed.scheme}://{parsed.netloc}'
            with urlopen(Request(origin + '/api/workspace', headers={'Authorization': 'Bearer ' + token}), timeout=5) as response:
                snapshot = json.load(response)
            assert snapshot['totals']['matters'] == 3
            assert snapshot['connection']['config'] is None
            assert snapshot['demo'] is False
            assert str(root / 'recovered') in snapshot['databasePath']
            assert Path(snapshot['databasePath']).exists()
            for route, expected in [('/source-revisions/' + source['latest']['id'] + '/original', original), ('/exports/' + exported['id'] + '/download', word_bytes)]:
                with urlopen(Request(origin + '/api/workspace' + route, headers={'Authorization': 'Bearer ' + token}), timeout=5) as response:
                    assert response.read() == expected
        finally:
            child.terminate()
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=5)
    print('PASS: backup download, verification, damaged-copy rejection/retry, mobile layout, offline check and real restore launcher; no model calls')
