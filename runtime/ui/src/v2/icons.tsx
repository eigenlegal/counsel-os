/** The rail's outline icons (mock-{home,chat,vault}.html — same four SVGs
 * on every page). 16×16, stroked with currentColor so the token ramp colors
 * them. */

import type { ReactNode } from 'react';

function Icon({ children, round = false }: { children: ReactNode; round?: boolean }): JSX.Element {
  return (
    <svg
      className="v2-nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      // A many-cornered outline needs its joins rounded, or every tooth
      // grows a spike where two strokes meet at an acute angle.
      {...(round ? { strokeLinejoin: 'round' as const } : {})}
      aria-hidden="true"
    >
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

/**
 * A gear. The old icon was a ring with eight radiating spokes, which is the
 * glyph every other app uses for BRIGHTNESS — it read as a light/dark
 * toggle, not as settings.
 *
 * Six teeth, not eight: at 16px the teeth have to stay separate, and the
 * rail's other three icons are four-to-six-point outlines that a denser
 * gear would out-weigh.
 */
export function SettingsIcon(): JSX.Element {
  return (
    <Icon round>
      <path d="M 6.76 3.67 L 6.50 1.98 L 9.50 1.98 L 9.24 3.67 A 4.5 4.5 0 0 1 11.13 4.76 L 12.46 3.69 L 13.96 6.29 L 12.37 6.91 A 4.5 4.5 0 0 1 12.37 9.09 L 13.96 9.71 L 12.46 12.31 L 11.13 11.24 A 4.5 4.5 0 0 1 9.24 12.33 L 9.50 14.02 L 6.50 14.02 L 6.76 12.33 A 4.5 4.5 0 0 1 4.87 11.24 L 3.54 12.31 L 2.04 9.71 L 3.63 9.09 A 4.5 4.5 0 0 1 3.63 6.91 L 2.04 6.29 L 3.54 3.69 L 4.87 4.76 A 4.5 4.5 0 0 1 6.76 3.67 Z" />
      <circle cx="8" cy="8" r="2.1" />
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
