import { pretty } from './json';
import type { ToolCallView } from './turns';

/**
 * One tool call and its result, together. Collapsed by default: what a
 * lawyer needs from the transcript is that `read_primitive` ran and came
 * back clean, not its arguments — those are one click away when they matter.
 */
export function ToolCard({ tool }: { tool: ToolCallView }): JSX.Element {
  const state = !tool.hasResult ? 'running' : tool.isError ? 'error' : 'ok';
  return (
    <details className="card tool-card" data-testid={`tool-${tool.id}`}>
      <summary>
        <span className="tool-name">{tool.name}</span>
        <span className={`badge badge-${state}`}>{state}</span>
      </summary>
      <div className="card-body">
        <h4>Input</h4>
        <pre>{pretty(tool.input)}</pre>
        {tool.hasResult ? (
          <>
            <h4>Result</h4>
            <pre>{pretty(tool.output)}</pre>
          </>
        ) : null}
      </div>
    </details>
  );
}
