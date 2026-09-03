import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { useState } from 'react';
import { TOKEN_KEY } from '../../api/token';
import { BEDROCK_FIELDS, VERTEX_FIELDS } from '../vendors';
import { EnterpriseFields, type EnterpriseFieldsProps } from './EnterpriseFields';

/** The row's non-secret fields as the form holds them: state, so a typed
 * character lands in the controlled input the way it does on the page. */
function Host(props: Omit<EnterpriseFieldsProps, 'extra' | 'onExtraChange'> & { initial: Record<string, string>; seen: Record<string, string> }): JSX.Element {
  const [extra, setExtra] = useState(props.initial);
  return (
    <EnterpriseFields
      {...props}
      extra={extra}
      onExtraChange={(name, value) => {
        props.seen[name] = value;
        setExtra(prev => ({ ...prev, [name]: value }));
      }}
    />
  );
}

const realFetch = globalThis.fetch;
let calls: Array<{ method: string; url: string; body?: unknown }> = [];
let status = 204;

beforeEach(() => {
  calls = [];
  status = 204;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: init?.method ?? 'GET', url: String(input), ...(init?.body === undefined ? {} : { body: JSON.parse(String(init.body)) }) });
    return status === 204
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ error: 'the Amazon Bedrock credentials are incomplete', issues: [{ path: ['fields', 'secretAccessKey'], message: 'the access key id and the secret access key go together' }] }), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('EnterpriseFields (providers spec §3 step 5)', () => {
  test('the non-secret fields are plain inputs bound to the row; the secret ones are masked, sent as one PUT, and nowhere afterwards', async () => {
    const seen: Record<string, string> = {};
    let changed = 0;
    render(
      <Host
        id="bedrock/us.anthropic.claude-sonnet-5-v1:0"
        rowKey="r1"
        vendorName="Amazon Bedrock"
        fields={BEDROCK_FIELDS}
        initial={{ region: 'us-east-1' }}
        seen={seen}
        keySet={false}
        setup="https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html"
        where="keychain"
        onChanged={() => { changed += 1; }}
      />,
    );
    const region = screen.getByLabelText('Region') as HTMLInputElement;
    expect(region.value).toBe('us-east-1');
    expect(region.type).toBe('text');
    await userEvent.type(screen.getByLabelText('AWS profile (optional)'), 'firm');
    expect(seen['profile']).toBe('firm');
    // Nothing secret is shown before the operator asks.
    expect(screen.queryByLabelText('Access key id')).toBeNull();
    expect(screen.getByText('not set')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'how to set up Amazon Bedrock' }).getAttribute('href')).toContain('aws.amazon.com');

    await userEvent.click(screen.getByRole('button', { name: 'paste credentials' }));
    const keyId = screen.getByLabelText('Access key id') as HTMLInputElement;
    const secret = screen.getByLabelText('Secret access key') as HTMLInputElement;
    expect(keyId.type).toBe('password');
    expect(secret.type).toBe('password');
    expect(screen.getByText(/They go to your Keychain as one item/)).toBeTruthy();
    await userEvent.type(keyId, 'AKIA-ui-1');
    await userEvent.type(secret, 'wJalr-ui-2');
    await userEvent.click(screen.getByRole('button', { name: 'Save credentials' }));
    await waitFor(() => expect(changed).toBe(1));
    // One PUT, one item; the id's segments are URL-encoded (`:` → `%3A`), which the server decodes.
    expect(calls).toEqual([{ method: 'PUT', url: '/providers/bedrock/us.anthropic.claude-sonnet-5-v1%3A0/key', body: { fields: { accessKeyId: 'AKIA-ui-1', secretAccessKey: 'wJalr-ui-2' } } }]);
    // The form is gone and the values with it.
    expect(screen.queryByLabelText('Access key id')).toBeNull();
    expect(document.body.innerHTML).not.toContain('AKIA-ui-1');
    expect(document.body.innerHTML).not.toContain('wJalr-ui-2');
  });

  test('set: replace and remove; the default chain and the environment read as such; a 400 shows the issue', async () => {
    let changed = 0;
    render(<EnterpriseFields id="vertex/gemini-2.5-pro" rowKey="r2" vendorName="Google Vertex AI" fields={VERTEX_FIELDS} extra={{ project: 'p', location: 'us-central1' }} onExtraChange={() => {}} keySet={true} where="file" onChanged={() => { changed += 1; }} />);
    expect(screen.getByText('set')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'replace' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(changed).toBe(1));
    expect(calls).toEqual([{ method: 'DELETE', url: '/providers/vertex/gemini-2.5-pro/key' }]);
    cleanup();

    render(<EnterpriseFields id="vertex/gemini-2.5-pro" rowKey="r3" vendorName="Google Vertex AI" fields={VERTEX_FIELDS} extra={{}} onExtraChange={() => {}} keySet="default-chain" where="keychain" onChanged={() => {}} />);
    expect(screen.getByText('default credentials on this machine')).toBeTruthy();
    // The service account is a masked textarea; still offered as a paste.
    await userEvent.click(screen.getByRole('button', { name: 'paste credentials' }));
    const sa = screen.getByLabelText('Service account JSON (optional)') as HTMLTextAreaElement;
    expect(sa.tagName).toBe('TEXTAREA');
    expect(sa.className).toContain('v2-secret');
    cleanup();

    render(<EnterpriseFields id="bedrock/m" rowKey="r4" vendorName="Amazon Bedrock" fields={BEDROCK_FIELDS} extra={{}} onExtraChange={() => {}} keySet="env" where="libsecret" onChanged={() => {}} />);
    expect(screen.getByText('from the environment')).toBeTruthy();
    status = 400;
    await userEvent.click(screen.getByRole('button', { name: 'paste credentials' }));
    await userEvent.type(screen.getByLabelText('Access key id'), 'AKIA-only');
    await userEvent.click(screen.getByRole('button', { name: 'Save credentials' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('go together'));
  });

  test('a provider not set up yet can still take its credentials — that is the order the work happens in', () => {
    // It used to say "save the row, then paste the credentials here", which
    // could not be done: the row will not save without a model, and the
    // vendor will not list its models without credentials to sign the
    // request with.
    render(<EnterpriseFields id="azure/" rowKey="r5" vendorName="Azure OpenAI" fields={[{ name: 'resourceName', label: 'Resource name', secret: false, required: true }, { name: 'apiKey', label: 'API key', secret: true, required: true }]} extra={{}} onExtraChange={() => {}} keySet={undefined} where="keychain" onChanged={() => {}} />);
    expect(screen.getByRole('button', { name: 'paste credentials' })).toBeTruthy();
    expect(screen.getByText('not set')).toBeTruthy();
    expect(screen.getByLabelText('Resource name')).toBeTruthy();
    cleanup();
    render(<EnterpriseFields id="azure/dep" rowKey="r6" vendorName="Azure OpenAI" fields={[]} extra={{}} onExtraChange={() => {}} keySet={false} where={null} onChanged={() => {}} />);
    expect(screen.getByText(/no key store; set them in the environment/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'paste credentials' })).toBeNull();
  });
});
