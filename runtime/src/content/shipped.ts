import { embeddedContent, isCompiled } from '../core/embedded';
import { repoContentSource } from './repo';
import { contentSourceFor, type ContentSource } from './source';

/**
 * The shipped content, wherever this runtime is running from: the embedded
 * set in the compiled binary, the checkout (or installed plugin tree) under
 * `pluginRoot` otherwise. Every entry point that used to call
 * `repoContentSource(pluginRoot)` directly goes through here, so the binary
 * and the checkout read the same files.
 */
export function shippedContent(pluginRoot: string): ContentSource {
  return contentSourceFor({ compiled: isCompiled(), pluginRoot, repo: repoContentSource, embedded: embeddedContent });
}
