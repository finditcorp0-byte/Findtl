import type { ReactNode } from "react";

import type { ArtKey } from "@/lib/demo-objects";

/**
 * Ilustraciones vectoriales propias para los registros de demostración.
 * Trazo uniforme, formas geométricas y una paleta reducida: la misma
 * gramática visual en todas las piezas para que el conjunto se lea como un
 * sistema y no como un collage.
 */

const STROKE = {
  strokeWidth: 5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ART: Record<ArtKey, ReactNode> = {
  headphones: (
    <>
      <path
        d="M26 74V60a34 34 0 0 1 68 0v14"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <rect x="14" y="64" width="22" height="38" rx="11" fill="currentColor" />
      <rect x="84" y="64" width="22" height="38" rx="11" fill="currentColor" />
      <circle cx="60" cy="34" r="4.5" fill="#4F7CFF" />
    </>
  ),
  charger: (
    <>
      <rect
        x="30"
        y="44"
        width="46"
        height="42"
        rx="12"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <rect x="44" y="22" width="8" height="18" rx="4" fill="currentColor" />
      <rect x="54" y="22" width="8" height="18" rx="4" fill="currentColor" />
      <rect x="45" y="60" width="16" height="6" rx="3" fill="#4F7CFF" />
    </>
  ),
  mouse: (
    <>
      <path
        d="M60 24c15 0 22 12 22 27v14c0 16-8 27-22 27s-22-11-22-27V51c0-15 7-27 22-27Z"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M60 26v20" fill="none" stroke="currentColor" {...STROKE} />
      <rect x="55" y="38" width="10" height="16" rx="5" fill="#4F7CFF" />
    </>
  ),
  bottle: (
    <>
      <rect
        x="46"
        y="44"
        width="28"
        height="60"
        rx="13"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <rect x="53" y="20" width="14" height="24" rx="5" fill="currentColor" />
      <path d="M47 62h26" fill="none" stroke="#4F7CFF" {...STROKE} />
    </>
  ),
  umbrella: (
    <>
      <path
        d="M18 74c0-30 19-50 42-50s42 20 42 50c-7-9-14-9-21 0-7-9-14-9-21 0-7-9-14-9-21 0-7-9-14-9-21 0Z"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M60 74v28" fill="none" stroke="currentColor" {...STROKE} />
      <path
        d="M60 102a8 8 0 0 0-8-8"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
    </>
  ),
  glasses: (
    <>
      <rect
        x="20"
        y="54"
        width="80"
        height="30"
        rx="15"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M21 69h78" fill="none" stroke="#4F7CFF" strokeWidth="4" strokeLinecap="round" />
      <rect x="54" y="63" width="12" height="12" rx="4" fill="currentColor" />
    </>
  ),
  notebook: (
    <>
      <rect
        x="32"
        y="22"
        width="56"
        height="76"
        rx="8"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M45 22v76" fill="none" stroke="currentColor" {...STROKE} />
      <path
        d="M58 44h18M58 59h18M58 74h11"
        fill="none"
        stroke="#4F7CFF"
        {...STROKE}
      />
    </>
  ),
  keys: (
    <>
      <circle
        cx="34"
        cy="42"
        r="13"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M43 51 76 84" fill="none" stroke="currentColor" {...STROKE} />
      <path
        d="M67 75l-8 8M72 80l-8 8"
        fill="none"
        stroke="currentColor"
        {...STROKE}
      />
    </>
  ),
};

export function ObjectArt({
  art,
  className,
}: {
  art: ArtKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {ART[art]}
    </svg>
  );
}
