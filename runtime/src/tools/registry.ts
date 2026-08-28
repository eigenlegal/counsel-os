import type { Platform, Tool, ToolDef } from '../core/types';
import { currentPlatform } from '../core/types';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  available(platform: Platform = currentPlatform()): ToolDef[] {
    return [...this.tools.values()].filter(t => t.platforms.has(platform));
  }

  unavailable(platform: Platform = currentPlatform()): Array<{ name: string; needs: Platform[] }> {
    return [...this.tools.values()]
      .filter(t => !t.platforms.has(platform))
      .map(t => ({ name: t.name, needs: [...t.platforms] }));
  }
}
