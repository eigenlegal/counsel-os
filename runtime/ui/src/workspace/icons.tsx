export type IconName =
  | 'pin'
  | 'trash'
  | 'more'
  | 'home'
  | 'chat'
  | 'attach'
  | 'stop'
  | 'matter'
  | 'knowledge'
  | 'reference'
  | 'work'
  | 'search'
  | 'settings'
  | 'plus'
  | 'arrow'
  | 'chevron'
  | 'close'
  | 'check'
  | 'clock'
  | 'shield'
  | 'menu'
  | 'link'
  | 'review'
  | 'back'
  | 'read';
const paths: Record<IconName, string> = {
  pin: 'm15 3 6 6-3 1-3 5v3l-9-9h3l5-3ZM10 14l-7 7',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  more: 'M5 11v2m7-2v2m7-2v2',
  chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2ZM7 9h10M7 13h7',
  attach: 'm8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l10-10m-7 13 8-8',
  stop: 'M6 6h12v12H6Z',
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  matter: 'M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z',
  knowledge: 'M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
  reference: 'M6 3h9l4 4v14H6ZM14 3v5h5M9 12h7M9 16h5',
  work: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14ZM4 14l5 5',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM16 16l5 5',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2',
  shield: 'M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6Zm-4 9 3 3 5-6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  link: 'm10 14 4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2-2 1-1a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',
  review: 'M8 4h8v3H8ZM8 5H5v16h14V5h-3M8 14l3 3 5-6',
  back: 'M19 12H5m6-6-6 6 6 6',
  read: 'M4 5h16v15H4ZM8 9h8M8 13h8M8 17h4',
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
