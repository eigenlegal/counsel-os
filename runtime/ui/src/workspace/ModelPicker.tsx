import { useEffect, useState } from "react";
import {
  request,
  type ConnectionConfig,
  type ModelCatalog,
  type ModelChoice,
} from "./api";
import { sameConnection } from "../../../src/workspace/model-choice";
import { ErrorNotice, Modal } from "./components";

/** One field for Settings and the composer: shared select styling and an honest typed-ID escape hatch. */
export function ModelField({
  kind,
  value,
  onChange,
  disabled = false,
  autoLoad = false,
  refreshKey = 0,
}: {
  kind: ConnectionConfig["kind"];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoLoad?: boolean;
  refreshKey?: number;
}): JSX.Element {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState(false);
  const [load, setLoad] = useState(0);
  useEffect(() => {
    setCatalog(null);
    setError("");
    if (!autoLoad && !load) { setBusy(false); return; }
    const abort = new AbortController();
    setBusy(true);
    request<ModelCatalog>("/connection/models", { kind }, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setCatalog(result);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [kind, load, autoLoad, refreshKey]);
  const listed = catalog?.models ?? [];
  return (
    <div className="model-field">
      <label>
        Model
        <select
          aria-label="Model"
          value={custom ? "__custom" : value}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === "__custom") setCustom(true);
            else {
              setCustom(false);
              onChange(event.target.value);
            }
          }}
        >
          {!listed.some((item) => item.id === value) && (
            <option value={value}>
              {value || "Choose a model"}
              {value ? " · entered ID" : ""}
            </option>
          )}
          {listed.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          <option value="__custom">Enter an exact model ID…</option>
        </select>
      </label>
      {custom && (
        <label>
          Exact model ID
          <input
            aria-label="Model ID"
            autoFocus
            value={value}
            disabled={disabled}
            required
            pattern="[a-zA-Z0-9._:-]+"
            maxLength={100}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Model ID supplied by your provider"
          />
        </label>
      )}
      <button
        type="button"
        className="button button-quiet model-load"
        disabled={busy || disabled}
        onClick={() => setLoad((value) => value + 1)}
      >
        {busy
          ? "Loading models…"
          : catalog
            ? "Reload model list"
            : "Load model choices"}
      </button>
      {catalog && (
        <p className="fine-print" role="status">
          {catalog.note}
        </p>
      )}
      {error && <ErrorNotice message={error} />}
    </div>
  );
}

export function ModelPicker({
  config,
  label,
  choice,
  onClose,
  onSave,
}: {
  config: ConnectionConfig;
  label: string;
  choice: ModelChoice | null;
  onClose: () => void;
  onSave: (choice: ModelChoice | null) => Promise<void>;
}): JSX.Element {
  const compatible = !choice || sameConnection(config, choice);
  const [useDefault, setDefault] = useState(!choice || !compatible);
  const [model, setModel] = useState(
    compatible && choice ? choice.model : config.model,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="Model for this chat" onClose={onClose}>
      <form
        className="record-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(
              useDefault
                ? null
                : {
                    kind: config.kind,
                    model,
                    ...(config.kind === "claude-code"
                      ? {
                          claudeBilling: config.claudeBilling ?? "subscription",
                        }
                      : {}),
                  },
            );
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-intro">
          <strong>{label}</strong>
          <p>
            This choice stays with this chat. Other chats and responses already
            running are unchanged.
          </p>
        </div>
        {!compatible && (
          <ErrorNotice message="This chat’s saved choice belongs to a different connection or billing method. Choose how to continue; nothing has been switched automatically." />
        )}
        <label className="model-default">
          <input
            type="checkbox"
            checked={useDefault}
            disabled={busy}
            onChange={(event) => setDefault(event.target.checked)}
          />
          <span>
            Use workspace default <small>{config.model}</small>
          </span>
        </label>
        <ModelField
          kind={config.kind}
          value={useDefault ? config.model : model}
          onChange={setModel}
          disabled={useDefault || busy}
          autoLoad
        />
        <p className="fine-print">
          Counsel OS does not automatically choose a model or fallback. {config.kind === "claude-code" && "Claude Code may apply its own model fallback. "}Selecting a model does not run it or
          verify account access. Included conversation history will be sent with
          your next message. Change providers or billing in Settings.
        </p>
        {error && <ErrorNotice message={error} />}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Use for this chat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
