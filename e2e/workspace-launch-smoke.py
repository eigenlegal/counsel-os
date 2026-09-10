"""Exercise the actual workspace launch command and a clean stop/reopen.

Uses an explicitly selected temporary database, no browser opening, and no
model calls. Build the UI first. Never prints the ephemeral launch token.
"""
import json
import os
import hashlib
import base64
import io
import re
import shutil
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from http.client import HTTPConnection

repo = Path(__file__).resolve().parent.parent
bun = shutil.which('bun')
assert bun, 'Bun is required'
with tempfile.TemporaryDirectory(prefix='counsel-workspace-launch-') as directory:
    root = Path(directory)
    database = root / 'workspace.sqlite3'
    created_id = None
    source_revision_id = None
    word_export = None
    word_bytes = None
    fixtures = json.loads(subprocess.check_output([bun, 'e2e/workspace-document-fixtures.ts'], cwd=repo))
    large_document = io.BytesIO(base64.b64decode(fixtures['Synthetic notice.docx']))
    with zipfile.ZipFile(large_document, 'a', compression=zipfile.ZIP_STORED) as package:
        package.writestr('word/media/synthetic-padding.bin', b'x' * 2_500_000)
    original = large_document.getvalue()
    assert len(original) > 2_200_000
    for attempt in range(2):
        log_path = root / f'launch-{attempt}.log'
        with log_path.open('w') as log:
            command = [os.environ['WORKSPACE_TEST_ENGINE']] if os.environ.get('WORKSPACE_TEST_ENGINE') else [bun, 'run', 'workspace']
            process = subprocess.Popen(command + ['--demo', '--skip-build', '--no-open', '--port', '7460', '--database', str(database)], cwd=repo, stdout=log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + 15
                launch_url = None
                while time.monotonic() < deadline:
                    output = log_path.read_text()
                    match = re.search(r'^Open: (http://[^\s]+)', output, re.MULTILINE)
                    if match:
                        launch_url = match.group(1)
                        break
                    assert process.poll() is None, 'Workspace launcher exited before becoming ready'
                    time.sleep(.05)
                assert launch_url, 'Workspace launcher did not become ready'
                parsed = urlparse(launch_url)
                token = parsed.fragment.split('token=', 1)[1]
                origin = f'{parsed.scheme}://{parsed.netloc}'
                with urlopen(origin, timeout=5) as response:
                    assert 'workspace-' in response.read().decode()
                if os.environ.get('WORKSPACE_TEST_UI_MANIFEST'):
                    for item in json.loads(Path(os.environ['WORKSPACE_TEST_UI_MANIFEST']).read_text()):
                        assert '..' not in item['name'] and not item['name'].startswith('/')
                        with urlopen(origin + '/' + item['name'], timeout=5) as response:
                            assert hashlib.sha256(response.read()).hexdigest() == item['sha256'], 'Served packaged UI differs from its manifest'
                def api(path='', data=None):
                    req = Request(origin + '/api/workspace' + path, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, data=None if data is None else json.dumps(data).encode())
                    with urlopen(req, timeout=25) as response:
                        return json.load(response)
                snapshot = api()
                assert snapshot['demo'] is True
                assert snapshot['totals']['matters'] == (3 if attempt == 0 else 4)
                if attempt == 0:
                    word_export = api('/work/' + snapshot['savedWork'][0]['id'] + '/exports', {})
                    created_id = api('/matters', {'title': 'Restart persistence check'})['id']
                    source = api('/files', {'name': 'Large synthetic document.docx', 'base64': base64.b64encode(original).decode(), 'matterId': created_id})
                    source_revision_id = source['latest']['id']
                    assert 'Written notice is required.' in source['latest']['body']
                    # The larger upload limit must not widen ordinary record routes.
                    oversized = HTTPConnection(parsed.hostname, parsed.port, timeout=5)
                    try:
                        oversized.putrequest('POST', '/api/workspace/matters')
                        oversized.putheader('Authorization', 'Bearer ' + token)
                        oversized.putheader('Content-Type', 'application/json')
                        oversized.putheader('Content-Length', '2300000')
                        oversized.endheaders()
                        # Rejected from headers, without transmitting an oversized body.
                        response = oversized.getresponse()
                        assert response.status == 413
                        response.read()
                    finally:
                        oversized.close()
                else:
                    assert api('/matters/' + created_id)['title'] == 'Restart persistence check'
                download = Request(origin + '/api/workspace/source-revisions/' + source_revision_id + '/original', headers={'Authorization': 'Bearer ' + token})
                with urlopen(download, timeout=5) as response:
                    assert response.read() == original
                document = Request(origin + '/api/workspace/exports/' + word_export['id'] + '/download', headers={'Authorization': 'Bearer ' + token})
                with urlopen(document, timeout=5) as response:
                    downloaded = response.read()
                    if attempt == 0:
                        word_bytes = downloaded
                    else:
                        assert downloaded == word_bytes
                        assert api('/work/' + word_export['workId'] + '/exports', {}) == word_export
                print(f'PASS: Actual launcher, large Word upload, exact original/export downloads, bounded record routes, and {"first start" if attempt == 0 else "persistent restart without duplicate seed or exports"}')
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
