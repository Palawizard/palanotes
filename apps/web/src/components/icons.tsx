import type { ReactNode, SVGProps } from 'react';

// One drawn set: 16px grid, 1.5px stroke, round joins, current colour.
const PATHS = {
  chevronRight: <path d="M6 3.5 10.5 8 6 12.5" />,
  chevronLeft: <path d="M10 3.5 5.5 8l4.5 4.5" />,
  chevronDown: <path d="M3.5 6 8 10.5 12.5 6" />,
  folder: (
    <path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" />
  ),
  note: (
    <>
      <path d="M3.75 1.75h5.5l3 3v9.5h-8.5z" />
      <path d="M9.25 1.75v3h3M6 8h4M6 10.75h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75V8l2.25 1.5" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.75" />
      <path d="m10.5 10.5 3.75 3.75" />
    </>
  ),
  plus: <path d="M8 2.75v10.5M2.75 8h10.5" />,
  close: <path d="m3.75 3.75 8.5 8.5m0-8.5-8.5 8.5" />,
  more: (
    <>
      <circle cx="3.5" cy="8" r="0.6" fill="currentColor" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
      <circle cx="12.5" cy="8" r="0.6" fill="currentColor" />
    </>
  ),
  move: (
    <>
      <path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" />
      <path d="M5.5 8.75h5m-2-2 2 2-2 2" />
    </>
  ),
  pencil: <path d="M10.25 2.75 13.25 5.75 5.5 13.5H2.5v-3z" />,
  merge: (
    <path d="M4 2.5v3.25c0 2 4 2.25 4 4.5v3.25M12 2.5v3.25c0 2-4 2.25-4 4.5m-2.25 1.5L8 13.5l2.25-2.25" />
  ),
  trash: <path d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4.25 4.25l.6 9h6.3l.6-9" />,
  sort: (
    <path d="M5 2.75v10.5m0 0L2.75 11M5 13.25 7.25 11M11 13.25V2.75m0 0L8.75 5M11 2.75 13.25 5" />
  ),
  tag: (
    <>
      <path d="M1.75 2.75v4.5l7 7 5.5-5.5-7-7h-4.5c-.55 0-1 .45-1 1z" />
      <circle cx="5" cy="5" r="0.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="2" y="3" width="12" height="11" rx="1.25" />
      <path d="M2 6.5h12M5.25 1.75v2.5m5.5-2.5v2.5" />
    </>
  ),
  check: <path d="m3 8.5 3.25 3.25L13 5" />,
  arrowLeft: <path d="M13.25 8H2.75m4-4.25L2.75 8l4 4.25" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
