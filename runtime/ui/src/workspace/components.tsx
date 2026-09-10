import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'amber';
}): JSX.Element {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ value }: { value: string }): JSX.Element {
  const labels: Record<string, string> = {
    pending: 'Needs review',
    approved: 'Approved',
    rejected: 'Not adopted',
    ready: 'Text available',
    partial: 'Partial text',
    unavailable: 'Text unavailable',
    decision: 'Decision',
    draft: 'Note / draft',
  };
  return (
    <Badge
      tone={
        value === 'approved' || value === 'decision'
          ? 'green'
          : value === 'pending' || value === 'partial' || value === 'unavailable'
            ? 'amber'
            : 'neutral'
      }
    >
      {labels[value] ?? value}
    </Badge>
  );
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
  icon = 'read',
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}): JSX.Element {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}): JSX.Element {
  return (
    <div className="error-notice" role="alert">
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // React autofocus runs before a closed native dialog is focusable.
    dialog?.querySelector<HTMLElement>('input, textarea, select')?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="editor-dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={headingId}>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
export function kindLabel(kind: string | null): string {
  return kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'General';
}
export function Prose({ text }: { text: string }): JSX.Element {
  // Text is deliberately not injected as HTML. Imported text and model output
  // are untrusted; future rich rendering must use the existing sanitizer.
  return <div className="record-prose">{text || 'No text recorded.'}</div>;
}
