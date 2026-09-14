import { expect, test } from 'bun:test';
import { downloadWebPage, extractWebHtml, publicAddress, publicUrl, textUrls, WEB_MAX_BYTES, type WebNetwork } from './public-web';

const signal = () => AbortSignal.timeout(5000);
const html = `<html><head><title>Synthetic terms</title><script>PRIVATE SCRIPT</script></head><body>
  <nav>Navigation noise</nav><main><h1>Terms</h1><p>${'Synthetic agreed language. '.repeat(8)}</p>
  <p>Definitions <a href="/definitions?version=2&amp;edition=public">Defined words</a>.</p>
  <div hidden>Hidden instructions</div><script>fetch('https://example.org/leak')</script>
  <iframe src="http://127.0.0.1"></iframe></main></body></html>`;

test('blocks non-public addresses including numeric and mapped IPv4 forms and special IPv6 ranges', () => {
  for (const address of ['0.0.0.0', '10.1.1.1', '100.64.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1',
    '192.168.1.1', '192.0.0.8', '192.0.2.1', '192.88.99.1', '198.18.0.1', '198.51.100.1', '203.0.113.1',
    '224.0.0.1', '255.255.255.255', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '64:ff9b::7f00:1',
    '2001:db8::1', '2002:7f00:1::', '2001::1', '3fff::1', 'not-an-ip']) expect(publicAddress(address)).toBe(false);
  for (const address of ['93.184.216.34', '1.1.1.1', '2606:4700:4700::1111']) expect(publicAddress(address)).toBe(true);
  for (const url of ['file:///etc/passwd', 'ftp://example.org/file', 'https://user:pass@example.org/', 'http://2130706433',
    'http://0x7f000001', 'http://0177.0.0.1', 'http://[::ffff:127.0.0.1]', 'https://example.org:8443/',
    'http://localhost/', 'http://metadata.google.internal/', 'http://example.org./', 'https://example.org/secret\n',
    'http://example.org\\@127.0.0.1']) expect(() => publicUrl(url)).toThrow();
  expect(publicUrl('https://example.org:443/terms#definitions').href).toBe('https://example.org/terms');
  expect(textUrls('Read https://example.org/terms. Then [definitions](https://example.org/definitions).')).toEqual(['https://example.org/terms', 'https://example.org/definitions']);
  expect(textUrls('[section](https://example.org/rule_(section)).')).toEqual(['https://example.org/rule_(section)']);
});

test('resolves each redirect and pins only a checked IP; never forwards credentials or request text', async () => {
  const calls: Array<{ url: string; address: string }> = [], resolutions: string[] = [];
  const network: WebNetwork = {
    resolve: async host => { resolutions.push(host); return [{ address: '93.184.216.34', family: 4 }]; },
    request: async (url, address) => { calls.push({ url: url.href, address }); return calls.length === 1
      ? { status: 302, headers: { location: 'https://other.example.org/terms' }, bytes: Buffer.alloc(0) }
      : { status: 200, headers: { 'content-type': 'text/html' }, bytes: Buffer.from(html) }; },
  };
  const result = await downloadWebPage('https://example.org/terms', signal(), network);
  expect(result.url).toBe('https://other.example.org/terms');
  expect(resolutions).toEqual(['example.org', 'other.example.org']);
  expect(calls.every(call => call.address === '93.184.216.34')).toBe(true);
  let requested = false;
  for (const addresses of [[], [{ address: '127.0.0.1', family: 4 }], [{ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }]]) {
    await expect(downloadWebPage('https://example.org/', signal(), { resolve: async () => addresses,
      request: async () => { requested = true; throw Error('must not request'); } })).rejects.toThrow('network address');
  }
  expect(requested).toBe(false);
});

test('redirect-to-private, DNS rebinding, downgrade, loops, bad statuses and oversize fail closed', async () => {
  for (const location of ['http://127.0.0.1/', 'https://169.254.169.254/', 'file:///etc/passwd', 'http://example.org/terms', 'https://example.org/terms']) {
    let requests = 0;
    await expect(downloadWebPage('https://example.org/terms', signal(), {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => { requests++; return { status: 302, headers: { location }, bytes: Buffer.alloc(0) }; },
    })).rejects.toThrow();
    expect(requests).toBe(1);
  }
  let resolutions = 0, requests = 0;
  await expect(downloadWebPage('https://example.org/terms', signal(), {
    resolve: async () => [{ address: ++resolutions === 1 ? '93.184.216.34' : '127.0.0.1', family: 4 }],
    request: async () => { requests++; return { status: 302, headers: { location: '/new' }, bytes: Buffer.alloc(0) }; },
  })).rejects.toThrow('network address');
  expect(requests).toBe(1);
  for (const status of [401, 403, 404, 429, 500, 206]) await expect(downloadWebPage('https://example.org/', signal(), {
    resolve: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async () => ({ status, headers: {}, bytes: Buffer.from('error') }),
  })).rejects.toThrow(`HTTP ${status}`);
  await expect(downloadWebPage('https://example.org/', signal(), {
    resolve: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async () => ({ status: 200, headers: {}, bytes: Buffer.alloc(WEB_MAX_BYTES + 1) }),
  })).rejects.toThrow('5 MB');
});

test('cancellation bounds stuck DNS without opening a socket', async () => {
  const abort = new AbortController(); let requested = false;
  const operation = downloadWebPage('https://example.org/', abort.signal, {
    resolve: async () => new Promise(() => {}), request: async () => { requested = true; throw Error('not reached'); },
  });
  abort.abort(new Error('cancelled'));
  await expect(operation).rejects.toThrow('cancelled'); expect(requested).toBe(false);
});

test('inert HTML extraction preserves words and links, omits executable/hidden content and marks coverage', () => {
  const result = extractWebHtml(Buffer.from(html), 'https://example.org/terms', 'text/html; charset=utf-8');
  expect(result.title).toBe('Synthetic terms'); expect(result.extracted.body).toContain('Synthetic agreed language.');
  for (const absent of ['PRIVATE SCRIPT', 'Navigation noise', 'Hidden instructions', 'fetch(', '127.0.0.1']) expect(result.extracted.body).not.toContain(absent);
  expect(result.links).toEqual([{ url: 'https://example.org/definitions?version=2&edition=public', title: 'Defined words' }]);
  expect(result.extracted.textStatus).toBe('partial');
  expect(result.extracted.extraction.notes.join(' ')).toContain('signing date');
  for (const bad of ['<body><div id="app"></div><script>loadTerms()</script>', '<title>Just a moment</title><body>' + 'Checking your browser '.repeat(10)])
    expect(() => extractWebHtml(Buffer.from(bad), 'https://example.org/', 'text/html')).toThrow();
});
