import type { PracticeGuide } from "../../../src/workspace/practice-guides";

function sourceLink(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function WorkingGuides({
  guides,
  library = false,
}: {
  guides: PracticeGuide[];
  library?: boolean;
}) {
  if (!guides.length) return null;
  return (
    <section
      className="working-guides"
      aria-label={library ? "Working guide library" : "Working guides used"}
    >
      {!library && <h3>Working guides used</h3>}
      <p className="fine-print">
        {library
          ? "Counsel selects relevant guides as you chat. Browsing here does not apply one to a conversation."
          : "Selected by Counsel for this response."}{" "}
        These are methods, not verified law or your approved positions.
      </p>
      {guides.map((guide) => (
        <details
          className="shared-matter-context"
          key={`${guide.id}:${guide.contentHash}`}
        >
          <summary>
            {guide.title} <span>· v{guide.version}</span>
          </summary>
          <p className="fine-print">
            Published {guide.publishedAt}. This is not a legal review date.
          </p>
          <h4>Working method</h4>
          <ol>
            {guide.method.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <h4>Coverage and limits</h4>
          <ul>
            {guide.limits.map((limit, index) => (
              <li key={index}>{limit}</li>
            ))}
          </ul>
          <h4>Research starting points</h4>
          <p className="fine-print">
            These sites were not opened by loading this guide.
          </p>
          <ul>
            {guide.sourceMap.map((source, index) => (
              <li key={index}>
                {sourceLink(source.url) ? (
                  <a
                    href={sourceLink(source.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span>{source.title}</span>
                )}
                <p className="fine-print">{source.purpose}</p>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
