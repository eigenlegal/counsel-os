/**
 * Meta commands — tabs, server control, screenshots, chain, diff, snapshot
 */

import type { BrowserManager } from './browser-manager';
import { handleSnapshot } from './snapshot';
import { handleReadCommand, getCleanText } from './read-commands';
import { handleWriteCommand } from './write-commands';
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
import { diffLines } from './simple-diff';
import * as fs from 'fs';
import * as path from 'path';

// Security: Path validation to prevent path traversal attacks.
// Computed per call — the server chdirs to the caller's cwd on each command.
function safeDirectories(): string[] {
  return ['/tmp', process.cwd()];
}

function validateOutputPath(filePath: string): void {
  const dirs = safeDirectories();
  const resolved = path.resolve(filePath);
  const isSafe = dirs.some(dir => resolved === dir || resolved.startsWith(dir + '/'));
  if (!isSafe) {
    throw new Error(`Path must be within: ${dirs.join(', ')}`);
  }
}

export async function handleMetaCommand(
  command: string,
  args: string[],
  bm: BrowserManager,
  shutdown: () => Promise<void> | void
): Promise<string> {
  switch (command) {
    // ─── Tabs ──────────────────────────────────────────
    case 'tabs': {
      const tabs = await bm.getTabListWithTitles();
      return tabs.map(t =>
        `${t.active ? '→ ' : '  '}[${t.id}] ${t.title || '(untitled)'} — ${t.url}`
      ).join('\n');
    }

    case 'tab': {
      const tabArg = args[0];
      if (!tabArg) throw new Error('Usage: browse tab <id>');
      const id = parseInt(tabArg, 10);
      if (isNaN(id)) throw new Error('Usage: browse tab <id>');
      bm.switchTab(id);
      return `Switched to tab ${id}`;
    }

    case 'newtab': {
      const url = args[0];
      const id = await bm.newTab(url);
      return `Opened tab ${id}${url ? ` → ${url}` : ''}`;
    }

    case 'closetab': {
      const id = args[0] ? parseInt(args[0], 10) : undefined;
      await bm.closeTab(id);
      return `Closed tab${id ? ` ${id}` : ''}`;
    }

    // ─── Server Control ────────────────────────────────
    case 'status': {
      const page = bm.getPage();
      const tabs = bm.getTabCount();
      return [
        `Status: healthy`,
        `URL: ${page.url()}`,
        `Tabs: ${tabs}`,
        `PID: ${process.pid}`,
      ].join('\n');
    }

    case 'url': {
      return bm.getCurrentUrl();
    }

    case 'stop': {
      // Respond first, exit after — shutdown() ends in process.exit(0), and
      // awaiting it here would kill the server before the HTTP response is
      // sent (the CLI then saw ECONNRESET and spawned a throwaway server).
      setTimeout(() => { Promise.resolve(shutdown()).catch(() => {}); }, 250);
      return 'Server stopped';
    }

    case 'restart': {
      // Same respond-then-exit pattern; the CLI waits for this PID to die and
      // starts a fresh server.
      console.log('[browse] Restart requested. Exiting for CLI to restart.');
      setTimeout(() => { Promise.resolve(shutdown()).catch(() => {}); }, 250);
      return 'Restarting...';
    }

    // ─── Visual ────────────────────────────────────────
    case 'screenshot': {
      const page = bm.getPage();
      const screenshotPath = args[0] || '/tmp/browse-screenshot.png';
      validateOutputPath(screenshotPath);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return `Screenshot saved: ${screenshotPath}`;
    }

    case 'pdf': {
      const page = bm.getPage();
      const pdfPath = args[0] || '/tmp/browse-page.pdf';
      validateOutputPath(pdfPath);
      await page.pdf({ path: pdfPath, format: 'A4' });
      return `PDF saved: ${pdfPath}`;
    }

    case 'responsive': {
      const page = bm.getPage();
      const prefix = args[0] || '/tmp/browse-responsive';
      const viewports = [
        { name: 'mobile', width: 375, height: 812 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
      ];
      const originalViewport = page.viewportSize();
      const results: string[] = [];

      try {
        for (const vp of viewports) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          const filePath = `${prefix}-${vp.name}.png`;
          // Validate the actual file path, not the prefix — "/tmp" as a prefix
          // would otherwise pass validation while writing /tmp-mobile.png.
          validateOutputPath(filePath);
          await page.screenshot({ path: filePath, fullPage: true });
          results.push(`${vp.name} (${vp.width}x${vp.height}): ${filePath}`);
        }
      } finally {
        // Restore original viewport even if a screenshot fails
        if (originalViewport) {
          await page.setViewportSize(originalViewport).catch(() => {});
        }
      }

      return results.join('\n');
    }

    // ─── Chain ─────────────────────────────────────────
    case 'chain': {
      // Read JSON array from args[0] (if provided) or expect it was passed as body
      const jsonStr = args[0];
      if (!jsonStr) throw new Error('Usage: echo \'[["goto","url"],["text"]]\' | browse chain');

      let commands: unknown;
      try {
        commands = JSON.parse(jsonStr);
      } catch {
        throw new Error('Invalid JSON. Expected: [["command", "arg1", "arg2"], ...]');
      }

      if (!Array.isArray(commands)) throw new Error('Expected JSON array of commands');

      const results: string[] = [];

      for (const cmd of commands) {
        if (!Array.isArray(cmd) || typeof cmd[0] !== 'string') {
          throw new Error('Expected each command to be an array beginning with a command name');
        }
        if (!cmd.every(arg => typeof arg === 'string')) {
          throw new Error('Expected command names and arguments to be strings');
        }
        const [name, ...cmdArgs] = cmd;
        try {
          let result: string;
          if (WRITE_COMMANDS.has(name))      result = await handleWriteCommand(name, cmdArgs, bm);
          else if (READ_COMMANDS.has(name))  result = await handleReadCommand(name, cmdArgs, bm);
          else if (META_COMMANDS.has(name))  result = await handleMetaCommand(name, cmdArgs, bm, shutdown);
          else throw new Error(`Unknown command: ${name}`);
          results.push(`[${name}] ${result}`);
        } catch (err: any) {
          results.push(`[${name}] ERROR: ${err.message}`);
        }
      }

      return results.join('\n\n');
    }

    // ─── Diff ──────────────────────────────────────────
    case 'diff': {
      const [url1, url2] = args;
      if (!url1 || !url2) throw new Error('Usage: browse diff <url1> <url2>');

      const page = bm.getPage();
      await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text1 = await getCleanText(page);

      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text2 = await getCleanText(page);

      const changes = diffLines(text1, text2);
      const output: string[] = [`--- ${url1}`, `+++ ${url2}`, ''];

      for (const part of changes) {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        const lines = part.value.split('\n').filter(l => l.length > 0);
        for (const line of lines) {
          output.push(`${prefix} ${line}`);
        }
      }

      return output.join('\n');
    }

    // ─── Snapshot ─────────────────────────────────────
    case 'snapshot': {
      return await handleSnapshot(args, bm);
    }

    default:
      throw new Error(`Unknown meta command: ${command}`);
  }
}
