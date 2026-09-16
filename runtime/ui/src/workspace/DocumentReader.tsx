import { useState } from "react";
import { isMarkdown, renderMarkdown } from "../vault/markdown";
import { Prose } from "./components";
import { practiceReadingParts } from '../../../src/workspace/practice-presentation';

/** Presentation only: never normalize the text used for hashes or citations. */
export function readingParts(text: string): {
  body: string;
  metadata: string[];
} {
  return practiceReadingParts(text);
}

export function sourceUsesMarkdown(provenance: {
  mediaType?: string;
  origin: string;
}): boolean {
  // Explicit text/plain (and PDF/Word extraction) always wins over the filename.
  return provenance.mediaType
    ? provenance.mediaType.split(";")[0]!.trim().toLowerCase() ===
        "text/markdown"
    : isMarkdown(provenance.origin);
}

export function practiceUsesMarkdown(body: string): boolean {
  const imported = body.match(
    /^Imported from plugin:([^\r\n]+)\. Pending review; no approval inferred\./,
  );
  return !imported || isMarkdown(imported[1]!);
}

/** Reading view and exact saved text share one immutable body. No remote embeds. */
export type TextDisplay = 'reading' | 'saved';
export function DocumentViewControls({ display, change, compact = false }: {
  display: TextDisplay; change: (display: TextDisplay) => void; compact?: boolean;
}): JSX.Element {
  return <div className={`document-view-controls${compact ? ' document-view-controls-compact' : ''}`} role="group" aria-label="Text display">
    <button type="button" aria-pressed={display === 'reading'} onClick={() => change('reading')}>Reading view</button>
    <button type="button" aria-pressed={display === 'saved'} onClick={() => change('saved')}>Saved text</button>
  </div>;
}

export function DocumentReader({
  text,
  markdown,
  display,
}: {
  text: string;
  markdown: boolean;
  /** A parent reader may own one display switch for several related fields. */
  display?: TextDisplay;
}): JSX.Element {
  const [localDisplay, setDisplay] = useState<TextDisplay>('reading');
  const raw = (display ?? localDisplay) === 'saved';
  const parts = markdown ? readingParts(text) : null;
  return (
    <div className="document-reader">
      {markdown && display === undefined && <DocumentViewControls display={localDisplay} change={setDisplay} />}
      {raw || !markdown ? (
        <>
          {raw && (
            <p className="reader-caption">
              Exact saved text, including formatting and import metadata.
              Citations use this text.
            </p>
          )}
          <Prose text={text} />
        </>
      ) : (
        <>
          {!!parts?.metadata.length && (
            <details className="reader-metadata">
              <summary>Import &amp; document metadata</summary>
              <p>
                Retained with the original text. These fields are document
                content, not workspace settings.
              </p>
              {parts.metadata.map((value, index) => (
                <pre key={index}>{value}</pre>
              ))}
            </details>
          )}
          <div
            className="chat-answer document-markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(parts!.body) }}
          />
        </>
      )}
    </div>
  );
}
