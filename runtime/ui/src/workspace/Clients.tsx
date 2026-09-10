import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Client, ClientLink } from "../../../src/workspace/clients";
import {
  go,
  href,
  request,
  type Conversation,
  type ConversationSummary,
  type Snapshot,
} from "./api";
import { Empty, ErrorNotice, Modal, PageHeader } from "./components";
import { Icon } from "./icons";
import { MatterPicker } from "./MatterPicker";

function ClientEditor({
  client,
  close,
  saved,
}: {
  client?: Client;
  close: () => void;
  saved: (client: Client) => void;
}) {
  const [id] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      saved(
        await request<Client>(client ? `/clients/${client.id}` : "/clients", {
          name: form.get("name"),
          summary: form.get("summary"),
          ...(client ? { expectedRevisionId: client.revisionId } : { id }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={client ? "Edit client" : "New client"}
      busy={busy}
      onClose={() => {
        if (!busy && (!dirty || confirm("Discard this unsaved client?")))
          close();
      }}
    >
      <form
        className="record-form"
        onSubmit={submit}
        onChange={() => setDirty(true)}
      >
        <p className="form-intro">
          Optional organization for practices with multiple clients. Matters
          work independently without it.
        </p>
        <label>
          Client name
          <input
            name="name"
            maxLength={200}
            required
            autoFocus
            defaultValue={client?.name ?? ""}
          />
        </label>
        <label>
          Background for client-wide chats
          <textarea
            name="summary"
            maxLength={4000}
            rows={4}
            defaultValue={client?.summary ?? ""}
            placeholder="Shared background, priorities, or context—not instructions to ignore a matter’s restrictions."
          />
        </label>
        <p className="field-help">
          This background is shared with your selected AI connection in
          client-wide chats. It does not become an approved position or replace
          matter-specific facts.
        </p>
        {error && <ErrorNotice message={error} />}
        <button className="button button-primary" disabled={busy}>
          {busy ? "Saving…" : client ? "Save client" : "Create client"}
        </button>
      </form>
    </Modal>
  );
}

export function ClientDirectory({
  data,
  changed,
}: {
  data: Snapshot;
  changed: () => void;
}) {
  const [creating, setCreating] = useState(false),
    [query, setQuery] = useState("");
  const clients = data.clients ?? [];
  return (
    <>
      <details
        className="client-directory"
        open={clients.length > 0 ? true : undefined}
      >
        <summary>
          {clients.length ? "Clients" : "Organize by client (optional)"}
        </summary>
        <div className="collection-toolbar">
          <p className="field-help">
            Matters can stand alone. Use clients only when you need this extra
            grouping.
          </p>
          <button className="button" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New client
          </button>
        </div>
        {clients.length > 5 && (
          <label className="filter-input">
            <Icon name="search" size={17} />
            <input
              aria-label="Find a client"
              value={query}
              placeholder="Find a client…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        <div className="client-grid">
          {clients
            .filter((c) =>
              c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map((c) => (
              <a
                className="client-card"
                key={c.id}
                href={href("matters", { client: c.id })}
              >
                <Icon name="matter" size={20} />
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.matterCount} {c.matterCount === 1 ? "matter" : "matters"}
                  </small>
                </span>
                <Icon name="chevron" size={16} />
              </a>
            ))}
        </div>
      </details>
      {creating && (
        <ClientEditor
          close={() => setCreating(false)}
          saved={(client) => {
            setCreating(false);
            changed();
            go("matters", { client: client.id });
          }}
        />
      )}
    </>
  );
}

type ClientPageData = {
  client: Client;
  matters: { id: string; title: string; kind: string | null }[];
  conversations: ConversationSummary[];
};
export function ClientPage({
  id,
  data,
  changed,
}: {
  id: string;
  data: Snapshot;
  changed: () => void;
}) {
  const [value, setValue] = useState<ClientPageData | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string[]>([]),
    [filter, setFilter] = useState(""),
    [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false),
    [matterId, setMatterId] = useState(""),
    [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    request<ClientPageData>(`/clients/${id}`, undefined, abort.signal)
      .then((v) => {
        if (abort.signal.aborted) return;
        setValue(v);
        if (!initialized.current) {
          setSelected(
            v.matters.length <= 100 ? v.matters.map((m) => m.id) : [],
          );
          initialized.current = true;
        } else
          setSelected((ids) =>
            ids.filter((id) => v.matters.some((m) => m.id === id)),
          );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [id, retry]);
  async function addMatter() {
    if (!matterId || busy) return;
    setBusy(true);
    setError("");
    try {
      const link = await request<ClientLink>(`/matters/${matterId}/client`);
      if (
        link.clientId &&
        link.clientId !== id &&
        !confirm(
          "This matter belongs to another client. Move it here? Existing client-wide chats containing it will remain readable but cannot accept new messages.",
        )
      )
        return;
      await request(`/matters/${matterId}/client`, {
        clientId: id,
        expectedRevisionId: link.revisionId,
      });
      setAdding(false);
      setMatterId("");
      setRetry((n) => n + 1);
      changed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!selected.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const chat = await request<Conversation>("/conversations", {
        scope: "client",
        clientId: id,
        matterIds: selected,
      });
      changed();
      go("home", { id: chat.id });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  if (!value)
    return error ? (
      <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />
    ) : (
      <p role="status">Loading client…</p>
    );
  const shown = value.matters.filter((m) =>
    m.title.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
  );
  return (
    <>
      <a className="back-link" href={href("matters")}>
        <Icon name="back" size={16} />
        All matters
      </a>
      <PageHeader
        title={value.client.name}
        description={
          value.client.summary ||
          "Related matters, kept distinct. Client-wide chats can draw on the matters you select."
        }
        action={
          <button className="button" onClick={() => setEditing(true)}>
            Edit client
          </button>
        }
      />
      {error && (
        <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />
      )}
      <section className="client-context-picker">
        <div className="section-heading">
          <h2>Matters for this client</h2>
          <button className="button" onClick={() => setAdding((v) => !v)}>
            Add an existing matter
          </button>
        </div>
        {adding && (
          <div className="client-add-matter">
            <MatterPicker
              value={matterId}
              onChange={setMatterId}
              matters={data.matters}
              disabled={busy}
              choices={[{ value: "", label: "Find a matter" }]}
            />
            <button
              className="button"
              disabled={busy || !matterId}
              onClick={() => void addMatter()}
            >
              Add to client
            </button>
          </div>
        )}
        {!!value.matters.length && (
          <>
            <div className="collection-toolbar">
              <span className="result-count">
                {selected.length} of {value.matters.length} selected
              </span>
              <label className="filter-input">
                <Icon name="search" size={17} />
                <input
                  aria-label="Find client matters"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find a matter…"
                />
              </label>
            </div>
            <div className="client-selection-actions">
              <button
                className="text-button"
                disabled={shown.length > 100}
                onClick={() => setSelected(shown.map((m) => m.id))}
              >
                Select shown
              </button>
              <button className="text-button" onClick={() => setSelected([])}>
                Clear selection
              </button>
            </div>
          </>
        )}
        <div className="client-matter-list">
          {shown.map((m) => (
            <div className="client-matter-row" key={m.id}>
              <label>
                <input
                  type="checkbox"
                  aria-label={`Include ${m.title}`}
                  checked={selected.includes(m.id)}
                  disabled={
                    busy || (!selected.includes(m.id) && selected.length >= 100)
                  }
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, m.id]
                        : ids.filter((id) => id !== m.id),
                    )
                  }
                />
                <span>{m.title}</span>
              </label>
              <a href={href("matters", { id: m.id })}>
                Open matter
                <Icon name="arrow" size={14} />
              </a>
            </div>
          ))}
        </div>
        {!value.matters.length && (
          <Empty title="No matters assigned">
            Add an existing matter above. A matter can belong to one client or
            have no client.
          </Empty>
        )}
        <div className="client-chat-action">
          <div>
            <strong>Ask across these matters</strong>
            <p>
              Uses this selection, client background, and approved practice
              material. Other clients and unselected matters are excluded unless
              you attach a document. Future matters are not automatically added.
              Up to 100 matters per chat.
            </p>
          </div>
          <button
            className="button button-primary"
            disabled={busy || !selected.length}
            onClick={() => void start()}
          >
            <Icon name="chat" size={17} />
            {busy ? "Opening…" : "Start client chat"}
          </button>
        </div>
      </section>
      {!!value.conversations.length && (
        <section className="client-conversations">
          <h2>Client-wide conversations</h2>
          <div className="matter-chat-list">
            {value.conversations.map((c) => (
              <a
                className="matter-chat-row"
                key={c.id}
                href={href("home", { id: c.id })}
              >
                <Icon name="chat" size={18} />
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.clientContext?.matters.length} selected matters ·{" "}
                    {c.turnCount} exchanges
                  </small>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
      {editing && (
        <ClientEditor
          client={value.client}
          close={() => setEditing(false)}
          saved={() => {
            setEditing(false);
            setRetry((n) => n + 1);
            changed();
          }}
        />
      )}
    </>
  );
}

export function MatterClient({
  matterId,
  data,
}: {
  matterId: string;
  data: Snapshot;
}) {
  const [link, setLink] = useState<ClientLink | null>(null),
    [choice, setChoice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    request<ClientLink>(`/matters/${matterId}/client`, undefined, abort.signal)
      .then((v) => {
        if (!abort.signal.aborted) {
          setLink(v);
          setChoice(v.clientId ?? "");
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [matterId]);
  return (
    <section className="matter-client">
      <label>
        Client (optional)
        <select
          aria-label="Matter client"
          value={choice}
          disabled={!link || busy}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="">No client</option>
          {data.clients?.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button"
        disabled={!link || busy || choice === (link.clientId ?? "")}
        onClick={async () => {
          if (!link || busy) return;
          if (
            link.clientId &&
            !confirm(
              "Changing this client will prevent new messages in existing client-wide chats that include this matter. Their saved history remains available. Continue?",
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            setLink(
              await request(`/matters/${matterId}/client`, {
                clientId: choice || null,
                expectedRevisionId: link.revisionId,
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Save client
      </button>
      {link?.clientId && (
        <a href={href("matters", { client: link.clientId })}>Open client</a>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
