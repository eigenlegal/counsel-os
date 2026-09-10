import type { DiscoveryContext } from "../../../src/workspace/record-discovery";
import type { Inspection } from "./ContextPanel";

const labels = {
  source: "Sources and matter notes",
  work: "Prior work and decisions",
  knowledge: "Approved Practice",
};
export function AvailableRecords({
  value,
  inspect,
}: {
  value: DiscoveryContext;
  inspect: (record: Inspection) => void;
}) {
  return (
    <details className="shared-matter-context available-records">
      <summary>Records available to Counsel</summary>
      <p className="fine-print">
        Record names supplied at the start of this response. This is not a list
        of documents read. Counsel can browse or search further within this
        scope.
      </p>
      {value.pages.map((page) => (
        <section key={page.kind}>
          <h4>
            {labels[page.kind]} <span>({page.total})</span>
          </h4>
          {page.records.length ? (
            <ul>
              {page.records.map((record) => (
                <li key={record.id}>
                  <button
                    onClick={() =>
                      inspect({
                        kind: record.kind,
                        id: record.id,
                        title: record.title,
                      })
                    }
                  >
                    {record.title}
                  </button>
                  {record.status === "partial" ||
                  record.status === "unavailable" ? (
                    <small>
                      {record.status === "partial"
                        ? "Partial text"
                        : "Text unavailable"}
                    </small>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine-print">None available in this scope.</p>
          )}
          {page.nextBefore !== null && (
            <p className="fine-print">
              Showing {page.records.length} of {page.total} record names.
            </p>
          )}
        </section>
      ))}
    </details>
  );
}
