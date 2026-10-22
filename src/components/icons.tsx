import type { SVGProps } from "react";

/**
 * Iconografía del producto: trazo uniforme, sin dependencias externas.
 * Todos heredan `currentColor` para funcionar sobre fondos claros y oscuros.
 */
type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </IconBase>
  );
}

export function IconBox(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.8 12 3.3l8.5 4.5v8.4L12 20.7 3.5 16.2V7.8Z" />
      <path d="M3.5 7.8 12 12.3l8.5-4.5M12 12.3v8.4" />
    </IconBase>
  );
}

export function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 5.9v5.6c0 4.3 2.9 8.1 7 9.5 4.1-1.4 7-5.2 7-9.5V5.9L12 3Z" />
      <path d="m9.2 12 2 2 3.6-3.6" />
    </IconBase>
  );
}

export function IconQr(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M14 14h2.5v2.5H14zM18.5 18.5H21V21h-2.5zM14 18.5h1.5V20H14z" />
    </IconBase>
  );
}

export function IconClock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3.1 1.9" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.6" />
      <path d="m16.1 16.1 4 4" />
    </IconBase>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </IconBase>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </IconBase>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12.6 4.6 4.6L19 7.8" />
    </IconBase>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12h14m-5.6-5.8L19.5 12l-6.6 5.8" />
    </IconBase>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5h16M4 12h16M4 16.5h16" />
    </IconBase>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4.5h6M8 5.6H6.2A1.7 1.7 0 0 0 4.5 7.3v11.2a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7V7.3a1.7 1.7 0 0 0-1.7-1.7H16" />
      <rect x="8.8" y="2.9" width="6.4" height="3.4" rx="1.2" />
      <path d="M9.2 11.2h5.6M9.2 14.6h3.6" />
    </IconBase>
  );
}

export function IconLock(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.8" y="10" width="14.4" height="10.2" rx="2.6" />
      <path d="M8.4 10V7.6a3.6 3.6 0 0 1 7.2 0V10" />
    </IconBase>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5M12 7.9h.01" />
    </IconBase>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3.4 8.4 4.3L12 12 3.6 7.7 12 3.4Z" />
      <path d="m3.6 12.4 8.4 4.3 8.4-4.3M3.6 16.9l8.4 4.3 8.4-4.3" />
    </IconBase>
  );
}
