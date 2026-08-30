import { useState } from 'react';
import { pretty } from '../../chat/json';
import type { ToolCallView } from '../../chat/turns';
import { pathOf, verbFor } from '../verbs';

export interface StepsProps {
  tools: ToolCallView[];
  /** Milliseconds per tool id, once its result has landed. Absent = not
   * yet, or unknown. */
  ms: Record<string, number>;
  /** Opens a path in the vault drawer. When absent, paths are plain text. */
  onOpenFile?: (path: string) => void;
}

/**
 * The timeline (spec §2, "Turn while streaming"): one line per tool call —
 * "Read matters/acme.md · 18 ms" — with the raw input and result one
 * "show" away. The same list renders inside the finished strip.
 */
export function Steps({ tools, ms, onOpenFile }: StepsProps): JSX.Element | null {
  if (tools.length === 0) return null;
  return (
    <ol className="v2-steps">
      {tools.map(tool => (
        <Step key={tool.id} tool={tool} ms={ms[tool.id]} onOpenFile={onOpenFile} />
      ))}
    </ol>
  );
}

function Step({
  tool,
  ms,
  onOpenFile,
}: {
  tool: ToolCallView;
  ms: number | undefined;
  onOpenFile?: (path: string) => void;
}): JSX.Element {
  const [shown, setShown] = useState(false);
  const { verb, object } = verbFor(tool);
  const path = pathOf(tool);
  const state = !tool.hasResult ? 'running' : tool.isError === true ? 'error' : 'ok';

  return (
    <li className={`v2-step v2-step-${state}`} data-testid={`step-${tool.id}`}>
      <span className="v2-step-verb">{verb}</span>{' '}
      {object === undefined ? null : path !== null && onOpenFile !== undefined ? (
        <button type="button" className="v2-step-path" onClick={() => onOpenFile(path)}>
          {object}
        </button>
      ) : (
        <code className="v2-step-object">{object}</code>
      )}
      {ms === undefined ? null : <span className="v2-step-ms"> · {Math.round(ms)} ms</span>}
      {state === 'running' ? (
        <span className="v2-step-wait" role="status" aria-label="running">
          …
        </span>
      ) : state === 'error' ? (
        <span className="v2-pill v2-pill-error">error</span>
      ) : null}
      <button type="button" className="v2-link v2-step-show" aria-expanded={shown} onClick={() => setShown(s => !s)}>
        {shown ? 'hide' : 'show'}
      </button>
      {shown ? (
        <div className="v2-step-detail">
          <h4>Input</h4>
          <pre>{pretty(tool.input)}</pre>
          {tool.hasResult ? (
            <>
              <h4>Result</h4>
              <pre>{pretty(tool.output)}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
