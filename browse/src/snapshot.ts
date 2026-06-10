/**
 * Snapshot command — accessibility tree with ref-based element selection
 *
 * Architecture (Locator map — no DOM mutation):
 *   1. page.locator(scope).ariaSnapshot() → YAML-like accessibility tree
 *   2. Parse tree, assign refs @e1, @e2, ...
 *   3. Build Playwright Locator for each ref (getByRole + nth)
 *   4. Store Map<string, Locator> on BrowserManager
 *   5. Return compact text output with refs prepended
 *
 * Extended features:
 *   --diff / -D:       Compare against last snapshot, return unified diff
 *   --annotate / -a:   Screenshot with overlay boxes at each @ref
 *   --output / -o:     Output path for annotated screenshot
 *   -C / --cursor-interactive: Scan for cursor:pointer/onclick/tabindex elements
 *
 * Later: "click @e3" → look up Locator → locator.click()
 */

import type { Page, Locator } from 'playwright';
import type { BrowserManager } from './browser-manager';
import { diffLines } from './simple-diff';
import * as path from 'path';

// Roles considered "interactive" for the -i flag
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
  'listbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab',
  'treeitem',
]);

interface SnapshotOptions {
  interactive?: boolean;       // -i: only interactive elements
  compact?: boolean;           // -c: remove empty structural elements
  depth?: number;              // -d N: limit tree depth
  selector?: string;           // -s SEL: scope to CSS selector
  diff?: boolean;              // -D / --diff: diff against last snapshot
  annotate?: boolean;          // -a / --annotate: annotated screenshot
  outputPath?: string;         // -o / --output: path for annotated screenshot
  cursorInteractive?: boolean; // -C / --cursor-interactive: scan cursor:pointer etc.
}

interface ParsedNode {
  indent: number;
  role: string;
  name: string | null;
  props: string;      // e.g., "[level=1]"
  children: string;   // inline text content after ":"
  rawLine: string;
}

/**
 * Parse CLI args into SnapshotOptions
 */
export function parseSnapshotArgs(args: string[]): SnapshotOptions {
  const opts: SnapshotOptions = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-i':
      case '--interactive':
        opts.interactive = true;
        break;
      case '-c':
      case '--compact':
        opts.compact = true;
        break;
      case '-d':
      case '--depth':
        const depthArg = args[++i];
        if (!depthArg) throw new Error('Usage: snapshot -d <number>');
        opts.depth = parseInt(depthArg, 10);
        if (isNaN(opts.depth!)) throw new Error('Usage: snapshot -d <number>');
        break;
      case '-s':
      case '--selector':
        opts.selector = args[++i];
        if (!opts.selector) throw new Error('Usage: snapshot -s <selector>');
        break;
      case '-D':
      case '--diff':
        opts.diff = true;
        break;
      case '-a':
      case '--annotate':
        opts.annotate = true;
        break;
      case '-o':
      case '--output':
        opts.outputPath = args[++i];
        if (!opts.outputPath) throw new Error('Usage: snapshot -o <path>');
        break;
      case '-C':
      case '--cursor-interactive':
        opts.cursorInteractive = true;
        break;
      default:
        throw new Error(`Unknown snapshot flag: ${args[i]}`);
    }
  }
  return opts;
}

/**
 * Parse one line of ariaSnapshot output.
 *
 * Format examples:
 *   - heading "Test" [level=1]
 *   - link "Link A":
 *     - /url: /a
 *   - textbox "Name"
 *   - paragraph: Some text
 *   - combobox "Role":
 */
function parseLine(line: string): ParsedNode | null {
  // Match: (indent)(- )(role)( "name")?( [props])?(: inline)?
  const match = line.match(/^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(\[.*?\]))?\s*(?::\s*(.*))?$/);
  if (!match) {
    // Skip metadata lines like "- /url: /a"
    return null;
  }
  const indent = match[1] ?? '';
  const role = match[2];
  if (!role) return null;
  return {
    indent: indent.length,
    role,
    name: match[3] ?? null,
    props: match[4] || '',
    children: match[5]?.trim() || '',
    rawLine: line,
  };
}

export interface PlannedRef {
  ref: string;
  role: string;
  name: string | null;
  /** Index for locator.nth() when role+name is ambiguous; null when unique. */
  nthIndex: number | null;
  outputLine: string;
}

/**
 * Pure planning pass: parse the aria tree, apply filters, assign refs, and
 * compute nth() indices. Counting happens for EVERY parsed node — filtered or
 * not — because nth() indexes into the full page, not the filtered view.
 * (Depth/compact-filtered duplicates previously skipped counting, shifting
 * later refs onto the wrong elements.)
 */
export function planSnapshot(
  ariaText: string,
  opts: SnapshotOptions
): { items: PlannedRef[]; outputLines: string[] } {
  const lines = ariaText.split('\n');

  // First pass: count role+name pairs for disambiguation
  const roleNameCounts = new Map<string, number>();
  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;
    const key = `${node.role}:${node.name || ''}`;
    roleNameCounts.set(key, (roleNameCounts.get(key) || 0) + 1);
  }

  // Second pass: assign refs
  const roleNameSeen = new Map<string, number>();
  const items: PlannedRef[] = [];
  const outputLines: string[] = [];
  let refCounter = 1;

  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;

    const key = `${node.role}:${node.name || ''}`;
    const seenIndex = roleNameSeen.get(key) || 0;
    roleNameSeen.set(key, seenIndex + 1);

    const depth = Math.floor(node.indent / 2);
    const isInteractive = INTERACTIVE_ROLES.has(node.role);

    // Filters — counting above already happened, so nth stays aligned
    if (opts.depth !== undefined && depth > opts.depth) continue;
    if (opts.interactive && !isInteractive) continue;
    if (opts.compact && !isInteractive && !node.name && !node.children) continue;

    const ref = `e${refCounter++}`;
    const indent = '  '.repeat(depth);
    let outputLine = `${indent}@${ref} [${node.role}]`;
    if (node.name) outputLine += ` "${node.name}"`;
    if (node.props) outputLine += ` ${node.props}`;
    if (node.children) outputLine += `: ${node.children}`;

    const totalCount = roleNameCounts.get(key) || 1;
    items.push({
      ref,
      role: node.role,
      name: node.name,
      nthIndex: totalCount > 1 ? seenIndex : null,
      outputLine,
    });
    outputLines.push(outputLine);
  }

  return { items, outputLines };
}

/**
 * Take an accessibility snapshot and build the ref map.
 */
export async function handleSnapshot(
  args: string[],
  bm: BrowserManager
): Promise<string> {
  const opts = parseSnapshotArgs(args);
  const page = bm.getPage();

  // Get accessibility tree via ariaSnapshot
  let rootLocator: Locator;
  if (opts.selector) {
    rootLocator = page.locator(opts.selector);
    const count = await rootLocator.count();
    if (count === 0) throw new Error(`Selector not found: ${opts.selector}`);
  } else {
    rootLocator = page.locator('body');
  }

  const ariaText = await rootLocator.ariaSnapshot();
  if (!ariaText || ariaText.trim().length === 0) {
    bm.setRefMap(new Map());
    return '(no accessible elements found)';
  }

  // Plan refs from the aria tree (pure, testable), then build a Playwright
  // locator for each planned ref.
  const { items, outputLines } = planSnapshot(ariaText, opts);
  const refMap = new Map<string, Locator>();
  const output: string[] = [...outputLines];

  for (const item of items) {
    let locator: Locator;
    if (opts.selector) {
      locator = page.locator(opts.selector).getByRole(item.role as any, {
        name: item.name || undefined,
      });
    } else {
      locator = page.getByRole(item.role as any, {
        name: item.name || undefined,
      });
    }

    // Disambiguate with nth() if multiple elements share role+name
    if (item.nthIndex !== null) {
      locator = locator.nth(item.nthIndex);
    }

    refMap.set(item.ref, locator);
  }

  // ─── Cursor-interactive scan (-C) ─────────────────────────
  if (opts.cursorInteractive) {
    try {
      const cursorElements = await page.evaluate(() => {
        const STANDARD_INTERACTIVE = new Set([
          'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS',
        ]);

        const results: Array<{ selector: string; text: string; reason: string }> = [];
        const allElements = document.querySelectorAll('*');

        for (const el of allElements) {
          // Skip standard interactive elements (already in ARIA tree)
          if (STANDARD_INTERACTIVE.has(el.tagName)) continue;
          // Skip hidden elements
          if (!(el as HTMLElement).offsetParent && el.tagName !== 'BODY') continue;

          const style = getComputedStyle(el);
          const hasCursorPointer = style.cursor === 'pointer';
          const hasOnclick = el.hasAttribute('onclick');
          const hasTabindex = el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex')!, 10) >= 0;
          const hasRole = el.hasAttribute('role');

          if (!hasCursorPointer && !hasOnclick && !hasTabindex) continue;
          // Skip if it has an ARIA role (likely already captured)
          if (hasRole) continue;

          // Build deterministic nth-child CSS path
          const parts: string[] = [];
          let current: Element | null = el;
          while (current && current !== document.documentElement) {
            const parent: Element | null = current.parentElement;
            if (!parent) break;
            const siblings = [...parent.children];
            const index = siblings.indexOf(current) + 1;
            parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = parent;
          }
          const selector = parts.join(' > ');

          const text = (el as HTMLElement).innerText?.trim().slice(0, 80) || el.tagName.toLowerCase();
          const reasons: string[] = [];
          if (hasCursorPointer) reasons.push('cursor:pointer');
          if (hasOnclick) reasons.push('onclick');
          if (hasTabindex) reasons.push(`tabindex=${el.getAttribute('tabindex')}`);

          results.push({ selector, text, reason: reasons.join(', ') });
        }
        return results;
      });

      if (cursorElements.length > 0) {
        output.push('');
        output.push('── cursor-interactive (not in ARIA tree) ──');
        let cRefCounter = 1;
        for (const elem of cursorElements) {
          const ref = `c${cRefCounter++}`;
          const locator = page.locator(elem.selector);
          refMap.set(ref, locator);
          output.push(`@${ref} [${elem.reason}] "${elem.text}"`);
        }
      }
    } catch {
      output.push('');
      output.push('(cursor scan failed — CSP restriction)');
    }
  }

  // Store ref map on BrowserManager
  bm.setRefMap(refMap);

  if (output.length === 0) {
    return '(no interactive elements found)';
  }

  const snapshotText = output.join('\n');

  // ─── Annotated screenshot (-a) ────────────────────────────
  if (opts.annotate) {
    const screenshotPath = opts.outputPath || '/tmp/browse-annotated.png';
    // Validate output path (consistent with screenshot/pdf/responsive)
    const resolvedPath = path.resolve(screenshotPath);
    const safeDirs = ['/tmp', process.cwd()];
    if (!safeDirs.some((dir: string) => resolvedPath === dir || resolvedPath.startsWith(dir + '/'))) {
      throw new Error(`Path must be within: ${safeDirs.join(', ')}`);
    }
    try {
      // Inject overlay divs at each ref's bounding box
      const boxes: Array<{ ref: string; box: { x: number; y: number; width: number; height: number } }> = [];
      for (const [ref, locator] of refMap) {
        try {
          const box = await locator.boundingBox({ timeout: 1000 });
          if (box) {
            boxes.push({ ref: `@${ref}`, box });
          }
        } catch {
          // Element may be offscreen or hidden — skip
        }
      }

      await page.evaluate((boxes) => {
        // boundingBox() is viewport-relative; these overlays are absolutely
        // positioned in the document — add the scroll offset so annotations
        // line up on scrolled pages and full-page screenshots.
        const sx = window.scrollX;
        const sy = window.scrollY;
        for (const { ref, box } of boxes) {
          const overlay = document.createElement('div');
          overlay.className = '__browse_annotation__';
          overlay.style.cssText = `
            position: absolute; top: ${box.y + sy}px; left: ${box.x + sx}px;
            width: ${box.width}px; height: ${box.height}px;
            border: 2px solid red; background: rgba(255,0,0,0.1);
            pointer-events: none; z-index: 99999;
            font-size: 10px; color: red; font-weight: bold;
          `;
          const label = document.createElement('span');
          label.textContent = ref;
          label.style.cssText = 'position: absolute; top: -14px; left: 0; background: red; color: white; padding: 0 3px; font-size: 10px;';
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        }
      }, boxes);

      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Always remove overlays
      await page.evaluate(() => {
        document.querySelectorAll('.__browse_annotation__').forEach(el => el.remove());
      });

      output.push('');
      output.push(`[annotated screenshot: ${screenshotPath}]`);
    } catch {
      // Remove overlays even on screenshot failure
      try {
        await page.evaluate(() => {
          document.querySelectorAll('.__browse_annotation__').forEach(el => el.remove());
        });
      } catch {}
    }
  }

  // ─── Diff mode (-D) ───────────────────────────────────────
  if (opts.diff) {
    const lastSnapshot = bm.getLastSnapshot();
    if (!lastSnapshot) {
      bm.setLastSnapshot(snapshotText);
      return snapshotText + '\n\n(no previous snapshot to diff against — this snapshot stored as baseline)';
    }

    const changes = diffLines(lastSnapshot, snapshotText);
    const diffOutput: string[] = ['--- previous snapshot', '+++ current snapshot', ''];

    for (const part of changes) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const diffLines = part.value.split('\n').filter(l => l.length > 0);
      for (const line of diffLines) {
        diffOutput.push(`${prefix} ${line}`);
      }
    }

    bm.setLastSnapshot(snapshotText);
    return diffOutput.join('\n');
  }

  // Store for future diffs
  bm.setLastSnapshot(snapshotText);

  return output.join('\n');
}
