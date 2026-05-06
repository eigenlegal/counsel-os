export function redactUrl(rawUrl: string): string {
  if (process.env.BROWSE_LOG_FULL_URLS === '1') {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const hadSearch = url.search.length > 0;
    const hadHash = url.hash.length > 0;
    url.search = '';
    url.hash = '';
    return `${url.toString()}${hadSearch ? '?[redacted]' : ''}${hadHash ? '#[redacted]' : ''}`;
  } catch {
    return rawUrl.replace(/[?#].*$/, '?[redacted]');
  }
}
