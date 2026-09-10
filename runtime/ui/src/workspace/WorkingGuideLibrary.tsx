import { useEffect, useState } from "react";
import type { PracticeGuide } from "../../../src/workspace/practice-guides";
import { request } from "./api";
import { ErrorNotice } from "./components";
import { WorkingGuides } from "./WorkingGuides";
import { Icon } from "./icons";

export function WorkingGuideLibrary() {
  const [open, setOpen] = useState(false),
    [guides, setGuides] = useState<PracticeGuide[] | null>(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || guides) return;
    const abort = new AbortController();
    setError("");
    request<PracticeGuide[]>("/guides", undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setGuides(value);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError((error as Error).message);
      });
    return () => abort.abort();
  }, [open, guides, retry]);
  return (
    <section className="guide-library-card">
      <div className="settings-title">
        <span className="record-icon">
          <Icon name="knowledge" />
        </span>
        <div>
          <h2>Counsel guides</h2>
          <p>
            Working methods supplied by Counsel, separate from your own practice
            customizations.
          </p>
        </div>
      </div>
      <p className="settings-copy">
        These first four guides are newly written starting points, informed by
        the plugin’s approach. They are not a complete migration of its law
        library or a substantive legal review. Counsel can retrieve dated federal regulation sections
        from eCFR and U.S. Code sections from the House publisher by citation; other source-map links are research starting points, not fetched evidence.
      </p>
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Browse working guides</summary>
        {open &&
          (error ? (
            <ErrorNotice
              message={error}
              retry={() => setRetry((value) => value + 1)}
            />
          ) : guides ? (
            <WorkingGuides guides={guides} library />
          ) : (
            <p role="status">Loading guides…</p>
          ))}
      </details>
    </section>
  );
}
