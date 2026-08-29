/** Renders a tool's input or output for the transcript. A string is shown as
 * itself — quoting and escaping it would make a one-line answer unreadable —
 * and anything else is pretty JSON. A value that will not stringify (a cycle
 * from a misbehaving tool) falls back to `String(value)` rather than throwing
 * inside a render. */
export function pretty(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
