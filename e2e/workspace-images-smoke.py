"""Screenshot drop/paste/picker and follow-up transport; synthetic data only."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:7461'
TOKEN = 'workspace-browser-test-only'
OUT = Path(__file__).parent / '.tmp' / 'workspace'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 900, 'height': 420}, reduced_motion='reduce')
    page.set_content('<html><body style="margin:0;padding:60px;background:#ffffff;font-family:Arial"><div style="padding:42px;background:#6b3ca0;color:white;font-size:42px">VIOLET LANTERN 482</div><p style="font-size:24px">Synthetic visual fixture</p></body></html>')
    picture = page.screenshot(path=str(OUT / 'image-visual-fixture.png'))
    encoded = base64.b64encode(picture).decode()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    errors, sends = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda req: sends.append(req.url) if req.url.endswith('/send') else None)
    page.goto(BASE + '/#token=' + TOKEN)
    page.wait_for_load_state('networkidle')
    field = page.get_by_role('textbox', name='Message Counsel', exact=True)
    field.fill('Image attachment fixture: discuss this screenshot.')
    page.locator('.chat-composer').evaluate('''(element, encoded) => {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'Screen.png', {type:'image/png'}));
      element.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:transfer}));
    }''', encoded)
    expect(page.get_by_role('button', name='Remove Screen.png', exact=True)).to_be_visible()
    expect(page.locator('.image-thumbnail')).to_have_count(1)
    expect(page.locator('.image-thumbnail')).to_be_visible()
    assert page.locator('.image-thumbnail').evaluate('(image) => image.complete && image.naturalWidth > 0')
    assert not sends
    assert page.evaluate('window.counselSaveDrafts()')
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(field).to_have_value('Image attachment fixture: discuss this screenshot.')
    expect(page.locator('.image-thumbnail')).to_be_visible()
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'chat-image-attached-{width}.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    field.press('Enter')
    expect(page.get_by_text('Received 1 image inputs.', exact=False)).to_be_visible(timeout=15000)
    field.fill('Image attachment fixture: follow up without reattaching.'); field.press('Enter')
    expect(page.locator('.chat-turn').nth(1)).to_contain_text('Received 1 image inputs.', timeout=15000)
    page.get_by_role('button', name='View context', exact=True).click()
    page.get_by_role('button', name='Latest response', exact=True).click()
    expect(page.get_by_text('Image 1 · supplied to model', exact=True)).to_be_visible()
    page.screenshot(path=str(OUT / 'chat-image-response-context.png'), full_page=True)
    # A real clipboard file follows the same retention path as a drop.
    page.get_by_role('button', name='New chat', exact=True).click()
    expect(page.locator('.chat-turn')).to_have_count(0)
    expect(field).to_be_enabled()
    field.fill('Image attachment fixture: clipboard screenshot.')
    field.evaluate('''(element, encoded) => {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'Clipboard.png', {type:'image/png'}));
      element.dispatchEvent(new ClipboardEvent('paste', {bubbles:true, cancelable:true, clipboardData:transfer}));
    }''', encoded)
    expect(page.get_by_role('button', name='Remove Clipboard.png', exact=True)).to_be_visible()
    assert len(sends) == 2
    # Browser-produced JPEG/WebP containers also round-trip through real intake.
    for extension, mime in [('jpg', 'image/jpeg'), ('webp', 'image/webp')]:
        data = page.evaluate('''mime => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = '#276b42'; ctx.fillRect(0,0,64,48); return canvas.toDataURL(mime).split(',')[1]; }''', mime)
        page.get_by_role('button', name='Add documents', exact=True).click()
        page.get_by_label('Upload document', exact=True).set_input_files({'name': 'Raster.' + extension, 'mimeType': mime, 'buffer': base64.b64decode(data)})
        expect(page.get_by_role('button', name='Remove Raster.' + extension, exact=True)).to_be_visible()
    expect(page.locator('.image-thumbnail')).to_have_count(3)
    field.press('Enter')
    expect(page.get_by_text('Received 3 image inputs.', exact=False)).to_be_visible(timeout=15000)
    assert not errors, errors
    browser.close()
print('PASS: screenshot drag/drop, clipboard paste, picker PNG/JPEG/WebP, thumbnails, durable draft, follow-up image inputs, visible context and 1440/390/320px layout.')
