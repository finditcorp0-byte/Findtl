import type { ReactNode, SVGProps } from "react";

import type { ObjectCategory } from "@/lib/demo-objects";

/**
 * Ilustraciones vectoriales de las categorías.
 *
 * Trazo uniforme, formas geométricas y una paleta reducida: la misma
 * gramática visual en todas las piezas para que el conjunto se lea como un
 * sistema y no como un collage. Heredan `currentColor` para funcionar sobre
 * fondos claros y oscuros.
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

const ART: Record<ObjectCategory, ReactNode> = {
  electronicos: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="11" rx="2" />
      <path d="M2 19.4h20" />
    </>
  ),
  documentos: (
    <>
      <path d="M6 3.4h7.4L18.6 8v12.6H6z" />
      <path d="M13.2 3.6V8h5.2M9 12.6h6M9 16h4" />
    </>
  ),
  llaves: (
    <>
      <circle cx="8.2" cy="8.2" r="3.8" />
      <path d="m10.8 10.8 8.2 8.2M16.4 16.4l-2 2M19 19l-2 2" />
    </>
  ),
  bolsos: (
    <>
      <path d="M6.2 8.4h11.6a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2v-7.4a2 2 0 0 1 2-2Z" />
      <path d="M8.8 8.4V6.8a3.2 3.2 0 0 1 6.4 0v1.6M8.8 12.6h6.4" />
    </>
  ),
  ropa: (
    <>
      <path d="M9 3.4 4.4 6l1.8 4 2-.9v11.5h7.6V9.1l2 .9 1.8-4L15 3.4" />
      <path d="M9 3.4a3 3 0 0 0 6 0" />
    </>
  ),
  accesorios: (
    <>
      <rect x="2.8" y="9" width="7.6" height="5.6" rx="2.4" />
      <rect x="13.6" y="9" width="7.6" height="5.6" rx="2.4" />
      <path d="M10.4 11.8h3.2M4.4 9 7.6 4.6M19.6 9 16.4 4.6" />
    </>
  ),
  libros: (
    <>
      <path d="M4 4.6h5.4A3.2 3.2 0 0 1 12 7.8v12a2.4 2.4 0 0 0-2.4-2.4H4z" />
      <path d="M20 4.6h-5.4A3.2 3.2 0 0 0 12 7.8v12a2.4 2.4 0 0 1 2.4-2.4H20z" />
    </>
  ),
  otros: (
    <>
      <path d="M3.4 7.8 12 3.4l8.6 4.4v8.4L12 20.6 3.4 16.2z" />
      <path d="M3.4 7.8 12 12.2l8.6-4.4M12 12.2v8.4" />
    </>
  ),
};

/** Ilustración de una categoría. */
export function CategoryIcon({
  category,
  className,
}: {
  category: ObjectCategory;
  className?: string;
}) {
  return (
    <IconBase className={className}>{ART[category]}</IconBase>
  );
}
