import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const paths = {
  shortText: "M4 9h16M4 15h10",
  longText: "M4 6h16M4 11h16M4 16h10",
  choice: "M4 6h3v3H4zM10 7.5h10M4 14h3v3H4zM10 15.5h10",
  dropdown: "M6 9l6 6 6-6",
  email: "M3 6h18v12H3zM3 7l9 6 9-6",
  number: "M9 4L7 20M17 4l-2 16M4 9h17M3 15h17",
  yesNo: "M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  thumb: "M7 11v9H4v-9zM7 11l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1.2 7A2 2 0 0117.3 20H7",
  circle: "M12 3a9 9 0 100 18 9 9 0 000-18z",
  upload: "M7 18a4 4 0 01-.6-8A6 6 0 0118 9a4.5 4.5 0 01-1 9M12 12v8M9 15l3-3 3 3",
  welcome: "M4 5h6v14H4zM14 5v14M18 5v14",
  end: "M20 5h-6v14h6zM10 5v14M6 5v14",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  left: "M15 6l-6 6 6 6",
  check: "M5 12l5 5 9-10",
  x: "M6 6l12 12M18 6L6 18",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  play: "M7 4l13 8-13 8z",
  palette: "M12 3a9 9 0 000 18c1.1 0 1.5-.8 1.5-1.6 0-1.4 1-2.4 2.4-2.4H18a3 3 0 003-3A9 9 0 0012 3zM7.5 11h.01M10 7h.01M14.5 7h.01",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 15.3H3a2 2 0 110-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.7V4.6a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7h.1a2 2 0 110 4h-.1a1.6 1.6 0 00-1.2.7z",
  phone: "M7 3h10v18H7zM11 18h2",
  desktop: "M3 4h18v12H3zM8 20h8M12 16v4",
  sun: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  warning: "M12 4l9 16H3zM12 10v4M12 17h.01",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
  forms: "M4 5h16v14H4zM8 9h8M8 13h5",
  branch: "M6 4v16M6 8c0 4 12 2 12 8M18 16v4M15 19l3 3 3-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6",
  zap: "M13 2L4 14h7l-1 8 9-12h-7z",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  restart: "M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0011.9 2.5M18.4 9A7 7 0 006.5 6.5",
  external:"M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16, strokeWidth = 1.75, ...rest }: P & { name: IconName; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      <path d={paths[name]} />
    </svg>
  );
}
