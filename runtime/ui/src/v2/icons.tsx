/** The rail's outline icons (mock-{home,chat,vault}.html — same four SVGs
 * on every page). 16×16, stroked with currentColor so the token ramp colors
 * them. */

import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }): JSX.Element {
  return (
    <svg className="v2-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      {children}
    </svg>
  );
}

export function HomeIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2 6.8 8 2l6 4.8V14H9.8v-3.8H6.2V14H2z" />
    </Icon>
  );
}

export function ChatIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2.5 3.5h11v7.6H6.6L3.4 14v-2.9H2.5z" />
    </Icon>
  );
}

export function VaultIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M2 3h4.4L8 4.8h6V13H2z" />
    </Icon>
  );
}

export function SettingsIcon(): JSX.Element {
  return (
    <Icon>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}

/**
 * The expander chevron — every fold in the app draws THIS, not a `⌄`/`▸`
 * glyph (whose baseline drifts font by font). Points down; `open={false}`
 * rotates it to point right for a closed tree row.
 */
export function Chevron({ open = true }: { open?: boolean }): JSX.Element {
  return (
    <svg
      className={open ? 'v2-chev-svg' : 'v2-chev-svg v2-chev-closed'}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.2 3.6 5 6.4l2.8-2.8" />
    </svg>
  );
}
