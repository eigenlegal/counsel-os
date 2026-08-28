/**
 * Environment variables a harness child process may inherit beyond its
 * pinned essentials. These are transport-level (proxy / CA) settings: without
 * them the vendor CLI cannot reach its API behind a corporate proxy or a
 * TLS-intercepting middlebox. Credentials and API keys are deliberately NOT
 * on this list — the whole point of the pin is that they never reach the child.
 */
export const TRANSPORT_ENV_VARS = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'] as const;

export function transportEnv(base: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of TRANSPORT_ENV_VARS) {
    const v = base[k];
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out;
}
